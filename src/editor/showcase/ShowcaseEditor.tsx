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
