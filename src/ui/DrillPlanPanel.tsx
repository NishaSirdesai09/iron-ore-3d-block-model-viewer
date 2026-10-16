import { useMemo } from "react";
import { col, wx, wy, wz } from "../model/grid";
import { fmtMt, g2OrBetterTonnes } from "../model/estimate";
import { PLANNED_DEPTH_CELLS } from "../model/holes";
import { getLease } from "../model/lease";
import { plannedLog, selectTargets, targetLog, totalPlannedMetres, useStore } from "../state/store";

const lease = getLease();
/**
 * Planned holes run from the collar to the base of the cell PLANNED_DEPTH_CELLS below the top,
 * so 180 m, or less where the base of the model cuts them short.
 */
const PLANNED_HOLE_M = (PLANNED_DEPTH_CELLS + 1) * 10;

function Targets() {
  const targets = useStore(selectTargets);
  const active = useStore((s) => s.activeTarget);
  const set = useStore((s) => s.set);
  const flyTo = useStore((s) => s.flyTo);
  const addPlanned = useStore((s) => s.addPlanned);

  if (!targets.length)
    return <p className="hint">No targets left that are far enough from existing holes.</p>;

  return (
    <>
      {targets.map((t) => {
        const isActive = active?.i === t.i && active?.j === t.j;
        const rel = Math.round(t.rel * 100);
        return (
          <div key={`${t.i},${t.j}`} className={isActive ? "target active" : "target"}>
            <div className="thead">
              <h3>{t.label}</h3>
              <span className="hint" style={{ margin: 0 }}>
                E {t.i * 25} m, N {t.j * 25} m
              </span>
            </div>
            <div className="bar" role="img" aria-label={`Relative score ${rel} of 100`}>
              <i style={{ width: `${rel}%` }} />
            </div>
            <p>
              Would lift about {fmtMt(t.imp.up)} Mt to G2 or better.{" "}
              {t.bi
                ? `Expected ore from ${t.bi.from} m, around ${t.bi.to - t.bi.from} m thick.`
                : "No confident ore interval expected, so this hole mainly tests the model."}
            </p>
            <div className="btnrow">
              <button
                className="btn"
                onClick={() => {
                  set({ activeTarget: { i: t.i, j: t.j }, log: targetLog(t) });
                  flyTo({ target: [wx(t.i), wy(lease.ktop[col(t.i, t.j)]) - 2, wz(t.j)], r: 40 });
                }}
              >
                Show log
              </button>
              <button className="btn primary" onClick={() => addPlanned(t.i, t.j)}>
                Add to plan
              </button>
            </div>
          </div>
        );
      })}
    </>
  );
}

function Plan() {
  const planned = useStore((s) => s.planned);
  const planConf = useStore((s) => s.planConf);
  const cut = useStore((s) => s.cut);
  const set = useStore((s) => s.set);
  const removePlanned = useStore((s) => s.removePlanned);
  const palette = useStore((s) => s.palette);

  const { before, after } = useMemo(() => {
    const { solid, type, est, baseConf } = lease;
    return {
      before: g2OrBetterTonnes(solid, type, est, baseConf, cut),
      after: g2OrBetterTonnes(solid, type, est, planConf, cut),
    };
  }, [planConf, cut]);

  if (!planned.length)
    return (
      <p className="hint" style={{ margin: 0 }}>
        No holes planned yet. Add a suggested target, or turn on click-to-place and click the ridge.
      </p>
    );

  const metres = totalPlannedMetres(planned);
  return (
    <>
      <div className="delta">+{fmtMt(after - before)} Mt</div>
      <p className="hint" style={{ margin: "2px 0 10px" }}>
        moves to G2 or better across {planned.length} planned hole{planned.length > 1 ? "s" : ""},
        about {metres.toLocaleString("en-IN")} m of core. Ground at G1 and G2 rises from{" "}
        {fmtMt(before)} Mt to {fmtMt(after)} Mt.
      </p>
      <div className="rows">
        {planned.map((h, a) => (
          <div key={h.id}>
            <i style={{ background: palette?.text }} />
            <span>
              {h.id}, E {h.i * 25} N {h.j * 25}
            </span>
            <em>
              <button
                className="btn small"
                onClick={() => set({ log: plannedLog(h) })}
                aria-label={`Show log for ${h.id}`}
              >
                Log
              </button>{" "}
              <button
                className="btn small"
                onClick={() => removePlanned(a)}
                aria-label={`Remove ${h.id}`}
              >
                Remove
              </button>
            </em>
          </div>
        ))}
      </div>
    </>
  );
}

export function DrillPlanPanel() {
  const planMode = useStore((s) => s.planMode);
  const scenario = useStore((s) => s.scenario);
  const setPlanMode = useStore((s) => s.setPlanMode);
  const set = useStore((s) => s.set);
  return (
    <>
      <section className="sec">
        <h2>Where to drill next</h2>
        <p className="hint" style={{ margin: "0 0 8px" }}>
          Targets are ranked by how much uncertainty a core hole of up to {PLANNED_HOLE_M} m would
          remove from ground that sits close to the cut-off, weighted by tonnes and grade.
        </p>
        <label className="check">
          <input
            type="checkbox"
            checked={planMode}
            onChange={(e) => setPlanMode(e.target.checked)}
          />{" "}
          Place holes by clicking the model
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={scenario}
            onChange={(e) => set({ scenario: e.target.checked })}
          />{" "}
          Show the model as if planned holes were drilled
        </label>
        <Targets />
      </section>
      <section className="sec">
        <h2>Your plan</h2>
        <Plan />
      </section>
    </>
  );
}
