import { describe, it, expect } from "vitest";
import { computeHomography, applyH, toMatrix3d } from "../src/lib/matrix3d";

type Pt = [number, number];
const src: [Pt,Pt,Pt,Pt] = [[0,0],[1,0],[1,1],[0,1]];

describe("matrix3d homography", () => {
  it("maps each source corner onto the destination corner", () => {
    const dst: [Pt,Pt,Pt,Pt] = [[10,20],[110,10],[120,140],[5,130]];
    const h = computeHomography(src, dst);
    for (let i = 0; i < 4; i++) {
      const [x, y] = applyH(h, src[i]);
      expect(x).toBeCloseTo(dst[i][0], 4);
      expect(y).toBeCloseTo(dst[i][1], 4);
    }
  });
  it("identity mapping leaves points unchanged", () => {
    const h = computeHomography(src, src);
    const [x, y] = applyH(h, [0.5, 0.25]);
    expect(x).toBeCloseTo(0.5, 6);
    expect(y).toBeCloseTo(0.25, 6);
  });
  it("toMatrix3d emits a 16-value matrix3d string", () => {
    const h = computeHomography(src, [[0,0],[2,0],[2,2],[0,2]]);
    const s = toMatrix3d(h);
    expect(s.startsWith("matrix3d(")).toBe(true);
    expect(s.replace(/matrix3d\(|\)/g, "").split(",")).toHaveLength(16);
  });
});
