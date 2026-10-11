import { NX, NY, VE, col, wy } from "../model/grid";
import { getLease } from "../model/lease";
import { clamp } from "../model/rng";

const lease = getLease();

/** World height of the top face of the column nearest (fi, fj). */
export const surfaceY = (fi: number, fj: number): number => {
  const i = clamp(Math.round(fi), 0, NX - 1);
  const j = clamp(Math.round(fj), 0, NY - 1);
  return wy(lease.ktop[col(i, j)]) + VE * 0.5;
};
