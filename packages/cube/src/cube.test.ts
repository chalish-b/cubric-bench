import { describe, it, expect } from "vitest";
import { parseMove, Cube, Color } from "./cube";

describe("parseMove", () => {
  it("parses simple moves", () => {
    expect(parseMove("U")).toBe("U");
    expect(parseMove("R")).toBe("R");
    expect(parseMove("x")).toBe("x");
  });

  it("parses moves with modifiers", () => {
    expect(parseMove("U'")).toBe("U'");
    expect(parseMove("R2")).toBe("R2");
    expect(parseMove("z'")).toBe("z'");
  });

  it("throws on invalid letter", () => {
    expect(() => parseMove("Q")).toThrow("Invalid letter");
    expect(() => parseMove("2")).toThrow("Invalid letter");
  });

  it("throws on invalid modifier", () => {
    // Stuff like U3 and UU can technically be considered valid, since you can
    // understand the intention, but they aren't standard, so it's invalid.
    expect(() => parseMove("U3")).toThrow("Invalid modifier");
    expect(() => parseMove("UU")).toThrow("Invalid modifier");
    expect(() => parseMove("U!")).toThrow("Invalid modifier");
  });

  it("throws on move that is too long", () => {
    // Same as above. Something like U2' is technically understandable,
    // but it's not standard so we don't accept it.
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
});
