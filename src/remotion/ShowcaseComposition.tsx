import { AbsoluteFill, useCurrentFrame, useVideoConfig, Audio, staticFile } from "remotion";
import { getFrame } from "@/lib/frames";
import { cutIndexAt, pickFrame } from "@/lib/cut-sequencer";
import { getTrack } from "@/lib/tracks";
import type { ShowcaseConfig } from "@/lib/showcase-config";
import type { Beatmap } from "@/lib/beat-engine";
import { SceneFrame } from "./components/SceneFrame";
import pulse120 from "../../public/assets/beatmaps/pulse-120.json";

const BEATMAPS: Record<string, Beatmap> = { "pulse-120": pulse120 satisfies Beatmap };

export const ShowcaseComposition: React.FC<{ config: ShowcaseConfig }> = ({ config }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const track = getTrack(config.audio.trackId);
  const beatmap = BEATMAPS[track.id];
  if (!beatmap) throw new Error(`No beatmap registered for track "${track.id}"`);

  const ordered = config.frames.length > 0 ? config.frames : []; // empty guarded below
  const list = ordered.length > 0 ? ordered : [{ id: getFrame("card").id, variant: "normal" as const }];
  const idx = cutIndexAt(frame, fps, beatmap.bpm, config.cutsPerBeat);
  const current = pickFrame(list, idx);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <SceneFrame
        frame={getFrame(current.id)}
        variant={current.variant}
        logo={config.logo}
        logoStyle={config.logoStyle}
        width={width}
        height={height}
      />
      <Audio src={staticFile(track.src)} />
    </AbsoluteFill>
  );
};
