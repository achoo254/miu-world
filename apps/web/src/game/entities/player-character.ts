// The child's character (the model of its species) + accessories, blending idle/walk/sprint by speed.
import { AnimationMixer, MathUtils, Quaternion, SkinnedMesh, type AnimationAction, type Object3D } from 'three';
import { clone as cloneModel } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { GuardedGltfLoader } from '../asset-loader';
import { dressCharacter, undressCharacter } from '../character/character-accessories';
import { wornPose } from '../character/worn-pose';
import { withOwnClothes } from '../character/character-clothes';
import { characterForSpecies, type CharacterModel } from '../content/characters';
import { poseAction, type ActionRig, type PlayerAction } from '../interact/player-actions';
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

/** The everyday gesture she makes over her clip (interact/player-actions.ts), or none. */
export type ExtraPlayerAction = PlayerAction | null;

/** A few of her bones' angles and her body's tilt this frame: what the gesture checks compare with her idle. */
export interface PoseSample {
  armRight: number;
  armLeft: number;
  head: number;
  legRight: number;
  pitch: number;
}

export interface PlayerCharacter {
  root: Object3D;
  /** Accessory entries actually attached (bad entries are skipped). */
  readonly outfit: string[];
  /** Swaps what she wears where she stands (the shop's "Mặc", another player's new clothes): no new model. */
  wear(outfit: readonly string[]): void;
  /**
   * `seated`: hold that pose (riding) instead of idle / walk / sprint.
   * `inWater`: tilt the model forward and add a bob, giving a swimming feel (no extra clip needed).
   * `action`: procedural gesture for everyday actions (interact/player-actions.ts).
   */
  update(
    dt: number,
    speed: number,
    onGround: boolean,
    seated?: SeatedPose | null,
    inWater?: boolean,
    action?: ExtraPlayerAction,
  ): void;
  /** Her bones and tilt as last posed. */
  poseSample(): PoseSample;
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
  let worn = dressCharacter(root, withOwnClothes(outfit, model.clothes), accessoryScaler(model), true);
  let chosen: readonly string[] = outfit;
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
  // Gestures turn these bones after the clip each frame; they are put back to rest first, so a bone the clip does
  // not animate (the head while idle) never keeps a gesture's angle after it ends.
  const bone = (name: string): Object3D | null => root.getObjectByName(name) ?? null;
  const rig: ActionRig = { armRight: bone('arm-right'), armLeft: bone('arm-left'), head: bone('head'), legRight: bone('leg-right'), legLeft: bone('leg-left') };
  const rest = Object.values(rig).flatMap((b: Object3D | null) => (b ? [{ bone: b, at: b.quaternion.clone() }] : []));
  const sample: PoseSample = { armRight: 0, armLeft: 0, head: 0, legRight: 0, pitch: 0 };
  let actionTime = 0;
  let lastAction: ExtraPlayerAction = null;
  let actionPitch = 0;
  // Yaw first, then the tilt about her own side-to-side axis: she leans forward, back or lies down facing her way.
  root.rotation.order = 'YXZ';
  const restQuaternion = new Quaternion();

  return {
    root,
    // What the child chose: her species' own clothes, worn when she chose none, are not listed.
    get outfit() {
      return worn.entries.filter((entry) => chosen.includes(entry));
    },
    wear(next) {
      // Accessories attach in the bind pose: reset the skeleton, swap; the next animation update poses her again.
      root.traverse((o) => {
        if (o instanceof SkinnedMesh) o.skeleton.pose();
      });
      root.updateMatrixWorld(true);
      undressCharacter(worn);
      worn = dressCharacter(root, withOwnClothes(next, model.clothes), accessoryScaler(model), true);
      chosen = [...next];
      for (const { entry, error } of worn.skipped) console.warn(`skipping outfit entry "${entry}"`, error);
      pose.wear(worn.entries);
    },
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
      for (const { bone: b, at } of rest) b.quaternion.copy(at);
      mixer.update(dt);

      const armFree = seated === null && !action;
      pose.apply(armFree);

      actionTime = action && action === lastAction ? actionTime + dt : 0;
      lastAction = action;
      const gesture = action ? poseAction(rig, action, actionTime) : { pitch: 0, roll: 0, lift: 0 };
      // Ease the tilt in and out (lying down, leaning to a flower); a body roll and lift follow the gesture as is.
      actionPitch += (gesture.pitch - actionPitch) * Math.min(1, 10 * dt);
      root.rotation.z = gesture.roll;
      root.position.y += gesture.lift * root.scale.y;

      // Swimming tilt: ease toward target when in water, back to 0 when out.
      const tiltTarget = inWater ? SWIM_TILT : 0;
      swimTilt += (tiltTarget - swimTilt) * Math.min(1, TILT_EASE * dt);
      swimTime = inWater ? swimTime + dt : 0;
      const progress = Math.abs(swimTilt) / SWIM_TILT; // 0 → 1 as tilt builds up
      const bob = inWater ? Math.sin(swimTime * BOB_FREQ * Math.PI * 2) * BOB_AMP * progress : 0;

      root.rotation.x = inWater ? swimTilt + bob : actionPitch;
      sample.armRight = rig.armRight?.rotation.x ?? 0;
      sample.armLeft = rig.armLeft?.rotation.x ?? 0;
      sample.head = rig.head ? restQuaternion.copy(rig.head.quaternion).angleTo(rest.find((r) => r.bone === rig.head)?.at ?? restQuaternion) : 0;
      sample.legRight = rig.legRight?.rotation.x ?? 0;
      sample.pitch = root.rotation.x;
    },
    poseSample: () => ({ ...sample }),
  };
}
