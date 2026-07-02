import type { Aspect } from "./config";
import { FORMATS, resolveDuration } from "./config";

export type FrameVariant = "normal" | "inverted";
export type Frame =
  | { kind: "solid"; variant: FrameVariant; color: string }
  | { kind: "palette"; variant: FrameVariant; colors: string[] }
  | { kind: "image"; variant: FrameVariant; src: string; fit: "cover" | "contain" };
export type AudioSource =
  | { kind: "bundled"; trackId: string }
  | { kind: "upload"; src: string; name: string };

export type ShowcaseConfig = {
  logo: { src: string; kind: "svg" | "raster" };
  logoSizePct: number;
  frames: Frame[];
  audio: AudioSource;
  cutTimes: number[];
  cutDensity: number;
  format: { aspect: Aspect; width: number; height: number; fps: number; durationInFrames: number };
};

const PLACEHOLDER_LOGO =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="15" y="15" width="70" height="70" rx="10" fill="#111111"/></svg>'
  );

// Generated starter frames (solid brand colors + a palette), alternating normal/inverted.
const DEFAULT_FRAMES: Frame[] = [
  { kind: "solid", variant: "normal", color: "#2563EB" },
  { kind: "solid", variant: "inverted", color: "#111111" },
  { kind: "palette", variant: "normal", colors: ["#2563EB", "#111111", "#ffffff"] },
  { kind: "solid", variant: "normal", color: "#ffffff" },
  { kind: "solid", variant: "inverted", color: "#2563EB" },
  { kind: "palette", variant: "inverted", colors: ["#111111", "#2563EB"] },
];

// Default cut grid (~4 cuts/sec) so the preview cuts before any audio analysis.
// This is a SYNTHETIC even grid, NOT derived from the bundled track's beatmap;
// upload audio + Analyze to get onset-synced cutTimes for real beat matching.
const DEFAULT_CUT_TIMES = Array.from({ length: 24 }, (_, i) => Number((i * 0.25).toFixed(3)));

export const DEFAULT_SHOWCASE_CONFIG: ShowcaseConfig = {
  logo: { src: PLACEHOLDER_LOGO, kind: "svg" },
  logoSizePct: 0.4,
  frames: DEFAULT_FRAMES,
  audio: { kind: "bundled", trackId: "pulse-120" },
  cutTimes: DEFAULT_CUT_TIMES,
  cutDensity: 1,
  format: { aspect: "9:16", ...FORMATS["9:16"], fps: 30, durationInFrames: resolveDuration(6, 30) },
};
