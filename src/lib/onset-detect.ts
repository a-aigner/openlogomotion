export type OnsetOptions = { hop?: number; threshold?: number; minGapMs?: number };

const FLOOR = 1e-4;

// Energy-based onset detection: short-time RMS energy → half-wave-rectified
// positive difference ODF → relative-to-peak threshold peak-picking. Pure & deterministic.
// threshold: fraction of max ODF a candidate peak must meet (0,1]. LOWER → MORE onsets.
export function onsetTimes(samples: Float32Array, sampleRate: number, opts: OnsetOptions = {}): number[] {
  const hop = opts.hop ?? 512;
  const threshold = opts.threshold ?? 0.15;
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

  // 3. Global max for relative threshold. Silence guard.
  let maxOdf = 0;
  for (let i = 0; i < nHops; i++) if (odf[i] > maxOdf) maxOdf = odf[i];
  if (maxOdf < FLOOR) return [];

  // 4. Local-max peak pick + relative-to-peak threshold + min gap.
  const minVal = Math.max(FLOOR, threshold * maxOdf);
  const onsets: number[] = [];
  let lastOnset = -Infinity;
  for (let i = 1; i < nHops - 1; i++) {
    if (odf[i] >= minVal && odf[i] >= odf[i - 1] && odf[i] >= odf[i + 1]) {
      const pos = i * hop;
      if (pos - lastOnset >= minGapSamples) { onsets.push(pos / sampleRate); lastOnset = pos; }
    }
  }
  return onsets;
}
