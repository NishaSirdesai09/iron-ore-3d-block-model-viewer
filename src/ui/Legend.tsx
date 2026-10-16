import { OCC_NAME } from "../model/geology";
import {
  COLOR_MODES,
  FLOAT_COL,
  OCC_COL,
  RAMPS,
  STAGE_COL,
  STAGE_LABEL,
  rampCss,
  type Ramp,
} from "../scene/colors";
import { useStore } from "../state/store";

interface Tick {
  at: number;
  label: string;
}

/** A ramp with ticks placed at their true positions along it. */
function RampBar({ stops, lo, hi, ticks }: { stops: Ramp; lo: number; hi: number; ticks: Tick[] }) {
  return (
    <>
      <div className="ramp" style={{ background: rampCss(stops, lo, hi) }} />
      <div className="ticks">
        {ticks.map((t) => (
          <span key={t.label} style={{ left: `${((t.at - lo) / (hi - lo)) * 100}%` }}>
            {t.label}
          </span>
        ))}
      </div>
    </>
  );
}

const Chip = ({ color, label }: { color: string; label: string }) => (
  <span className="chip">
    <i style={{ background: color }} />
    {label}
  </span>
);

export function Legend() {
  const mode = useStore((s) => s.mode);
  const cut = useStore((s) => s.cut);
  const scenario = useStore((s) => s.scenario);
  const showHoles = useStore((s) => s.showHoles);
  const showFloat = useStore((s) => s.showFloat);
  const hasPlanned = useStore((s) => s.planned.length > 0);
  const palette = useStore((s) => s.palette);
  const occFocus = useStore((s) => s.occFocus);
  const toggleOcc = useStore((s) => s.toggleOcc);
  const set = useStore((s) => s.set);
  if (!palette) return null;

  const m = COLOR_MODES.find((x) => x.value === mode)!;
  let body;
  if (mode === "grade")
    body = (
      <RampBar
        stops={RAMPS.grade}
        lo={10}
        hi={67}
        ticks={[
          { at: 10, label: "10" },
          { at: 30, label: "30" },
          { at: 45, label: "45" },
          { at: 58, label: "58" },
          // The unit moves to the heading: with ticks at their true positions "67% Fe" collides with "58".
          { at: 67, label: "67" },
        ]}
      />
    );
  else if (mode === "conf")
    body = (
      <RampBar
        stops={RAMPS.conf}
        lo={0}
        hi={1}
        ticks={[
          { at: 0, label: "No data" },
          { at: 1, label: "Drilled" },
        ]}
      />
    );
  else if (mode === "prob")
    body = (
      <RampBar
        stops={RAMPS.prob}
        lo={0}
        hi={1}
        ticks={[
          { at: 0, label: "0%" },
          { at: 0.5, label: "50%" },
          { at: 1, label: `100% above ${cut}% Fe` },
        ]}
      />
    );
  else if (mode === "value")
    body = (
      <RampBar
        stops={RAMPS.value.slice(1)}
        lo={0}
        hi={1}
        ticks={[
          { at: 0, label: "₹0" },
          { at: 0.5, label: "₹2,500" },
          { at: 1, label: "₹5,000/t margin" },
        ]}
      />
    );
  else if (mode === "occ")
    body = (
      <>
        <div className="chips" role="group" aria-label="Highlight occurrences">
          {[1, 2, 3, 4, 5, 0].map((o) => (
            <button
              key={o}
              className="chip pick"
              aria-pressed={occFocus.includes(o)}
              onClick={() => toggleOcc(o)}
            >
              <i style={{ background: o ? OCC_COL[o] : palette.rockWaste }} />
              {OCC_NAME[o]}
            </button>
          ))}
        </div>
        <p className="cellsize">
          {occFocus.length ? (
            <button className="linkbtn" onClick={() => set({ occFocus: [] })}>
              Clear highlight
            </button>
          ) : (
            "Click names to highlight those cells"
          )}
        </p>
      </>
    );
  else
    body = (
      <div className="chips">
        {[1, 2, 3, 4].map((s) => (
          <Chip key={s} color={STAGE_COL[s]} label={STAGE_LABEL[s]} />
        ))}
      </div>
    );

  const withPlan = scenario && (mode === "conf" || mode === "stage" || mode === "prob");
  return (
    <div className="legend" aria-live="polite">
      <h3>
        {m.label}
        {mode === "grade" ? ", % Fe" : ""}
        {withPlan ? ", with planned holes" : ""}
      </h3>
      {body}
      {showHoles && (
        <div className="chips" style={{ marginTop: 8 }}>
          <Chip color={palette.ochre} label="Core hole" />
          <Chip color={palette.steel} label="RC hole" />
          {hasPlanned && <Chip color={palette.text} label="Planned" />}
          {showFloat && <Chip color={FLOAT_COL} label="Float ore" />}
        </div>
      )}
      <p className="cellsize">Each cell is 25 m × 25 m × 10 m (east × north × depth)</p>
    </div>
  );
}
