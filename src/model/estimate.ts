import { CELL_VOLUME, CI, CJ, CK, NX, N } from "./grid";
import { BHQ, WASTE } from "./geology";
import { clamp, lerp } from "./rng";
import type { ResourceSummary, Stage } from "./types";

/** Dry density by rock type, t/m³. */
export const DENSITY = [0, 2.6, 3.3, 4.2, 3.2, 3.0] as const;

/** Estimated grade wanders up to this many % Fe from the truth where there is no data. */
export const EST_ERROR_SPAN = 7;

export function erf(x: number): number {
  const s = Math.sign(x);
  x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  return (
    s *
    (1 -
      ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
        t *
        Math.exp(-x * x))
  );
}

/** Standard normal cumulative distribution. */
export const Phi = (z: number): number => 0.5 * (1 + erf(z / Math.SQRT2));

/** One-sigma grade uncertainty (% Fe) for a confidence. */
export const sigma = (c: number): number => 1.5 + 11 * (1 - c);

/** UNFC geological axis stage from confidence: G1 detailed .. G4 reconnaissance. */
export const stageOf = (c: number): Stage => (c >= 0.75 ? 1 : c >= 0.5 ? 2 : c >= 0.25 ? 3 : 4);

/** Probability that a cell with estimate `est` and confidence `c` beats the cut-off. */
export const probAbove = (est: number, c: number, cut: number): number =>
  Phi((est - cut) / sigma(c));

/** Estimated grade for every solid cell. Waste keeps its true grade. */
export function estimateGrades(
  solid: ArrayLike<number>,
  type: Uint8Array,
  fe: Float32Array,
  errF: Float32Array,
  conf: Float32Array,
): Float32Array {
  const est = new Float32Array(N);
  for (let s = 0; s < solid.length; s++) {
    const n = solid[s];
    est[n] =
      type[n] === WASTE ? fe[n] : clamp(fe[n] + errF[n] * (1 - conf[n]) * EST_ERROR_SPAN, 3, 68);
  }
  return est;
}

export const cellTonnes = (type: Uint8Array, n: number): number => CELL_VOLUME * DENSITY[type[n]];

/** Indicative price curve, ₹ per tonne by grade. */
const PRICE_POINTS: ReadonlyArray<readonly [number, number]> = [
  [45, 700],
  [55, 2100],
  [60, 3300],
  [63, 4500],
  [65, 5400],
  [67, 6100],
];
export const MAX_PRICE = 6100;

export function price(g: number): number {
  if (g < 45) return 0;
  for (let a = 1; a < PRICE_POINTS.length; a++) {
    const [g1, p1] = PRICE_POINTS[a];
    if (g <= g1) {
      const [g0, p0] = PRICE_POINTS[a - 1];
      return lerp(p0, p1, (g - g0) / (g1 - g0));
    }
  }
  return MAX_PRICE;
}

/** Mining cost, ₹ per tonne: a fixed part plus ₹3.2/t per metre of depth. */
export const cost = (ktop: Int16Array, n: number): number =>
  720 + 3.2 * (ktop[CI[n] + NX * CJ[n]] - CK[n]) * 10;

export const margin = (ktop: Int16Array, est: Float32Array, n: number): number =>
  price(est[n]) - cost(ktop, n);

/** Ore (BHQ or richer) at or above the cut-off. */
export const isResource = (type: Uint8Array, est: Float32Array, n: number, cut: number): boolean =>
  type[n] >= BHQ && est[n] >= cut;

/** Tonnes and grade above cut-off, split by stage and occurrence. */
export function summarize(
  solid: ArrayLike<number>,
  type: Uint8Array,
  est: Float32Array,
  occ: Uint8Array,
  conf: Float32Array,
  cut: number,
): ResourceSummary {
  let T = 0;
  let G = 0;
  const stages = [0, 0, 0, 0, 0];
  const occT = [0, 0, 0, 0, 0, 0];
  for (let s = 0; s < solid.length; s++) {
    const n = solid[s];
    if (!isResource(type, est, n, cut)) continue;
    const t = cellTonnes(type, n);
    T += t;
    G += t * est[n];
    stages[stageOf(conf[n])] += t;
    occT[occ[n]] += t;
  }
  return { tonnes: T, grade: T ? G / T : 0, stages, occ: occT };
}

/** Tonnes above cut-off at G2 or better (confidence ≥ 0.5). */
export function g2OrBetterTonnes(
  solid: ArrayLike<number>,
  type: Uint8Array,
  est: Float32Array,
  conf: Float32Array,
  cut: number,
): number {
  let T = 0;
  for (let s = 0; s < solid.length; s++) {
    const n = solid[s];
    if (isResource(type, est, n, cut) && conf[n] >= 0.5) T += cellTonnes(type, n);
  }
  return T;
}

/** Formats tonnes as millions, with one decimal below 100 Mt. */
export const fmtMt = (t: number): string => (t / 1e6).toFixed(t >= 1e8 ? 0 : 1);
