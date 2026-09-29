// Miu: the kitbashed character GLB + accessories, blending idle/walk/sprint by speed.
import { AnimationMixer, type AnimationAction, type Object3D } from 'three';
import type { GuardedGltfLoader } from '../asset-loader';
import { attachAccessory, createAccessoryMesh } from '../character/character-accessories';
import { getAccessory } from '../content/accessories';
import { RUN_SPEED, WALK_SPEED } from '../player/player-controller';
import characters from '../../../../../content/characters.json';

const CHARACTER_ID = 'miu-cat';
const spec = (characters as Record<string, { output: string; accessoryScale?: Record<string, number> }>)[CHARACTER_ID];
if (!spec) throw new Error(`content/characters.json has no ${CHARACTER_ID}`);
export const CHARACTER_MODEL = spec.output;
/** Accessory size per attach node for the shipped body proportions (content/characters.json). */
const ACCESSORY_SCALE = spec.accessoryScale ?? {};
const LOCOMOTION = ['idle', 'walk', 'sprint'] as const;
type Locomotion = (typeof LOCOMOTION)[number];

export interface PlayerCharacter {
  root: Object3D;
  /** Accessory entries actually attached (bad entries are skipped). */
  outfit: string[];
  update(dt: number, speed: number, onGround: boolean): void;
}

export async function loadPlayerCharacter(loader: GuardedGltfLoader, outfit: string[]): Promise<PlayerCharacter> {
  const gltf = await loader.load(CHARACTER_MODEL);
  const root = gltf.scene;
  root.traverse((o) => {
    o.castShadow = true;
    o.frustumCulled = false; // skinned bounds lag the animated pose
  });
  const attached: string[] = [];
  for (const entry of outfit) {
    const [id = '', variant] = entry.split(':');
    try {
      const def = getAccessory(id);
      const mesh = createAccessoryMesh(def, variant);
      mesh.castShadow = true;
      attachAccessory(root, def, mesh, ACCESSORY_SCALE[def.attachNode] ?? 1);
      attached.push(entry);
    } catch (err) {
      console.warn(`skipping outfit entry "${entry}"`, err); // a bad ?outfit= must not block the game
    }
  }
  const mixer = new AnimationMixer(root);
  const actions = new Map<Locomotion, AnimationAction>();
  for (const name of LOCOMOTION) {
    const clip = gltf.animations.find((a) => a.name === name);
    if (!clip) throw new Error(`character clip ${name} missing`);
    actions.set(name, mixer.clipAction(clip));
  }
  let current: Locomotion = 'idle';
  actions.get('idle')?.play();

  return {
    root,
    outfit: attached,
    update(dt, speed, onGround) {
      const next: Locomotion = !onGround ? current : speed > (WALK_SPEED + RUN_SPEED) / 2 ? 'sprint' : speed > 0.4 ? 'walk' : 'idle';
      if (next !== current) {
        const from = actions.get(current);
        const to = actions.get(next);
        if (from && to) to.reset().play().crossFadeFrom(from, 0.18, false);
        current = next;
      }
      const action = actions.get(current);
      if (action && current !== 'idle') action.timeScale = Math.max(0.6, speed / (current === 'sprint' ? RUN_SPEED : WALK_SPEED));
      mixer.update(dt);
    },
  };
}
