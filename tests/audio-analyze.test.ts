import { describe, it, expect } from "vitest";
import { analyzeToCutTimes } from "../src/lib/audio-analyze";

function bursts(times: number[], sr: number, dur: number): Float32Array {
  const b = new Float32Array(Math.floor(dur * sr));
  const L = Math.floor(0.02 * sr);
  for (const t of times) { const s = Math.floor(t * sr); for (let j = 0; j < L; j++) b[s + j] = Math.sin(j * 0.5) * 0.9; }
  return b;
}

describe("analyzeToCutTimes", () => {
  it("returns onset-derived cut times", () => {
    const sr = 44100;
    const cuts = analyzeToCutTimes(bursts([0.5, 1.0], sr, 1.5), sr, 1);
    expect(cuts.length).toBeGreaterThanOrEqual(2);
  });
  it("density subdivides (more cuts)", () => {
    const sr = 44100;
    const base = analyzeToCutTimes(bursts([0.5, 1.0], sr, 1.5), sr, 1).length;
    const dense = analyzeToCutTimes(bursts([0.5, 1.0], sr, 1.5), sr, 3).length;
    expect(dense).toBeGreaterThan(base);
  });
  it("lower sensitivity yields >= as many cuts as higher sensitivity", () => {
    const sr = 44100;
    // Six evenly-spaced bursts give the onset detector enough peaks to differentiate sensitivity levels.
    const signal = bursts([0.3, 0.6, 0.9, 1.2, 1.5, 1.8], sr, 2.5);
    const withLowSensitivity  = analyzeToCutTimes(signal, sr, 1, 1.0).length;
    const withHighSensitivity = analyzeToCutTimes(signal, sr, 1, 6.0).length;
    // Lower sensitivity threshold → more onsets detected (or equal, never fewer).
    expect(withLowSensitivity).toBeGreaterThanOrEqual(withHighSensitivity);
  });
});
