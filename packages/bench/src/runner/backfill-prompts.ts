// Backfill the `prompt` scaffold into existing run.json files. The scaffold is
// deterministic (global prompt version + the task prompt), so this reproduces
// exactly what was sent — but only for runs whose prompt version matches the
// current code, so we never write a wrong prompt for an older version.
//
//   pnpm --filter @cubric/bench backfill-prompts

import { readdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";
import type { SuiteManifest, RunMeta } from "../schema";
import { GLOBAL_PROMPT_VERSION, promptScaffold } from "./prompts";

const BENCH_DIR = resolve(import.meta.dirname, "../..");
const RUNS_DIR = resolve(BENCH_DIR, "results/runs");

const suiteCache = new Map<string, SuiteManifest>();
function loadSuite(suiteId: string): SuiteManifest | null {
  if (!suiteCache.has(suiteId)) {
    const p = resolve(BENCH_DIR, "suites", suiteId, "suite.json");
    if (!existsSync(p)) return null;
    suiteCache.set(suiteId, JSON.parse(readFileSync(p, "utf-8")));
  }
  return suiteCache.get(suiteId)!;
}

let updated = 0;
let skipped = 0;

for (const d of readdirSync(RUNS_DIR, { withFileTypes: true })) {
  if (!d.isDirectory()) continue;
  const metaPath = resolve(RUNS_DIR, d.name, "run.json");
  if (!existsSync(metaPath)) continue;

  const meta: RunMeta = JSON.parse(readFileSync(metaPath, "utf-8"));

  if (meta.globalPromptVersion !== GLOBAL_PROMPT_VERSION) {
    console.warn(
      `skip ${d.name}: prompt version "${meta.globalPromptVersion}" != current "${GLOBAL_PROMPT_VERSION}"`,
    );
    skipped++;
    continue;
  }

  const suite = loadSuite(meta.suiteId);
  const task = suite?.tasks.find((t) => t.id === meta.taskId);
  if (!task) {
    console.warn(`skip ${d.name}: task "${meta.taskId}" not found in suite "${meta.suiteId}"`);
    skipped++;
    continue;
  }

  meta.prompt = promptScaffold(meta.image, meta.textState, task.prompt);
  writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  updated++;
}

console.log(`Backfilled ${updated} run(s), skipped ${skipped}.`);
