// Data contract for the results website. build-data.ts crunches all runs into
// these shapes; the `results` app reads them. Importable as
// `@cubric/bench/web`.

import type { CubeState } from "@cubric/cube";
import type { Outcome, Scoring, TextState } from "../schema";

/** summary.json — everything the leaderboard and analysis views need. */
export interface WebSummary {
  generatedAt: string;
  suites: WebSuite[];
  entries: WebEntry[];
}

export interface WebSuite {
  suiteId: string;
  tasks: { id: string; scoring: Scoring }[];
  /** All variants the suite defines, in display order. */
  variants: string[];
  caseCount: number;
}

/**
 * One leaderboard row: a (suite, task, model, reasoning, modality) combination,
 * aggregated across every variant run for it. `complete` is false when the
 * entry is missing runs for some of its suite's variants.
 */
export interface WebEntry {
  entryId: string;
  suiteId: string;
  taskId: string;
  scoring: Scoring;
  /** OpenRouter model id, e.g. "openai/gpt-5.5". */
  model: string;
  /** Derived from the model id ("openai", "google", ...). */
  provider: string;
  reasoningEffort?: string;
  image: boolean;
  textState: TextState;
  /** Human-readable modality, e.g. "Text (full state)". */
  modalityLabel: string;
  complete: boolean;
  variantsCovered: string[];

  totalCases: number;
  /** Strictly solved. */
  solved: number;
  /** Solved up to a final AUF (always 0 for "none"-tolerance tasks). */
  solvedAuf: number;
  /** solved / totalCases. */
  accuracy: number;
  outcomes: Partial<Record<Outcome, number>>;

  cost: { total: number; avgPerCase: number; complete: boolean };
  tokens: { avgCompletion: number; avgTotal: number };
  avgLatencyMs: number;

  byVariant: WebVariantStat[];
  runIds: string[];
}

export interface WebVariantStat {
  variant: string;
  total: number;
  solved: number;
  accuracy: number;
  avgCostPerCase: number;
  avgCompletionTokens: number;
  avgLatencyMs: number;
}

/** runs/<entryId>.json — per-attempt detail for the case inspector. */
export interface WebEntryDetail {
  entryId: string;
  cases: WebCaseDetail[];
}

export interface WebCaseDetail {
  caseId: string;
  variant: string;
  trial: number;
  outcome: Outcome;
  /** The model's answer (extracted) and full response. */
  extracted: string;
  rawResponse: string;
  reasoning?: string;
  /** The cube state posed to the model. */
  cubeState: CubeState;
  /** Moves that produced cubeState from solved (the answer key context). */
  setup: string;
  /** Accepted answers for exact tasks (empty for solve tasks). */
  accept: string[];
  /** Cube state after applying the model's answer (solve tasks). */
  finalState?: CubeState;
  cost?: number;
  completionTokens?: number;
  latencyMs: number;
}
