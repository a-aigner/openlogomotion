export type Aspect = "9:16" | "1:1" | "16:9";
export type MaterialPreset = "chrome" | "gold" | "glass" | "plastic" | "matte" | "glossy" | "neon";
export type EnvPreset = "studio" | "city" | "sunset" | "dawn" | "night";
export type LightingPreset = "soft" | "hard" | "rim";
export type AnimPreset = "spin" | "pulseBeat" | "bounce" | "wobble" | "flip" | "assemble" | "float";

export type LogoAnimConfig = {
  logo: { svg: string };
  extrusion: { depth: number; bevel: number };
  material: MaterialPreset;
  scene: {
    environment: EnvPreset;
    lighting: LightingPreset;
    background: { type: "color" | "gradient"; value: string | [string, string] };
  };
  animation: { preset: AnimPreset; intensity: number };
  audio: { trackId: string };
  format: { aspect: Aspect; width: number; height: number; fps: number; durationInFrames: number };
};

export const FORMATS: Record<Aspect, { width: number; height: number }> = {
  "9:16": { width: 1080, height: 1920 },
  "1:1": { width: 1080, height: 1080 },
  "16:9": { width: 1920, height: 1080 },
};

export const resolveDuration = (seconds: number, fps: number): number => Math.round(seconds * fps);

const DEFAULT_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="20" y="20" width="60" height="60" fill="#8b5cf6"/></svg>';

export const DEFAULT_CONFIG: LogoAnimConfig = {
  logo: { svg: DEFAULT_SVG },
  extrusion: { depth: 0.35, bevel: 0.03 },
  material: "chrome",
  scene: {
    environment: "studio",
    lighting: "soft",
    background: { type: "gradient", value: ["#0b0b12", "#1b1030"] },
  },
  animation: { preset: "pulseBeat", intensity: 1 },
  audio: { trackId: "pulse-120" },
  format: { aspect: "9:16", ...FORMATS["9:16"], fps: 30, durationInFrames: resolveDuration(5, 30) },
};
