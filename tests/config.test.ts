import { describe, it, expect } from "vitest";
import { FORMATS, DEFAULT_CONFIG, resolveDuration } from "../src/lib/config";

describe("config", () => {
  it("maps 9:16 to 1080x1920", () => {
    expect(FORMATS["9:16"]).toEqual({ width: 1080, height: 1920 });
  });
  it("resolveDuration multiplies seconds by fps", () => {
    expect(resolveDuration(5, 30)).toBe(150);
  });
  it("DEFAULT_CONFIG is internally consistent", () => {
    expect(DEFAULT_CONFIG.format.width).toBe(FORMATS[DEFAULT_CONFIG.format.aspect].width);
    expect(DEFAULT_CONFIG.format.height).toBe(FORMATS[DEFAULT_CONFIG.format.aspect].height);
    expect(DEFAULT_CONFIG.format.durationInFrames).toBe(
      resolveDuration(5, DEFAULT_CONFIG.format.fps)
    );
  });
});
