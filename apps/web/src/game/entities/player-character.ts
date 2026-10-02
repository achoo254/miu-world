// The child's character (the model of its species) + accessories, blending idle/walk/sprint by speed.
import { AnimationMixer, type AnimationAction, type Object3D } from 'three';
import type { GuardedGltfLoader } from '../asset-loader';
import { dressCharacter } from '../character/character-accessories';
import { characterForSpecies, type CharacterModel } from '../content/characters';
import { RUN_SPEED, WALK_SPEED } from '../player/player-controller';

/** Accessory size per attach node for a character's body proportions (content/characters.json). */
export const accessoryScaler =
  (model: CharacterModel) =>
  (node: string): number =>
    model.accessoryScale[node] ?? 1;
const LOCOMOTION = ['idle', 'walk', 'sprint'] as const;
type Locomotion = (typeof LOCOMOTION)[number];

/** Scale of the child's character model so she reads as a child relative to adult NPCs. */
export const PLAYER_SCALE = 0.82;

export interface PlayerCharacter {
  root: Object3D;
  /** Accessory entries actually attached (bad entries are skipped). */
  outfit: string[];
  update(dt: number, speed: number, onGround: boolean): void;
}

export async function loadPlayerCharacter(loader: GuardedGltfLoader, species: string, outfit: string[]): Promise<PlayerCharacter> {
  const model = characterForSpecies(species);
  const gltf = await loader.load(model.output);
  const root = gltf.scene;
  root.traverse((o) => {
    o.castShadow = true;
    o.frustumCulled = false; // skinned bounds lag the animated pose
  });
  const worn = dressCharacter(root, outfit, accessoryScaler(model), true);
  // Scale the character and all attached accessories proportionally.
  root.scale.setScalar(PLAYER_SCALE);
  // A bad ?outfit= must not block the game.
  for (const { entry, error } of worn.skipped) console.warn(`skipping outfit entry "${entry}"`, error);
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
    outfit: worn.entries,
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
