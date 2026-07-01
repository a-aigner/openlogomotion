import { describe, it, expect } from "vitest";
import { onsetTimes } from "../src/lib/onset-detect";

// Build a signal: near-silence with short loud bursts at the given times.
function signalWithBursts(times: number[], sampleRate: number, durationS: number): Float32Array {
  const buf = new Float32Array(Math.floor(durationS * sampleRate));
  for (let i = 0; i < buf.length; i++) buf[i] = (Math.sin(i * 0.01) * 0.002); // quiet hum
  const burstLen = Math.floor(0.02 * sampleRate); // 20ms
  for (const t of times) {
    const start = Math.floor(t * sampleRate);
    for (let j = 0; j < burstLen && start + j < buf.length; j++) {
      buf[start + j] = Math.sin(j * 0.5) * 0.9; // loud transient
    }
  }
  return buf;
}

describe("onsetTimes", () => {
  it("detects bursts near their true times", () => {
    const sr = 44100;
    const truth = [0.5, 1.0, 1.5];
    const onsets = onsetTimes(signalWithBursts(truth, sr, 2), sr);
    expect(onsets.length).toBeGreaterThanOrEqual(3);
    for (const t of truth) {
      const near = onsets.some((o) => Math.abs(o - t) < 0.04); // within 40ms
      expect(near).toBe(true);
    }
  });
  it("returns no onsets for near-silence", () => {
    const sr = 44100;
    const quiet = new Float32Array(sr * 1).map((_, i) => Math.sin(i * 0.01) * 0.002);
    expect(onsetTimes(quiet, sr).length).toBe(0);
  });
  it("respects minGap (no double-triggers within the gap)", () => {
    const sr = 44100;
    const onsets = onsetTimes(signalWithBursts([0.5, 0.52], sr, 1), sr, { minGapMs: 120 });
    // two bursts 20ms apart collapse to one with a 120ms gap
    const around = onsets.filter((o) => Math.abs(o - 0.5) < 0.1);
    expect(around.length).toBe(1);
  });
  it("is deterministic", () => {
    const sr = 22050;
    const sig = signalWithBursts([0.3, 0.6], sr, 1);
    expect(onsetTimes(sig, sr)).toEqual(onsetTimes(sig, sr));
  });
});
