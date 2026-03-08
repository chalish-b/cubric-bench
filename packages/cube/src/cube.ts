// Cube state representation, move parsing, algorithm application

export enum Color {
  White,
  Yellow,
  Green,
  Blue,
  Red,
  Orange,
}

export type CubeState = {
  U: Color[];
  R: Color[];
  F: Color[];
  D: Color[];
  L: Color[];
  B: Color[];
};

export type Face = "U" | "R" | "F" | "D" | "L" | "B";
export type Wide = "u" | "r" | "f" | "d" | "l" | "b";
export type Slice = "M" | "E" | "S";
export type Rotation = "x" | "y" | "z";
export type MoveTarget = Face | Wide | Slice | Rotation;

export type TurnDirection = "cw" | "ccw" | "double";
export function oppositeTurn(turn: TurnDirection): TurnDirection {
  if (turn === "cw") return "ccw";
  if (turn === "ccw") return "cw";
  return "double";
}

export type Move = {
  target: MoveTarget;
  turn: TurnDirection;
};

const validMoveLetters = [
  "U",
  "u",
  "R",
  "r",
  "F",
  "f",
  "D",
  "d",
  "L",
  "l",
  "B",
  "b",
  "M",
  "E",
  "S",
  "x",
  "y",
  "z",
] as const;
export type MoveString =
  `${(typeof validMoveLetters)[number]}${"" | "2" | "'"}`;

// The standard is to have U=White and F=Green
// Use moves like "x" "y" and "z" to change the orientation
// The image given to the AI will always show the "F R U" faces
export function getDefaultState(): CubeState {
  return {
    U: Array(9).fill(Color.White),
    R: Array(9).fill(Color.Red),
    F: Array(9).fill(Color.Green),
    D: Array(9).fill(Color.Yellow),
    L: Array(9).fill(Color.Orange),
    B: Array(9).fill(Color.Blue),
  };
}

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

  const target = letter as MoveTarget;
  const turn: TurnDirection =
    modifier === undefined ? "cw" : modifier === "'" ? "ccw" : "double";

  return {
    target,
    turn,
  } satisfies Move;
}

export function invertMove(move: Move): Move {
  const newTurn = oppositeTurn(move.turn);
  return {
    target: move.target,
    turn: newTurn,
  } satisfies Move;
}

export function stringifyMove(move: Move): MoveString {
  const modifier = move.turn === "cw" ? "" : move.turn === "ccw" ? "'" : "2";
  return `${move.target}${modifier}`;
}

export function parseAlgorithm(algorithm: string): Move[] {
  const trimmed = algorithm.trim();

  // Empty algorithm should not be an error, it's just a no-op
  if (!trimmed) {
    return [];
  }

  const moves = trimmed.split(/\s+/);
  const validMoves = moves.map((move) => parseMove(move));

  return validMoves;
}

export function invertAlgorithm(algorithm: Move[]): Move[] {
  const inverted = algorithm.map((move) => invertMove(move));
  const reversed = inverted.slice().reverse();

  return reversed;
}

export function stringifyAlgorithm(algorithm: Move[]): string {
  return algorithm.map((move) => stringifyMove(move)).join(" ");
}

export class Cube {
  state: CubeState = getDefaultState();

  applyMove(move: Move | MoveString) {
    let m = typeof move === "string" ? parseMove(move) : move;

    // x y and z moves.
    // These can be broken down into 3 normal moves
    if (m.target === "x") {
      // x = R + M' + L'
      this.applyMove({ target: "R", turn: m.turn });
      this.applyMove({ target: "M", turn: oppositeTurn(m.turn) });
      this.applyMove({ target: "L", turn: oppositeTurn(m.turn) });

      return;
    }

    if (m.target === "y") {
      // y = U + E' + D'
      this.applyMove({ target: "U", turn: m.turn });
      this.applyMove({ target: "E", turn: oppositeTurn(m.turn) });
      this.applyMove({ target: "D", turn: oppositeTurn(m.turn) });

      return;
    }

    if (m.target === "z") {
      // z = F + S + B'
      this.applyMove({ target: "F", turn: m.turn });
      this.applyMove({ target: "S", turn: m.turn });
      this.applyMove({ target: "B", turn: oppositeTurn(m.turn) });

      return;
    }

    // Wide moves. These can be broken down into a side + middle layer moves
    if (m.target === "r") {
      // r = R + M'
      this.applyMove({ target: "R", turn: m.turn });
      this.applyMove({ target: "M", turn: oppositeTurn(m.turn) });

      return;
    }

    if (m.target === "l") {
      // l = L + M
      this.applyMove({ target: "L", turn: m.turn });
      this.applyMove({ target: "M", turn: m.turn });

      return;
    }

    if (m.target === "u") {
      // u = U + E'
      this.applyMove({ target: "U", turn: m.turn });
      this.applyMove({ target: "E", turn: oppositeTurn(m.turn) });

      return;
    }

    if (m.target === "d") {
      // d = D + E
      this.applyMove({ target: "D", turn: m.turn });
      this.applyMove({ target: "E", turn: m.turn });

      return;
    }

    if (m.target === "f") {
      // f = F + S
      this.applyMove({ target: "F", turn: m.turn });
      this.applyMove({ target: "S", turn: m.turn });

      return;
    }

    if (m.target === "b") {
      // b = B + S'
      this.applyMove({ target: "B", turn: m.turn });
      this.applyMove({ target: "S", turn: oppositeTurn(m.turn) });

      return;
    }

    // U R F D L B moves. We rotate the stickers on the face, and rotate side stickers
    if (["U", "R", "F", "D", "L", "B"].includes(m.target)) {
      this._rotateFaceOnly(m.target as Face, m.turn);
      this._rotateSideStickers(m.target as Face, m.turn);
    }

    // M S E moves. We just rotate side stickers
    if (["M", "S", "E"].includes(m.target)) {
      this._rotateSideStickers(m.target as Slice, m.turn);
    }
  }

  // NOTE: This rotates the stickers on one face only, not the side stickers on the same layer
  // This is useful to be a separate function because moves like x, y, z can be done easier by
  // rearranging the side faces and rotating the 2 other.
  _rotateFaceOnly(face: Face, turn: TurnDirection) {
    const f = this.state[face];
    if (turn === "cw") {
      [f[0], f[2], f[8], f[6]] = [f[6], f[0], f[2], f[8]];
      [f[1], f[5], f[7], f[3]] = [f[3], f[1], f[5], f[7]];
    } else if (turn === "ccw") {
      [f[0], f[2], f[8], f[6]] = [f[2], f[8], f[6], f[0]];
      [f[1], f[5], f[7], f[3]] = [f[5], f[7], f[3], f[1]];
    } else if (turn === "double") {
      [f[0], f[2], f[8], f[6]] = [f[8], f[6], f[0], f[2]];
      [f[1], f[5], f[7], f[3]] = [f[7], f[3], f[1], f[5]];
    }
  }

  // This isn't very useful by itself. Usually a rotation will call
  // _rotateFaceOnly + _rotateSideStickers together.
  _rotateSideStickers(layer: Face | Slice, turn: TurnDirection) {
    // TODO: Make sure to test this properly. There is probably an error or something here
    const rotateCw = () => {
      const u = this.state.U;
      const r = this.state.R;
      const f = this.state.F;
      const d = this.state.D;
      const l = this.state.L;
      const b = this.state.B;

      switch (layer) {
        case "U": {
          const lTemp = l.slice();
          [l[0], l[1], l[2]] = [f[0], f[1], f[2]];
          [f[0], f[1], f[2]] = [r[0], r[1], r[2]];
          [r[0], r[1], r[2]] = [b[0], b[1], b[2]];
          [b[0], b[1], b[2]] = [lTemp[0], lTemp[1], lTemp[2]];
          break;
        }
        case "R": {
          const uTemp = u.slice();
          [u[2], u[5], u[8]] = [f[2], f[5], f[8]];
          [f[2], f[5], f[8]] = [d[2], d[5], d[8]];
          [d[2], d[5], d[8]] = [b[6], b[3], b[0]];
          [b[6], b[3], b[0]] = [uTemp[2], uTemp[5], uTemp[8]];
          break;
        }
        case "F": {
          const uTemp = u.slice();
          [u[6], u[7], u[8]] = [l[8], l[5], l[2]];
          [l[8], l[5], l[2]] = [d[2], d[1], d[0]];
          [d[2], d[1], d[0]] = [r[0], r[3], r[6]];
          [r[0], r[3], r[6]] = [uTemp[6], uTemp[7], uTemp[8]];
          break;
        }
        case "D": {
          const fTemp = f.slice();
          [f[6], f[7], f[8]] = [l[6], l[7], l[8]];
          [l[6], l[7], l[8]] = [b[6], b[7], b[8]];
          [b[6], b[7], b[8]] = [r[6], r[7], r[8]];
          [r[6], r[7], r[8]] = [fTemp[6], fTemp[7], fTemp[8]];
          break;
        }
        case "L": {
          const fTemp = f.slice();
          [f[0], f[3], f[6]] = [u[0], u[3], u[6]];
          [u[0], u[3], u[6]] = [b[8], b[5], b[2]];
          [b[2], b[5], b[8]] = [d[6], d[3], d[0]];
          [d[0], d[3], d[6]] = [fTemp[0], fTemp[3], fTemp[6]];
          break;
        }
        case "B": {
          const uTemp = u.slice();
          [u[0], u[1], u[2]] = [r[2], r[5], r[8]];
          [r[2], r[5], r[8]] = [d[8], d[7], d[6]];
          [d[6], d[7], d[8]] = [l[0], l[3], l[6]];
          [l[0], l[3], l[6]] = [uTemp[2], uTemp[1], uTemp[0]];
          break;
        }
        case "M": {
          // M is basically like L
          const uTemp = u.slice();
          [u[1], u[4], u[7]] = [b[7], b[4], b[1]];
          [b[7], b[4], b[1]] = [d[1], d[4], d[7]];
          [d[1], d[4], d[7]] = [f[1], f[4], f[7]];
          [f[1], f[4], f[7]] = [uTemp[1], uTemp[4], uTemp[7]];
          break;
        }
        case "E": {
          // E is like D
          const fTemp = f.slice();
          [f[3], f[4], f[5]] = [l[3], l[4], l[5]];
          [l[3], l[4], l[5]] = [b[3], b[4], b[5]];
          [b[3], b[4], b[5]] = [r[3], r[4], r[5]];
          [r[3], r[4], r[5]] = [fTemp[3], fTemp[4], fTemp[5]];
          break;
        }
        case "S": {
          // S is like F
          const uTemp = u.slice();
          [u[3], u[4], u[5]] = [l[7], l[4], l[1]];
          [l[7], l[4], l[1]] = [d[5], d[4], d[3]];
          [d[5], d[4], d[3]] = [r[1], r[4], r[7]];
          [r[1], r[4], r[7]] = [uTemp[3], uTemp[4], uTemp[5]];
          break;
        }
      }
    };

    // This is so fucking stupid lol
    // We don't really care about animation or anything right now, so it should
    // work for generating the images of final states
    // Even in visualization, if we wait for the function to finish fully before updating
    // the final state, it can still work without seeing those intermediate states
    if (turn === "cw") {
      rotateCw();
    } else if (turn === "double") {
      rotateCw();
      rotateCw();
    } else if (turn === "ccw") {
      rotateCw();
      rotateCw();
      rotateCw();
    }
  }

  applyAlgorithm(algorithm: string) {
    const moves = parseAlgorithm(algorithm);
    for (const move of moves) {
      this.applyMove(move);
    }
  }

  getStateClone(): CubeState {
    return {
      U: [...this.state.U],
      R: [...this.state.R],
      F: [...this.state.F],
      D: [...this.state.D],
      L: [...this.state.L],
      B: [...this.state.B],
    };
  }

  resetState() {
    this.state = getDefaultState();
  }

  isSolved(): boolean {
    const d = getDefaultState();
    for (const face of ["U", "R", "F", "D", "L", "B"] as const) {
      for (let i = 0; i < 9; i++) {
        if (this.state[face][i] !== d[face][i]) return false;
      }
    }
    return true;
  }

  // More methods
  // isValid()
  // scramble()
  // ...
}

// Helpers
