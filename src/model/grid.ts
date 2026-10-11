/** Grid dimensions in cells: east (i), north (j), up (k). */
export const NX = 44;
export const NY = 32;
export const NZ = 20;
export const N = NX * NY * NZ;

/** Cell size in metres. */
export const CELL_X = 25;
export const CELL_Y = 25;
export const CELL_Z = 10;
export const CELL_VOLUME = CELL_X * CELL_Y * CELL_Z;

/** Height of one cell in world units (1.5× vertical exaggeration relative to 10/25). */
export const VE = 0.6;

/** Seed used for the whole lease. */
export const SEED = 2655;

export const id = (i: number, j: number, k: number): number => i + NX * (j + NY * k);
export const col = (i: number, j: number): number => i + NX * j;

/** Reduced level (elevation) of the base of cell row k, metres. */
export const RL = (k: number): number => 820 + k * CELL_Z;

/** Cell coordinates for every index. */
export const CI = new Int16Array(N);
export const CJ = new Int16Array(N);
export const CK = new Int16Array(N);
for (let k = 0; k < NZ; k++)
  for (let j = 0; j < NY; j++)
    for (let i = 0; i < NX; i++) {
      const n = id(i, j, k);
      CI[n] = i;
      CJ[n] = j;
      CK[n] = k;
    }

/** World coordinates of a cell centre (x east, y up, z south). */
export const wx = (i: number): number => i - NX / 2 + 0.5;
export const wz = (j: number): number => -(j - NY / 2 + 0.5);
export const wy = (k: number): number => (k - NZ / 2 + 0.5) * VE;

/** Inverse of wx / wz, rounded and clamped to the grid. */
export const worldToCol = (x: number, z: number): { i: number; j: number } => ({
  i: Math.max(0, Math.min(NX - 1, Math.round(x + NX / 2 - 0.5))),
  j: Math.max(0, Math.min(NY - 1, Math.round(-z + NY / 2 - 0.5))),
});
