# Showcase / Match-Cut Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Showcase" style to OpenLogomotion — a beat-driven, looping "logo match cut" montage that composites an uploaded logo (SVG/PNG/JPEG/WebP) onto a rapid sequence of bundled mockup frames and exports a vertical MP4 — selectable alongside the existing 3D "Pulse" style.

**Architecture:** Showcase is pure 2D Remotion (images + CSS transforms; no Three.js). A new `LogoShowcase` composition cuts through an ordered, looping list of mockup **frames** on a BPM-derived grid (reusing the existing beat data). Each frame composites the logo either centered (anchor) or onto a surface quad via a CSS `matrix3d` perspective transform (surface). It reuses the existing beat/track data, render API (now parameterized by composition id), format table, and editor shell; a top-level Pulse|Showcase switch chooses which editor+composition is active.

**Tech Stack:** Next.js 16 (App Router) · React 19 · Remotion 4.0.484 (`remotion`, `@remotion/player`, `@remotion/bundler`, `@remotion/renderer`) · TypeScript strict · Vitest. (No Three.js in the showcase path.)

## Global Constraints

- **Node** >= 20; **npm**. All Remotion packages pinned to **4.0.484** exactly.
- **React 19**, **Next.js 16**. **TypeScript strict**; `npx tsc --noEmit` must pass.
- **Determinism:** everything derives from `useCurrentFrame()` — no wall-clock, no `Math.random()`, no `Date`.
- **Single source of truth:** all showcase visuals derive from one `ShowcaseConfig` prop; preview `<Player>` and `renderMedia` pass identical props.
- **Do not break Pulse:** the existing `LogoPulse` composition, its editor, and all 27 existing tests must keep passing. Reuse — don't fork — `beat-engine`, `tracks`, `config` (`FORMATS`, `resolveDuration`, `Aspect`), `useConfig`'s `DeepPartial`.
- **Aspect/format table (reuse `src/lib/config.ts`):** 9:16 → 1080×1920, 1:1 → 1080×1080, 16:9 → 1920×1080; default fps 30.
- **New unit tests use the global `node` vitest environment** (already configured). Only add a `// @vitest-environment happy-dom` docblock to a test that needs DOM APIs (none in this plan should).
- **Bundled mockup frames are CC0 placeholders** (hand-authored SVGs) documented in `public/assets/frames/CREDITS.md`; production users swap in real mockups.
- Commit after every task with a `feat:`/`test:`/`chore:`/`docs:` prefixed message.

---

## File Structure

```
src/lib/
  showcase-config.ts     # ShowcaseConfig type + DEFAULT_SHOWCASE_CONFIG (reuses FORMATS/resolveDuration/Aspect)
  frames.ts              # Frame type + FRAMES manifest + getFrame()
  cut-sequencer.ts       # cutIndexAt() + pickFrame()  (pure)
  matrix3d.ts            # computeHomography()/applyH()/toMatrix3d()  (pure)
  logo-src.ts            # logoKind()/isSupportedLogo()/svgToDataUrl()  (pure)
src/remotion/
  Root.tsx               # MODIFY: register <Composition id="LogoShowcase">
  ShowcaseComposition.tsx# LogoShowcase composition (2D montage + audio)
  components/SceneFrame.tsx  # renders one mockup frame + placed logo
src/editor/
  App.tsx                # NEW top-level: Pulse|Showcase style switch
  Editor.tsx             # EXISTING Pulse editor (unchanged; imported by App as the Pulse view)
  showcase/
    ShowcaseEditor.tsx   # three-pane showcase editor
    useShowcaseConfig.ts # state hook (mirrors useConfig for ShowcaseConfig)
    FramesPanel.tsx      # frame list: add/remove/reorder/invert + count
    ShowcaseControls.tsx # cut-speed + track + format + Export
app/
  page.tsx               # MODIFY: render <App/> instead of <Editor/>
  api/render/route.ts    # MODIFY: renderToFile(config, out, id); POST reads {config, id}
public/assets/frames/    # bundled SVG mockups + CREDITS.md
tests/
  cut-sequencer.test.ts  matrix3d.test.ts  logo-src.test.ts  showcase-config.test.ts
  showcase-render.test.ts
```

---

## Task 1: Showcase config model + frames manifest + bundled mockup assets

**Goal:** The `ShowcaseConfig` data model, the `FRAMES` manifest, and a handful of bundled CC0 SVG mockup frames with placement metadata.

**Files:**
- Create: `src/lib/showcase-config.ts`, `src/lib/frames.ts`
- Create: `public/assets/frames/card.svg`, `panel.svg`, `billboard.svg`, `poster.svg`, `public/assets/frames/CREDITS.md`
- Test: `tests/showcase-config.test.ts`

**Interfaces:**
- Consumes: `Aspect`, `FORMATS`, `resolveDuration` from `src/lib/config.ts`.
- Produces:
  ```ts
  // frames.ts
  type Point = [number, number];                 // normalized 0..1 of the frame image
  type Frame = {
    id: string; title: string; src: string;      // public-relative SVG path
    type: "anchor" | "surface";
    anchor?: { xPct: number; yPct: number; sizePct: number };
    surface?: { quad: [Point, Point, Point, Point]; blend: "normal" | "multiply" | "screen" };
  };
  const FRAMES: Frame[];
  function getFrame(id: string): Frame;           // throws /unknown frame/i
  // showcase-config.ts
  type FrameVariant = "normal" | "inverted";
  type ShowcaseConfig = {
    logo: { src: string; kind: "svg" | "raster" };
    frames: { id: string; variant: FrameVariant }[];
    cutsPerBeat: number;
    logoStyle: { tint?: string; dropShadow: boolean; sizePct: number };
    audio: { trackId: string };
    format: { aspect: Aspect; width: number; height: number; fps: number; durationInFrames: number };
  };
  const DEFAULT_SHOWCASE_CONFIG: ShowcaseConfig;
  ```

- [ ] **Step 1: Author the bundled mockup SVGs**

Each is a full-frame 1080×1920 SVG whose visible "surface" region matches the `quad`/`anchor` in the manifest. Keep them simple placeholders.

`public/assets/frames/card.svg` (angled business card — surface):
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920"><rect width="1080" height="1920" fill="#d9d7d2"/><polygon points="270,760 810,700 860,1180 220,1120" fill="#f7f6f3" stroke="#c9c7c2" stroke-width="4"/></svg>
```
`public/assets/frames/panel.svg` (frontal glass panel — surface):
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920"><rect width="1080" height="1920" fill="#1a1d24"/><rect x="240" y="620" width="600" height="680" rx="18" fill="#2b3040"/></svg>
```
`public/assets/frames/billboard.svg` (angled billboard — surface):
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920"><rect width="1080" height="1920" fill="#8fb3d9"/><polygon points="180,520 900,640 900,1180 180,1060" fill="#20242c"/></svg>
```
`public/assets/frames/poster.svg` (centered poster — anchor):
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920"><rect width="1080" height="1920" fill="#efe9df"/><rect x="240" y="560" width="600" height="800" fill="#ffffff" stroke="#d8d2c6" stroke-width="6"/></svg>
```

- [ ] **Step 2: Write `frames.ts` with quads matching the SVGs**

`src/lib/frames.ts`:
```ts
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
```

- [ ] **Step 3: Write the failing test**

`tests/showcase-config.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { FRAMES, getFrame } from "../src/lib/frames";
import { DEFAULT_SHOWCASE_CONFIG } from "../src/lib/showcase-config";
import { FORMATS, resolveDuration } from "../src/lib/config";

describe("frames + showcase config", () => {
  it("every frame has a src and a placement matching its type", () => {
    for (const f of FRAMES) {
      expect(f.src).toMatch(/^assets\/frames\//);
      if (f.type === "surface") expect(f.surface?.quad).toHaveLength(4);
      if (f.type === "anchor") expect(f.anchor?.sizePct).toBeGreaterThan(0);
    }
  });
  it("getFrame throws on unknown id", () => {
    expect(() => getFrame("nope")).toThrow(/unknown frame/i);
  });
  it("default config references only known frames and is format-consistent", () => {
    for (const item of DEFAULT_SHOWCASE_CONFIG.frames) expect(() => getFrame(item.id)).not.toThrow();
    const fmt = DEFAULT_SHOWCASE_CONFIG.format;
    expect(fmt.width).toBe(FORMATS[fmt.aspect].width);
    expect(fmt.durationInFrames).toBe(resolveDuration(8, fmt.fps));
  });
  it("cutsPerBeat is a positive integer", () => {
    expect(DEFAULT_SHOWCASE_CONFIG.cutsPerBeat).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test -- showcase-config`
Expected: FAIL — `showcase-config` module not found.

- [ ] **Step 5: Implement `showcase-config.ts`**

`src/lib/showcase-config.ts`:
```ts
import type { Aspect } from "./config";
import { FORMATS, resolveDuration } from "./config";
import { FRAMES } from "./frames";

export type FrameVariant = "normal" | "inverted";

export type ShowcaseConfig = {
  logo: { src: string; kind: "svg" | "raster" };
  frames: { id: string; variant: FrameVariant }[];
  cutsPerBeat: number;
  logoStyle: { tint?: string; dropShadow: boolean; sizePct: number };
  audio: { trackId: string };
  format: { aspect: Aspect; width: number; height: number; fps: number; durationInFrames: number };
};

// Neutral placeholder logo so the composition renders before a user uploads one.
const PLACEHOLDER_LOGO =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="15" y="15" width="70" height="70" rx="10" fill="#111111"/></svg>'
  );

export const DEFAULT_SHOWCASE_CONFIG: ShowcaseConfig = {
  logo: { src: PLACEHOLDER_LOGO, kind: "svg" },
  frames: FRAMES.map((f) => ({ id: f.id, variant: "normal" as FrameVariant })),
  cutsPerBeat: 2,
  logoStyle: { dropShadow: true, sizePct: 1 },
  audio: { trackId: "pulse-120" },
  format: { aspect: "9:16", ...FORMATS["9:16"], fps: 30, durationInFrames: resolveDuration(8, 30) },
};
```

- [ ] **Step 6: Write CREDITS and run tests**

`public/assets/frames/CREDITS.md`:
```md
# Bundled mockup frames

These SVG mockups (`card.svg`, `panel.svg`, `billboard.svg`, `poster.svg`) are
CC0 / public-domain placeholders authored for OpenLogomotion. Replace them with
your own properly-licensed mockup artwork for production use. Each frame's
logo-placement geometry lives in `src/lib/frames.ts`.
```
Run: `npm test -- showcase-config`
Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add src/lib/frames.ts src/lib/showcase-config.ts public/assets/frames tests/showcase-config.test.ts
git commit -m "feat: add showcase config model, frames manifest, bundled mockups"
```

---

## Task 2: `cut-sequencer` — beat-driven looping cut index (pure, TDD)

**Goal:** Deterministic mapping from frame → which ordered frame is on screen, cutting on a BPM-derived grid and looping the frame list.

**Files:**
- Create: `src/lib/cut-sequencer.ts`
- Test: `tests/cut-sequencer.test.ts`

**Interfaces:**
- Produces:
  ```ts
  function cutIndexAt(frame: number, fps: number, bpm: number, cutsPerBeat: number): number; // # of cuts elapsed
  function pickFrame<T>(ordered: T[], cutIndex: number): T;                                   // ordered[cutIndex mod len]
  ```

- [ ] **Step 1: Write the failing tests**

`tests/cut-sequencer.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { cutIndexAt, pickFrame } from "../src/lib/cut-sequencer";

describe("cut-sequencer", () => {
  it("index 0 at frame 0", () => {
    expect(cutIndexAt(0, 30, 120, 2)).toBe(0);
  });
  it("120bpm x2 cuts/beat => 0.25s per cut => index 2 at 0.5s (frame 15 @30fps)", () => {
    expect(cutIndexAt(15, 30, 120, 2)).toBe(2);
  });
  it("advances one index per cut interval", () => {
    // secPerCut = 60/(120*1) = 0.5s => frame 15 => index 1
    expect(cutIndexAt(15, 30, 120, 1)).toBe(1);
    expect(cutIndexAt(14, 30, 120, 1)).toBe(0);
  });
  it("pickFrame loops the ordered list", () => {
    const arr = ["a", "b", "c"];
    expect(pickFrame(arr, 0)).toBe("a");
    expect(pickFrame(arr, 3)).toBe("a");
    expect(pickFrame(arr, 4)).toBe("b");
    expect(pickFrame(arr, 7)).toBe("b");
  });
  it("is deterministic", () => {
    expect(cutIndexAt(37, 30, 128, 3)).toBe(cutIndexAt(37, 30, 128, 3));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- cut-sequencer`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `cut-sequencer.ts`**

`src/lib/cut-sequencer.ts`:
```ts
// Cuts land on a BPM-derived grid subdivided by cutsPerBeat; the frame list loops.
export function cutIndexAt(frame: number, fps: number, bpm: number, cutsPerBeat: number): number {
  const safeBpm = bpm > 0 ? bpm : 120;
  const safeSub = cutsPerBeat >= 1 ? cutsPerBeat : 1;
  const secPerCut = 60 / (safeBpm * safeSub);
  const t = frame / fps;
  return Math.floor(t / secPerCut + 1e-9);
}

export function pickFrame<T>(ordered: T[], cutIndex: number): T {
  const n = ordered.length;
  return ordered[((cutIndex % n) + n) % n];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- cut-sequencer`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/cut-sequencer.ts tests/cut-sequencer.test.ts
git commit -m "feat: add beat-driven looping cut sequencer"
```

---

## Task 3: `matrix3d` — quad perspective homography (pure, TDD)

**Goal:** Compute a CSS `matrix3d` that maps a source rectangle to an arbitrary destination quad (perspective placement of the logo onto a surface).

**Files:**
- Create: `src/lib/matrix3d.ts`
- Test: `tests/matrix3d.test.ts`

**Interfaces:**
- Produces:
  ```ts
  type Pt = [number, number];
  function computeHomography(src: [Pt,Pt,Pt,Pt], dst: [Pt,Pt,Pt,Pt]): number[]; // 9, row-major
  function applyH(h: number[], p: Pt): Pt;                                        // maps a point (for tests)
  function toMatrix3d(h: number[]): string;                                       // CSS matrix3d(...)
  ```

- [ ] **Step 1: Write the failing tests**

`tests/matrix3d.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { computeHomography, applyH, toMatrix3d } from "../src/lib/matrix3d";

type Pt = [number, number];
const src: [Pt,Pt,Pt,Pt] = [[0,0],[1,0],[1,1],[0,1]];

describe("matrix3d homography", () => {
  it("maps each source corner onto the destination corner", () => {
    const dst: [Pt,Pt,Pt,Pt] = [[10,20],[110,10],[120,140],[5,130]];
    const h = computeHomography(src, dst);
    for (let i = 0; i < 4; i++) {
      const [x, y] = applyH(h, src[i]);
      expect(x).toBeCloseTo(dst[i][0], 4);
      expect(y).toBeCloseTo(dst[i][1], 4);
    }
  });
  it("identity mapping leaves points unchanged", () => {
    const h = computeHomography(src, src);
    const [x, y] = applyH(h, [0.5, 0.25]);
    expect(x).toBeCloseTo(0.5, 6);
    expect(y).toBeCloseTo(0.25, 6);
  });
  it("toMatrix3d emits a 16-value matrix3d string", () => {
    const h = computeHomography(src, [[0,0],[2,0],[2,2],[0,2]]);
    const s = toMatrix3d(h);
    expect(s.startsWith("matrix3d(")).toBe(true);
    expect(s.replace(/matrix3d\(|\)/g, "").split(",")).toHaveLength(16);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- matrix3d`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `matrix3d.ts`**

`src/lib/matrix3d.ts`:
```ts
type Pt = [number, number];
type M = number[]; // 3x3 row-major

function adj(m: M): M {
  return [
    m[4]*m[8]-m[5]*m[7], m[2]*m[7]-m[1]*m[8], m[1]*m[5]-m[2]*m[4],
    m[5]*m[6]-m[3]*m[8], m[0]*m[8]-m[2]*m[6], m[2]*m[3]-m[0]*m[5],
    m[3]*m[7]-m[4]*m[6], m[1]*m[6]-m[0]*m[7], m[0]*m[4]-m[1]*m[3],
  ];
}
function multmm(a: M, b: M): M {
  const r: M = new Array(9).fill(0);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) {
      let s = 0;
      for (let k = 0; k < 3; k++) s += a[3 * i + k] * b[3 * k + j];
      r[3 * i + j] = s;
    }
  return r;
}
function multmv(m: M, v: number[]): number[] {
  return [
    m[0]*v[0]+m[1]*v[1]+m[2]*v[2],
    m[3]*v[0]+m[4]*v[1]+m[5]*v[2],
    m[6]*v[0]+m[7]*v[1]+m[8]*v[2],
  ];
}
function basisToPoints(p: [Pt,Pt,Pt,Pt]): M {
  const m: M = [p[0][0], p[1][0], p[2][0], p[0][1], p[1][1], p[2][1], 1, 1, 1];
  const v = multmv(adj(m), [p[3][0], p[3][1], 1]);
  return multmm(m, [v[0],0,0, 0,v[1],0, 0,0,v[2]]);
}

export function computeHomography(src: [Pt,Pt,Pt,Pt], dst: [Pt,Pt,Pt,Pt]): M {
  return multmm(basisToPoints(dst), adj(basisToPoints(src)));
}

export function applyH(h: M, p: Pt): Pt {
  const v = multmv(h, [p[0], p[1], 1]);
  return [v[0] / v[2], v[1] / v[2]];
}

export function toMatrix3d(h: M): string {
  const g = h.map((x) => x / h[8]); // normalize
  const t = [
    g[0], g[3], 0, g[6],
    g[1], g[4], 0, g[7],
    0,    0,    1, 0,
    g[2], g[5], 0, g[8],
  ];
  return `matrix3d(${t.join(",")})`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- matrix3d`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/matrix3d.ts tests/matrix3d.test.ts
git commit -m "feat: add quad perspective homography (CSS matrix3d)"
```

---

## Task 4: `logo-src` — logo input helpers (pure, TDD)

**Goal:** Pure helpers to classify an uploaded logo file and turn an SVG string into a data URL. (File reading itself happens in the editor; these are the testable pure pieces.)

**Files:**
- Create: `src/lib/logo-src.ts`
- Test: `tests/logo-src.test.ts`

**Interfaces:**
- Produces:
  ```ts
  function isSupportedLogo(mime: string, name: string): boolean;   // svg/png/jpeg/webp
  function logoKind(mime: string, name: string): "svg" | "raster";
  function svgToDataUrl(svg: string): string;                      // data:image/svg+xml;utf8,...
  ```

- [ ] **Step 1: Write the failing tests**

`tests/logo-src.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { isSupportedLogo, logoKind, svgToDataUrl } from "../src/lib/logo-src";

describe("logo-src", () => {
  it("accepts svg/png/jpeg/webp, rejects others", () => {
    expect(isSupportedLogo("image/svg+xml", "a.svg")).toBe(true);
    expect(isSupportedLogo("image/png", "a.png")).toBe(true);
    expect(isSupportedLogo("image/webp", "a.webp")).toBe(true);
    expect(isSupportedLogo("", "a.jpeg")).toBe(true);        // fall back to extension
    expect(isSupportedLogo("application/pdf", "a.pdf")).toBe(false);
  });
  it("classifies svg vs raster", () => {
    expect(logoKind("image/svg+xml", "a.svg")).toBe("svg");
    expect(logoKind("", "a.SVG")).toBe("svg");               // case-insensitive
    expect(logoKind("image/png", "a.png")).toBe("raster");
  });
  it("svgToDataUrl produces a decodable data URL containing the markup", () => {
    const url = svgToDataUrl('<svg><rect fill="#f00"/></svg>');
    expect(url.startsWith("data:image/svg+xml;utf8,")).toBe(true);
    expect(decodeURIComponent(url)).toContain("<rect");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- logo-src`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `logo-src.ts`**

`src/lib/logo-src.ts`:
```ts
const RASTER_EXT = ["png", "jpg", "jpeg", "webp"];

function ext(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

export function logoKind(mime: string, name: string): "svg" | "raster" {
  if (mime === "image/svg+xml" || ext(name) === "svg") return "svg";
  return "raster";
}

export function isSupportedLogo(mime: string, name: string): boolean {
  const e = ext(name);
  if (mime === "image/svg+xml" || e === "svg") return true;
  if (mime.startsWith("image/") && mime !== "image/svg+xml") return true;
  return RASTER_EXT.includes(e);
}

export function svgToDataUrl(svg: string): string {
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- logo-src`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/logo-src.ts tests/logo-src.test.ts
git commit -m "feat: add logo-src classification and svg data-url helpers"
```

---

## Task 5: `SceneFrame` + `LogoShowcase` composition (2D) + Root registration

**Goal:** Render one mockup frame with the logo placed (anchor or surface), assemble the beat-driven looping montage as the `LogoShowcase` Remotion composition, register it, and smoke-render it.

**Files:**
- Create: `src/remotion/components/SceneFrame.tsx`, `src/remotion/ShowcaseComposition.tsx`
- Modify: `src/remotion/Root.tsx`
- (No unit test; verified by a smoke render. The pure math is already tested in Tasks 2–3.)

**Interfaces:**
- Consumes: `getFrame` (frames.ts), `cutIndexAt`/`pickFrame` (cut-sequencer), `computeHomography`/`toMatrix3d` (matrix3d), `ShowcaseConfig`/`DEFAULT_SHOWCASE_CONFIG` (showcase-config), `getTrack` (tracks), the beatmap JSON, and Remotion `Img`/`Audio`/`staticFile`.
- Produces: `SceneFrame` component `{ frame, variant, logo, logoStyle, width, height }`; `ShowcaseComposition` component `{ config: ShowcaseConfig }` (composition id `"LogoShowcase"`).

- [ ] **Step 1: Implement `SceneFrame.tsx`**

`src/remotion/components/SceneFrame.tsx`:
```tsx
import { AbsoluteFill, Img, staticFile } from "remotion";
import type { Frame } from "@/lib/frames";
import type { ShowcaseConfig, FrameVariant } from "@/lib/showcase-config";
import { computeHomography, toMatrix3d } from "@/lib/matrix3d";

type Pt = [number, number];

export const SceneFrame: React.FC<{
  frame: Frame;
  variant: FrameVariant;
  logo: ShowcaseConfig["logo"];
  logoStyle: ShowcaseConfig["logoStyle"];
  width: number;
  height: number;
}> = ({ frame, variant, logo, logoStyle, width, height }) => {
  const inverted = variant === "inverted";
  const shadow = logoStyle.dropShadow ? "drop-shadow(0 6px 14px rgba(0,0,0,0.35))" : "none";
  // Inverted flips the logo light/dark to contrast the surface.
  const logoFilter = `${inverted ? "invert(1) " : ""}${shadow}`.trim();

  const logoImg = (style: React.CSSProperties) => (
    <Img src={logo.src} style={{ ...style, filter: logoFilter, objectFit: "contain" }} />
  );

  let placed: React.ReactNode = null;
  if (frame.type === "surface" && frame.surface) {
    // Map a width×height source rect onto the quad (quad is normalized → pixels).
    const src: [Pt, Pt, Pt, Pt] = [[0, 0], [width, 0], [width, height], [0, height]];
    const dst = frame.surface.quad.map((p) => [p[0] * width, p[1] * height]) as [Pt, Pt, Pt, Pt];
    const m3d = toMatrix3d(computeHomography(src, dst));
    placed = (
      <div style={{ position: "absolute", top: 0, left: 0, width, height,
        transformOrigin: "0 0", transform: m3d, mixBlendMode: frame.surface.blend }}>
        {logoImg({ position: "absolute", inset: "12%" })}
      </div>
    );
  } else if (frame.anchor) {
    const size = Math.min(width, height) * frame.anchor.sizePct * logoStyle.sizePct;
    placed = logoImg({
      position: "absolute",
      left: frame.anchor.xPct * width - size / 2,
      top: frame.anchor.yPct * height - size / 2,
      width: size, height: size,
    });
  }

  return (
    <AbsoluteFill>
      <Img src={staticFile(frame.src)} style={{ width, height, objectFit: "cover" }} />
      {placed}
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Implement `ShowcaseComposition.tsx`**

`src/remotion/ShowcaseComposition.tsx`:
```tsx
import { AbsoluteFill, useCurrentFrame, useVideoConfig, Audio, staticFile } from "remotion";
import { getFrame } from "@/lib/frames";
import { cutIndexAt, pickFrame } from "@/lib/cut-sequencer";
import { getTrack } from "@/lib/tracks";
import type { ShowcaseConfig } from "@/lib/showcase-config";
import type { Beatmap } from "@/lib/beat-engine";
import { SceneFrame } from "./components/SceneFrame";
import pulse120 from "../../public/assets/beatmaps/pulse-120.json";

const BEATMAPS: Record<string, Beatmap> = { "pulse-120": pulse120 satisfies Beatmap };

export const ShowcaseComposition: React.FC<{ config: ShowcaseConfig }> = ({ config }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const track = getTrack(config.audio.trackId);
  const beatmap = BEATMAPS[track.id];
  if (!beatmap) throw new Error(`No beatmap registered for track "${track.id}"`);

  const ordered = config.frames.length > 0 ? config.frames : []; // empty guarded below
  const list = ordered.length > 0 ? ordered : [{ id: getFrame("card").id, variant: "normal" as const }];
  const idx = cutIndexAt(frame, fps, beatmap.bpm, config.cutsPerBeat);
  const current = pickFrame(list, idx);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <SceneFrame
        frame={getFrame(current.id)}
        variant={current.variant}
        logo={config.logo}
        logoStyle={config.logoStyle}
        width={width}
        height={height}
      />
      <Audio src={staticFile(track.src)} />
    </AbsoluteFill>
  );
};
```

- [ ] **Step 3: Register `LogoShowcase` in `Root.tsx`**

Modify `src/remotion/Root.tsx` — add the second composition alongside `LogoPulse`:
```tsx
import { Composition } from "remotion";
import { LogoComposition } from "./LogoComposition";
import { ShowcaseComposition } from "./ShowcaseComposition";
import { DEFAULT_CONFIG } from "@/lib/config";
import type { LogoAnimConfig } from "@/lib/config";
import { DEFAULT_SHOWCASE_CONFIG, type ShowcaseConfig } from "@/lib/showcase-config";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="LogoPulse"
      component={LogoComposition}
      durationInFrames={DEFAULT_CONFIG.format.durationInFrames}
      fps={DEFAULT_CONFIG.format.fps}
      width={DEFAULT_CONFIG.format.width}
      height={DEFAULT_CONFIG.format.height}
      defaultProps={{ config: DEFAULT_CONFIG }}
      calculateMetadata={({ props }: { props: { config: LogoAnimConfig } }) => ({
        durationInFrames: props.config.format.durationInFrames,
        fps: props.config.format.fps,
        width: props.config.format.width,
        height: props.config.format.height,
      })}
    />
    <Composition
      id="LogoShowcase"
      component={ShowcaseComposition}
      durationInFrames={DEFAULT_SHOWCASE_CONFIG.format.durationInFrames}
      fps={DEFAULT_SHOWCASE_CONFIG.format.fps}
      width={DEFAULT_SHOWCASE_CONFIG.format.width}
      height={DEFAULT_SHOWCASE_CONFIG.format.height}
      defaultProps={{ config: DEFAULT_SHOWCASE_CONFIG }}
      calculateMetadata={({ props }: { props: { config: ShowcaseConfig } }) => ({
        durationInFrames: props.config.format.durationInFrames,
        fps: props.config.format.fps,
        width: props.config.format.width,
        height: props.config.format.height,
      })}
    />
  </>
);
```

- [ ] **Step 4: Verify types + smoke render**

Run: `npx tsc --noEmit`
Expected: clean.
Run: `npx remotion render src/remotion/index.ts LogoShowcase out/showcase-smoke.mp4 --frames=0-20`
Expected: succeeds; `out/showcase-smoke.mp4` exists. The montage cuts through mockups (default placeholder logo) with audio. Confirm audio: `ffprobe -v error -select_streams a -show_entries stream=codec_name out/showcase-smoke.mp4` shows `aac`.

- [ ] **Step 5: Commit**

```bash
git add src/remotion/components/SceneFrame.tsx src/remotion/ShowcaseComposition.tsx src/remotion/Root.tsx
git commit -m "feat: add LogoShowcase 2D match-cut composition and register it"
```

---

## Task 6: Parameterize the render API by composition id

**Goal:** Let `/api/render` render either composition. Add a render-api test that produces a short `LogoShowcase` MP4.

**Files:**
- Modify: `app/api/render/route.ts`
- Test: `tests/showcase-render.test.ts`

**Interfaces:**
- Consumes: `DEFAULT_SHOWCASE_CONFIG`.
- Produces: `renderToFile(config, outPath, compositionId?: string)` (default `"LogoPulse"`); `POST` reads `{ config, id? }`.

- [ ] **Step 1: Modify `renderToFile` + `POST` to accept a composition id**

In `app/api/render/route.ts`, change the helper signature and the `selectComposition` id, and read `id` from the POST body. Replace the `renderToFile` function and the destructuring line in `POST`:
```ts
export async function renderToFile(
  config: unknown,
  outPath: string,
  compositionId: string = "LogoPulse",
): Promise<void> {
  const serveUrl = await getBundle();
  const inputProps = { config };
  const composition = await selectComposition({ serveUrl, id: compositionId, inputProps });
  await renderMedia({
    serveUrl,
    composition,
    codec: "h264",
    outputLocation: outPath,
    inputProps,
    chromiumOptions: { gl: "angle" },
  });
}
```
And in `POST`, replace the body parse + render call:
```ts
    const { config, id } = (await req.json()) as { config: unknown; id?: string };
    dir = await mkdtemp(join(tmpdir(), "logomotion-"));
    const out = join(dir, "logo.mp4");
    await renderToFile(config, out, id ?? "LogoPulse");
```
(Leave the `LogoAnimConfig` import if still referenced elsewhere; if it becomes unused, remove that import to keep tsc clean.)

- [ ] **Step 2: Write the failing test**

`tests/showcase-render.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtempSync } from "node:fs";
import { renderToFile } from "../app/api/render/route";
import { DEFAULT_SHOWCASE_CONFIG } from "../src/lib/showcase-config";

describe("renderToFile (LogoShowcase)", () => {
  it("renders a short showcase MP4 from a config", async () => {
    const cfg = {
      ...DEFAULT_SHOWCASE_CONFIG,
      format: { ...DEFAULT_SHOWCASE_CONFIG.format, width: 256, height: 456, durationInFrames: 20 },
    };
    const dir = mkdtempSync(join(tmpdir(), "showcase-test-"));
    const out = join(dir, "showcase.mp4");
    await renderToFile(cfg, out, "LogoShowcase");
    expect(statSync(out).size).toBeGreaterThan(1000);
  }, 180_000);
});
```

- [ ] **Step 3: Run test — fails then passes**

Run: `npm test -- showcase-render`
Expected before Step 1 lands: FAIL. After Step 1: PASS (one test; ~30–120s cold, faster warm). Also confirm the existing `render-api` (Pulse) test still passes: `npm test -- render-api`.

- [ ] **Step 4: Commit**

```bash
git add app/api/render/route.ts tests/showcase-render.test.ts
git commit -m "feat: parameterize render API by composition id (Pulse | Showcase)"
```

---

## Task 7: Showcase editor + top-level style switch

**Goal:** The three-pane showcase editor (logo upload · live preview · frames list with add/remove/reorder/invert + cut-speed + track + format + Export), plus a top-level Pulse|Showcase switch. The existing Pulse `Editor` is reused unchanged as the Pulse view.

**Files:**
- Create: `src/editor/App.tsx`, `src/editor/showcase/useShowcaseConfig.ts`, `src/editor/showcase/ShowcaseEditor.tsx`, `src/editor/showcase/FramesPanel.tsx`, `src/editor/showcase/ShowcaseControls.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `ShowcaseComposition`, `DEFAULT_SHOWCASE_CONFIG`, `FRAMES`/`getFrame`, `TRACKS`, `FORMATS`/`resolveDuration`, `isSupportedLogo`/`logoKind`/`svgToDataUrl`, `parseSvg` (SVG warnings), the existing `Editor` (Pulse), `@remotion/player` `<Player>`.
- Produces: default-exported `App` (client) with a style switch; `useShowcaseConfig()` → `[config, patch]`.

- [ ] **Step 1: Config hook**

`src/editor/showcase/useShowcaseConfig.ts`:
```ts
"use client";
import { useState, useCallback } from "react";
import { DEFAULT_SHOWCASE_CONFIG, type ShowcaseConfig } from "@/lib/showcase-config";

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

function merge<T>(base: T, patch: DeepPartial<T>): T {
  const out: any = Array.isArray(base) ? [...(base as any)] : { ...base };
  for (const k in patch) {
    const v: any = (patch as any)[k];
    out[k] = v && typeof v === "object" && !Array.isArray(v) ? merge((base as any)[k], v) : v;
  }
  return out;
}

export function useShowcaseConfig() {
  const [config, setConfig] = useState<ShowcaseConfig>(DEFAULT_SHOWCASE_CONFIG);
  const patch = useCallback((p: DeepPartial<ShowcaseConfig>) => setConfig((c) => merge(c, p)), []);
  const setFrames = useCallback(
    (frames: ShowcaseConfig["frames"]) => setConfig((c) => ({ ...c, frames })),
    [],
  );
  return { config, patch, setFrames } as const;
}
```

- [ ] **Step 2: Frames panel (add/remove/reorder/invert)**

`src/editor/showcase/FramesPanel.tsx`:
```tsx
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
```

- [ ] **Step 3: Controls (cut-speed, track, format, export)**

`src/editor/showcase/ShowcaseControls.tsx`:
```tsx
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
      if (!res.ok) throw new Error((await res.json()).error ?? "Render failed");
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a"); a.href = url; a.download = "showcase.mp4"; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { alert((e as Error).message); }
    finally { setRendering(false); }
  };
  return (
    <div>
      <label>Cut speed (cuts/beat): {config.cutsPerBeat}
        <input type="range" min={1} max={4} step={1} value={config.cutsPerBeat}
          onChange={(e) => patch({ cutsPerBeat: Number(e.target.value) })} />
      </label>
      <fieldset><legend>Music</legend>
        {TRACKS.map((t) => (
          <label key={t.id} style={{ display: "block" }}>
            <input type="radio" name="sc-track" checked={config.audio.trackId === t.id}
              onChange={() => patch({ audio: { trackId: t.id } })} />{t.title}
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
        <input type="range" min={4} max={12} step={1}
          value={Math.round(config.format.durationInFrames / config.format.fps)}
          onChange={(e) => patch({ format: { durationInFrames: resolveDuration(Number(e.target.value), config.format.fps) } })} />
      </label>
      <button onClick={onExport} disabled={rendering}>{rendering ? "Rendering…" : "Download Video"}</button>
    </div>
  );
};
```

- [ ] **Step 4: Showcase editor (three-pane)**

`src/editor/showcase/ShowcaseEditor.tsx`:
```tsx
"use client";
import { Player } from "@remotion/player";
import { useState } from "react";
import { ShowcaseComposition } from "@/remotion/ShowcaseComposition";
import { isSupportedLogo, logoKind, svgToDataUrl } from "@/lib/logo-src";
import { parseSvg } from "@/lib/logo-ingest";
import { useShowcaseConfig } from "./useShowcaseConfig";
import { FramesPanel } from "./FramesPanel";
import { ShowcaseControls } from "./ShowcaseControls";

export default function ShowcaseEditor() {
  const { config, patch, setFrames } = useShowcaseConfig();
  const [warn, setWarn] = useState<string[]>([]);

  const onUpload = async (file: File) => {
    if (!isSupportedLogo(file.type, file.name)) { setWarn(["Unsupported file. Use SVG, PNG, JPEG, or WebP."]); return; }
    const kind = logoKind(file.type, file.name);
    try {
      if (kind === "svg") {
        const svg = await file.text();
        setWarn(parseSvg(svg).warnings);           // validate; surface warnings (non-fatal)
        patch({ logo: { src: svgToDataUrl(svg), kind } });
      } else {
        const src = await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result as string);
          r.onerror = () => reject(r.error);
          r.readAsDataURL(file);
        });
        setWarn([]);
        patch({ logo: { src, kind } });
      }
    } catch (e) { setWarn([(e as Error).message]); }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr 320px", gap: 16, padding: 16 }}>
      <div>
        <input type="file" accept=".svg,.png,.jpg,.jpeg,.webp,image/*"
          onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
        {warn.map((w, i) => <p key={i} style={{ color: "#c60" }}>⚠ {w}</p>)}
      </div>
      <div>
        <Player
          component={ShowcaseComposition}
          inputProps={{ config }}
          durationInFrames={config.format.durationInFrames}
          fps={config.format.fps}
          compositionWidth={config.format.width}
          compositionHeight={config.format.height}
          style={{ width: "100%", maxWidth: 360, aspectRatio: `${config.format.width}/${config.format.height}` }}
          controls loop
        />
      </div>
      <div>
        <FramesPanel config={config} setFrames={setFrames} />
        <ShowcaseControls config={config} patch={patch} />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Top-level style switch**

`src/editor/App.tsx`:
```tsx
"use client";
import { useState } from "react";
import Editor from "./Editor";                      // existing Pulse editor
import ShowcaseEditor from "./showcase/ShowcaseEditor";

export default function App() {
  const [style, setStyle] = useState<"pulse" | "showcase">("showcase");
  return (
    <div>
      <nav style={{ display: "flex", gap: 8, padding: 12, borderBottom: "1px solid #ddd" }}>
        <strong style={{ marginRight: 12 }}>OpenLogomotion</strong>
        <button onClick={() => setStyle("showcase")} disabled={style === "showcase"}>Showcase</button>
        <button onClick={() => setStyle("pulse")} disabled={style === "pulse"}>Pulse (3D)</button>
      </nav>
      {style === "showcase" ? <ShowcaseEditor /> : <Editor />}
    </div>
  );
}
```

`app/page.tsx`:
```tsx
import App from "@/editor/App";
export default function Home() { return <App />; }
```

- [ ] **Step 6: Verify types, build, tests**

Run: `npx tsc --noEmit` → clean.
Run: `npm run build` → succeeds (catches client/server boundary + import errors).
Run: `npm test` → all suites pass (Pulse's 27 + the new showcase unit + render tests).

- [ ] **Step 7: Commit**

```bash
git add src/editor/App.tsx src/editor/showcase app/page.tsx
git commit -m "feat: showcase editor (frames list, upload, preview, export) + style switch"
```

---

## Task 8: Docs + full verification

**Goal:** Update the README for the two styles and run the full verification pass.

**Files:**
- Modify: `README.md`

**Interfaces:** none new.

- [ ] **Step 1: Update `README.md`**

Add a "Styles" section documenting BOTH styles: **Pulse** (3D beatsync, existing) and **Showcase** (beat-driven looping match-cut montage: upload logo → cuts through bundled mockup frames on the beat → Download Video; frames list add/remove/reorder/invert; cut speed). Note the bundled mockup SVGs are CC0 placeholders (see `public/assets/frames/CREDITS.md`) to swap for real mockups, and that logo input accepts SVG/PNG/JPEG/WebP. Keep the "fully local" claim accurate (showcase uses only bundled assets — no network). Move nothing false; describe only what's implemented.

- [ ] **Step 2: Full verification**

Run: `npm test`
Expected: ALL suites green (Pulse + showcase: `cut-sequencer`, `matrix3d`, `logo-src`, `showcase-config`, `showcase-render`, plus the existing 27).
Run: `npm run build`
Expected: Next build succeeds, no type errors.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: document Showcase (match-cut) and Pulse styles"
```

---

## Self-Review Notes (spec coverage)

- **Spec §3 Architecture (2D Remotion, style switch, reuse render API)** → Tasks 5, 6, 7. ✅
- **§4 Components** → logo-src (T4), frames (T1), cut-sequencer (T2), matrix3d (T3), SceneFrame + LogoShowcase (T5), showcase editor (T7). ✅
- **§5 Data model `ShowcaseConfig`** → Task 1. ✅
- **§6 Frame metadata (anchor/surface/quad/blend)** → Task 1 (frames.ts) + Task 5 (SceneFrame placement). ✅
- **§7 Beat-driven looping cuts** → Task 2 (`cutIndexAt`/`pickFrame`) + Task 5 (composition uses them). ✅
- **§8 Editor UX (three-pane, upload/preview/frames list + add/reorder/invert/cut-speed/export)** → Task 7. ✅
- **§9 Render/export (id-parameterized)** → Task 6. ✅
- **§10 Error handling (unsupported file, empty frame list fallback, missing beatmap, export errors)** → T7 (upload guard), T5 (empty-list fallback + missing-beatmap throw), ShowcaseControls (export error alert). ✅
- **§11 Testing** → cut-sequencer/matrix3d/logo-src/showcase-config unit tests (T1–T4), smoke render (T5), render-api showcase test (T6). ✅
- **§12 Out of scope** → no AI mockups, no custom-frame upload, no in-UI placement editing (not built). ✅
- **§13 Repo additions** → matches File Structure. ✅
- **§14 Milestones** → Tasks 1→8 follow milestone order. ✅

Type consistency: `ShowcaseConfig`, `Frame`, `cutIndexAt`/`pickFrame`, `computeHomography`/`toMatrix3d`, `logoKind`/`isSupportedLogo`/`svgToDataUrl`, `renderToFile(config,out,id)` are used consistently across tasks. `DeepPartial` is defined in `useShowcaseConfig.ts` (parallel to the Pulse `useConfig`). No unresolved placeholders.
```
