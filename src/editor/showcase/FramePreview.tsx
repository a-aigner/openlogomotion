"use client";
import type { Frame } from "@/lib/showcase-config";

const PREVIEW_H = 44;
const PREVIEW_W = Math.round((PREVIEW_H * 9) / 16);

export const FramePreview: React.FC<{ frame: Frame; logoSrc: string; logoSizePct: number }> = ({
  frame,
  logoSrc,
  logoSizePct,
}) => {
  const inverted = frame.variant === "inverted";
  const logoSize = Math.min(PREVIEW_W, PREVIEW_H) * logoSizePct;
  let bg: React.ReactNode;
  if (frame.kind === "solid") {
    bg = <div style={{ position: "absolute", inset: 0, background: frame.color }} />;
  } else if (frame.kind === "palette") {
    bg = (
      <div style={{ position: "absolute", inset: 0, display: "flex" }}>
        {frame.colors.map((c, i) => (
          <div key={i} style={{ flex: 1, background: c }} />
        ))}
      </div>
    );
  } else {
    bg = (
      <img
        src={frame.src}
        alt=""
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: frame.fit }}
      />
    );
  }
  return (
    <div
      title={`${frame.kind}${inverted ? " (inverted)" : ""}`}
      style={{
        position: "relative",
        width: PREVIEW_W,
        height: PREVIEW_H,
        flexShrink: 0,
        borderRadius: 3,
        overflow: "hidden",
        border: "1px solid #e5e5e5",
        background: "#000",
      }}
    >
      {bg}
      <img
        src={logoSrc}
        alt=""
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: logoSize,
          height: logoSize,
          transform: "translate(-50%, -50%)",
          objectFit: "contain",
          filter: inverted ? "invert(1)" : "none",
        }}
      />
    </div>
  );
};
