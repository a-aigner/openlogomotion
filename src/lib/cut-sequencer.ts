// Cuts happen at explicit times (from onset detection or a bundled beat grid).
export function cutIndexAt(frame: number, fps: number, cutTimes: number[]): number {
  const t = frame / fps + 1e-9;
  let lo = 0, hi = cutTimes.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (cutTimes[mid] <= t) lo = mid + 1; else hi = mid; }
  return lo; // number of cuts elapsed
}

export function pickFrame<T>(ordered: T[], cutIndex: number): T {
  const n = ordered.length;
  return ordered[((cutIndex % n) + n) % n];
}

// subdiv >= 1: split each gap between consecutive times into `subdiv` cuts (more, faster cuts).
export function applyDensity(times: number[], subdiv: number): number[] {
  if (subdiv <= 1 || times.length < 2) return times.slice();
  const out: number[] = [];
  for (let i = 0; i < times.length - 1; i++) {
    const a = times[i], b = times[i + 1];
    for (let k = 0; k < subdiv; k++) out.push(a + ((b - a) * k) / subdiv);
  }
  out.push(times[times.length - 1]);
  return out;
}
