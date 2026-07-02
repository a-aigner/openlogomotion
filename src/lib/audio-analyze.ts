import { onsetTimes } from "./onset-detect";
import { applyDensity } from "./cut-sequencer";

export function analyzeToCutTimes(samples: Float32Array, sampleRate: number, density: number, sensitivity = 3): number[] {
  const onsets = onsetTimes(samples, sampleRate, { sensitivity });
  return applyDensity(onsets, Math.max(1, Math.round(density)));
}

// Browser only: decode a File to mono PCM + a data URL for playback/embedding.
export async function decodeAudioFile(
  file: File
): Promise<{ samples: Float32Array; sampleRate: number; duration: number; dataUrl: string }> {
  const buf = await file.arrayBuffer();
  const AC: typeof AudioContext = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
  const ctx = new AC();
  const audio = await ctx.decodeAudioData(buf.slice(0));
  // downmix to mono
  const ch = audio.numberOfChannels;
  const mono = new Float32Array(audio.length);
  for (let c = 0; c < ch; c++) { const d = audio.getChannelData(c); for (let i = 0; i < d.length; i++) mono[i] += d[i] / ch; }
  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = () => rej(r.error); r.readAsDataURL(file);
  });
  await ctx.close();
  return { samples: mono, sampleRate: audio.sampleRate, duration: audio.duration, dataUrl };
}

// Browser only: decode a public audio URL to mono PCM (no dataUrl needed).
export async function decodeAudioUrl(
  url: string
): Promise<{ samples: Float32Array; sampleRate: number; duration: number }> {
  const buf = await fetch(url).then((r) => r.arrayBuffer());
  const AC: typeof AudioContext = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
  const ctx = new AC();
  try {
    const audio = await ctx.decodeAudioData(buf.slice(0));
    const ch = audio.numberOfChannels;
    const mono = new Float32Array(audio.length);
    for (let c = 0; c < ch; c++) { const d = audio.getChannelData(c); for (let i = 0; i < d.length; i++) mono[i] += d[i] / ch; }
    return { samples: mono, sampleRate: audio.sampleRate, duration: audio.duration };
  } finally {
    await ctx.close();
  }
}
