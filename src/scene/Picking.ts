import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";
import { CI, CJ, worldToCol } from "../model/grid";
import type { Hole, Target } from "../model/types";
import { holeLog, selectTargets, targetLog, useStore } from "../state/store";
import type { SceneRefs } from "./refs";

type Pick =
  | { kind: "hole"; hole: Hole }
  | { kind: "target"; target: Target }
  | { kind: "cell"; cell: number }
  | { kind: "column"; i: number; j: number }
  | { kind: "none" };

/** A press that moves less than this many pixels counts as a click rather than a drag. */
const CLICK_SLOP = 4;

/**
 * Hover, click-to-select and click-to-place. Raycasts in priority order: drill holes,
 * target cones, cells, then the ground surface.
 */
export function usePicking(refs: SceneRefs) {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    const el = gl.domElement;
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();

    function pick(ev: PointerEvent): Pick {
      const s = useStore.getState();
      const r = el.getBoundingClientRect();
      ndc.set(
        ((ev.clientX - r.left) / r.width) * 2 - 1,
        -((ev.clientY - r.top) / r.height) * 2 + 1,
      );
      ray.setFromCamera(ndc, camera);
      if (s.showHoles && !s.planMode && refs.holes) {
        const hit = ray.intersectObjects(refs.holes.children, true)[0];
        if (hit) return { kind: "hole", hole: hit.object.userData.hole as Hole };
      }
      if (s.tab === "plan" && !s.planMode && refs.markers) {
        const hit = ray.intersectObjects(refs.markers.children, false)[0];
        if (hit) return { kind: "target", target: hit.object.userData.target as Target };
      }
      if (refs.cells) {
        const hit = ray.intersectObject(refs.cells, false)[0];
        if (hit && hit.instanceId != null)
          return { kind: "cell", cell: refs.visList[hit.instanceId] };
      }
      if (refs.surfHit) {
        const hit = ray.intersectObject(refs.surfHit, false)[0];
        if (hit) return { kind: "column", ...worldToCol(hit.point.x, hit.point.z) };
      }
      return { kind: "none" };
    }

    function click(ev: PointerEvent) {
      const p = pick(ev);
      const s = useStore.getState();
      if (s.planMode) {
        if (p.kind === "cell") s.addPlanned(CI[p.cell], CJ[p.cell]);
        else if (p.kind === "column") s.addPlanned(p.i, p.j);
        return;
      }
      if (p.kind === "hole") return s.set({ log: holeLog(p.hole) });
      if (p.kind === "target") {
        // Ranked targets are recomputed, so look the target up again by column.
        const t = selectTargets(s).find((x) => x.i === p.target.i && x.j === p.target.j);
        if (t) s.set({ activeTarget: { i: t.i, j: t.j }, log: targetLog(t) });
        return;
      }
      if (p.kind === "cell") return s.selectCell(p.cell);
      s.selectCell(null);
    }

    let down: { x: number; y: number; id: number; moved: boolean } | null = null;
    let pointers = 0;
    let hoverFrame = 0;
    let lastMove: PointerEvent | null = null;

    const onDown = (e: PointerEvent) => {
      pointers++;
      down = pointers === 1 ? { x: e.clientX, y: e.clientY, id: e.pointerId, moved: false } : null;
    };
    const onMove = (e: PointerEvent) => {
      if (
        down &&
        e.pointerId === down.id &&
        Math.hypot(e.clientX - down.x, e.clientY - down.y) > CLICK_SLOP
      )
        down.moved = true;
      if (e.pointerType !== "mouse") return;
      // Hide the hover card while orbiting or panning.
      if (e.buttons) {
        if (useStore.getState().hoverPos) useStore.getState().set({ hover: null, hoverPos: null });
        return;
      }
      lastMove = e;
      if (hoverFrame) return;
      hoverFrame = requestAnimationFrame(() => {
        hoverFrame = 0;
        if (!lastMove) return;
        const p = pick(lastMove);
        const hover = p.kind === "cell" ? p.cell : null;
        const r = el.getBoundingClientRect();
        const hoverPos =
          hover == null ? null : { x: lastMove.clientX - r.left, y: lastMove.clientY - r.top };
        useStore.getState().set({ hover, hoverPos });
      });
    };
    const onUp = (e: PointerEvent) => {
      pointers = Math.max(0, pointers - 1);
      if (down && e.pointerId === down.id && !down.moved && e.type === "pointerup") click(e);
      if (!pointers) down = null;
    };
    const onLeave = () => {
      lastMove = null;
      useStore.getState().set({ hover: null, hoverPos: null });
    };
    const onContext = (e: Event) => e.preventDefault();

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("contextmenu", onContext);
    return () => {
      cancelAnimationFrame(hoverFrame);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("contextmenu", onContext);
    };
  }, [gl, camera, refs]);
}
