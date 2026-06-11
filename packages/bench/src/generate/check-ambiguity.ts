/**
 * Fairness check: can every PLL case be uniquely identified (and solved)
 * from the visible U/F/R faces alone?
 *
 * Enumerates all 21 PLLs x 4 pre-AUFs x 4 y-rotations, projects each state
 * onto the visible faces, and reports collisions:
 *  - ID-ambiguous: two different PLL names share the same visible projection
 *  - solve-ambiguous: two states share a projection AND the solution for one
 *    does not solve the other (even with AUF tolerance)
 */
import {
  Cube,
  pllAlgorithms,
  parseAlgorithm,
  invertAlgorithm,
  stringifyAlgorithm,
  type CubeState,
} from "@cubric/cube";

const AUFS = ["", "U", "U'", "U2"] as const;
const YS = ["", "y", "y'", "y2"] as const;

interface Entry {
  name: string;
  setup: string; // applied after x2
  projection: string;
  stateKey: string;
  state: CubeState;
}

function makeState(setup: string): CubeState {
  const cube = new Cube();
  cube.applyAlgorithm("x2");
  if (setup.trim()) cube.applyAlgorithm(setup);
  return cube.getStateClone();
}

function isFaceUniform(face: number[]): boolean {
  return face.every((c) => c === face[0]);
}

function isSolved(state: CubeState): boolean {
  return Object.values(state).every(isFaceUniform);
}

function cubeFromState(state: CubeState): Cube {
  const cube = new Cube();
  cube.state = structuredClone(state);
  return cube;
}

function isSolvedUpToAuf(state: CubeState): boolean {
  for (const auf of AUFS) {
    const cube = cubeFromState(state);
    if (auf) cube.applyAlgorithm(auf);
    if (isSolved(cube.getStateClone())) return true;
  }
  return false;
}

const entries: Entry[] = [];
for (const pll of pllAlgorithms) {
  const inv = stringifyAlgorithm(invertAlgorithm(parseAlgorithm(pll.algorithm)));
  for (const auf of AUFS) {
    for (const y of YS) {
      const setup = [auf, inv, y].filter(Boolean).join(" ");
      const state = makeState(setup);
      entries.push({
        name: pll.name,
        setup,
        projection: JSON.stringify([state.U, state.F, state.R]),
        stateKey: JSON.stringify(state),
        state,
      });
    }
  }
}

console.log(`Enumerated ${entries.length} setups`);
console.log(`Distinct full states: ${new Set(entries.map((e) => e.stateKey)).size}`);
console.log(`Distinct U/F/R projections: ${new Set(entries.map((e) => e.projection)).size}`);

const byProjection = new Map<string, Entry[]>();
for (const e of entries) {
  const group = byProjection.get(e.projection) ?? [];
  group.push(e);
  byProjection.set(e.projection, group);
}

let idAmbiguous = 0;
let solveAmbiguous = 0;
let benignCollisions = 0;

for (const group of byProjection.values()) {
  const distinctStates = new Set(group.map((e) => e.stateKey));
  if (distinctStates.size <= 1) continue;

  const names = new Set(group.map((e) => e.name));
  if (names.size > 1) {
    idAmbiguous++;
    console.log(
      `ID-AMBIGUOUS projection shared by: ${group
        .map((e) => `${e.name} (setup: ${e.setup})`)
        .join("  |  ")}`,
    );
  }

  // Solve check: does A's solution solve B (with AUF tolerance)?
  const reps = [...new Map(group.map((e) => [e.stateKey, e])).values()];
  let groupSolveAmbiguous = false;
  for (const a of reps) {
    const solutionForA = stringifyAlgorithm(
      invertAlgorithm(parseAlgorithm(a.setup)),
    );
    for (const b of reps) {
      if (a === b) continue;
      const cube = cubeFromState(b.state);
      cube.applyAlgorithm(solutionForA);
      if (!isSolvedUpToAuf(cube.getStateClone())) {
        groupSolveAmbiguous = true;
        console.log(
          `SOLVE-AMBIGUOUS: solution for [${a.name}: ${a.setup}] does not solve look-alike [${b.name}: ${b.setup}]`,
        );
      }
    }
  }
  if (groupSolveAmbiguous) solveAmbiguous++;
  else benignCollisions++;
}

console.log(`\nProjection groups with multiple distinct states:`);
console.log(`  ID-ambiguous (different PLL names look identical): ${idAmbiguous}`);
console.log(`  Solve-ambiguous (cross-solution fails even with AUF tolerance): ${solveAmbiguous}`);
console.log(`  Benign (same name, solutions interchangeable up to AUF): ${benignCollisions}`);
