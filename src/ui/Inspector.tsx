import { CELL_X, CELL_Y, CELL_Z, CI, CJ, CK, RL, col } from "../model/grid";
import { OCC_NAME, TYPE_NAME } from "../model/geology";
import {
  CELL_STATUS_LABEL,
  cellStatus,
  cellTonnes,
  margin,
  probAbove,
  sigma,
  stageOf,
} from "../model/estimate";
import { getLease } from "../model/lease";
import { selectActiveConf, useStore } from "../state/store";

const lease = getLease();

/** Readout for the pinned cell, or the hovered one when nothing is pinned. */
export function Inspector() {
  const sel = useStore((s) => s.sel);
  const hover = useStore((s) => s.hover);
  const cut = useStore((s) => s.cut);
  const conf = useStore(selectActiveConf);
  const n = sel ?? hover;

  let body;
  if (n == null) {
    body = (
      <p className="hint" style={{ margin: 0 }}>
        Hover over a cell to read it, click to pin it.
      </p>
    );
  } else {
    const { type, est, occ, ktop } = lease;
    const c = conf[n];
    const t = type[n];
    const i = CI[n];
    const j = CJ[n];
    const k = CK[n];
    const depth = (ktop[col(i, j)] - k) * 10 + 5;
    const sg = sigma(c);
    const P = probAbove(est[n], c, cut);
    const ore = t > 1;
    body = (
      <dl className="kv">
        <dt>Cell</dt>
        <dd>
          {i}, {j}, {k} · {CELL_X} × {CELL_Y} × {CELL_Z} m
        </dd>
        <dt>Position</dt>
        <dd>
          E {i * 25} m, N {j * 25} m
        </dd>
        <dt>Elevation</dt>
        <dd>
          RL {RL(k)} m, {depth} m below surface
        </dd>
        <dt>Rock</dt>
        <dd>{TYPE_NAME[t]}</dd>
        {ore && (
          <>
            <dt>Occurrence</dt>
            <dd>{OCC_NAME[occ[n]]}</dd>
          </>
        )}
        <dt>Estimated grade</dt>
        <dd>
          {est[n].toFixed(1)}% Fe{ore ? ` ± ${sg.toFixed(1)}` : ""}
        </dd>
        {ore && (
          <>
            <dt>Chance ≥ {cut}% Fe</dt>
            <dd>{Math.round(P * 100)}%</dd>
            <dt>Confidence</dt>
            <dd>
              {c.toFixed(2)}, G{stageOf(c)}
            </dd>
            <dt>Status</dt>
            <dd>{CELL_STATUS_LABEL[cellStatus(P, c)]}</dd>
          </>
        )}
        <dt>Tonnes in cell</dt>
        <dd>{Math.round(cellTonnes(type, n) / 1000)} kt</dd>
        {ore && est[n] >= cut && (
          <>
            <dt>Indicative margin</dt>
            <dd>₹{Math.round(margin(ktop, est, n)).toLocaleString("en-IN")}/t</dd>
          </>
        )}
      </dl>
    );
  }

  return (
    <section className="sec">
      <h2>Cell inspector</h2>
      <div aria-live="polite">{body}</div>
    </section>
  );
}
