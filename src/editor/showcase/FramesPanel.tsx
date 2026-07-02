"use client";
import { useRef } from "react";
import type { ShowcaseConfig, Frame } from "@/lib/showcase-config";

export const FramesPanel: React.FC<{
  config: ShowcaseConfig;
  setFrames: (f: ShowcaseConfig["frames"]) => void;
}> = ({ config, setFrames }) => {
  // Stable key per frame object: survives reorders without changing key when a frame moves.
  // WeakMap keyed by the frame object reference; a counter provides unique string ids.
  // When a frame is mutated (color change), a new object is created so it gets a new id —
  // that's acceptable and avoids changing ShowcaseConfig["frames"] type.
  const idMap = useRef(new WeakMap<object, string>());
  const counter = useRef(0);

  const stableKey = (f: Frame): string => {
    if (!idMap.current.has(f)) {
      idMap.current.set(f, String(counter.current++));
    }
    return idMap.current.get(f)!;
  };

  const items = config.frames;
  const update = (i: number, next: Frame) => setFrames(items.map((f, k) => (k === i ? next : f)));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const a = items.slice(); [a[i], a[j]] = [a[j], a[i]]; setFrames(a);
  };
  const remove = (i: number) => setFrames(items.filter((_, k) => k !== i));
  const invert = (i: number) =>
    update(i, { ...items[i], variant: items[i].variant === "inverted" ? "normal" : "inverted" });
  const addSolid = () => setFrames([...items, { kind: "solid", variant: "normal", color: "#2563EB" }]);
  const addPalette = () => setFrames([...items, { kind: "palette", variant: "normal", colors: ["#2563EB", "#111111"] }]);

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

  const addBtnStyle: React.CSSProperties = {
    padding: "5px 12px",
    border: "1px solid #e5e5e5",
    borderRadius: 6,
    background: "#ffffff",
    color: "#1a1a1a",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 500,
  };

  const colorInputStyle: React.CSSProperties = {
    width: 22,
    height: 22,
    border: "1px solid #e5e5e5",
    borderRadius: 3,
    padding: 1,
    cursor: "pointer",
  };

  return (
    <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid #e5e5e5" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={sectionLabelStyle}>Frames</span>
        <span style={{ fontSize: 11, color: "#6b6b6b" }}>{items.length}</span>
      </div>
      <ol style={{ listStyle: "none", padding: 0, margin: "0 0 10px", maxHeight: 280, overflowY: "auto" }}>
        {items.map((f, i) => (
          <li
            key={stableKey(f)}
            style={{
              display: "flex",
              gap: 4,
              alignItems: "center",
              padding: "3px 0",
              borderBottom: i < items.length - 1 ? "1px solid #f3f3f3" : "none",
            }}
          >
            <span style={{ fontSize: 11, color: "#6b6b6b", minWidth: 56 }}>
              {f.kind}{f.variant === "inverted" ? " ·inv" : ""}
            </span>
            {f.kind === "solid" ? (
              <input
                type="color"
                value={f.color}
                style={colorInputStyle}
                onChange={(e) => update(i, { ...f, color: e.target.value })}
              />
            ) : f.kind === "palette" ? (
              f.colors.map((c, ci) => (
                <input
                  key={ci}
                  type="color"
                  value={c}
                  style={colorInputStyle}
                  onChange={(e) => update(i, { ...f, colors: f.colors.map((x, xi) => (xi === ci ? e.target.value : x)) })}
                />
              ))
            ) : (
              // image frame: no color swatches in this panel (editor UI handled separately)
              null
            )}
            <div style={{ marginLeft: "auto", display: "flex", gap: 2 }}>
              <button style={iconBtnStyle} onClick={() => move(i, -1)}>↑</button>
              <button style={iconBtnStyle} onClick={() => move(i, 1)}>↓</button>
              <button style={iconBtnStyle} onClick={() => invert(i)}>◐</button>
              <button style={iconBtnStyle} onClick={() => remove(i)}>✕</button>
            </div>
          </li>
        ))}
      </ol>
      <div style={{ display: "flex", gap: 6 }}>
        <button style={addBtnStyle} onClick={addSolid}>+ Solid</button>
        <button style={addBtnStyle} onClick={addPalette}>+ Palette</button>
      </div>
    </div>
  );
};
