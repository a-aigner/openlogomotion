import { describe, it, expect } from "vitest";
import { onsetTimes } from "../src/lib/onset-detect";

// Build a signal: near-silence with short loud bursts at the given times (all same amplitude).
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

// Build a graded signal: bursts at varying amplitudes to exercise the threshold knob.
// Bursts spaced 300ms apart (>> default minGapMs 80ms) so no dedupe interference.
function gradedBurstSignal(sampleRate: number): Float32Array {
  const durationS = 3.0;
  const buf = new Float32Array(Math.floor(durationS * sampleRate));
  const burstLen = Math.floor(0.02 * sampleRate); // 20ms
  // Varying amplitudes: strong, medium, weak, very-weak — 4 bursts at 300ms intervals.
  const events: { t: number; amp: number }[] = [
    { t: 0.3, amp: 0.9 },   // strong — always detected
    { t: 0.6, amp: 0.06 },  // very weak — only at low threshold
    { t: 0.9, amp: 0.8 },   // strong — always detected
    { t: 1.2, amp: 0.04 },  // very weak — only at low threshold
    { t: 1.5, amp: 0.7 },   // strong — always detected
    { t: 1.8, amp: 0.05 },  // very weak — only at low threshold
  ];
  for (const { t, amp } of events) {
    const start = Math.floor(t * sampleRate);
    for (let j = 0; j < burstLen && start + j < buf.length; j++) {
      buf[start + j] = Math.sin(j * 0.5) * amp;
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
    // Amplitude 0.0005 → maxOdf ≈ 5.8e-5 < FLOOR (1e-4), so silence guard returns [].
    const quiet = new Float32Array(sr * 1).map((_, i) => Math.sin(i * 0.01) * 0.0005);
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

  it("monotonic: lower threshold yields >= onsets as higher threshold", () => {
    const sr = 44100;
    const sig = signalWithBursts([0.3, 0.6, 0.9, 1.2, 1.5], sr, 2);
    const low  = onsetTimes(sig, sr, { threshold: 0.05 }).length;
    const high = onsetTimes(sig, sr, { threshold: 0.5  }).length;
    expect(low).toBeGreaterThan(0); // guard against a broken detector making 0>=0 pass
    expect(low).toBeGreaterThanOrEqual(high);
  });

  it("monotonic: lower threshold yields STRICTLY MORE onsets on a graded signal", () => {
    // Proves the knob has real range: weak bursts only pass at low threshold.
    const sr = 44100;
    const sig = gradedBurstSignal(sr);
    const low  = onsetTimes(sig, sr, { threshold: 0.02 }).length; // keeps weak bursts
    const high = onsetTimes(sig, sr, { threshold: 0.35 }).length; // only keeps strong bursts
    // Log counts in error message for the report.
    expect(low).toBeGreaterThan(high);
  });
});
