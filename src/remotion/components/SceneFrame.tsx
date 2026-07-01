import { AbsoluteFill, Img, staticFile } from "remotion";
import type { Frame } from "@/lib/frames";
import type { ShowcaseConfig, FrameVariant } from "@/lib/showcase-config";
import { computeHomography, toMatrix3d } from "@/lib/matrix3d";

type Pt = [number, number];

export const SceneFrame: React.FC<{
  frame: Frame;
  variant: FrameVariant;
  logo: ShowcaseConfig["logo"];
  logoStyle: ShowcaseConfig["logoStyle"];
  width: number;
  height: number;
}> = ({ frame, variant, logo, logoStyle, width, height }) => {
  const inverted = variant === "inverted";
  const shadow = logoStyle.dropShadow ? "drop-shadow(0 6px 14px rgba(0,0,0,0.35))" : "none";
  // Inverted flips the logo light/dark to contrast the surface.
  const logoFilter = `${inverted ? "invert(1) " : ""}${shadow}`.trim();

  const logoImg = (style: React.CSSProperties) => (
    <Img src={logo.src} style={{ ...style, filter: logoFilter, objectFit: "contain" }} />
  );

  let placed: React.ReactNode = null;
  if (frame.type === "surface" && frame.surface) {
    // Map a width×height source rect onto the quad (quad is normalized → pixels).
    const src: [Pt, Pt, Pt, Pt] = [[0, 0], [width, 0], [width, height], [0, height]];
    const dst = frame.surface.quad.map((p) => [p[0] * width, p[1] * height]) as [Pt, Pt, Pt, Pt];
    const m3d = toMatrix3d(computeHomography(src, dst));
    placed = (
      <div style={{ position: "absolute", top: 0, left: 0, width, height,
        transformOrigin: "0 0", transform: m3d, mixBlendMode: frame.surface.blend }}>
        {logoImg({ position: "absolute", inset: "12%" })}
      </div>
    );
  } else if (frame.anchor) {
    const size = Math.min(width, height) * frame.anchor.sizePct * logoStyle.sizePct;
    placed = logoImg({
      position: "absolute",
      left: frame.anchor.xPct * width - size / 2,
      top: frame.anchor.yPct * height - size / 2,
      width: size, height: size,
    });
  }

  return (
    <AbsoluteFill>
      <Img src={staticFile(frame.src)} style={{ width, height, objectFit: "cover" }} />
      {placed}
    </AbsoluteFill>
  );
};
