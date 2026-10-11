import { describe, expect, it } from "vitest";
import { getLease } from "./lease";
import { HOLE_CLEARANCE2, TARGET_SPACING2, bestIntercept, rankTargets } from "./planning";
import type { LogRow, RockType } from "./types";

const row = (from: number, g: number, t: RockType = 3): LogRow => ({
  from,
  to: from + 10,
  t,
  g,
  s: 0,
  n: 0,
});

describe("bestIntercept", () => {
  it("returns null when nothing beats the cut-off", () => {
    expect(bestIntercept([row(0, 30), row(10, 40)], 45)).toBeNull();
  });

  it("picks the longest run and averages its grade", () => {
    const rows = [50, 30, 60, 62, 58, 20, 66].map((g, a) => row(a * 10, g));
    const bi = bestIntercept(rows, 45)!;
    expect([bi.from, bi.to]).toEqual([20, 50]);
    expect(bi.sum / (bi.to - bi.from)).toBeCloseTo(60, 9);
  });

  it("counts a run that reaches the bottom of the hole", () => {
    const bi = bestIntercept(
      [30, 50, 55, 60].map((g, a) => row(a * 10, g)),
      45,
    )!;
    expect([bi.from, bi.to]).toEqual([10, 40]);
  });

  it("ignores waste even when its grade is high", () => {
    expect(bestIntercept([row(0, 60, 1)], 45)).toBeNull();
  });

  it("keeps the earlier run on a tie", () => {
    const bi = bestIntercept(
      [50, 20, 50].map((g, a) => row(a * 10, g)),
      45,
    )!;
    expect(bi.from).toBe(0);
  });
});

describe("rankTargets", () => {
  const lease = getLease();
  const targets = rankTargets(lease, lease.baseConf, 45, lease.holes);

  it("returns five labelled targets in descending score", () => {
    expect(targets.map((t) => t.label)).toEqual([
      "Target A",
      "Target B",
      "Target C",
      "Target D",
      "Target E",
    ]);
    for (let a = 1; a < targets.length; a++)
      expect(targets[a].score).toBeLessThanOrEqual(targets[a - 1].score);
    expect(targets[0].rel).toBe(1);
  });

  it("keeps targets at least 5 cells apart", () => {
    for (let a = 0; a < targets.length; a++)
      for (let b = a + 1; b < targets.length; b++) {
        const d2 = (targets[a].i - targets[b].i) ** 2 + (targets[a].j - targets[b].j) ** 2;
        expect(d2).toBeGreaterThanOrEqual(TARGET_SPACING2);
      }
  });

  it("keeps targets at least 3 cells from existing holes", () => {
    for (const t of targets)
      for (const h of lease.holes)
        expect((t.i - h.i) ** 2 + (t.j - h.j) ** 2).toBeGreaterThanOrEqual(HOLE_CLEARANCE2);
  });
});
