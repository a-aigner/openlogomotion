import { writeFileSync } from "node:fs";
const bpm = 120, dur = 6, spb = 60 / bpm;
const beats = [], energy = [];
for (let t = 0; t <= dur + 1e-9; t += spb) {
  beats.push(Number(t.toFixed(4)));
  energy.push(beats.length % 4 === 1 ? 1 : 0.6); // accent downbeats
}
writeFileSync("public/assets/beatmaps/pulse-120.json", JSON.stringify({ bpm, beats, energy }, null, 2));
console.log(`wrote ${beats.length} beats`);
