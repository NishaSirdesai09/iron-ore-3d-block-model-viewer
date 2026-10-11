import { useShallow } from "zustand/react/shallow";
import { NX, NY, NZ, RL } from "../model/grid";
import type { RockFilter } from "../model/types";
import { COLOR_MODES } from "../scene/colors";
import { CAMERA_PRESETS, useStore, type CameraPreset } from "../state/store";

const ROCKS: ReadonlyArray<{ v: RockFilter; label: string }> = [
  { v: "ore", label: "Ore only" },
  { v: "ore+bhq", label: "Ore + BHQ" },
  { v: "all", label: "All rock" },
];

const CAMERAS: ReadonlyArray<{ id: CameraPreset; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "plan", label: "Plan view" },
  { id: "section", label: "Section view" },
];

interface RangeProps {
  id: string;
  label: string;
  value: number;
  output: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}

function Range({ id, label, value, output, min, max, step, onChange }: RangeProps) {
  return (
    <div className="range">
      <label htmlFor={id}>{label}</label>
      <output htmlFor={id}>{output}</output>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
      />
    </div>
  );
}

function Check({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: string;
}) {
  return (
    <label className="check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />{" "}
      {children}
    </label>
  );
}

export function ControlPanel() {
  // Only subscribe to the fields shown here, so orbiting and hovering do not re-render the panel.
  const s = useStore(
    useShallow((st) => ({
      mode: st.mode,
      rock: st.rock,
      cut: st.cut,
      minc: st.minc,
      fade: st.fade,
      sx: st.sx,
      sy: st.sy,
      sz: st.sz,
      showSurface: st.showSurface,
      showHoles: st.showHoles,
      showFloat: st.showFloat,
      set: st.set,
      resetSlices: st.resetSlices,
      flyTo: st.flyTo,
    })),
  );
  const set = s.set;
  return (
    <aside className="left" aria-label="View controls">
      <section className="sec">
        <h2 id="modes-h">Color cells by</h2>
        <div className="radios" role="radiogroup" aria-labelledby="modes-h">
          {COLOR_MODES.map((m) => (
            <label key={m.value}>
              <input
                type="radio"
                name="mode"
                value={m.value}
                checked={s.mode === m.value}
                onChange={() => set({ mode: m.value })}
              />
              <span>
                {m.label}
                <small>{m.desc}</small>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="sec">
        <h2 id="rock-h">Rock shown</h2>
        <div className="seg" role="group" aria-labelledby="rock-h">
          {ROCKS.map((r) => (
            <button key={r.v} aria-pressed={s.rock === r.v} onClick={() => set({ rock: r.v })}>
              {r.label}
            </button>
          ))}
        </div>
        <p className="hint">
          BHQ is banded hematite quartzite, the low-grade host rock around the ore.
        </p>
      </section>

      <section className="sec">
        <h2>Filters</h2>
        <Range
          id="cut"
          label="Cut-off grade"
          value={s.cut}
          output={`${s.cut}% Fe`}
          min={40}
          max={64}
          step={1}
          onChange={(cut) => set({ cut })}
        />
        <p className="hint">
          The Indian Bureau of Mines threshold value for hematite ore is 45% Fe.
        </p>
        <div style={{ marginTop: 12 }}>
          <Range
            id="minc"
            label="Minimum confidence"
            value={s.minc}
            output={s.minc.toFixed(2)}
            min={0}
            max={0.9}
            step={0.05}
            onChange={(minc) => set({ minc })}
          />
        </div>
        <div style={{ marginTop: 8 }}>
          <Check checked={s.fade} onChange={(fade) => set({ fade })}>
            Fade cells with little data behind them
          </Check>
        </div>
      </section>

      <section className="sec">
        <h2>Slice the block</h2>
        <Range
          id="sx"
          label="East edge"
          value={s.sx}
          output={`E ${(s.sx + 1) * 25} m`}
          min={0}
          max={NX - 1}
          step={1}
          onChange={(sx) => set({ sx })}
        />
        <Range
          id="sy"
          label="North edge"
          value={s.sy}
          output={`N ${(s.sy + 1) * 25} m`}
          min={0}
          max={NY - 1}
          step={1}
          onChange={(sy) => set({ sy })}
        />
        <Range
          id="sz"
          label="Top cut (RL)"
          value={s.sz}
          output={`RL ${RL(s.sz) + 10} m`}
          min={4}
          max={NZ - 1}
          step={1}
          onChange={(sz) => set({ sz })}
        />
        <div className="btnrow" style={{ marginTop: 10 }}>
          <button className="btn" onClick={s.resetSlices}>
            Reset slices
          </button>
        </div>
      </section>

      <section className="sec">
        <h2>Layers</h2>
        <Check checked={s.showSurface} onChange={(showSurface) => set({ showSurface })}>
          Ground surface
        </Check>
        <Check checked={s.showHoles} onChange={(showHoles) => set({ showHoles })}>
          Drill holes
        </Check>
        <Check checked={s.showFloat} onChange={(showFloat) => set({ showFloat })}>
          Float ore on slopes
        </Check>
      </section>

      <section className="sec">
        <h2>Camera</h2>
        <div className="btnrow">
          {CAMERAS.map((c) => (
            <button
              key={c.id}
              className="btn"
              onClick={() => {
                const p = CAMERA_PRESETS[c.id];
                s.flyTo({ target: [...p.target], r: p.r, theta: p.theta, phi: p.phi });
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
        <p className="hint">
          Drag to orbit, right-drag or shift-drag to pan, scroll or pinch to zoom.
        </p>
      </section>
    </aside>
  );
}
