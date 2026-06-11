// Scoring is a pure function over (scoring config, extracted answer, case).
// It runs inline during collection for convenience, and can always be re-run
// offline from the stored raw responses (rescore.ts).

import { Cube, parseAlgorithm, type CubeState } from "@cubric/cube";
import type { Outcome, Scoring, SuiteCase, CaseResult } from "../schema";

const AUF_MOVES = ["U", "U'", "U2"] as const;

/** Orientation-agnostic solved check: every face uniform.
 * (Cube.isSolved compares against the default orientation, which would report
 * false for our x2-oriented setups even when the cube is actually solved.) */
export function isStateSolved(state: CubeState): boolean {
  return Object.values(state).every((face) =>
    face.every((c) => c === face[0]),
  );
}

/** Normalize an identification guess for comparison and confusion matrices:
 * case-insensitive, ignores a "perm"/"-perm"/"permutation" suffix. */
export function normalizeGuess(answer: string): string {
  return answer
    .replace(/[\s-]*perm(utation)?$/i, "")
    .trim()
    .toLowerCase();
}

export interface ScoreResult {
  outcome: Outcome;
  details: CaseResult["details"];
}

export function scoreAnswer(
  scoring: Scoring,
  extracted: string,
  suiteCase: SuiteCase,
): ScoreResult {
  // "Q" is the agreed give-up answer for every task type
  if (extracted === "Q") {
    return { outcome: "quit", details: {} };
  }

  if (scoring.type === "exact") {
    const guess = normalizeGuess(extracted);
    const correct = suiteCase.accept.some((a) => normalizeGuess(a) === guess);
    return {
      outcome: correct ? "correct" : "incorrect",
      details: { normalizedGuess: guess },
    };
  }

  // scoring.type === "solve"
  let cube: Cube;
  try {
    parseAlgorithm(extracted); // validate before touching the cube
    cube = Cube.fromState(suiteCase.cubeState);
    cube.applyAlgorithm(extracted);
  } catch {
    return { outcome: "invalid-moves", details: {} };
  }

  const finalState = cube.getStateClone();
  if (isStateSolved(finalState)) {
    return { outcome: "solved", details: { finalState } };
  }

  if (scoring.tolerance === "auf") {
    for (const auf of AUF_MOVES) {
      const c = Cube.fromState(finalState);
      c.applyAlgorithm(auf);
      if (isStateSolved(c.getStateClone())) {
        return { outcome: "solved-auf", details: { finalState } };
      }
    }
  }

  return { outcome: "unsolved", details: { finalState } };
}
