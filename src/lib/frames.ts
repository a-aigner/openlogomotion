export type Point = [number, number];

export type Frame = {
  id: string;
  title: string;
  src: string;
  type: "anchor" | "surface";
  anchor?: { xPct: number; yPct: number; sizePct: number };
  surface?: { quad: [Point, Point, Point, Point]; blend: "normal" | "multiply" | "screen" };
};

// Quads are normalized 0..1 of the 1080x1920 frame; corners are TL, TR, BR, BL.
export const FRAMES: Frame[] = [
  { id: "card", title: "Card", src: "assets/frames/card.svg", type: "surface",
    surface: { quad: [[0.25,0.396],[0.75,0.365],[0.796,0.615],[0.204,0.583]], blend: "multiply" } },
  { id: "panel", title: "Glass panel", src: "assets/frames/panel.svg", type: "surface",
    surface: { quad: [[0.222,0.323],[0.778,0.323],[0.778,0.677],[0.222,0.677]], blend: "screen" } },
  { id: "billboard", title: "Billboard", src: "assets/frames/billboard.svg", type: "surface",
    surface: { quad: [[0.167,0.271],[0.833,0.333],[0.833,0.615],[0.167,0.552]], blend: "normal" } },
  { id: "poster", title: "Poster", src: "assets/frames/poster.svg", type: "anchor",
    anchor: { xPct: 0.5, yPct: 0.5, sizePct: 0.42 } },
];

export function getFrame(id: string): Frame {
  const f = FRAMES.find((x) => x.id === id);
  if (!f) throw new Error(`Unknown frame: ${id}`);
  return f;
}
