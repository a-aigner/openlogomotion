# Final Fixes Report — feat/pulse-3d-animator

## FIX 1: Bundle HDRIs Locally

**What changed:**
- Installed `@pmndrs/assets@1.7.0` — ships each HDRI as a base64 data-URI exported from a `.exr.js` ESM module.
- `src/lib/environments.ts`: Replaced the `{ preset: "studio"|... }` shape with `{ hdri: string }`. Added five default imports from `@pmndrs/assets/hdri/<name>.exr` (studio, city, sunset, dawn, night). TypeScript resolves each via the companion `<name>.exr.d.ts` file; webpack resolves to `<name>.exr.js` via its standard extension fallback (`.js` appended when the bare import path has no matching file).
- `src/remotion/components/Scene.tsx`: Changed `<Environment preset={env.preset} />` to `<Environment files={env.hdri} />`. No CDN fetch occurs at preview or render time.

**How the local import works:**
The `@pmndrs/assets` package exports each HDRI as `export default 'data:application/exr;base64,...'` in a `.exr.js` ES module, with a `.exr.d.ts` type stub alongside. With `moduleResolution: "Bundler"` in tsconfig, TypeScript resolves `@pmndrs/assets/hdri/studio.exr` → `studio.exr.d.ts`. Webpack resolves the same import path → `studio.exr.js` (extension-appending fallback). The resulting bundle contains the data-URI strings inline — zero network requests.

**Test adjustment:** The `tests/presets.test.ts` test for `ENV_PRESETS` only asserts `ENV_PRESETS[k]).toBeDefined()` for each key — it never checks for a `.preset` field. No test change was needed; the test remains meaningful (verifies all 5 ids are defined).

## FIX 2: Glass Transparency

**What changed:** `src/remotion/components/Logo3D.tsx` — added `transparent={(spec.transmission ?? 0) > 0}` to `meshPhysicalMaterial`. Glass (transmission: 1.0) now has `transparent={true}`, enabling correct alpha-blending in Three.js. Other materials (transmission: 0 or undefined) keep `transparent={false}`.

## FIX 3: Panel Patch Typing

**What changed:** All five panel files (`AnimationPanel.tsx`, `FormatPanel.tsx`, `MaterialPanel.tsx`, `MusicPanel.tsx`, `ScenePanel.tsx`) had `patch: (p: any) => void` replaced with `patch: (p: DeepPartial<LogoAnimConfig>) => void`. Each file now imports `DeepPartial` from `../useConfig`. No patch call sites required changes — all existing calls satisfy `DeepPartial<LogoAnimConfig>` structurally, including the background tuple (`[string, string]` is assignable to `DeepPartial<[string, string]>` since the full tuple satisfies the optionalized partial).

## FIX 4: README Known Limitations

**What changed:**
- Removed the "Glass material" caveat (FIX 2 addresses it).
- Added bullet: export durations beyond the bundled track length (~6s) outrun the audio and beat grid.
- Added bullet: fps is fixed at 30 and resolution is fixed per aspect ratio in v1; custom fps/resolution is roadmap.
- The "fully local" claim is now accurate: HDRIs are bundled, no CDN fetch occurs.

## Verification Results

| Check | Result |
|---|---|
| `npx tsc --noEmit` | Clean (no output) |
| `npm test` | 27/27 passed, 7 test files |
| `npm run build` | Success — Next.js 16 Turbopack, static + dynamic routes |
| `npx remotion render ... --frames=0-3` | **SUCCESS** — `out/local-env.mp4` produced (36.1 kB); local `<Environment files={...}>` rendered headlessly without any network request |

## Local HDRI Render Verdict

The `@pmndrs/assets` data-URI approach works correctly in Remotion's headless Chrome render. The bundler inlines the HDRI strings; no network access is required during rendering.

## Concerns

None. All four fixes applied cleanly, TS is strict-clean, all tests pass, build succeeds, and the headless render produces the MP4 with the local environment.
