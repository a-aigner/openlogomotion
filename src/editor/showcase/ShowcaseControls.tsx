"use client";
import { useState } from "react";
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

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: "#6b6b6b",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  };

  const fieldLabelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    color: "#6b6b6b",
    marginBottom: 4,
  };

  const selectStyle: React.CSSProperties = {
    width: "100%",
    padding: "5px 8px",
    border: "1px solid #e5e5e5",
    borderRadius: 6,
    background: "#ffffff",
    color: "#1a1a1a",
    fontSize: 12,
    marginTop: 4,
  };

  const rangeStyle: React.CSSProperties = {
    width: "100%",
    marginTop: 4,
  };

  return (
    <div style={{ padding: 16 }}>
      <span style={sectionLabelStyle}>Settings</span>
      <div style={{ marginTop: 12, marginBottom: 12 }}>
        <label style={fieldLabelStyle}>
          Logo size: {Math.round(config.logoSizePct * 100)}%
          <input
            type="range"
            min={0.15}
            max={0.7}
            step={0.01}
            value={config.logoSizePct}
            style={rangeStyle}
            onChange={(e) => patch({ logoSizePct: Number(e.target.value) })}
          />
        </label>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={fieldLabelStyle}>
          Format
          <select
            value={config.format.aspect}
            style={selectStyle}
            onChange={(e) => { const a = e.target.value as Aspect; patch({ format: { aspect: a, ...FORMATS[a] } }); }}
          >
            <option value="9:16">9:16</option>
            <option value="1:1">1:1</option>
            <option value="16:9">16:9</option>
          </select>
        </label>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={fieldLabelStyle}>
          Duration (s): {Math.round(config.format.durationInFrames / config.format.fps)}
          <input
            type="range"
            min={4}
            max={10}
            step={1}
            value={Math.round(config.format.durationInFrames / config.format.fps)}
            style={rangeStyle}
            onChange={(e) => patch({ format: { durationInFrames: resolveDuration(Number(e.target.value), config.format.fps) } })}
          />
        </label>
      </div>
      <button
        style={{
          width: "100%",
          padding: "10px 0",
          background: rendering ? "#6b6b6b" : "#1a1a1a",
          color: "#ffffff",
          border: "none",
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          cursor: rendering ? "not-allowed" : "pointer",
          letterSpacing: "-0.01em",
        }}
        onClick={onExport}
        disabled={rendering}
      >
        {rendering ? "Rendering…" : "Download Video"}
      </button>
    </div>
  );
};
