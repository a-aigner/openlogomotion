"use client";
import { useState, useEffect } from "react";
import { TRACKS, getTrack } from "@/lib/tracks";
import { decodeAudioFile, decodeAudioUrl, analyzeToCutTimes } from "@/lib/audio-analyze";
import { applyDensity } from "@/lib/cut-sequencer";
import { DEFAULT_SHOWCASE_CONFIG, type ShowcaseConfig } from "@/lib/showcase-config";
import type { DeepPartial } from "./useShowcaseConfig";
import { AudioTimeline } from "./AudioTimeline";

export const AudioPanel: React.FC<{
  config: ShowcaseConfig;
  patch: (p: DeepPartial<ShowcaseConfig>) => void;
  setCutTimes: (t: number[]) => void;
}> = ({ config, patch, setCutTimes }) => {
  const [status, setStatus] = useState("");
  const [density, setDensity] = useState(config.cutDensity);
  const [decoded, setDecoded] = useState<{ samples: Float32Array; sampleRate: number; duration: number } | null>(null);

  // Base grid for bundled-track density: stable reference to the default cut grid.
  const baseGrid = DEFAULT_SHOWCASE_CONFIG.cutTimes;

  // Decode bundled track whenever it's selected so the waveform shows for it.
  // bundledTrackId is null when an upload is active, avoiding unnecessary fetches.
  const bundledTrackId = config.audio.kind === "bundled" ? config.audio.trackId : null;
  useEffect(() => {
    if (bundledTrackId === null) return;
    const track = getTrack(bundledTrackId);
    const url = "/" + track.src; // public path e.g. /assets/tracks/pulse-120.mp3
    let cancelled = false;
    decodeAudioUrl(url)
      .then(({ samples, sampleRate, duration }) => {
        if (!cancelled) setDecoded({ samples, sampleRate, duration });
      })
      .catch(() => {
        // Non-fatal: bundled decode may fail in server-only contexts; waveform just won't show.
        if (!cancelled) setDecoded(null);
      });
    return () => { cancelled = true; };
  }, [bundledTrackId]);

  const onFile = async (file: File) => {
    setStatus("Analyzing…");
    try {
      const { samples, sampleRate, dataUrl, duration } = await decodeAudioFile(file);
      setDecoded({ samples, sampleRate, duration });
      const cuts = analyzeToCutTimes(samples, sampleRate, density);
      patch({ audio: { kind: "upload", src: dataUrl, name: file.name } });
      setCutTimes(cuts);
      setStatus(`${cuts.length} cuts from ${file.name} (${duration.toFixed(1)}s)`);
    } catch (e) { setStatus("Could not analyze: " + (e as Error).message); }
  };

  const reAnalyze = (d: number) => {
    setDensity(d);
    patch({ cutDensity: d });
    if (decoded && config.audio.kind === "upload") {
      // Uploaded audio: re-derive from stored samples.
      setCutTimes(analyzeToCutTimes(decoded.samples, decoded.sampleRate, d));
    } else {
      // Bundled audio: apply density to base grid so slider is never a no-op.
      setCutTimes(applyDensity(baseGrid, d));
    }
  };

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: "#6b6b6b",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  };

  const radioLabelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    color: "#1a1a1a",
    padding: "3px 0",
    cursor: "pointer",
  };

  return (
    <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid #e5e5e5" }}>
      <span style={sectionLabelStyle}>Audio</span>
      <div style={{ marginTop: 10 }}>
        {TRACKS.map((t) => (
          <label key={t.id} style={radioLabelStyle}>
            <input
              type="radio"
              name="sc2-audio"
              style={{ marginRight: 6 }}
              checked={config.audio.kind === "bundled" && config.audio.trackId === t.id}
              onChange={() => {
                patch({ audio: { kind: "bundled", trackId: t.id } });
                setDecoded(null);
                // Reset to bundled base grid with current density.
                setCutTimes(applyDensity(baseGrid, density));
              }}
            />{t.title}
          </label>
        ))}
        <div style={{ marginTop: 8 }}>
          <span style={{ fontSize: 12, color: "#6b6b6b", display: "block", marginBottom: 4 }}>Upload audio</span>
          <input
            type="file"
            accept="audio/*,.mp3,.wav,.m4a,.ogg"
            style={{ fontSize: 11, color: "#6b6b6b" }}
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
        </div>
      </div>
      <div style={{ marginTop: 10 }}>
        <label style={{ fontSize: 12, color: "#6b6b6b", display: "block" }}>
          Cut density: {density}&times;
          <input
            type="range"
            min={1}
            max={4}
            step={1}
            value={density}
            style={{ width: "100%", marginTop: 4 }}
            onChange={(e) => reAnalyze(Number(e.target.value))}
          />
        </label>
      </div>
      {status && <p style={{ color: "#6b6b6b", fontSize: 11, margin: "6px 0 0" }}>{status}</p>}
      {decoded && (
        <div style={{ marginTop: 10 }}>
          <span style={{ fontSize: 11, color: "#6b6b6b", display: "block", marginBottom: 4 }}>
            {config.cutTimes.length} cuts
            {config.audio.kind === "upload"
              ? " — onset-detected"
              : " — even grid"}
          </span>
          <AudioTimeline
            samples={decoded.samples}
            sampleRate={decoded.sampleRate}
            duration={decoded.duration}
            cutTimes={config.cutTimes}
          />
        </div>
      )}
    </div>
  );
};
