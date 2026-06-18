// Entry point for the PLL suite. Case generation is deterministic (seeded rng),
// so --skip-screenshots rebuilds suite.json against the existing images without
// re-rendering.

import { resolve } from "path";
import { generatePllCases } from "./pll-cases";
import { buildSuite, type GeneratedCase } from "./build-suite";
import type { TaskDef } from "../schema";

const SUITE_ID = "pll";
const SUITE_DIR = resolve(import.meta.dirname, "../../suites/pll");

// Tasks share the same cases and images, they only differ in what we ask
// the model to do with them and how the answer is scored.
const TASKS: TaskDef[] = [
  {
    id: "identify",
    prompt:
      "Identify the PLL case of this Rubik's cube. Answer with just the PLL name (e.g. T, Ja, Ua, etc.).",
    scoring: { type: "exact" },
  },
  {
    id: "solve",
    prompt:
      "This cube has the first two layers solved; only the top layer pieces are permuted. Respond with a sequence of moves that solves the cube. Use standard notation (e.g. R U R' U2), with moves separated by spaces.",
    scoring: { type: "solve", tolerance: "auf" },
  },
];

async function main() {
  const skipScreenshots = process.argv.includes("--skip-screenshots");

  console.log("Generating PLL cases...");
  const pllCases = generatePllCases();
  console.log(
    `Generated ${pllCases.length} cases across ${new Set(pllCases.map((c) => c.pllName)).size} PLLs`,
  );

  // pllName is generator bookkeeping; the manifest only keeps SuiteCase fields.
  const cases: GeneratedCase[] = pllCases.map(({ pllName, ...rest }) => rest);

  const suite = await buildSuite({
    suiteId: SUITE_ID,
    suiteDir: SUITE_DIR,
    tasks: TASKS,
    cases,
    screenshots: true,
    skipScreenshots,
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
