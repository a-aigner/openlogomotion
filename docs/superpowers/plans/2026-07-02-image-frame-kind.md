# Image Frame Kind Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `image` frame kind to Showcase v2 so a user-supplied image can serve as a frame background with the centered logo rendered on top.

**Architecture:** Extend the `Frame` discriminated union in `showcase-config.ts` with the new `image` variant, update `FrameBackground.tsx` to render it using Remotion's `<Img>` component with CSS `objectFit`, and extend the config test suite. No changes to `ShowcaseComposition` are needed — the logo already renders on top of whatever `FrameBackground` draws.

**Tech Stack:** Next.js 16, Remotion 4.0.484, TypeScript strict, Vitest

## Global Constraints

- TypeScript strict; exhaustive union handling — no `any`, no non-null hacks
- Deterministic render; solid/palette behavior must be unchanged
- Do not modify Pulse (LogoComposition / LogoPulse pipeline)
- All 44 existing tests must continue to pass

---

### Task 1: Extend Frame union + update FrameBackground

**Files:**
- Modify: `src/lib/showcase-config.ts` (lines 4-7)
- Modify: `src/remotion/components/FrameBackground.tsx`

**Interfaces:**
- Produces: `Frame` union now includes `{ kind: "image"; variant: FrameVariant; src: string; fit: "cover" | "contain" }`
- Produces: `FrameBackground` renders a full-bleed `<Img>` for the `image` kind

- [ ] **Step 1: Extend Frame union in showcase-config.ts**

In `src/lib/showcase-config.ts`, change lines 4-7 from:
```ts
export type FrameVariant = "normal" | "inverted";
export type Frame =
  | { kind: "solid"; variant: FrameVariant; color: string }
  | { kind: "palette"; variant: FrameVariant; colors: string[] };
```
to:
```ts
export type FrameVariant = "normal" | "inverted";
export type Frame =
  | { kind: "solid"; variant: FrameVariant; color: string }
  | { kind: "palette"; variant: FrameVariant; colors: string[] }
  | { kind: "image"; variant: FrameVariant; src: string; fit: "cover" | "contain" };
```

- [ ] **Step 2: Update FrameBackground.tsx to handle image kind**

Replace entire `src/remotion/components/FrameBackground.tsx` with:
```tsx
import { AbsoluteFill, Img } from "remotion";
import type { Frame } from "@/lib/showcase-config";

export const FrameBackground: React.FC<{ frame: Frame }> = ({ frame }) => {
  if (frame.kind === "solid") {
    return <AbsoluteFill style={{ backgroundColor: frame.color }} />;
  }
  if (frame.kind === "image") {
    return (
      <AbsoluteFill>
        <Img src={frame.src} style={{ width: "100%", height: "100%", objectFit: frame.fit }} />
      </AbsoluteFill>
    );
  }
  // palette: evenly split vertical color bands
  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "row" }}>
      {frame.colors.map((c, i) => (
        <div key={i} style={{ flex: 1, backgroundColor: c }} />
      ))}
    </AbsoluteFill>
  );
};
```
Note: the palette branch is now the final else — TypeScript exhaustiveness is guaranteed because all three discriminants are handled.

- [ ] **Step 3: Run tsc check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/lib/showcase-config.ts src/remotion/components/FrameBackground.tsx
git commit -m "feat(showcase): add image frame kind with cover/contain fit"
```

---

### Task 2: Extend showcase-config tests

**Files:**
- Modify: `tests/showcase-config.test.ts`

**Interfaces:**
- Consumes: `Frame` union from `src/lib/showcase-config.ts` (now includes `image` kind)

- [ ] **Step 1: Update allowed-kinds list and add image frame assertions**

Replace `tests/showcase-config.test.ts` with:
```ts
import { describe, it, expect } from "vitest";
import { DEFAULT_SHOWCASE_CONFIG, type Frame } from "../src/lib/showcase-config";
import { FORMATS, resolveDuration } from "../src/lib/config";

describe("showcase-config v2", () => {
  it("has generated frames of supported kinds", () => {
    expect(DEFAULT_SHOWCASE_CONFIG.frames.length).toBeGreaterThan(0);
    for (const f of DEFAULT_SHOWCASE_CONFIG.frames) {
      expect(["solid", "palette", "image"]).toContain(f.kind);
      if (f.kind === "solid") expect(f.color).toMatch(/^#/);
      if (f.kind === "palette") expect(f.colors.length).toBeGreaterThan(0);
      if (f.kind === "image") {
        expect(typeof f.src).toBe("string");
        expect(f.src.length).toBeGreaterThan(0);
        expect(["cover", "contain"]).toContain(f.fit);
      }
    }
  });
  it("image frame kind carries src and fit", () => {
    const imgFrame: Frame = {
      kind: "image",
      variant: "normal",
      src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==",
      fit: "cover",
    };
    expect(imgFrame.kind).toBe("image");
    expect(imgFrame.src).toMatch(/^data:image\//);
    expect(imgFrame.fit).toBe("cover");
    expect(imgFrame.variant).toBe("normal");
  });
  it("has a sorted, non-empty default cut grid", () => {
    const c = DEFAULT_SHOWCASE_CONFIG.cutTimes;
    expect(c.length).toBeGreaterThan(0);
    for (let i = 1; i < c.length; i++) expect(c[i]).toBeGreaterThan(c[i - 1]);
  });
  it("is format-consistent (6s default)", () => {
    const fmt = DEFAULT_SHOWCASE_CONFIG.format;
    expect(fmt.width).toBe(FORMATS[fmt.aspect].width);
    expect(fmt.durationInFrames).toBe(resolveDuration(6, fmt.fps));
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npm test -- --reporter=verbose 2>&1 | tail -30`
Expected: All tests pass including new image frame tests

- [ ] **Step 3: Commit**

```bash
git add tests/showcase-config.test.ts
git commit -m "test(showcase): extend showcase-config tests for image frame kind"
```

---

### Task 3: Smoke render with image frame

**Files:**
- Temp: `/private/tmp/claude-501/-Users-andreaigner-Advertisement-logomotion/7c0bd157-fcc2-44cb-b63d-2c1c79fbf6a7/scratchpad/img-frame-props.json` (deleted after)

- [ ] **Step 1: Create temp props JSON with an image frame**

Write a props JSON to the scratchpad dir that configures `LogoShowcase` with one image frame using a 1x1 red PNG data URL.

- [ ] **Step 2: Run smoke render (frames 0-3 only)**

Run: `npx remotion render src/remotion/index.ts LogoShowcase out/img-frame.mp4 --frames=0-3 --props=<path-to-tmp.json>`
Expected: Render completes without error, `out/img-frame.mp4` exists

- [ ] **Step 3: Clean up temp props file and output**

Remove the temp props file. Remove `out/img-frame.mp4`.

- [ ] **Step 4: Commit everything with tsc + test verification**

Run: `npx tsc --noEmit && npm test`
Expected: No TypeScript errors, all tests pass

---

### Task 4: Write report

**Files:**
- Create: `.superpowers/sdd/iterA-report.md`

Report the union + FrameBackground changes, smoke render result, tsc/test results, self-review, concerns.
