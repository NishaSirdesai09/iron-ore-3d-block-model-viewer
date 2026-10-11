import { CI, CJ, CK, NX, NY, N, col, id } from "./grid";
import { MAX_CONF, R2, holeInfluence } from "./confidence";
import { MAX_PRICE, cellTonnes, isResource, price, probAbove, sigma } from "./estimate";
import { plannedBottom } from "./holes";
import type { HoleFootprint, Impact, Intercept, Lease, LogRow, RockType, Target } from "./types";

export const TARGET_COUNT = 5;
/** Targets must be at least this far apart (squared cells, i.e. 5 cells). */
export const TARGET_SPACING2 = 25;
/** Targets must be at least this far from any existing or planned hole (squared cells, i.e. 3 cells). */
export const HOLE_CLEARANCE2 = 9;
/** Columns within this radius (squared cells) contribute to a target's score. */
const SCORE_RADIUS2 = 16;
const TARGET_LABELS = "ABCDE";

/** Cells down one column, from the top solid cell to `bk`, with assayed or predicted grades. */
export function columnLog(
  lease: Lease,
  conf: Float32Array,
  i: number,
  j: number,
  bk: number,
  assayed: boolean,
): LogRow[] {
  const kt = lease.ktop[col(i, j)];
  const rows: LogRow[] = [];
  for (let k = kt; k >= bk; k--) {
    const n = id(i, j, k);
    rows.push({
      from: (kt - k) * 10,
      to: (kt - k + 1) * 10,
      t: lease.type[n] as RockType,
      g: assayed ? lease.fe[n] : lease.est[n],
      s: assayed ? 0 : sigma(conf[n]),
      n,
    });
  }
  return rows;
}

/** Longest continuous run of ore (BHQ or richer) at or above the cut-off. Earlier runs win ties. */
export function bestIntercept(rows: ReadonlyArray<LogRow>, cut: number): Intercept | null {
  let best: Intercept | null = null;
  let cur: Intercept | null = null;
  const longer = (a: Intercept, b: Intercept | null) => !b || a.to - a.from > b.to - b.from;
  for (const r of rows) {
    if (r.g >= cut && r.t > 1) {
      if (!cur) cur = { from: r.from, to: r.to, sum: r.g * 10 };
      else {
        cur.to = r.to;
        cur.sum += r.g * 10;
      }
    } else {
      if (cur && longer(cur, best)) best = cur;
      cur = null;
    }
  }
  if (cur && longer(cur, best)) best = cur;
  return best;
}

/** Average grade over an intercept. */
export const interceptGrade = (bi: Intercept): number => bi.sum / (bi.to - bi.from);

/** Tonnes above cut-off that a new hole would lift from below G2 to G2 or better. */
export function impactOf(lease: Lease, h: HoleFootprint, conf: Float32Array, cut: number): Impact {
  const { solid, type, est } = lease;
  let up = 0;
  for (let s = 0; s < solid.length; s++) {
    const n = solid[s];
    if (!isResource(type, est, n, cut)) continue;
    const di = CI[n] - h.i;
    const dj = CJ[n] - h.j;
    if (di * di + dj * dj > 49) continue;
    const f = holeInfluence(h, CI[n], CJ[n], CK[n]);
    const c0 = conf[n];
    const c1 = Math.min(MAX_CONF, 1 - (1 - c0) * (1 - f * MAX_CONF));
    if (c0 < 0.5 && c1 >= 0.5) up += cellTonnes(type, n);
  }
  return { up };
}

/**
 * Value-of-information ranking. Each cell is weighted by tonnes × P(1−P) (largest where
 * the chance of beating the cut-off is near 50%) and by price. Every column is scored by
 * how much confidence a planned core hole there would add to nearby weighted cells; the
 * top columns are then picked greedily, keeping targets apart and clear of existing holes.
 */
export function rankTargets(
  lease: Lease,
  conf: Float32Array,
  cut: number,
  allHoles: ReadonlyArray<HoleFootprint>,
): Target[] {
  const { solid, type, est, ktop } = lease;
  const w = new Float32Array(N);
  for (let s = 0; s < solid.length; s++) {
    const n = solid[s];
    if (type[n] < 2) continue;
    const P = probAbove(est[n], conf[n], cut);
    w[n] = cellTonnes(type, n) * P * (1 - P) * 4 * (0.4 + price(Math.max(est[n], 45)) / MAX_PRICE);
  }

  const score = new Float32Array(NX * NY);
  for (let cj = 0; cj < NY; cj++)
    for (let ci = 0; ci < NX; ci++) {
      const bk = plannedBottom(ktop, ci, cj);
      let s = 0;
      for (let dj = -4; dj <= 4; dj++)
        for (let di = -4; di <= 4; di++) {
          const ii = ci + di;
          const jj = cj + dj;
          if (ii < 0 || jj < 0 || ii >= NX || jj >= NY) continue;
          const d2 = di * di + dj * dj;
          if (d2 > SCORE_RADIUS2) continue;
          const f = Math.exp(-d2 / R2);
          for (let k = ktop[col(ii, jj)]; k >= 0; k--) {
            const n = id(ii, jj, k);
            if (!w[n]) continue;
            let fk = f;
            if (k < bk) {
              const dz = (bk - k) / 2.5;
              fk *= Math.exp(-dz * dz);
            }
            const c = conf[n];
            s += w[n] * Math.max(0, 1 - (1 - c) * (1 - fk * MAX_CONF) - c);
          }
        }
      score[col(ci, cj)] = s;
    }

  const order = [...score.keys()].sort((a, b) => score[b] - score[a]);
  const picks: { i: number; j: number; score: number }[] = [];
  for (const c of order) {
    const i = c % NX;
    const j = Math.floor(c / NX);
    if (picks.some((p) => (p.i - i) ** 2 + (p.j - j) ** 2 < TARGET_SPACING2)) continue;
    if (allHoles.some((h) => (h.i - i) ** 2 + (h.j - j) ** 2 < HOLE_CLEARANCE2)) continue;
    picks.push({ i, j, score: score[c] });
    if (picks.length === TARGET_COUNT) break;
  }

  const top = picks[0] ? picks[0].score : 1;
  return picks.map((p, a) => {
    const bk = plannedBottom(ktop, p.i, p.j);
    const imp = impactOf(lease, { i: p.i, j: p.j, bk }, conf, cut);
    const bi = bestIntercept(columnLog(lease, conf, p.i, p.j, bk, false), cut);
    return { ...p, label: "Target " + TARGET_LABELS[a], bk, rel: p.score / top, imp, bi };
  });
}
