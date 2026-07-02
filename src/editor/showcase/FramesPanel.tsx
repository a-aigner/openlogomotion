"use client";
import { useRef, useState } from "react";
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

  // Drag-and-drop state: index of the row currently being dragged, and the row being hovered over.
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const items = config.frames;
  const update = (i: number, next: Frame) => setFrames(items.map((f, k) => (k === i ? next : f)));
  const remove = (i: number) => setFrames(items.filter((_, k) => k !== i));
  const invert = (i: number) =>
    update(i, { ...items[i], variant: items[i].variant === "inverted" ? "normal" : "inverted" });
  const addSolid = () => setFrames([...items, { kind: "solid", variant: "normal", color: "#2563EB" }]);
  const addPalette = () => setFrames([...items, { kind: "palette", variant: "normal", colors: ["#2563EB", "#111111"] }]);

  const addImage = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,.png,.jpg,.jpeg,.webp,.svg";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        setFrames([...items, { kind: "image", variant: "normal", src: reader.result as string, fit: "cover" }]);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const replaceImageSrc = (i: number, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const frame = items[i];
      if (frame.kind === "image") {
        update(i, { ...frame, src: reader.result as string });
      }
    };
    reader.readAsDataURL(file);
  };

  // HTML5 drag-and-drop reorder handlers. We splice-insert to preserve stable object
  // references so the WeakMap keys survive the reorder untouched.
  const onDragStart = (i: number, e: React.DragEvent) => {
    setDragIndex(i);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (i: number, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(i);
  };

  const onDrop = (i: number, e: React.DragEvent) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === i) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const a = items.slice();
    const [moved] = a.splice(dragIndex, 1);
    a.splice(i, 0, moved);
    setFrames(a);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const onDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

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

  const dragHandleStyle: React.CSSProperties = {
    cursor: "grab",
    color: "#6b6b6b",
    fontSize: 13,
    padding: "0 4px 0 0",
    userSelect: "none",
    flexShrink: 0,
  };

  return (
    <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid #e5e5e5" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={sectionLabelStyle}>Frames</span>
        <span style={{ fontSize: 11, color: "#6b6b6b" }}>{items.length}</span>
      </div>
      <ol style={{ listStyle: "none", padding: 0, margin: "0 0 10px" }}>
        {items.map((f, i) => (
          <li
            key={stableKey(f)}
            draggable
            onDragStart={(e) => onDragStart(i, e)}
            onDragOver={(e) => onDragOver(i, e)}
            onDrop={(e) => onDrop(i, e)}
            onDragEnd={onDragEnd}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              padding: "4px 0",
              borderBottom: i < items.length - 1 ? "1px solid #f3f3f3" : "none",
              opacity: dragIndex === i ? 0.4 : 1,
              background: dragOverIndex === i && dragIndex !== i ? "#f0f4ff" : "transparent",
              borderRadius: 4,
              transition: "background 0.1s",
            }}
          >
            {/* Row: handle + kind label + color swatches + action buttons */}
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <span style={dragHandleStyle} title="Drag to reorder">⠿</span>
              <span style={{ fontSize: 11, color: "#6b6b6b", minWidth: 52 }}>
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
              ) : null}
              <div style={{ marginLeft: "auto", display: "flex", gap: 2 }}>
                <button style={iconBtnStyle} onClick={() => invert(i)}>◐</button>
                <button style={iconBtnStyle} onClick={() => remove(i)}>✕</button>
              </div>
            </div>
            {/* Per-image controls: Replace + fit toggle */}
            {f.kind === "image" && (
              <div style={{ display: "flex", gap: 4, alignItems: "center", paddingLeft: 22 }}>
                <label style={{ ...iconBtnStyle, cursor: "pointer" }}>
                  Replace
                  <input
                    type="file"
                    accept="image/*,.png,.jpg,.jpeg,.webp,.svg"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) replaceImageSrc(i, file);
                    }}
                  />
                </label>
                <button
                  style={{ ...iconBtnStyle, minWidth: 52, textAlign: "center" }}
                  onClick={() => update(i, { ...f, fit: f.fit === "cover" ? "contain" : "cover" })}
                  title="Toggle cover/contain"
                >
                  {f.fit}
                </button>
              </div>
            )}
          </li>
        ))}
      </ol>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button style={addBtnStyle} onClick={addSolid}>+ Solid</button>
        <button style={addBtnStyle} onClick={addPalette}>+ Palette</button>
        <button style={addBtnStyle} onClick={addImage}>+ Image</button>
      </div>
    </div>
  );
};
