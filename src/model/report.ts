import { BHQ, OCC_NAME, TYPE_NAME } from "./geology";
import { cellTonnes, isResource, probAbove, stageOf, summarize } from "./estimate";
import { bestIntercept, columnLog, interceptGrade } from "./planning";
import { holeLengthM } from "./holes";
import type { Lease } from "./types";

export interface GroupStats {
  name: string;
  cells: number;
  tonnes: number;
  /** Share of all solid rock tonnes, 0..1. */
  shareOfRock: number;
  /** Tonnage-weighted mean estimated grade, % Fe. */
  grade: number;
  /** Tonnage-weighted mean confidence, 0..0.97. */
  conf: number;
  /** Tonnage-weighted mean chance of beating the cut-off, 0..1 (BHQ and richer only). */
  chanceAbove: number | null;
  /** Tonnes by UNFC stage, indexed 1..4. */
  stages: number[];
}

export interface HoleRow {
  id: string;
  kind: string;
  east: number;
  north: number;
  depth: number;
  intercept: string;
}

export interface LeaseReport {
  cut: number;
  totalRockTonnes: number;
  byRock: GroupStats[];
  byOccurrenceAboveCut: GroupStats[];
  resource: { tonnes: number; grade: number; stages: number[]; conf: number };
  gradeTonnage: { cut: number; tonnes: number; grade: number; g2Plus: number }[];
  holes: HoleRow[];
  floatFragments: number;
}

function group(
  lease: Lease,
  name: string,
  cells: number[],
  totalRock: number,
  cut: number,
  withChance: boolean,
): GroupStats {
  const { type, est, baseConf } = lease;
  let T = 0;
  let G = 0;
  let C = 0;
  let P = 0;
  const stages = [0, 0, 0, 0, 0];
  for (const n of cells) {
    const t = cellTonnes(type, n);
    T += t;
    G += t * est[n];
    C += t * baseConf[n];
    P += t * probAbove(est[n], baseConf[n], cut);
    stages[stageOf(baseConf[n])] += t;
  }
  return {
    name,
    cells: cells.length,
    tonnes: T,
    shareOfRock: totalRock ? T / totalRock : 0,
    grade: T ? G / T : 0,
    conf: T ? C / T : 0,
    chanceAbove: withChance && T ? P / T : null,
    stages,
  };
}

/** Everything the downloadable report shows, computed on existing drilling only. */
export function buildReport(lease: Lease, cut: number): LeaseReport {
  const { solid, type, est, occ, baseConf, ktop } = lease;
  const all = Array.from(solid);
  const totalRock = all.reduce((s, n) => s + cellTonnes(type, n), 0);

  // Rock types 1..5, richest first.
  const byRock = [3, 4, 5, 2, 1].map((t) =>
    group(
      lease,
      TYPE_NAME[t],
      all.filter((n) => type[n] === t),
      totalRock,
      cut,
      t >= BHQ,
    ),
  );

  const above = all.filter((n) => isResource(type, est, n, cut));
  const byOccurrenceAboveCut = [1, 2, 3, 4, 5].map((o) =>
    group(
      lease,
      OCC_NAME[o],
      above.filter((n) => occ[n] === o),
      totalRock,
      cut,
      true,
    ),
  );

  const sum = summarize(solid, type, est, occ, baseConf, cut);
  const resConf = group(lease, "Resource", above, totalRock, cut, true).conf;

  const gradeTonnage = [40, 45, 50, 55, 58, 60, 62, 64].map((c) => {
    const s = summarize(solid, type, est, occ, baseConf, c);
    return { cut: c, tonnes: s.tonnes, grade: s.grade, g2Plus: s.stages[1] + s.stages[2] };
  });

  const holes = lease.holes.map((h) => {
    const rows = columnLog(lease, baseConf, h.i, h.j, h.bk, true);
    const bi = bestIntercept(rows, cut);
    return {
      id: h.id,
      kind: h.kind === "RC" ? "Reverse circulation" : "Core",
      east: h.i * 25,
      north: h.j * 25,
      depth: holeLengthM(ktop, h),
      intercept: bi
        ? `${bi.to - bi.from} m at ${interceptGrade(bi).toFixed(1)}% Fe from ${bi.from} m`
        : `None above ${cut}% Fe`,
    };
  });

  return {
    cut,
    totalRockTonnes: totalRock,
    byRock,
    byOccurrenceAboveCut,
    resource: { tonnes: sum.tonnes, grade: sum.grade, stages: sum.stages, conf: resConf },
    gradeTonnage,
    holes,
    floatFragments: lease.floats.length,
  };
}
