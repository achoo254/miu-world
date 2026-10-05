// The child's pet (Jev review decision "pets"): a little Kenney Cube Pet picked in the Character Creator
// (content/pets.json) that trots after the character, a step behind and to the side, walking or running
// to keep up, standing still when she does, and dancing when the world cheers a finished quest. Baked
// into one skinned mesh (one draw call); a colour variant (`recolor`) only moves its texture coordinates.
// Left far behind (a rescue, a jump down a cliff) it catches up at once. The same companion stands beside
// the character in the creator preview.
//
// Beyond following, it can be sent to a spot (a care scene's bowl, a ball, a sniffed-out clue: `goTo`), do a
// motion made in code over its clip (a trick, a hop of joy, a nap: `perform`, pet/pet-motion.ts), and wear what
// she bought it (`wear`, pet/pet-shapes.ts), each piece one more draw call.
import { AnimationMixer, Group, Object3D, type AnimationAction, type Mesh } from 'three';
import { mergeParts } from '../ambient/merge-parts';
import type { GuardedGltfLoader } from '../asset-loader';
import { MOTION_CLIP, MOTION_SECONDS, REST_POSE, isHeld, motionPose, type MotionPose, type PetMotion } from '../pet/pet-motion';
import { attachGear, disposeShape, petAnchors, type PetAnchors, type PetGearLook } from '../pet/pet-shapes';
import { recolorModel, type PetRecolor } from './pet-recolor';

export interface PetSpec {
  model: string;
  scale: number;
  recolor?: PetRecolor;
}

export type { PetGearLook };

/** Where the pet is sent instead of following her, and what it faces once there. */
export interface PetGoal {
  x: number;
  z: number;
  /** Faces this point on arrival (a bowl, the child); none: keeps its heading. */
  face?: { x: number; z: number };
  /** Runs there rather than walks. */
  run?: boolean;
  /** Height to stand at (in a bath tub); none: the ground's. */
  y?: number;
  /** Its own pace (blocks a second: a hop into the tub, a slow sniff along a trail); none: a walk or a run. */
  speed?: number;
}

export interface PetCompanion {
  readonly root: Object3D;
  /** Stands it beside the character (start, rescue). */
  place(x: number, y: number, z: number, facing: number): void;
  /** `ground(x, z, nearY)`: standing height near `nearY`. */
  update(dt: number, player: { x: number; y: number; z: number; facing: number }, ground: (x: number, z: number, nearY: number) => number): void;
  /** A little dance (a finished quest, the creator's "Vui mừng"). */
  celebrate(): void;
  /** Animates in place, without following anyone (the creator preview). */
  tick(dt: number): void;
  readonly clip: string;
  /** Sends it to a spot (null: back to following her). */
  goTo(goal: PetGoal | null): void;
  /** Whether it stands at the spot it was sent to. */
  readonly arrived: boolean;
  /** Plays a motion made in code (null ends a held one); `gentle` for less motion. */
  perform(motion: PetMotion | null, gentle?: boolean): void;
  /** The motion playing, if any. */
  readonly motion: PetMotion | null;
  /** Puts on this gear (replacing what it wore). */
  wear(gear: readonly PetGearLook[]): void;
  readonly gear: readonly string[];
  /** Where things sit on it, in world units from its root (its mouth for the ball). */
  readonly anchors: PetAnchors;
  /** The model's world scale. */
  readonly scale: number;
  /** Removes what it wears (the model itself is freed with the scene). */
  dispose(): void;
}

/** Where it keeps to, from the character: behind and to her left (blocks). */
const BEHIND = 1.4;
const SIDE = 0.8;
/** Farther than this it stops trotting and appears beside her (blocks). */
const CATCH_UP = 10;
const WALK_SPEED = 2.4;
const RUN_SPEED = 5.5;
const DANCE_SECONDS = 2.2;
const FADE = 0.2;
/** Close enough to a spot it was sent to (blocks). */
const ARRIVED = 0.15;

export async function loadPetCompanion(loader: GuardedGltfLoader, spec: PetSpec, shadows: boolean): Promise<PetCompanion> {
  const gltf = await loader.load(spec.model);
  // Its own copy: the loader hands every pet of this model the same parsed scene (two variants, or the
  // same pet picked again in the creator after the first was disposed).
  const model = gltf.scene.clone(true);
  if (spec.recolor) recolorModel(model, spec.recolor);
  const anchors = petAnchors(model);
  // Feet group (lifts, squashes from the ground) round a centre group (turns about the middle of the pet).
  const feet = new Group();
  const centre = new Group();
  centre.position.y = anchors.height / 2;
  model.position.y = -anchors.height / 2;
  centre.add(model);
  feet.add(centre);
  feet.scale.setScalar(spec.scale);
  const root = new Group();
  root.name = 'pet';
  root.add(feet);
  mergeParts(model, shadows);
  const mixer = new AnimationMixer(model);
  const clips = new Map<string, AnimationAction>(gltf.animations.map((c) => [c.name, mixer.clipAction(c)]));
  let current = '';
  const play = (clip: string): void => {
    const next = clips.get(clip) ?? clips.get('idle');
    if (!next || current === clip) return;
    const from = clips.get(current);
    next.reset().play();
    if (from && from !== next) from.crossFadeTo(next, FADE, false);
    current = clip;
  };
  play('idle');
  let dancing = 0;
  let placed = false;
  let goal: PetGoal | null = null;
  let arrived = false;
  let motion: PetMotion | null = null;
  let motionT = 0;
  let gentle = false;
  let worn: { ids: string[]; meshes: Mesh[] } = { ids: [], meshes: [] };

  const applyPose = (pose: MotionPose): void => {
    feet.position.y = pose.lift * anchors.height * spec.scale;
    feet.scale.set(spec.scale, spec.scale * pose.squash, spec.scale);
    centre.rotation.set(pose.pitch, pose.yaw, pose.roll, 'YXZ');
  };
  /** The motion's pose this frame (ending a one-shot motion when it is over); true while one plays. */
  const stepMotion = (dt: number): boolean => {
    if (!motion) {
      applyPose(REST_POSE);
      return false;
    }
    motionT += dt;
    if (!isHeld(motion) && motionT >= MOTION_SECONDS[motion]) {
      motion = null;
      applyPose(REST_POSE);
      return false;
    }
    applyPose(motionPose(motion, motionT, gentle));
    play(MOTION_CLIP[motion]);
    return true;
  };
  /** Walks or runs toward a point this frame; returns the distance left. */
  const stepToward = (dt: number, x: number, z: number, run: boolean, speed?: number): number => {
    const dx = x - root.position.x;
    const dz = z - root.position.z;
    const far = Math.hypot(dx, dz);
    if (far <= ARRIVED) return far;
    const step = Math.min(far, (speed ?? (run ? RUN_SPEED : WALK_SPEED)) * dt);
    root.position.x += (dx / far) * step;
    root.position.z += (dz / far) * step;
    root.rotation.y = Math.atan2(dx, dz);
    return far - step;
  };

  const companion: PetCompanion = {
    root,
    anchors,
    scale: spec.scale,
    get clip() {
      return current;
    },
    get arrived() {
      return arrived;
    },
    get motion() {
      return motion;
    },
    get gear() {
      return worn.ids;
    },
    place(x, y, z, facing) {
      root.position.set(x - Math.sin(facing) * BEHIND + Math.cos(facing) * SIDE, y, z - Math.cos(facing) * BEHIND - Math.sin(facing) * SIDE);
      root.rotation.y = facing;
      placed = true;
    },
    goTo(next) {
      goal = next;
      arrived = false;
    },
    perform(next, soft = false) {
      motion = next;
      motionT = 0;
      gentle = soft;
      if (next) dancing = 0;
    },
    update(dt, player, ground) {
      if (!placed) companion.place(player.x, player.y, player.z, player.facing);
      if (goal) {
        // Sent somewhere: there it stops, turned to what it came for (standing still while a motion plays, but
        // for a leap or a sniff, which carry it along).
        const free = motion === null || motion === 'jump' || motion === 'sniff';
        const left = free ? stepToward(dt, goal.x, goal.z, goal.run === true, goal.speed) : Math.hypot(goal.x - root.position.x, goal.z - root.position.z);
        arrived = left <= ARRIVED;
        if (arrived && goal.face) root.rotation.y = Math.atan2(goal.face.x - root.position.x, goal.face.z - root.position.z);
        if (!stepMotion(dt)) play(arrived ? 'idle' : goal.run ? 'run' : 'walk');
        root.position.y = goal.y ?? ground(root.position.x, root.position.z, player.y);
        mixer.update(dt);
        return;
      }
      const tx = player.x - Math.sin(player.facing) * BEHIND + Math.cos(player.facing) * SIDE;
      const tz = player.z - Math.cos(player.facing) * BEHIND - Math.sin(player.facing) * SIDE;
      const far = Math.hypot(tx - root.position.x, tz - root.position.z);
      if (far > CATCH_UP) {
        companion.place(player.x, player.y, player.z, player.facing);
      } else if (far > 0.25 && dancing <= 0) {
        // Off it goes after her: a held motion (sitting, sniffing) ends when she walks away.
        if (motion && isHeld(motion) && far > 1.2) motion = null;
        if (!motion) {
          stepToward(dt, tx, tz, far > 3);
          play(far > 3 ? 'run' : 'walk');
        }
      } else if (dancing <= 0 && !motion) {
        play('idle');
      }
      root.position.y = ground(root.position.x, root.position.z, player.y);
      if (dancing > 0) {
        dancing -= dt;
        play('dance');
      }
      stepMotion(dt);
      mixer.update(dt);
    },
    celebrate() {
      dancing = DANCE_SECONDS;
    },
    tick(dt) {
      if (dancing > 0) dancing -= dt;
      if (!stepMotion(dt)) play(dancing > 0 ? 'dance' : 'idle');
      mixer.update(dt);
    },
    wear(gear) {
      const ids = gear.map((g) => g.id);
      if (ids.join() === worn.ids.join()) return;
      for (const mesh of worn.meshes) disposeShape(mesh);
      worn = { ids, meshes: attachGear(model, anchors, gear, shadows) };
    },
    dispose() {
      for (const mesh of worn.meshes) disposeShape(mesh);
      worn = { ids: [], meshes: [] };
    },
  };
  return companion;
}
