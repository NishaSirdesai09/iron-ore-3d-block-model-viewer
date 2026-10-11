// Compares the port with reference values produced by running the prototype itself
// (npm run golden). Any difference means the port is not numerically faithful.
import { describe, expect, it } from "vitest";
import golden from "./__fixtures__/golden.json";
import { createLease } from "./lease";
import { computeConf } from "./confidence";
import { g2OrBetterTonnes, summarize } from "./estimate";
import { makePlannedHole } from "./holes";
import { bestIntercept, columnLog, rankTargets } from "./planning";
import type { Target } from "./types";

const lease = createLease();
const { solid, ktop, type, fe, est, occ, baseConf } = lease;
const sum = (a: Float32Array) => {
  let s = 0;
  for (const n of solid) s += a[n];
  return s;
};
const pick = (ts: Target[]) =>
  ts.map((t) => ({ i: t.i, j: t.j, score: t.score, bk: t.bk, up: t.imp.up, bi: t.bi }));
const countBy = (arr: Uint8Array) =>
  [0, 1, 2, 3, 4, 5].map((v) => Array.from(solid).filter((n) => arr[n] === v).length);

describe("port matches the prototype", () => {
  it("geology", () => {
    expect(solid.length).toBe(golden.solidCount);
    expect(ktop.reduce((a, b) => a + b, 0)).toBe(golden.ktopSum);
    expect(countBy(type)).toEqual(golden.typeCounts);
    expect(countBy(occ)).toEqual(golden.occCounts);
    expect(sum(fe)).toBe(golden.feSum);
    expect(sum(est)).toBe(golden.estSum);
    expect(sum(baseConf)).toBe(golden.baseConfSum);
    for (const c of golden.sampleCells) {
      const n = c.n;
      expect({ n, type: type[n], fe: fe[n], est: est[n], conf: baseConf[n], occ: occ[n] }).toEqual(
        c,
      );
    }
  });

  it("drill holes", () => {
    const holes = lease.holes.map(({ id, i, j, kind, dc, bk }) => ({ id, i, j, kind, dc, bk }));
    expect(holes).toEqual(golden.holes);
  });

  it("float ore", () => {
    const f = lease.floats;
    const strip = ({ i, j, ci, cj, s }: (typeof f)[number]) => ({ i, j, ci, cj, s });
    expect(f.length).toBe(golden.floats.count);
    expect(strip(f[0])).toEqual(golden.floats.first);
    expect(strip(f[f.length - 1])).toEqual(golden.floats.last);
    expect(f[0].rot).toEqual(golden.floats.firstRot);
    expect(f[f.length - 1].rot).toEqual(golden.floats.lastRot);
  });

  it("resource summaries", () => {
    expect(summarize(solid, type, est, occ, baseConf, 45)).toEqual(golden.summary45);
    expect(summarize(solid, type, est, occ, baseConf, 55)).toEqual(golden.summary55);
  });

  it("DDH-04 drill log", () => {
    const h = lease.holes[3];
    const rows = columnLog(lease, baseConf, h.i, h.j, h.bk, true);
    expect(rows.map(({ from, to, t, g }) => ({ from, to, t, g }))).toEqual(golden.ddh04.log);
    expect(bestIntercept(rows, 45)).toEqual(golden.ddh04.bi);
  });

  it("targets", () => {
    expect(pick(rankTargets(lease, baseConf, 45, lease.holes))).toEqual(golden.targets45);
    expect(pick(rankTargets(lease, baseConf, 55, lease.holes))).toEqual(golden.targets55);
  });

  it("planned hole re-ranking and G2-or-better delta", () => {
    const t = golden.targets45[0];
    const p = makePlannedHole(ktop, t.i, t.j, 1);
    expect({ i: p.i, j: p.j, bk: p.bk }).toEqual(golden.plannedOne.hole);
    const all = [...lease.holes, p];
    const planConf = computeConf(solid, ktop, all);
    expect(pick(rankTargets(lease, planConf, 45, all))).toEqual(golden.plannedOne.targets);
    expect(g2OrBetterTonnes(solid, type, est, baseConf, 45)).toBe(golden.plannedOne.g2Before);
    expect(g2OrBetterTonnes(solid, type, est, planConf, 45)).toBe(golden.plannedOne.g2After);
  });
});
