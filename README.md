# OpenLogomotion — Showcase Match-Cut Logo Animator

An open-source recreation of the **Showcase** match-cut montage engine from [logomotion.design](https://logomotion.design).
Everything runs fully locally — no account, no network calls, no watermark required.

---

## Showcase (logo match-cut over generated color frames)

Upload a logo, arrange generated color frames, and export a fast-cutting "logo match-cut" video where the logo stays **centered and fixed** while solid-color and palette background frames cut behind it. Cuts fire on audio onsets — either detected from your own uploaded audio (browser-side, no server) or from the bundled track — and a cut-density control subdivides for faster cuts.

- **Logo input:** SVG, PNG, JPEG, or WebP — raster logos are embedded directly without tracing.
- **Logo stays centered** — the logo is always composited at the center of the frame at a configurable size (Logo size slider, 15–70 % of the shorter dimension). There is no surface placement or perspective transform in v2.
- **Generated color frames (Solid and Palette):**
  - **Solid** — a single hex color fills the entire background.
  - **Palette** — two or more hex colors are split into equal vertical bands.
  - Each frame can be toggled **inverted** (CSS `invert(1)`) for instant light/dark variants of the logo.
  - Frames loop to fill the entire export duration.
- **Right-rail Frames panel:** add Solid or Palette frames, edit colors via color pickers, reorder with ↑/↓, toggle invert with ◐, remove with ✕.
- **Audio (right-rail Audio panel):**
  - **Bundled track** — select from the bundled royalty-free-placeholder track; cut times derive from the bundled beat grid.
  - **Upload audio** — upload any audio file (MP3, WAV, M4A, OGG, etc.); the browser decodes it and runs energy-based onset detection to derive cut times. No audio leaves your device.
  - **Cut density slider (1×–4×)** — subdivides the detected or bundled cut grid for more cuts per second without re-analyzing.
- **Right-rail Settings panel:** Logo size slider, Format (9:16, 1:1, 16:9), Duration (4–10 s), and **Download Video**.
- **Download Video** — POSTs config (including the audio data URL for uploaded audio) to `/api/render`; the server embeds the chosen audio in the output MP4.
- **Fully 2D rendering** — no Three.js 3D rendering; the Showcase composition uses Remotion's 2D `<AbsoluteFill>` layout.

---

## Features

- **Live preview** — Remotion `<Player>` in the browser mirrors the final render exactly.
- **MP4 export** — click **Download Video** to POST to `/api/render`; Chromium renders the same Remotion composition server-side and streams the file back.
- **Fully local** — all computation (onset detection, rendering) runs on your machine; no network calls at runtime. Uploaded audio is analyzed in the browser and embedded in the export as a data URL.

---

## Requirements

- **Node.js 20+** and npm.
- On the **first video export**, `@remotion/renderer` downloads a headless Chromium (one-time, ~a minute, needs internet). Everything after that — including all rendering — runs locally.

## Quickstart

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), upload a logo (SVG, PNG, JPEG, or WebP), customise frames and audio, and click **Download Video**.

### Remotion Studio (optional)

```bash
npm run remotion:studio
```

---

## How Rendering Works

One Remotion composition — `ShowcaseComposition` (id `LogoShowcase`) — is the **single source of truth** shared by the live `<Player>` preview and the server-side `renderMedia` call.

When you click **Download Video**, the browser POSTs your config JSON to `/api/render` (`app/api/render/route.ts`). The route calls `@remotion/renderer`'s `renderMedia`, passing `chromiumOptions: { gl: "angle" }` and the shared `webpackOverride` from `src/remotion/webpack-override.ts` (which wires up the `@/` path alias). The resulting MP4 is streamed back as a download.

Uploaded audio is passed as a data URL in the config — the render server embeds it directly in the output MP4, so no temporary audio files are needed on the server.

---

## How to Add a Track

1. Drop an `.mp3` into `public/assets/tracks/`.
2. Generate the beat grid (currently hardcoded to 120 BPM — edit `scripts/make-beatmap.mjs` for a different tempo):
   ```bash
   node scripts/make-beatmap.mjs
   ```
   This writes `public/assets/beatmaps/<id>.json` containing beat timestamps and per-beat energy values.
3. Add an entry to `TRACKS` in `src/lib/tracks.ts`.

---

## Example Logo

`examples/sample-logo.svg` is a minimal two-colour filled-path SVG you can drag straight into the editor.

The ingester (`src/lib/logo-ingest.ts`) uses Three.js's `SVGLoader` for SVG path validation (not for 3D rendering) and requires **filled paths** — stroke-only or no-fill SVGs are rejected with a descriptive error.

---

## Roadmap

The following are intentionally **out of scope** for the current release and are tracked for future iterations:

- **Image-drop-in frames for Showcase** — no mockup-photo or brand-image background frames in v2; only generated solid/palette frames are supported. Drop-in image frames are deferred to a future release.
- **Gradient frames for Showcase** — two-stop or multi-stop CSS gradient backgrounds are deferred; only solid colors and vertical palette bands are generated today.
- **In-UI logo placement editing** — the logo is always centered in Showcase v2. A drag-to-place or offset control is a roadmap item.
- **Accounts / cloud / watermark** — fully local and watermark-free now and in future iterations.

---

## Known Limitations

- **Bundled audio is a CC0 placeholder** — `public/assets/tracks/pulse-120.mp3` is a procedurally generated 880 Hz click-track. Replace it with properly-licensed audio before any public deployment (see `public/assets/tracks/CREDITS.md`).
- **No dimension / duration clamping in `/api/render`** — appropriate for local use; add guards before exposing publicly.
- **Export duration vs. track length** — the bundled track is ~6 s. Exports longer than the track length will outrun the audio and beat grid: cut times end before the video does. Keep export durations at or under the track length until looping or additional tracks are added.
- **Fixed fps and resolution** — fps is fixed at 30 and resolution is fixed per aspect ratio. Custom fps/resolution is a roadmap item.
- **Showcase: generated frames only (v2)** — only Solid (single hex color) and Palette (vertical color bands) frames are available. Drop-in image frames and gradient frames are deferred to a future release.
- **Showcase onset detection is energy-based / browser-side** — cut times are derived from a short-time RMS energy onset-detection function running in the browser via the Web Audio API. Detection quality depends on transient clarity in the uploaded audio; highly compressed or ambient tracks may yield fewer onsets. No server-side ML beat detection is used.
- **Uploaded audio stays in the browser** — analysis runs entirely client-side (Web Audio API `decodeAudioData`). The audio data URL is embedded in the render config POSTed to `/api/render` and returned in the MP4; it is not stored on the server.

---

## Stack

| Layer | Library |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19 |
| Composition / render | Remotion 4.0.484 (`remotion`, `@remotion/player`, `@remotion/bundler`, `@remotion/renderer`) |
| SVG parsing | Three.js 0.185 (SVGLoader used by logo-ingest for SVG path validation; no 3D rendering) |
| Language | TypeScript (strict) |
| Tests | Vitest |

---

## License

MIT — see [LICENSE](./LICENSE).

Audio credits — see [public/assets/tracks/CREDITS.md](./public/assets/tracks/CREDITS.md).
