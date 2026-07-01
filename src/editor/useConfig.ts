"use client";
import { useState, useCallback } from "react";
import { DEFAULT_CONFIG, type LogoAnimConfig } from "@/lib/config";

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

function merge<T>(base: T, patch: DeepPartial<T>): T {
  const out: any = Array.isArray(base) ? [...(base as any)] : { ...base };
  for (const k in patch) {
    const v: any = (patch as any)[k];
    out[k] = v && typeof v === "object" && !Array.isArray(v) ? merge((base as any)[k], v) : v;
  }
  return out;
}

export function useConfig() {
  const [config, setConfig] = useState<LogoAnimConfig>(DEFAULT_CONFIG);
  const patch = useCallback((p: DeepPartial<LogoAnimConfig>) => setConfig((c) => merge(c, p)), []);
  return [config, patch] as const;
}
