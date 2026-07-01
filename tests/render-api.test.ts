import { describe, it, expect } from "vitest";
import { statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderToFile } from "../app/api/render/route";
import { DEFAULT_CONFIG } from "../src/lib/config";

describe("renderToFile", () => {
  it("renders a short MP4 from a config", async () => {
    const cfg = {
      ...DEFAULT_CONFIG,
      format: { ...DEFAULT_CONFIG.format, width: 256, height: 456, durationInFrames: 15 },
    };
    const out = join(tmpdir(), "render-test.mp4");
    await renderToFile(cfg, out);
    expect(statSync(out).size).toBeGreaterThan(1000);
  }, 180_000);
});
