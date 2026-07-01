import { bundle } from "@remotion/bundler";
import { selectComposition, renderMedia } from "@remotion/renderer";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { LogoAnimConfig } from "@/lib/config";
import { webpackOverride } from "@/remotion/webpack-override";

export const runtime = "nodejs";
export const maxDuration = 300;

let bundlePromise: Promise<string> | null = null;
const getBundle = () =>
  (bundlePromise ??= bundle({
    entryPoint: join(process.cwd(), "src/remotion/index.ts"),
    webpackOverride,
  }));

export async function renderToFile(config: LogoAnimConfig, outPath: string): Promise<void> {
  const serveUrl = await getBundle();
  const inputProps = { config };
  const composition = await selectComposition({ serveUrl, id: "LogoPulse", inputProps });
  await renderMedia({
    serveUrl,
    composition,
    codec: "h264",
    outputLocation: outPath,
    inputProps,
    chromiumOptions: { gl: "angle" },
    // dimensions/fps/duration come from the composition's calculateMetadata (see Root.tsx)
  });
}

export async function POST(req: Request) {
  let dir: string | undefined;
  try {
    const { config } = (await req.json()) as { config: LogoAnimConfig };
    dir = await mkdtemp(join(tmpdir(), "logomotion-"));
    const out = join(dir, "logo.mp4");
    await renderToFile(config, out);
    const bytes = await readFile(out);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": 'attachment; filename="logo.mp4"',
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500 });
  } finally {
    if (dir) await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
