import { describe, it, expect } from "vitest";
import { analyzeToCutTimes } from "../src/lib/audio-analyze";

function bursts(times: number[], sr: number, dur: number): Float32Array {
  const b = new Float32Array(Math.floor(dur * sr));
  const L = Math.floor(0.02 * sr);
  for (const t of times) { const s = Math.floor(t * sr); for (let j = 0; j < L; j++) b[s + j] = Math.sin(j * 0.5) * 0.9; }
  return b;
}

// Graded signal: bursts of varying amplitudes for threshold-range test.
function gradedBursts(sr: number, dur: number): Float32Array {
  const b = new Float32Array(Math.floor(dur * sr));
  const L = Math.floor(0.02 * sr);
  const events: { t: number; amp: number }[] = [
    { t: 0.3, amp: 0.9 },  { t: 0.6, amp: 0.05 },
    { t: 0.9, amp: 0.8 },  { t: 1.2, amp: 0.04 },
    { t: 1.5, amp: 0.7 },  { t: 1.8, amp: 0.06 },
  ];
  for (const { t, amp } of events) {
    const s = Math.floor(t * sr);
    for (let j = 0; j < L && s + j < b.length; j++) b[s + j] = Math.sin(j * 0.5) * amp;
  }
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
  it("lower threshold yields >= as many cuts as higher threshold", () => {
    const sr = 44100;
    // Six evenly-spaced equal-amplitude bursts: all pass at any reasonable threshold (>= holds).
    const signal = bursts([0.3, 0.6, 0.9, 1.2, 1.5, 1.8], sr, 2.5);
    const withLowThreshold  = analyzeToCutTimes(signal, sr, 1, 0.05).length;
    const withHighThreshold = analyzeToCutTimes(signal, sr, 1, 0.5).length;
    // Lower threshold → more or equal onsets (never fewer).
    expect(withLowThreshold).toBeGreaterThan(0); // guard against a broken detector making 0>=0 pass
    expect(withLowThreshold).toBeGreaterThanOrEqual(withHighThreshold);
  });
  it("lower threshold yields STRICTLY MORE cuts on a graded signal", () => {
    const sr = 44100;
    // Mix of strong + very-weak bursts; high threshold filters out weak peaks.
    const signal = gradedBursts(sr, 2.5);
    const withLowThreshold  = analyzeToCutTimes(signal, sr, 1, 0.02).length;
    const withHighThreshold = analyzeToCutTimes(signal, sr, 1, 0.35).length;
    expect(withLowThreshold).toBeGreaterThan(withHighThreshold);
  });
});
