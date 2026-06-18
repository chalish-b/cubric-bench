// Generates the "scramble" suite: a solved cube scrambled with n random face
// moves, given to the model as full 6-face text. The model returns a sequence
// that solves it (any valid solution passes — see runner/score.ts "solve").
//
// Move count n is the difficulty knob and becomes the case variant, so a single
// run can sweep n=1,2,3,... and be sliced with --variant.

import { Cube, type CubeState } from "@cubric/cube";
import { isStateSolved } from "../runner/score";
import { mulberry32, hashString } from "./seed-random";
import type { GeneratedCase } from "./build-suite";

const FACES = ["U", "D", "L", "R", "F", "B"] as const;
const TURNS = ["", "'", "2"] as const; // quarter cw, quarter ccw, half

/**
 * An n-move scramble with no two consecutive moves on the same face. That rule
 * keeps every n-move scramble genuinely n moves from solved: same-face pairs
 * like "R R'" (collapses to nothing) or "R R" (collapses to "R2") can't occur.
 */
function makeScramble(moveCount: number, rng: () => number): string {
  const moves: string[] = [];
  let prevFace = "";
  for (let i = 0; i < moveCount; i++) {
    let face: string;
    do {
      face = FACES[Math.floor(rng() * FACES.length)];
    } while (face === prevFace);
    prevFace = face;
    moves.push(face + TURNS[Math.floor(rng() * TURNS.length)]);
  }
  return moves.join(" ");
}

function applyScramble(scramble: string): CubeState {
  const cube = new Cube();
  cube.applyAlgorithm(scramble);
  return cube.getStateClone();
}

/** One case per (move count, index). Seeded per case so output is stable. */
export function generateScrambleCases(
  moveCounts: number[],
  perCount: number,
): GeneratedCase[] {
  const cases: GeneratedCase[] = [];

  for (const n of moveCounts) {
    const seenStates = new Set<string>();
    let kept = 0;
    let attempt = 0;
    // n distinct face-moves bound the distinct states; cap attempts so an
    // over-large perCount fails loudly instead of spinning.
    const maxAttempts = Math.max(1000, perCount * 200);

    while (kept < perCount) {
      if (attempt >= maxAttempts) {
        throw new Error(
          `Could only find ${kept} distinct ${n}-move scrambles (wanted ${perCount}); lower --count for n=${n}.`,
        );
      }
      const rng = mulberry32(hashString(`scramble-${n}-${attempt}`));
      attempt++;

      const scramble = makeScramble(n, rng);
      const cubeState = applyScramble(scramble);
      const key = JSON.stringify(cubeState);
      if (isStateSolved(cubeState) || seenStates.has(key)) continue;
      seenStates.add(key);

      cases.push({
        id: `scramble-${n}m-${String(kept + 1).padStart(2, "0")}`,
        variant: String(n),
        accept: [],
        cubeState,
        setup: scramble,
      });
      kept++;
    }
  }

  return cases;
}
