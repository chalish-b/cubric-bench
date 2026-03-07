import { describe, it, expect } from "vitest";
import { parseMove, Cube, Color, getDefaultState } from "./cube";

describe("parseMove", () => {
  it("parses simple moves", () => {
    expect(parseMove("U")).toEqual({ target: "U", turn: "cw" });
    expect(parseMove("R")).toEqual({ target: "R", turn: "cw" });
    expect(parseMove("x")).toEqual({ target: "x", turn: "cw" });
    expect(parseMove("M")).toEqual({ target: "M", turn: "cw" });
  });

  it("parses moves with modifiers", () => {
    expect(parseMove("U'")).toEqual({ target: "U", turn: "ccw" });
    expect(parseMove("R2")).toEqual({ target: "R", turn: "double" });
    expect(parseMove("z'")).toEqual({ target: "z", turn: "ccw" });
    expect(parseMove("S2")).toEqual({ target: "S", turn: "double" });
  });

  it("throws on invalid letter", () => {
    expect(() => parseMove("")).toThrow("Invalid letter");
    expect(() => parseMove("Q")).toThrow("Invalid letter");
    expect(() => parseMove("2")).toThrow("Invalid letter");
  });

  it("throws on invalid modifier", () => {
    expect(() => parseMove("U3")).toThrow("Invalid modifier");
    expect(() => parseMove("UU")).toThrow("Invalid modifier");
    expect(() => parseMove("UR")).toThrow("Invalid modifier");
    expect(() => parseMove("U!")).toThrow("Invalid modifier");
  });

  it("throws on move that is too long", () => {
    expect(() => parseMove("U2'")).toThrow("at most 2 characters");
    expect(() => parseMove("U2x")).toThrow("at most 2 characters");
  });
});

describe("Cube", () => {
  it("starts with default solved state", () => {
    const cube = new Cube();
    expect(cube.state.U.every((c) => c === Color.White)).toBe(true);
    expect(cube.state.F.every((c) => c === Color.Green)).toBe(true);
    expect(cube.state.R.every((c) => c === Color.Red)).toBe(true);
    expect(cube.state.D.every((c) => c === Color.Yellow)).toBe(true);
    expect(cube.state.L.every((c) => c === Color.Orange)).toBe(true);
    expect(cube.state.B.every((c) => c === Color.Blue)).toBe(true);
  });

  it("applyAlgorithm throws on invalid moves", () => {
    const cube = new Cube();
    expect(() => cube.applyAlgorithm("U R Q")).toThrow("Invalid letter");
  });

  it("applyAlgorithm treats empty input as a no-op", () => {
    const cube = new Cube();
    const initialState = structuredClone(cube.state);

    expect(() => cube.applyAlgorithm("")).not.toThrow();
    expect(() => cube.applyAlgorithm("   ")).not.toThrow();
    expect(cube.state).toEqual(initialState);
  });

  it("applyAlgorithm splits moves across mixed whitespace", () => {
    const cube = new Cube();
    expect(() => cube.applyAlgorithm("  U\tR2\nF'  ")).not.toThrow();
  });
});

describe("move identity: x4 = solved", () => {
  const faces = ["U", "R", "F", "D", "L", "B"] as const;
  const slices = ["M", "E", "S"] as const;
  const rotations = ["x", "y", "z"] as const;

  for (const move of [...faces, ...slices, ...rotations]) {
    it(`${move} x4 returns to solved`, () => {
      const cube = new Cube();
      for (let i = 0; i < 4; i++) cube.applyMove(move);
      expect(cube.isSolved()).toBe(true);
    });

    it(`${move}' x4 returns to solved`, () => {
      const cube = new Cube();
      for (let i = 0; i < 4; i++) cube.applyMove(`${move}'`);
      expect(cube.isSolved()).toBe(true);
    });

    it(`${move}2 x2 returns to solved`, () => {
      const cube = new Cube();
      cube.applyMove(`${move}2`);
      cube.applyMove(`${move}2`);
      expect(cube.isSolved()).toBe(true);
    });
  }
});

describe("move + inverse = identity", () => {
  const allMoves = [
    "U",
    "R",
    "F",
    "D",
    "L",
    "B",
    "M",
    "E",
    "S",
    "x",
    "y",
    "z",
  ] as const;

  for (const move of allMoves) {
    it(`${move} then ${move}' returns to solved`, () => {
      const cube = new Cube();
      cube.applyMove(move);
      cube.applyMove(`${move}'`);
      expect(cube.isSolved()).toBe(true);
    });
  }
});

describe("double = 2x CW", () => {
  const allMoves = [
    "U",
    "R",
    "F",
    "D",
    "L",
    "B",
    "M",
    "E",
    "S",
    "x",
    "y",
    "z",
  ] as const;

  for (const move of allMoves) {
    it(`${move}2 equals ${move} ${move}`, () => {
      const cube1 = new Cube();
      cube1.applyMove(`${move}2`);

      const cube2 = new Cube();
      cube2.applyMove(move);
      cube2.applyMove(move);

      expect(cube1.state).toEqual(cube2.state);
    });
  }
});

describe("algorithm identities", () => {
  it("sexy move (R U R' U') x6 = identity", () => {
    const cube = new Cube();
    for (let i = 0; i < 6; i++) {
      cube.applyAlgorithm("R U R' U'");
    }
    expect(cube.isSolved()).toBe(true);
  });

  it("sune (R U R' U R U2 R') x6 = identity", () => {
    const cube = new Cube();
    for (let i = 0; i < 6; i++) {
      cube.applyAlgorithm("R U R' U R U2 R'");
    }
    expect(cube.isSolved()).toBe(true);
  });

  it("T-perm x2 = identity", () => {
    const cube = new Cube();
    cube.applyAlgorithm("R U R' U' R' F R2 U' R' U' R U R' F'");
    expect(cube.isSolved()).toBe(false); // sanity: one T-perm is not solved
    cube.applyAlgorithm("R U R' U' R' F R2 U' R' U' R U R' F'");
    expect(cube.isSolved()).toBe(true);
  });

  it("Jb-perm x2 = identity", () => {
    const cube = new Cube();
    const jperm = "R U R' F' R U R' U' R' F R2 U' R' U'";
    cube.applyAlgorithm(jperm);
    expect(cube.isSolved()).toBe(false);
    cube.applyAlgorithm(jperm);
    expect(cube.isSolved()).toBe(true);
  });

  it("U-perm (a) x3 = identity", () => {
    const cube = new Cube();
    const uperm = "R U' R U R U R U' R' U' R2";
    for (let i = 0; i < 3; i++) {
      cube.applyAlgorithm(uperm);
    }
    expect(cube.isSolved()).toBe(true);
  });
});

describe("rotation composition", () => {
  it("x y != y x (non-commutative)", () => {
    const cube1 = new Cube();
    cube1.applyAlgorithm("x y");

    const cube2 = new Cube();
    cube2.applyAlgorithm("y x");

    // On a solved cube, rotations just rearrange uniform faces,
    // but the faces themselves differ
    expect(cube1.state).not.toEqual(cube2.state);
  });

  it("x = R M' L' (rotation decomposes into layer moves)", () => {
    const cube1 = new Cube();
    cube1.applyAlgorithm("x");

    const cube2 = new Cube();
    cube2.applyAlgorithm("R M' L'");

    expect(cube1.state).toEqual(cube2.state);
  });
});

describe("specific move results", () => {
  it("U moves the top row of F/R/B/L", () => {
    const cube = new Cube();
    cube.applyMove("U");

    // U CW cycles top rows: L <- F, F <- R, R <- B, B <- L
    expect(cube.state.F.slice(0, 3)).toEqual([Color.Red, Color.Red, Color.Red]);
    expect(cube.state.L.slice(0, 3)).toEqual([
      Color.Green,
      Color.Green,
      Color.Green,
    ]);
    expect(cube.state.B.slice(0, 3)).toEqual([
      Color.Orange,
      Color.Orange,
      Color.Orange,
    ]);
    expect(cube.state.R.slice(0, 3)).toEqual([
      Color.Blue,
      Color.Blue,
      Color.Blue,
    ]);

    // U face itself is still all white (just rotated)
    expect(cube.state.U.every((c) => c === Color.White)).toBe(true);
    // D face is untouched
    expect(cube.state.D.every((c) => c === Color.Yellow)).toBe(true);
  });

  it("R moves the right column of U/F/D and left column of B", () => {
    const cube = new Cube();
    cube.applyMove("R");

    // R CW: U right col <- F right col, F right col <- D right col,
    //       D right col <- B left col (reversed), B left col <- U right col (reversed)
    // Indices 2,5,8 are the right column
    expect([cube.state.U[2], cube.state.U[5], cube.state.U[8]]).toEqual([
      Color.Green,
      Color.Green,
      Color.Green,
    ]);
    expect([cube.state.F[2], cube.state.F[5], cube.state.F[8]]).toEqual([
      Color.Yellow,
      Color.Yellow,
      Color.Yellow,
    ]);
    expect([cube.state.D[2], cube.state.D[5], cube.state.D[8]]).toEqual([
      Color.Blue,
      Color.Blue,
      Color.Blue,
    ]);
    // B's left column (indices 0,3,6) reversed
    expect([cube.state.B[6], cube.state.B[3], cube.state.B[0]]).toEqual([
      Color.White,
      Color.White,
      Color.White,
    ]);

    // R face still all red, L untouched
    expect(cube.state.R.every((c) => c === Color.Red)).toBe(true);
    expect(cube.state.L.every((c) => c === Color.Orange)).toBe(true);
  });
});
