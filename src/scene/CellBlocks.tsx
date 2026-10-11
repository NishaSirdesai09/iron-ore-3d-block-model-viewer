import { useLayoutEffect, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CI, CJ, CK, VE, wx, wy, wz } from "../model/grid";
import { BHQ, WASTE } from "../model/geology";
import { getLease } from "../model/lease";
import { selectActiveConf, useStore } from "../state/store";
import { cellColor } from "./colors";
import type { SceneRefs } from "./refs";

const lease = getLease();

/** Every solid cell drawn through one InstancedMesh. Only cells passing the filters are written. */
export function CellBlocks({ refs }: { refs: SceneRefs }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const invalidate = useThree((s) => s.invalidate);

  const mode = useStore((s) => s.mode);
  const rock = useStore((s) => s.rock);
  const cut = useStore((s) => s.cut);
  const minc = useStore((s) => s.minc);
  const fade = useStore((s) => s.fade);
  const sx = useStore((s) => s.sx);
  const sy = useStore((s) => s.sy);
  const sz = useStore((s) => s.sz);
  const palette = useStore((s) => s.palette);
  const conf = useStore(selectActiveConf);

  const geometry = useMemo(() => new THREE.BoxGeometry(0.95, VE * 0.95, 0.95), []);
  const material = useMemo(() => new THREE.MeshLambertMaterial({ color: 0xffffff }), []);

  // Allocate the per-instance colour buffer once.
  useLayoutEffect(() => {
    const m = mesh.current!;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const white = new THREE.Color(1, 1, 1);
    for (let a = 0; a < lease.solid.length; a++) m.setColorAt(a, white);
    refs.cells = m;
    return () => {
      refs.cells = null;
    };
  }, [refs]);

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m || !palette) return;
    const { solid, type, est } = lease;
    const M = new THREE.Matrix4();
    const color = new THREE.Color();
    const opts = { mode, cut, fade, palette };
    const vis: number[] = [];
    let a = 0;
    for (let s = 0; s < solid.length; s++) {
      const n = solid[s];
      const t = type[n];
      if (t === WASTE && rock !== "all") continue;
      if (rock === "ore" && (t < BHQ || est[n] < cut)) continue;
      if (t >= BHQ && conf[n] < minc) continue;
      if (CI[n] > sx || CJ[n] > sy || CK[n] > sz) continue;
      M.makeTranslation(wx(CI[n]), wy(CK[n]), wz(CJ[n]));
      m.setMatrixAt(a, M);
      const c = cellColor(lease, n, conf, opts);
      m.setColorAt(a, color.setRGB(c[0], c[1], c[2]));
      vis.push(n);
      a++;
    }
    m.count = a;
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    // Raycasting caches instance bounds, so drop them whenever the visible set changes.
    m.boundingSphere = null;
    m.boundingBox = null;
    refs.visList = vis;
    invalidate();
  }, [mode, rock, cut, minc, fade, sx, sy, sz, palette, conf, refs, invalidate]);

  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, material, lease.solid.length]}
      frustumCulled={false}
    />
  );
}
