"use client";
import { useEffect, useRef } from "react";
import { computePeaks } from "@/lib/waveform";

export type AudioTimelineProps = {
  samples: Float32Array;
  sampleRate: number;
  duration: number;
  cutTimes: number[];
};

export const AudioTimeline: React.FC<AudioTimelineProps> = ({
  samples,
  sampleRate: _sampleRate,
  duration,
  cutTimes,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.offsetWidth || 256;
    const cssHeight = 64;

    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);
    canvas.style.width = cssWidth + "px";
    canvas.style.height = cssHeight + "px";

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = "#f3f3f3";
    ctx.fillRect(0, 0, cssWidth, cssHeight);

    // Waveform bars (centered, vertically mirrored)
    const peaks = computePeaks(samples, cssWidth);
    const midY = cssHeight / 2;
    ctx.fillStyle = "#9aa0aa";
    for (let i = 0; i < peaks.length; i++) {
      const h = Math.max(1, peaks[i] * midY);
      ctx.fillRect(i, midY - h, 1, h * 2);
    }

    // Cut markers
    if (duration > 0) {
      ctx.strokeStyle = "#2563EB";
      ctx.lineWidth = 1;
      for (const t of cutTimes) {
        const x = Math.round((t / duration) * cssWidth);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, cssHeight);
        ctx.stroke();
      }
    }
  }, [samples, duration, cutTimes]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: "block", width: "100%", height: 64 }}
    />
  );
};
