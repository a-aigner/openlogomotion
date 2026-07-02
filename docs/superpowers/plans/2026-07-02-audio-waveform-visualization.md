# Audio Waveform Visualization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a canvas waveform + cut-marker timeline to the Showcase editor's AudioPanel so the user can see where cuts land relative to the audio.

**Architecture:** A pure `computePeaks` util splits Float32Array samples into N buckets and returns normalized 0..1 peaks. A `"use client"` canvas component (`AudioTimeline`) draws the waveform (vertically mirrored, muted color) plus vertical cut-marker lines. `AudioPanel` stores `{ samples, sampleRate, duration }` for both upload and bundled tracks, decoding the bundled track via a new `decodeAudioUrl` helper, then renders `<AudioTimeline>` below existing controls.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, HTML Canvas API, Web Audio API (browser-only), Vitest (node env).

## Global Constraints

- TypeScript strict — `npx tsc --noEmit` must be clean.
- No new npm dependencies.
- `"use client"` on all browser-only components.
- Do NOT modify `ShowcaseConfig`, composition, or render API.
- Do NOT break existing tests (`npm test` all pass).
- `npm run build` must succeed.
- Styling tokens: `#1a1a1a` / `#6b6b6b` / `#2563EB` / `#e5e5e5` / `#f3f3f3`.
- Waveform bar color: `#9aa0aa`; background: `#f3f3f3`; cut marker: `#2563EB`.
- Canvas height: 64px; full panel width.
- Cut-marker x = `(t / duration) * canvasWidthPx`.
- Vitest environment: `node` (no happy-dom for waveform test — `computePeaks` is pure).

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/lib/waveform.ts` | Create | Pure `computePeaks(samples, buckets): number[]` |
| `tests/waveform.test.ts` | Create | Unit tests for `computePeaks` |
| `src/lib/audio-analyze.ts` | Modify | Add `decodeAudioUrl(url): Promise<{samples,sampleRate,duration}>` |
| `src/editor/showcase/AudioTimeline.tsx` | Create | Canvas component: waveform + cut markers |
| `src/editor/showcase/AudioPanel.tsx` | Modify | Track `duration`, decode bundled, render `<AudioTimeline>` |

---

### Task 1: Pure waveform utility + unit tests

**Files:**
- Create: `src/lib/waveform.ts`
- Create: `tests/waveform.test.ts`

**Interfaces:**
- Produces: `computePeaks(samples: Float32Array, buckets: number): number[]`
  - Returns `[]` if `buckets <= 0` or `samples.length === 0`
  - Each element is `max(abs(sample))` in that window, normalized so the global maximum maps to 1.0
  - Result length === `buckets` (exactly)

- [ ] **Step 1: Write the failing tests**

Create `tests/waveform.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { computePeaks } from "../src/lib/waveform";

describe("computePeaks", () => {
  it("returns empty array for buckets <= 0", () => {
    const samples = new Float32Array([0.1, 0.2]);
    expect(computePeaks(samples, 0)).toEqual([]);
    expect(computePeaks(samples, -1)).toEqual([]);
  });

  it("returns empty array for empty samples", () => {
    expect(computePeaks(new Float32Array(0), 4)).toEqual([]);
  });

  it("result length equals buckets", () => {
    const samples = new Float32Array(1000).map((_, i) => Math.sin(i * 0.1));
    expect(computePeaks(samples, 8)).toHaveLength(8);
    expect(computePeaks(samples, 1)).toHaveLength(1);
    expect(computePeaks(samples, 100)).toHaveLength(100);
  });

  it("all-silence returns all zeros", () => {
    const samples = new Float32Array(256); // all 0
    const peaks = computePeaks(samples, 4);
    expect(peaks).toHaveLength(4);
    expect(peaks.every((p) => p === 0)).toBe(true);
  });

  it("impulse in first bucket → first bucket is 1, others near 0", () => {
    // 400 samples; impulse at index 10 (bucket 0 of 4 — window size = 100)
    const samples = new Float32Array(400);
    samples[10] = 0.8;
    const peaks = computePeaks(samples, 4);
    expect(peaks).toHaveLength(4);
    expect(peaks[0]).toBeCloseTo(1.0); // normalized: 0.8/0.8 = 1
    expect(peaks[1]).toBe(0);
    expect(peaks[2]).toBe(0);
    expect(peaks[3]).toBe(0);
  });

  it("ramp signal: peak per bucket increases monotonically", () => {
    // 400 samples; value = index/400 (ramps 0→~1)
    const samples = Float32Array.from({ length: 400 }, (_, i) => i / 400);
    const peaks = computePeaks(samples, 4);
    expect(peaks).toHaveLength(4);
    // Each bucket has a higher peak than the previous
    for (let i = 1; i < peaks.length; i++) {
      expect(peaks[i]).toBeGreaterThan(peaks[i - 1]);
    }
    // Last bucket peak is normalized to 1
    expect(peaks[peaks.length - 1]).toBeCloseTo(1.0);
  });

  it("handles buckets > samples.length (many small windows)", () => {
    // 3 samples, 10 buckets → some buckets may be empty (peak = 0)
    const samples = new Float32Array([0.5, 0.0, 0.3]);
    const peaks = computePeaks(samples, 10);
    expect(peaks).toHaveLength(10);
    expect(peaks.every((p) => p >= 0 && p <= 1)).toBe(true);
  });

  it("negative amplitudes treated as absolute value", () => {
    const samples = new Float32Array(100);
    samples[0] = -0.9; // only amplitude is negative
    const peaks = computePeaks(samples, 1);
    expect(peaks[0]).toBeCloseTo(1.0); // abs(-0.9)/0.9 = 1
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/andreaigner/Advertisement/logomotion && npx vitest run tests/waveform.test.ts
```

Expected: FAIL with "Cannot find module" or similar.

- [ ] **Step 3: Implement `src/lib/waveform.ts`**

Create `src/lib/waveform.ts`:

```typescript
/**
 * Split `samples` into `buckets` equal-width windows and return the
 * max-absolute-amplitude per window, normalized so the global max = 1.
 * Pure and deterministic — no browser APIs.
 */
export function computePeaks(samples: Float32Array, buckets: number): number[] {
  if (buckets <= 0 || samples.length === 0) return [];

  const windowSize = samples.length / buckets;
  const raw: number[] = [];

  for (let b = 0; b < buckets; b++) {
    const start = Math.floor(b * windowSize);
    const end = Math.min(Math.floor((b + 1) * windowSize), samples.length);
    let peak = 0;
    for (let i = start; i < end; i++) {
      const abs = Math.abs(samples[i]);
      if (abs > peak) peak = abs;
    }
    raw.push(peak);
  }

  const globalMax = Math.max(...raw);
  if (globalMax === 0) return raw; // all silence → already all 0

  return raw.map((p) => p / globalMax);
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd /Users/andreaigner/Advertisement/logomotion && npx vitest run tests/waveform.test.ts
```

Expected: All 8 tests PASS.

- [ ] **Step 5: Run full test suite to confirm no regressions**

```bash
cd /Users/andreaigner/Advertisement/logomotion && npm test -- --reporter=verbose 2>&1 | tail -30
```

Expected: All existing tests still pass; waveform tests appear in output.

- [ ] **Step 6: TypeScript check**

```bash
cd /Users/andreaigner/Advertisement/logomotion && npx tsc --noEmit 2>&1
```

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
cd /Users/andreaigner/Advertisement/logomotion && git add src/lib/waveform.ts tests/waveform.test.ts && git commit -m "feat: add computePeaks waveform util with unit tests"
```

---

### Task 2: Add `decodeAudioUrl` to audio-analyze.ts

**Files:**
- Modify: `src/lib/audio-analyze.ts`

**Interfaces:**
- Consumes: nothing from previous tasks
- Produces: `decodeAudioUrl(url: string): Promise<{ samples: Float32Array; sampleRate: number; duration: number }>`
  - Browser-only (uses `fetch` + `AudioContext`)
  - Reuses the same mono downmix logic as `decodeAudioFile`

- [ ] **Step 1: Read the current file**

Read `src/lib/audio-analyze.ts` to understand the existing mono-downmix code (lines 14-20).

- [ ] **Step 2: Add `decodeAudioUrl` to `src/lib/audio-analyze.ts`**

Append after the existing `decodeAudioFile` function:

```typescript
// Browser only: decode a public audio URL to mono PCM (no dataUrl needed).
export async function decodeAudioUrl(
  url: string
): Promise<{ samples: Float32Array; sampleRate: number; duration: number }> {
  const buf = await fetch(url).then((r) => r.arrayBuffer());
  const AC: typeof AudioContext = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
  const ctx = new AC();
  const audio = await ctx.decodeAudioData(buf);
  const ch = audio.numberOfChannels;
  const mono = new Float32Array(audio.length);
  for (let c = 0; c < ch; c++) { const d = audio.getChannelData(c); for (let i = 0; i < d.length; i++) mono[i] += d[i] / ch; }
  await ctx.close();
  return { samples: mono, sampleRate: audio.sampleRate, duration: audio.duration };
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/andreaigner/Advertisement/logomotion && npx tsc --noEmit 2>&1
```

Expected: No errors.

- [ ] **Step 4: Run tests to confirm no regressions**

```bash
cd /Users/andreaigner/Advertisement/logomotion && npm test 2>&1 | tail -20
```

Expected: All pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/andreaigner/Advertisement/logomotion && git add src/lib/audio-analyze.ts && git commit -m "feat: add decodeAudioUrl helper for bundled track waveform decode"
```

---

### Task 3: AudioTimeline canvas component

**Files:**
- Create: `src/editor/showcase/AudioTimeline.tsx`

**Interfaces:**
- Consumes:
  - `computePeaks(samples: Float32Array, buckets: number): number[]` from `@/lib/waveform`
- Produces: `AudioTimeline` React component
  - Props: `{ samples: Float32Array; sampleRate: number; duration: number; cutTimes: number[] }`
  - Renders a `<canvas>` element (width = 100%, height = 64px)
  - Waveform: centered vertically-mirrored bars in `#9aa0aa` on `#f3f3f3` background
  - Cut markers: thin 1px vertical lines in `#2563EB` at `x = (t / duration) * width`
  - Uses `devicePixelRatio` for HiDPI crispness
  - Redraws via `useEffect` whenever any prop changes
  - `"use client"` directive at the top

- [ ] **Step 1: Create `src/editor/showcase/AudioTimeline.tsx`**

```typescript
"use client";
import { useEffect, useRef } from "react";
import { computePeaks } from "@/lib/waveform";

export type AudioTimelineProps = {
  samples: Float32Array;
  sampleRate: number;
  duration: number;
  cutTimes: number[];
};

export const AudioTimeline: React.FC<AudioTimelineProps> = ({
  samples,
  sampleRate: _sampleRate,
  duration,
  cutTimes,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.offsetWidth || 256;
    const cssHeight = 64;

    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);
    canvas.style.width = cssWidth + "px";
    canvas.style.height = cssHeight + "px";

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = "#f3f3f3";
    ctx.fillRect(0, 0, cssWidth, cssHeight);

    // Waveform bars
    const peaks = computePeaks(samples, cssWidth);
    const midY = cssHeight / 2;
    ctx.fillStyle = "#9aa0aa";
    for (let i = 0; i < peaks.length; i++) {
      const h = Math.max(1, peaks[i] * midY);
      ctx.fillRect(i, midY - h, 1, h * 2);
    }

    // Cut markers
    if (duration > 0) {
      ctx.strokeStyle = "#2563EB";
      ctx.lineWidth = 1;
      for (const t of cutTimes) {
        const x = Math.round((t / duration) * cssWidth);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, cssHeight);
        ctx.stroke();
      }
    }
  }, [samples, duration, cutTimes]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: "block", width: "100%", height: 64 }}
    />
  );
};
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/andreaigner/Advertisement/logomotion && npx tsc --noEmit 2>&1
```

Expected: No errors.

- [ ] **Step 3: Run full test suite**

```bash
cd /Users/andreaigner/Advertisement/logomotion && npm test 2>&1 | tail -20
```

Expected: All pass.

- [ ] **Step 4: Commit**

```bash
cd /Users/andreaigner/Advertisement/logomotion && git add src/editor/showcase/AudioTimeline.tsx && git commit -m "feat: add AudioTimeline canvas component for waveform + cut markers"
```

---

### Task 4: Wire AudioTimeline into AudioPanel

**Files:**
- Modify: `src/editor/showcase/AudioPanel.tsx`

**Interfaces:**
- Consumes:
  - `AudioTimeline` from `./AudioTimeline`
  - `decodeAudioUrl` from `@/lib/audio-analyze`
  - `getTrack` from `@/lib/tracks`
- Produces: Updated `AudioPanel` component with:
  - `decoded` state typed as `{ samples: Float32Array; sampleRate: number; duration: number } | null`
  - `useEffect` that decodes bundled track when `config.audio.kind === "bundled"` (on mount and when `trackId` changes)
  - `<AudioTimeline>` rendered below controls when `decoded !== null`
  - Caption: `"{config.cutTimes.length} cuts"` + note about onset vs. grid when applicable

- [ ] **Step 1: Read current AudioPanel.tsx**

Read `src/editor/showcase/AudioPanel.tsx` in full to see the exact current state before editing.

- [ ] **Step 2: Write updated `AudioPanel.tsx`**

Replace the entire content of `src/editor/showcase/AudioPanel.tsx` with:

```typescript
"use client";
import { useState, useEffect } from "react";
import { TRACKS, getTrack } from "@/lib/tracks";
import { decodeAudioFile, decodeAudioUrl, analyzeToCutTimes } from "@/lib/audio-analyze";
import { applyDensity } from "@/lib/cut-sequencer";
import { DEFAULT_SHOWCASE_CONFIG, type ShowcaseConfig } from "@/lib/showcase-config";
import type { DeepPartial } from "./useShowcaseConfig";
import { AudioTimeline } from "./AudioTimeline";

export const AudioPanel: React.FC<{
  config: ShowcaseConfig;
  patch: (p: DeepPartial<ShowcaseConfig>) => void;
  setCutTimes: (t: number[]) => void;
}> = ({ config, patch, setCutTimes }) => {
  const [status, setStatus] = useState("");
  const [density, setDensity] = useState(config.cutDensity);
  const [decoded, setDecoded] = useState<{ samples: Float32Array; sampleRate: number; duration: number } | null>(null);

  // Base grid for bundled-track density: stable reference to the default cut grid.
  const baseGrid = DEFAULT_SHOWCASE_CONFIG.cutTimes;

  // Decode bundled track whenever it's selected, so the waveform shows for it.
  useEffect(() => {
    if (config.audio.kind !== "bundled") return;
    const track = getTrack(config.audio.trackId);
    const url = "/" + track.src; // public path e.g. /assets/tracks/pulse-120.mp3
    let cancelled = false;
    decodeAudioUrl(url)
      .then(({ samples, sampleRate, duration }) => {
        if (!cancelled) setDecoded({ samples, sampleRate, duration });
      })
      .catch(() => {
        // Non-fatal: bundled decode may fail in server-only contexts; waveform just won't show.
        if (!cancelled) setDecoded(null);
      });
    return () => { cancelled = true; };
  }, [config.audio.kind === "bundled" ? config.audio.trackId : null]); // eslint-disable-line react-hooks/exhaustive-deps

  const onFile = async (file: File) => {
    setStatus("Analyzing…");
    try {
      const { samples, sampleRate, dataUrl, duration } = await decodeAudioFile(file);
      setDecoded({ samples, sampleRate, duration });
      const cuts = analyzeToCutTimes(samples, sampleRate, density);
      patch({ audio: { kind: "upload", src: dataUrl, name: file.name } });
      setCutTimes(cuts);
      setStatus(`${cuts.length} cuts from ${file.name} (${duration.toFixed(1)}s)`);
    } catch (e) { setStatus("Could not analyze: " + (e as Error).message); }
  };

  const reAnalyze = (d: number) => {
    setDensity(d);
    patch({ cutDensity: d });
    if (decoded && config.audio.kind === "upload") {
      // Uploaded audio: re-derive from stored samples.
      setCutTimes(analyzeToCutTimes(decoded.samples, decoded.sampleRate, d));
    } else {
      // Bundled audio: apply density to base grid so slider is never a no-op.
      setCutTimes(applyDensity(baseGrid, d));
    }
  };

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: "#6b6b6b",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  };

  const radioLabelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    color: "#1a1a1a",
    padding: "3px 0",
    cursor: "pointer",
  };

  return (
    <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid #e5e5e5" }}>
      <span style={sectionLabelStyle}>Audio</span>
      <div style={{ marginTop: 10 }}>
        {TRACKS.map((t) => (
          <label key={t.id} style={radioLabelStyle}>
            <input
              type="radio"
              name="sc2-audio"
              style={{ marginRight: 6 }}
              checked={config.audio.kind === "bundled" && config.audio.trackId === t.id}
              onChange={() => {
                patch({ audio: { kind: "bundled", trackId: t.id } });
                setDecoded(null);
                // Reset to bundled base grid with current density.
                setCutTimes(applyDensity(baseGrid, density));
              }}
            />{t.title}
          </label>
        ))}
        <div style={{ marginTop: 8 }}>
          <span style={{ fontSize: 12, color: "#6b6b6b", display: "block", marginBottom: 4 }}>Upload audio</span>
          <input
            type="file"
            accept="audio/*,.mp3,.wav,.m4a,.ogg"
            style={{ fontSize: 11, color: "#6b6b6b" }}
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
        </div>
      </div>
      <div style={{ marginTop: 10 }}>
        <label style={{ fontSize: 12, color: "#6b6b6b", display: "block" }}>
          Cut density: {density}&times;
          <input
            type="range"
            min={1}
            max={4}
            step={1}
            value={density}
            style={{ width: "100%", marginTop: 4 }}
            onChange={(e) => reAnalyze(Number(e.target.value))}
          />
        </label>
      </div>
      {status && <p style={{ color: "#6b6b6b", fontSize: 11, margin: "6px 0 0" }}>{status}</p>}
      {decoded && (
        <div style={{ marginTop: 10 }}>
          <span style={{ fontSize: 11, color: "#6b6b6b", display: "block", marginBottom: 4 }}>
            {config.cutTimes.length} cuts
            {config.audio.kind === "upload"
              ? " — onset-detected"
              : " — even grid"}
          </span>
          <AudioTimeline
            samples={decoded.samples}
            sampleRate={decoded.sampleRate}
            duration={decoded.duration}
            cutTimes={config.cutTimes}
          />
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/andreaigner/Advertisement/logomotion && npx tsc --noEmit 2>&1
```

Expected: No errors. If there is a TS error about the `useEffect` dependency array lint comment (TS doesn't care about eslint comments), remove the comment. If there are errors about the conditional dep array, replace the `useEffect` deps with:

```typescript
  // We want to re-run only when the bundled trackId changes. We compute a
  // stable key that is null when kind !== "bundled".
  const bundledTrackId = config.audio.kind === "bundled" ? config.audio.trackId : null;
  useEffect(() => {
    if (bundledTrackId === null) return;
    const track = getTrack(bundledTrackId);
    const url = "/" + track.src;
    let cancelled = false;
    decodeAudioUrl(url)
      .then(({ samples, sampleRate, duration }) => {
        if (!cancelled) setDecoded({ samples, sampleRate, duration });
      })
      .catch(() => {
        if (!cancelled) setDecoded(null);
      });
    return () => { cancelled = true; };
  }, [bundledTrackId]);
```

- [ ] **Step 4: Run full test suite**

```bash
cd /Users/andreaigner/Advertisement/logomotion && npm test 2>&1 | tail -30
```

Expected: All tests pass including waveform tests.

- [ ] **Step 5: Build check**

```bash
cd /Users/andreaigner/Advertisement/logomotion && npm run build 2>&1 | tail -30
```

Expected: Build succeeds (exit 0). Note: Next.js may warn about unoptimized images or similar — these are OK. Only actual errors (red) are failures.

- [ ] **Step 6: Final tsc check**

```bash
cd /Users/andreaigner/Advertisement/logomotion && npx tsc --noEmit 2>&1
```

Expected: No output (clean).

- [ ] **Step 7: Commit**

```bash
cd /Users/andreaigner/Advertisement/logomotion && git add src/editor/showcase/AudioPanel.tsx && git commit -m "feat: wire AudioTimeline into AudioPanel with bundled track decoding"
```

---

### Task 5: Write report to `.superpowers/sdd/R2-report.md`

**Files:**
- Create: `/Users/andreaigner/Advertisement/logomotion/.superpowers/sdd/R2-report.md`

- [ ] **Step 1: Write report covering:**
  - `computePeaks` algorithm (bucket windowing, normalization)
  - Unit test strategy (impulse, ramp, silence, edge cases)
  - `AudioTimeline` canvas drawing approach (dpr scaling, mirrored bars, marker x formula)
  - How bundled decoding works (`decodeAudioUrl` → `fetch` → `AudioContext.decodeAudioData` → mono downmix → set state)
  - How cut markers map to x (`(t / duration) * cssWidth`)
  - `tsc --noEmit`, `npm test`, `npm run build` results
  - Self-review checklist
  - Concerns (canvas visual not verifiable headlessly; `AudioContext` requires browser + HTTPS/localhost)

---

## Self-Review Checklist

**Spec coverage:**
- [x] `src/lib/waveform.ts` with `computePeaks(samples, buckets): number[]` → Task 1
- [x] Guards: `buckets<=0` or empty samples → `[]` → Task 1 (step 3 implementation + step 1 tests)
- [x] Unit tests: ramp, impulse, silence, length===buckets → Task 1
- [x] `AudioTimeline.tsx` with canvas, dpr, centered mirrored waveform, cut markers → Task 3
- [x] Props: `{ samples, sampleRate, duration, cutTimes }` → Task 3
- [x] Redraw on prop changes (`useEffect` deps) → Task 3
- [x] `decodeAudioUrl` in `audio-analyze.ts` → Task 2
- [x] Bundled track decode in `AudioPanel` via `useEffect` on mount + trackId change → Task 4
- [x] `decoded` now includes `duration` → Task 4
- [x] `<AudioTimeline>` rendered only when `decoded !== null` → Task 4
- [x] Caption with cut count + onset vs. grid note → Task 4
- [x] All existing behavior (upload→analyze, density slider) preserved → Task 4 (onFile and reAnalyze unchanged)
- [x] `tsc --noEmit` clean → verified in each task
- [x] `npm test` all pass → verified in each task
- [x] `npm run build` succeeds → Task 4 step 5

**Placeholder scan:** No TBDs, no "similar to Task N", all code blocks complete.

**Type consistency:**
- `computePeaks` → defined in Task 1, consumed in Task 3 (`AudioTimeline`) ✓
- `decodeAudioUrl` → defined in Task 2, consumed in Task 4 (`AudioPanel`) ✓
- `AudioTimeline` → defined in Task 3, imported in Task 4 ✓
- `decoded` type `{ samples: Float32Array; sampleRate: number; duration: number } | null` → consistent in Task 4 ✓
- `getTrack(trackId)` → already exported from `@/lib/tracks`, imported in Task 4 ✓
