# OpenLogomotion — Beat-Synced 3D Logo Animator

An open-source recreation of the **Pulse** feature from [logomotion.design](https://logomotion.design).
Upload an SVG logo, pick a material, environment, and animation style, and export a beat-synced 3D MP4 in seconds — no account required.

---

## Features

- **SVG → 3D extrusion** — filled-path SVGs are parsed, normalised, and extruded into Three.js geometry automatically.
- **7 animation presets** — `spin`, `pulseBeat`, `bounce`, `wobble`, `flip`, `assemble`, `float` — each parameterised by intensity and beat-synced to the music.
- **6 material types** — chrome, gold, glass, plastic, matte, glossy, neon.
- **5 environment / lighting presets** — studio, city, sunset, dawn, night — plus soft / hard / rim lighting modes and a customisable background (solid colour or two-stop gradient).
- **Beat-synced audio** — deterministic beat grid derived from a bundled royalty-free-placeholder track; animations lock to the beat every frame without runtime analysis.
- **Live preview** — Remotion `<Player>` in the browser mirrors the final render exactly.
- **MP4 export** — click **Export MP4** to POST to `/api/render`; Chromium renders the same Remotion composition server-side and streams the file back.
- **Format controls** — portrait (9:16), square (1:1), landscape (16:9), custom duration, extrusion depth, bevel.

---

## Quickstart

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), upload an SVG (filled paths — see `examples/sample-logo.svg`), customise, and click **Export MP4**.

### Remotion Studio (optional)

```bash
npm run remotion:studio
```

---

## How Rendering Works

One Remotion composition (`LogoComposition`, id `LogoPulse`) is the **single source of truth** shared by both the live `<Player>` preview and the server-side `renderMedia` call.

When you click **Export MP4**, the browser POSTs your `LogoAnimConfig` JSON to `/api/render` (`app/api/render/route.ts`). The route calls `@remotion/renderer`'s `renderMedia`, passing `chromiumOptions: { gl: "angle" }` and the shared `webpackOverride` from `src/remotion/webpack-override.ts` (which wires up the `@/` path alias). The resulting MP4 is streamed back as a download.

---

## How to Add a Track

1. Drop an `.mp3` into `public/assets/tracks/`.
2. Generate the beat grid (currently hardcoded to 120 BPM — edit `scripts/make-beatmap.mjs` for a different tempo):
   ```bash
   node scripts/make-beatmap.mjs
   ```
   This writes `public/assets/beatmaps/<id>.json` containing beat timestamps and per-beat energy values.
3. Add an entry to `TRACKS` in `src/lib/tracks.ts`.
4. Register the beatmap in the `BEATMAPS` map in `src/remotion/LogoComposition.tsx`.

---

## Example Logo

`examples/sample-logo.svg` is a minimal two-colour filled-path SVG you can drag straight into the editor to try the pipeline immediately.

The ingester (`src/lib/logo-ingest.ts`) requires **filled paths** — stroke-only or no-fill SVGs are rejected with a descriptive error.

---

## Roadmap (v1 is deliberately scoped)

The following are intentionally **out of scope** for v1 and are tracked for future releases:

- **Logo Match Cut engine** — the free cut-to-beat video feature on logomotion.design.
- **Raster input** — PNG / JPG auto-tracing to SVG paths.
- **User-uploaded audio + runtime beat detection** — v1 ships bundled tracks only; v2 will accept arbitrary audio and detect beats at upload time.
- **Accounts / cloud / watermark** — v1 is fully local and watermark-free.

---

## Known Limitations

- **Bundled audio is a CC0 placeholder** — `public/assets/tracks/pulse-120.mp3` is a procedurally generated 880 Hz click-track. Replace it with properly-licensed audio before any public deployment (see `public/assets/tracks/CREDITS.md`).
- **No dimension / duration clamping in `/api/render`** — appropriate for local use; add guards before exposing publicly.
- **Export duration vs. track length** — the bundled track is ~6 s. Exports longer than the track length will outrun the audio and beat grid: the logo stops reacting and audio ends before the video does. Keep export durations at or under the track length until looping or additional tracks are added.
- **Fixed fps and resolution** — fps is fixed at 30 and resolution is fixed per aspect ratio in v1. Custom fps/resolution is a roadmap item.
- **SVG input only** — no raster auto-tracing in v1.

---

## Stack

| Layer | Library |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19 |
| Composition / render | Remotion 4.0.484 (`remotion`, `@remotion/three`, `@remotion/player`, `@remotion/bundler`, `@remotion/renderer`) |
| 3D | Three.js 0.185, `@react-three/fiber`, `@react-three/drei` |
| Language | TypeScript (strict) |
| Tests | Vitest |

---

## License

MIT — see [LICENSE](./LICENSE).

Audio credits — see [public/assets/tracks/CREDITS.md](./public/assets/tracks/CREDITS.md).
