import { create } from "zustand";
import { NX, NY, NZ } from "../model/grid";
import { getLease } from "../model/lease";
import { computeConf } from "../model/confidence";
import { makePlannedHole, holeLengthM } from "../model/holes";
import { rankTargets } from "../model/planning";
import type { ColorMode, Hole, LogSpec, RockFilter, Tab, Target } from "../model/types";

export type ThemeName = "light" | "dark";

/** Theme colours read from the CSS custom properties, used by the 3D scene and the log canvas. */
export interface Palette {
  canvas: string;
  rockWaste: string;
  ochre: string;
  steel: string;
  text: string;
  muted: string;
  line: string;
  focus: string;
  core: string;
  rc: string;
  planned: string;
  float: string;
}

export interface CameraRequest {
  target: [number, number, number];
  r?: number;
  theta?: number;
  phi?: number;
  /** Increments on every request so repeated presets still animate. */
  nonce: number;
}

export const CAMERA_PRESETS = {
  overview: { target: [0, -1, 0], r: 66, theta: 0.75, phi: 1.02 },
  plan: { target: [0, 0, 0], r: 62, theta: 0, phi: 0.02 },
  section: { target: [0, -1, 0], r: 58, theta: Math.PI / 2, phi: 1.5 },
} as const satisfies Record<string, Omit<CameraRequest, "nonce">>;
export type CameraPreset = keyof typeof CAMERA_PRESETS;

export interface FeState {
  mode: ColorMode;
  rock: RockFilter;
  cut: number;
  minc: number;
  fade: boolean;
  sx: number;
  sy: number;
  sz: number;
  showSurface: boolean;
  showHoles: boolean;
  showFloat: boolean;
  tab: Tab;
  planMode: boolean;
  scenario: boolean;
  /** Pinned cell. */
  sel: number | null;
  /** Cell under the mouse. */
  hover: number | null;
  /** Pointer position over the 3D view, in CSS pixels from its top-left, while hovering a cell. */
  hoverPos: { x: number; y: number } | null;
  log: LogSpec | null;
  /** Highlighted target, by column, so it survives re-ranking only if the same column is still a target. */
  activeTarget: { i: number; j: number } | null;
  planned: Hole[];
  planSeq: number;
  /** Confidence with existing and planned holes. Same array as lease.baseConf when nothing is planned. */
  planConf: Float32Array;
  themeOverride: ThemeName | null;
  systemDark: boolean;
  palette: Palette | null;
  azimuth: number;
  cameraRequest: CameraRequest | null;

  set: (patch: Partial<FeState>) => void;
  selectTab: (t: Tab) => void;
  setPlanMode: (on: boolean) => void;
  addPlanned: (i: number, j: number) => void;
  removePlanned: (index: number) => void;
  selectCell: (n: number | null) => void;
  flyTo: (req: Omit<CameraRequest, "nonce">) => void;
  toggleTheme: () => void;
  resetSlices: () => void;
}

const lease = getLease();
const firstHole = lease.holes[3];

export const plannedLog = (h: Hole): LogSpec => ({
  name: h.id + " (planned)",
  kindLabel: "Planned core hole, predicted grades",
  i: h.i,
  j: h.j,
  bk: h.bk,
  assayed: false,
  plannedId: h.id,
});

export const holeLog = (h: Hole): LogSpec =>
  h.planned
    ? plannedLog(h)
    : {
        name: h.id,
        kindLabel: h.kind === "RC" ? "Reverse circulation hole, assayed" : "Core hole, assayed",
        i: h.i,
        j: h.j,
        bk: h.bk,
        assayed: true,
      };

export const targetLog = (t: Target): LogSpec => ({
  name: t.label,
  kindLabel: "Suggested core hole, predicted grades with uncertainty",
  i: t.i,
  j: t.j,
  bk: t.bk,
  assayed: false,
});

const confFor = (planned: Hole[]) =>
  planned.length
    ? computeConf(lease.solid, lease.ktop, [...lease.holes, ...planned])
    : lease.baseConf;

const systemDarkNow = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;

export const useStore = create<FeState>()((set, get) => ({
  mode: "grade",
  rock: "ore+bhq",
  cut: 45,
  minc: 0,
  fade: true,
  sx: NX - 1,
  sy: NY - 1,
  sz: NZ - 1,
  showSurface: true,
  showHoles: true,
  showFloat: true,
  tab: "model",
  planMode: false,
  scenario: false,
  sel: null,
  hover: null,
  hoverPos: null,
  log: holeLog(firstHole),
  activeTarget: null,
  planned: [],
  planSeq: 1,
  planConf: lease.baseConf,
  themeOverride: null,
  systemDark: Boolean(systemDarkNow()),
  palette: null,
  azimuth: CAMERA_PRESETS.overview.theta,
  cameraRequest: null,

  set: (patch) => set(patch),

  selectTab: (tab) => set((s) => ({ tab, planMode: tab === "plan" ? s.planMode : false })),

  setPlanMode: (planMode) => set({ planMode }),

  addPlanned: (i, j) => {
    const { planned, planSeq } = get();
    const h = makePlannedHole(lease.ktop, i, j, planSeq);
    const next = [...planned, h];
    set({
      planned: next,
      planSeq: planSeq + 1,
      planConf: confFor(next),
      activeTarget: null,
      log: plannedLog(h),
    });
  },

  removePlanned: (index) => {
    const { planned, log } = get();
    const removed = planned[index];
    if (!removed) return;
    const next = planned.filter((_, a) => a !== index);
    set({
      planned: next,
      planConf: confFor(next),
      activeTarget: null,
      // Do not leave the log showing a hole that no longer exists.
      log: log?.plannedId === removed.id ? null : log,
    });
  },

  selectCell: (sel) =>
    set((s) => ({
      sel,
      tab: sel != null && s.tab !== "model" ? "model" : s.tab,
      planMode: sel != null && s.tab !== "model" ? false : s.planMode,
    })),

  flyTo: (req) =>
    set((s) => ({ cameraRequest: { ...req, nonce: (s.cameraRequest?.nonce ?? 0) + 1 } })),

  toggleTheme: () =>
    set((s) => {
      const current = s.themeOverride ?? (s.systemDark ? "dark" : "light");
      return { themeOverride: current === "dark" ? "light" : "dark" };
    }),

  resetSlices: () => set({ sx: NX - 1, sy: NY - 1, sz: NZ - 1 }),
}));

export const effectiveTheme = (s: Pick<FeState, "themeOverride" | "systemDark">): ThemeName =>
  s.themeOverride ?? (s.systemDark ? "dark" : "light");

/** Confidence used for colouring, the inspector and logs: with planned holes when the scenario is on. */
export const selectActiveConf = (s: FeState): Float32Array =>
  s.scenario ? s.planConf : lease.baseConf;

// Target ranking is the most expensive derived value. It depends only on the cut-off and
// the plan, and is only needed while the Drill plan tab is open.
let targetCache: { cut: number; planned: Hole[]; targets: Target[] } | null = null;
const NO_TARGETS: Target[] = [];
export function selectTargets(s: FeState): Target[] {
  if (s.tab !== "plan") return NO_TARGETS;
  if (targetCache && targetCache.cut === s.cut && targetCache.planned === s.planned)
    return targetCache.targets;
  const targets = rankTargets(lease, s.planConf, s.cut, [...lease.holes, ...s.planned]);
  targetCache = { cut: s.cut, planned: s.planned, targets };
  return targets;
}

export const totalPlannedMetres = (planned: Hole[]): number =>
  planned.reduce((m, h) => m + holeLengthM(lease.ktop, h), 0);
