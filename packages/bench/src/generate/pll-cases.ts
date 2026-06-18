import {
  Cube,
  parseAlgorithm,
  invertAlgorithm,
  stringifyAlgorithm,
  type CubeState,
} from "@cubric/cube";
import { pllAlgorithms } from "../algorithms";
import { mulberry32, hashString } from "./seed-random";

export interface PllCase {
  id: string;
  pllName: string;
  /** Which view this case shows: "base" plus the three y-rotations. */
  variant: string;
  accept: string[];
  cubeState: CubeState;
  setup: string;
  cameraPosition: [number, number, number];
}

// Each PLL is shown from 4 angles: the tuned base case, then y / y2 / y' to
// rotate the cube and reveal the other side-face pairs. No AUF variants — the
// base case is already the intuitive, recognizable presentation, and y moves
// test recognition robustness across viewing angles (the axis that matters).
const Y_VIEWS = [
  { label: "base", rot: "" },
  { label: "y", rot: "y" },
  { label: "y2", rot: "y2" },
  { label: "yprime", rot: "y'" },
] as const;

/** Apply the setup algorithm to a yellow-top cube and return the resulting state. */
function applySetup(setup: string): CubeState {
  const cube = new Cube();
  cube.applyAlgorithm("x2"); // yellow on top
  if (setup.trim()) cube.applyAlgorithm(setup);
  return cube.getStateClone();
}

// Base camera distance. lower = more zoomed in
// NOTE: Make this: [6, 4.5, 6] if you enable the ghost images to make them fit
const CAMERA_BASE: [number, number, number] = [5, 4, 5];

// Add some slight randomness to camera angle to mix things up a bit
const CAMERA_JITTER = 0.5; // ± per axis

function makeCameraPosition(rng: () => number): [number, number, number] {
  return [
    CAMERA_BASE[0] + (rng() * 2 - 1) * CAMERA_JITTER,
    CAMERA_BASE[1] + (rng() * 2 - 1) * CAMERA_JITTER,
    CAMERA_BASE[2] + (rng() * 2 - 1) * CAMERA_JITTER,
  ];
}

export function generatePllCases(): PllCase[] {
  const cases: PllCase[] = [];

  for (const pll of pllAlgorithms) {
    const inverse = stringifyAlgorithm(
      invertAlgorithm(parseAlgorithm(pll.algorithm)),
    );

    // Symmetric PLLs (H, Z, N) produce visually identical states for some
    // y-views — dedupe so we don't ship duplicate images as separate cases.
    const seenStates = new Set<string>();

    for (const view of Y_VIEWS) {
      const setup = [inverse, view.rot].filter(Boolean).join(" ");
      const cubeState = applySetup(setup);

      const stateKey = JSON.stringify(cubeState);
      if (seenStates.has(stateKey)) continue;
      seenStates.add(stateKey);

      const id = `pll-${pll.name}-${view.label}`;
      cases.push({
        id,
        pllName: pll.name,
        variant: view.label,
        accept: [pll.name],
        cubeState,
        setup,
        cameraPosition: makeCameraPosition(mulberry32(hashString(id))),
      });
    }
  }

  return cases;
}
