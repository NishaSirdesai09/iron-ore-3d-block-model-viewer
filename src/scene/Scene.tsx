import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type ElementRef } from "react";
import * as THREE from "three";
import { CAMERA_PRESETS, useStore } from "../state/store";
import { CellBlocks } from "./CellBlocks";
import { DrillHoles } from "./DrillHoles";
import { FloatOre } from "./FloatOre";
import { usePicking } from "./Picking";
import { createSceneRefs, type SceneRefs } from "./refs";
import { SelectionBoxes } from "./SelectionBoxes";
import { Surface } from "./Surface";
import { TargetMarkers } from "./TargetMarkers";

const FLY_MS = 550;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const start = CAMERA_PRESETS.overview;
const startPos = new THREE.Vector3()
  .setFromSphericalCoords(start.r, start.phi, start.theta)
  .add(new THREE.Vector3(...start.target));

interface Pose {
  target: THREE.Vector3;
  r: number;
  theta: number;
  phi: number;
}

/** OrbitControls with the prototype's limits, animated camera presets and the compass feed. */
function CameraRig() {
  const controls = useRef<ElementRef<typeof OrbitControls>>(null);
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const request = useStore((s) => s.cameraRequest);
  const anim = useRef<{ from: Pose; to: Pose; t0: number } | null>(null);

  const apply = (p: Pose) => {
    const c = controls.current;
    if (!c) return;
    c.target.copy(p.target);
    camera.position.setFromSphericalCoords(p.r, p.phi, p.theta).add(p.target);
    camera.lookAt(p.target);
    c.update();
  };

  useEffect(() => {
    const c = controls.current;
    if (!request || !c) return;
    const off = new THREE.Spherical().setFromVector3(camera.position.clone().sub(c.target));
    const from: Pose = { target: c.target.clone(), r: off.radius, theta: off.theta, phi: off.phi };
    const to: Pose = {
      target: new THREE.Vector3(...request.target),
      r: request.r ?? from.r,
      theta: request.theta ?? from.theta,
      phi: request.phi ?? from.phi,
    };
    if (reducedMotion()) {
      anim.current = null;
      apply(to);
      invalidate();
      return;
    }
    anim.current = { from, to, t0: performance.now() };
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  useFrame(() => {
    const a = anim.current;
    if (!a) return;
    const t = Math.min(1, (performance.now() - a.t0) / FLY_MS);
    const e = 1 - Math.pow(1 - t, 3);
    apply({
      target: new THREE.Vector3().lerpVectors(a.from.target, a.to.target, e),
      r: lerp(a.from.r, a.to.r, e),
      theta: lerp(a.from.theta, a.to.theta, e),
      phi: lerp(a.from.phi, a.to.phi, e),
    });
    if (t >= 1) anim.current = null;
    else invalidate();
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      target={[...start.target]}
      enableDamping={false}
      minDistance={15}
      maxDistance={160}
      minPolarAngle={0.02}
      maxPolarAngle={1.55}
      onChange={() => {
        const c = controls.current;
        if (c) useStore.getState().set({ azimuth: c.getAzimuthalAngle() });
      }}
    />
  );
}

function Contents({ refs }: { refs: SceneRefs }) {
  usePicking(refs);
  const canvasColor = useStore((s) => s.palette?.canvas);
  const scene = useThree((s) => s.scene);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    if (!canvasColor) return;
    scene.background = new THREE.Color(canvasColor);
    invalidate();
  }, [canvasColor, scene, invalidate]);

  return (
    <>
      {/* Three r155+ lights are physically based; × π matches the prototype's r128 brightness. */}
      <hemisphereLight args={[0xffffff, 0x5a5048, 0.72 * Math.PI]} />
      <directionalLight color={0xfff4e6} intensity={0.62 * Math.PI} position={[30, 60, 25]} />
      <CellBlocks refs={refs} />
      <Surface refs={refs} />
      <FloatOre />
      <DrillHoles refs={refs} />
      <TargetMarkers refs={refs} />
      <SelectionBoxes />
      <CameraRig />
    </>
  );
}

/** The 3D block model. Renders on demand: components call invalidate() when they change. */
export function Scene() {
  const refs = useMemo(createSceneRefs, []);
  const planMode = useStore((s) => s.planMode);
  return (
    <Canvas
      className={planMode ? "gl plan" : "gl"}
      frameloop="demand"
      dpr={[1, 2]}
      flat
      linear
      legacy
      gl={{ antialias: true }}
      camera={{ fov: 36, near: 0.5, far: 600, position: startPos.toArray() }}
      aria-label="3D block model of the lease"
    >
      <Contents refs={refs} />
    </Canvas>
  );
}
