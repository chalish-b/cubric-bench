// Cube state representation, move parsing, algorithm application

export enum Color {
  White,
  Yellow,
  Green,
  Blue,
  Red,
  Orange,
}

export const sides = ["U", "R", "F", "D", "L", "B"] as const;
export type Side = (typeof sides)[number];
export type CubeState = {
  U: Color[];
  R: Color[];
  F: Color[];
  D: Color[];
  L: Color[];
  B: Color[];
};

// The standard is to have U=White and F=Green
// Use moves like "x" "y" and "z" to change the orientation
// The image given to the AI will always show the "F R U" faces
function getDefaultState(): CubeState {
  return {
    U: Array(9).fill(Color.White),
    R: Array(9).fill(Color.Red),
    F: Array(9).fill(Color.Green),
    D: Array(9).fill(Color.Yellow),
    L: Array(9).fill(Color.Orange),
    B: Array(9).fill(Color.Blue),
  };
}

const validMoveLetters = ["U", "R", "F", "D", "L", "B", "x", "y", "z"] as const;
export type Move = `${(typeof validMoveLetters)[number]}${"" | "2" | "'"}`;

export function parseMove(move: string): Move {
  const letter = move[0];
  const modifier = move[1];

  // Check length
  if (move.length > 2) {
    throw new Error(`Invalid move ${move} (must be at most 2 characters long)`);
  }

  // Check letter validity
  if (!validMoveLetters.includes(letter as any)) {
    throw new Error(`Invalid letter "${letter}" in move ${move}`);
  }

  // Check modifier validity (either nothing, or just 2 or ')
  if (modifier && modifier !== "2" && modifier !== "'") {
    throw new Error(`Invalid modifier "${modifier}" in move ${move}`);
  }

  return move as Move;
}

export class Cube {
  state: CubeState = getDefaultState();

  applyMove(move: Move) {
    // This function only handles the actual move logic, modifying the state and stuff
  }

  applyAlgorithm(algorithm: string) {
    const trimmed = algorithm.trim();

    // Empty algorithm should not be an error, it's just a no-op
    if (!trimmed) {
      return;
    }

    const moves = trimmed.split(/\s+/);
    for (const move of moves) {
      const validMove = parseMove(move);
      this.applyMove(validMove);
    }
  }

  // More methods
  // isSolved()
  // isValid()
  // scramble()
  // ...
}
