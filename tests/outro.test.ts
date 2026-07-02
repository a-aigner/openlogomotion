import { describe, it, expect } from "vitest";
import {
  DEFAULT_SHOWCASE_CONFIG,
  outroFrames,
  totalFrames,
  type ShowcaseConfig,
} from "../src/lib/showcase-config";

const BASE: ShowcaseConfig = {
  ...DEFAULT_SHOWCASE_CONFIG,
  format: { ...DEFAULT_SHOWCASE_CONFIG.format, durationInFrames: 180, fps: 30 },
};

describe("outroFrames / totalFrames", () => {
  it("outroFrames returns 0 when disabled", () => {
    const c: ShowcaseConfig = { ...BASE, outro: { enabled: false, frame: { kind: "solid", variant: "normal", color: "#111" }, holdSec: 2 } };
    expect(outroFrames(c)).toBe(0);
  });

  it("totalFrames equals montage when disabled", () => {
    const c: ShowcaseConfig = { ...BASE, outro: { enabled: false, frame: { kind: "solid", variant: "normal", color: "#111" }, holdSec: 2 } };
    expect(totalFrames(c)).toBe(180);
  });

  it("outroFrames returns round(holdSec * fps) when enabled", () => {
    const c: ShowcaseConfig = { ...BASE, outro: { enabled: true, frame: { kind: "solid", variant: "normal", color: "#e11" }, holdSec: 1 } };
    expect(outroFrames(c)).toBe(30); // round(1 * 30)
  });

  it("totalFrames equals montage + outro when enabled", () => {
    const c: ShowcaseConfig = { ...BASE, outro: { enabled: true, frame: { kind: "solid", variant: "normal", color: "#e11" }, holdSec: 1.5 } };
    expect(totalFrames(c)).toBe(180 + Math.round(1.5 * 30)); // 180 + 45 = 225
  });

  it("DEFAULT_SHOWCASE_CONFIG has outro disabled", () => {
    expect(DEFAULT_SHOWCASE_CONFIG.outro.enabled).toBe(false);
    expect(totalFrames(DEFAULT_SHOWCASE_CONFIG)).toBe(DEFAULT_SHOWCASE_CONFIG.format.durationInFrames);
  });
});
