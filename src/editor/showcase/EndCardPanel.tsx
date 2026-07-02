"use client";
import type { ShowcaseConfig, Frame } from "@/lib/showcase-config";
import type { DeepPartial } from "./useShowcaseConfig";
import { FramePreview } from "./FramePreview";

export const EndCardPanel: React.FC<{
  config: ShowcaseConfig;
  patch: (p: DeepPartial<ShowcaseConfig>) => void;
  setOutroFrame: (frame: Frame) => void;
}> = ({ config, patch, setOutroFrame }) => {
  const { outro } = config;

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: "#6b6b6b",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  };

  const iconBtnStyle: React.CSSProperties = {
    padding: "2px 6px",
    border: "1px solid #e5e5e5",
    borderRadius: 4,
    background: "#ffffff",
    color: "#1a1a1a",
    cursor: "pointer",
    fontSize: 11,
    lineHeight: "16px",
  };

  const typeBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: "4px 10px",
    border: `1px solid ${active ? "#2563EB" : "#e5e5e5"}`,
    borderRadius: 4,
    background: active ? "#eff6ff" : "#ffffff",
    color: active ? "#2563EB" : "#1a1a1a",
    cursor: "pointer",
    fontSize: 11,
    fontWeight: active ? 600 : 400,
  });

  const colorInputStyle: React.CSSProperties = {
    width: 22,
    height: 22,
    border: "1px solid #e5e5e5",
    borderRadius: 3,
    padding: 1,
    cursor: "pointer",
  };

  const currentVariant = outro.frame.variant;

  const handleKindSolid = () => {
    setOutroFrame({ kind: "solid", variant: currentVariant, color: "#2563EB" });
  };

  const handleKindPalette = () => {
    setOutroFrame({ kind: "palette", variant: currentVariant, colors: ["#2563EB", "#111111"] });
  };

  const handleKindImage = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,.png,.jpg,.jpeg,.webp,.svg";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        setOutroFrame({ kind: "image", variant: currentVariant, src: reader.result as string, fit: "cover" });
      };
      reader.onerror = () => alert("Could not read that image file.");
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleReplaceImage = (file: File) => {
    if (outro.frame.kind !== "image") return;
    const reader = new FileReader();
    reader.onload = () => {
      if (outro.frame.kind === "image") {
        setOutroFrame({ ...outro.frame, src: reader.result as string });
      }
    };
    reader.onerror = () => alert("Could not read that image file.");
    reader.readAsDataURL(file);
  };

  const handleInvert = () => {
    setOutroFrame({ ...outro.frame, variant: outro.frame.variant === "inverted" ? "normal" : "inverted" });
  };

  return (
    <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid #e5e5e5" }}>
      <span style={sectionLabelStyle}>End Card</span>
      <div style={{ marginTop: 10 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#1a1a1a", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={outro.enabled}
            onChange={(e) => patch({ outro: { enabled: e.target.checked } })}
          />
          Add an end card
        </label>
      </div>

      {outro.enabled && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Preview thumbnail */}
          <FramePreview frame={outro.frame} logoSrc={config.logo.src} logoSizePct={config.logoSizePct} />

          {/* Kind buttons */}
          <div style={{ display: "flex", gap: 4 }}>
            <button style={typeBtnStyle(outro.frame.kind === "solid")} onClick={handleKindSolid}>Solid</button>
            <button style={typeBtnStyle(outro.frame.kind === "palette")} onClick={handleKindPalette}>Palette</button>
            <button style={typeBtnStyle(outro.frame.kind === "image")} onClick={handleKindImage}>Image</button>
          </div>

          {/* Per-kind editing */}
          {outro.frame.kind === "solid" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: "#6b6b6b" }}>Color</span>
              <input
                type="color"
                value={outro.frame.color}
                style={colorInputStyle}
                onChange={(e) => {
                  if (outro.frame.kind === "solid") {
                    setOutroFrame({ ...outro.frame, color: e.target.value });
                  }
                }}
              />
            </div>
          )}

          {outro.frame.kind === "palette" && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: "#6b6b6b" }}>Colors</span>
              {outro.frame.colors.map((c, ci) => (
                <input
                  key={ci}
                  type="color"
                  value={c}
                  style={colorInputStyle}
                  onChange={(e) => {
                    if (outro.frame.kind === "palette") {
                      setOutroFrame({
                        ...outro.frame,
                        colors: outro.frame.colors.map((x, xi) => (xi === ci ? e.target.value : x)),
                      });
                    }
                  }}
                />
              ))}
            </div>
          )}

          {outro.frame.kind === "image" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", gap: 4 }}>
                <label style={{ ...iconBtnStyle, cursor: "pointer" }}>
                  Replace image…
                  <input
                    type="file"
                    accept="image/*,.png,.jpg,.jpeg,.webp,.svg"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleReplaceImage(file);
                    }}
                  />
                </label>
                <button
                  style={{ ...iconBtnStyle, fontWeight: outro.frame.fit === "cover" ? 600 : 400 }}
                  onClick={() => {
                    if (outro.frame.kind === "image") setOutroFrame({ ...outro.frame, fit: "cover" });
                  }}
                >
                  Cover{outro.frame.fit === "cover" ? " ✓" : ""}
                </button>
                <button
                  style={{ ...iconBtnStyle, fontWeight: outro.frame.fit === "contain" ? 600 : 400 }}
                  onClick={() => {
                    if (outro.frame.kind === "image") setOutroFrame({ ...outro.frame, fit: "contain" });
                  }}
                >
                  Contain{outro.frame.fit === "contain" ? " ✓" : ""}
                </button>
              </div>
            </div>
          )}

          {/* Invert toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button style={iconBtnStyle} onClick={handleInvert} title="Invert logo">◐</button>
            <span style={{ fontSize: 11, color: "#6b6b6b" }}>
              {outro.frame.variant === "inverted" ? "Logo inverted" : "Logo normal"}
            </span>
          </div>

          {/* Hold duration slider */}
          <label style={{ fontSize: 12, color: "#6b6b6b", display: "block" }}>
            Hold: {outro.holdSec}s
            <input
              type="range"
              min={0.5}
              max={5}
              step={0.5}
              value={outro.holdSec}
              style={{ width: "100%", marginTop: 4 }}
              onChange={(e) => patch({ outro: { holdSec: Number(e.target.value) } })}
            />
          </label>
        </div>
      )}
    </div>
  );
};
