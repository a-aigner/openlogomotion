"use client";
import { useState, useCallback } from "react";
import { DEFAULT_SHOWCASE_CONFIG, type ShowcaseConfig } from "@/lib/showcase-config";

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

function merge<T>(base: T, patch: DeepPartial<T>): T {
  const out: any = Array.isArray(base) ? [...(base as any)] : { ...base };
  for (const k in patch) {
    const v: any = (patch as any)[k];
    out[k] = v && typeof v === "object" && !Array.isArray(v) ? merge((base as any)[k], v) : v;
  }
  return out;
}

export function useShowcaseConfig() {
  const [config, setConfig] = useState<ShowcaseConfig>(DEFAULT_SHOWCASE_CONFIG);
  const patch = useCallback((p: DeepPartial<ShowcaseConfig>) => setConfig((c) => merge(c, p)), []);
  const setFrames = useCallback((frames: ShowcaseConfig["frames"]) => setConfig((c) => ({ ...c, frames })), []);
  const setCutTimes = useCallback((cutTimes: number[]) => setConfig((c) => ({ ...c, cutTimes })), []);
  return { config, patch, setFrames, setCutTimes } as const;
}
