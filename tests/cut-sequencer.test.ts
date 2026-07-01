import { describe, it, expect } from "vitest";
import { cutIndexAt, pickFrame, applyDensity } from "../src/lib/cut-sequencer";

describe("cut-sequencer v2", () => {
  const cuts = [0, 0.5, 1.0, 1.5];
  it("counts cut times at or before t", () => {
    expect(cutIndexAt(0, 30, cuts)).toBe(1);   // t=0 → cut at 0 counted
    expect(cutIndexAt(15, 30, cuts)).toBe(2);  // t=0.5
    expect(cutIndexAt(44, 30, cuts)).toBe(3);  // t≈1.466
  });
  it("pickFrame loops", () => {
    const a = ["x", "y"];
    expect(pickFrame(a, 0)).toBe("x");
    expect(pickFrame(a, 3)).toBe("y");
  });
  it("applyDensity subdivides gaps", () => {
    expect(applyDensity([0, 1], 2)).toEqual([0, 0.5, 1]);
    expect(applyDensity([0, 1, 2], 1)).toEqual([0, 1, 2]);
    expect(applyDensity([0, 2], 4)).toEqual([0, 0.5, 1, 1.5, 2]);
  });
});
