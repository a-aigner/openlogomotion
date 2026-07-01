type Pt = [number, number];
type M = number[]; // 3x3 row-major

function adj(m: M): M {
  return [
    m[4]*m[8]-m[5]*m[7], m[2]*m[7]-m[1]*m[8], m[1]*m[5]-m[2]*m[4],
    m[5]*m[6]-m[3]*m[8], m[0]*m[8]-m[2]*m[6], m[2]*m[3]-m[0]*m[5],
    m[3]*m[7]-m[4]*m[6], m[1]*m[6]-m[0]*m[7], m[0]*m[4]-m[1]*m[3],
  ];
}
function multmm(a: M, b: M): M {
  const r: M = new Array(9).fill(0);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) {
      let s = 0;
      for (let k = 0; k < 3; k++) s += a[3 * i + k] * b[3 * k + j];
      r[3 * i + j] = s;
    }
  return r;
}
function multmv(m: M, v: number[]): number[] {
  return [
    m[0]*v[0]+m[1]*v[1]+m[2]*v[2],
    m[3]*v[0]+m[4]*v[1]+m[5]*v[2],
    m[6]*v[0]+m[7]*v[1]+m[8]*v[2],
  ];
}
function basisToPoints(p: [Pt,Pt,Pt,Pt]): M {
  const m: M = [p[0][0], p[1][0], p[2][0], p[0][1], p[1][1], p[2][1], 1, 1, 1];
  const v = multmv(adj(m), [p[3][0], p[3][1], 1]);
  return multmm(m, [v[0],0,0, 0,v[1],0, 0,0,v[2]]);
}

export function computeHomography(src: [Pt,Pt,Pt,Pt], dst: [Pt,Pt,Pt,Pt]): M {
  return multmm(basisToPoints(dst), adj(basisToPoints(src)));
}

export function applyH(h: M, p: Pt): Pt {
  const v = multmv(h, [p[0], p[1], 1]);
  return [v[0] / v[2], v[1] / v[2]];
}

export function toMatrix3d(h: M): string {
  const g = h.map((x) => x / h[8]); // normalize
  const t = [
    g[0], g[3], 0, g[6],
    g[1], g[4], 0, g[7],
    0,    0,    1, 0,
    g[2], g[5], 0, g[8],
  ];
  return `matrix3d(${t.join(",")})`;
}
