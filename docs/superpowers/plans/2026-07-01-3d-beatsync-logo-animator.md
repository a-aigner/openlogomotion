# 3D Beatsync Logo Animator (Pulse) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an open-source, locally-runnable web tool that turns an uploaded SVG logo into a beat-synced 3D animation and exports it as an MP4 — recreating logomotion.design's premium "Pulse" feature.

**Architecture:** A single Next.js app. A Remotion composition (`LogoComposition`) renders the 3D logo with `@remotion/three` (React Three Fiber) and is driven entirely by a typed props object. The *same* composition powers both the live `<Player>` preview in the editor and the final MP4 produced by a `/api/render` route using `@remotion/renderer`. Pure logic (SVG ingest, beat engine, animation presets) lives in framework-free modules that are unit-tested with Vitest; 3D/render code is smoke-tested by rendering a few frames.

**Tech Stack:** Next.js 16 (App Router) · React 19 · Remotion 4.0.484 (`remotion`, `@remotion/three`, `@remotion/player`, `@remotion/bundler`, `@remotion/renderer`) · Three.js 0.185 · `@react-three/drei` 10.7.7 · Vitest · TypeScript.

## Global Constraints

- **Node:** >= 20 (dev machine has v24.8.0). **npm** as package manager.
- **All Remotion packages MUST share the exact same version:** `4.0.484`. Mismatched Remotion package versions fail at render time.
- **React 19** (required by `@react-three/fiber` 9 and Next 16). Do not downgrade.
- **ffmpeg:** Remotion bundles its own; system ffmpeg 7.1.1 is present as fallback.
- **TypeScript** everywhere. Strict mode on.
- **Single source of truth:** every visual is derived from the `LogoAnimConfig` props object (see Task 3). Preview and render MUST pass identical props.
- **Determinism:** animation is a pure function of `frame` (via `useCurrentFrame()`), never of wall-clock time or `Math.random()` without a seeded/frame-derived value.
- **File discipline:** one responsibility per module; keep preset tables (materials, environments, presets) in their own files.
- **Aspect/format table (v1):** `9:16` → 1080×1920, `1:1` → 1080×1080, `16:9` → 1920×1080. Default fps 30.
- **Commit after every task** with a `feat:`/`test:`/`chore:` prefixed message.

---

## File Structure

```
/  (Next.js app root = /Users/andreaigner/Advertisement/logomotion)
  package.json, tsconfig.json, next.config.ts, vitest.config.ts, remotion.config.ts
  app/
    layout.tsx
    page.tsx                     # editor page
    api/render/route.ts          # POST /api/render → MP4
  src/
    remotion/
      Root.tsx                   # registerRoot: <Composition/> registry
      LogoComposition.tsx        # the shared composition
      components/
        Logo3D.tsx               # extruded SVG mesh + material
        Scene.tsx                # camera + lighting + environment + background
    lib/
      config.ts                  # LogoAnimConfig type + DEFAULT_CONFIG + FORMATS
      logo-ingest.ts             # parseSvg()  (pure)
      beat-engine.ts             # beatPhase() (pure)
      animation-presets.ts       # applyPreset() (pure)
      materials.ts               # MATERIAL_PRESETS table
      environments.ts            # ENV_PRESETS + LIGHTING_PRESETS tables
      tracks.ts                  # TRACKS manifest (id → mp3 + beatmap)
    editor/
      Editor.tsx                 # top-level editor (upload + panels + Player)
      panels/                    # MaterialPanel, ScenePanel, AnimationPanel, MusicPanel, FormatPanel
  public/assets/
    tracks/*.mp3
    beatmaps/*.json
  tests/
    logo-ingest.test.ts  beat-engine.test.ts  animation-presets.test.ts  render-api.test.ts
    fixtures/*.svg
  docs/superpowers/{specs,plans}/
```

---

## Task 1: Project scaffold + render spine

**Goal:** A Next.js + Remotion project that renders a hardcoded spinning 3D shape to an MP4 via the CLI. Proves the whole render spine before any real logic.

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `remotion.config.ts`, `vitest.config.ts`, `.gitignore`
- Create: `src/remotion/Root.tsx`, `src/remotion/LogoComposition.tsx`
- Create: `app/layout.tsx`, `app/page.tsx`

**Interfaces:**
- Produces: `RemotionRoot` (default export of `Root.tsx`) registering a composition with id `"LogoPulse"`; `LogoComposition` React component accepting a temporary `{}` prop.

- [ ] **Step 1: Initialize package + install deps**

Run in project root:
```bash
npm init -y
npm pkg set type="module"
npm i next@16.2.9 react@19 react-dom@19 three@0.185.0 \
  remotion@4.0.484 @remotion/three@4.0.484 @remotion/player@4.0.484 \
  @remotion/bundler@4.0.484 @remotion/renderer@4.0.484 \
  @react-three/fiber@9.6.1 @react-three/drei@10.7.7
npm i -D typescript @types/react @types/react-dom @types/three @types/node \
  vitest @vitejs/plugin-react
```

- [ ] **Step 2: Add config files**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022", "lib": ["dom", "dom.iterable", "ES2022"],
    "module": "ESNext", "moduleResolution": "Bundler",
    "jsx": "preserve", "strict": true, "esModuleInterop": true,
    "skipLibCheck": true, "noEmit": true, "resolveJsonModule": true,
    "allowJs": true, "incremental": true,
    "paths": { "@/*": ["./src/*"] },
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`next.config.ts`:
```ts
import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  webpack: (config) => {
    config.externals = [...(config.externals || []), { "@remotion/renderer": "commonjs @remotion/renderer" }];
    return config;
  },
};
export default nextConfig;
```

`remotion.config.ts`:
```ts
import { Config } from "@remotion/cli/config";
Config.setVideoImageFormat("jpeg");
Config.setEntryPoint("./src/remotion/index.ts");
```

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
export default defineConfig({ test: { environment: "node", include: ["tests/**/*.test.ts"] } });
```

`.gitignore`:
```
node_modules/
.next/
out/
*.mp4
.DS_Store
```

- [ ] **Step 3: Create the Remotion entry + composition**

`src/remotion/index.ts`:
```ts
import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";
registerRoot(RemotionRoot);
```

`src/remotion/Root.tsx`:
```tsx
import { Composition } from "remotion";
import { LogoComposition } from "./LogoComposition";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="LogoPulse"
    component={LogoComposition}
    durationInFrames={150}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{}}
  />
);
```

`src/remotion/LogoComposition.tsx`:
```tsx
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";

export const LogoComposition: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const rot = (frame / 150) * Math.PI * 2;
  return (
    <AbsoluteFill style={{ backgroundColor: "#0b0b12" }}>
      <ThreeCanvas width={width} height={height} camera={{ position: [0, 0, 6], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 3, 5]} intensity={1.2} />
        <mesh rotation={[0, rot, 0]}>
          <boxGeometry args={[2, 2, 0.5]} />
          <meshStandardMaterial color="#e0e0e0" metalness={0.8} roughness={0.2} />
        </mesh>
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 4: Minimal Next.js shell**

`app/layout.tsx`:
```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body style={{ margin: 0 }}>{children}</body></html>);
}
```

`app/page.tsx`:
```tsx
export default function Home() {
  return <main style={{ padding: 24, fontFamily: "system-ui" }}>OpenLogomotion — editor coming in Task 9.</main>;
}
```

Add scripts to `package.json`:
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "test": "vitest run",
  "remotion:studio": "remotion studio src/remotion/index.ts",
  "remotion:render": "remotion render src/remotion/index.ts LogoPulse out/spine.mp4"
}
```

- [ ] **Step 5: Render the spine to verify the pipeline**

Run: `npm run remotion:render`
Expected: command succeeds and `out/spine.mp4` exists (~5s, a spinning metallic box).
Verify: `ls -la out/spine.mp4` shows a non-zero file.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js + Remotion render spine"
```

---

## Task 2: `logo-ingest` — parse SVG to normalized paths (pure, TDD)

**Goal:** Pure function that parses an SVG string into extrudable shape data, centered and scaled to a normalized bounding box, extracting fill colors and surfacing warnings for unsupported features.

**Files:**
- Create: `src/lib/logo-ingest.ts`
- Test: `tests/logo-ingest.test.ts`, `tests/fixtures/square.svg`, `tests/fixtures/gradient.svg`, `tests/fixtures/malformed.svg`

**Interfaces:**
- Consumes: `three`'s `SVGLoader`.
- Produces:
  ```ts
  type ParsedLogo = {
    shapes: { shape: import("three").Shape; color: string }[];
    warnings: string[];
    normalize: { center: [number, number]; scale: number }; // apply so logo fits ~2 units, centered at origin
  };
  function parseSvg(svg: string): ParsedLogo;
  ```
  (Consumers build `ExtrudeGeometry` from `shapes[i].shape`, then apply `normalize` as a group transform.)

- [ ] **Step 1: Create fixtures**

`tests/fixtures/square.svg`:
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" fill="#ff0000"/></svg>
```
`tests/fixtures/gradient.svg`:
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g"><stop offset="0" stop-color="#f00"/><stop offset="1" stop-color="#00f"/></linearGradient></defs><rect x="0" y="0" width="100" height="100" fill="url(#g)"/></svg>
```
`tests/fixtures/malformed.svg`:
```
this is not svg
```

- [ ] **Step 2: Write the failing tests**

`tests/logo-ingest.test.ts`:
```ts
import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { parseSvg } from "../src/lib/logo-ingest";

const fx = (n: string) => readFileSync(`tests/fixtures/${n}`, "utf8");

describe("parseSvg", () => {
  it("parses a filled rect into one shape with its fill color", () => {
    const r = parseSvg(fx("square.svg"));
    expect(r.shapes.length).toBe(1);
    expect(r.shapes[0].color.toLowerCase()).toBe("#ff0000");
    expect(r.warnings).toHaveLength(0);
  });

  it("centers and scales: normalize.scale is positive and finite", () => {
    const r = parseSvg(fx("square.svg"));
    expect(r.normalize.scale).toBeGreaterThan(0);
    expect(Number.isFinite(r.normalize.center[0])).toBe(true);
  });

  it("warns on gradient fills but still returns a shape", () => {
    const r = parseSvg(fx("gradient.svg"));
    expect(r.shapes.length).toBeGreaterThan(0);
    expect(r.warnings.join(" ")).toMatch(/gradient/i);
  });

  it("throws a readable error on non-SVG input", () => {
    expect(() => parseSvg(fx("malformed.svg"))).toThrow(/no drawable/i);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- logo-ingest`
Expected: FAIL — `parseSvg` not found / module missing.

- [ ] **Step 4: Implement `parseSvg`**

`src/lib/logo-ingest.ts`:
```ts
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { Box2, Vector2 } from "three";

export type ParsedLogo = {
  shapes: { shape: import("three").Shape; color: string }[];
  warnings: string[];
  normalize: { center: [number, number]; scale: number };
};

export function parseSvg(svg: string): ParsedLogo {
  const warnings: string[] = [];
  const data = new SVGLoader().parse(svg);
  const out: { shape: import("three").Shape; color: string }[] = [];

  for (const path of data.paths) {
    const style = path.userData?.style ?? {};
    if (typeof style.fill === "string" && style.fill.startsWith("url(")) {
      warnings.push("Gradient/pattern fills are flattened to a solid color.");
    }
    if (style.fill === "none" && style.stroke && style.stroke !== "none") {
      warnings.push("Stroke-only paths are not extruded; give shapes a fill.");
    }
    const color = typeof style.fill === "string" && style.fill.startsWith("#") ? style.fill : "#cccccc";
    for (const shape of SVGLoader.createShapes(path)) out.push({ shape, color });
  }

  if (out.length === 0) throw new Error("SVG has no drawable filled shapes.");

  // Compute bounds across all shape points (SVG y-down; caller flips y in geometry).
  const box = new Box2();
  const v = new Vector2();
  for (const { shape } of out) for (const p of shape.getPoints(24)) box.expandByPoint(v.set(p.x, p.y));
  const size = new Vector2(); box.getSize(size);
  const center = new Vector2(); box.getCenter(center);
  const maxDim = Math.max(size.x, size.y) || 1;
  const scale = 2 / maxDim; // fit into ~2 world units

  return { shapes: out, warnings, normalize: { center: [center.x, center.y], scale } };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- logo-ingest`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/logo-ingest.ts tests/logo-ingest.test.ts tests/fixtures
git commit -m "feat: add SVG ingest with normalization and warnings"
```

---

## Task 3: Config model — `LogoAnimConfig`, defaults, formats

**Goal:** The single typed props object that flows through preview and render, with defaults and the aspect→dimension table.

**Files:**
- Create: `src/lib/config.ts`
- Test: `tests/config.test.ts`

**Interfaces:**
- Produces:
  ```ts
  type Aspect = "9:16" | "1:1" | "16:9";
  type MaterialPreset = "chrome" | "gold" | "glass" | "plastic" | "matte" | "glossy" | "neon";
  type EnvPreset = "studio" | "city" | "sunset" | "dawn" | "night";
  type LightingPreset = "soft" | "hard" | "rim";
  type AnimPreset = "spin" | "pulseBeat" | "bounce" | "wobble" | "flip" | "assemble" | "float";
  type LogoAnimConfig = { ... }   // full shape below
  const FORMATS: Record<Aspect, { width: number; height: number }>;
  const DEFAULT_CONFIG: LogoAnimConfig;
  function resolveDuration(seconds: number, fps: number): number; // → durationInFrames
  ```

- [ ] **Step 1: Write the failing test**

`tests/config.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { FORMATS, DEFAULT_CONFIG, resolveDuration } from "../src/lib/config";

describe("config", () => {
  it("maps 9:16 to 1080x1920", () => {
    expect(FORMATS["9:16"]).toEqual({ width: 1080, height: 1920 });
  });
  it("resolveDuration multiplies seconds by fps", () => {
    expect(resolveDuration(5, 30)).toBe(150);
  });
  it("DEFAULT_CONFIG is internally consistent", () => {
    expect(DEFAULT_CONFIG.format.width).toBe(FORMATS[DEFAULT_CONFIG.format.aspect].width);
    expect(DEFAULT_CONFIG.format.durationInFrames).toBe(
      resolveDuration(5, DEFAULT_CONFIG.format.fps)
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- config`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `config.ts`**

`src/lib/config.ts`:
```ts
export type Aspect = "9:16" | "1:1" | "16:9";
export type MaterialPreset = "chrome" | "gold" | "glass" | "plastic" | "matte" | "glossy" | "neon";
export type EnvPreset = "studio" | "city" | "sunset" | "dawn" | "night";
export type LightingPreset = "soft" | "hard" | "rim";
export type AnimPreset = "spin" | "pulseBeat" | "bounce" | "wobble" | "flip" | "assemble" | "float";

export type LogoAnimConfig = {
  logo: { svg: string };
  extrusion: { depth: number; bevel: number };
  material: MaterialPreset;
  scene: {
    environment: EnvPreset;
    lighting: LightingPreset;
    background: { type: "color" | "gradient"; value: string | [string, string] };
  };
  animation: { preset: AnimPreset; intensity: number };
  audio: { trackId: string };
  format: { aspect: Aspect; width: number; height: number; fps: number; durationInFrames: number };
};

export const FORMATS: Record<Aspect, { width: number; height: number }> = {
  "9:16": { width: 1080, height: 1920 },
  "1:1": { width: 1080, height: 1080 },
  "16:9": { width: 1920, height: 1080 },
};

export const resolveDuration = (seconds: number, fps: number): number => Math.round(seconds * fps);

const DEFAULT_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="20" y="20" width="60" height="60" fill="#8b5cf6"/></svg>';

export const DEFAULT_CONFIG: LogoAnimConfig = {
  logo: { svg: DEFAULT_SVG },
  extrusion: { depth: 0.35, bevel: 0.03 },
  material: "chrome",
  scene: {
    environment: "studio",
    lighting: "soft",
    background: { type: "gradient", value: ["#0b0b12", "#1b1030"] },
  },
  animation: { preset: "pulseBeat", intensity: 1 },
  audio: { trackId: "pulse-120" },
  format: { aspect: "9:16", ...FORMATS["9:16"], fps: 30, durationInFrames: resolveDuration(5, 30) },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- config`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/config.ts tests/config.test.ts
git commit -m "feat: add LogoAnimConfig model, formats, defaults"
```

---

## Task 4: `beat-engine` — frame → beat phase (pure, TDD)

**Goal:** Deterministic mapping from the current frame to a beat phase used by animation presets.

**Files:**
- Create: `src/lib/beat-engine.ts`
- Test: `tests/beat-engine.test.ts`

**Interfaces:**
- Produces:
  ```ts
  type Beatmap = { bpm: number; beats: number[]; energy?: number[] };
  type BeatState = { phase: number; sinceBeat: number; energy: number };
  function beatPhase(frame: number, fps: number, beatmap: Beatmap): BeatState;
  ```
  `phase` is 1 exactly on a beat and decays linearly to 0 just before the next beat. `energy` defaults to 1 when absent.

- [ ] **Step 1: Write the failing tests**

`tests/beat-engine.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { beatPhase, type Beatmap } from "../src/lib/beat-engine";

const bm: Beatmap = { bpm: 120, beats: [0, 0.5, 1.0], energy: [1, 0.5, 1] };

describe("beatPhase", () => {
  it("phase is 1 exactly on a beat", () => {
    expect(beatPhase(15, 30, bm).phase).toBeCloseTo(1, 5); // t=0.5 → beat
  });
  it("phase decays toward 0 between beats", () => {
    const mid = beatPhase(22, 30, bm).phase; // t≈0.733, between 0.5 and 1.0
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(0.6);
  });
  it("reports energy of the current beat", () => {
    expect(beatPhase(15, 30, bm).energy).toBeCloseTo(0.5, 5); // beat at 0.5 has energy 0.5
  });
  it("before the first beat, sinceBeat is measured from t=0", () => {
    const s = beatPhase(3, 30, bm); // t=0.1
    expect(s.sinceBeat).toBeCloseTo(0.1, 5);
  });
  it("is deterministic for the same frame", () => {
    expect(beatPhase(20, 30, bm)).toEqual(beatPhase(20, 30, bm));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- beat-engine`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `beat-engine.ts`**

`src/lib/beat-engine.ts`:
```ts
export type Beatmap = { bpm: number; beats: number[]; energy?: number[] };
export type BeatState = { phase: number; sinceBeat: number; energy: number };

export function beatPhase(frame: number, fps: number, beatmap: Beatmap): BeatState {
  const t = frame / fps;
  const { beats } = beatmap;
  const secPerBeat = beatmap.bpm > 0 ? 60 / beatmap.bpm : 0.5;

  // Find index of the most recent beat <= t.
  let idx = -1;
  for (let i = 0; i < beats.length; i++) {
    if (beats[i] <= t + 1e-9) idx = i;
    else break;
  }

  const lastBeatTime = idx >= 0 ? beats[idx] : 0;
  const nextBeatTime = idx + 1 < beats.length ? beats[idx + 1] : lastBeatTime + secPerBeat;
  const interval = Math.max(nextBeatTime - lastBeatTime, 1e-6);
  const sinceBeat = t - lastBeatTime;

  // phase: 1 at the beat, linear decay to 0 at the next beat.
  const phase = Math.max(0, 1 - sinceBeat / interval);
  const energy = idx >= 0 && beatmap.energy ? beatmap.energy[idx] ?? 1 : 1;

  return { phase, sinceBeat, energy };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- beat-engine`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/beat-engine.ts tests/beat-engine.test.ts
git commit -m "feat: add deterministic beat-phase engine"
```

---

## Task 5: `animation-presets` — transforms per preset (pure, TDD)

**Goal:** Pure function returning `{ position, rotation, scale }` for each of the seven presets, reacting to beat state and `intensity`.

**Files:**
- Create: `src/lib/animation-presets.ts`
- Test: `tests/animation-presets.test.ts`

**Interfaces:**
- Consumes: `BeatState` from `beat-engine`, `AnimPreset` from `config`.
- Produces:
  ```ts
  type Transform = { position: [number, number, number]; rotation: [number, number, number]; scale: number };
  function applyPreset(
    preset: AnimPreset, frame: number, fps: number, durationInFrames: number,
    beat: { phase: number; energy: number }, intensity: number
  ): Transform;
  ```

- [ ] **Step 1: Write the failing tests**

`tests/animation-presets.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { applyPreset } from "../src/lib/animation-presets";

const beatOn = { phase: 1, energy: 1 };
const beatOff = { phase: 0, energy: 1 };

describe("applyPreset", () => {
  it("spin rotates around Y over time", () => {
    const a = applyPreset("spin", 0, 30, 150, beatOff, 1).rotation[1];
    const b = applyPreset("spin", 30, 30, 150, beatOff, 1).rotation[1];
    expect(b).toBeGreaterThan(a);
  });

  it("pulseBeat scales up on the beat and rests at 1 off-beat", () => {
    expect(applyPreset("pulseBeat", 0, 30, 150, beatOn, 1).scale).toBeGreaterThan(1);
    expect(applyPreset("pulseBeat", 0, 30, 150, beatOff, 1).scale).toBeCloseTo(1, 5);
  });

  it("intensity 0 disables beat reactivity for pulseBeat", () => {
    expect(applyPreset("pulseBeat", 0, 30, 150, beatOn, 0).scale).toBeCloseTo(1, 5);
  });

  it("bounce lifts on the beat (positive Y)", () => {
    expect(applyPreset("bounce", 0, 30, 150, beatOn, 1).position[1]).toBeGreaterThan(0);
  });

  it("assemble starts off-center and settles by the end", () => {
    const start = applyPreset("assemble", 0, 30, 150, beatOff, 1);
    const end = applyPreset("assemble", 149, 30, 150, beatOff, 1);
    const startDist = Math.abs(start.position[2]);
    const endDist = Math.abs(end.position[2]);
    expect(endDist).toBeLessThan(startDist);
  });

  it("returns finite numbers for every preset", () => {
    for (const p of ["spin","pulseBeat","bounce","wobble","flip","assemble","float"] as const) {
      const t = applyPreset(p, 12, 30, 150, beatOn, 1);
      expect([...t.position, ...t.rotation, t.scale].every(Number.isFinite)).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- animation-presets`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `animation-presets.ts`**

`src/lib/animation-presets.ts`:
```ts
import type { AnimPreset } from "./config";

export type Transform = {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
};

type Beat = { phase: number; energy: number };
const TAU = Math.PI * 2;

export function applyPreset(
  preset: AnimPreset, frame: number, fps: number, durationInFrames: number,
  beat: Beat, intensity: number
): Transform {
  const t = frame / fps;
  const kick = beat.phase * beat.energy * intensity; // 0..1 beat impulse
  const base: Transform = { position: [0, 0, 0], rotation: [0, 0, 0], scale: 1 };

  switch (preset) {
    case "spin":
      return { ...base, rotation: [0, t * 0.9 + kick * 0.4, 0] };

    case "pulseBeat":
      return { ...base, rotation: [0, t * 0.3, 0], scale: 1 + 0.18 * kick };

    case "bounce":
      return { ...base, position: [0, 0.4 * kick, 0], rotation: [0, t * 0.3, 0] };

    case "wobble":
      return { ...base, rotation: [Math.sin(t * 2) * 0.15 + kick * 0.1, t * 0.4, Math.cos(t * 2) * 0.1] };

    case "flip": {
      // one flip per ~2s, eased by beat
      const flips = Math.floor(t / 2);
      const local = (t / 2) - flips;
      return { ...base, rotation: [0, flips * Math.PI + local * Math.PI, 0], scale: 1 + 0.08 * kick };
    }

    case "assemble": {
      const p = Math.min(1, frame / Math.max(1, durationInFrames * 0.4)); // settle over first 40%
      const eased = 1 - Math.pow(1 - p, 3);
      return { position: [0, 0, (1 - eased) * -6], rotation: [0, (1 - eased) * TAU, 0], scale: 0.6 + 0.4 * eased };
    }

    case "float":
      return { ...base, position: [0, Math.sin(t * 1.2) * 0.15, 0], rotation: [0, t * 0.25, 0] };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- animation-presets`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/animation-presets.ts tests/animation-presets.test.ts
git commit -m "feat: add seven beat-reactive animation presets"
```

---

## Task 6: Material & environment preset tables

**Goal:** Data tables translating preset ids to Three material props and drei environment/lighting settings. Small, pure config modules unit-tested for completeness.

**Files:**
- Create: `src/lib/materials.ts`, `src/lib/environments.ts`
- Test: `tests/presets.test.ts`

**Interfaces:**
- Consumes: `MaterialPreset`, `EnvPreset`, `LightingPreset` from `config`.
- Produces:
  ```ts
  // materials.ts
  type MaterialSpec = { metalness: number; roughness: number; transmission?: number; emissiveIntensity?: number; useColorFromLogo: boolean; color?: string };
  const MATERIAL_PRESETS: Record<MaterialPreset, MaterialSpec>;
  // environments.ts
  const ENV_PRESETS: Record<EnvPreset, { preset: "studio"|"city"|"sunset"|"dawn"|"night" }>; // drei <Environment preset>
  const LIGHTING_PRESETS: Record<LightingPreset, { key: number; fill: number; rim: number }>;
  ```

- [ ] **Step 1: Write the failing test**

`tests/presets.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { MATERIAL_PRESETS } from "../src/lib/materials";
import { ENV_PRESETS, LIGHTING_PRESETS } from "../src/lib/environments";

describe("preset tables", () => {
  it("has a material spec for every material preset id", () => {
    for (const k of ["chrome","gold","glass","plastic","matte","glossy","neon"] as const) {
      expect(MATERIAL_PRESETS[k]).toBeDefined();
      expect(MATERIAL_PRESETS[k].metalness).toBeGreaterThanOrEqual(0);
    }
  });
  it("glass has transmission > 0", () => {
    expect(MATERIAL_PRESETS.glass.transmission).toBeGreaterThan(0);
  });
  it("has env + lighting presets for every id", () => {
    for (const k of ["studio","city","sunset","dawn","night"] as const) expect(ENV_PRESETS[k]).toBeDefined();
    for (const k of ["soft","hard","rim"] as const) expect(LIGHTING_PRESETS[k]).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- presets`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the tables**

`src/lib/materials.ts`:
```ts
import type { MaterialPreset } from "./config";

export type MaterialSpec = {
  metalness: number; roughness: number;
  transmission?: number; emissiveIntensity?: number;
  useColorFromLogo: boolean; color?: string;
};

export const MATERIAL_PRESETS: Record<MaterialPreset, MaterialSpec> = {
  chrome:  { metalness: 1.0, roughness: 0.05, useColorFromLogo: false, color: "#dfe4ea" },
  gold:    { metalness: 1.0, roughness: 0.15, useColorFromLogo: false, color: "#ffcf40" },
  glass:   { metalness: 0.0, roughness: 0.0, transmission: 1.0, useColorFromLogo: false, color: "#ffffff" },
  plastic: { metalness: 0.0, roughness: 0.4, useColorFromLogo: true },
  matte:   { metalness: 0.0, roughness: 0.9, useColorFromLogo: true },
  glossy:  { metalness: 0.2, roughness: 0.1, useColorFromLogo: true },
  neon:    { metalness: 0.0, roughness: 0.5, emissiveIntensity: 2.0, useColorFromLogo: true },
};
```

`src/lib/environments.ts`:
```ts
import type { EnvPreset, LightingPreset } from "./config";

export const ENV_PRESETS: Record<EnvPreset, { preset: "studio"|"city"|"sunset"|"dawn"|"night" }> = {
  studio: { preset: "studio" },
  city:   { preset: "city" },
  sunset: { preset: "sunset" },
  dawn:   { preset: "dawn" },
  night:  { preset: "night" },
};

export const LIGHTING_PRESETS: Record<LightingPreset, { key: number; fill: number; rim: number }> = {
  soft: { key: 1.0, fill: 0.6, rim: 0.4 },
  hard: { key: 1.8, fill: 0.2, rim: 0.8 },
  rim:  { key: 0.7, fill: 0.3, rim: 1.6 },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- presets`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/materials.ts src/lib/environments.ts tests/presets.test.ts
git commit -m "feat: add material and environment/lighting preset tables"
```

---

## Task 7: `Logo3D` + `Scene` components

**Goal:** R3F components that render the extruded, normalized, animated, materialized logo inside a lit environment. Smoke-tested via a real 3-frame render.

**Files:**
- Create: `src/remotion/components/Logo3D.tsx`, `src/remotion/components/Scene.tsx`
- Modify: `src/remotion/LogoComposition.tsx`, `src/remotion/Root.tsx`

**Interfaces:**
- Consumes: `parseSvg`, `applyPreset`, `beatPhase`, `MATERIAL_PRESETS`, `ENV_PRESETS`, `LIGHTING_PRESETS`, `LogoAnimConfig`, `DEFAULT_CONFIG`, an in-memory beatmap (Task 8 wires the real one; here use a constant 120bpm map).
- Produces: `<Logo3D config beat frame />`, `<Scene config>{children}</Scene>`; `LogoComposition` now takes `{ config: LogoAnimConfig }`.

- [ ] **Step 1: Implement `Logo3D.tsx`**

```tsx
import { useMemo } from "react";
import * as THREE from "three";
import { parseSvg } from "@/lib/logo-ingest";
import { applyPreset } from "@/lib/animation-presets";
import { MATERIAL_PRESETS } from "@/lib/materials";
import type { LogoAnimConfig } from "@/lib/config";

export const Logo3D: React.FC<{
  config: LogoAnimConfig; frame: number; fps: number;
  beat: { phase: number; energy: number };
}> = ({ config, frame, fps, beat }) => {
  const parsed = useMemo(() => parseSvg(config.logo.svg), [config.logo.svg]);
  const spec = MATERIAL_PRESETS[config.material];

  const geoms = useMemo(() => parsed.shapes.map(({ shape, color }) => {
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: config.extrusion.depth, bevelEnabled: config.extrusion.bevel > 0,
      bevelThickness: config.extrusion.bevel, bevelSize: config.extrusion.bevel, bevelSegments: 2,
    });
    g.center();
    return { g, color };
  }), [parsed, config.extrusion.depth, config.extrusion.bevel]);

  const t = applyPreset(
    config.animation.preset, frame, fps, config.format.durationInFrames, beat, config.animation.intensity
  );
  const s = parsed.normalize.scale;

  return (
    <group position={t.position} rotation={t.rotation as [number,number,number]} scale={t.scale}>
      {/* flip Y: SVG is y-down */}
      <group scale={[s, -s, s]}>
        {geoms.map(({ g, color }, i) => (
          <mesh key={i} geometry={g}>
            <meshPhysicalMaterial
              color={spec.useColorFromLogo ? color : spec.color}
              metalness={spec.metalness} roughness={spec.roughness}
              transmission={spec.transmission ?? 0}
              emissive={spec.emissiveIntensity ? (spec.useColorFromLogo ? color : spec.color) : "#000000"}
              emissiveIntensity={spec.emissiveIntensity ?? 0}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
};
```

- [ ] **Step 2: Implement `Scene.tsx`**

```tsx
import { Environment } from "@react-three/drei";
import { ENV_PRESETS, LIGHTING_PRESETS } from "@/lib/environments";
import type { LogoAnimConfig } from "@/lib/config";

export const Scene: React.FC<{ config: LogoAnimConfig; children: React.ReactNode }> = ({ config, children }) => {
  const light = LIGHTING_PRESETS[config.scene.lighting];
  const env = ENV_PRESETS[config.scene.environment];
  return (
    <>
      <ambientLight intensity={light.fill} />
      <directionalLight position={[4, 5, 6]} intensity={light.key} />
      <directionalLight position={[-5, 2, -4]} intensity={light.rim} />
      <Environment preset={env.preset} />
      {children}
    </>
  );
};
```

- [ ] **Step 3: Wire `LogoComposition.tsx` to use them**

```tsx
import { AbsoluteFill, useCurrentFrame, useVideoConfig, Audio, staticFile } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { Scene } from "./components/Scene";
import { Logo3D } from "./components/Logo3D";
import { beatPhase, type Beatmap } from "@/lib/beat-engine";
import type { LogoAnimConfig } from "@/lib/config";

// Placeholder constant beatmap until Task 8 injects the real one.
const CONST_BEATMAP: Beatmap = { bpm: 120, beats: Array.from({ length: 32 }, (_, i) => i * 0.5) };

const bgStyle = (bg: LogoAnimConfig["scene"]["background"]): React.CSSProperties =>
  bg.type === "gradient" && Array.isArray(bg.value)
    ? { backgroundImage: `linear-gradient(160deg, ${bg.value[0]}, ${bg.value[1]})` }
    : { backgroundColor: bg.value as string };

export const LogoComposition: React.FC<{ config: LogoAnimConfig }> = ({ config }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const beat = beatPhase(frame, fps, CONST_BEATMAP);
  return (
    <AbsoluteFill style={bgStyle(config.scene.background)}>
      <ThreeCanvas width={width} height={height} camera={{ position: [0, 0, 6], fov: 45 }}>
        <Scene config={config}>
          <Logo3D config={config} frame={frame} fps={fps} beat={beat} />
        </Scene>
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 4: Update `Root.tsx` to pass `DEFAULT_CONFIG` and derive dimensions**

```tsx
import { Composition } from "remotion";
import { LogoComposition } from "./LogoComposition";
import { DEFAULT_CONFIG } from "@/lib/config";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="LogoPulse"
    component={LogoComposition}
    durationInFrames={DEFAULT_CONFIG.format.durationInFrames}
    fps={DEFAULT_CONFIG.format.fps}
    width={DEFAULT_CONFIG.format.width}
    height={DEFAULT_CONFIG.format.height}
    defaultProps={{ config: DEFAULT_CONFIG }}
  />
);
```

- [ ] **Step 5: Smoke-render a few frames to verify no crash**

Run: `npx remotion render src/remotion/index.ts LogoPulse out/smoke.mp4 --frames=0-5`
Expected: succeeds; `out/smoke.mp4` exists. (Renders the default purple extruded square with chrome material in a studio env.)

- [ ] **Step 6: Commit**

```bash
git add src/remotion tests
git commit -m "feat: render extruded, materialized, animated logo in a lit scene"
```

---

## Task 8: Bundled tracks + real beatmap injection

**Goal:** Ship one royalty-free track + its beatmap, add a track manifest, embed audio in the composition, and drive the beat engine from the real beatmap instead of the constant.

**Files:**
- Create: `src/lib/tracks.ts`, `public/assets/beatmaps/pulse-120.json`, `public/assets/tracks/pulse-120.mp3` (asset added manually — see step 1), `scripts/make-beatmap.mjs`
- Modify: `src/remotion/LogoComposition.tsx`
- Test: `tests/tracks.test.ts`

**Interfaces:**
- Produces:
  ```ts
  type Track = { id: string; title: string; bpm: number; src: string; beatmap: string };
  const TRACKS: Track[];
  function getTrack(id: string): Track;   // throws if unknown
  ```

- [ ] **Step 1: Add a royalty-free track asset**

Place a CC0/royalty-free loop at `public/assets/tracks/pulse-120.mp3` (~6s, 120 BPM). Document the source + license in `public/assets/tracks/CREDITS.md`. If none is available yet, generate a click-track placeholder:
```bash
mkdir -p public/assets/tracks
ffmpeg -f lavfi -i "sine=frequency=880:duration=0.03" -af "adelay=0|0" -t 6 \
  -filter_complex "aevalsrc=0.5*sin(2*PI*880*t)*lt(mod(t\,0.5)\,0.03):d=6" \
  public/assets/tracks/pulse-120.mp3
```

- [ ] **Step 2: Generate the beatmap**

`scripts/make-beatmap.mjs`:
```js
import { writeFileSync } from "node:fs";
const bpm = 120, dur = 6, spb = 60 / bpm;
const beats = [], energy = [];
for (let t = 0; t <= dur + 1e-9; t += spb) {
  beats.push(Number(t.toFixed(4)));
  energy.push(beats.length % 4 === 1 ? 1 : 0.6); // accent downbeats
}
writeFileSync("public/assets/beatmaps/pulse-120.json", JSON.stringify({ bpm, beats, energy }, null, 2));
console.log(`wrote ${beats.length} beats`);
```
Run: `mkdir -p public/assets/beatmaps && node scripts/make-beatmap.mjs`
Expected: prints `wrote 13 beats`; file exists.

- [ ] **Step 3: Write the failing test**

`tests/tracks.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { TRACKS, getTrack } from "../src/lib/tracks";

describe("tracks", () => {
  it("exposes at least one track", () => expect(TRACKS.length).toBeGreaterThan(0));
  it("getTrack returns a known track", () => expect(getTrack("pulse-120").bpm).toBe(120));
  it("getTrack throws on unknown id", () => expect(() => getTrack("nope")).toThrow(/unknown track/i));
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test -- tracks`
Expected: FAIL — module not found.

- [ ] **Step 5: Implement `tracks.ts`**

`src/lib/tracks.ts`:
```ts
export type Track = { id: string; title: string; bpm: number; src: string; beatmap: string };

export const TRACKS: Track[] = [
  { id: "pulse-120", title: "Pulse 120", bpm: 120,
    src: "assets/tracks/pulse-120.mp3", beatmap: "assets/beatmaps/pulse-120.json" },
];

export function getTrack(id: string): Track {
  const t = TRACKS.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown track: ${id}`);
  return t;
}
```

- [ ] **Step 6: Inject the real beatmap + audio into the composition**

Import the beatmap JSON statically and use `<Audio>`. Replace the placeholder section of `LogoComposition.tsx`:
```tsx
import { AbsoluteFill, useCurrentFrame, useVideoConfig, Audio, staticFile } from "remotion";
// ...
import { getTrack } from "@/lib/tracks";
import pulse120 from "../../public/assets/beatmaps/pulse-120.json";
import type { Beatmap } from "@/lib/beat-engine";

const BEATMAPS: Record<string, Beatmap> = { "pulse-120": pulse120 as Beatmap };
```
Then inside the component, replace the constant beatmap use:
```tsx
  const track = getTrack(config.audio.trackId);
  const beat = beatPhase(frame, fps, BEATMAPS[track.id]);
  // ...
  return (
    <AbsoluteFill style={bgStyle(config.scene.background)}>
      <ThreeCanvas width={width} height={height} camera={{ position: [0, 0, 6], fov: 45 }}>
        <Scene config={config}>
          <Logo3D config={config} frame={frame} fps={fps} beat={beat} />
        </Scene>
      </ThreeCanvas>
      <Audio src={staticFile(track.src)} />
    </AbsoluteFill>
  );
```
(Delete the now-unused `CONST_BEATMAP`.)

- [ ] **Step 7: Run tests + smoke render with audio**

Run: `npm test -- tracks`
Expected: PASS (3 tests).
Run: `npx remotion render src/remotion/index.ts LogoPulse out/beat.mp4`
Expected: `out/beat.mp4` exists with audio; logo pulses on the beat.

- [ ] **Step 8: Commit**

```bash
git add src/lib/tracks.ts src/remotion/LogoComposition.tsx scripts public/assets tests/tracks.test.ts
git commit -m "feat: bundle track + beatmap and embed audio-synced beat"
```

---

## Task 9: Editor UI — upload, panels, live `<Player>` preview

**Goal:** The React editor: upload an SVG, tweak every knob in side panels, and see a live Remotion `<Player>` preview reflecting the config in real time.

**Files:**
- Create: `src/editor/Editor.tsx`, `src/editor/panels/MaterialPanel.tsx`, `ScenePanel.tsx`, `AnimationPanel.tsx`, `MusicPanel.tsx`, `FormatPanel.tsx`, `src/editor/useConfig.ts`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `LogoComposition`, `DEFAULT_CONFIG`, `FORMATS`, `resolveDuration`, `MATERIAL_PRESETS` keys, `ENV_PRESETS`/`LIGHTING_PRESETS` keys, `TRACKS`, `parseSvg` (for upload validation/warnings).
- Produces: default-exported `Editor` client component; `useConfig()` hook returning `[config, patch]`.

- [ ] **Step 1: Config hook**

`src/editor/useConfig.ts`:
```ts
"use client";
import { useState, useCallback } from "react";
import { DEFAULT_CONFIG, type LogoAnimConfig } from "@/lib/config";

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

function merge<T>(base: T, patch: DeepPartial<T>): T {
  const out: any = Array.isArray(base) ? [...(base as any)] : { ...base };
  for (const k in patch) {
    const v: any = (patch as any)[k];
    out[k] = v && typeof v === "object" && !Array.isArray(v) ? merge((base as any)[k], v) : v;
  }
  return out;
}

export function useConfig() {
  const [config, setConfig] = useState<LogoAnimConfig>(DEFAULT_CONFIG);
  const patch = useCallback((p: DeepPartial<LogoAnimConfig>) => setConfig((c) => merge(c, p)), []);
  return [config, patch] as const;
}
```

- [ ] **Step 2: Panels (one responsibility each)**

`src/editor/panels/MaterialPanel.tsx`:
```tsx
import { MATERIAL_PRESETS } from "@/lib/materials";
import type { LogoAnimConfig, MaterialPreset } from "@/lib/config";
export const MaterialPanel: React.FC<{ config: LogoAnimConfig; patch: (p: any) => void }> = ({ config, patch }) => (
  <fieldset><legend>Material</legend>
    {(Object.keys(MATERIAL_PRESETS) as MaterialPreset[]).map((m) => (
      <label key={m} style={{ marginRight: 8 }}>
        <input type="radio" name="material" checked={config.material === m}
          onChange={() => patch({ material: m })} />{m}
      </label>
    ))}
  </fieldset>
);
```
Create `ScenePanel` (environment + lighting radios + background color inputs → `patch({ scene: {...} })`), `AnimationPanel` (preset radios + intensity range 0–2 → `patch({ animation: {...} })`), `MusicPanel` (track radios from `TRACKS` → `patch({ audio: { trackId } })`), `FormatPanel` (aspect select → also patch width/height from `FORMATS`; duration seconds range → patch `durationInFrames` via `resolveDuration`; extrusion depth/bevel ranges) following the same pattern.

- [ ] **Step 3: Editor with upload + Player**

`src/editor/Editor.tsx`:
```tsx
"use client";
import { Player } from "@remotion/player";
import { useState } from "react";
import { LogoComposition } from "@/remotion/LogoComposition";
import { parseSvg } from "@/lib/logo-ingest";
import { useConfig } from "./useConfig";
import { MaterialPanel } from "./panels/MaterialPanel";
import { ScenePanel } from "./panels/ScenePanel";
import { AnimationPanel } from "./panels/AnimationPanel";
import { MusicPanel } from "./panels/MusicPanel";
import { FormatPanel } from "./panels/FormatPanel";

export default function Editor() {
  const [config, patch] = useConfig();
  const [warn, setWarn] = useState<string[]>([]);

  const onUpload = async (file: File) => {
    const svg = await file.text();
    try {
      const parsed = parseSvg(svg);      // validate before applying
      setWarn(parsed.warnings);
      patch({ logo: { svg } });
    } catch (e) { setWarn([(e as Error).message]); }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 16, padding: 16 }}>
      <div>
        <input type="file" accept=".svg,image/svg+xml"
          onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
        {warn.map((w, i) => <p key={i} style={{ color: "#c60" }}>⚠ {w}</p>)}
        <MaterialPanel config={config} patch={patch} />
        <ScenePanel config={config} patch={patch} />
        <AnimationPanel config={config} patch={patch} />
        <MusicPanel config={config} patch={patch} />
        <FormatPanel config={config} patch={patch} />
      </div>
      <div>
        <Player
          component={LogoComposition}
          inputProps={{ config }}
          durationInFrames={config.format.durationInFrames}
          fps={config.format.fps}
          compositionWidth={config.format.width}
          compositionHeight={config.format.height}
          style={{ width: "100%", maxWidth: 405, aspectRatio: `${config.format.width}/${config.format.height}` }}
          controls loop
        />
        {/* Export button added in Task 10 */}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Mount editor on the page**

`app/page.tsx`:
```tsx
import Editor from "@/editor/Editor";
export default function Home() { return <Editor />; }
```

- [ ] **Step 5: Manual verification**

Run: `npm run dev` then open `http://localhost:3000`.
Expected: preview plays; changing material/animation/format/track updates the preview live; uploading `tests/fixtures/gradient.svg` shows the gradient warning; uploading `tests/fixtures/malformed.svg` shows the "no drawable" error and does not crash.

- [ ] **Step 6: Commit**

```bash
git add src/editor app/page.tsx
git commit -m "feat: editor UI with upload, control panels, live Player preview"
```

---

## Task 10: Render API + Export button

**Goal:** A `/api/render` route that bundles the Remotion project and renders the posted config to an MP4, plus an Export button in the editor that downloads it.

**Files:**
- Create: `app/api/render/route.ts`
- Modify: `src/editor/Editor.tsx` (add Export button + handler)
- Test: `tests/render-api.test.ts`

**Interfaces:**
- Consumes: `@remotion/bundler` `bundle`, `@remotion/renderer` `selectComposition` + `renderMedia`, `LogoAnimConfig`.
- Produces: `POST /api/render` accepting `{ config: LogoAnimConfig }`, returning `video/mp4` bytes; a `renderToFile(config, outPath)` helper exported for testing.

- [ ] **Step 1: Implement the render helper + route**

`app/api/render/route.ts`:
```ts
import { bundle } from "@remotion/bundler";
import { selectComposition, renderMedia } from "@remotion/renderer";
import { readFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { LogoAnimConfig } from "@/lib/config";

export const runtime = "nodejs";
export const maxDuration = 300;

let bundlePromise: Promise<string> | null = null;
const getBundle = () => (bundlePromise ??= bundle({ entryPoint: join(process.cwd(), "src/remotion/index.ts") }));

export async function renderToFile(config: LogoAnimConfig, outPath: string): Promise<void> {
  const serveUrl = await getBundle();
  const inputProps = { config };
  const composition = await selectComposition({ serveUrl, id: "LogoPulse", inputProps });
  await renderMedia({
    serveUrl, composition, codec: "h264", outputLocation: outPath, inputProps,
    // dimensions/fps/duration are read from the composition's calculateMetadata (see Root.tsx)
  });
}

export async function POST(req: Request) {
  try {
    const { config } = (await req.json()) as { config: LogoAnimConfig };
    const dir = await mkdtemp(join(tmpdir(), "logomotion-"));
    const out = join(dir, "logo.mp4");
    await renderToFile(config, out);
    const bytes = await readFile(out);
    return new Response(new Uint8Array(bytes), {
      headers: { "Content-Type": "video/mp4", "Content-Disposition": 'attachment; filename="logo.mp4"' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500 });
  }
}
```
Note: dimensions/fps/duration come from the composition's `calculateMetadata`. Add that to `Root.tsx` so the render honors config — update the `<Composition>` to derive metadata from props:
```tsx
// in Root.tsx <Composition ...>
calculateMetadata={({ props }) => ({
  durationInFrames: props.config.format.durationInFrames,
  fps: props.config.format.fps,
  width: props.config.format.width,
  height: props.config.format.height,
})}
```

- [ ] **Step 2: Write the failing integration test**

`tests/render-api.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderToFile } from "../app/api/render/route";
import { DEFAULT_CONFIG } from "../src/lib/config";

describe("renderToFile", () => {
  it("renders a short MP4 from a config", async () => {
    const cfg = { ...DEFAULT_CONFIG, format: { ...DEFAULT_CONFIG.format, width: 256, height: 456, durationInFrames: 15 } };
    const out = join(tmpdir(), "render-test.mp4");
    await renderToFile(cfg, out);
    expect(statSync(out).size).toBeGreaterThan(1000);
  }, 120_000);
});
```

- [ ] **Step 3: Run test to verify it fails, then passes**

Run: `npm test -- render-api`
Expected first (before route exists): FAIL. After Step 1 is in place: PASS (one test, may take ~30–90s).

- [ ] **Step 4: Add the Export button to the editor**

In `src/editor/Editor.tsx`, add state + handler and a button under the `<Player>`:
```tsx
const [rendering, setRendering] = useState(false);
const onExport = async () => {
  setRendering(true);
  try {
    const res = await fetch("/api/render", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config }),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? "Render failed");
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement("a"); a.href = url; a.download = "logo.mp4"; a.click();
    URL.revokeObjectURL(url);
  } catch (e) { alert((e as Error).message); }
  finally { setRendering(false); }
};
```
```tsx
<button onClick={onExport} disabled={rendering} style={{ marginTop: 12 }}>
  {rendering ? "Rendering…" : "Export MP4"}
</button>
```

- [ ] **Step 5: Manual end-to-end verification**

Run: `npm run dev`, customize, click **Export MP4**.
Expected: after a short render, `logo.mp4` downloads and matches the preview.

- [ ] **Step 6: Commit**

```bash
git add app/api/render/route.ts src/remotion/Root.tsx src/editor/Editor.tsx tests/render-api.test.ts
git commit -m "feat: render API + Export button producing config-accurate MP4"
```

---

## Task 11: Polish, docs, and full test pass

**Goal:** README for the open-source project, an example logo, license/credits, and a green full test run.

**Files:**
- Create: `README.md`, `LICENSE`, `public/assets/tracks/CREDITS.md`, `examples/sample-logo.svg`
- Modify: `package.json` (metadata)

**Interfaces:** none new.

- [ ] **Step 1: Write `README.md`**

Include: what it is (open-source recreation of logomotion.design's Pulse), screenshot/GIF placeholder, features (SVG→3D, 7 animation presets, materials, environments, bundled beat-synced tracks, MP4 export), quickstart (`npm i`, `npm run dev`, open localhost:3000, upload SVG, customize, Export), how rendering works (shared Remotion composition), how to add a track (drop mp3 in `public/assets/tracks`, run `node scripts/make-beatmap.mjs`, add to `TRACKS`), roadmap (Match Cut engine, PNG input, user audio + beat detection), and license.

- [ ] **Step 2: Add license + credits**

Add an MIT `LICENSE`. In `public/assets/tracks/CREDITS.md`, record each bundled track's source and license (must be CC0/royalty-free).

- [ ] **Step 3: Add an example logo**

`examples/sample-logo.svg`: a simple two-color wordmark or icon SVG for users to try immediately.

- [ ] **Step 4: Full verification**

Run: `npm test`
Expected: ALL suites pass (logo-ingest, config, beat-engine, animation-presets, presets, tracks, render-api).
Run: `npm run build`
Expected: Next build succeeds with no type errors.

- [ ] **Step 5: Commit**

```bash
git add README.md LICENSE examples public/assets/tracks/CREDITS.md package.json
git commit -m "docs: add README, license, credits, example logo"
```

---

## Self-Review Notes (spec coverage)

- **Spec §3 Architecture** → Tasks 1, 7, 9, 10 (Next.js + Remotion + shared composition + render API). ✅
- **§4 Components** → logo-ingest (T2), config (T3), beat-engine (T4), animation-presets (T5), materials/environments (T6), Logo3D/Scene (T7), tracks/audio (T8), editor (T9), render-api (T10). ✅
- **§5 Data model props** → Task 3. ✅
- **§6 Beat engine determinism** → Task 4 (pure, frame-derived). ✅
- **§7 Seven animation presets** → Task 5. ✅
- **§8 Premium knobs** (materials, lighting/env, animation, format & extrusion) → T6, T7, T9. ✅
- **§9 Editor UX flow** → Task 9. ✅
- **§10 Render service** → Task 10. ✅
- **§11 Error handling** → ingest warnings/throws (T2/T9), render error response (T10). ✅
- **§12 Testing** → Vitest units (T2,3,4,5,6,8), smoke renders (T7,8), render integration (T10). ✅
- **§13 Out of scope** → Match Cut, PNG, user-audio detection intentionally absent; noted in README roadmap (T11). ✅
- **§14 Repo shape** → matches File Structure above. ✅
- **§15 Milestones** → Tasks 1→11 follow the milestone order. ✅

No unresolved placeholders; type names (`LogoAnimConfig`, `parseSvg`, `beatPhase`, `applyPreset`, `MATERIAL_PRESETS`, `getTrack`, `renderToFile`) are consistent across tasks.
