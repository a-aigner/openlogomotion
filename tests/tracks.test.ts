import { describe, it, expect } from "vitest";
import { TRACKS, getTrack } from "../src/lib/tracks";

describe("tracks", () => {
  it("exposes at least one track", () => expect(TRACKS.length).toBeGreaterThan(0));
  it("getTrack returns a known track", () => expect(getTrack("pulse-120").bpm).toBe(120));
  it("getTrack throws on unknown id", () => expect(() => getTrack("nope")).toThrow(/unknown track/i));
});
