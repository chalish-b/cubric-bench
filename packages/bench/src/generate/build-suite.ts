// Generic suite builder shared by every generator. It optionally renders one
// screenshot per case, content-hashes the cases (plus image bytes), and writes
// suites/<suiteId>/suite.json. Text-only suites pass screenshots: false and
// ship no images.

import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { spawn, type ChildProcess } from "child_process";
import { createHash } from "crypto";
import { captureScreenshots } from "./capture-screenshots";
import type { SuiteCase, SuiteManifest, TaskDef } from "../schema";

const PORT = 5199;

/** A case as produced by a generator, before the manifest is assembled. The
 * image path (when there is one) is derived from the id during capture. */
export type GeneratedCase = Omit<SuiteCase, "image">;

export interface BuildSuiteOptions {
  suiteId: string;
  /** Absolute path to suites/<suiteId>. */
  suiteDir: string;
  tasks: TaskDef[];
  cases: GeneratedCase[];
  /** Render one screenshot per case. Text-only suites pass false. */
  screenshots: boolean;
  /** With screenshots: reuse existing images instead of re-rendering. */
  skipScreenshots?: boolean;
}

function startDevServer(): ChildProcess {
  return spawn(
    "pnpm",
    ["--filter", "cube-demo", "dev", "--port", String(PORT)],
    {
      cwd: resolve(import.meta.dirname, "../../../.."),
      stdio: ["ignore", "pipe", "pipe"],
      detached: true,
    },
  );
}

function killDevServer(proc: ChildProcess) {
  // Kill the whole process group (pnpm + vite child) via negative PID
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

/** Content hash over case data (and image bytes, for image suites), so results
 * can reference the exact generation they ran against. */
function computeSuiteHash(
  cases: GeneratedCase[],
  suiteDir: string,
  withImages: boolean,
): string {
  const hash = createHash("sha256");
  hash.update(JSON.stringify(cases));
  if (withImages) {
    for (const c of cases) {
      hash.update(readFileSync(resolve(suiteDir, `images/${c.id}.png`)));
    }
  }
  return hash.digest("hex").slice(0, 12);
}

async function renderScreenshots(
  opts: BuildSuiteOptions,
): Promise<void> {
  const { cases, suiteDir, skipScreenshots } = opts;
  mkdirSync(resolve(suiteDir, "images"), { recursive: true });

  if (skipScreenshots) {
    console.log("Skipping screenshots (--skip-screenshots).");
    const missing = cases.filter(
      (c) => !existsSync(resolve(suiteDir, `images/${c.id}.png`)),
    );
    if (missing.length > 0) {
      throw new Error(
        `Missing images for ${missing.length} cases (e.g. ${missing[0].id}). Run without --skip-screenshots.`,
      );
    }
    return;
  }

  const renderable = cases.map((c) => {
    if (!c.cameraPosition) {
      throw new Error(`Case ${c.id} has no cameraPosition; cannot screenshot.`);
    }
    return { id: c.id, cubeState: c.cubeState, cameraPosition: c.cameraPosition };
  });

  console.log("Starting dev server...");
  const server = startDevServer();
  try {
    await waitForServer(PORT);
    console.log("Dev server ready. Capturing screenshots...");
    await captureScreenshots(renderable, suiteDir, PORT);
  } finally {
    killDevServer(server);
  }
}

export async function buildSuite(
  opts: BuildSuiteOptions,
): Promise<SuiteManifest> {
  const { suiteId, suiteDir, tasks, cases, screenshots } = opts;
  mkdirSync(suiteDir, { recursive: true });

  if (screenshots) await renderScreenshots(opts);

  const suite: SuiteManifest = {
    suiteId,
    suiteHash: computeSuiteHash(cases, suiteDir, screenshots),
    generatedAt: new Date().toISOString(),
    tasks,
    cases: cases.map((c) => ({
      ...c,
      ...(screenshots ? { image: `images/${c.id}.png` } : {}),
    })),
  };

  writeFileSync(
    resolve(suiteDir, "suite.json"),
    JSON.stringify(suite, null, 2),
  );

  return suite;
}
