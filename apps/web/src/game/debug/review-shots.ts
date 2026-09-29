// Fixed cameras for review screenshots (?shot=top|iso|bridge|tree|npc): overrides the follow
// camera, lifts view-distance limits, and flags document.body.dataset.ready after a few frames.
import { Vector3, type PerspectiveCamera, type Scene } from 'three';
import type { WorldEntities } from '@miu/voxel/world-entities';

export interface ReviewShot {
  apply(camera: PerspectiveCamera): void;
  frameDone(): void;
}

const SETTLE_FRAMES = 20;

export function createReviewShot(name: string | null, entities: WorldEntities, scene: Scene): ReviewShot | null {
  if (!name) return null;
  const [sx, , sz] = entities.size;
  const center = new Vector3(sx / 2, 10, sz / 2);
  const landmark = (id: string): Vector3 => {
    const lm = entities.landmarks.find((l) => l.id === id);
    return lm ? new Vector3(...lm.position) : center.clone();
  };
  const npc = entities.npcs[0];
  const views: Record<string, { eye: Vector3; target: Vector3; fov: number }> = {
    top: { eye: new Vector3(sx / 2, 150, sz / 2 + 0.01), target: new Vector3(sx / 2, 0, sz / 2), fov: 38 },
    iso: { eye: new Vector3(-38, 78, -38), target: center, fov: 40 },
    bridge: { eye: landmark('bridge').add(new Vector3(-14, 9, -10)), target: landmark('bridge'), fov: 55 },
    tree: { eye: landmark('ancient-tree').add(new Vector3(-22, 10, -22)), target: landmark('ancient-tree').add(new Vector3(0, 9, 0)), fov: 55 },
    npc: {
      eye: npc ? new Vector3(npc.position[0] - 5, npc.position[1] + 3, npc.position[2] - 6) : center,
      target: npc ? new Vector3(...npc.position) : center,
      fov: 50,
    },
  };
  const view = views[name];
  if (!view) throw new Error(`unknown review shot ${name}`);
  scene.fog = null;
  let frames = 0;
  return {
    apply(camera) {
      camera.fov = view.fov;
      camera.far = 400;
      camera.updateProjectionMatrix();
      camera.position.copy(view.eye);
      camera.lookAt(view.target);
    },
    frameDone() {
      frames++;
      if (frames === SETTLE_FRAMES) document.body.dataset.ready = '1';
    },
  };
}
