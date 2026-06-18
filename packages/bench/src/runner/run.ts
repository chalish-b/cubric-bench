// Benchmark runner CLI: parse argv into one RunConfig and hand it to runBench.
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
// To run several selections in sequence from a config file, use batch.ts.

import { parseArgs } from "util";
import type { TextState } from "../schema";
import { runBench, type RunConfig, type ReasoningEffort } from "./run-bench";

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

const config: RunConfig = {
  suite: args.suite,
  task: args.task,
  model: args.model ?? "dry-run",
  image: !args["no-image"],
  textState: args.text as TextState,
  reasoningEffort: args.reasoning as ReasoningEffort | undefined,
  trials: Number(args.trials),
  variant: args.variant,
  limit: args.limit ? Number(args.limit) : undefined,
  concurrency: Number(args.concurrency),
  timeoutMs: Number(args.timeout) * 1000,
  resume: args.resume,
  dryRun,
};

runBench(config).catch((err) => fail(err instanceof Error ? err.message : String(err)));
