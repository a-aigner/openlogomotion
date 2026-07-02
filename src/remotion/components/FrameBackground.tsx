import { AbsoluteFill, Img } from "remotion";
import type { Frame } from "@/lib/showcase-config";

export const FrameBackground: React.FC<{ frame: Frame }> = ({ frame }) => {
  if (frame.kind === "solid") {
    return <AbsoluteFill style={{ backgroundColor: frame.color }} />;
  }
  if (frame.kind === "image") {
    return (
      <AbsoluteFill>
        <Img src={frame.src} style={{ width: "100%", height: "100%", objectFit: frame.fit }} />
      </AbsoluteFill>
    );
  }
  // palette: evenly split vertical color bands
  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "row" }}>
      {frame.colors.map((c, i) => (
        <div key={i} style={{ flex: 1, backgroundColor: c }} />
      ))}
    </AbsoluteFill>
  );
};
