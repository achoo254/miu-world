// Fixed cameras for review screenshots (?shot=top|iso|island|bridge|tree|npc|life:<ambient id>):
// overrides the follow camera, lifts view-distance limits, and flags document.body.dataset.ready after
// a few frames. A `life:` shot frames one villager or animal and keeps time running (for videos).
import { Vector3, type PerspectiveCamera, type Scene } from 'three';
import type { WorldEntities } from '@miu/voxel/world-entities';

export interface ReviewShot {
  apply(camera: PerspectiveCamera): void;
  frameDone(): void;
  /** True once the shot is ready: time must stop so the screenshot (taken a frame or two later) is stable. */
  readonly settled: boolean;
  /** Background-only shots (the Home island): no sky and no player, on a transparent canvas. */
  readonly backdrop: boolean;
  /** Time keeps running (ambient life at work) and the player is hidden. */
  readonly live: boolean;
}

const SETTLE_FRAMES = 20;

/** Eye positions tried around a `life:` subject, first clear line of sight wins. */
const LIFE_ANGLES = [225, 180, 270, 135, 315, 90, 0, 45];

export function createReviewShot(
  name: string | null,
  entities: WorldEntities,
  scene: Scene,
  solidAt: (x: number, y: number, z: number) => boolean = () => false,
): ReviewShot | null {
  if (!name) return null;
  const [sx, , sz] = entities.size;
  const center = new Vector3(sx / 2, 10, sz / 2);
  const landmark = (id: string): Vector3 => {
    const lm = entities.landmarks.find((l) => l.id === id);
    return lm ? new Vector3(...lm.position) : center.clone();
  };
  const npc = entities.interactables.find((t) => t.kind === 'npc');
  const views: Record<string, { eye: Vector3; target: Vector3; fov: number }> = {
    top: { eye: new Vector3(sx / 2, 150, sz / 2 + 0.01), target: new Vector3(sx / 2, 0, sz / 2), fov: 38 },
    iso: { eye: new Vector3(-38, 78, -38), target: center, fov: 40 },
    // Home background: the whole chapter as a floating island, seen from the spawn corner.
    island: { eye: new Vector3(-52, 70, -52), target: new Vector3(sx / 2, 4, sz / 2), fov: 38 },
    bridge: { eye: landmark('bridge').add(new Vector3(-14, 9, -10)), target: landmark('bridge'), fov: 55 },
    tree: { eye: landmark('ancient-tree').add(new Vector3(-22, 10, -22)), target: landmark('ancient-tree').add(new Vector3(0, 9, 0)), fov: 55 },
    npc: {
      eye: npc ? new Vector3(npc.position[0] - 5, npc.position[1] + 3, npc.position[2] - 6) : center,
      target: npc ? new Vector3(...npc.position) : center,
      fov: 50,
    },
  };
  const ambient = name.startsWith('life:') ? entities.ambients?.find((a) => a.id === name.slice(5)) : undefined;
  if (ambient) {
    const target = new Vector3(...ambient.position).add(new Vector3(0, 0.9, 0));
    const clear = (eye: Vector3): boolean => {
      for (let t = 0; t <= 0.92; t += 0.04) {
        const p = eye.clone().lerp(target, t);
        if (solidAt(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z))) return false;
      }
      return true;
    };
    const around = (deg: number): Vector3 => {
      const a = (deg * Math.PI) / 180;
      return target.clone().add(new Vector3(Math.sin(a) * 6.2, 2.6, Math.cos(a) * 6.2));
    };
    const eye = LIFE_ANGLES.map(around).find(clear) ?? around(LIFE_ANGLES[0] ?? 225);
    views[name] = { eye, target, fov: 50 };
  }
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
    backdrop: name === 'island',
    live: ambient !== undefined,
    get settled() {
      return frames >= SETTLE_FRAMES;
    },
  };
}
