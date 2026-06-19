// Display metadata for case outcomes (see Outcome in @cubric/bench/web).
export interface OutcomeMeta {
  label: string;
  color: string;
  /** A successful solve (counts toward accuracy). */
  success: boolean;
}

const OUTCOME_META: Record<string, OutcomeMeta> = {
  solved: { label: "Solved", color: "#16a34a", success: true },
  "solved-auf": { label: "Solved (AUF)", color: "#0d9488", success: true },
  unsolved: { label: "Unsolved", color: "#dc2626", success: false },
  "invalid-moves": { label: "Invalid moves", color: "#ea580c", success: false },
  quit: { label: "Gave up", color: "#a16207", success: false },
  error: { label: "Error", color: "#71717a", success: false },
  correct: { label: "Correct", color: "#16a34a", success: true },
  incorrect: { label: "Incorrect", color: "#dc2626", success: false },
};

export function outcomeMeta(outcome: string): OutcomeMeta {
  return OUTCOME_META[outcome] ?? { label: outcome, color: "#71717a", success: false };
}
