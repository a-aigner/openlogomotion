export type Aspect = "9:16" | "1:1" | "16:9";

export const FORMATS: Record<Aspect, { width: number; height: number }> = {
  "9:16": { width: 1080, height: 1920 },
  "1:1": { width: 1080, height: 1080 },
  "16:9": { width: 1920, height: 1080 },
};

export const resolveDuration = (seconds: number, fps: number): number => Math.round(seconds * fps);
