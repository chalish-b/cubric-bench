// Core benchmark run: one (suite x task x model x modality) selection ->
// results/runs/<runId>/. Drives the OpenRouter collection, scoring, and result
// persistence for a single run. The CLI (run.ts) builds one config from argv
// and calls this; the batch runner (batch.ts) calls it once per config entry.

import {
  readFileSync,
  writeFileSync,
  appendFileSync,
  mkdirSync,
  existsSync,
} from "fs";
import { resolve } from "path";
import type { SuiteManifest, SuiteCase, RunMeta, CaseResult, TextState } from "../schema";
import { GLOBAL_PROMPT_VERSION, composePrompt, promptScaffold } from "./prompts";
import { stateTextBlock } from "./state-text";
import { extractAnswer } from "./extract";
import { scoreAnswer } from "./score";
import { chat } from "./openrouter";

export const BENCH_DIR = resolve(import.meta.dirname, "../..");
export const TEXT_STATES: TextState[] = ["none", "visible", "full"];

// OpenRouter's unified reasoning effort levels (models without reasoning
// support ignore the parameter without error).
export const REASONING_EFFORTS = ["none", "minimal", "low", "medium", "high", "xhigh"] as const;
export type ReasoningEffort = (typeof REASONING_EFFORTS)[number];

/** Fully-resolved parameters for a single run (defaults already applied). */
export interface RunConfig {
  suite: string;
  task: string;
  model: string;
  /** Send the case screenshot to the model. */
  image: boolean;
  /** How much of the cube state to include as text. */
  textState: TextState;
  reasoningEffort?: ReasoningEffort;
  trials: number;
  variant?: string;
  limit?: number;
  concurrency: number;
  timeoutMs: number;
  /** Resume an existing runId: re-run errored + missing attempts in this selection. */
  resume?: string;
  /** Preview what would be sent without making any requests. */
  dryRun?: boolean;
}

export interface RunSummary {
  runId: string;
  runDir: string;
  /** Attempts collected this invocation (excludes already-completed on resume). */
  jobCount: number;
  /** Outcome -> count over the attempts collected this invocation. */
  outcomes: Record<string, number>;
}

/** Short modality label for the run id, e.g. "img-vtext" or "ftext". */
function modalityLabel(image: boolean, textState: TextState): string {
  return [image ? "img" : null, { none: null, visible: "vtext", full: "ftext" }[textState]]
    .filter(Boolean)
    .join("-");
}

/** Run one benchmark selection. Throws on invalid config or unrecoverable setup. */
export async function runBench(config: RunConfig): Promise<RunSummary> {
  const {
    suite: suiteId,
    task: taskId,
    model,
    image,
    textState,
    reasoningEffort,
    trials,
    variant,
    limit,
    concurrency,
    timeoutMs,
    resume,
    dryRun,
  } = config;

  if (!TEXT_STATES.includes(textState)) {
    throw new Error(`text must be one of: ${TEXT_STATES.join(", ")}`);
  }
  if (!image && textState === "none") {
    throw new Error("no-image runs require text visible or full (the model needs some input)");
  }
  if (reasoningEffort && !REASONING_EFFORTS.includes(reasoningEffort)) {
    throw new Error(`reasoning must be one of: ${REASONING_EFFORTS.join(", ")}`);
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey && !dryRun) throw new Error("OPENROUTER_API_KEY is not set");

  // --- Load suite and select cases ---

  const suiteDir = resolve(BENCH_DIR, "suites", suiteId);
  const suitePath = resolve(suiteDir, "suite.json");
  if (!existsSync(suitePath)) throw new Error(`No suite manifest at ${suitePath}`);
  const suite: SuiteManifest = JSON.parse(readFileSync(suitePath, "utf-8"));

  const task = suite.tasks.find((t) => t.id === taskId);
  if (!task) {
    throw new Error(
      `Task "${taskId}" not found in suite "${suite.suiteId}" (available: ${suite.tasks.map((t) => t.id).join(", ")})`,
    );
  }

  let cases = suite.cases;
  if (variant) cases = cases.filter((c) => c.variant === variant);
  if (limit) cases = cases.slice(0, limit);
  if (cases.length === 0) throw new Error("Case selection matched no cases");

  // Text-only suites ship no screenshots, so image input isn't possible.
  if (image && cases.some((c) => !c.image)) {
    throw new Error(
      `Suite "${suite.suiteId}" has cases without screenshots (text-only). Re-run with image off (and text full).`,
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

  const label = modalityLabel(image, textState);

  // --- Dry run: show what would be sent, call nothing ---

  if (dryRun) {
    const example = cases[0];
    console.log(`Suite: ${suite.suiteId} (${suite.suiteHash})`);
    console.log(`Task: ${task.id} | scoring: ${JSON.stringify(task.scoring)}`);
    console.log(
      `Modality: ${label} (image: ${image}, text: ${textState}) | model: ${model} | reasoning: ${reasoningEffort ?? "default"} | trials: ${trials}`,
    );
    console.log(`Selected cases: ${cases.length} (of ${suite.cases.length})`);
    console.log(`Requests that would be made: ${cases.length * trials}`);
    console.log(
      `\n--- Example message for ${example.id}${image ? ` (+ image ${example.image})` : " (no image)"} ---\n`,
    );
    console.log(promptForCase(example));
    return { runId: "dry-run", runDir: "", jobCount: 0, outcomes: {} };
  }

  // --- Set up the run directory (new or resumed) ---

  const runId =
    resume ??
    [
      new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-"),
      suite.suiteId,
      task.id,
      model.replace(/[^a-zA-Z0-9.]+/g, "-"),
      label,
      ...(reasoningEffort ? [`r-${reasoningEffort}`] : []),
    ].join("_");

  const runDir = resolve(BENCH_DIR, "results/runs", runId);
  const casesPath = resolve(runDir, "cases.jsonl");

  const completed = new Set<string>();
  if (resume) {
    if (!existsSync(casesPath)) throw new Error(`Nothing to resume at ${casesPath}`);
    const existingMeta: RunMeta = JSON.parse(
      readFileSync(resolve(runDir, "run.json"), "utf-8"),
    );
    if (existingMeta.suiteHash !== suite.suiteHash) {
      throw new Error(
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
      prompt: promptScaffold(image, textState, task.prompt),
      trials,
      filter: {
        ...(variant ? { variant } : {}),
        ...(limit ? { limit } : {}),
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

  return { runId, runDir, jobCount: jobs.length, outcomes: Object.fromEntries(outcomes) };
}
