// Shared data contracts for the whole bench pipeline:
// generate -> suites/<id>/suite.json -> runner -> results/runs/<runId>/

import type { CubeState } from "@cubric/cube";

// ---------------------------------------------------------------------------
// Suite manifest (suites/<suiteId>/suite.json)
// ---------------------------------------------------------------------------

/**
 * How a task's answers are scored.
 * - "exact": normalized string match against the case's `accept` list
 * - "solve": parse the answer as an algorithm, apply it to the case's
 *   cubeState, and check whether the cube ends up solved.
 *   tolerance "auf" treats solved-up-to-a-final-U-turn as a pass
 *   (recorded as its own outcome so aggregation can decide how to weigh it).
 */
export type Scoring =
  | { type: "exact" }
  | { type: "solve"; tolerance: "none" | "auf" };

/**
 * A task is one way of asking questions about a suite's cases.
 * Multiple tasks can share the same cases and images
 * (e.g. PLL "identify" and PLL "solve" use identical screenshots).
 */
export interface TaskDef {
  id: string;
  /** Task-specific instruction, appended after the global prompt. */
  prompt: string;
  scoring: Scoring;
}

export interface SuiteCase {
  id: string;
  /** Path of the screenshot, relative to the suite directory.
   * Absent for text-only suites (run those with --no-image). */
  image?: string;
  /** Generation variant — suite-specific, e.g. PLL y-view ("base"/"y"/...)
   * or scramble move count ("1"/"2"/...). Selectable at run time via --variant. */
  variant: string;
  /** Accepted answers for "exact" scoring tasks (empty for "solve" tasks). */
  accept: string[];
  cubeState: CubeState;
  /** Algorithm that produces cubeState from a solved cube. Never shown to the
   * model — recorded so a case can be traced back to how it was generated. */
  setup: string;
  /** Camera used to render the screenshot. Absent for text-only suites. */
  cameraPosition?: [number, number, number];
}

export interface SuiteManifest {
  suiteId: string;
  /** Content hash of cases + image bytes. Results reference this so we know
   * exactly which generation a run was scored against. */
  suiteHash: string;
  generatedAt: string;
  tasks: TaskDef[];
  cases: SuiteCase[];
}

// ---------------------------------------------------------------------------
// Run records (results/runs/<runId>/)
// ---------------------------------------------------------------------------

/**
 * How much of the cube state is given as text — composed at run time from
 * cubeState, never baked into suites.
 * - "none": no text state
 * - "visible": the 3 visible faces (U, F, R) — informationally equivalent to the image
 * - "full": all 6 faces
 */
export type TextState = "none" | "visible" | "full";

/** results/runs/<runId>/run.json */
export interface RunMeta {
  runId: string;
  suiteId: string;
  suiteHash: string;
  taskId: string;
  /** Whether the case screenshot was sent to the model.
   * Together with textState this defines the input modality of the run
   * (image && textState "none" was the old "hard" tier, etc.).
   * image=false requires textState != "none". */
  image: boolean;
  textState: TextState;
  /** OpenRouter model id, e.g. "google/gemini-2.0-flash-001" */
  model: string;
  /** OpenRouter unified reasoning effort (none|minimal|low|medium|high|xhigh).
   * Absent = parameter not sent, model default. The same model at different
   * efforts is a different benchmark entry. */
  reasoningEffort?: string;
  /** Version id of the global prompt used (see runner/prompts.ts). */
  globalPromptVersion: string;
  trials: number;
  /** Case selection used for this run, recorded for reproducibility. */
  filter: {
    variant?: string;
    limit?: number;
  };
  startedAt: string;
  finishedAt?: string;
}

/** Outcome of scoring one answer. */
export type Outcome =
  // exact tasks
  | "correct"
  | "incorrect"
  // solve tasks
  | "solved"
  | "solved-auf" // solved except a final U-layer turn
  | "unsolved"
  | "invalid-moves" // answer could not be parsed as an algorithm
  // either
  | "quit" // the model answered "Q" (gave up)
  | "error"; // request failed, no answer to score

/** One line in results/runs/<runId>/cases.jsonl — one (case x trial) attempt.
 * rawResponse is always stored verbatim so scoring can be re-run offline
 * without repeating the API call. */
export interface CaseResult {
  caseId: string;
  trial: number;
  /** Full model response, verbatim. */
  rawResponse: string;
  /** Reasoning/thinking text, when the model/provider exposes it. */
  reasoning?: string;
  /** Answer extracted from rawResponse (last non-empty line, fences stripped). */
  extracted: string;
  outcome: Outcome;
  /** Extra scoring data for analysis. */
  details: {
    /** exact tasks: the normalized guess (for confusion matrices). */
    normalizedGuess?: string;
    /** solve tasks: cube state after applying the model's answer. */
    finalState?: CubeState;
  };
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    /** USD, as reported by OpenRouter. */
    cost?: number;
  };
  latencyMs: number;
  error?: string;
  finishedAt: string;
}
