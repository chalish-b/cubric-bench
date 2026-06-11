// Recompute extraction + scoring for an existing run from its stored raw
// responses — no API calls. Use after fixing the extractor or scorer:
//
//   pnpm --filter @cubric/bench rescore -- --run <runId>

import { parseArgs } from "util";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";
import type { SuiteManifest, RunMeta, CaseResult } from "../schema";
import { extractAnswer } from "./extract";
import { scoreAnswer } from "./score";

const BENCH_DIR = resolve(import.meta.dirname, "../..");

const { values: args } = parseArgs({
  options: {
    run: { type: "string" },
  },
});

if (!args.run) {
  console.error("Error: --run <runId> is required");
  process.exit(1);
}

const runDir = resolve(BENCH_DIR, "results/runs", args.run);
const casesPath = resolve(runDir, "cases.jsonl");
if (!existsSync(casesPath)) {
  console.error(`Error: no results at ${casesPath}`);
  process.exit(1);
}

const meta: RunMeta = JSON.parse(
  readFileSync(resolve(runDir, "run.json"), "utf-8"),
);
const suite: SuiteManifest = JSON.parse(
  readFileSync(resolve(BENCH_DIR, "suites", meta.suiteId, "suite.json"), "utf-8"),
);
if (suite.suiteHash !== meta.suiteHash) {
  console.warn(
    `Warning: suite has been regenerated since this run (run: ${meta.suiteHash}, now: ${suite.suiteHash}). Rescoring against current suite data.`,
  );
}

const task = suite.tasks.find((t) => t.id === meta.taskId);
if (!task) {
  console.error(`Error: task "${meta.taskId}" no longer exists in suite "${meta.suiteId}"`);
  process.exit(1);
}

const lines = readFileSync(casesPath, "utf-8")
  .split("\n")
  .filter((l) => l.trim());

let changed = 0;
const rescored = lines.map((line) => {
  const result: CaseResult = JSON.parse(line);

  // Errored attempts have no response to score
  if (result.error) return result;

  const suiteCase = suite.cases.find((c) => c.id === result.caseId);
  if (!suiteCase) {
    console.warn(`Warning: case ${result.caseId} not found in suite, skipping`);
    return result;
  }

  const extracted = extractAnswer(result.rawResponse);
  const { outcome, details } = scoreAnswer(task.scoring, extracted, suiteCase);

  if (extracted !== result.extracted || outcome !== result.outcome) changed++;
  return { ...result, extracted, outcome, details };
});

writeFileSync(
  casesPath,
  rescored.map((r) => JSON.stringify(r)).join("\n") + "\n",
);

const outcomes = new Map<string, number>();
for (const r of rescored) {
  outcomes.set(r.outcome, (outcomes.get(r.outcome) ?? 0) + 1);
}

console.log(`Rescored ${rescored.length} attempts (${changed} changed)`);
for (const [outcome, count] of [...outcomes.entries()].sort()) {
  console.log(`  ${outcome}: ${count}`);
}
