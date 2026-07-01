import { Composition } from "remotion";
import { LogoComposition } from "./LogoComposition";
import { DEFAULT_CONFIG } from "@/lib/config";
import type { LogoAnimConfig } from "@/lib/config";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="LogoPulse"
    component={LogoComposition}
    durationInFrames={DEFAULT_CONFIG.format.durationInFrames}
    fps={DEFAULT_CONFIG.format.fps}
    width={DEFAULT_CONFIG.format.width}
    height={DEFAULT_CONFIG.format.height}
    defaultProps={{ config: DEFAULT_CONFIG }}
    calculateMetadata={({ props }: { props: { config: LogoAnimConfig } }) => ({
      durationInFrames: props.config.format.durationInFrames,
      fps: props.config.format.fps,
      width: props.config.format.width,
      height: props.config.format.height,
    })}
  />
);
