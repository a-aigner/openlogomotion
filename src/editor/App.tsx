"use client";
import { useState } from "react";
import Editor from "./Editor";                      // existing Pulse editor
import ShowcaseEditor from "./showcase/ShowcaseEditor";

export default function App() {
  const [style, setStyle] = useState<"pulse" | "showcase">("showcase");
  return (
    <div>
      <nav style={{ display: "flex", gap: 8, padding: 12, borderBottom: "1px solid #ddd" }}>
        <strong style={{ marginRight: 12 }}>OpenLogomotion</strong>
        <button onClick={() => setStyle("showcase")} disabled={style === "showcase"}>Showcase</button>
        <button onClick={() => setStyle("pulse")} disabled={style === "pulse"}>Pulse (3D)</button>
      </nav>
      {style === "showcase" ? <ShowcaseEditor /> : <Editor />}
    </div>
  );
}
