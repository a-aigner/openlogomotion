import { describe, it, expect } from "vitest";
import { DEFAULT_SHOWCASE_CONFIG } from "../src/lib/showcase-config";
import { FORMATS, resolveDuration } from "../src/lib/config";

describe("showcase-config v2", () => {
  it("has generated frames of supported kinds", () => {
    expect(DEFAULT_SHOWCASE_CONFIG.frames.length).toBeGreaterThan(0);
    for (const f of DEFAULT_SHOWCASE_CONFIG.frames) {
      expect(["solid", "palette"]).toContain(f.kind);
      if (f.kind === "solid") expect(f.color).toMatch(/^#/);
      if (f.kind === "palette") expect(f.colors.length).toBeGreaterThan(0);
    }
  });
  it("has a sorted, non-empty default cut grid", () => {
    const c = DEFAULT_SHOWCASE_CONFIG.cutTimes;
    expect(c.length).toBeGreaterThan(0);
    for (let i = 1; i < c.length; i++) expect(c[i]).toBeGreaterThan(c[i - 1]);
  });
  it("is format-consistent (6s default)", () => {
    const fmt = DEFAULT_SHOWCASE_CONFIG.format;
    expect(fmt.width).toBe(FORMATS[fmt.aspect].width);
    expect(fmt.durationInFrames).toBe(resolveDuration(6, fmt.fps));
  });
});
