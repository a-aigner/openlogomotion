import type { EnvPreset, LightingPreset } from "./config";
import studio from "@pmndrs/assets/hdri/studio.exr";
import city from "@pmndrs/assets/hdri/city.exr";
import sunset from "@pmndrs/assets/hdri/sunset.exr";
import dawn from "@pmndrs/assets/hdri/dawn.exr";
import night from "@pmndrs/assets/hdri/night.exr";

export const ENV_PRESETS: Record<EnvPreset, { hdri: string }> = {
  studio: { hdri: studio },
  city:   { hdri: city },
  sunset: { hdri: sunset },
  dawn:   { hdri: dawn },
  night:  { hdri: night },
};

export const LIGHTING_PRESETS: Record<LightingPreset, { key: number; fill: number; rim: number }> = {
  soft: { key: 1.0, fill: 0.6, rim: 0.4 },
  hard: { key: 1.8, fill: 0.2, rim: 0.8 },
  rim:  { key: 0.7, fill: 0.3, rim: 1.6 },
};
