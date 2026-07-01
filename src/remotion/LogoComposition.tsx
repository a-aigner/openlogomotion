import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { Scene } from "./components/Scene";
import { Logo3D } from "./components/Logo3D";
import { beatPhase, type Beatmap } from "@/lib/beat-engine";
import type { LogoAnimConfig } from "@/lib/config";

// Placeholder constant beatmap until Task 8 injects the real one.
const CONST_BEATMAP: Beatmap = { bpm: 120, beats: Array.from({ length: 32 }, (_, i) => i * 0.5) };

const bgStyle = (bg: LogoAnimConfig["scene"]["background"]): React.CSSProperties =>
  bg.type === "gradient" && Array.isArray(bg.value)
    ? { backgroundImage: `linear-gradient(160deg, ${bg.value[0]}, ${bg.value[1]})` }
    : { backgroundColor: bg.value as string };

export const LogoComposition: React.FC<{ config: LogoAnimConfig }> = ({ config }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const beat = beatPhase(frame, fps, CONST_BEATMAP);
  return (
    <AbsoluteFill style={bgStyle(config.scene.background)}>
      <ThreeCanvas width={width} height={height} camera={{ position: [0, 0, 6], fov: 45 }}>
        <Scene config={config}>
          <Logo3D config={config} frame={frame} fps={fps} beat={beat} />
        </Scene>
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
