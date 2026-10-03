// The child's pet (Jev review decision "pets"): a little Kenney Cube Pet picked in the Character Creator
// (content/pets.json) that trots after the character, a step behind and to the side, walking or running
// to keep up, standing still when she does, and dancing when the world cheers a finished quest. Baked
// into one skinned mesh (one draw call); a colour variant (`recolor`) only moves its texture coordinates.
// Left far behind (a rescue, a jump down a cliff) it catches up at once. The same companion stands beside
// the character in the creator preview.
import { AnimationMixer, Group, Object3D, type AnimationAction } from 'three';
import { mergeParts } from '../ambient/merge-parts';
import type { GuardedGltfLoader } from '../asset-loader';
import { recolorModel, type PetRecolor } from './pet-recolor';

export interface PetSpec {
  model: string;
  scale: number;
  recolor?: PetRecolor;
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

export async function loadPetCompanion(loader: GuardedGltfLoader, spec: PetSpec, shadows: boolean): Promise<PetCompanion> {
  const gltf = await loader.load(spec.model);
  // Its own copy: the loader hands every pet of this model the same parsed scene (two variants, or the
  // same pet picked again in the creator after the first was disposed).
  const model = gltf.scene.clone(true);
  if (spec.recolor) recolorModel(model, spec.recolor);
  model.scale.setScalar(spec.scale);
  const root = new Group();
  root.name = 'pet';
  root.add(model);
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

  const companion: PetCompanion = {
    root,
    get clip() {
      return current;
    },
    place(x, y, z, facing) {
      root.position.set(x - Math.sin(facing) * BEHIND + Math.cos(facing) * SIDE, y, z - Math.cos(facing) * BEHIND - Math.sin(facing) * SIDE);
      root.rotation.y = facing;
      placed = true;
    },
    update(dt, player, ground) {
      if (!placed) companion.place(player.x, player.y, player.z, player.facing);
      const tx = player.x - Math.sin(player.facing) * BEHIND + Math.cos(player.facing) * SIDE;
      const tz = player.z - Math.cos(player.facing) * BEHIND - Math.sin(player.facing) * SIDE;
      const dx = tx - root.position.x;
      const dz = tz - root.position.z;
      const far = Math.hypot(dx, dz);
      if (far > CATCH_UP) {
        companion.place(player.x, player.y, player.z, player.facing);
      } else if (far > 0.25 && dancing <= 0) {
        const speed = far > 3 ? RUN_SPEED : WALK_SPEED;
        const step = Math.min(far, speed * dt);
        root.position.x += (dx / far) * step;
        root.position.z += (dz / far) * step;
        root.rotation.y = Math.atan2(dx, dz);
        play(far > 3 ? 'run' : 'walk');
      } else if (dancing <= 0) {
        play('idle');
      }
      root.position.y = ground(root.position.x, root.position.z, player.y);
      if (dancing > 0) {
        dancing -= dt;
        play('dance');
      }
      mixer.update(dt);
    },
    celebrate() {
      dancing = DANCE_SECONDS;
    },
    tick(dt) {
      if (dancing > 0) dancing -= dt;
      play(dancing > 0 ? 'dance' : 'idle');
      mixer.update(dt);
    },
  };
  return companion;
}
