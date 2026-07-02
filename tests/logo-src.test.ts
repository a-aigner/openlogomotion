import { describe, it, expect } from "vitest";
import { isSupportedLogo, logoKind, svgToDataUrl } from "../src/lib/logo-src";

describe("logo-src", () => {
  it("accepts svg/png/jpeg/webp, rejects others", () => {
    expect(isSupportedLogo("image/svg+xml", "a.svg")).toBe(true);
    expect(isSupportedLogo("image/png", "a.png")).toBe(true);
    expect(isSupportedLogo("image/webp", "a.webp")).toBe(true);
    expect(isSupportedLogo("", "a.jpeg")).toBe(true);        // fall back to extension
    expect(isSupportedLogo("application/pdf", "a.pdf")).toBe(false);
  });
  it("classifies svg vs raster", () => {
    expect(logoKind("image/svg+xml", "a.svg")).toBe("svg");
    expect(logoKind("", "a.SVG")).toBe("svg");               // case-insensitive
    expect(logoKind("image/png", "a.png")).toBe("raster");
  });
  it("svgToDataUrl produces a decodable data URL containing the markup", () => {
    const url = svgToDataUrl('<svg><rect fill="#f00"/></svg>');
    expect(url.startsWith("data:image/svg+xml;utf8,")).toBe(true);
    expect(decodeURIComponent(url)).toContain("<rect");
  });
});
