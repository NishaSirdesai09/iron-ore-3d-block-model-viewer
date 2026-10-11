import type { Group, InstancedMesh, Mesh } from "three";

/** Objects the picking code raycasts against, filled in by the scene components. */
export interface SceneRefs {
  cells: InstancedMesh | null;
  /** Cell index for each visible instance, in instance order. */
  visList: number[];
  holes: Group | null;
  markers: Group | null;
  surfHit: Mesh | null;
}

export const createSceneRefs = (): SceneRefs => ({
  cells: null,
  visList: [],
  holes: null,
  markers: null,
  surfHit: null,
});
