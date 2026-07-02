"use client";
import ShowcaseEditor from "./showcase/ShowcaseEditor";

export default function App() {
  return (
    <div style={{ minHeight: "100vh", background: "#f7f7f8", display: "flex", flexDirection: "column" }}>
      <nav style={{
        display: "flex",
        alignItems: "baseline",
        gap: 10,
        padding: "0 20px",
        height: 48,
        background: "#ffffff",
        borderBottom: "1px solid #e5e5e5",
        flexShrink: 0,
      }}>
        <span style={{ fontWeight: 600, fontSize: 14, letterSpacing: "-0.01em", color: "#1a1a1a" }}>
          OpenLogomotion
        </span>
        <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>Showcase</span>
      </nav>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <ShowcaseEditor />
      </div>
    </div>
  );
}
