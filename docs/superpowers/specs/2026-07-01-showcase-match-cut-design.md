# OpenLogomotion — Showcase / Match-Cut engine (Design Spec)

**Date:** 2026-07-01
**Status:** Approved design, pending implementation plan
**Scope:** v1 of the **Showcase** style (`?style=showcase` on logomotion.design) — a
beat-driven "logo match cut" montage: the uploaded logo composited onto a rapid,
looping sequence of real-world mockup **frames**, exported as a vertical MP4.

This is a **second style** alongside the already-built **Pulse** (3D beatsync)
engine, selectable via a top-level style switch (mirroring the real site's
`?style=` switch). Pulse is kept intact.

---

## 1. Background & Reference

logomotion.design's `showcase` style produces a "viral logo match cut video":
the logo appears on a fast-cut montage of mockups (business card, product,
signage, etc.). From a screenshot of the real editor (`/create?style=showcase`)
the model is confirmed:

- Left: **logo drop zone** — "PNG, SVG, JPEG, WebP".
- Center: **9:16 preview** (~10s) with a play/scrub transport.
- Right: a **Frames list** — e.g. "28 Frames", **"+ Add Frame"**, each frame a
  named mockup (Card, Card (inverted), Rock, Glass panel, Logo …) with a
  thumbnail and reorder/remove; each has a light/**"inverted"** variant. A
  **"Download Video"** export button.
- The logo is composited **onto each frame's surface** (the preview shows it on
  an angled business card) — surface placement with perspective.

**Core mechanic (confirmed by the user):** cuts are **beat-driven**. The ordered
frame list **loops**, and the montage advances one frame per beat-derived cut
boundary — very fast cuts synced to the music. The frame list repeats as many
times as the track length requires.

### Fidelity caveat
The real editor is a JS SPA that could not be programmatically rendered; this is
a faithful open-source take on the format, not a pixel copy. Bundled mockups
will be CC0 placeholders (documented in a CREDITS file) that can be swapped.

---

## 2. Confirmed Decisions

| Decision | Choice |
|---|---|
| Style | Showcase / Match-Cut, added alongside Pulse (top-level style switch) |
| Cut mechanic | **Hybrid** placement (anchor + surface), **beat-driven cuts**, **looping** frame list |
| Frame source | **Bundled CC0 mockup images** + per-frame placement metadata |
| Logo input | **SVG, PNG, JPEG, WebP** (2D compositing — raster + vector) |
| Rendering | Plain **Remotion 2D** (images + CSS transforms) — no R3F |
| Beat source | Reuse bundled track + beatmap (beat-engine); cuts on beat subdivisions |
| Export | Reuse `/api/render`, parameterized by composition id (`LogoShowcase`) |

---

## 3. Architecture

Showcase is a **2D** composition, so it uses plain Remotion (no Three.js). It
reuses the beat-engine, bundled tracks/beatmaps, render API, format table,
`useConfig`, and the editor shell.

```
Editor (Showcase mode) ──ShowcaseConfig──> <Player component={LogoShowcase}>
        │                                        ▲ same composition
        │ POST /api/render {id:"LogoShowcase"}   │
        ▼                                        │
   Render API (id-parameterized) ────────────────┘ ──> MP4
```

**Style switch:** a top-level toggle **Pulse | Showcase** selects which editor +
composition is active. Each style keeps its own config object.

---

## 4. Components (new)

| Component | Responsibility | Purity |
|---|---|---|
| `logo-src` | Uploaded SVG/PNG/JPEG/WebP → a `{ src: dataURL, kind }`; validate (reuse `parseSvg` warnings for SVG; raster passes through); reject non-images | pure-ish (reads File in editor) |
| `frames` | Manifest of bundled mockup frames + placement metadata + inverted variants | pure data |
| `cut-sequencer` | `(frame, fps, beatmap, cutsPerBeat, frameCount) → cutIndex`; frame shown = `orderedFrames[cutIndex % orderedFrames.length]` | pure |
| `matrix3d` | Compute a CSS `matrix3d` mapping the unit rect → a frame's surface quad (perspective homography) | pure |
| `SceneFrame` | Render one frame: full-bleed mockup image + logo placed per `type` (anchor = centered overlay; surface = `matrix3d` quad) | component |
| `LogoShowcase` | Remotion composition: at each frame pick the current mockup via `cut-sequencer`, render `SceneFrame`, add `<Audio>` | composition |
| `showcase editor` | Three-pane UI (logo drop / preview / frames list) driving `ShowcaseConfig` | component |

**Reused as-is:** `beat-engine`, `tracks`, `config` FORMATS/`resolveDuration`,
`useConfig` deep-merge, the Remotion `<Player>` + render pipeline.

**Changed:** `/api/render` route accepts a composition `id` in the POST body
(default `"LogoPulse"`), so it can render `"LogoShowcase"`. `Root.tsx` registers
the new composition. The editor gains a style switch.

---

## 5. Data model

```ts
type FrameVariant = "normal" | "inverted";

type ShowcaseConfig = {
  logo: { src: string; kind: "svg" | "raster" };   // data URL
  frames: { id: string; variant: FrameVariant }[]; // ordered, may repeat ids
  cutsPerBeat: number;                              // cut subdivision (default 2 → fast)
  logoStyle: { tint?: string; dropShadow: boolean; sizePct: number };
  audio: { trackId: string };
  format: { aspect: Aspect; width: number; height: number; fps: number; durationInFrames: number };
};
```

`frames` defaults to the full bundled library in a curated order (mirrors the
real editor auto-populating ~N frames). Users add/remove/reorder and toggle a
frame's `inverted` variant.

## 6. Frame metadata

```ts
type Point = [number, number];   // normalized 0..1 of frame image

type Frame = {
  id: string;
  title: string;
  src: string;                   // public/assets/frames/<file>
  type: "anchor" | "surface";
  anchor?: { xPct: number; yPct: number; sizePct: number };            // centered overlay
  surface?: { quad: [Point, Point, Point, Point]; blend: "normal" | "multiply" | "screen" };
  invert?: boolean;              // does this frame support an inverted (light/dark) logo variant
};
```

- **anchor** frames: logo drawn centered at a consistent position/size (the
  "match" continuity across cuts).
- **surface** frames: logo mapped onto `quad` via `matrix3d` with `blend`, so it
  sits on the mockup surface in perspective.
- **inverted** variant flips the logo between its normal and a light/dark version
  (e.g. white ↔ near-black) to contrast the surface.

## 7. Beat-driven looping cuts (core)

Reuse the beatmap (beat times) from the selected track. Build **cut boundaries**
by subdividing each beat interval into `cutsPerBeat` slices (default 2 → eighth
notes, "super fast"). At frame *N*: `t = N/fps`; `cutIndex` = number of cut
boundaries ≤ *t*; the on-screen frame = `orderedFrames[cutIndex % orderedFrames.length]`.
The ordered frame list therefore **loops** to fill the whole track/duration, and
every cut lands on a beat subdivision. Fully deterministic from frame number.

Optional per-cut micro-motion (subtle punch-in/hold) may be added for energy but
is not required for v1.

## 8. Editor UX (three-pane, matches the reference)

1. **Left — Upload:** drag/drop or browse (SVG/PNG/JPEG/WebP). On upload, show a
   first-frame preview and, for SVG, any ingest warnings. Sets `logo.src/kind`.
2. **Center — Preview:** Remotion `<Player component={LogoShowcase}>` at the
   chosen aspect, with play/scrub, looping.
3. **Right — Frames:** the ordered frame list (thumbnail, name, inverted toggle,
   remove, drag-reorder), a frame count, **"+ Add Frame"** (pick from the bundled
   library), a `cutsPerBeat` (cut-speed) control, track picker, format, and the
   **"Download Video"** (export) button.

Style switch (Pulse | Showcase) sits in the top bar.

## 9. Rendering / Export

`/api/render` gains an optional `id` in the POST body (`"LogoPulse"` |
`"LogoShowcase"`, default `"LogoPulse"`); `renderToFile(config, outPath, id)`
selects and renders that composition. Showcase is 2D so no `gl:"angle"` is
needed for it, but passing it is harmless; the shared `webpackOverride` (`@/`
alias) still applies. Dimensions/fps/duration come from `calculateMetadata`
reading `props.config.format` (same pattern as Pulse).

## 10. Error handling
- `logo-src`: reject non-image files; warn (not crash) on unsupported SVG
  features; require a logo before export.
- `frames`: an empty frame list falls back to the full bundled library (never a
  blank video); a missing beatmap for the track fails loudly (as in Pulse).
- Export errors surfaced to the UI (reuse the Pulse Export error path).

## 11. Testing
- `cut-sequencer` (pure): deterministic frame-index at given frames/beats,
  looping wrap-around, `cutsPerBeat` subdivision — unit tests.
- `matrix3d` (pure): unit rect → known quad yields the expected transform;
  identity quad → identity — unit tests.
- `logo-src`: SVG ok, raster ok (data URL), garbage rejected — unit tests.
- Smoke render of `LogoShowcase` (few frames) → confirms 2D compositing + audio
  and honors config dimensions.
- Render-API: `renderToFile(..., "LogoShowcase")` produces a valid MP4.

## 12. Out of scope (v1)
- AI/auto-generated mockups; user-uploaded custom frames (bundled library only).
- Per-frame manual placement editing in the UI (placement comes from frame
  metadata; reorder/remove/invert only).
- True 3D mockups; video (moving) backgrounds.
- Non-9:16 polish beyond the shared format table (aspect still switchable).

## 13. Repository additions

```
public/assets/frames/         # bundled CC0 mockup images + CREDITS.md
src/lib/showcase-config.ts     # ShowcaseConfig type + DEFAULT + defaults
src/lib/frames.ts              # FRAMES manifest + Frame type
src/lib/cut-sequencer.ts       # beat-driven looping cut index (pure)
src/lib/matrix3d.ts            # quad homography → CSS matrix3d (pure)
src/remotion/ShowcaseComposition.tsx   # LogoShowcase
src/remotion/components/SceneFrame.tsx
src/editor/showcase/           # showcase editor + panels + frame list
tests/cut-sequencer.test.ts  matrix3d.test.ts  logo-src.test.ts  showcase-render.test.ts
```

## 14. Milestones (for the plan)
1. **Frame model + assets:** `frames.ts`, a few bundled placeholder mockups (anchor + surface) + CREDITS.
2. **Pure core:** `cut-sequencer` + `matrix3d` (+ `logo-src`) with unit tests.
3. **`LogoShowcase` composition + `SceneFrame`:** render looping beat-cut montage; smoke render.
4. **Render API + Root:** parameterize composition id; register `LogoShowcase`; render-API test.
5. **Showcase editor:** three-pane UI (upload / preview / frames list + add/reorder/invert / cut-speed / export).
6. **Style switch + polish + docs:** Pulse|Showcase toggle; README update; full test pass.
