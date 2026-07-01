import { TRACKS } from "@/lib/tracks";
import type { LogoAnimConfig } from "@/lib/config";
import type { DeepPartial } from "../useConfig";

export const MusicPanel: React.FC<{ config: LogoAnimConfig; patch: (p: DeepPartial<LogoAnimConfig>) => void }> = ({ config, patch }) => (
  <fieldset>
    <legend>Music</legend>
    {TRACKS.map((track) => (
      <label key={track.id} style={{ marginRight: 8 }}>
        <input
          type="radio"
          name="track"
          checked={config.audio.trackId === track.id}
          onChange={() => patch({ audio: { trackId: track.id } })}
        />
        {track.title}
      </label>
    ))}
  </fieldset>
);
