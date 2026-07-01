"use client";
import { FRAMES, getFrame } from "@/lib/frames";
import type { ShowcaseConfig } from "@/lib/showcase-config";

export const FramesPanel: React.FC<{
  config: ShowcaseConfig;
  setFrames: (f: ShowcaseConfig["frames"]) => void;
}> = ({ config, setFrames }) => {
  const items = config.frames;
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = items.slice();
    [next[i], next[j]] = [next[j], next[i]];
    setFrames(next);
  };
  const remove = (i: number) => setFrames(items.filter((_, k) => k !== i));
  const toggleInvert = (i: number) =>
    setFrames(items.map((it, k) => (k === i ? { ...it, variant: it.variant === "inverted" ? "normal" : "inverted" } : it)));
  const add = (id: string) => setFrames([...items, { id, variant: "normal" }]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong>Frames</strong><span>{items.length} Frames</span>
      </div>
      <ol style={{ listStyle: "none", padding: 0, maxHeight: 380, overflow: "auto" }}>
        {items.map((it, i) => (
          <li key={i} style={{ display: "flex", gap: 6, alignItems: "center", padding: "4px 0" }}>
            <span style={{ flex: 1 }}>{getFrame(it.id).title}{it.variant === "inverted" ? " (inverted)" : ""}</span>
            <button onClick={() => move(i, -1)} aria-label="up">↑</button>
            <button onClick={() => move(i, 1)} aria-label="down">↓</button>
            <button onClick={() => toggleInvert(i)} aria-label="invert">◐</button>
            <button onClick={() => remove(i)} aria-label="remove">✕</button>
          </li>
        ))}
      </ol>
      <details>
        <summary>+ Add Frame</summary>
        {FRAMES.map((f) => (
          <button key={f.id} onClick={() => add(f.id)} style={{ display: "block", width: "100%", textAlign: "left" }}>
            {f.title}
          </button>
        ))}
      </details>
    </div>
  );
};
