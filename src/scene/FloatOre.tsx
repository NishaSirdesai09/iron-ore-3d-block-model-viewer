import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { getLease } from "../model/lease";
import { wx, wz } from "../model/grid";
import { useStore } from "../state/store";
import { FLOAT_COL } from "./colors";
import { surfaceY } from "./geom";

const lease = getLease();

/** Float ore fragments resting on the slopes, drawn as one instanced mesh. */
export function FloatOre() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const show = useStore((s) => s.showFloat);
  const count = lease.floats.length;
  const geometry = useMemo(() => new THREE.IcosahedronGeometry(1, 0), []);
  const material = useMemo(() => new THREE.MeshLambertMaterial({ color: FLOAT_COL }), []);

  useLayoutEffect(() => {
    const m = mesh.current!;
    const M = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    lease.floats.forEach((f, a) => {
      e.set(f.rot[0], f.rot[1], f.rot[2]);
      q.setFromEuler(e);
      M.compose(
        new THREE.Vector3(wx(f.i), surfaceY(f.ci, f.cj) + f.s * 0.5, wz(f.j)),
        q,
        new THREE.Vector3(f.s, f.s * 0.8, f.s),
      );
      m.setMatrixAt(a, M);
    });
    m.count = count;
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [count]);

  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, material, Math.max(1, count)]}
      visible={show}
      raycast={() => null}
    />
  );
}
