// The child's character (the model of its species) + accessories, blending idle/walk/sprint by speed.
import { AnimationMixer, type AnimationAction, type Object3D } from 'three';
import { clone as cloneModel } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { GuardedGltfLoader } from '../asset-loader';
import { dressCharacter } from '../character/character-accessories';
import { wornPose } from '../character/worn-pose';
import { withOwnClothes } from '../character/character-clothes';
import { characterForSpecies, type CharacterModel } from '../content/characters';
import { RUN_SPEED, WALK_SPEED } from '../player/player-controller';

/** Accessory size per attach node for a character's body proportions (content/characters.json). */
export const accessoryScaler =
  (model: CharacterModel) =>
  (node: string): number =>
    model.accessoryScale[node] ?? 1;
const LOCOMOTION = ['idle', 'walk', 'sprint'] as const;
/** Seated poses of the rig, held while she rides a vehicle that seats her (player/vehicle-ride.ts). */
export const SEATED_POSES = ['sit', 'drive'] as const;
export type SeatedPose = (typeof SEATED_POSES)[number];
type Locomotion = (typeof LOCOMOTION)[number] | SeatedPose;

/**
 * Scale of the child's character model: just a little taller than the quest characters (owner, 03/10/2026),
 * about 1.75–2 blocks with the ears against their 1.7, under the villagers' 1.75–1.9. Only the picture: she
 * walks, steps, climbs and jumps by her collision body (player-controller.ts), whatever this is.
 */
export const PLAYER_SCALE = 0.68;

export interface PlayerCharacter {
  root: Object3D;
  /** Accessory entries actually attached (bad entries are skipped). */
  outfit: string[];
  /** `seated`: hold that pose (riding) instead of idle / walk / sprint. */
  update(dt: number, speed: number, onGround: boolean, seated?: SeatedPose | null): void;
}

export async function loadPlayerCharacter(loader: GuardedGltfLoader, species: string, outfit: string[]): Promise<PlayerCharacter> {
  const model = characterForSpecies(species);
  const gltf = await loader.load(model.output);
  // The loader hands every caller the same scene: each character is its own copy (skeleton included), or two of
  // one species (another player, a companion bot) would share bones and be dressed on top of each other.
  const root = cloneModel(gltf.scene);
  root.traverse((o) => {
    o.castShadow = true;
    o.frustumCulled = false; // skinned bounds lag the animated pose
  });
  const worn = dressCharacter(root, withOwnClothes(outfit, model.clothes), accessoryScaler(model), true);
  // Scale the character and all attached accessories proportionally.
  root.scale.setScalar(PLAYER_SCALE);
  // A bad ?outfit= must not block the game.
  for (const { entry, error } of worn.skipped) console.warn(`skipping outfit entry "${entry}"`, error);
  const mixer = new AnimationMixer(root);
  const actions = new Map<Locomotion, AnimationAction>();
  for (const name of [...LOCOMOTION, ...SEATED_POSES]) {
    const clip = gltf.animations.find((a) => a.name === name);
    if (!clip) throw new Error(`character clip ${name} missing`);
    actions.set(name, mixer.clipAction(clip));
  }
  let current: Locomotion = 'idle';
  actions.get('idle')?.play();
  const pose = wornPose(root, gltf.animations);
  pose.wear(worn.entries);

  return {
    root,
    // What the child chose: her species' own clothes, worn when she chose none, are not listed.
    outfit: worn.entries.filter((entry) => outfit.includes(entry)),
    update(dt, speed, onGround, seated = null) {
      const moving: Locomotion = speed > (WALK_SPEED + RUN_SPEED) / 2 ? 'sprint' : speed > 0.4 ? 'walk' : 'idle';
      const next: Locomotion = !onGround ? current : (seated ?? moving);
      if (next !== current) {
        const from = actions.get(current);
        const to = actions.get(next);
        if (from && to) to.reset().play().crossFadeFrom(from, 0.18, false);
        current = next;
      }
      const action = actions.get(current);
      if (action && (current === 'walk' || current === 'sprint')) action.timeScale = Math.max(0.6, speed / (current === 'sprint' ? RUN_SPEED : WALK_SPEED));
      mixer.update(dt);
      pose.apply(seated === null);
    },
  };
}
