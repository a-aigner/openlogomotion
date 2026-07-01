"use client";
import { useState } from "react";
import Editor from "./Editor";                      // existing Pulse editor
import ShowcaseEditor from "./showcase/ShowcaseEditor";

export default function App() {
  const [style, setStyle] = useState<"pulse" | "showcase">("showcase");

  const pillStyle = (active: boolean): React.CSSProperties => ({
    padding: "4px 14px",
    border: "1px solid #e5e5e5",
    borderRadius: 20,
    cursor: active ? "default" : "pointer",
    background: active ? "#1a1a1a" : "#ffffff",
    color: active ? "#ffffff" : "#1a1a1a",
    fontSize: 13,
    fontWeight: 500,
    lineHeight: "20px",
  });

  return (
    <div style={{ minHeight: "100vh", background: "#f7f7f8", display: "flex", flexDirection: "column" }}>
      <nav style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        height: 48,
        background: "#ffffff",
        borderBottom: "1px solid #e5e5e5",
        flexShrink: 0,
      }}>
        <span style={{ fontWeight: 600, fontSize: 14, letterSpacing: "-0.01em", color: "#1a1a1a" }}>
          OpenLogomotion
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          <button style={pillStyle(style === "pulse")} onClick={() => setStyle("pulse")}>Pulse</button>
          <button style={pillStyle(style === "showcase")} onClick={() => setStyle("showcase")}>Showcase</button>
        </div>
      </nav>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {style === "showcase" ? <ShowcaseEditor /> : <Editor />}
      </div>
    </div>
  );
}
