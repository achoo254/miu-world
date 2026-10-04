// The child's character (the model of its species) + accessories, blending idle/walk/sprint by speed.
import { AnimationMixer, MathUtils, type AnimationAction, type Object3D } from 'three';
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

export type ExtraPlayerAction = 'lay' | 'eat' | 'drink' | 'fish' | 'pet' | 'wave' | 'water' | 'sweep' | 'cheer' | null;

export interface PlayerCharacter {
  root: Object3D;
  /** Accessory entries actually attached (bad entries are skipped). */
  outfit: string[];
  /**
   * `seated`: hold that pose (riding) instead of idle / walk / sprint.
   * `inWater`: tilt the model forward and add a bob, giving a swimming feel (no extra clip needed).
   * `action`: procedural gesture for everyday actions (lay down, eat, drink, fish).
   */
  update(
    dt: number,
    speed: number,
    onGround: boolean,
    seated?: SeatedPose | null,
    inWater?: boolean,
    action?: ExtraPlayerAction,
  ): void;
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

  /**
   * Swimming visual effect: tilt the root forward ~28° and add a gentle vertical bob.
   * No extra animation clip required — just root.rotation.x eased in/out.
   */
  const SWIM_TILT = MathUtils.degToRad(28);
  const TILT_EASE = 6; // share of remaining angle closed per second (exponential)
  const BOB_AMP = 0.055; // radians — subtle pitch oscillation while swimming
  const BOB_FREQ = 2.0; // cycles per second
  let swimTilt = 0;
  let swimTime = 0;
  /**
   * Procedural everyday actions:
   * - lay: lean back onto bed ~82° with peaceful breathing rhythm
   * - eat: cheerful chewing head-bob
   * - drink: lean back ~16° tipping drink
   * - fish: lean forward ~10° watching water with periodic line tug
   * - pet: lean forward ~18°, head down, right arm petting gently
   * - wave: right arm raised waving side to side cheerfully
   * - water: lean forward ~15°, both arms pouring watering can
   * - sweep: both arms sweeping side to side
   * - cheer: both arms raised celebrating
   */
  const LAY_TILT = MathUtils.degToRad(-82);
  const DRINK_TILT = MathUtils.degToRad(-16);
  const FISH_TILT = MathUtils.degToRad(10);
  const PET_TILT = MathUtils.degToRad(18);
  const WATER_TILT = MathUtils.degToRad(15);
  let actionTime = 0;
  let currentActionTilt = 0;

  const armRight = root.getObjectByName('arm-right');
  const armLeft = root.getObjectByName('arm-left');
  const head = root.getObjectByName('head');

  return {
    root,
    // What the child chose: her species' own clothes, worn when she chose none, are not listed.
    outfit: worn.entries.filter((entry) => outfit.includes(entry)),
    update(dt, speed, onGround, seated = null, inWater = false, action = null) {
      const moving: Locomotion = speed > (WALK_SPEED + RUN_SPEED) / 2 ? 'sprint' : speed > 0.4 ? 'walk' : 'idle';
      // While in water or doing an action she stays in locomotion/idle, never freezes mid-air.
      const next: Locomotion = (!onGround && !inWater) ? current : (seated ?? moving);
      if (next !== current) {
        const from = actions.get(current);
        const to = actions.get(next);
        if (from && to) to.reset().play().crossFadeFrom(from, 0.18, false);
        current = next;
      }
      const animAction = actions.get(current);
      if (animAction && (current === 'walk' || current === 'sprint')) {
        animAction.timeScale = Math.max(0.6, speed / (current === 'sprint' ? RUN_SPEED : WALK_SPEED));
      }
      mixer.update(dt);

      const armFree = seated === null && !action;
      pose.apply(armFree);

      if (action) {
        actionTime += dt;
      } else {
        actionTime = 0;
      }

      // Compute action pitch and limb positions
      let actionPitch = 0;
      if (action === 'lay') {
        const breathing = Math.sin(actionTime * 1.8) * 0.02;
        actionPitch = LAY_TILT + breathing;
      } else if (action === 'eat') {
        actionPitch = Math.sin(actionTime * 8) * 0.045;
      } else if (action === 'drink') {
        actionPitch = DRINK_TILT;
      } else if (action === 'fish') {
        const tension = Math.sin(actionTime * 2.5) > 0.85 ? 0.04 : 0;
        actionPitch = FISH_TILT + tension;
      } else if (action === 'pet') {
        actionPitch = PET_TILT;
        if (armRight) {
          armRight.rotation.x = MathUtils.degToRad(-60) + Math.sin(actionTime * 6) * 0.15;
          armRight.rotation.z = Math.sin(actionTime * 6) * 0.1;
        }
        if (head) head.rotation.x = MathUtils.degToRad(18);
      } else if (action === 'wave') {
        if (armRight) {
          armRight.rotation.x = MathUtils.degToRad(-130);
          armRight.rotation.z = MathUtils.degToRad(20) + Math.sin(actionTime * 10) * 0.35;
        }
        if (head) head.rotation.z = Math.sin(actionTime * 5) * 0.08;
      } else if (action === 'water') {
        actionPitch = WATER_TILT;
        if (armRight) armRight.rotation.x = MathUtils.degToRad(-50) + Math.sin(actionTime * 4) * 0.1;
        if (armLeft) armLeft.rotation.x = MathUtils.degToRad(-50);
      } else if (action === 'sweep') {
        const sweepAngle = Math.sin(actionTime * 5) * 0.35;
        if (armRight) {
          armRight.rotation.x = MathUtils.degToRad(-45);
          armRight.rotation.y = sweepAngle;
        }
        if (armLeft) {
          armLeft.rotation.x = MathUtils.degToRad(-45);
          armLeft.rotation.y = sweepAngle;
        }
      } else if (action === 'cheer') {
        if (armRight) armRight.rotation.x = MathUtils.degToRad(-150);
        if (armLeft) armLeft.rotation.x = MathUtils.degToRad(-150);
        actionPitch = Math.sin(actionTime * 8) * 0.05;
      }

      // Ease the action tilt smoothly
      currentActionTilt += (actionPitch - currentActionTilt) * Math.min(1, 10 * dt);

      // Swimming tilt: ease toward target when in water, back to 0 when out.
      const tiltTarget = inWater ? SWIM_TILT : 0;
      swimTilt += (tiltTarget - swimTilt) * Math.min(1, TILT_EASE * dt);
      swimTime = inWater ? swimTime + dt : 0;
      const progress = Math.abs(swimTilt) / SWIM_TILT; // 0 → 1 as tilt builds up
      const bob = inWater ? Math.sin(swimTime * BOB_FREQ * Math.PI * 2) * BOB_AMP * progress : 0;

      root.rotation.x = inWater ? (swimTilt + bob) : currentActionTilt;
    },
  };
}
