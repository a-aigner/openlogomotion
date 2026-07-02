import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { statSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderToFile } from "../app/api/render/route";
import { DEFAULT_SHOWCASE_CONFIG } from "../src/lib/showcase-config";

// A ~1s silent WAV as a data URL (valid audio the renderer can embed).
function silentWavDataUrl(seconds = 1, sr = 8000): string {
  const n = seconds * sr; const bytes = 44 + n * 2; const b = Buffer.alloc(bytes);
  b.write("RIFF", 0); b.writeUInt32LE(bytes - 8, 4); b.write("WAVE", 8); b.write("fmt ", 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24);
  b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write("data", 36);
  b.writeUInt32LE(n * 2, 40);
  return "data:audio/wav;base64," + b.toString("base64");
}

describe("renderToFile embeds uploaded audio", () => {
  it("exports an MP4 carrying the uploaded audio stream", async () => {
    const cfg = {
      ...DEFAULT_SHOWCASE_CONFIG,
      audio: { kind: "upload" as const, src: silentWavDataUrl(1), name: "u.wav" },
      cutTimes: [0, 0.25, 0.5, 0.75],
      format: { ...DEFAULT_SHOWCASE_CONFIG.format, width: 256, height: 456, durationInFrames: 20 },
    };
    const out = join(mkdtempSync(join(tmpdir(), "sc-audio-")), "a.mp4");
    await renderToFile(cfg, out, "LogoShowcase");
    expect(statSync(out).size).toBeGreaterThan(1000);
    const streams = execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type", "-of", "csv", out]).toString();
    expect(streams).toMatch(/audio/);
  }, 180_000);
});
