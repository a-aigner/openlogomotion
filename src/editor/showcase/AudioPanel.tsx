"use client";
import { useState } from "react";
import { TRACKS } from "@/lib/tracks";
import { decodeAudioFile, analyzeToCutTimes } from "@/lib/audio-analyze";
import { applyDensity } from "@/lib/cut-sequencer";
import { DEFAULT_SHOWCASE_CONFIG, type ShowcaseConfig } from "@/lib/showcase-config";
import type { DeepPartial } from "./useShowcaseConfig";

export const AudioPanel: React.FC<{
  config: ShowcaseConfig;
  patch: (p: DeepPartial<ShowcaseConfig>) => void;
  setCutTimes: (t: number[]) => void;
}> = ({ config, patch, setCutTimes }) => {
  const [status, setStatus] = useState("");
  const [density, setDensity] = useState(config.cutDensity);
  const [decoded, setDecoded] = useState<{ samples: Float32Array; sampleRate: number } | null>(null);

  // Base grid for bundled-track density: stable reference to the default cut grid.
  const baseGrid = DEFAULT_SHOWCASE_CONFIG.cutTimes;

  const onFile = async (file: File) => {
    setStatus("Analyzing…");
    try {
      const { samples, sampleRate, dataUrl, duration } = await decodeAudioFile(file);
      setDecoded({ samples, sampleRate });
      const cuts = analyzeToCutTimes(samples, sampleRate, density);
      patch({ audio: { kind: "upload", src: dataUrl, name: file.name } });
      setCutTimes(cuts);
      setStatus(`${cuts.length} cuts from ${file.name} (${duration.toFixed(1)}s)`);
    } catch (e) { setStatus("Could not analyze: " + (e as Error).message); }
  };

  const reAnalyze = (d: number) => {
    setDensity(d);
    patch({ cutDensity: d });
    if (decoded) {
      // Uploaded audio: re-derive from stored samples.
      setCutTimes(analyzeToCutTimes(decoded.samples, decoded.sampleRate, d));
    } else {
      // Bundled audio: apply density to base grid so slider is never a no-op.
      setCutTimes(applyDensity(baseGrid, d));
    }
  };

  return (
    <fieldset><legend>Audio</legend>
      {TRACKS.map((t) => (
        <label key={t.id} style={{ display: "block" }}>
          <input
            type="radio"
            name="sc2-audio"
            checked={config.audio.kind === "bundled" && config.audio.trackId === t.id}
            onChange={() => {
              patch({ audio: { kind: "bundled", trackId: t.id } });
              setDecoded(null);
              // Reset to bundled base grid with current density.
              setCutTimes(applyDensity(baseGrid, density));
            }}
          />{t.title} (bundled)
        </label>
      ))}
      <label style={{ display: "block", marginTop: 6 }}>
        Upload your audio:{" "}
        <input
          type="file"
          accept="audio/*,.mp3,.wav,.m4a,.ogg"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />
      </label>
      <label>Cut density: {density}&times;
        <input
          type="range"
          min={1}
          max={4}
          step={1}
          value={density}
          onChange={(e) => reAnalyze(Number(e.target.value))}
        />
      </label>
      <p style={{ color: "#6b6b6b", fontSize: 12 }}>{status}</p>
    </fieldset>
  );
};
