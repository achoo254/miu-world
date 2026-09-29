// NPCs from entities.json: animated Cube Pets model + an interaction label shown when the player
// walks inside the interaction radius.
import { AnimationMixer, Vector3, type Camera, type Object3D } from 'three';
import type { WorldEntities } from '@miu/voxel/world-entities';
import type { GuardedGltfLoader } from '../asset-loader';

export interface Npc {
  id: string;
  root: Object3D;
  update(dt: number, player: Vector3, camera: Camera, viewport: { width: number; height: number }): void;
  readonly playerNearby: boolean;
}

export async function loadNpcs(loader: GuardedGltfLoader, entities: WorldEntities, labelLayer: HTMLElement): Promise<Npc[]> {
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

      const label = document.createElement('div');
      label.className = 'npc-label';
      label.dataset.npc = def.id;
      label.textContent = `${def.name} · ${def.label}`;
      label.hidden = true;
      labelLayer.appendChild(label);

      const anchor = new Vector3();
      let nearby = false;
      return {
        id: def.id,
        root,
        get playerNearby() {
          return nearby;
        },
        update(dt, player, camera, viewport) {
          mixer.update(dt);
          nearby = player.distanceTo(root.position) <= def.interactRadius;
          label.hidden = !nearby;
          if (!nearby) return;
          anchor.copy(root.position).setY(root.position.y + 1.6).project(camera);
          label.style.transform = `translate(-50%, -100%) translate(${((anchor.x + 1) / 2) * viewport.width}px, ${((1 - anchor.y) / 2) * viewport.height}px)`;
        },
      };
    }),
  );
}
