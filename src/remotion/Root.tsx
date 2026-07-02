import React from "react";
import { Composition } from "remotion";
import { ShowcaseComposition } from "./ShowcaseComposition";
import { DEFAULT_SHOWCASE_CONFIG, type ShowcaseConfig } from "@/lib/showcase-config";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="LogoShowcase"
    component={ShowcaseComposition}
    durationInFrames={DEFAULT_SHOWCASE_CONFIG.format.durationInFrames}
    fps={DEFAULT_SHOWCASE_CONFIG.format.fps}
    width={DEFAULT_SHOWCASE_CONFIG.format.width}
    height={DEFAULT_SHOWCASE_CONFIG.format.height}
    defaultProps={{ config: DEFAULT_SHOWCASE_CONFIG }}
    calculateMetadata={({ props }: { props: { config: ShowcaseConfig } }) => ({
      durationInFrames: props.config.format.durationInFrames,
      fps: props.config.format.fps,
      width: props.config.format.width,
      height: props.config.format.height,
    })}
  />
);
