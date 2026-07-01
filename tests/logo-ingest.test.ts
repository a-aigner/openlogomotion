import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { parseSvg } from "../src/lib/logo-ingest";

const fx = (n: string) => readFileSync(`tests/fixtures/${n}`, "utf8");

describe("parseSvg", () => {
  it("parses a filled rect into one shape with its fill color", () => {
    const r = parseSvg(fx("square.svg"));
    expect(r.shapes.length).toBe(1);
    expect(r.shapes[0].color.toLowerCase()).toBe("#ff0000");
    expect(r.warnings).toHaveLength(0);
  });

  it("centers and scales: normalize.scale is positive and finite", () => {
    const r = parseSvg(fx("square.svg"));
    expect(r.normalize.scale).toBeGreaterThan(0);
    expect(Number.isFinite(r.normalize.center[0])).toBe(true);
  });

  it("warns on gradient fills but still returns a shape", () => {
    const r = parseSvg(fx("gradient.svg"));
    expect(r.shapes.length).toBeGreaterThan(0);
    expect(r.warnings.join(" ")).toMatch(/gradient/i);
  });

  it("throws a readable error on non-SVG input", () => {
    expect(() => parseSvg(fx("malformed.svg"))).toThrow(/no drawable/i);
  });
});
