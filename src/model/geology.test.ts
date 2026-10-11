import { describe, expect, it } from "vitest";
import {
  BHQ,
  BLUE_DUST,
  HEMATITE,
  LATERITE,
  POCKET_MAX_CELLS,
  WASTE,
  classifyOccurrence,
} from "./geology";
import { N, id } from "./grid";
import { getLease } from "./lease";

type Cell = [number, number, number];

function box(i0: number, i1: number, j0: number, j1: number, k0: number, k1: number): Cell[] {
  const out: Cell[] = [];
  for (let i = i0; i < i1; i++)
    for (let j = j0; j < j1; j++) for (let k = k0; k < k1; k++) out.push([i, j, k]);
  return out;
}

describe("classifyOccurrence", () => {
  it("separates small pockets from large reef bodies", () => {
    const type = new Uint8Array(N);
    const pocket = box(0, 2, 0, 2, 0, 2); // 8 cells
    const reef = box(20, 30, 10, 14, 5, 7); // 80 cells
    expect(reef.length).toBeGreaterThanOrEqual(POCKET_MAX_CELLS);
    for (const [i, j, k] of [...pocket, ...reef]) type[id(i, j, k)] = HEMATITE;
    type[id(25, 12, 6)] = BLUE_DUST;
    type[id(40, 30, 0)] = LATERITE;
    type[id(41, 30, 0)] = BHQ;
    type[id(42, 30, 0)] = WASTE;
    const others: Cell[] = [
      [40, 30, 0],
      [41, 30, 0],
      [42, 30, 0],
    ];
    const solid = [...pocket, ...reef, ...others].map(([i, j, k]) => id(i, j, k));

    const occ = classifyOccurrence(type, solid);
    expect(occ[id(0, 0, 0)]).toBe(2);
    expect(occ[id(1, 1, 1)]).toBe(2);
    expect(occ[id(20, 10, 5)]).toBe(1);
    expect(occ[id(25, 12, 6)]).toBe(3);
    expect(occ[id(40, 30, 0)]).toBe(4);
    expect(occ[id(41, 30, 0)]).toBe(5);
    expect(occ[id(42, 30, 0)]).toBe(0);
  });

  it("counts blue dust towards body size, so hematite joined to it can be reef", () => {
    const type = new Uint8Array(N);
    const blue = box(0, 10, 0, 7, 0, 1); // 70 cells of blue dust
    for (const [i, j, k] of blue) type[id(i, j, k)] = BLUE_DUST;
    type[id(0, 0, 1)] = HEMATITE;
    const occ = classifyOccurrence(type, [...blue.map(([i, j, k]) => id(i, j, k)), id(0, 0, 1)]);
    expect(occ[id(0, 0, 1)]).toBe(1);
  });

  it("does not join bodies that only touch diagonally", () => {
    const type = new Uint8Array(N);
    const a = id(5, 5, 5);
    const b = id(6, 6, 5);
    type[a] = HEMATITE;
    type[b] = HEMATITE;
    const occ = classifyOccurrence(type, [a, b]);
    expect(occ[a]).toBe(2);
    expect(occ[b]).toBe(2);
  });

  it("classifies every hematite cell in the generated lease as reef or pocket", () => {
    const { solid, type, occ } = getLease();
    let reef = 0;
    let pocket = 0;
    for (const n of solid) {
      if (type[n] !== HEMATITE) continue;
      expect([1, 2]).toContain(occ[n]);
      if (occ[n] === 1) reef++;
      else pocket++;
    }
    expect(reef).toBeGreaterThan(0);
    expect(pocket).toBeGreaterThan(0);
  });
});
