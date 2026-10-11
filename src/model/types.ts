/** Rock type codes: 0 air, 1 waste, 2 BHQ, 3 hematite, 4 blue dust, 5 laterite. */
export type RockType = 0 | 1 | 2 | 3 | 4 | 5;

/** Occurrence codes: 0 waste, 1 reef, 2 pocket, 3 blue dust, 4 lateritic, 5 low-grade BHQ. */
export type Occurrence = 0 | 1 | 2 | 3 | 4 | 5;

export type HoleKind = "Core" | "RC";

export interface Hole {
  id: string;
  i: number;
  j: number;
  kind: HoleKind;
  /** Drilled depth in cells below the top solid cell. */
  dc: number;
  /** Bottom cell index (k) reached by the hole. */
  bk: number;
  planned: boolean;
}

/** Minimal shape needed to compute a hole's influence on confidence. */
export interface HoleFootprint {
  i: number;
  j: number;
  bk: number;
}

export interface FloatOre {
  /** Jittered fractional column position. */
  i: number;
  j: number;
  /** Column the fragment sits in (used for surface height). */
  ci: number;
  cj: number;
  /** Fragment size in world units. */
  s: number;
  /** Euler rotation (radians). */
  rot: [number, number, number];
}

/** The generated lease: geology, existing holes, base confidence and estimates. Read-only after creation. */
export interface Lease {
  ktop: Int16Array;
  type: Uint8Array;
  fe: Float32Array;
  occ: Uint8Array;
  errF: Float32Array;
  /** Indices of all non-air cells, in k, j, i order. */
  solid: Int32Array;
  holes: Hole[];
  baseConf: Float32Array;
  est: Float32Array;
  floats: FloatOre[];
}

export interface LogRow {
  /** Depth interval in metres below the collar. */
  from: number;
  to: number;
  t: RockType;
  /** Assayed or predicted grade, % Fe. */
  g: number;
  /** One-sigma uncertainty, % Fe (0 for assays). */
  s: number;
  /** Cell index. */
  n: number;
}

export interface Intercept {
  from: number;
  to: number;
  /** Grade × metres accumulated over the interval. */
  sum: number;
}

export interface Impact {
  /** Tonnes lifted from below G2 to G2 or better. */
  up: number;
}

export interface Target {
  i: number;
  j: number;
  score: number;
  label: string;
  bk: number;
  /** Score relative to the top target, 0..1. */
  rel: number;
  imp: Impact;
  bi: Intercept | null;
}

export interface LogSpec {
  name: string;
  kindLabel: string;
  i: number;
  j: number;
  bk: number;
  assayed: boolean;
  /** Set when the log belongs to a planned hole, so removing it can clear the log. */
  plannedId?: string;
}

export interface ResourceSummary {
  tonnes: number;
  grade: number;
  /** Tonnes by UNFC stage, indexed 1..4 (index 0 unused). */
  stages: number[];
  /** Tonnes by occurrence, indexed 0..5. */
  occ: number[];
}

export type ColorMode = "grade" | "occ" | "prob" | "conf" | "stage" | "value";
export type RockFilter = "ore" | "ore+bhq" | "all";
export type Tab = "model" | "plan" | "about";
export type Stage = 1 | 2 | 3 | 4;
