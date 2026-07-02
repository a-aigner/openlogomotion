import { describe, it, expect } from "vitest";
import { computePeaks } from "../src/lib/waveform";

describe("computePeaks", () => {
  it("returns empty array for buckets <= 0", () => {
    const samples = new Float32Array([0.1, 0.2]);
    expect(computePeaks(samples, 0)).toEqual([]);
    expect(computePeaks(samples, -1)).toEqual([]);
  });

  it("returns empty array for empty samples", () => {
    expect(computePeaks(new Float32Array(0), 4)).toEqual([]);
  });

  it("result length equals buckets", () => {
    const samples = Float32Array.from({ length: 1000 }, (_, i) => Math.sin(i * 0.1));
    expect(computePeaks(samples, 8)).toHaveLength(8);
    expect(computePeaks(samples, 1)).toHaveLength(1);
    expect(computePeaks(samples, 100)).toHaveLength(100);
  });

  it("all-silence returns all zeros", () => {
    const samples = new Float32Array(256); // all 0
    const peaks = computePeaks(samples, 4);
    expect(peaks).toHaveLength(4);
    expect(peaks.every((p) => p === 0)).toBe(true);
  });

  it("impulse in first bucket → first bucket is 1, others near 0", () => {
    // 400 samples; impulse at index 10 (bucket 0 of 4 — window size = 100)
    const samples = new Float32Array(400);
    samples[10] = 0.8;
    const peaks = computePeaks(samples, 4);
    expect(peaks).toHaveLength(4);
    expect(peaks[0]).toBeCloseTo(1.0); // normalized: 0.8/0.8 = 1
    expect(peaks[1]).toBe(0);
    expect(peaks[2]).toBe(0);
    expect(peaks[3]).toBe(0);
  });

  it("ramp signal: peak per bucket increases monotonically", () => {
    // 400 samples; value = index/400 (ramps 0→~1)
    const samples = Float32Array.from({ length: 400 }, (_, i) => i / 400);
    const peaks = computePeaks(samples, 4);
    expect(peaks).toHaveLength(4);
    // Each bucket has a higher peak than the previous
    for (let i = 1; i < peaks.length; i++) {
      expect(peaks[i]).toBeGreaterThan(peaks[i - 1]);
    }
    // Last bucket peak is normalized to 1
    expect(peaks[peaks.length - 1]).toBeCloseTo(1.0);
  });

  it("handles buckets > samples.length (many small windows)", () => {
    // 3 samples, 10 buckets → some buckets may be empty (peak = 0)
    const samples = new Float32Array([0.5, 0.0, 0.3]);
    const peaks = computePeaks(samples, 10);
    expect(peaks).toHaveLength(10);
    expect(peaks.every((p) => p >= 0 && p <= 1)).toBe(true);
  });

  it("negative amplitudes treated as absolute value", () => {
    const samples = new Float32Array(100);
    samples[0] = -0.9; // only amplitude is negative
    const peaks = computePeaks(samples, 1);
    expect(peaks[0]).toBeCloseTo(1.0); // abs(-0.9)/0.9 = 1
  });
});
