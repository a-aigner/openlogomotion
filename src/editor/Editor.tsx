"use client";
import { Player } from "@remotion/player";
import { useState } from "react";
import { LogoComposition } from "@/remotion/LogoComposition";
import { parseSvg } from "@/lib/logo-ingest";
import { useConfig } from "./useConfig";
import { MaterialPanel } from "./panels/MaterialPanel";
import { ScenePanel } from "./panels/ScenePanel";
import { AnimationPanel } from "./panels/AnimationPanel";
import { MusicPanel } from "./panels/MusicPanel";
import { FormatPanel } from "./panels/FormatPanel";

export default function Editor() {
  const [config, patch] = useConfig();
  const [warn, setWarn] = useState<string[]>([]);
  const [rendering, setRendering] = useState(false);

  const onExport = async () => {
    setRendering(true);
    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Render failed");
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = "logo.mp4";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setRendering(false);
    }
  };

  const onUpload = async (file: File) => {
    const svg = await file.text();
    try {
      const parsed = parseSvg(svg);
      setWarn(parsed.warnings);
      patch({ logo: { svg } });
    } catch (e) {
      setWarn([(e as Error).message]);
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 16, padding: 16 }}>
      <div>
        <input
          type="file"
          accept=".svg,image/svg+xml"
          onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
        />
        {warn.map((w, i) => (
          <p key={i} style={{ color: "#c60" }}>
            ⚠ {w}
          </p>
        ))}
        <MaterialPanel config={config} patch={patch} />
        <ScenePanel config={config} patch={patch} />
        <AnimationPanel config={config} patch={patch} />
        <MusicPanel config={config} patch={patch} />
        <FormatPanel config={config} patch={patch} />
      </div>
      <div>
        <Player
          component={LogoComposition}
          inputProps={{ config }}
          durationInFrames={config.format.durationInFrames}
          fps={config.format.fps}
          compositionWidth={config.format.width}
          compositionHeight={config.format.height}
          style={{
            width: "100%",
            maxWidth: 405,
            aspectRatio: `${config.format.width}/${config.format.height}`,
          }}
          controls
          loop
        />
        <button onClick={onExport} disabled={rendering} style={{ marginTop: 12 }}>
          {rendering ? "Rendering…" : "Export MP4"}
        </button>
      </div>
    </div>
  );
}
