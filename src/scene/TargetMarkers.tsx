import { Html } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { VE, col, wx, wy, wz } from "../model/grid";
import { getLease } from "../model/lease";
import { selectTargets, useStore } from "../state/store";
import type { SceneRefs } from "./refs";

const lease = getLease();
const topY = (i: number, j: number) => wy(lease.ktop[col(i, j)]) + VE * 0.5;

/** Suggested targets (cones with letter tags) and planned-hole tags, shown on the Drill plan tab. */
export function TargetMarkers({ refs }: { refs: SceneRefs }) {
  const tab = useStore((s) => s.tab);
  const targets = useStore(selectTargets);
  const planned = useStore((s) => s.planned);
  const ochre = useStore((s) => s.palette?.ochre ?? "#a06c16");
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => invalidate(), [tab, targets, planned, ochre, invalidate]);

  const onPlan = tab === "plan";
  return (
    <>
      <group
        ref={(g) => {
          refs.markers = g;
        }}
      >
        {onPlan &&
          targets.map((t) => (
            <mesh
              key={`${t.i},${t.j}`}
              position={[wx(t.i), topY(t.i, t.j) + 1.1, wz(t.j)]}
              rotation={[Math.PI, 0, 0]}
              userData={{ target: t }}
            >
              <coneGeometry args={[0.35, 0.9, 14]} />
              <meshBasicMaterial color={ochre} transparent opacity={0.95} />
            </mesh>
          ))}
      </group>
      {onPlan &&
        targets.map((t, a) => <Tag key={`t${t.i},${t.j}`} i={t.i} j={t.j} text={"ABCDE"[a]} />)}
      {onPlan && planned.map((h) => <Tag key={h.id} i={h.i} j={h.j} text={h.id} planned />)}
    </>
  );
}

function Tag({ i, j, text, planned }: { i: number; j: number; text: string; planned?: boolean }) {
  return (
    <Html
      position={[wx(i), topY(i, j) + 1.8, wz(j)]}
      zIndexRange={[5, 0]}
      style={{ pointerEvents: "none" }}
    >
      <span className={planned ? "tag planned" : "tag"}>{text}</span>
    </Html>
  );
}
