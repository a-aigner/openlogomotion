import { useState } from "react";
import { TRACKS } from "@/lib/tracks";
import { FORMATS, resolveDuration, type Aspect } from "@/lib/config";
import type { ShowcaseConfig } from "@/lib/showcase-config";
import type { DeepPartial } from "./useShowcaseConfig";

export const ShowcaseControls: React.FC<{
  config: ShowcaseConfig;
  patch: (p: DeepPartial<ShowcaseConfig>) => void;
}> = ({ config, patch }) => {
  const [rendering, setRendering] = useState(false);
  const onExport = async () => {
    setRendering(true);
    try {
      const res = await fetch("/api/render", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config, id: "LogoShowcase" }),
      });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Render failed");
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a"); a.href = url; a.download = "showcase.mp4"; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { alert((e as Error).message); }
    finally { setRendering(false); }
  };
  return (
    <div>
      <label>Logo size: {Math.round(config.logoSizePct * 100)}%
        <input type="range" min={0.15} max={0.7} step={0.01} value={config.logoSizePct}
          onChange={(e) => patch({ logoSizePct: Number(e.target.value) })} />
      </label>
      <fieldset><legend>Music (bundled)</legend>
        {TRACKS.map((t) => (
          <label key={t.id} style={{ display: "block" }}>
            <input type="radio" name="sc2-track"
              checked={config.audio.kind === "bundled" && config.audio.trackId === t.id}
              onChange={() => patch({ audio: { kind: "bundled", trackId: t.id } })} />{t.title}
          </label>
        ))}
      </fieldset>
      <label>Format
        <select value={config.format.aspect}
          onChange={(e) => { const a = e.target.value as Aspect; patch({ format: { aspect: a, ...FORMATS[a] } }); }}>
          <option value="9:16">9:16</option><option value="1:1">1:1</option><option value="16:9">16:9</option>
        </select>
      </label>
      <label>Duration (s): {Math.round(config.format.durationInFrames / config.format.fps)}
        <input type="range" min={4} max={10} step={1}
          value={Math.round(config.format.durationInFrames / config.format.fps)}
          onChange={(e) => patch({ format: { durationInFrames: resolveDuration(Number(e.target.value), config.format.fps) } })} />
      </label>
      <button onClick={onExport} disabled={rendering}>{rendering ? "Rendering…" : "Download Video"}</button>
    </div>
  );
};
