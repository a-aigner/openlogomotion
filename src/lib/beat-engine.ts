export type Beatmap = { bpm: number; beats: number[]; energy?: number[] };
export type BeatState = { phase: number; sinceBeat: number; energy: number };

// `beatmap.beats` must be sorted ascending; the search relies on the early break.
export function beatPhase(frame: number, fps: number, beatmap: Beatmap): BeatState {
  const t = frame / fps;
  const { beats } = beatmap;
  const secPerBeat = beatmap.bpm > 0 ? 60 / beatmap.bpm : 0.5;

  // Find index of the most recent beat <= t.
  let idx = -1;
  for (let i = 0; i < beats.length; i++) {
    if (beats[i] <= t + 1e-9) idx = i;
    else break;
  }

  const lastBeatTime = idx >= 0 ? beats[idx] : 0;
  const nextBeatTime = idx + 1 < beats.length ? beats[idx + 1] : lastBeatTime + secPerBeat;
  const interval = Math.max(nextBeatTime - lastBeatTime, 1e-6);
  const sinceBeat = t - lastBeatTime;

  // phase: 1 at the beat, linear decay to 0 at the next beat.
  const phase = Math.max(0, 1 - sinceBeat / interval);
  const energy = idx >= 0 && beatmap.energy ? beatmap.energy[idx] ?? 1 : 1;

  return { phase, sinceBeat, energy };
}
