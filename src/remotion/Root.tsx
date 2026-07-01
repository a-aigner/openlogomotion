import { Composition } from "remotion";
import { LogoComposition } from "./LogoComposition";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="LogoPulse"
    component={LogoComposition}
    durationInFrames={150}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{}}
  />
);
