# OpenLogomotion — Showcase v2 (centered logo · typed frames · onset-synced cuts)

**Date:** 2026-07-01
**Status:** Approved design, pending implementation plan
**Supersedes:** the v1 Showcase surface-placement engine (2026-07-01-showcase-match-cut-design.md). v1's beat-driven looping cuts and editor shell are reused; surface/perspective placement is dropped.

## 1. Goal & reference

Recreate logomotion.design's `?style=showcase` "logo match cut": the logo stays
**centered and fixed** while a rapid, looping sequence of background **frames** cuts
behind it, synced to music. Confirmed against the live editor (via Playwright):
default **5 s**, **28 frames** (14 bases × normal/inverted), Inter font, palette
`#1a1a1a` / white / `#6b6b6b` / accent `#2563EB`, three-pane layout (logo drop /
9:16 preview + transport / frames list with drag-reorder + "Add frame" +
"Download Video").

Per the product owner, v2 diverges from v1 in three ways:

1. **Logo fixed in the center** of every frame (no per-surface perspective).
2. **Typed, user-editable frames** — the user can drop in an image per frame, or
   define a frame from a color/gradient/palette.
3. **User audio + onset-accurate cut sync** — the user can upload their own audio;
   the app detects audio **onsets (transients)** in the browser and cuts on those,
   so cuts fit that specific track (fast/high-frequency supported).

### Fidelity / IP note
This is a faithful functional recreation, not a copy of logomotion.design's
proprietary assets. All bundled frames are generated or CC0 placeholders; users
supply their own logo, images, and audio. No third-party copyrighted assets are
bundled or reproduced.

## 2. Confirmed decisions

| Decision | Choice |
|---|---|
| Logo placement | **Centered, fixed**, consistent size on every frame (size control) |
| Frame types | **image** (user drop-in) · **solid** (hex) · **gradient** (2–3 stops) · **palette** (swatches) |
| Frame variant | `normal` / `inverted` (flips centered logo light↔dark) |
| Audio source | Bundled track **or** user-uploaded file |
| Beat sync | **Onset/transient detection** on the audio → cut times |
| Cut model | One frame per cut, list **loops**; density control (onset subdivision/grouping) |
| Determinism | Onsets computed once in the editor, stored in config; preview == export |
| Rendering | Plain Remotion 2D (image/CSS backgrounds + centered logo); no Three.js |

## 3. Architecture

The editor (client) decodes and analyzes audio in the browser (Web Audio), then
stores the resulting **cut times** and audio in one `ShowcaseConfig`. The same
config drives the `<Player>` preview and the server-side `renderMedia`, so the
exported MP4 matches the preview exactly.

```
Editor (client)
  ├─ upload audio → decode (Web Audio) → onset-detect (pure) → cutTimes[]
  ├─ frames[] (image/solid/gradient/palette, per-frame content)
  └─ ShowcaseConfig ──► <Player component={ShowcaseComposition}>
                        └─► POST /api/render {config, id:"LogoShowcase"} ─► MP4
```

## 4. Components

| Component | Responsibility | Purity / env |
|---|---|---|
| `onset-detect` | `onsetTimes(samples: Float32Array, sampleRate, opts) → number[]` — spectral-flux onset detection function + adaptive peak-picking | **pure** (TDD) |
| `cut-sequencer` (v2) | `cutIndexAt(frameNo, fps, cutTimes) → number` — # of cut times ≤ t; `pickFrame(list, idx)` loops | **pure** (TDD) |
| `audio-decode` | Browser: `File → { samples: Float32Array, sampleRate, duration }` via `AudioContext.decodeAudioData`; also `→ dataURL` for embedding | client |
| `frames` (v2) | `Frame` union (image/solid/gradient/palette) + defaults; `bundled` starter frames | pure data |
| `FrameBackground` | Renders one frame's background (image `cover`, or CSS solid/gradient/palette) | component |
| `ShowcaseComposition` (v2) | Background (current cut) + **centered logo** (with invert filter); `<Audio>` from config | composition |
| `showcase editor` (v2) | Three-pane UI: logo drop · preview · frames list (typed add / per-frame edit / reorder / invert / remove) · audio (bundled or upload + analyze) · logo size · Export | client |

**Reused from v1:** the editor shell/three-pane layout, `useShowcaseConfig`
(deep-merge), the render API (already id-parameterized), format table,
`logo-src`. **Removed in v2:** `matrix3d` + surface placement in `SceneFrame`
(logo is always centered); v1 surface quads in `frames.ts`.

## 5. Data model

```ts
type FrameVariant = "normal" | "inverted";
type Frame =
  | { kind: "image";    variant: FrameVariant; src: string; fit: "cover" | "contain" }
  | { kind: "solid";    variant: FrameVariant; color: string }
  | { kind: "gradient"; variant: FrameVariant; stops: string[]; angle: number }
  | { kind: "palette";  variant: FrameVariant; colors: string[] };

type AudioSource =
  | { kind: "bundled"; trackId: string }                       // uses precomputed cutTimes from beatmap
  | { kind: "upload";  src: string; name: string };            // data URL of the user's audio

type ShowcaseConfig = {
  logo: { src: string; kind: "svg" | "raster" };
  logoSizePct: number;                                         // centered logo size (fraction of min dimension)
  frames: Frame[];                                             // ordered, loops
  audio: AudioSource;
  cutTimes: number[];                                          // seconds; the cut grid (from onsets or bundled beatmap)
  cutDensity: number;                                          // 1 = every onset; 2 = every other; 0.5 = subdivide
  format: { aspect: Aspect; width: number; height: number; fps: number; durationInFrames: number };
};
```

`cutTimes` is the single source of truth for when cuts happen — computed by
`onset-detect` for uploads (or copied from a bundled beatmap), then adjusted by
`cutDensity`. Both preview and render read `cutTimes`; nothing re-analyzes at
render time (deterministic).

## 6. Onset detection (pure, the core new algorithm)

`onsetTimes(samples, sampleRate, opts)`:
1. Frame the signal (window ~1024, hop ~512).
2. Magnitude spectrum per frame (FFT).
3. **Spectral flux** = sum of half-wave-rectified bin-to-bin magnitude increases.
4. Normalize; **adaptive threshold** = local mean × sensitivity over a sliding
   window.
5. **Peak-pick**: flux crossings above threshold that are local maxima and at
   least `minGapMs` apart → onset times (seconds).
6. Return sorted onset times.

Pure and deterministic → unit-tested with synthetic PCM (impulses/clicks at known
times must be detected within a tolerance; silence yields none). Density is applied
by the editor after detection (`cutTimes = applyDensity(onsets, cutDensity)`).

## 7. Cut → frame mapping

At video frame *N*: `t = N/fps`; `idx = count(cutTimes ≤ t)`; on-screen frame =
`frames[idx mod frames.length]` (loops). Between the last cut time and the video
end, the last frame holds. Fully deterministic from `cutTimes` + frame number.

## 8. Frame rendering (centered logo)

`ShowcaseComposition` renders, per video frame:
- `FrameBackground` (full-bleed): image (`object-fit: cover`), solid color,
  linear gradient, or a palette (evenly split color bands or blocks).
- the **logo**, centered, sized `logoSizePct × min(width,height)`, with
  `filter: invert(1)` when the current frame's variant is `inverted` (built so
  every invert×shadow combination is valid CSS), plus an optional soft shadow.
- `<Audio>` from `config.audio` (bundled `staticFile`, or the uploaded data URL).

## 9. Editor UX (three-pane, matches the reference)

- **Left — Logo:** drop/browse (SVG/PNG/JPEG/WebP); centered-preview note.
- **Center — Preview:** 9:16 `<Player>` + transport; the logo sits centered while
  frames cut behind it.
- **Right — Frames + Audio + Export:**
  - **Frames list:** numbered, **drag-reorder**, remove, **invert** toggle,
    per-frame edit (image drop for `image`; color pickers/hex for
    `solid`/`gradient`/`palette`). **"Add frame"** → choose a type.
  - **Audio:** pick a bundled track, **or upload audio → "Analyze"** (decode +
    onset-detect → `cutTimes`; show detected count) + **cut density** control.
  - **Logo size** slider; **format**; **"Download Video"** export.

## 10. Rendering / export (audio embedding — flagged risk)

`/api/render` (already id-parameterized) renders `LogoShowcase`. The uploaded
audio must reach the render. Plan: pass `audio.src` (data URL) in props and use
Remotion `<Audio src={dataURL}>`; **the render task MUST verify** the exported MP4
actually contains the user audio stream (ffprobe). If Remotion can't embed a
data-URL audio, the fallback is for the render route to write the audio to a temp
file and reference it. Dimensions/fps/duration flow from `calculateMetadata`
(unchanged pattern).

## 11. Determinism

`cutTimes` and frame content are plain data in the config; the composition is a
pure function of the video frame. No `Date`/`Math.random`. Onset analysis runs
once (editor) and its output is stored — the render never re-analyzes.

## 12. Testing

- `onset-detect` (pure): synthetic click trains at known times → detected within
  tolerance; silence → none; a dense burst → high-frequency onsets. Unit tests.
- `cut-sequencer` v2 (pure): cut index vs `cutTimes`, looping, hold-after-last.
- Frame model / `applyDensity` (pure): unit tests.
- Smoke render of `LogoShowcase` v2 (centered logo, a few typed frames, bundled
  audio) → MP4 + audio stream.
- Render-API with an **uploaded (data-URL) audio** → MP4 whose audio stream
  matches the upload (embedding-risk gate).

## 13. Out of scope (v2)

- Server-side audio analysis (analysis is browser-only; render consumes stored
  `cutTimes`).
- Video/animated frame backgrounds; 3D frames.
- Per-frame logo repositioning (logo is always centered in v2).
- Music-library licensing/streaming; stock-photo API integration (users supply
  their own images/audio).

## 14. Migration from v1

- `SceneFrame` surface/`matrix3d` path removed; logo always centered.
- `matrix3d.ts` + `tests/matrix3d.test.ts` removed (dead after v2).
- v1 `frames.ts` (surface quads) replaced by the v2 typed `Frame` model; the four
  bundled SVGs may be reused as default **image** frames.
- `cut-sequencer` generalized from BPM-grid to explicit `cutTimes[]` (bundled
  beatmaps convert to `cutTimes` once).

## 15. Milestones (for the plan)

1. **Onset detection** (pure) + tests.
2. **cut-sequencer v2** (`cutTimes`-based) + `applyDensity` + tests.
3. **Frame model v2** (typed) + `FrameBackground` + defaults.
4. **ShowcaseComposition v2** (centered logo + typed backgrounds + audio); remove
   surface/matrix3d; smoke render.
5. **audio-decode** (browser) + editor audio upload/analyze + cut-density.
6. **Editor v2** frames list (typed add / per-frame edit / reorder / invert) +
   logo-size + export.
7. **Render audio embedding** (data-URL audio) + render-API test (upload audio).
8. **Polish + docs** (README update; match reference styling: Inter, colors).
