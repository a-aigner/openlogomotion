export type OnsetOptions = { hop?: number; sensitivity?: number; minGapMs?: number };

// Energy-based onset detection: short-time RMS energy → half-wave-rectified
// positive difference → adaptive-threshold peak-picking. Pure & deterministic.
export function onsetTimes(samples: Float32Array, sampleRate: number, opts: OnsetOptions = {}): number[] {
  const hop = opts.hop ?? 512;
  // Default 3.0: suppresses false onsets from slow-varying background hum; lower
  // toward ~1.3 for quieter/softer transients.
  const sensitivity = opts.sensitivity ?? 3.0;
  const minGapSamples = ((opts.minGapMs ?? 80) / 1000) * sampleRate;
  const nHops = Math.floor(samples.length / hop);
  if (nHops < 3) return [];

  // 1. RMS energy per hop.
  const energy = new Float32Array(nHops);
  for (let i = 0; i < nHops; i++) {
    let sum = 0;
    const start = i * hop;
    for (let j = 0; j < hop; j++) { const s = samples[start + j]; sum += s * s; }
    energy[i] = Math.sqrt(sum / hop);
  }

  // 2. Onset detection function: rectified positive energy increase.
  const odf = new Float32Array(nHops);
  for (let i = 1; i < nHops; i++) odf[i] = Math.max(0, energy[i] - energy[i - 1]);

  // 3. Adaptive threshold (sliding mean) + local-max peak pick + min gap.
  const win = 8;
  const onsets: number[] = [];
  let lastOnset = -Infinity;
  for (let i = 1; i < nHops - 1; i++) {
    let mean = 0, cnt = 0;
    for (let k = Math.max(0, i - win); k <= Math.min(nHops - 1, i + win); k++) { mean += odf[k]; cnt++; }
    mean /= cnt;
    const thresh = mean * sensitivity + 1e-4;
    if (odf[i] > thresh && odf[i] >= odf[i - 1] && odf[i] >= odf[i + 1]) {
      const pos = i * hop;
      if (pos - lastOnset >= minGapSamples) { onsets.push(pos / sampleRate); lastOnset = pos; }
    }
  }
  return onsets;
}
