/**
 * Split `samples` into `buckets` equal-width windows and return the
 * max-absolute-amplitude per window, normalized so the global max = 1.
 * Pure and deterministic — no browser APIs.
 */
export function computePeaks(samples: Float32Array, buckets: number): number[] {
  if (buckets <= 0 || samples.length === 0) return [];

  const windowSize = samples.length / buckets;
  const raw: number[] = [];

  for (let b = 0; b < buckets; b++) {
    const start = Math.floor(b * windowSize);
    const end = Math.min(Math.floor((b + 1) * windowSize), samples.length);
    let peak = 0;
    for (let i = start; i < end; i++) {
      const abs = Math.abs(samples[i]);
      if (abs > peak) peak = abs;
    }
    raw.push(peak);
  }

  const globalMax = Math.max(...raw);
  if (globalMax === 0) return raw; // all silence → already all 0

  return raw.map((p) => p / globalMax);
}
