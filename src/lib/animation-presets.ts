import type { AnimPreset } from "./config";

export type Transform = {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
};

type Beat = { phase: number; energy: number };
const TAU = Math.PI * 2;

export function applyPreset(
  preset: AnimPreset, frame: number, fps: number, durationInFrames: number,
  beat: Beat, intensity: number
): Transform {
  const t = frame / fps;
  const kick = beat.phase * beat.energy * intensity; // 0..1 beat impulse
  const base: Transform = { position: [0, 0, 0], rotation: [0, 0, 0], scale: 1 };

  switch (preset) {
    case "spin":
      return { ...base, rotation: [0, t * 0.9 + kick * 0.4, 0] };

    case "pulseBeat":
      return { ...base, rotation: [0, t * 0.3, 0], scale: 1 + 0.18 * kick };

    case "bounce":
      return { ...base, position: [0, 0.4 * kick, 0], rotation: [0, t * 0.3, 0] };

    case "wobble":
      return { ...base, rotation: [Math.sin(t * 2) * 0.15 + kick * 0.1, t * 0.4, Math.cos(t * 2) * 0.1] };

    case "flip": {
      // one flip per ~2s, eased by beat
      const flips = Math.floor(t / 2);
      const local = (t / 2) - flips;
      return { ...base, rotation: [0, flips * Math.PI + local * Math.PI, 0], scale: 1 + 0.08 * kick };
    }

    case "assemble": {
      const p = Math.min(1, frame / Math.max(1, durationInFrames * 0.4)); // settle over first 40%
      const eased = 1 - Math.pow(1 - p, 3);
      return { position: [0, 0, (1 - eased) * -6], rotation: [0, (1 - eased) * TAU, 0], scale: 0.6 + 0.4 * eased };
    }

    case "float":
      return { ...base, position: [0, Math.sin(t * 1.2) * 0.15, 0], rotation: [0, t * 0.25, 0] };
  }
}
