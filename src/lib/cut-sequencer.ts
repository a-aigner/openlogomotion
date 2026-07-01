// Cuts land on a BPM-derived grid subdivided by cutsPerBeat; the frame list loops.
export function cutIndexAt(frame: number, fps: number, bpm: number, cutsPerBeat: number): number {
  const safeBpm = bpm > 0 ? bpm : 120;
  const safeSub = cutsPerBeat >= 1 ? cutsPerBeat : 1;
  const secPerCut = 60 / (safeBpm * safeSub);
  const t = frame / fps;
  return Math.floor(t / secPerCut + 1e-9);
}

export function pickFrame<T>(ordered: T[], cutIndex: number): T {
  const n = ordered.length;
  return ordered[((cutIndex % n) + n) % n];
}
