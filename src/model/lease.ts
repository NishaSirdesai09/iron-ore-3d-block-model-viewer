import { SEED } from "./grid";
import { classifyOccurrence, floatOre, rockModel, topography } from "./geology";
import { existingHoles } from "./holes";
import { computeConf } from "./confidence";
import { estimateGrades } from "./estimate";
import { makeGauss, makeNoise, mulberry32 } from "./rng";
import type { Lease } from "./types";

/**
 * Generates the whole lease from one seeded random stream. The order of the steps is
 * part of the contract: noise table, rock model, drill holes, then float ore all draw
 * from the same stream, so reordering them changes every number downstream.
 */
export function createLease(seed: number = SEED): Lease {
  const rand = mulberry32(seed);
  const gauss = makeGauss(rand);
  const noise = makeNoise(rand);
  const ktop = topography(noise);
  const { type, fe, errF, solid } = rockModel(ktop, noise, rand, gauss);
  const occ = classifyOccurrence(type, solid);
  const holes = existingHoles(ktop, rand);
  const baseConf = computeConf(solid, ktop, holes);
  const est = estimateGrades(solid, type, fe, errF, baseConf);
  const floats = floatOre(ktop, type, est, rand);
  return { ktop, type, fe, occ, errF, solid, holes, baseConf, est, floats };
}

let cached: Lease | null = null;

/** The app's lease, generated once on first use. */
export function getLease(): Lease {
  if (!cached) cached = createLease();
  return cached;
}
