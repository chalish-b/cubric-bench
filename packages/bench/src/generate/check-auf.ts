/**
 * AUF audit: does every PLL algorithm produce the canonical base-case
 * presentation when inverted?
 *
 * An algorithm that omits its final AUF still produces a state in the right
 * PLL class, but presented with the whole top layer twisted — so the base-case
 * image doesn't look like the textbook diagram. We detect this by comparing
 * the corner/edge cycle structure of the produced state against the canonical
 * structure of each PLL, for each candidate trailing AUF.
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

const SIDES = ["F", "R", "B", "L"] as const;
type Side = (typeof SIDES)[number];

/** Canonical permutation structure of each PLL: sorted cycle lengths.
 * (Cycle lengths only — which pieces cycle varies with the diagram's angle.) */
const CANONICAL: Record<string, { corners: number[]; edges: number[] }> = {
  Aa: { corners: [3], edges: [] },
  Ab: { corners: [3], edges: [] },
  E: { corners: [2, 2], edges: [] },
  Ua: { corners: [], edges: [3] },
  Ub: { corners: [], edges: [3] },
  H: { corners: [], edges: [2, 2] },
  Z: { corners: [], edges: [2, 2] },
  T: { corners: [2], edges: [2] },
  F: { corners: [2], edges: [2] },
  Ja: { corners: [2], edges: [2] },
  Jb: { corners: [2], edges: [2] },
  Ra: { corners: [2], edges: [2] },
  Rb: { corners: [2], edges: [2] },
  Na: { corners: [2], edges: [2] },
  Nb: { corners: [2], edges: [2] },
  V: { corners: [2], edges: [2] },
  Y: { corners: [2], edges: [2] },
  Ga: { corners: [3], edges: [3] },
  Gb: { corners: [3], edges: [3] },
  Gc: { corners: [3], edges: [3] },
  Gd: { corners: [3], edges: [3] },
};

/** Base-case state the suite generator would produce for this algorithm. */
function baseStateFor(algorithm: string): CubeState {
  const cube = new Cube();
  cube.applyAlgorithm("x2");
  cube.applyAlgorithm(
    stringifyAlgorithm(invertAlgorithm(parseAlgorithm(algorithm))),
  );
  return cube.getStateClone();
}

function cycleLengths(perm: Map<string, string>): number[] {
  const seen = new Set<string>();
  const lengths: number[] = [];
  for (const start of perm.keys()) {
    if (seen.has(start)) continue;
    let cur = start;
    let len = 0;
    while (!seen.has(cur)) {
      seen.add(cur);
      len++;
      cur = perm.get(cur)!;
    }
    if (len > 1) lengths.push(len);
  }
  return lengths.sort();
}

/** Corner and edge cycle structure of the last layer, relative to centers. */
function structure(s: CubeState): { corners: number[]; edges: number[] } {
  const faceOf = new Map<number, Side>();
  for (const f of SIDES) faceOf.set(s[f][4], f);

  // Edges: the occupant of position f is identified by its side sticker color
  const edgePerm = new Map<string, string>();
  for (const f of SIDES) edgePerm.set(faceOf.get(s[f][1])!, f);

  // Corners by their two side faces: FL, FR, RB, BL
  const cornerPositions: Array<[Side, number, Side, number]> = [
    ["F", 0, "L", 2],
    ["F", 2, "R", 0],
    ["R", 2, "B", 0],
    ["B", 2, "L", 0],
  ];
  const key = (a: string, b: string) => [a, b].sort().join("");
  const cornerPerm = new Map<string, string>();
  for (const [fa, ia, fb, ib] of cornerPositions) {
    cornerPerm.set(
      key(faceOf.get(s[fa][ia])!, faceOf.get(s[fb][ib])!),
      key(fa, fb),
    );
  }

  return { corners: cycleLengths(cornerPerm), edges: cycleLengths(edgePerm) };
}

let broken = 0;
for (const pll of pllAlgorithms) {
  const expected = CANONICAL[pll.name];
  const matches = AUFS.filter((auf) => {
    const s = structure(
      baseStateFor(auf ? `${pll.algorithm} ${auf}` : pll.algorithm),
    );
    return (
      JSON.stringify(s.corners) === JSON.stringify(expected.corners) &&
      JSON.stringify(s.edges) === JSON.stringify(expected.edges)
    );
  });

  if (matches.includes("")) {
    const others = matches.filter(Boolean);
    console.log(
      `OK    ${pll.name.padEnd(3)}` +
        (others.length
          ? `  [${others.join(", ")} also matches — symmetric case, verify the diagram angle visually]`
          : ""),
    );
  } else {
    broken++;
    console.log(
      matches.length
        ? `WRONG ${pll.name.padEnd(3)} -> append "${matches[0]}" to the algorithm`
        : `WRONG ${pll.name.padEnd(3)} -> no trailing AUF matches the ${JSON.stringify(expected)} structure — the algorithm itself is not a ${pll.name} perm!`,
    );
  }
}

console.log(`\n${broken} of ${pllAlgorithms.length} algorithms need a fix`);
