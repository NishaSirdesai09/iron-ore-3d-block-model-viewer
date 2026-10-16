import { CI, CJ, CK, N, NX, NY, NZ, col, id } from "./grid";
import { clamp, type Noise, type Rand } from "./rng";
import type { FloatOre, Occurrence, RockType } from "./types";

export const AIR = 0;
export const WASTE = 1;
export const BHQ = 2;
export const HEMATITE = 3;
export const BLUE_DUST = 4;
export const LATERITE = 5;

export const TYPE_NAME = [
  "Air",
  "Waste (phyllite, shale)",
  "BHQ (banded hematite quartzite)",
  "Hematite",
  "Blue dust",
  "Lateritic ore",
] as const;

export const OCC_NAME = [
  "Waste",
  "Reef ore",
  "Pocket deposit",
  "Blue dust",
  "Lateritic ore",
  "Low-grade BHQ",
] as const;

/**
 * True grade range (% Fe) of each rock type, indexed by rock code. Generated grades are clamped
 * to these bounds; estimates can stray slightly outside them where confidence is low.
 */
export const GRADE_RANGE: ReadonlyArray<readonly [number, number]> = [
  [0, 0], // air
  [4, 24], // waste
  [26, 47], // BHQ
  [57, 67.5], // hematite
  [63, 67.6], // blue dust
  [40, 58], // laterite
];

/** Connected hematite/blue dust bodies smaller than this many cells are pockets. */
export const POCKET_MAX_CELLS = 70;

/** North index of the ridge crest for column i. */
export const ridgeJ = (i: number): number =>
  NY * 0.42 + 2.6 * Math.sin(i * 0.13 + 0.6) + 1.2 * Math.sin(i * 0.31);

/** Top solid cell (k) of every column. */
export function topography(noise: Noise): Int16Array {
  const ktop = new Int16Array(NX * NY);
  for (let j = 0; j < NY; j++)
    for (let i = 0; i < NX; i++) {
      const d = (j - ridgeJ(i)) / 7.5;
      const h = 0.22 + 0.78 * Math.exp(-d * d) + 0.2 * (noise.fbm(i * 0.09, j * 0.09, 3.3) - 0.5);
      ktop[col(i, j)] = clamp(Math.round(9 + h * 11), 8, NZ - 1);
    }
  return ktop;
}

export interface RockModel {
  type: Uint8Array;
  fe: Float32Array;
  errF: Float32Array;
  solid: Int32Array;
}

/**
 * Rock type, true grade and estimation-error field for every cell. Draws from `rand`
 * and `gauss` in a fixed k, j, i order, so the call order matters for determinism.
 */
export function rockModel(
  ktop: Int16Array,
  noise: Noise,
  rand: Rand,
  gauss: () => number,
): RockModel {
  const { fbm } = noise;
  const type = new Uint8Array(N);
  const fe = new Float32Array(N);
  const errF = new Float32Array(N);
  const solid: number[] = [];
  for (let k = 0; k < NZ; k++)
    for (let j = 0; j < NY; j++)
      for (let i = 0; i < NX; i++) {
        const n = id(i, j, k);
        const kt = ktop[col(i, j)];
        if (k > kt) continue; // air
        const depth = kt - k;
        // The iron formation dips: its centre line moves north with depth.
        const center = ridgeJ(i) + (NZ - 1 - k) * 0.38 - 1.5;
        const hw = 4.2 + 2.4 * fbm(i * 0.07, k * 0.11, 8.1);
        const e = fbm(i * 0.13, j * 0.13, k * 0.2 + 1.7);
        let t: RockType;
        let g: number;
        if (Math.abs(j - center) < hw) {
          if (depth <= 1 && e > 0.4) {
            t = LATERITE;
            g = clamp(46 + (e - 0.4) * 40 + gauss() * 2, ...GRADE_RANGE[LATERITE]);
          } else if (e > 0.58) {
            if (e > 0.63 && depth > 2 && fbm(i * 0.3, j * 0.3, k * 0.3 + 9) > 0.56) {
              t = BLUE_DUST;
              g = clamp(64.6 + gauss() * 0.8, ...GRADE_RANGE[BLUE_DUST]);
            } else {
              t = HEMATITE;
              g = clamp(59.5 + (e - 0.58) * 65 + gauss() * 1.2, ...GRADE_RANGE[HEMATITE]);
            }
          } else {
            t = BHQ;
            g = clamp(31 + (e - 0.3) * 42 + gauss() * 2.5, ...GRADE_RANGE[BHQ]);
          }
        } else {
          t = WASTE;
          g = clamp(7 + 14 * rand(), ...GRADE_RANGE[WASTE]);
        }
        type[n] = t;
        fe[n] = g;
        errF[n] = (fbm(i * 0.21, j * 0.21, k * 0.25 + 40) - 0.5) * 2;
        solid.push(n);
      }
  return { type, fe, errF, solid: Int32Array.from(solid) };
}

const NEIGHBOURS = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
] as const;

const isRichOre = (t: number) => t === HEMATITE || t === BLUE_DUST;

/**
 * Classifies each solid cell's occurrence. Hematite and blue dust are grouped into
 * 6-connected bodies; hematite in bodies under POCKET_MAX_CELLS cells is a pocket
 * deposit, otherwise reef ore.
 */
export function classifyOccurrence(type: Uint8Array, solid: ArrayLike<number>): Uint8Array {
  const occ = new Uint8Array(type.length);
  const seen = new Uint8Array(type.length);
  for (let s = 0; s < solid.length; s++) {
    const n = solid[s];
    if (type[n] === BLUE_DUST) occ[n] = 3;
    else if (type[n] === LATERITE) occ[n] = 4;
    else if (type[n] === BHQ) occ[n] = 5;
    if (!isRichOre(type[n]) || seen[n]) continue;
    const comp: number[] = [];
    const queue = [n];
    seen[n] = 1;
    while (queue.length) {
      const m = queue.pop()!;
      comp.push(m);
      const i = CI[m];
      const j = CJ[m];
      const k = CK[m];
      for (const [a, b, c] of NEIGHBOURS) {
        const ii = i + a;
        const jj = j + b;
        const kk = k + c;
        if (ii < 0 || jj < 0 || kk < 0 || ii >= NX || jj >= NY || kk >= NZ) continue;
        const mm = id(ii, jj, kk);
        if (!seen[mm] && isRichOre(type[mm])) {
          seen[mm] = 1;
          queue.push(mm);
        }
      }
    }
    const isPocket = comp.length < POCKET_MAX_CELLS;
    for (const m of comp) if (type[m] === HEMATITE) occ[m] = (isPocket ? 2 : 1) as Occurrence;
  }
  return occ;
}

/**
 * Float ore fragments shed downslope from ore outcropping at surface (estimated grade
 * of at least 50% Fe). Rotations are drawn after all positions, as in the prototype.
 */
export function floatOre(
  ktop: Int16Array,
  type: Uint8Array,
  est: Float32Array,
  rand: Rand,
): FloatOre[] {
  const out: Omit<FloatOre, "rot">[] = [];
  for (let j = 0; j < NY; j++)
    for (let i = 0; i < NX; i++) {
      const kt = ktop[col(i, j)];
      const n = id(i, j, kt);
      const t = type[n];
      if (!(t === HEMATITE || t === LATERITE || t === BLUE_DUST) || est[n] < 50) continue;
      const dir = Math.sign(j - ridgeJ(i)) || 1;
      for (let d = 1; d <= 6; d++) {
        const jj = j + dir * d;
        if (jj < 0 || jj >= NY) break;
        if (rand() < 0.5 * Math.exp(-d / 2.2)) {
          out.push({
            i: i + (rand() - 0.5) * 0.9,
            j: jj + (rand() - 0.5) * 0.9,
            ci: i,
            cj: jj,
            s: 0.1 + 0.17 * rand() * (1 - d / 8),
          });
        }
      }
    }
  return out.map((f) => ({ ...f, rot: [rand() * 3, rand() * 3, rand() * 3] }));
}
