import {
  Cube,
  pllAlgorithms,
  parseAlgorithm,
  invertAlgorithm,
  stringifyAlgorithm,
  type CubeState,
} from "@cubric/cube";
import { mulberry32, hashString } from "./seed-random";

export interface PllCase {
  id: string;
  pllName: string;
  variant: "base" | "random";
  accept: string[];
  cubeState: CubeState;
  setup: string;
  cameraPosition: [number, number, number];
}

const RANDOM_VARIANTS = 3;

const PRE_AUFS = ["U", "U'", "U2"] as const;
const Y_ROTATIONS = ["y", "y'", "y2"] as const;

function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

/** Apply the setup algorithm to a yellow-top cube and return the resulting state. */
function applySetup(setup: string): CubeState {
  const cube = new Cube();
  cube.applyAlgorithm("x2"); // yellow on top
  cube.applyAlgorithm(setup);
  return cube.getStateClone();
}

/** Try to find a unique (preAuf, yRot) combo that produces a state not in seenStates. */
function pickUniqueVariant(
  inversePll: string,
  seenStates: Set<string>,
  rng: () => number,
): { preAuf: string; yRot: string } | null {
  for (let attempt = 0; attempt < 20; attempt++) {
    // AUF before the algorithm changes which PLL pattern variant is shown
    // y-rotation after changes the viewing angle (which faces are visible)
    const preAuf = rng() < 0.75 ? pick(PRE_AUFS, rng) : "";
    const yRot = rng() < 0.75 ? pick(Y_ROTATIONS, rng) : "";
    if (!preAuf && !yRot) continue;

    const setup = [preAuf, inversePll, yRot].filter(Boolean).join(" ");
    const stateKey = JSON.stringify(applySetup(setup));

    if (!seenStates.has(stateKey)) {
      seenStates.add(stateKey);
      return { preAuf, yRot };
    }
  }
  return null;
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
  let globalIndex = 0;

  for (const pll of pllAlgorithms) {
    const inversePll = stringifyAlgorithm(
      invertAlgorithm(parseAlgorithm(pll.algorithm)),
    );

    // Base case: no AUF, no y-rotation
    globalIndex++;
    const baseId = `pll-${pll.name}-${String(globalIndex).padStart(2, "0")}`;
    const baseRng = mulberry32(hashString(baseId));
    const baseCubeState = applySetup(inversePll);
    cases.push({
      id: baseId,
      pllName: pll.name,
      variant: "base",
      accept: [pll.name],
      cubeState: baseCubeState,
      setup: inversePll,
      cameraPosition: makeCameraPosition(baseRng),
    });

    // Random variants: random AUF and/or y-rotation, deduplicated
    const seenStates = new Set([JSON.stringify(baseCubeState)]);
    const variantRng = mulberry32(hashString(`${pll.name}-variants`));

    for (let v = 0; v < RANDOM_VARIANTS; v++) {
      const variant = pickUniqueVariant(inversePll, seenStates, variantRng);
      if (!variant) continue;

      globalIndex++;
      const id = `pll-${pll.name}-${String(globalIndex).padStart(2, "0")}`;
      const setup = [variant.preAuf, inversePll, variant.yRot]
        .filter(Boolean)
        .join(" ");

      cases.push({
        id,
        pllName: pll.name,
        variant: "random",
        accept: [pll.name],
        cubeState: applySetup(setup),
        setup,
        cameraPosition: makeCameraPosition(mulberry32(hashString(id))),
      });
    }
  }

  return cases;
}
