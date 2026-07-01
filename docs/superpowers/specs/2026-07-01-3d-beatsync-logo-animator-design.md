# OpenLogomotion — 3D Beatsync Logo Animator (Design Spec)

**Date:** 2026-07-01
**Status:** Approved design, pending implementation plan
**Scope:** v1 of an open-source recreation of the **Pulse** (premium) feature of
[logomotion.design](https://www.logomotion.design/) — a viral, beat-synced, 3D
logo animation that renders to an MP4.

---

## 1. Background & Goal

logomotion.design is a web tool that turns a static logo into a short vertical
brand video. It has two engines:

- **Logo Match Cut** (free) — logo composited into a montage of real-world
  mockups with beat-synced quick cuts.
- **Pulse** (premium) — *"Viral beatsync 3D logo animation, completely
  customizable."* The logo is extruded into 3D and animated (rotate / pulse /
  react to the beat) with materials and lighting.

**This spec covers Pulse only.** The goal is a locally-runnable, open-source tool
that reproduces the premium Pulse capabilities: 3D extrusion, materials,
lighting/environment, beat-synced animation presets, and MP4 export in social
formats.

### Note on fidelity
The public site is a marketing SPA; the editor internals, exact control set, and
pricing are not publicly documented. This design bases its UX on the site's
stated flow (*"upload your logo, pick a style, export a vertical brand video in
minutes"*) plus the conventions of comparable 3D logo animators (3DLogoLab,
DanceLogo, Renderforest). We intentionally design an **open-source superset**
rather than a pixel copy.

---

## 2. Confirmed Decisions

| Decision | Choice |
|---|---|
| First milestone | **Pulse (3D beatsync)** engine |
| Render stack | **Remotion + React Three Fiber** (deterministic MP4, audio sync, shared preview/render composition) |
| Logo input | **SVG only** (clean vector → crisp 3D extrusion) |
| Interface | **Custom web editor** (React) with live `<Player>` preview |
| Beat source | **Bundled royalty-free tracks + precomputed beatmap JSON** (deterministic) |
| Premium knobs (v1) | Materials/finish · Lighting/environment · Animation presets · Format & extrusion |
| MP4 render trigger | **Local render server** — Next.js API route using `@remotion/renderer` |

---

## 3. Architecture

One Next.js app hosts the editor UI, the Remotion `<Player>` preview, and a
render API. The **same Remotion composition** drives both the live preview and
the final MP4, guaranteeing WYSIWYG.

```
Editor UI (React) ──props──> Remotion <Player>  (live 3D preview, R3F)
        │                          ▲  same composition
        │ POST /api/render {props} │
        ▼                          │
  Render API (@remotion/renderer) ─┘ ──> MP4 file (download)
```

**Stack:** Next.js · React · Remotion · React Three Fiber · Three.js ·
`@react-three/drei` · `@remotion/renderer` + `@remotion/bundler`.

**Why Remotion + R3F:** deterministic frame-by-frame rendering, built-in audio
embedding for beat sync, `<Player>` gives a live preview inside our own editor
using the exact composition that renders the MP4, and it reuses the user's
existing Remotion setup.

---

## 4. Components

Each component has one clear purpose, a defined interface, and is independently
understandable/testable.

| Component | Responsibility | Key interface | Depends on |
|---|---|---|---|
| `logo-ingest` | Parse uploaded SVG → normalized, centered vector paths + fill colors | `parseSvg(svgString) → { paths, colors, viewBox }` | Three `SVGLoader` |
| `logo3d` | Extrude paths → 3D geometry (depth, bevel); apply material preset | `<Logo3D paths material depth bevel />` | Three `ExtrudeGeometry` |
| `scene` | R3F scene: camera, lighting/environment preset, background | `<Scene env lighting background>{children}</Scene>` | R3F, `drei` |
| `beat-engine` | Pure map: frame → beat phase from a track's beatmap | `beatPhase(frame, fps, beatmap) → { phase, sinceBeat, energy }` | beatmap JSON |
| `animation-presets` | Pure map: `(frame, beat, params) → transform` for each preset | `applyPreset(name, frame, beat, params) → { position, rotation, scale }` | beat-engine |
| `LogoComposition` | Remotion composition wiring scene + audio + animation + logo | Remotion `<Composition>` with typed `props` | all above |
| `editor` | Upload, control panels, `<Player>` preview, Export button | React app | Remotion `<Player>` |
| `render-api` | `/api/render`: bundle + `renderMedia(props)` → MP4 | `POST /api/render` | `@remotion/renderer`, `@remotion/bundler` |
| `assets` | Bundled tracks + beatmaps, HDRI env maps, material presets | static files + manifest | — |

**File-size discipline:** `animation-presets` and material/env preset
definitions live in separate small modules (one concern each) so they stay
focused and easy to extend.

---

## 5. Data Model — Composition Props

A single typed props object is the source of truth for both preview and render.

```ts
type LogoAnimConfig = {
  logo: { svg: string };                  // raw SVG markup
  extrusion: { depth: number; bevel: number };
  material:  MaterialPreset;              // 'chrome'|'gold'|'glass'|'plastic'|'matte'|'glossy'|'neon'|...
  scene: {
    environment: EnvPreset;              // HDRI/studio preset id
    lighting: LightingPreset;            // key/fill/rim intensities preset id
    background: { type: 'color'|'gradient'; value: string | [string,string] };
  };
  animation: { preset: AnimPreset; intensity: number };  // 'spin'|'pulseBeat'|'bounce'|'wobble'|'flip'|'assemble'|'float'
  audio: { trackId: string };            // selects bundled track + its beatmap
  format: {
    aspect: '9:16'|'1:1'|'16:9';
    width: number; height: number; fps: number; durationInFrames: number;
  };
};
```

`durationInFrames` is derived from a chosen duration (e.g. 5s @ 30fps = 150).

---

## 6. Beat Engine (deterministic)

Each bundled track ships `beatmap.json`:

```json
{ "bpm": 120, "beats": [0.0, 0.5, 1.0, ...], "energy": [1.0, 0.6, 0.9, ...] }
```

At frame *N*: `t = N / fps`. `beatPhase` finds the most recent beat ≤ *t* and
returns:
- `phase` — normalized 0→1 decay since that beat (drives pulses),
- `sinceBeat` — seconds since last beat,
- `energy` — that beat's energy (optional accent).

It is a **pure function of frame number** → preview and render are byte-identical
in timing. Animation presets read `beatPhase` to drive scale pulses, rotation
kicks, and camera accents on the beat.

---

## 7. Animation Presets (v1)

Each preset is a pure `(frame, beat, params) → { position, rotation, scale }`:

- **spin** — continuous Y rotation; beat adds a speed kick.
- **pulseBeat** — scale pulses up on each beat (`1 + k·phase`).
- **bounce** — vertical bob synced to beat.
- **wobble** — subtle tilt oscillation, beat-accented.
- **flip** — periodic 180°/360° flip landing on beats.
- **assemble** — logo parts fly in / settle by an early beat, then idle-animate.
- **float** — gentle idle drift + slow rotation (calm option).

`intensity` scales the beat-reactivity uniformly.

---

## 8. Premium Knobs — v1 Scope

- **Materials/finish:** chrome, gold, glass, plastic, matte, glossy, neon/emissive.
- **Lighting/environment:** HDRI/studio presets, background color/gradient,
  reflections.
- **Animation presets:** the seven above.
- **Format & extrusion:** aspect 9:16 / 1:1 / 16:9, duration, resolution/fps,
  extrusion depth & bevel.

---

## 9. Editor UX Flow

1. **Upload** SVG (drag-drop). Ingest validates and shows a first-frame preview.
2. **Customize** via side panels: Material · Environment/Lighting · Animation ·
   Music (track picker) · Format.
3. **Preview** — live Remotion `<Player>` with play/scrub, reflecting every prop
   change in real time.
4. **Export** — click Export → `POST /api/render` → progress → MP4 download.

---

## 10. Render Service

`/api/render` receives `LogoAnimConfig`, bundles the Remotion project
(`@remotion/bundler`, cached) and calls `renderMedia` with the props to produce
an MP4 (H.264). Because it renders the identical composition, output matches the
preview. Long renders report progress back to the editor.

---

## 11. Error Handling

- **Ingest:** reject non-SVG / empty files; warn on unsupported SVG features
  (gradients, stroke-only paths, embedded raster) and degrade gracefully
  (e.g., fall back to solid fill). Never crash the editor on a bad logo.
- **Render:** surface `renderMedia` failures to the UI with a readable message;
  clean up temp files; guard against absurd durations/resolutions.
- **Beat/assets:** validate that a selected `trackId` has a beatmap; fail loudly
  in dev, gracefully (silent/no-beat) in prod.

---

## 12. Testing Strategy

- **Pure units (TDD):** `beat-engine` and `animation-presets` — deterministic
  assertions on returned transforms at specific frames/beats.
- **Ingest:** fixture SVGs (clean, gradient, stroke-only, malformed) → assert
  parsed paths / warnings.
- **Composition smoke test:** render a handful of frames headless in CI to catch
  R3F/Remotion breakage.
- **Render API:** integration test producing a short low-res MP4 from a fixture
  config; assert file exists and has expected duration.

---

## 13. Explicitly Out of Scope (v1)

- Logo Match Cut engine (separate future sub-project).
- Raster (PNG/JPG) input / auto-tracing.
- User-uploaded audio + runtime beat detection (bundled tracks only in v1).
- Accounts, cloud rendering, payment/watermark logic.
- AI-driven / content-aware animation generation.

---

## 14. Repository Shape (proposed)

```
/ (Next.js app)
  app/                 # editor UI + /api/render route
  remotion/
    LogoComposition.tsx
    components/ (logo3d, scene)
    lib/ (logo-ingest, beat-engine, animation-presets, materials, environments)
  public/assets/
    tracks/*.mp3  beatmaps/*.json  hdri/*.hdr
  tests/
  docs/superpowers/specs/
```

---

## 15. Milestones (for the implementation plan)

1. **Core render spine:** Remotion + R3F, extrude a hardcoded SVG, spin, export MP4.
2. **Beat engine + audio:** bundled track, beatmap, pulseBeat preset synced.
3. **Materials + environment/lighting** presets.
4. **Remaining animation presets** + `intensity`.
5. **Editor UI:** upload, panels, `<Player>` preview.
6. **Render API** wired to the editor Export button.
7. **Formats/extrusion** controls + polish + tests + README (open-source).
