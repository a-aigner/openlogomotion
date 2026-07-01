export type Track = { id: string; title: string; bpm: number; src: string; beatmap: string };

export const TRACKS: Track[] = [
  { id: "pulse-120", title: "Pulse 120", bpm: 120,
    src: "assets/tracks/pulse-120.mp3", beatmap: "assets/beatmaps/pulse-120.json" },
];

export function getTrack(id: string): Track {
  const t = TRACKS.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown track: ${id}`);
  return t;
}
