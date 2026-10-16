import { cost, price, probAbove, stageOf } from "../model/estimate";
import { WASTE } from "../model/geology";
import { clamp, lerp } from "../model/rng";
import type { ColorMode, Lease } from "../model/types";
import type { Palette } from "../state/store";

export type RGB = [number, number, number];
export type Ramp = ReadonlyArray<readonly [number, string]>;

export const hexToRgb = (h: string): RGB => {
  h = h.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
};

export const rgbCss = (c: RGB): string => `rgb(${c.map((x) => Math.round(x * 255)).join(",")})`;

/** Piecewise-linear colour ramp lookup. */
export function ramp(stops: Ramp, v: number): RGB {
  if (v <= stops[0][0]) return hexToRgb(stops[0][1]);
  for (let a = 1; a < stops.length; a++) {
    if (v <= stops[a][0]) {
      const t = (v - stops[a - 1][0]) / (stops[a][0] - stops[a - 1][0]);
      const A = hexToRgb(stops[a - 1][1]);
      const B = hexToRgb(stops[a][1]);
      return [lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)];
    }
  }
  return hexToRgb(stops[stops.length - 1][1]);
}

export const RAMPS = {
  grade: [
    [10, "#4d535b"],
    [30, "#868b91"],
    [42, "#b9a77a"],
    [50, "#d29a3c"],
    [58, "#c4582a"],
    [63, "#9a2a1f"],
    [67, "#561722"],
  ],
  conf: [
    [0, "#2b3340"],
    [0.25, "#3f5368"],
    [0.5, "#6a89a6"],
    [0.75, "#a6c2da"],
    [1, "#e6f0f7"],
  ],
  prob: [
    [0, "#3b3f46"],
    [0.3, "#6b5a3c"],
    [0.5, "#b5862f"],
    [0.8, "#e2b759"],
    [1, "#f6e7bd"],
  ],
  value: [
    [-1, "#40464e"],
    [0, "#5e636a"],
    [0.15, "#7f6a3f"],
    [0.5, "#c79a3b"],
    [1, "#f3d68a"],
  ],
} as const satisfies Record<string, Ramp>;

/** Occurrence colours, indexed by occurrence code. */
// Chosen to stay apart from each other and from the drill-hole and float-ore colours, using
// lightness as well as hue so they also separate for most colour-blind viewers.
export const OCC_COL = ["#6c727a", "#b8321f", "#f08a3c", "#4f74c4", "#e9cf5f", "#a3aab3"] as const;
/** UNFC stage colours, indexed 1..4. */
export const STAGE_COL = ["", "#efdcaa", "#c99a3e", "#86663a", "#4a433b"] as const;
export const STAGE_LABEL = [
  "",
  "G1 detailed",
  "G2 general",
  "G3 prospecting",
  "G4 reconnaissance",
] as const;
const NEUTRAL = "#3b3f46";

export const COLOR_MODES: ReadonlyArray<{ value: ColorMode; label: string; desc: string }> = [
  { value: "grade", label: "Fe grade", desc: "Estimated % Fe in each cell" },
  { value: "occ", label: "Type of occurrence", desc: "Reef, pocket, blue dust, lateritic" },
  {
    value: "prob",
    label: "Chance above cut-off",
    desc: "How likely a cell beats the cut-off grade",
  },
  { value: "conf", label: "Confidence", desc: "How much drilling sits behind the estimate" },
  { value: "stage", label: "UNFC stage", desc: "G1 to G4, from drill spacing" },
  { value: "value", label: "Indicative value", desc: "Margin per tonne after mining cost" },
];

/** Margin of ₹5,000/t maps to the top of the value ramp. */
export const VALUE_SCALE = 5000;

export interface ColorOptions {
  mode: ColorMode;
  cut: number;
  fade: boolean;
  palette: Palette;
}

/** Colour of a cell for the current mode, faded toward the background where confidence is low. */
export function cellColor(lease: Lease, n: number, conf: Float32Array, o: ColorOptions): RGB {
  const { type, est, occ, ktop } = lease;
  const t = type[n];
  const c = conf[n];
  let rgb: RGB;
  switch (o.mode) {
    case "grade":
      rgb = t === WASTE ? hexToRgb(o.palette.rockWaste) : ramp(RAMPS.grade, est[n]);
      break;
    case "occ":
      rgb = hexToRgb(t === WASTE ? o.palette.rockWaste : OCC_COL[occ[n]]);
      break;
    case "prob":
      rgb = t === WASTE ? hexToRgb(NEUTRAL) : ramp(RAMPS.prob, probAbove(est[n], c, o.cut));
      break;
    case "conf":
      rgb = ramp(RAMPS.conf, c);
      break;
    case "stage":
      rgb = t === WASTE ? hexToRgb(NEUTRAL) : hexToRgb(STAGE_COL[stageOf(c)]);
      break;
    case "value":
      if (t === WASTE || est[n] < o.cut) rgb = ramp(RAMPS.value, -1);
      else rgb = ramp(RAMPS.value, clamp((price(est[n]) - cost(ktop, n)) / VALUE_SCALE, -1, 1));
      break;
  }
  if (o.fade && t !== WASTE && o.mode !== "conf") {
    const bg = hexToRgb(o.palette.canvas);
    const f = (1 - c) * 0.62;
    rgb = [lerp(rgb[0], bg[0], f), lerp(rgb[1], bg[1], f), lerp(rgb[2], bg[2], f)];
  }
  return rgb;
}

/** CSS gradient for a ramp over [lo, hi]. */
export function rampCss(stops: Ramp, lo: number, hi: number): string {
  return (
    "linear-gradient(90deg," +
    stops
      .map((s) => `${rgbCss(ramp(stops, s[0]))} ${(((s[0] - lo) / (hi - lo)) * 100).toFixed(1)}%`)
      .join(",") +
    ")"
  );
}
