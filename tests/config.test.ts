import { describe, it, expect } from "vitest";
import { FORMATS, resolveDuration } from "../src/lib/config";

describe("config", () => {
  it("maps 9:16 to 1080x1920", () => {
    expect(FORMATS["9:16"]).toEqual({ width: 1080, height: 1920 });
  });
  it("resolveDuration multiplies seconds by fps", () => {
    expect(resolveDuration(5, 30)).toBe(150);
  });
});
