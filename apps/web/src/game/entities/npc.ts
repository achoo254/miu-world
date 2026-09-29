// NPCs from entities.json: animated Cube Pets model and an interaction radius. The label itself is a
// React component (via game-bridge); the game only reports which NPC is near and where it is on screen.
import { AnimationMixer, Vector3, type Camera, type Object3D } from 'three';
import type { WorldEntities } from '@miu/voxel/world-entities';
import type { GuardedGltfLoader } from '../asset-loader';

export interface Npc {
  id: string;
  name: string;
  label: string;
  root: Object3D;
  update(dt: number, player: Vector3): void;
  readonly playerNearby: boolean;
  /** Screen position (CSS px) of the point above the NPC's head, for the prompt anchor. */
  screenAnchor(camera: Camera, viewport: { width: number; height: number }): { x: number; y: number };
}

const LABEL_HEIGHT = 1.6;

export async function loadNpcs(loader: GuardedGltfLoader, entities: WorldEntities): Promise<Npc[]> {
  return Promise.all(
    entities.npcs.map(async (def) => {
      const gltf = await loader.load(def.model);
      const root = gltf.scene;
      root.position.set(...def.position);
      root.rotation.y = (def.yaw * Math.PI) / 180;
      root.scale.setScalar(def.scale);
      root.traverse((o) => (o.castShadow = true));
      const mixer = new AnimationMixer(root);
      const clip = gltf.animations.find((a) => a.name === def.animation);
      if (clip) mixer.clipAction(clip).play();

      const anchor = new Vector3();
      let nearby = false;
      return {
        id: def.id,
        name: def.name,
        label: def.label,
        root,
        get playerNearby() {
          return nearby;
        },
        update(dt, player) {
          mixer.update(dt);
          nearby = player.distanceTo(root.position) <= def.interactRadius;
        },
        screenAnchor(camera, viewport) {
          anchor.copy(root.position).setY(root.position.y + LABEL_HEIGHT).project(camera);
          return { x: ((anchor.x + 1) / 2) * viewport.width, y: ((1 - anchor.y) / 2) * viewport.height };
        },
      };
    }),
  );
}
