import { useMemo } from "react";
import { OCC_NAME } from "../model/geology";
import { fmtMt, summarize } from "../model/estimate";
import { getLease } from "../model/lease";
import { OCC_COL, STAGE_COL, STAGE_LABEL } from "../scene/colors";
import { useStore } from "../state/store";

const lease = getLease();

/** Tonnes and grade above cut-off, by UNFC stage and occurrence. Reported on current drilling only. */
export function ResourceSummary() {
  const cut = useStore((s) => s.cut);
  const sum = useMemo(
    () => summarize(lease.solid, lease.type, lease.est, lease.occ, lease.baseConf, cut),
    [cut],
  );
  const T = sum.tonnes;
  return (
    <>
      <section className="sec">
        <h2>Resource above cut-off</h2>
        <div className="stat">
          <div>
            <b>{T ? fmtMt(T) : "0"}</b>
            <span>million tonnes</span>
          </div>
          <div>
            <b>{T ? sum.grade.toFixed(1) : "–"}</b>
            <span>average grade, % Fe</span>
          </div>
        </div>
        <div className="stack" aria-hidden="true">
          {[1, 2, 3, 4].map((s) => (
            <i
              key={s}
              style={{ width: `${T ? (sum.stages[s] / T) * 100 : 0}%`, background: STAGE_COL[s] }}
            />
          ))}
        </div>
        <div className="rows">
          {[1, 2, 3, 4].map((s) => (
            <div key={s}>
              <i style={{ background: STAGE_COL[s] }} />
              <span>{STAGE_LABEL[s]}</span>
              <em>{fmtMt(sum.stages[s])} Mt</em>
            </div>
          ))}
        </div>
        <p className="hint">
          Confidence stages follow the spirit of India&apos;s UNFC geological axis (G1 detailed
          exploration to G4 reconnaissance), mapped here from drill spacing.
        </p>
      </section>
      <section className="sec">
        <h2>By type of occurrence</h2>
        <div className="rows">
          {[1, 2, 3, 4, 5].map((o) => (
            <div key={o}>
              <i style={{ background: OCC_COL[o] }} />
              <span>{OCC_NAME[o]}</span>
              <em>{fmtMt(sum.occ[o])} Mt</em>
            </div>
          ))}
        </div>
        <p className="hint">
          {lease.floats.length} float-ore fragments mapped downslope of ore outcrops. They point
          back uphill to where the ore body reaches surface.
        </p>
      </section>
    </>
  );
}
