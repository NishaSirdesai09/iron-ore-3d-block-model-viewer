import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { NX, NY, VE, col, wx, wy, wz } from "../model/grid";
import { getLease } from "../model/lease";
import { useStore } from "../state/store";
import type { SceneRefs } from "./refs";

const lease = getLease();

/** Ground surface geometry: each vertex sits at the 3×3-smoothed top of the cells around it. */
function buildSurface(): THREE.PlaneGeometry {
  const g = new THREE.PlaneGeometry(NX - 1, NY - 1, NX - 1, NY - 1);
  const pos = g.attributes.position;
  for (let v = 0; v < pos.count; v++) {
    const i = v % NX;
    const j = NY - 1 - Math.floor(v / NX);
    let s = 0;
    let c = 0;
    for (let a = -1; a <= 1; a++)
      for (let b = -1; b <= 1; b++) {
        const ii = i + a;
        const jj = j + b;
        if (ii < 0 || jj < 0 || ii >= NX || jj >= NY) continue;
        s += lease.ktop[col(ii, jj)];
        c++;
      }
    pos.setXYZ(v, wx(i), wy(s / c) + VE * 0.5 + 0.02, wz(j));
  }
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

/** Wireframe ground surface plus an invisible copy used to pick columns in plan mode. */
export function Surface({ refs }: { refs: SceneRefs }) {
  const geometry = useMemo(buildSurface, []);
  const show = useStore((s) => s.showSurface);
  const muted = useStore((s) => s.palette?.muted ?? "#888888");
  const hitMaterial = useMemo(() => new THREE.MeshBasicMaterial({ visible: false }), []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <>
      <mesh geometry={geometry} visible={show}>
        <meshBasicMaterial color={muted} wireframe transparent opacity={0.22} depthWrite={false} />
      </mesh>
      <mesh
        geometry={geometry}
        material={hitMaterial}
        ref={(m) => {
          refs.surfHit = m;
        }}
      />
    </>
  );
}
