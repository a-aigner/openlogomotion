import type { EnvPreset, LightingPreset } from "./config";

export const ENV_PRESETS: Record<EnvPreset, { preset: "studio"|"city"|"sunset"|"dawn"|"night" }> = {
  studio: { preset: "studio" },
  city:   { preset: "city" },
  sunset: { preset: "sunset" },
  dawn:   { preset: "dawn" },
  night:  { preset: "night" },
};

export const LIGHTING_PRESETS: Record<LightingPreset, { key: number; fill: number; rim: number }> = {
  soft: { key: 1.0, fill: 0.6, rim: 0.4 },
  hard: { key: 1.8, fill: 0.2, rim: 0.8 },
  rim:  { key: 0.7, fill: 0.3, rim: 1.6 },
};
