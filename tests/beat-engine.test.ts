import { describe, it, expect } from "vitest";
import { beatPhase, type Beatmap } from "../src/lib/beat-engine";

const bm: Beatmap = { bpm: 120, beats: [0, 0.5, 1.0], energy: [1, 0.5, 1] };

describe("beatPhase", () => {
  it("phase is 1 exactly on a beat", () => {
    expect(beatPhase(15, 30, bm).phase).toBeCloseTo(1, 5); // t=0.5 → beat
  });
  it("phase decays toward 0 between beats", () => {
    const mid = beatPhase(22, 30, bm).phase; // t≈0.733, between 0.5 and 1.0
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(0.6);
  });
  it("reports energy of the current beat", () => {
    expect(beatPhase(15, 30, bm).energy).toBeCloseTo(0.5, 5); // beat at 0.5 has energy 0.5
  });
  it("before the first beat, sinceBeat is measured from t=0", () => {
    const s = beatPhase(3, 30, bm); // t=0.1
    expect(s.sinceBeat).toBeCloseTo(0.1, 5);
  });
  it("is deterministic for the same frame", () => {
    expect(beatPhase(20, 30, bm)).toEqual(beatPhase(20, 30, bm));
  });
});
