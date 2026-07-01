"use client";
import { Player } from "@remotion/player";
import { useState } from "react";
import { ShowcaseComposition } from "@/remotion/ShowcaseComposition";
import { isSupportedLogo, logoKind, svgToDataUrl } from "@/lib/logo-src";
import { parseSvg } from "@/lib/logo-ingest";
import { useShowcaseConfig } from "./useShowcaseConfig";
import { FramesPanel } from "./FramesPanel";
import { ShowcaseControls } from "./ShowcaseControls";
import { AudioPanel } from "./AudioPanel";

export default function ShowcaseEditor() {
  const { config, patch, setFrames, setCutTimes } = useShowcaseConfig();
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
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr 320px", gap: 16, padding: 16 }}>
      <div>
        <input type="file" accept=".svg,.png,.jpg,.jpeg,.webp,image/*"
          onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
        {warn.map((w, i) => <p key={i} style={{ color: "#c60" }}>⚠ {w}</p>)}
      </div>
      <div>
        <Player
          component={ShowcaseComposition}
          inputProps={{ config }}
          durationInFrames={config.format.durationInFrames}
          fps={config.format.fps}
          compositionWidth={config.format.width}
          compositionHeight={config.format.height}
          style={{ width: "100%", maxWidth: 360, aspectRatio: `${config.format.width}/${config.format.height}` }}
          controls loop
        />
      </div>
      <div>
        <AudioPanel config={config} patch={patch} setCutTimes={setCutTimes} />
        <FramesPanel config={config} setFrames={setFrames} />
        <ShowcaseControls config={config} patch={patch} />
      </div>
    </div>
  );
}
