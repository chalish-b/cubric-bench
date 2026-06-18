// Crunch every run in results/runs into the JSON the results website reads.
// No API calls — pure re-aggregation of stored data, safe to re-run anytime.
//
//   pnpm --filter @cubric/bench web:data
//
// Output (apps/results/public/data/):
//   summary.json        leaderboard + per-variant breakdowns for all entries
//   runs/<entryId>.json per-attempt detail (cube state, answer, reasoning)
//
// An "entry" is one (suite, task, model, reasoning, modality) combination,
// aggregated across all the variant runs collected for it. When the same
// (case, trial) was run more than once, the latest run wins.

import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "fs";
import { resolve } from "path";
import type { SuiteManifest, RunMeta, CaseResult, SuiteCase, TextState } from "../schema";
import type {
  WebSummary,
  WebSuite,
  WebEntry,
  WebVariantStat,
  WebEntryDetail,
  WebCaseDetail,
} from "./schema";

const BENCH_DIR = resolve(import.meta.dirname, "../..");
const RUNS_DIR = resolve(BENCH_DIR, "results/runs");
const OUT_DIR = resolve(BENCH_DIR, "../../apps/results/public/data");

// --- helpers ---------------------------------------------------------------

const mean = (xs: number[]) =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;

function sortVariants(vs: string[]): string[] {
  return [...vs].sort((a, b) => {
    const na = Number(a);
    const nb = Number(b);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return a.localeCompare(b);
  });
}

function modalitySlug(image: boolean, text: TextState): string {
  if (image) return text === "none" ? "img" : `img-${text}`;
  return `text-${text}`;
}

function modalityLabel(image: boolean, text: TextState): string {
  if (!image) {
    return text === "full" ? "Text (full state)" : "Text (visible faces)";
  }
  if (text === "none") return "Image only";
  return text === "full" ? "Image + full text" : "Image + visible text";
}

function entryIdOf(m: RunMeta): string {
  const model = m.model.replace(/\//g, "-");
  const mod = modalitySlug(m.image, m.textState);
  return `${m.suiteId}_${m.taskId}_${model}_${mod}_r-${m.reasoningEffort ?? "default"}`;
}

// --- load suites -----------------------------------------------------------

const suiteCache = new Map<string, SuiteManifest>();
function loadSuite(suiteId: string): SuiteManifest {
  let s = suiteCache.get(suiteId);
  if (!s) {
    s = JSON.parse(
      readFileSync(resolve(BENCH_DIR, "suites", suiteId, "suite.json"), "utf-8"),
    ) as SuiteManifest;
    suiteCache.set(suiteId, s);
  }
  return s;
}

// --- collect runs into entries ---------------------------------------------

interface LoadedRun {
  meta: RunMeta;
  results: CaseResult[];
  /** Tiebreaker for "latest wins" dedup. */
  stamp: string;
}

const entries = new Map<string, LoadedRun[]>();

const runDirs = existsSync(RUNS_DIR)
  ? readdirSync(RUNS_DIR, { withFileTypes: true }).filter((d) => d.isDirectory())
  : [];

for (const d of runDirs) {
  const runDir = resolve(RUNS_DIR, d.name);
  const metaPath = resolve(runDir, "run.json");
  const casesPath = resolve(runDir, "cases.jsonl");
  if (!existsSync(metaPath) || !existsSync(casesPath)) continue;

  const meta: RunMeta = JSON.parse(readFileSync(metaPath, "utf-8"));
  const suite = loadSuite(meta.suiteId);
  if (suite.suiteHash !== meta.suiteHash) {
    console.warn(
      `Skipping ${d.name}: suite regenerated since run (run ${meta.suiteHash}, now ${suite.suiteHash}).`,
    );
    continue;
  }

  const results: CaseResult[] = readFileSync(casesPath, "utf-8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));

  const id = entryIdOf(meta);
  const stamp = meta.finishedAt ?? meta.startedAt ?? "";
  (entries.get(id) ?? entries.set(id, []).get(id)!).push({ meta, results, stamp });
}

// --- build per-entry summary + detail --------------------------------------

const webEntries: WebEntry[] = [];
const detailByEntry: WebEntryDetail[] = [];

// Collected for the end-of-build report — both are "resume the run" situations.
const errorCases: { runId: string; caseId: string }[] = [];
const missingCases: { entryId: string; runId?: string; caseId: string }[] = [];

for (const [entryId, runs] of entries) {
  const head = runs[0].meta;
  const suite = loadSuite(head.suiteId);
  const task = suite.tasks.find((t) => t.id === head.taskId);
  if (!task) {
    console.warn(`Skipping ${entryId}: task "${head.taskId}" not in suite.`);
    continue;
  }
  const caseMap = new Map<string, SuiteCase>(suite.cases.map((c) => [c.id, c]));

  // Dedup at (caseId, trial): the attempt from the latest run wins.
  type Attempt = { res: CaseResult; variant: string; sc: SuiteCase; runId: string };
  const picked = new Map<string, { stamp: string; attempt: Attempt }>();
  let dropped = 0;
  for (const run of runs) {
    for (const res of run.results) {
      const sc = caseMap.get(res.caseId);
      if (!sc) {
        console.warn(`  ${entryId}: case "${res.caseId}" not in suite, skipping.`);
        continue;
      }
      const key = `${res.caseId}#${res.trial}`;
      const existing = picked.get(key);
      if (!existing || run.stamp > existing.stamp) {
        if (existing) dropped++;
        picked.set(key, {
          stamp: run.stamp,
          attempt: { res, variant: sc.variant, sc, runId: run.meta.runId },
        });
      } else {
        dropped++;
      }
    }
  }
  if (dropped) console.log(`  ${entryId}: de-duplicated ${dropped} re-run attempt(s).`);

  const attempts = [...picked.values()].map((p) => p.attempt);

  // Overall aggregates.
  const total = attempts.length;
  const outcomes: WebEntry["outcomes"] = {};
  for (const a of attempts) outcomes[a.res.outcome] = (outcomes[a.res.outcome] ?? 0) + 1;
  const solved = outcomes["solved"] ?? 0;
  const solvedAuf = outcomes["solved-auf"] ?? 0;

  const costs = attempts.map((a) => a.res.usage?.cost).filter((c): c is number => c != null);
  const completionToks = attempts
    .map((a) => a.res.usage?.completionTokens)
    .filter((t): t is number => t != null);
  const totalToks = attempts
    .map((a) => a.res.usage?.totalTokens)
    .filter((t): t is number => t != null);

  // Per-variant breakdown.
  const variantGroups = new Map<string, Attempt[]>();
  for (const a of attempts) {
    (variantGroups.get(a.variant) ?? variantGroups.set(a.variant, []).get(a.variant)!).push(a);
  }
  const byVariant: WebVariantStat[] = sortVariants([...variantGroups.keys()]).map((variant) => {
    const g = variantGroups.get(variant)!;
    const vSolved = g.filter((a) => a.res.outcome === "solved").length;
    const vCosts = g.map((a) => a.res.usage?.cost).filter((c): c is number => c != null);
    const vToks = g
      .map((a) => a.res.usage?.completionTokens)
      .filter((t): t is number => t != null);
    return {
      variant,
      total: g.length,
      solved: vSolved,
      accuracy: g.length ? vSolved / g.length : 0,
      avgCostPerCase: mean(vCosts),
      avgCompletionTokens: mean(vToks),
      avgLatencyMs: mean(g.map((a) => a.res.latencyMs)),
    };
  });

  const variantsCovered = byVariant.map((v) => v.variant);
  // Complete only when every suite case has an attempt — guards against both
  // missing variants and interrupted runs that skipped some cases.
  const attemptedCaseIds = new Set(attempts.map((a) => a.res.caseId));
  const complete = suite.cases.every((c) => attemptedCaseIds.has(c.id));

  // Errored attempts count as failures (they stay in totalCases); flag them so
  // the run can be resumed to retry just those cases.
  for (const a of attempts) {
    if (a.res.outcome === "error") errorCases.push({ runId: a.runId, caseId: a.res.caseId });
  }
  if (!complete) {
    const runForVariant = new Map<string, string>();
    for (const r of runs) {
      if (r.meta.filter.variant) runForVariant.set(r.meta.filter.variant, r.meta.runId);
    }
    for (const c of suite.cases) {
      if (!attemptedCaseIds.has(c.id)) {
        missingCases.push({ entryId, runId: runForVariant.get(c.variant), caseId: c.id });
      }
    }
  }

  webEntries.push({
    entryId,
    suiteId: head.suiteId,
    taskId: head.taskId,
    scoring: task.scoring,
    model: head.model,
    provider: head.model.split("/")[0],
    reasoningEffort: head.reasoningEffort,
    image: head.image,
    textState: head.textState,
    modalityLabel: modalityLabel(head.image, head.textState),
    complete,
    variantsCovered,
    totalCases: total,
    solved,
    solvedAuf,
    accuracy: total ? solved / total : 0,
    outcomes,
    cost: {
      total: costs.reduce((a, b) => a + b, 0),
      avgPerCase: mean(costs),
      complete: costs.length === total,
    },
    tokens: { avgCompletion: mean(completionToks), avgTotal: mean(totalToks) },
    avgLatencyMs: mean(attempts.map((a) => a.res.latencyMs)),
    byVariant,
    runIds: runs.map((r) => r.meta.runId),
  });

  // Detail file.
  const cases: WebCaseDetail[] = attempts
    .map(({ res, variant, sc }) => ({
      caseId: res.caseId,
      variant,
      trial: res.trial,
      outcome: res.outcome,
      extracted: res.extracted,
      rawResponse: res.rawResponse,
      reasoning: res.reasoning,
      cubeState: sc.cubeState,
      setup: sc.setup,
      accept: sc.accept,
      finalState: res.details?.finalState,
      cost: res.usage?.cost,
      completionTokens: res.usage?.completionTokens,
      latencyMs: res.latencyMs,
    }))
    .sort((a, b) => {
      const va = Number(a.variant);
      const vb = Number(b.variant);
      const variantCmp =
        !Number.isNaN(va) && !Number.isNaN(vb)
          ? va - vb
          : a.variant.localeCompare(b.variant);
      return variantCmp || a.caseId.localeCompare(b.caseId) || a.trial - b.trial;
    });
  detailByEntry.push({ entryId, cases });
}

// --- suites metadata -------------------------------------------------------

const webSuites: WebSuite[] = [...suiteCache.values()].map((s) => ({
  suiteId: s.suiteId,
  tasks: s.tasks.map((t) => ({ id: t.id, scoring: t.scoring })),
  variants: sortVariants([...new Set(s.cases.map((c) => c.variant))]),
  caseCount: s.cases.length,
}));

// --- write -----------------------------------------------------------------

webEntries.sort((a, b) => b.accuracy - a.accuracy);

const summary: WebSummary = {
  generatedAt: new Date().toISOString(),
  suites: webSuites,
  entries: webEntries,
};

rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(resolve(OUT_DIR, "runs"), { recursive: true });
writeFileSync(resolve(OUT_DIR, "summary.json"), JSON.stringify(summary, null, 2));
for (const detail of detailByEntry) {
  writeFileSync(resolve(OUT_DIR, "runs", `${detail.entryId}.json`), JSON.stringify(detail));
}

console.log(
  `\nWrote ${webEntries.length} entr${webEntries.length === 1 ? "y" : "ies"} ` +
    `(${detailByEntry.reduce((n, d) => n + d.cases.length, 0)} attempts) to ${OUT_DIR}`,
);

// Group caseIds by run for an actionable "resume this run" report.
function byRun(items: { runId?: string; caseId: string }[]): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const { runId, caseId } of items) {
    const k = runId ?? "(no run yet)";
    (m.get(k) ?? m.set(k, []).get(k)!).push(caseId);
  }
  return m;
}

if (errorCases.length) {
  console.warn(
    `\n⚠ ${errorCases.length} errored case(s) (counted as failures). Resume to retry:`,
  );
  for (const [runId, ids] of byRun(errorCases)) console.warn(`  ${runId}: ${ids.join(", ")}`);
}
if (missingCases.length) {
  console.warn(
    `\n⚠ ${missingCases.length} missing case(s) — those entries are incomplete and hidden:`,
  );
  for (const [runId, ids] of byRun(missingCases)) console.warn(`  ${runId}: ${ids.join(", ")}`);
}
