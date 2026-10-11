import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { CI, CJ, CK, VE, wx, wy, wz } from "../model/grid";
import { useStore } from "../state/store";

const at = (n: number): [number, number, number] => [wx(CI[n]), wy(CK[n]), wz(CJ[n])];

/** Outline boxes for the hovered cell and the pinned (selected) cell. */
export function SelectionBoxes() {
  const sel = useStore((s) => s.sel);
  const hover = useStore((s) => s.hover);
  const palette = useStore((s) => s.palette);
  const invalidate = useThree((s) => s.invalidate);

  const selGeom = useMemo(
    () => new THREE.EdgesGeometry(new THREE.BoxGeometry(1.02, VE * 1.02, 1.02)),
    [],
  );
  const hoverGeom = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(1, VE, 1)), []);

  useEffect(() => invalidate(), [sel, hover, palette, invalidate]);

  return (
    <>
      <lineSegments
        geometry={selGeom}
        visible={sel != null}
        position={sel != null ? at(sel) : [0, 0, 0]}
        raycast={() => null}
      >
        <lineBasicMaterial color={palette?.focus ?? "#ffffff"} />
      </lineSegments>
      <lineSegments
        geometry={hoverGeom}
        visible={hover != null}
        position={hover != null ? at(hover) : [0, 0, 0]}
        raycast={() => null}
      >
        <lineBasicMaterial color={palette?.text ?? "#ffffff"} transparent opacity={0.55} />
      </lineSegments>
    </>
  );
}
