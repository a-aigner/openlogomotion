import { AbsoluteFill, useCurrentFrame, useVideoConfig, Audio, staticFile } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { Scene } from "./components/Scene";
import { Logo3D } from "./components/Logo3D";
import { beatPhase, type Beatmap } from "@/lib/beat-engine";
import type { LogoAnimConfig } from "@/lib/config";
import { getTrack } from "@/lib/tracks";
import pulse120 from "../../public/assets/beatmaps/pulse-120.json";

const BEATMAPS: Record<string, Beatmap> = { "pulse-120": pulse120 as Beatmap };

const bgStyle = (bg: LogoAnimConfig["scene"]["background"]): React.CSSProperties =>
  bg.type === "gradient" && Array.isArray(bg.value)
    ? { backgroundImage: `linear-gradient(160deg, ${bg.value[0]}, ${bg.value[1]})` }
    : { backgroundColor: bg.value as string };

export const LogoComposition: React.FC<{ config: LogoAnimConfig }> = ({ config }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const track = getTrack(config.audio.trackId);
  const beat = beatPhase(frame, fps, BEATMAPS[track.id]);
  return (
    <AbsoluteFill style={bgStyle(config.scene.background)}>
      <ThreeCanvas width={width} height={height} camera={{ position: [0, 0, 6], fov: 45 }}>
        <Scene config={config}>
          <Logo3D config={config} frame={frame} fps={fps} beat={beat} />
        </Scene>
      </ThreeCanvas>
      <Audio src={staticFile(track.src)} />
    </AbsoluteFill>
  );
};
