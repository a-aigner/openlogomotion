import { describe, it, expect } from "vitest";
import { MATERIAL_PRESETS } from "../src/lib/materials";
import { ENV_PRESETS, LIGHTING_PRESETS } from "../src/lib/environments";

describe("preset tables", () => {
  it("has a material spec for every material preset id", () => {
    for (const k of ["chrome","gold","glass","plastic","matte","glossy","neon"] as const) {
      expect(MATERIAL_PRESETS[k]).toBeDefined();
      expect(MATERIAL_PRESETS[k].metalness).toBeGreaterThanOrEqual(0);
    }
  });
  it("glass has transmission > 0", () => {
    expect(MATERIAL_PRESETS.glass.transmission).toBeGreaterThan(0);
  });
  it("has env + lighting presets for every id", () => {
    for (const k of ["studio","city","sunset","dawn","night"] as const) expect(ENV_PRESETS[k]).toBeDefined();
    for (const k of ["soft","hard","rim"] as const) expect(LIGHTING_PRESETS[k]).toBeDefined();
  });
});
