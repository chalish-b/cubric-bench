import { writeFileSync, mkdirSync, rmSync, existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { spawn, type ChildProcess } from "child_process";
import { createHash } from "crypto";
import { generatePllCases } from "./pll-cases";
import { captureScreenshots } from "./capture-screenshots";
import type { SuiteManifest, TaskDef } from "../schema";

const SUITE_DIR = resolve(import.meta.dirname, "../../suites/pll");
const PORT = 5199;

const SUITE_ID = "pll";

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

function startDevServer(): ChildProcess {
  const proc = spawn(
    "pnpm",
    ["--filter", "cube-demo", "dev", "--port", String(PORT)],
    {
      cwd: resolve(import.meta.dirname, "../../../.."),
      stdio: ["ignore", "pipe", "pipe"],
      detached: true,
    },
  );

  return proc;
}

function killDevServer(proc: ChildProcess) {
  // Kill the entire process group (pnpm + vite child) via negative PID
  if (proc.pid) {
    try {
      process.kill(-proc.pid, "SIGTERM");
    } catch {
      // already dead
    }
  }
}

async function waitForServer(port: number, timeout = 30000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(`http://localhost:${port}`);
      if (res.ok) return;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Dev server did not start within ${timeout}ms`);
}

/** Content hash over case data + image bytes, so results can reference the
 * exact generation they ran against. */
function computeSuiteHash(
  cases: ReturnType<typeof generatePllCases>,
): string {
  const hash = createHash("sha256");
  hash.update(JSON.stringify(cases));
  for (const c of cases) {
    hash.update(readFileSync(resolve(SUITE_DIR, `images/${c.id}.png`)));
  }
  return hash.digest("hex").slice(0, 12);
}

async function main() {
  // Case generation is deterministic (seeded rng), so --skip-screenshots can
  // rebuild suite.json against the existing images without re-rendering.
  const skipScreenshots = process.argv.includes("--skip-screenshots");

  // 1. Generate cases
  console.log("Generating PLL cases...");
  const cases = generatePllCases();
  console.log(
    `Generated ${cases.length} cases across ${new Set(cases.map((c) => c.pllName)).size} PLLs`,
  );

  // Write intermediate cases.json
  const casesPath = resolve(SUITE_DIR, "cases.json");
  mkdirSync(resolve(SUITE_DIR, "images"), { recursive: true });
  writeFileSync(casesPath, JSON.stringify(cases, null, 2));

  // 2. Start dev server and capture screenshots
  if (skipScreenshots) {
    console.log("Skipping screenshots (--skip-screenshots).");
    const missing = cases.filter(
      (c) => !existsSync(resolve(SUITE_DIR, `images/${c.id}.png`)),
    );
    if (missing.length > 0) {
      throw new Error(
        `Missing images for ${missing.length} cases (e.g. ${missing[0].id}). Run without --skip-screenshots.`,
      );
    }
  } else {
    console.log("Starting dev server...");
    const server = startDevServer();

    try {
      await waitForServer(PORT);
      console.log("Dev server ready. Capturing screenshots...");
      await captureScreenshots(cases, SUITE_DIR, PORT);
    } finally {
      killDevServer(server);
    }
  }

  // 3. Assemble suite.json
  const suite: SuiteManifest = {
    suiteId: SUITE_ID,
    suiteHash: computeSuiteHash(cases),
    generatedAt: new Date().toISOString(),
    tasks: TASKS,
    cases: cases.map((c) => ({
      id: c.id,
      image: `images/${c.id}.png`,
      variant: c.variant,
      accept: c.accept,
      cubeState: c.cubeState,
      setup: c.setup,
      cameraPosition: c.cameraPosition,
    })),
  };

  writeFileSync(
    resolve(SUITE_DIR, "suite.json"),
    JSON.stringify(suite, null, 2),
  );

  // 4. Clean up intermediate file
  rmSync(casesPath, { force: true });

  // 5. Summary
  console.log("\nDone!");
  console.log(`  Cases: ${cases.length}`);
  console.log(`  Suite hash: ${suite.suiteHash}`);
  console.log(`  Output: ${SUITE_DIR}/suite.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
