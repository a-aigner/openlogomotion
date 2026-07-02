# End Card (Outro) Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional "End card" outro that appends a held frame after the beat-synced montage, giving users a call-to-action ending.

**Architecture:** Extend `ShowcaseConfig` with an `outro` field; derive total video length as montage + hold; split composition rendering by frame index (deterministic); add an `EndCardPanel` to the left settings pane with a reusable `FramePreview` thumbnail extracted from `FramesPanel`.

**Tech Stack:** Next.js 16 App Router, React 19, Remotion 4.0.484, TypeScript strict, Vitest 4.

## Global Constraints

- TypeScript strict; `npx tsc --noEmit` must be clean after every task
- No new npm dependencies
- No `any` leaks; immutable updates
- `"use client"` on every interactive component
- Default config has outro disabled — `totalFrames === montage` so existing render tests are unaffected
- UI tokens: background `#1a1a1a`, muted label `#6b6b6b`, accent `#2563EB`, border/light `#e5e5e5`
- Section header style: `fontSize:11, fontWeight:600, color:"#6b6b6b", textTransform:"uppercase", letterSpacing:"0.06em"`

---

### Task 1: Data model — `outro` field, `outroFrames`, `totalFrames`

**Files:**
- Modify: `src/lib/showcase-config.ts`

**Interfaces:**
- Produces:
  - `ShowcaseConfig.outro: { enabled: boolean; frame: Frame; holdSec: number }`
  - `DEFAULT_SHOWCASE_CONFIG.outro = { enabled: false, frame: { kind: "solid", variant: "normal", color: "#111111" }, holdSec: 2 }`
  - `export function outroFrames(c: ShowcaseConfig): number`
  - `export function totalFrames(c: ShowcaseConfig): number`

- [ ] **Step 1: Write failing tests**

In `tests/outro.test.ts` (new file):

```ts
import { describe, it, expect } from "vitest";
import {
  DEFAULT_SHOWCASE_CONFIG,
  outroFrames,
  totalFrames,
  type ShowcaseConfig,
} from "../src/lib/showcase-config";

const BASE: ShowcaseConfig = {
  ...DEFAULT_SHOWCASE_CONFIG,
  format: { ...DEFAULT_SHOWCASE_CONFIG.format, durationInFrames: 180, fps: 30 },
};

describe("outroFrames / totalFrames", () => {
  it("outroFrames returns 0 when disabled", () => {
    const c: ShowcaseConfig = { ...BASE, outro: { enabled: false, frame: { kind: "solid", variant: "normal", color: "#111" }, holdSec: 2 } };
    expect(outroFrames(c)).toBe(0);
  });

  it("totalFrames equals montage when disabled", () => {
    const c: ShowcaseConfig = { ...BASE, outro: { enabled: false, frame: { kind: "solid", variant: "normal", color: "#111" }, holdSec: 2 } };
    expect(totalFrames(c)).toBe(180);
  });

  it("outroFrames returns round(holdSec * fps) when enabled", () => {
    const c: ShowcaseConfig = { ...BASE, outro: { enabled: true, frame: { kind: "solid", variant: "normal", color: "#e11" }, holdSec: 1 } };
    expect(outroFrames(c)).toBe(30); // round(1 * 30)
  });

  it("totalFrames equals montage + outro when enabled", () => {
    const c: ShowcaseConfig = { ...BASE, outro: { enabled: true, frame: { kind: "solid", variant: "normal", color: "#e11" }, holdSec: 1.5 } };
    expect(totalFrames(c)).toBe(180 + Math.round(1.5 * 30)); // 180 + 45 = 225
  });

  it("DEFAULT_SHOWCASE_CONFIG has outro disabled", () => {
    expect(DEFAULT_SHOWCASE_CONFIG.outro.enabled).toBe(false);
    expect(totalFrames(DEFAULT_SHOWCASE_CONFIG)).toBe(DEFAULT_SHOWCASE_CONFIG.format.durationInFrames);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/andreaigner/Advertisement/logomotion && npx vitest run tests/outro.test.ts
```
Expected: FAIL — `outroFrames` not exported, `ShowcaseConfig` has no `outro` field.

- [ ] **Step 3: Implement data model changes**

In `src/lib/showcase-config.ts`, add after the existing type exports and before `ShowcaseConfig`:

```ts
export type ShowcaseConfig = {
  logo: { src: string; kind: "svg" | "raster" };
  logoSizePct: number;
  frames: Frame[];
  audio: AudioSource;
  cutTimes: number[];
  cutDensity: number;
  onsetSensitivity: number;
  format: { aspect: Aspect; width: number; height: number; fps: number; durationInFrames: number };
  outro: { enabled: boolean; frame: Frame; holdSec: number };
};
```

Update `DEFAULT_SHOWCASE_CONFIG` to add:
```ts
outro: { enabled: false, frame: { kind: "solid", variant: "normal", color: "#111111" }, holdSec: 2 },
```

Add the two pure helpers at the end of the file:
```ts
export function outroFrames(c: ShowcaseConfig): number {
  return c.outro.enabled ? Math.round(c.outro.holdSec * c.format.fps) : 0;
}

export function totalFrames(c: ShowcaseConfig): number {
  return c.format.durationInFrames + outroFrames(c);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/andreaigner/Advertisement/logomotion && npx vitest run tests/outro.test.ts
```
Expected: 5 tests PASS.

- [ ] **Step 5: Run tsc**

```bash
cd /Users/andreaigner/Advertisement/logomotion && npx tsc --noEmit
```
Expected: clean (0 errors).

- [ ] **Step 6: Commit**

```bash
cd /Users/andreaigner/Advertisement/logomotion && git add src/lib/showcase-config.ts tests/outro.test.ts && git commit -m "feat: add outro field to ShowcaseConfig with outroFrames/totalFrames helpers"
```

---

### Task 2: Composition split — outro frame rendering

**Files:**
- Modify: `src/remotion/ShowcaseComposition.tsx`

**Interfaces:**
- Consumes: `ShowcaseConfig.outro`, `ShowcaseConfig.format.durationInFrames` from Task 1
- Produces: deterministic split — frames >= `montage` render `config.outro.frame`; frames < `montage` use existing cycle logic

- [ ] **Step 1: Implement the composition split**

Replace the body of `ShowcaseComposition.tsx` with:

```tsx
import { AbsoluteFill, useCurrentFrame, useVideoConfig, Audio, Img, staticFile } from "remotion";
import { cutIndexAt, pickFrame } from "@/lib/cut-sequencer";
import { getTrack } from "@/lib/tracks";
import { DEFAULT_SHOWCASE_CONFIG, type ShowcaseConfig } from "@/lib/showcase-config";
import { FrameBackground } from "./components/FrameBackground";

export const ShowcaseComposition: React.FC<{ config: ShowcaseConfig }> = ({ config }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  const frames = config.frames.length > 0 ? config.frames : DEFAULT_SHOWCASE_CONFIG.frames;
  const cutTimes = config.cutTimes.length > 0 ? config.cutTimes : DEFAULT_SHOWCASE_CONFIG.cutTimes;

  const montage = config.format.durationInFrames;
  const inOutro = config.outro.enabled && frame >= montage;
  const current = inOutro
    ? config.outro.frame
    : pickFrame(frames, cutIndexAt(frame, fps, cutTimes));

  const size = Math.min(width, height) * config.logoSizePct;
  const logoFilter = current.variant === "inverted" ? "invert(1)" : "none";
  const audioSrc =
    config.audio.kind === "bundled" ? staticFile(getTrack(config.audio.trackId).src) : config.audio.src;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <FrameBackground frame={current} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <Img src={config.logo.src} style={{ width: size, height: size, objectFit: "contain", filter: logoFilter }} />
      </AbsoluteFill>
      <Audio src={audioSrc} />
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Run tsc**

```bash
cd /Users/andreaigner/Advertisement/logomotion && npx tsc --noEmit
```
Expected: clean.

- [ ] **Step 3: Commit**

```bash
cd /Users/andreaigner/Advertisement/logomotion && git add src/remotion/ShowcaseComposition.tsx && git commit -m "feat: split ShowcaseComposition to render outro frame after montage"
```

---

### Task 3: Root metadata — use `totalFrames`

**Files:**
- Modify: `src/remotion/Root.tsx`

**Interfaces:**
- Consumes: `totalFrames` from Task 1 (`src/lib/showcase-config`)

- [ ] **Step 1: Update Root.tsx**

Replace the file content:

```tsx
import { Composition } from "remotion";
import { ShowcaseComposition } from "./ShowcaseComposition";
import { DEFAULT_SHOWCASE_CONFIG, totalFrames, type ShowcaseConfig } from "@/lib/showcase-config";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="LogoShowcase"
    component={ShowcaseComposition}
    durationInFrames={totalFrames(DEFAULT_SHOWCASE_CONFIG)}
    fps={DEFAULT_SHOWCASE_CONFIG.format.fps}
    width={DEFAULT_SHOWCASE_CONFIG.format.width}
    height={DEFAULT_SHOWCASE_CONFIG.format.height}
    defaultProps={{ config: DEFAULT_SHOWCASE_CONFIG }}
    calculateMetadata={({ props }: { props: { config: ShowcaseConfig } }) => ({
      durationInFrames: totalFrames(props.config),
      fps: props.config.format.fps,
      width: props.config.format.width,
      height: props.config.format.height,
    })}
  />
);
```

- [ ] **Step 2: Run tsc**

```bash
cd /Users/andreaigner/Advertisement/logomotion && npx tsc --noEmit
```
Expected: clean.

- [ ] **Step 3: Commit**

```bash
cd /Users/andreaigner/Advertisement/logomotion && git add src/remotion/Root.tsx && git commit -m "feat: Root calculateMetadata uses totalFrames to include outro hold"
```

---

### Task 4: Extract `FramePreview` into its own file

**Files:**
- Create: `src/editor/showcase/FramePreview.tsx`
- Modify: `src/editor/showcase/FramesPanel.tsx`

**Interfaces:**
- Produces: `export const FramePreview: React.FC<{ frame: Frame; logoSrc: string; logoSizePct: number }>`

- [ ] **Step 1: Create `FramePreview.tsx`**

Create `src/editor/showcase/FramePreview.tsx`:

```tsx
"use client";
import type { Frame } from "@/lib/showcase-config";

const PREVIEW_H = 44;
const PREVIEW_W = Math.round((PREVIEW_H * 9) / 16);

export const FramePreview: React.FC<{ frame: Frame; logoSrc: string; logoSizePct: number }> = ({
  frame,
  logoSrc,
  logoSizePct,
}) => {
  const inverted = frame.variant === "inverted";
  const logoSize = Math.min(PREVIEW_W, PREVIEW_H) * logoSizePct;
  let bg: React.ReactNode;
  if (frame.kind === "solid") {
    bg = <div style={{ position: "absolute", inset: 0, background: frame.color }} />;
  } else if (frame.kind === "palette") {
    bg = (
      <div style={{ position: "absolute", inset: 0, display: "flex" }}>
        {frame.colors.map((c, i) => (
          <div key={i} style={{ flex: 1, background: c }} />
        ))}
      </div>
    );
  } else {
    bg = (
      <img
        src={frame.src}
        alt=""
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: frame.fit }}
      />
    );
  }
  return (
    <div
      title={`${frame.kind}${inverted ? " (inverted)" : ""}`}
      style={{
        position: "relative",
        width: PREVIEW_W,
        height: PREVIEW_H,
        flexShrink: 0,
        borderRadius: 3,
        overflow: "hidden",
        border: "1px solid #e5e5e5",
        background: "#000",
      }}
    >
      {bg}
      <img
        src={logoSrc}
        alt=""
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: logoSize,
          height: logoSize,
          transform: "translate(-50%, -50%)",
          objectFit: "contain",
          filter: inverted ? "invert(1)" : "none",
        }}
      />
    </div>
  );
};
```

- [ ] **Step 2: Update `FramesPanel.tsx` to import from the new file**

Remove the `FramePreview` component definition from `FramesPanel.tsx` (lines 10–68) and replace with:
```tsx
import { FramePreview } from "./FramePreview";
```
Also remove `const PREVIEW_H = 44;` and `const PREVIEW_W = Math.round((PREVIEW_H * 9) / 16);` constants (they now live in `FramePreview.tsx`).

The updated top of `FramesPanel.tsx` should look like:
```tsx
"use client";
import { useRef, useState } from "react";
import type { ShowcaseConfig, Frame } from "@/lib/showcase-config";
import { FramePreview } from "./FramePreview";
```

- [ ] **Step 3: Run tsc**

```bash
cd /Users/andreaigner/Advertisement/logomotion && npx tsc --noEmit
```
Expected: clean.

- [ ] **Step 4: Run all tests**

```bash
cd /Users/andreaigner/Advertisement/logomotion && npx vitest run
```
Expected: all tests pass (FramePreview extraction is UI-only, no logic change).

- [ ] **Step 5: Commit**

```bash
cd /Users/andreaigner/Advertisement/logomotion && git add src/editor/showcase/FramePreview.tsx src/editor/showcase/FramesPanel.tsx && git commit -m "refactor: extract FramePreview into its own file for reuse"
```

---

### Task 5: Add `setOutroFrame` to the hook

**Files:**
- Modify: `src/editor/showcase/useShowcaseConfig.ts`

**Interfaces:**
- Consumes: `ShowcaseConfig.outro.frame: Frame` from Task 1
- Produces: `setOutroFrame: (frame: Frame) => void` returned from `useShowcaseConfig()`

- [ ] **Step 1: Add `setOutroFrame` to the hook**

Update `src/editor/showcase/useShowcaseConfig.ts`:

```ts
"use client";
import { useState, useCallback } from "react";
import { DEFAULT_SHOWCASE_CONFIG, type ShowcaseConfig, type Frame } from "@/lib/showcase-config";

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
  const setFrames = useCallback((frames: ShowcaseConfig["frames"]) => setConfig((c) => ({ ...c, frames })), []);
  const setCutTimes = useCallback((cutTimes: number[]) => setConfig((c) => ({ ...c, cutTimes })), []);
  const setOutroFrame = useCallback(
    (frame: Frame) => setConfig((c) => ({ ...c, outro: { ...c.outro, frame } })),
    []
  );
  return { config, patch, setFrames, setCutTimes, setOutroFrame } as const;
}
```

- [ ] **Step 2: Run tsc**

```bash
cd /Users/andreaigner/Advertisement/logomotion && npx tsc --noEmit
```
Expected: clean.

- [ ] **Step 3: Commit**

```bash
cd /Users/andreaigner/Advertisement/logomotion && git add src/editor/showcase/useShowcaseConfig.ts && git commit -m "feat: add setOutroFrame setter to useShowcaseConfig"
```

---

### Task 6: Create `EndCardPanel`

**Files:**
- Create: `src/editor/showcase/EndCardPanel.tsx`

**Interfaces:**
- Consumes:
  - `config: ShowcaseConfig` (full config including `outro`)
  - `patch: (p: DeepPartial<ShowcaseConfig>) => void`
  - `setOutroFrame: (frame: Frame) => void`
  - `FramePreview` from `./FramePreview`

- [ ] **Step 1: Create `EndCardPanel.tsx`**

Create `src/editor/showcase/EndCardPanel.tsx`:

```tsx
"use client";
import type { ShowcaseConfig, Frame, FrameVariant } from "@/lib/showcase-config";
import type { DeepPartial } from "./useShowcaseConfig";
import { FramePreview } from "./FramePreview";

export const EndCardPanel: React.FC<{
  config: ShowcaseConfig;
  patch: (p: DeepPartial<ShowcaseConfig>) => void;
  setOutroFrame: (frame: Frame) => void;
}> = ({ config, patch, setOutroFrame }) => {
  const { outro } = config;

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: "#6b6b6b",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  };

  const iconBtnStyle: React.CSSProperties = {
    padding: "2px 6px",
    border: "1px solid #e5e5e5",
    borderRadius: 4,
    background: "#ffffff",
    color: "#1a1a1a",
    cursor: "pointer",
    fontSize: 11,
    lineHeight: "16px",
  };

  const typeBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: "4px 10px",
    border: `1px solid ${active ? "#2563EB" : "#e5e5e5"}`,
    borderRadius: 4,
    background: active ? "#eff6ff" : "#ffffff",
    color: active ? "#2563EB" : "#1a1a1a",
    cursor: "pointer",
    fontSize: 11,
    fontWeight: active ? 600 : 400,
  });

  const colorInputStyle: React.CSSProperties = {
    width: 22,
    height: 22,
    border: "1px solid #e5e5e5",
    borderRadius: 3,
    padding: 1,
    cursor: "pointer",
  };

  const currentVariant: FrameVariant = outro.frame.variant;

  const handleKindSolid = () => {
    setOutroFrame({ kind: "solid", variant: currentVariant, color: "#2563EB" });
  };

  const handleKindPalette = () => {
    setOutroFrame({ kind: "palette", variant: currentVariant, colors: ["#2563EB", "#111111"] });
  };

  const handleKindImage = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,.png,.jpg,.jpeg,.webp,.svg";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        setOutroFrame({ kind: "image", variant: currentVariant, src: reader.result as string, fit: "cover" });
      };
      reader.onerror = () => alert("Could not read that image file.");
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleReplaceImage = (file: File) => {
    if (outro.frame.kind !== "image") return;
    const reader = new FileReader();
    reader.onload = () => {
      if (outro.frame.kind === "image") {
        setOutroFrame({ ...outro.frame, src: reader.result as string });
      }
    };
    reader.onerror = () => alert("Could not read that image file.");
    reader.readAsDataURL(file);
  };

  const handleInvert = () => {
    setOutroFrame({ ...outro.frame, variant: outro.frame.variant === "inverted" ? "normal" : "inverted" });
  };

  return (
    <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid #e5e5e5" }}>
      <span style={sectionLabelStyle}>End Card</span>
      <div style={{ marginTop: 10 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#1a1a1a", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={outro.enabled}
            onChange={(e) => patch({ outro: { enabled: e.target.checked } })}
          />
          Add an end card
        </label>
      </div>

      {outro.enabled && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Preview thumbnail */}
          <FramePreview frame={outro.frame} logoSrc={config.logo.src} logoSizePct={config.logoSizePct} />

          {/* Kind buttons */}
          <div style={{ display: "flex", gap: 4 }}>
            <button style={typeBtnStyle(outro.frame.kind === "solid")} onClick={handleKindSolid}>Solid</button>
            <button style={typeBtnStyle(outro.frame.kind === "palette")} onClick={handleKindPalette}>Palette</button>
            <button style={typeBtnStyle(outro.frame.kind === "image")} onClick={handleKindImage}>Image</button>
          </div>

          {/* Per-kind editing */}
          {outro.frame.kind === "solid" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: "#6b6b6b" }}>Color</span>
              <input
                type="color"
                value={outro.frame.color}
                style={colorInputStyle}
                onChange={(e) => {
                  if (outro.frame.kind === "solid") {
                    setOutroFrame({ ...outro.frame, color: e.target.value });
                  }
                }}
              />
            </div>
          )}

          {outro.frame.kind === "palette" && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: "#6b6b6b" }}>Colors</span>
              {outro.frame.colors.map((c, ci) => (
                <input
                  key={ci}
                  type="color"
                  value={c}
                  style={colorInputStyle}
                  onChange={(e) => {
                    if (outro.frame.kind === "palette") {
                      setOutroFrame({
                        ...outro.frame,
                        colors: outro.frame.colors.map((x, xi) => (xi === ci ? e.target.value : x)),
                      });
                    }
                  }}
                />
              ))}
            </div>
          )}

          {outro.frame.kind === "image" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", gap: 4 }}>
                <label style={{ ...iconBtnStyle, cursor: "pointer" }}>
                  Replace image…
                  <input
                    type="file"
                    accept="image/*,.png,.jpg,.jpeg,.webp,.svg"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleReplaceImage(file);
                    }}
                  />
                </label>
                <button
                  style={{ ...iconBtnStyle, fontWeight: outro.frame.fit === "cover" ? 600 : 400 }}
                  onClick={() => {
                    if (outro.frame.kind === "image") setOutroFrame({ ...outro.frame, fit: "cover" });
                  }}
                >
                  Cover{outro.frame.fit === "cover" ? " ✓" : ""}
                </button>
                <button
                  style={{ ...iconBtnStyle, fontWeight: outro.frame.fit === "contain" ? 600 : 400 }}
                  onClick={() => {
                    if (outro.frame.kind === "image") setOutroFrame({ ...outro.frame, fit: "contain" });
                  }}
                >
                  Contain{outro.frame.fit === "contain" ? " ✓" : ""}
                </button>
              </div>
            </div>
          )}

          {/* Invert toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button style={iconBtnStyle} onClick={handleInvert} title="Invert logo">◐</button>
            <span style={{ fontSize: 11, color: "#6b6b6b" }}>
              {outro.frame.variant === "inverted" ? "Logo inverted" : "Logo normal"}
            </span>
          </div>

          {/* Hold duration slider */}
          <label style={{ fontSize: 12, color: "#6b6b6b", display: "block" }}>
            Hold: {outro.holdSec}s
            <input
              type="range"
              min={0.5}
              max={5}
              step={0.5}
              value={outro.holdSec}
              style={{ width: "100%", marginTop: 4 }}
              onChange={(e) => patch({ outro: { holdSec: Number(e.target.value) } })}
            />
          </label>
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Run tsc**

```bash
cd /Users/andreaigner/Advertisement/logomotion && npx tsc --noEmit
```
Expected: clean.

- [ ] **Step 3: Commit**

```bash
cd /Users/andreaigner/Advertisement/logomotion && git add src/editor/showcase/EndCardPanel.tsx && git commit -m "feat: add EndCardPanel with frame type buttons, color controls, invert toggle, hold slider"
```

---

### Task 7: Wire EndCardPanel into ShowcaseEditor

**Files:**
- Modify: `src/editor/showcase/ShowcaseEditor.tsx`

**Interfaces:**
- Consumes:
  - `totalFrames` from `@/lib/showcase-config`
  - `setOutroFrame` from `useShowcaseConfig` (Task 5)
  - `EndCardPanel` from `./EndCardPanel` (Task 6)

- [ ] **Step 1: Update ShowcaseEditor.tsx**

Replace the file content:

```tsx
"use client";
import { Player } from "@remotion/player";
import { useState } from "react";
import { ShowcaseComposition } from "@/remotion/ShowcaseComposition";
import { isSupportedLogo, logoKind, svgToDataUrl } from "@/lib/logo-src";
import { parseSvg } from "@/lib/logo-ingest";
import { totalFrames } from "@/lib/showcase-config";
import { useShowcaseConfig } from "./useShowcaseConfig";
import { FramesPanel } from "./FramesPanel";
import { ShowcaseControls } from "./ShowcaseControls";
import { AudioPanel } from "./AudioPanel";
import { EndCardPanel } from "./EndCardPanel";

export default function ShowcaseEditor() {
  const { config, patch, setFrames, setCutTimes, setOutroFrame } = useShowcaseConfig();
  const [warn, setWarn] = useState<string[]>([]);

  const onUpload = async (file: File) => {
    if (!isSupportedLogo(file.type, file.name)) { setWarn(["Unsupported file. Use SVG, PNG, JPEG, or WebP."]); return; }
    const kind = logoKind(file.type, file.name);
    try {
      if (kind === "svg") {
        const svg = await file.text();
        setWarn(parseSvg(svg).warnings);
        patch({ logo: { src: svgToDataUrl(svg), kind } });
      } else {
        const src = await new Promise<string>((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(r.result as string); r.onerror = () => rej(r.error); r.readAsDataURL(file);
        });
        setWarn([]); patch({ logo: { src, kind } });
      }
    } catch (e) { setWarn([(e as Error).message]); }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "340px 1fr 320px", height: "calc(100vh - 48px)", overflow: "hidden" }}>
      {/* Left: logo drop + audio + end card + controls */}
      <div style={{ padding: 20, borderRight: "1px solid #e5e5e5", overflowY: "auto", background: "#ffffff" }}>
        <label style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          minHeight: 180,
          border: "1px solid #e5e5e5",
          borderRadius: 10,
          cursor: "pointer",
          padding: 24,
          background: "#fafafa",
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>Drop your logo</span>
          <span style={{ fontSize: 12, color: "#6b6b6b", textAlign: "center" }}>
            or click to browse · PNG, SVG, JPEG, WebP
          </span>
          <input
            type="file"
            accept=".svg,.png,.jpg,.jpeg,.webp,image/*"
            style={{ display: "none" }}
            onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
          />
        </label>
        {warn.map((w, i) => (
          <p key={i} style={{ color: "#c60", fontSize: 12, marginTop: 8 }}>⚠ {w}</p>
        ))}
        <div style={{ marginTop: 16 }}>
          <AudioPanel config={config} patch={patch} setCutTimes={setCutTimes} />
          <EndCardPanel config={config} patch={patch} setOutroFrame={setOutroFrame} />
          <ShowcaseControls config={config} patch={patch} />
        </div>
      </div>

      {/* Center: dark letterbox */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#3f3f46",
        padding: 24,
        overflow: "hidden",
      }}>
        <Player
          component={ShowcaseComposition}
          inputProps={{ config }}
          durationInFrames={totalFrames(config)}
          fps={config.format.fps}
          compositionWidth={config.format.width}
          compositionHeight={config.format.height}
          style={{
            width: "auto",
            height: "100%",
            maxHeight: "calc(100vh - 48px - 48px)",
            maxWidth: "100%",
            aspectRatio: `${config.format.width}/${config.format.height}`,
            borderRadius: 8,
            overflow: "hidden",
          }}
          controls
          loop
        />
      </div>

      {/* Right: frames list only */}
      <div style={{ borderLeft: "1px solid #e5e5e5", background: "#ffffff", overflowY: "auto" }}>
        <FramesPanel config={config} setFrames={setFrames} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run tsc**

```bash
cd /Users/andreaigner/Advertisement/logomotion && npx tsc --noEmit
```
Expected: clean.

- [ ] **Step 3: Run all tests**

```bash
cd /Users/andreaigner/Advertisement/logomotion && npx vitest run
```
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
cd /Users/andreaigner/Advertisement/logomotion && git add src/editor/showcase/ShowcaseEditor.tsx && git commit -m "feat: wire EndCardPanel into ShowcaseEditor; Player uses totalFrames"
```

---

### Task 8: Build verification and smoke render

**Files:** None modified — verification only.

- [ ] **Step 1: Run full test suite**

```bash
cd /Users/andreaigner/Advertisement/logomotion && npx vitest run
```
Expected: all tests pass including outro.test.ts.

- [ ] **Step 2: Run TypeScript check**

```bash
cd /Users/andreaigner/Advertisement/logomotion && npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 3: Run Next.js build**

```bash
cd /Users/andreaigner/Advertisement/logomotion && npm run build
```
Expected: build succeeds.

- [ ] **Step 4: Smoke render with outro enabled**

Create a temporary props file and render to verify total frame count and outro frame content:

```bash
# Write props file
cat > /tmp/outro-smoke-props.json << 'EOF'
{
  "config": {
    "logo": {
      "src": "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20100%20100%22%3E%3Crect%20x%3D%2215%22%20y%3D%2215%22%20width%3D%2270%22%20height%3D%2270%22%20rx%3D%2210%22%20fill%3D%22%23111111%22%2F%3E%3C%2Fsvg%3E",
      "kind": "svg"
    },
    "logoSizePct": 0.4,
    "frames": [
      { "kind": "solid", "variant": "normal", "color": "#2563EB" },
      { "kind": "solid", "variant": "inverted", "color": "#111111" }
    ],
    "audio": { "kind": "bundled", "trackId": "pulse-120" },
    "cutTimes": [0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75],
    "cutDensity": 1,
    "onsetSensitivity": 8,
    "format": { "aspect": "9:16", "width": 256, "height": 456, "fps": 30, "durationInFrames": 12 },
    "outro": {
      "enabled": true,
      "frame": { "kind": "solid", "variant": "normal", "color": "#ee1111" },
      "holdSec": 1
    }
  }
}
EOF

cd /Users/andreaigner/Advertisement/logomotion && npx remotion render src/remotion/index.ts LogoShowcase /tmp/outro-smoke.mp4 --props=/tmp/outro-smoke-props.json --frames=0-42
```

Expected: renders 43 frames (frames 0 through 42 = 12 montage + 30 outro + 1 = 43 total, 0-indexed). Total frames = 12 + round(1*30) = 42 frames long (frames 0..41), so `--frames=0-41` covers all.

Note: Use `--frames=0-41` for the full render (frame indices 0-based). The render exits cleanly; frame count in output is 42 (12 montage + 30 outro).

- [ ] **Step 5: Write the smoke render verification test in `tests/outro.test.ts`**

The test already covers the pure logic. Smoke render is CLI-only. Report the frame count observed in the render log.

- [ ] **Step 6: Clean up temp files**

```bash
rm -f /tmp/outro-smoke-props.json /tmp/outro-smoke.mp4
```

- [ ] **Step 7: Write report**

Write report to `/Users/andreaigner/Advertisement/logomotion/.superpowers/sdd/E1-report.md`.

---

## Self-Review

**Spec coverage checklist:**

| Requirement | Task |
|---|---|
| `outro: { enabled, frame, holdSec }` added to `ShowcaseConfig` | Task 1 |
| Default `{ enabled: false, frame: solid #111, holdSec: 2 }` | Task 1 |
| `outroFrames()` helper exported | Task 1 |
| `totalFrames()` helper exported | Task 1 |
| Composition splits at `montage` frame index | Task 2 |
| Outro frame renders (no cuts, held single frame) | Task 2 |
| Audio unchanged during outro | Task 2 |
| `Root.tsx` uses `totalFrames` in `calculateMetadata` | Task 3 |
| `FramePreview` extracted to own file | Task 4 |
| `FramesPanel` imports from extracted file | Task 4 |
| `setOutroFrame` setter added to hook | Task 5 |
| `EndCardPanel` created with toggle | Task 6 |
| `EndCardPanel` type buttons (Solid/Palette/Image) | Task 6 |
| `EndCardPanel` per-kind editing (color/palette/image) | Task 6 |
| `EndCardPanel` invert toggle (◐) | Task 6 |
| `EndCardPanel` hold slider (0.5–5, step 0.5) | Task 6 |
| Image reads guarded with `reader.onerror` | Task 6 |
| `EndCardPanel` mounted in left pane before `ShowcaseControls` | Task 7 |
| Player uses `totalFrames(config)` | Task 7 |
| `outro.test.ts` unit tests | Task 1 |
| Build succeeds | Task 8 |
| tsc clean | Tasks 1-7 (each step) |
| Smoke render verification | Task 8 |
| Report written | Task 8 |

**Placeholder scan:** None found — all steps include actual code.

**Type consistency check:**
- `Frame` type used from `@/lib/showcase-config` consistently
- `FrameVariant` used for `currentVariant` in `EndCardPanel`
- `DeepPartial<ShowcaseConfig>` used in `patch` everywhere
- `setOutroFrame: (frame: Frame) => void` signature consistent across Task 5, 6, 7
- `totalFrames(config)` called with `ShowcaseConfig` in Tasks 3, 7 — matches signature `(c: ShowcaseConfig): number`
