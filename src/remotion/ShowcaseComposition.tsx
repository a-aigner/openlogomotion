import { AbsoluteFill, useCurrentFrame, useVideoConfig, Audio, Img, staticFile } from "remotion";
import { cutIndexAt, pickFrame } from "@/lib/cut-sequencer";
import { getTrack } from "@/lib/tracks";
import { DEFAULT_SHOWCASE_CONFIG, type ShowcaseConfig } from "@/lib/showcase-config";
import { FrameBackground } from "./components/FrameBackground";

export const ShowcaseComposition: React.FC<{ config: ShowcaseConfig }> = ({ config }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  const frames = config.frames.length > 0 ? config.frames : DEFAULT_SHOWCASE_CONFIG.frames;
  const cutTimes = config.cutTimes.length > 0 ? config.cutTimes : DEFAULT_SHOWCASE_CONFIG.cutTimes;

  const montage = config.format.durationInFrames;
  const inOutro = config.outro.enabled && frame >= montage;
  const current = inOutro
    ? config.outro.frame
    : pickFrame(frames, cutIndexAt(frame, fps, cutTimes));

  const size = Math.min(width, height) * config.logoSizePct;
  const logoFilter = current.variant === "inverted" ? "invert(1)" : "none";
  const audioSrc =
    config.audio.kind === "bundled" ? staticFile(getTrack(config.audio.trackId).src) : config.audio.src;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <FrameBackground frame={current} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <Img src={config.logo.src} style={{ width: size, height: size, objectFit: "contain", filter: logoFilter }} />
      </AbsoluteFill>
      <Audio src={audioSrc} />
    </AbsoluteFill>
  );
};
