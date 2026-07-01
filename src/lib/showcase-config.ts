import type { Aspect } from "./config";
import { FORMATS, resolveDuration } from "./config";
import { FRAMES } from "./frames";

export type FrameVariant = "normal" | "inverted";

export type ShowcaseConfig = {
  logo: { src: string; kind: "svg" | "raster" };
  frames: { id: string; variant: FrameVariant }[];
  cutsPerBeat: number;
  logoStyle: { tint?: string; dropShadow: boolean; sizePct: number };
  audio: { trackId: string };
  format: { aspect: Aspect; width: number; height: number; fps: number; durationInFrames: number };
};

// Neutral placeholder logo so the composition renders before a user uploads one.
const PLACEHOLDER_LOGO =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="15" y="15" width="70" height="70" rx="10" fill="#111111"/></svg>'
  );

export const DEFAULT_SHOWCASE_CONFIG: ShowcaseConfig = {
  logo: { src: PLACEHOLDER_LOGO, kind: "svg" },
  frames: FRAMES.map((f) => ({ id: f.id, variant: "normal" as FrameVariant })),
  cutsPerBeat: 2,
  logoStyle: { dropShadow: true, sizePct: 1 },
  audio: { trackId: "pulse-120" },
  format: { aspect: "9:16", ...FORMATS["9:16"], fps: 30, durationInFrames: resolveDuration(8, 30) },
};
