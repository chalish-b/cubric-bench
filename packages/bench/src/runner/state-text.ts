// Renders a CubeState as text for the textState modality.
// Composed at run time from the suite's cubeState — never baked into suites.

import { Color, type CubeState, type Face } from "@cubric/cube";
import type { TextState } from "../schema";

const COLOR_NAMES: Record<Color, string> = {
  [Color.White]: "White",
  [Color.Yellow]: "Yellow",
  [Color.Green]: "Green",
  [Color.Blue]: "Blue",
  [Color.Red]: "Red",
  [Color.Orange]: "Orange",
};

const FACE_LABELS: Record<Face, string> = {
  U: "U (top)",
  F: "F (front)",
  R: "R (right)",
  D: "D (bottom)",
  L: "L (left)",
  B: "B (back)",
};

// Sticker arrays are row-major and match the standard unfolded net:
// U above F; L, F, R, B in a horizontal strip; D below F.
const NET_NOTE =
  "Each face is shown as 3 rows of 3 stickers, read left to right, top to bottom, as laid out on a standard unfolded cube net (U above F; L, F, R, B in a strip; D below F).";

function renderFace(state: CubeState, face: Face): string {
  const rows: string[] = [];
  for (let r = 0; r < 3; r++) {
    const row = state[face]
      .slice(r * 3, r * 3 + 3)
      .map((c) => COLOR_NAMES[c])
      .join(" ");
    rows.push(`  ${row}`);
  }
  return `${FACE_LABELS[face]}:\n${rows.join("\n")}`;
}

export function renderStateText(state: CubeState, faces: Face[]): string {
  return `${NET_NOTE}\n\n${faces.map((f) => renderFace(state, f)).join("\n")}`;
}

/** The state text block to include in the prompt, or null for "none". */
export function stateTextBlock(
  state: CubeState,
  textState: TextState,
): string | null {
  if (textState === "none") return null;
  if (textState === "visible") {
    return `Sticker colors of the U, F and R faces:\n${renderStateText(state, ["U", "F", "R"])}`;
  }
  return `Sticker colors of all 6 faces:\n${renderStateText(state, ["U", "F", "R", "D", "L", "B"])}`;
}
