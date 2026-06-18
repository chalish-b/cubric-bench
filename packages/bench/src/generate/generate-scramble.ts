// Entry point for the scramble suite (text-only, no screenshots).
//
//   pnpm --filter @cubric/bench generate:scramble [--moves 1,2,3] [--count 10]
//
// --moves: comma-separated move counts to generate (one variant each).
// --count: cases per move count.

import { parseArgs } from "util";
import { resolve } from "path";
import { generateScrambleCases } from "./scramble-cases";
import { buildSuite } from "./build-suite";
import type { TaskDef } from "../schema";

const SUITE_ID = "scramble";
const SUITE_DIR = resolve(import.meta.dirname, "../../suites/scramble");

const TASKS: TaskDef[] = [
  {
    id: "solve",
    prompt:
      "This cube was scrambled with a few moves from a solved state. It could be 1 move, 2 moves, or more, you're not given that information. Find the sequence of moves that would return this cube to a fully solved state (every face a single solid color — any orientation counts). Use standard notation (e.g. R U R' U2), with moves separated by spaces. Your final answer should just be a single line containing the sequence of moves, nothing else.",
    scoring: { type: "solve", tolerance: "none" },
  },
];

async function main() {
  const { values } = parseArgs({
    options: {
      moves: { type: "string", default: "1,2,3" },
      count: { type: "string", default: "10" },
    },
  });

  const moveCounts = values
    .moves!.split(",")
    .map((s) => parseInt(s.trim(), 10));
  if (moveCounts.some((n) => !Number.isInteger(n) || n < 1)) {
    throw new Error(`--moves must be positive integers (got "${values.moves}")`);
  }
  const perCount = parseInt(values.count!, 10);
  if (!Number.isInteger(perCount) || perCount < 1) {
    throw new Error(`--count must be a positive integer (got "${values.count}")`);
  }

  console.log(
    `Generating scramble cases: ${moveCounts.map((n) => `${n}-move`).join(", ")} (${perCount} each)...`,
  );
  const cases = generateScrambleCases(moveCounts, perCount);

  const suite = await buildSuite({
    suiteId: SUITE_ID,
    suiteDir: SUITE_DIR,
    tasks: TASKS,
    cases,
    screenshots: false,
  });

  console.log("\nDone!");
  console.log(`  Cases: ${suite.cases.length}`);
  console.log(`  Suite hash: ${suite.suiteHash}`);
  console.log(`  Output: ${SUITE_DIR}/suite.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
