// Benchmark runner: suite x task x model x modality -> results/runs/<runId>/
//
//   pnpm --filter @cubric/bench bench -- \
//     --suite pll --task identify --model google/gemini-2.0-flash-001 \
//     [--no-image] [--text none|visible|full] [--reasoning low|medium|high|...] \
//     [--trials 1] [--variant base] [--limit 10] [--concurrency 4] \
//     [--timeout 300] [--resume <runId>] [--dry-run]
//
// --resume re-runs errored attempts as well as missing ones (pass the same
// selection flags as the original run).
//
// Input modality: the image is sent unless --no-image; --text controls how
// much of the cube state is given as text (default "visible" = the U/F/R
// faces, which carries the same information as the image). Text-only models
// run with --no-image (requires --text visible or full).
//
// Each (case x trial) is appended to cases.jsonl as it completes, so an
// interrupted run can be resumed with --resume. Raw responses are stored
// verbatim; outcomes can be recomputed offline with rescore.ts.

import { parseArgs } from "util";
import {
  readFileSync,
  writeFileSync,
  appendFileSync,
  mkdirSync,
  existsSync,
} from "fs";
import { resolve } from "path";
import type { SuiteManifest, SuiteCase, RunMeta, CaseResult, TextState } from "../schema";
import { GLOBAL_PROMPT_VERSION, composePrompt } from "./prompts";
import { stateTextBlock } from "./state-text";
import { extractAnswer } from "./extract";
import { scoreAnswer } from "./score";
import { chat } from "./openrouter";

const BENCH_DIR = resolve(import.meta.dirname, "../..");
const TEXT_STATES: TextState[] = ["none", "visible", "full"];

function fail(message: string): never {
  console.error(`Error: ${message}`);
  process.exit(1);
}

const { values: args } = parseArgs({
  options: {
    suite: { type: "string" },
    task: { type: "string" },
    model: { type: "string" },
    "no-image": { type: "boolean", default: false },
    text: { type: "string", default: "visible" },
    reasoning: { type: "string" },
    trials: { type: "string", default: "1" },
    variant: { type: "string" },
    limit: { type: "string" },
    concurrency: { type: "string", default: "4" },
    timeout: { type: "string", default: "300" },
    resume: { type: "string" },
    "dry-run": { type: "boolean", default: false },
  },
});

const dryRun = args["dry-run"];

if (!args.suite) fail("--suite is required");
if (!args.task) fail("--task is required");
if (!args.model && !dryRun) fail("--model is required (unless --dry-run)");
if (!TEXT_STATES.includes(args.text as TextState)) {
  fail(`--text must be one of: ${TEXT_STATES.join(", ")}`);
}

const image = !args["no-image"];
const textState = args.text as TextState;
if (!image && textState === "none") {
  fail("--no-image requires --text visible or --text full (the model needs some input)");
}

// OpenRouter's unified reasoning effort levels (models without reasoning
// support ignore the parameter without error)
const REASONING_EFFORTS = ["none", "minimal", "low", "medium", "high", "xhigh"];
const reasoningEffort = args.reasoning;
if (reasoningEffort && !REASONING_EFFORTS.includes(reasoningEffort)) {
  fail(`--reasoning must be one of: ${REASONING_EFFORTS.join(", ")}`);
}

const trials = Number(args.trials);
const concurrency = Number(args.concurrency);
const timeoutMs = Number(args.timeout) * 1000;
const model = args.model ?? "dry-run";

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey && !dryRun) {
  fail("OPENROUTER_API_KEY is not set");
}

// --- Load suite and select cases ---

const suiteDir = resolve(BENCH_DIR, "suites", args.suite);
const suitePath = resolve(suiteDir, "suite.json");
if (!existsSync(suitePath)) fail(`No suite manifest at ${suitePath}`);
const suite: SuiteManifest = JSON.parse(readFileSync(suitePath, "utf-8"));

const task = suite.tasks.find((t) => t.id === args.task);
if (!task) {
  fail(
    `Task "${args.task}" not found in suite "${suite.suiteId}" (available: ${suite.tasks.map((t) => t.id).join(", ")})`,
  );
}

let cases = suite.cases;
if (args.variant) cases = cases.filter((c) => c.variant === args.variant);
if (args.limit) cases = cases.slice(0, Number(args.limit));
if (cases.length === 0) fail("Case selection matched no cases");

// Text-only suites ship no screenshots, so image input isn't possible.
if (image && cases.some((c) => !c.image)) {
  fail(
    `Suite "${suite.suiteId}" has cases without screenshots (text-only). Re-run with --no-image (and --text full).`,
  );
}

function promptForCase(c: SuiteCase): string {
  return composePrompt({
    taskPrompt: task!.prompt,
    image,
    textState,
    stateText: stateTextBlock(c.cubeState, textState),
  });
}

/** Short modality label for the run id, e.g. "img-vtext" or "ftext". */
const modalityLabel = [image ? "img" : null, { none: null, visible: "vtext", full: "ftext" }[textState]]
  .filter(Boolean)
  .join("-");

// --- Dry run: show what would be sent, call nothing ---

if (dryRun) {
  const example = cases[0];
  console.log(`Suite: ${suite.suiteId} (${suite.suiteHash})`);
  console.log(`Task: ${task.id} | scoring: ${JSON.stringify(task.scoring)}`);
  console.log(`Modality: ${modalityLabel} (image: ${image}, text: ${textState}) | model: ${model} | reasoning: ${reasoningEffort ?? "default"} | trials: ${trials}`);
  console.log(`Selected cases: ${cases.length} (of ${suite.cases.length})`);
  console.log(`Requests that would be made: ${cases.length * trials}`);
  console.log(`\n--- Example message for ${example.id}${image ? ` (+ image ${example.image})` : " (no image)"} ---\n`);
  console.log(promptForCase(example));
  process.exit(0);
}

// --- Set up the run directory (new or resumed) ---

const runId =
  args.resume ??
  [
    new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-"),
    suite.suiteId,
    task.id,
    model.replace(/[^a-zA-Z0-9.]+/g, "-"),
    modalityLabel,
    ...(reasoningEffort ? [`r-${reasoningEffort}`] : []),
  ].join("_");

const runDir = resolve(BENCH_DIR, "results/runs", runId);
const casesPath = resolve(runDir, "cases.jsonl");

const completed = new Set<string>();
if (args.resume) {
  if (!existsSync(casesPath)) fail(`Nothing to resume at ${casesPath}`);
  const existingMeta: RunMeta = JSON.parse(
    readFileSync(resolve(runDir, "run.json"), "utf-8"),
  );
  if (existingMeta.suiteHash !== suite.suiteHash) {
    fail(
      `Suite has been regenerated since this run started (run: ${existingMeta.suiteHash}, now: ${suite.suiteHash})`,
    );
  }
  // Attempts in this invocation's selection — errored attempts inside it are
  // dropped from the file and re-run; errored attempts outside it are kept
  const selected = new Set<string>();
  for (const c of cases) {
    for (let t = 1; t <= trials; t++) selected.add(`${c.id}#${t}`);
  }

  const kept: string[] = [];
  let erroredToRetry = 0;
  for (const line of readFileSync(casesPath, "utf-8").split("\n")) {
    if (!line.trim()) continue;
    const r: CaseResult = JSON.parse(line);
    const key = `${r.caseId}#${r.trial}`;
    if (r.outcome === "error" && selected.has(key)) {
      erroredToRetry++;
      continue;
    }
    completed.add(key);
    kept.push(line);
  }
  if (erroredToRetry > 0) {
    writeFileSync(casesPath, kept.length ? kept.join("\n") + "\n" : "");
  }
  console.log(
    `Resuming ${runId}: ${completed.size} attempts already done, ${erroredToRetry} errored attempts to retry`,
  );
} else {
  mkdirSync(runDir, { recursive: true });
  const meta: RunMeta = {
    runId,
    suiteId: suite.suiteId,
    suiteHash: suite.suiteHash,
    taskId: task.id,
    image,
    textState,
    model,
    ...(reasoningEffort ? { reasoningEffort } : {}),
    globalPromptVersion: GLOBAL_PROMPT_VERSION,
    trials,
    filter: {
      ...(args.variant ? { variant: args.variant } : {}),
      ...(args.limit ? { limit: Number(args.limit) } : {}),
    },
    startedAt: new Date().toISOString(),
  };
  writeFileSync(resolve(runDir, "run.json"), JSON.stringify(meta, null, 2));
}

// --- Collect ---

interface Job {
  suiteCase: SuiteCase;
  trial: number;
}

const jobs: Job[] = [];
for (const suiteCase of cases) {
  for (let trial = 1; trial <= trials; trial++) {
    if (!completed.has(`${suiteCase.id}#${trial}`)) jobs.push({ suiteCase, trial });
  }
}

console.log(`Run ${runId}`);
console.log(`${jobs.length} attempts to collect (concurrency ${concurrency})`);

let done = 0;
const outcomes = new Map<string, number>();

async function runJob({ suiteCase, trial }: Job): Promise<void> {
  const started = Date.now();
  let result: CaseResult;

  try {
    const response = await chat({
      apiKey: apiKey!,
      model,
      prompt: promptForCase(suiteCase),
      timeoutMs,
      ...(reasoningEffort ? { reasoningEffort } : {}),
      ...(image
        ? {
            // image=true is guarded above to require a screenshot per case
            imageBase64: readFileSync(
              resolve(suiteDir, suiteCase.image!),
            ).toString("base64"),
          }
        : {}),
    });

    const extracted = extractAnswer(response.text);
    const { outcome, details } = scoreAnswer(task!.scoring, extracted, suiteCase);

    result = {
      caseId: suiteCase.id,
      trial,
      rawResponse: response.text,
      ...(response.reasoning ? { reasoning: response.reasoning } : {}),
      extracted,
      outcome,
      details,
      ...(response.usage ? { usage: response.usage } : {}),
      latencyMs: Date.now() - started,
      finishedAt: new Date().toISOString(),
    };
  } catch (err) {
    result = {
      caseId: suiteCase.id,
      trial,
      rawResponse: "",
      extracted: "",
      outcome: "error",
      details: {},
      latencyMs: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
      finishedAt: new Date().toISOString(),
    };
  }

  appendFileSync(casesPath, JSON.stringify(result) + "\n");
  done++;
  outcomes.set(result.outcome, (outcomes.get(result.outcome) ?? 0) + 1);
  console.log(
    `[${done}/${jobs.length}] ${suiteCase.id}#${trial} -> ${result.outcome}` +
      (result.error ? ` (${result.error.slice(0, 120)})` : ""),
  );
}

// Simple worker pool over the job list
async function main() {
  let next = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, jobs.length) },
    async () => {
      while (next < jobs.length) {
        const job = jobs[next++];
        await runJob(job);
      }
    },
  );
  await Promise.all(workers);

  // Mark the run finished
  const metaPath = resolve(runDir, "run.json");
  const meta: RunMeta = JSON.parse(readFileSync(metaPath, "utf-8"));
  meta.finishedAt = new Date().toISOString();
  writeFileSync(metaPath, JSON.stringify(meta, null, 2));

  console.log("\nDone!");
  for (const [outcome, count] of [...outcomes.entries()].sort()) {
    console.log(`  ${outcome}: ${count}`);
  }
  console.log(`  Results: ${runDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
