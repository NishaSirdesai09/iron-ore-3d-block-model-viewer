import { useEffect, useMemo, useRef, useState } from "react";
import { RL, col } from "../model/grid";
import { getLease } from "../model/lease";
import { clamp } from "../model/rng";
import { bestIntercept, columnLog, interceptGrade } from "../model/planning";
import type { Intercept, LogRow } from "../model/types";
import { OCC_COL, RAMPS, ramp, rgbCss } from "../scene/colors";
import { selectActiveConf, useStore, type Palette } from "../state/store";

const lease = getLease();
/** Grade axis spans 0..70% Fe. */
const G_MAX = 70;

interface DrawArgs {
  rows: LogRow[];
  bi: Intercept | null;
  assayed: boolean;
  cut: number;
  palette: Palette;
}

function draw(canvas: HTMLCanvasElement, { rows, bi, assayed, cut, palette }: DrawArgs) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  if (!rows.length || !w || !h) return;

  const gx = 118;
  const gr = w - 18;
  const maxD = rows.length * 10;
  const X = (d: number) => gx + ((gr - gx) * d) / maxD;
  ctx.font = "500 12px Archivo, sans-serif";
  ctx.fillStyle = palette.muted;
  ctx.textBaseline = "middle";
  const yR = 10;
  const hR = 16;
  const yF = 36;
  const hF = Math.max(40, h - 66);
  ctx.fillText("Rock", 16, yR + hR / 2);
  ctx.fillText(assayed ? "Assay, % Fe" : "Predicted, % Fe", 16, yF + hF / 2);

  // Rock strip, coloured by occurrence.
  for (const r of rows) {
    ctx.fillStyle = r.t === 1 ? palette.rockWaste : OCC_COL[lease.occ[r.n]];
    ctx.fillRect(X(r.from), yR, X(r.to) - X(r.from) + 0.5, hR);
  }

  const Y = (g: number) => yF + hF - (hF * clamp(g, 0, G_MAX)) / G_MAX;
  ctx.strokeStyle = palette.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(gx, yF + hF + 0.5);
  ctx.lineTo(gr, yF + hF + 0.5);
  ctx.stroke();

  // Assays as bars; predictions as ticks with a ±1σ band.
  for (const r of rows) {
    if (!assayed) {
      ctx.fillStyle = "rgba(150,150,150,.22)";
      const a = Y(r.g + r.s);
      const b = Y(r.g - r.s);
      ctx.fillRect(X(r.from) + 1, a, X(r.to) - X(r.from) - 2, b - a);
    }
    ctx.fillStyle = rgbCss(ramp(RAMPS.grade, r.g));
    if (assayed) ctx.fillRect(X(r.from) + 1, Y(r.g), X(r.to) - X(r.from) - 2, yF + hF - Y(r.g));
    else ctx.fillRect(X(r.from) + 1, Y(r.g) - 1.5, X(r.to) - X(r.from) - 2, 3);
  }

  // Cut-off line.
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = palette.ochre;
  ctx.beginPath();
  ctx.moveTo(gx, Y(cut) + 0.5);
  ctx.lineTo(gr, Y(cut) + 0.5);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = palette.ochre;
  ctx.textAlign = "right";
  ctx.fillText(`cut-off ${cut}%`, gx - 6, Y(cut));
  ctx.textAlign = "left";

  // Best intercept marker.
  if (bi) {
    ctx.fillStyle = palette.ochre;
    ctx.fillRect(X(bi.from), yF - 6, X(bi.to) - X(bi.from), 3);
  }

  // Depth axis.
  ctx.fillStyle = palette.muted;
  ctx.textAlign = "center";
  const step = maxD > 160 ? 30 : 20;
  for (let d = 0; d <= maxD; d += step) ctx.fillText(d + (d === 0 ? " m" : ""), X(d), yF + hF + 13);
  ctx.textAlign = "left";
}

/** Rock and grade down the selected hole or target, with the cut-off and best intercept. */
export function DrillLog() {
  const spec = useStore((s) => s.log);
  const cut = useStore((s) => s.cut);
  const conf = useStore(selectActiveConf);
  const palette = useStore((s) => s.palette);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState(0);
  const [fontsReady, setFontsReady] = useState(false);

  const rows = useMemo(
    () => (spec ? columnLog(lease, conf, spec.i, spec.j, spec.bk, spec.assayed) : []),
    [spec, conf],
  );
  const bi = useMemo(() => bestIntercept(rows, cut), [rows, cut]);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize((n) => n + 1));
    ro.observe(el);
    // Redraw once the web font is in, so the canvas labels use Archivo.
    document.fonts?.ready.then(() => setFontsReady(true));
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (canvas.current && palette)
      draw(canvas.current, { rows, bi, assayed: spec?.assayed ?? false, cut, palette });
  }, [rows, bi, spec, cut, palette, size, fontsReady]);

  let meta = "";
  if (spec) {
    const collarRL = RL(lease.ktop[col(spec.i, spec.j)]) + 10;
    meta =
      `${spec.kindLabel}, collar E ${spec.i * 25} m N ${spec.j * 25} m RL ${collarRL} m, ${rows.length * 10} m deep. ` +
      (bi
        ? `Best intercept ${bi.to - bi.from} m at ${interceptGrade(bi).toFixed(1)}% Fe from ${bi.from} m.`
        : `No interval above ${cut}% Fe.`);
  }

  return (
    <section className="log" aria-label="Drill log">
      <div className="loghead">
        <strong>{spec ? spec.name : "Drill log"}</strong>
        <span>{meta}</span>
      </div>
      <div className="logbody">
        <canvas
          ref={canvas}
          role="img"
          aria-label={spec ? `Drill log for ${spec.name}. ${meta}` : "Drill log"}
        />
        {!spec && (
          <div className="empty">
            Select a drill hole or a suggested target to read its log down the hole.
          </div>
        )}
      </div>
    </section>
  );
}
