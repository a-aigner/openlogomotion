import { Composition } from "remotion";
import { LogoComposition } from "./LogoComposition";
import { DEFAULT_CONFIG } from "@/lib/config";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="LogoPulse"
    component={LogoComposition}
    durationInFrames={DEFAULT_CONFIG.format.durationInFrames}
    fps={DEFAULT_CONFIG.format.fps}
    width={DEFAULT_CONFIG.format.width}
    height={DEFAULT_CONFIG.format.height}
    defaultProps={{ config: DEFAULT_CONFIG }}
  />
);
