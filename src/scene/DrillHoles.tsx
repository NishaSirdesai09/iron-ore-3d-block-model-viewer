import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { VE, col, wx, wy, wz } from "../model/grid";
import { getLease } from "../model/lease";
import type { Hole } from "../model/types";
import { useStore } from "../state/store";
import type { SceneRefs } from "./refs";

const lease = getLease();

function HoleMesh({ h, color }: { h: Hole; color: string }) {
  const kt = lease.ktop[col(h.i, h.j)];
  const top = wy(kt) + VE * 0.5 + 0.6;
  const bot = wy(h.bk) - VE * 0.5;
  const L = top - bot;
  const r = h.planned ? 0.11 : 0.09;
  return (
    <group>
      <mesh position={[wx(h.i), bot + L / 2, wz(h.j)]} userData={{ hole: h }}>
        <cylinderGeometry args={[r, r, L, 10]} />
        <meshBasicMaterial color={color} transparent={h.planned} opacity={h.planned ? 0.85 : 1} />
      </mesh>
      <mesh
        position={[wx(h.i), top, wz(h.j)]}
        rotation={[Math.PI / 2, 0, 0]}
        userData={{ hole: h }}
      >
        <torusGeometry args={[0.32, 0.05, 6, 22]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}

/** Existing core (ochre) and RC (steel) holes, plus planned holes, each with a collar ring. */
export function DrillHoles({ refs }: { refs: SceneRefs }) {
  const show = useStore((s) => s.showHoles);
  const planned = useStore((s) => s.planned);
  const palette = useStore((s) => s.palette);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => invalidate(), [show, planned, palette, invalidate]);

  if (!palette) return null;
  return (
    <group
      visible={show}
      ref={(g) => {
        refs.holes = g;
      }}
    >
      {lease.holes.map((h) => (
        <HoleMesh key={h.id} h={h} color={h.kind === "RC" ? palette.steel : palette.ochre} />
      ))}
      {planned.map((h) => (
        <HoleMesh key={h.id} h={h} color={palette.text} />
      ))}
    </group>
  );
}
