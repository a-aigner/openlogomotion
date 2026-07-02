import { describe, it, expect } from "vitest";
import { statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtempSync } from "node:fs";
import { renderToFile } from "../app/api/render/route";
import { DEFAULT_SHOWCASE_CONFIG } from "../src/lib/showcase-config";

describe("renderToFile (LogoShowcase)", () => {
  it("renders a short showcase MP4 from a config", async () => {
    const cfg = {
      ...DEFAULT_SHOWCASE_CONFIG,
      format: { ...DEFAULT_SHOWCASE_CONFIG.format, width: 256, height: 456, durationInFrames: 20 },
    };
    const dir = mkdtempSync(join(tmpdir(), "showcase-test-"));
    const out = join(dir, "showcase.mp4");
    await renderToFile(cfg, out, "LogoShowcase");
    expect(statSync(out).size).toBeGreaterThan(1000);
  }, 180_000);
});
