import { describe, it, expect } from "vitest";
import { cutIndexAt, pickFrame } from "../src/lib/cut-sequencer";

describe("cut-sequencer", () => {
  it("index 0 at frame 0", () => {
    expect(cutIndexAt(0, 30, 120, 2)).toBe(0);
  });
  it("120bpm x2 cuts/beat => 0.25s per cut => index 2 at 0.5s (frame 15 @30fps)", () => {
    expect(cutIndexAt(15, 30, 120, 2)).toBe(2);
  });
  it("advances one index per cut interval", () => {
    // secPerCut = 60/(120*1) = 0.5s => frame 15 => index 1
    expect(cutIndexAt(15, 30, 120, 1)).toBe(1);
    expect(cutIndexAt(14, 30, 120, 1)).toBe(0);
  });
  it("pickFrame loops the ordered list", () => {
    const arr = ["a", "b", "c"];
    expect(pickFrame(arr, 0)).toBe("a");
    expect(pickFrame(arr, 3)).toBe("a");
    expect(pickFrame(arr, 4)).toBe("b");
    expect(pickFrame(arr, 7)).toBe("b");
  });
  it("is deterministic", () => {
    expect(cutIndexAt(37, 30, 128, 3)).toBe(cutIndexAt(37, 30, 128, 3));
  });
});
