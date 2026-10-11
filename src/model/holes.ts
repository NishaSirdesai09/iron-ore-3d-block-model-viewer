import { NY, col } from "./grid";
import { ridgeJ } from "./geology";
import { clamp, type Rand } from "./rng";
import type { Hole } from "./types";

/** Depth of a planned core hole, in cells below the top solid cell. */
export const PLANNED_DEPTH_CELLS = 17;

/** Column offsets (i, j from ridge crest) of the existing drilling. */
const COLLARS: ReadonlyArray<readonly [number, number]> = [
  [5, 0],
  [10, -2],
  [14, 1],
  [19, 0],
  [23, 2],
  [27, -1],
  [32, 1],
  [37, 0],
  [8, 4],
  [17, 5],
  [29, 5],
  [13, -6],
  [25, -6],
  [35, -5],
];

/** The 14 existing holes. Every third one is reverse circulation, the rest core. Draws 14 times from `rand`. */
export function existingHoles(ktop: Int16Array, rand: Rand): Hole[] {
  return COLLARS.map(([i, dj], n) => {
    const j = clamp(Math.round(ridgeJ(i) + dj), 0, NY - 1);
    const kt = ktop[col(i, j)];
    const dc = 14 + Math.floor(rand() * 6);
    const rc = n % 3 === 2;
    return {
      id: (rc ? "RC-" : "DDH-") + String(n + 1).padStart(2, "0"),
      i,
      j,
      kind: rc ? "RC" : "Core",
      dc,
      bk: Math.max(0, kt - dc),
      planned: false,
    };
  });
}

/** Bottom cell of a planned core hole collared at (i, j). */
export const plannedBottom = (ktop: Int16Array, i: number, j: number): number =>
  Math.max(0, ktop[col(i, j)] - PLANNED_DEPTH_CELLS);

export function makePlannedHole(ktop: Int16Array, i: number, j: number, seq: number): Hole {
  return {
    id: "P-" + String(seq).padStart(2, "0"),
    i,
    j,
    kind: "Core",
    dc: PLANNED_DEPTH_CELLS,
    bk: plannedBottom(ktop, i, j),
    planned: true,
  };
}

/** Metres drilled from the collar (top of cell ktop) to the base of cell bk. */
export const holeLengthM = (ktop: Int16Array, h: { i: number; j: number; bk: number }): number =>
  (ktop[col(h.i, h.j)] - h.bk + 1) * 10;
