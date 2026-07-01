import type { ShowcaseConfig, Frame } from "@/lib/showcase-config";

export const FramesPanel: React.FC<{
  config: ShowcaseConfig;
  setFrames: (f: ShowcaseConfig["frames"]) => void;
}> = ({ config, setFrames }) => {
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

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <strong>Frames</strong><span>{items.length} frames</span>
      </div>
      <ol style={{ listStyle: "none", padding: 0, maxHeight: 340, overflow: "auto" }}>
        {items.map((f, i) => (
          <li key={i} style={{ display: "flex", gap: 6, alignItems: "center", padding: "4px 0" }}>
            <span style={{ width: 70 }}>{f.kind}{f.variant === "inverted" ? "·inv" : ""}</span>
            {f.kind === "solid" ? (
              <input type="color" value={f.color}
                onChange={(e) => update(i, { ...f, color: e.target.value })} />
            ) : (
              f.colors.map((c, ci) => (
                <input key={ci} type="color" value={c}
                  onChange={(e) => update(i, { ...f, colors: f.colors.map((x, xi) => (xi === ci ? e.target.value : x)) })} />
              ))
            )}
            <button onClick={() => move(i, -1)}>↑</button>
            <button onClick={() => move(i, 1)}>↓</button>
            <button onClick={() => invert(i)}>◐</button>
            <button onClick={() => remove(i)}>✕</button>
          </li>
        ))}
      </ol>
      <button onClick={addSolid}>+ Solid</button>
      <button onClick={addPalette}>+ Palette</button>
    </div>
  );
};
