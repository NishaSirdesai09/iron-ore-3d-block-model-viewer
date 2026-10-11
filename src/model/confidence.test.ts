import { describe, expect, it } from "vitest";
import { MAX_CONF, SURFACE_FLOOR, computeConf } from "./confidence";
import { NX, id } from "./grid";
import { getLease } from "./lease";

describe("computeConf", () => {
  const lease = getLease();
  const { ktop, solid } = lease;
  const kAt = (i: number, j: number) => ktop[i + NX * j];

  it("is high right beside a hole and capped at 0.97", () => {
    const h = lease.holes[3];
    const c = lease.baseConf[id(h.i, h.j, kAt(h.i, h.j) - 5)];
    expect(c).toBeGreaterThan(0.9);
    expect(c).toBeLessThanOrEqual(Math.fround(MAX_CONF));
  });

  it("decays with horizontal distance", () => {
    const conf = computeConf(solid, ktop, [{ i: 20, j: 15, bk: 0 }]);
    const k = Math.min(kAt(20, 15), kAt(23, 15), kAt(26, 15)) - 4;
    const near = conf[id(20, 15, k)];
    const mid = conf[id(23, 15, k)];
    const far = conf[id(26, 15, k)];
    expect(near).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(far);
    expect(far).toBeGreaterThan(0);
  });

  it("is zero beyond seven cells from every hole, below the surface", () => {
    const conf = computeConf(solid, ktop, [{ i: 2, j: 2, bk: 0 }]);
    expect(conf[id(40, 28, kAt(40, 28) - 4)]).toBe(0);
  });

  it("gives the top two cells of every column the surface mapping floor", () => {
    const conf = computeConf(solid, ktop, []);
    const kt = kAt(40, 28);
    expect(conf[id(40, 28, kt)]).toBeCloseTo(SURFACE_FLOOR, 6);
    expect(conf[id(40, 28, kt - 1)]).toBeCloseTo(SURFACE_FLOOR, 6);
    expect(conf[id(40, 28, kt - 2)]).toBe(0);
  });

  it("falls off below the hole bottom", () => {
    const bk = 8;
    const conf = computeConf(solid, ktop, [{ i: 20, j: 15, bk }]);
    expect(conf[id(20, 15, bk)]).toBeGreaterThan(0.9);
    expect(conf[id(20, 15, bk - 3)]).toBeLessThan(conf[id(20, 15, bk)]);
    expect(conf[id(20, 15, 0)]).toBeLessThan(0.01);
  });

  it("increases when holes are added", () => {
    const one = computeConf(solid, ktop, [{ i: 20, j: 15, bk: 0 }]);
    const two = computeConf(solid, ktop, [
      { i: 20, j: 15, bk: 0 },
      { i: 22, j: 15, bk: 0 },
    ]);
    expect(Array.from(solid).filter((n) => two[n] < one[n])).toEqual([]);
  });
});
