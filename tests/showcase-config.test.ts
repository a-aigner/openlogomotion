import { describe, it, expect } from "vitest";
import { FRAMES, getFrame } from "../src/lib/frames";
import { DEFAULT_SHOWCASE_CONFIG } from "../src/lib/showcase-config";
import { FORMATS, resolveDuration } from "../src/lib/config";

describe("frames + showcase config", () => {
  it("every frame has a src and a placement matching its type", () => {
    for (const f of FRAMES) {
      expect(f.src).toMatch(/^assets\/frames\//);
      if (f.type === "surface") expect(f.surface?.quad).toHaveLength(4);
      if (f.type === "anchor") expect(f.anchor?.sizePct).toBeGreaterThan(0);
    }
  });
  it("getFrame throws on unknown id", () => {
    expect(() => getFrame("nope")).toThrow(/unknown frame/i);
  });
  it("default config references only known frames and is format-consistent", () => {
    for (const item of DEFAULT_SHOWCASE_CONFIG.frames) expect(() => getFrame(item.id)).not.toThrow();
    const fmt = DEFAULT_SHOWCASE_CONFIG.format;
    expect(fmt.width).toBe(FORMATS[fmt.aspect].width);
    expect(fmt.durationInFrames).toBe(resolveDuration(8, fmt.fps));
  });
  it("cutsPerBeat is a positive integer", () => {
    expect(DEFAULT_SHOWCASE_CONFIG.cutsPerBeat).toBeGreaterThanOrEqual(1);
  });
});
