// Batch runner: run several benchmark selections in sequence from a config file.
//
//   pnpm --filter @cubric/bench batch -- [path/to/runs.config.ts] [--dry-run]
//
// The config file default-exports an array of BatchRun entries (defaults to
// runs.config.ts in the bench package root if no path is given). Each entry is
// run one after the other via runBench; a run that fails is reported and the
// batch continues with the rest. --dry-run previews every entry without making
// any requests.

import { parseArgs } from "util";
import { resolve } from "path";
import { existsSync } from "fs";
import { pathToFileURL } from "url";
import type { TextState } from "../schema";
import { runBench, type RunConfig, type ReasoningEffort } from "./run-bench";

/** One entry in a batch config file. Only suite/task/model are required;
 * everything else falls back to the same defaults as the CLI. */
export interface BatchRun {
  suite: string;
  task: string;
  model: string;
  /** Send the case screenshot. Default false. */
  image?: boolean;
  /** Cube state as text. Default "visible". */
  text?: TextState;
  reasoning?: ReasoningEffort;
  /** Default 1. */
  trials?: number;
  variant?: string;
  limit?: number;
  /** Default 4. */
  concurrency?: number;
  /** Per-request timeout in seconds. Default 300. */
  timeout?: number;
  /** Resume an existing runId (re-runs errored + missing attempts). */
  resume?: string;
}

function toRunConfig(r: BatchRun, dryRun: boolean): RunConfig {
  return {
    suite: r.suite,
    task: r.task,
    model: r.model,
    image: r.image ?? false,
    textState: r.text ?? "visible",
    reasoningEffort: r.reasoning,
    trials: r.trials ?? 1,
    variant: r.variant,
    limit: r.limit,
    concurrency: r.concurrency ?? 4,
    timeoutMs: (r.timeout ?? 500) * 1000,
    resume: r.resume,
    dryRun,
  };
}

/** One-line descriptor for the per-run header (before a runId exists). */
function describe(r: BatchRun): string {
  const modality = [
    r.image ?? true ? "img" : null,
    { none: null, visible: "vtext", full: "ftext" }[r.text ?? "visible"],
  ]
    .filter(Boolean)
    .join("-");
  return [
    `${r.suite}/${r.task}`,
    r.model,
    modality,
    r.reasoning ? `r-${r.reasoning}` : null,
    r.variant ? `v-${r.variant}` : null,
  ]
    .filter(Boolean)
    .join(" | ");
}

const { values: args, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    "dry-run": { type: "boolean", default: false },
  },
});

const dryRun = args["dry-run"];
const configPath = resolve(process.cwd(), positionals[0] ?? "runs.config.ts");
if (!existsSync(configPath)) {
  console.error(`Error: no batch config at ${configPath}`);
  process.exit(1);
}

const mod = await import(pathToFileURL(configPath).href);
const runs: BatchRun[] = mod.default;
if (!Array.isArray(runs)) {
  console.error(`Error: ${configPath} must default-export an array of runs`);
  process.exit(1);
}
if (runs.length === 0) {
  console.error(`Error: ${configPath} exports an empty array`);
  process.exit(1);
}

console.log(`Batch: ${runs.length} run(s) from ${configPath}${dryRun ? " (dry run)" : ""}\n`);

interface RunOutcome {
  descriptor: string;
  runId?: string;
  outcomes?: Record<string, number>;
  error?: string;
}

const results: RunOutcome[] = [];

for (let i = 0; i < runs.length; i++) {
  const r = runs[i];
  const descriptor = describe(r);
  console.log(`\n=== Run ${i + 1}/${runs.length}: ${descriptor} ===`);
  try {
    const summary = await runBench(toRunConfig(r, dryRun));
    results.push({ descriptor, runId: summary.runId, outcomes: summary.outcomes });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Run ${i + 1} failed: ${message}`);
    results.push({ descriptor, error: message });
  }
}

// --- Batch summary ---

const failed = results.filter((r) => r.error).length;
console.log(`\n\n===== Batch complete: ${results.length - failed}/${results.length} ok =====`);
for (let i = 0; i < results.length; i++) {
  const r = results[i];
  if (r.error) {
    console.log(`  ${i + 1}. FAILED  ${r.descriptor} — ${r.error}`);
  } else {
    const counts = Object.entries(r.outcomes ?? {})
      .sort()
      .map(([k, v]) => `${k}:${v}`)
      .join(" ");
    console.log(`  ${i + 1}. ${r.runId}  [${counts || "no attempts"}]`);
  }
}

if (failed > 0) process.exit(1);
