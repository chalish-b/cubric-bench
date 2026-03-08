import { writeFileSync, mkdirSync, rmSync } from "fs";
import { resolve } from "path";
import { spawn, type ChildProcess } from "child_process";
import { generatePllCases } from "./pll-cases";
import { captureScreenshots } from "./capture-screenshots";

const SUITE_DIR = resolve(import.meta.dirname, "../suites/pll");
const PORT = 5199;

const CATEGORY = "pll";
const PROMPT =
  "Identify this Rubik's cube PLL case shown in the image. Answer with just the PLL name (e.g. T, Ja, Ua, etc.).";

function startDevServer(): ChildProcess {
  const proc = spawn(
    "pnpm",
    ["--filter", "cube-demo", "dev", "--port", String(PORT)],
    {
      cwd: resolve(import.meta.dirname, "../../.."),
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

async function main() {
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
  console.log("Starting dev server...");
  const server = startDevServer();

  try {
    await waitForServer(PORT);
    console.log("Dev server ready. Capturing screenshots...");
    await captureScreenshots(cases, SUITE_DIR, PORT);
  } finally {
    killDevServer(server);
  }

  // 3. Assemble suite.json
  const suite = {
    category: CATEGORY,
    prompt: PROMPT,
    generatedAt: new Date().toISOString(),
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
  console.log(`  Images: ${cases.length}`);
  console.log(`  Output: ${SUITE_DIR}/suite.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
