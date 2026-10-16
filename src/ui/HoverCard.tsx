import { useLayoutEffect, useRef, useState } from "react";
import { CELL_X, CELL_Y, CELL_Z, CI, CJ, CK, col } from "../model/grid";
import { BHQ, HEMATITE, OCC_NAME, WASTE } from "../model/geology";
import { OCC_COL } from "../scene/colors";
import {
  CELL_STATUS_LABEL,
  cellStatus,
  cellTonnes,
  probAbove,
  sigma,
  stageOf,
} from "../model/estimate";
import { getLease } from "../model/lease";
import { selectActiveConf, useStore } from "../state/store";

const lease = getLease();
const OFFSET = 16;

/** Host rock shown after the occurrence name, when it adds information. */
function occurrenceRock(t: number): string | null {
  if (t === HEMATITE) return "in hematite";
  if (t === WASTE) return "phyllite, shale";
  if (t === BHQ) return "banded hematite quartzite";
  return null; // blue dust and lateritic ore are named after their rock
}

function Meter({
  label,
  value,
  text,
  kind,
}: {
  label: string;
  value: number;
  text: string;
  kind: string;
}) {
  return (
    <div className="hc-row">
      <span>{label}</span>
      <span className={`hc-bar ${kind}`} aria-hidden="true">
        <i style={{ width: `${Math.round(value * 100)}%` }} />
      </span>
      <b>{text}</b>
    </div>
  );
}

/** Floating card next to the cursor: chance above cut-off and confidence for the hovered cell. */
export function HoverCard() {
  const n = useStore((s) => s.hover);
  const pos = useStore((s) => s.hoverPos);
  const cut = useStore((s) => s.cut);
  const conf = useStore(selectActiveConf);
  const waste = useStore((st) => st.palette?.rockWaste ?? "#6c727a");
  const card = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState({ left: 0, top: 0 });

  // Keep the card inside the 3D view: flip it to the other side of the cursor near an edge.
  useLayoutEffect(() => {
    const el = card.current;
    const stage = el?.parentElement;
    if (!el || !stage || !pos) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const left = pos.x + OFFSET + w > stage.clientWidth ? pos.x - OFFSET - w : pos.x + OFFSET;
    const top = pos.y + OFFSET + h > stage.clientHeight ? pos.y - OFFSET - h : pos.y + OFFSET;
    setPlace({ left: Math.max(4, left), top: Math.max(4, top) });
  }, [pos, n]);

  if (n == null || !pos) return null;

  const { type, est, ktop, occ } = lease;
  const i = CI[n];
  const j = CJ[n];
  const k = CK[n];
  const t = type[n];
  const c = conf[n];
  const from = (ktop[col(i, j)] - k) * CELL_Z;
  const ore = t !== WASTE;
  const chance = probAbove(est[n], c, cut);
  const status = cellStatus(chance, c);

  return (
    <div
      ref={card}
      className="hovercard"
      style={{ left: place.left, top: place.top }}
      role="tooltip"
      aria-live="off"
    >
      <div className="hc-head">
        <b>
          Cell {i}, {j}, {k}
        </b>
        <span>
          {from}–{from + CELL_Z} m deep
        </span>
      </div>
      <div className="hc-occ">
        <i style={{ background: ore ? OCC_COL[occ[n]] : waste }} aria-hidden="true" />
        <b>{OCC_NAME[occ[n]]}</b>
        {occurrenceRock(t) && <span>{occurrenceRock(t)}</span>}
      </div>
      <div className="hc-sub">
        {est[n].toFixed(1)}% Fe{ore ? ` ± ${sigma(c).toFixed(1)}` : ""} estimated grade
      </div>
      {ore && (
        <Meter
          label={`Chance ≥ ${cut}% Fe`}
          value={chance}
          text={`${Math.round(chance * 100)}%`}
          kind="prob"
        />
      )}
      <Meter label="Confidence" value={c} text={`${c.toFixed(2)} · G${stageOf(c)}`} kind="conf" />
      <div className="hc-foot">
        <span className={`hc-badge ${ore ? status : "waste"}`}>
          {ore ? CELL_STATUS_LABEL[status] : "Waste rock"}
        </span>
        <span>
          E {i * CELL_X} · N {j * CELL_Y} m
        </span>
      </div>
      <div className="hc-size">
        Cell {CELL_X} × {CELL_Y} × {CELL_Z} m · {Math.round(cellTonnes(type, n) / 1000)} kt
      </div>
    </div>
  );
}
