import { describe, it, expect } from "vitest";
import { applyPreset } from "../src/lib/animation-presets";

const beatOn = { phase: 1, energy: 1 };
const beatOff = { phase: 0, energy: 1 };

describe("applyPreset", () => {
  it("spin rotates around Y over time", () => {
    const a = applyPreset("spin", 0, 30, 150, beatOff, 1).rotation[1];
    const b = applyPreset("spin", 30, 30, 150, beatOff, 1).rotation[1];
    expect(b).toBeGreaterThan(a);
  });

  it("pulseBeat scales up on the beat and rests at 1 off-beat", () => {
    expect(applyPreset("pulseBeat", 0, 30, 150, beatOn, 1).scale).toBeGreaterThan(1);
    expect(applyPreset("pulseBeat", 0, 30, 150, beatOff, 1).scale).toBeCloseTo(1, 5);
  });

  it("intensity 0 disables beat reactivity for pulseBeat", () => {
    expect(applyPreset("pulseBeat", 0, 30, 150, beatOn, 0).scale).toBeCloseTo(1, 5);
  });

  it("bounce lifts on the beat (positive Y)", () => {
    expect(applyPreset("bounce", 0, 30, 150, beatOn, 1).position[1]).toBeGreaterThan(0);
  });

  it("assemble starts off-center and settles by the end", () => {
    const start = applyPreset("assemble", 0, 30, 150, beatOff, 1);
    const end = applyPreset("assemble", 149, 30, 150, beatOff, 1);
    const startDist = Math.abs(start.position[2]);
    const endDist = Math.abs(end.position[2]);
    expect(endDist).toBeLessThan(startDist);
  });

  it("returns finite numbers for every preset", () => {
    for (const p of ["spin","pulseBeat","bounce","wobble","flip","assemble","float"] as const) {
      const t = applyPreset(p, 12, 30, 150, beatOn, 1);
      expect([...t.position, ...t.rotation, t.scale].every(Number.isFinite)).toBe(true);
    }
  });
});
