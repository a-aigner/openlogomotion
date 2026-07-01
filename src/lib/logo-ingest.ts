import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { Box2, Vector2 } from "three";

export type ParsedLogo = {
  shapes: { shape: import("three").Shape; color: string }[];
  warnings: string[];
  normalize: { center: [number, number]; scale: number };
};

export function parseSvg(svg: string): ParsedLogo {
  const warnings: string[] = [];
  const data = new SVGLoader().parse(svg);
  const out: { shape: import("three").Shape; color: string }[] = [];

  for (const path of data.paths) {
    const style = (path.userData?.style ?? {}) as { fill?: string; stroke?: string };
    if (typeof style.fill === "string" && style.fill.startsWith("url(")) {
      warnings.push("Gradient/pattern fills are flattened to a solid color.");
    }
    if (style.fill === "none" && style.stroke && style.stroke !== "none") {
      warnings.push("Stroke-only paths are not extruded; give shapes a fill.");
    }
    const color =
      typeof style.fill === "string" && style.fill.startsWith("#")
        ? style.fill
        : "#cccccc";
    for (const shape of SVGLoader.createShapes(path)) out.push({ shape, color });
  }

  if (out.length === 0) throw new Error("SVG has no drawable filled shapes.");

  // Compute bounds across all shape points (SVG y-down; caller flips y in geometry).
  const box = new Box2();
  const v = new Vector2();
  for (const { shape } of out)
    for (const p of shape.getPoints(24)) box.expandByPoint(v.set(p.x, p.y));
  const size = new Vector2();
  box.getSize(size);
  const center = new Vector2();
  box.getCenter(center);
  const maxDim = Math.max(size.x, size.y) || 1;
  const scale = 2 / maxDim; // fit into ~2 world units

  return { shapes: out, warnings, normalize: { center: [center.x, center.y], scale } };
}
