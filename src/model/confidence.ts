import { CI, CJ, CK, N, NX } from "./grid";
import type { HoleFootprint } from "./types";

/** Horizontal decay radius, in cells. */
export const CONF_RADIUS = 3.3;
export const R2 = CONF_RADIUS * CONF_RADIUS;
/** Holes further than this (squared cells) have no influence. */
export const MAX_D2 = 49;
/** Vertical decay length below the hole bottom, in cells. */
export const DEPTH_FALLOFF = 2.5;
export const MAX_CONF = 0.97;
/** Surface mapping gives the top two cells of every column at least this confidence. */
export const SURFACE_FLOOR = 0.3;

/** Influence (0..1) of a hole on cell (i, j, k) before the 0.97 cap. Returns 0 beyond MAX_D2. */
export function holeInfluence(h: HoleFootprint, i: number, j: number, k: number): number {
  const di = i - h.i;
  const dj = j - h.j;
  const d2 = di * di + dj * dj;
  if (d2 > MAX_D2) return 0;
  let f = Math.exp(-d2 / R2);
  if (k < h.bk) {
    const dz = (h.bk - k) / DEPTH_FALLOFF;
    f *= Math.exp(-dz * dz);
  }
  return f;
}

/** Combines an existing confidence with one more hole's influence. */
export const combine = (c: number, f: number): number => 1 - (1 - c) * (1 - f * MAX_CONF);

/** Confidence (0..0.97) in every solid cell, from distance to the given holes. */
export function computeConf(
  solid: ArrayLike<number>,
  ktop: Int16Array,
  holes: ReadonlyArray<HoleFootprint>,
): Float32Array {
  const out = new Float32Array(N);
  for (let s = 0; s < solid.length; s++) {
    const n = solid[s];
    const i = CI[n];
    const j = CJ[n];
    const k = CK[n];
    let c = 0;
    for (const h of holes) {
      const di = i - h.i;
      const dj = j - h.j;
      if (di * di + dj * dj > MAX_D2) continue;
      c = combine(c, holeInfluence(h, i, j, k));
    }
    if (ktop[i + NX * j] - k <= 1) c = Math.max(c, SURFACE_FLOOR);
    out[n] = Math.min(MAX_CONF, c);
  }
  return out;
}
