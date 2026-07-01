import type { MaterialPreset } from "./config";

export type MaterialSpec = {
  metalness: number; roughness: number;
  transmission?: number; emissiveIntensity?: number;
  useColorFromLogo: boolean; color?: string;
};

export const MATERIAL_PRESETS: Record<MaterialPreset, MaterialSpec> = {
  chrome:  { metalness: 1.0, roughness: 0.05, useColorFromLogo: false, color: "#dfe4ea" },
  gold:    { metalness: 1.0, roughness: 0.15, useColorFromLogo: false, color: "#ffcf40" },
  glass:   { metalness: 0.0, roughness: 0.0, transmission: 1.0, useColorFromLogo: false, color: "#ffffff" },
  plastic: { metalness: 0.0, roughness: 0.4, useColorFromLogo: true },
  matte:   { metalness: 0.0, roughness: 0.9, useColorFromLogo: true },
  glossy:  { metalness: 0.2, roughness: 0.1, useColorFromLogo: true },
  neon:    { metalness: 0.0, roughness: 0.5, emissiveIntensity: 2.0, useColorFromLogo: true },
};
