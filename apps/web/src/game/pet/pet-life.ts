// The pet's life round the child (owner, 05/10/2026: the pet "còn đơn giản, không có thu hút"): every care button
// plays a scene in the world (a bowl appears and it eats, crumbs flying; a bath with bubbles and a shake; a ball
// thrown and fetched; hearts when petted; a nap with Zzz), it does the tricks she calls, sniffs a few steps toward
// a clue still to find, and reacts to her on its own: it cheers a finished quest, runs to greet her when she
// arrives, sits by her when she sits, naps by her bed, and plays round her while she stands still.
//
// The numbers (needs, bond, which tricks are open) are the server's; this only plays what she asked for. Effects
// share the objects' particle layer (no draw call of their own); props are made in code, one draw call each while
// shown. Less motion (`gentle`): the same scenes, fewer particles, no fast turns. `lite` (low quality): fewer particles.
import { type Mesh, type Scene, Vector3 } from 'three';
import { freshPicker, type FreshPicker } from '@miu/quest/pick-fresh';
import type { PetCareAction, PetTrick } from '@miu/schema/pet-care';
import { getLangMode, linesOf, type Bilingual, type LinesKey } from '../../ui/i18n/i18n';
import type { ExtraPlayerAction } from '../entities/player-character';
import type { PetCompanion, PetGoal } from '../entities/pet-companion';
import type { ParticleSpawn } from '../interact/effect-particles';
import { MOTION_SECONDS, type PetMotion } from './pet-motion';
import { buildCareProp, disposeShape, type CareProp } from './pet-shapes';

export interface PetPlayer {
  x: number;
  y: number;
  z: number;
  facing: number;
  speed: number;
  /** On a seat or a bed: where her body is, and whether she lies. */
  seated: { x: number; z: number; lying: boolean } | null;
  /** Carried by a ride (the pet waits out of sight). */
  riding: boolean;
}

/** What is playing now, for the play screen (collapsing the care screen meanwhile) and the tests. */
export type PetSceneName = `care:${PetCareAction}` | `trick:${PetTrick}` | 'sniff' | 'greet' | 'celebrate';

export interface PetLifeOptions {
  pet: PetCompanion;
  scene: Scene;
  /** The objects' particle layer. */
  spawn: (p: ParticleSpawn) => void;
  /** Standing height of a column near `nearY`. */
  ground: (x: number, z: number, nearY: number) => number;
  /** Whether a pet may stand at this column at about `y` (open, dry, no step of more than a block). */
  standable: (x: number, z: number, y: number) => boolean;
  /** Its bed at home (the decor slot `pet-bed`), where it naps when close by. */
  bed?: { x: number; y: number; z: number } | null;
  /** Shows a line over the pet (`sub`: the English line under it in Song ngữ). */
  say: (text: string, sub: string | null) => void;
  /** Her own gesture for a scene (bending to the bowl, scrubbing, petting, a wave for a high five). */
  playerAction: (action: ExtraPlayerAction, seconds: number) => void;
  /** A scene starts (its name) or ends (null). */
  onScene: (scene: PetSceneName | null) => void;
  /**
   * At home, the map of today's lesson away from it: greeting her there, the pet says it wants to go (owner,
   * 09/10/2026: the child plays only at home). None elsewhere.
   */
  outing?: string | null;
  gentle: boolean;
  lite: boolean;
  shadows: boolean;
}

export interface PetLife {
  /** Plays a care scene (ending any other). */
  care(action: PetCareAction): void;
  trick(trick: PetTrick): void;
  /** Runs a few steps toward the nearest of these places (unfound clues); false while it cannot (cooling down, nothing near). */
  sniff(places: ReadonlyArray<readonly [number, number, number]>): boolean;
  /** A finished quest: it cheers with her. */
  celebrate(): void;
  /** She tapped it (its care screen opens): a wiggle and a heart, where it stands. */
  touched(): void;
  /** She arrived (a new map, a ride's far stop, a rescue, back from a long pause): it runs up to greet her. */
  greet(): void;
  update(dt: number, player: PetPlayer): void;
  /** The yaw the camera should look from while a scene plays (so she and the pet are both in view); null otherwise. */
  readonly viewYaw: number | null;
  readonly scene: PetSceneName | null;
  /** What it does on its own now (for the tests and the stats overlay). */
  readonly mood: 'follow' | 'sit-with' | 'nap-with' | 'play-round' | 'scene';
  /** Seconds before it may sniff again (0: ready). */
  readonly sniffCooldown: number;
  dispose(): void;
}

/** Seconds between two sniffs: a nudge, never the whole way. */
export const SNIFF_COOLDOWN = 20;
/** Farthest a sniff runs toward a clue (blocks), and never closer than this to it. */
const SNIFF_RUN = 5;
const SNIFF_SHORT = 2;
/** She stands still this long before it plays round her (seconds), and it sits by her this long after a round. */
const IDLE_PLAY = 7;
const ROUND_REST = 12;
/** Scenes that go on while she walks. */
const WALK_ALONG: ReadonlySet<PetSceneName> = new Set(['greet', 'celebrate', 'sniff']);
const UP = new Vector3(0, 1, 0);
/** Its bed at home is where it naps when she is this near it, on the same floor (blocks). */
const BED_REACH = 10;
/** Longest wait for the pet to reach a spot in a scene before the scene goes on without it (seconds). */
const REACH_TIMEOUT = 4;

/** Pools of the pet's own lines, one per moment (locales `pet.say.*`). */
const LINES = {
  feed: 'pet.say.feed',
  pet: 'pet.say.pet',
  bath: 'pet.say.bath',
  play: 'pet.say.play',
  nap: 'pet.say.nap',
  trick: 'pet.say.trick',
  sniff: 'pet.say.sniff',
  greet: 'pet.say.greet',
  cheer: 'pet.say.cheer',
  outing: 'pet.say.outing',
} as const satisfies Record<string, LinesKey>;
type LinePool = keyof typeof LINES;

const forward = (facing: number): [number, number] => [Math.sin(facing), Math.cos(facing)];

/** One scene: advanced each frame until it says it is done; `end` tidies up whatever it left in the world. */
interface Running {
  name: PetSceneName;
  view: number;
  update(dt: number, player: PetPlayer): boolean;
  end(): void;
}

export function createPetLife(options: PetLifeOptions): PetLife {
  const { pet, scene, spawn, ground, standable, gentle, lite } = options;
  const density = (lite ? 0.5 : 1) * (gentle ? 0.5 : 1);
  const pickers = new Map<LinePool, FreshPicker<Bilingual>>();
  /** A fresh line of the pool, `{map}` filled with the outing's map. */
  const say = (pool: LinePool): void => {
    let picker = pickers.get(pool);
    if (!picker) pickers.set(pool, (picker = freshPicker(linesOf(LINES[pool]))));
    const map = options.outing ?? '';
    const raw = picker.next();
    const line = { vi: raw.vi.replaceAll('{map}', map), en: raw.en.replaceAll('{map}', map) };
    const mode = getLangMode();
    if (mode === 'en') options.say(line.en, null);
    else options.say(line.vi, mode === 'both' && line.en !== line.vi ? line.en : null);
  };
  /** A burst of `count` particles (scaled by density, at least one). */
  const burst = (count: number, make: (i: number) => ParticleSpawn): void => {
    const n = Math.max(1, Math.round(count * density));
    for (let i = 0; i < n; i++) spawn(make(i));
  };
  const jitter = (r: number): number => (Math.random() - 0.5) * 2 * r;
  const headAt = (): [number, number, number] => [pet.root.position.x, pet.root.position.y + pet.anchors.height * pet.scale + 0.15, pet.root.position.z];

  let running: Running | null = null;
  let mood: PetLife['mood'] = 'follow';
  let idleFor = 0;
  let sniffCooldown = 0;
  /** Her round: the points it runs between, the one it is on and the one it was sent to, its rest at each. */
  let playRound: { points: Array<[number, number]>; index: number; sent: number; rest: number; sitting: boolean } | null = null;

  /** A spot `distance` ahead of her where the pet can stand (turning aside, then behind, when ahead is blocked). */
  const stage = (player: PetPlayer, distance: number): { x: number; z: number; y: number; angle: number } => {
    for (const turn of [0, 0.6, -0.6, 1.2, -1.2, Math.PI]) {
      const angle = player.facing + turn;
      const [fx, fz] = forward(angle);
      const x = player.x + fx * distance;
      const z = player.z + fz * distance;
      const y = ground(x, z, player.y);
      if (Math.abs(y - player.y) <= 1 && standable(x, z, y) && standable(player.x + fx * distance * 0.5, player.z + fz * distance * 0.5, ground(player.x + fx * distance * 0.5, player.z + fz * distance * 0.5, player.y))) {
        return { x, z, y, angle };
      }
    }
    return { x: player.x, z: player.z, y: player.y, angle: player.facing };
  };
  /** A prop popping in at a spot (and shrinking away at the end). */
  const prop = (kind: CareProp, at: { x: number; y: number; z: number }): { mesh: Mesh; food?: Mesh; grow: number; leaving: boolean } => {
    const built = buildCareProp(kind, options.shadows);
    built.mesh.position.set(at.x, at.y, at.z);
    built.mesh.scale.setScalar(0.01);
    scene.add(built.mesh);
    return { ...built, grow: 0, leaving: false };
  };
  const animateProp = (p: { mesh: Mesh; grow: number; leaving: boolean }, dt: number): void => {
    p.grow = Math.max(0, Math.min(1, p.grow + (p.leaving ? -dt : dt) / 0.3));
    // A little overshoot as it pops in.
    const k = p.grow;
    p.mesh.scale.setScalar(Math.max(0.01, k < 1 && !p.leaving ? k * (1 + 0.25 * Math.sin(k * Math.PI)) : k));
  };
  const toward = (from: { x: number; z: number }, to: { x: number; z: number }, by: number): { x: number; z: number } => {
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const d = Math.hypot(dx, dz) || 1;
    return { x: from.x + (dx / d) * by, z: from.z + (dz / d) * by };
  };
  /** Waits for the pet to reach where it was sent, at most a few seconds (it may be stuck behind a wall). */
  const reached = (state: { waited: number }, dt: number): boolean => {
    state.waited += dt;
    if (pet.arrived) return true;
    if (state.waited < REACH_TIMEOUT) return false;
    return true;
  };

  const feedScene = (player: PetPlayer): Running => {
    const spot = stage(player, 1.6);
    const bowl = prop('bowl', spot);
    const behind = toward(spot, { x: player.x, z: player.z }, -0.5);
    pet.goTo({ ...behind, face: spot, run: true });
    options.playerAction('pet', 1.4);
    let phase: 'come' | 'eat' | 'done' = 'come';
    let t = 0;
    let crumbs = 0;
    const wait = { waited: 0 };
    return {
      name: 'care:feed',
      view: spot.angle + 0.9,
      update(dt) {
        t += dt;
        animateProp(bowl, dt);
        if (phase === 'come' && reached(wait, dt)) {
          phase = 'eat';
          t = 0;
          pet.perform('eat');
          say('feed');
        } else if (phase === 'eat') {
          crumbs -= dt;
          if (crumbs <= 0) {
            crumbs = 0.16 / density;
            spawn({ shape: 'drop', at: [spot.x + jitter(0.15), spot.y + 0.25, spot.z + jitter(0.15)], velocity: [jitter(0.9), 1.6 + Math.random(), jitter(0.9)], gravity: 7, life: 0.6, size: [0.08, 0.05], color: Math.random() < 0.5 ? '#c98f5a' : '#f2d14c' });
          }
          if (bowl.food) bowl.food.scale.set(1, Math.max(0.12, 1 - t / 2.6), 1);
          if (t > 2.6) {
            phase = 'done';
            t = 0;
            pet.perform('hop', gentle);
            bowl.leaving = true;
            burst(4, () => ({ shape: 'heart', at: headAt(), velocity: [jitter(0.3), 0.9, jitter(0.3)], life: 1.4, size: [0.25, 0.4], sway: 0.6 }));
          }
        } else if (phase === 'done' && t > MOTION_SECONDS.hop) return true;
        return false;
      },
      end() {
        disposeShape(bowl.mesh);
      },
    };
  };

  const petScene = (player: PetPlayer): Running => {
    const spot = stage(player, 0.95);
    pet.goTo({ x: spot.x, z: spot.z, face: { x: player.x, z: player.z }, run: true });
    let phase: 'come' | 'love' | 'done' = 'come';
    let t = 0;
    let hearts = 0;
    const wait = { waited: 0 };
    return {
      name: 'care:pet',
      view: spot.angle + 1.1,
      update(dt) {
        t += dt;
        if (phase === 'come' && reached(wait, dt)) {
          phase = 'love';
          t = 0;
          pet.perform('wiggle', gentle);
          options.playerAction('pet', 2.4);
          say('pet');
        } else if (phase === 'love') {
          hearts -= dt;
          if (hearts <= 0) {
            hearts = 0.28 / density;
            spawn({ shape: 'heart', at: headAt(), velocity: [jitter(0.35), 0.8, jitter(0.35)], life: 1.5, size: [0.22, 0.38], sway: 0.7 });
          }
          if (t > 2.2) {
            phase = 'done';
            t = 0;
            pet.perform('hop', gentle);
            burst(5, () => ({ shape: 'sparkle', at: headAt(), velocity: [jitter(1), 0.6 + Math.random() * 0.6, jitter(1)], life: 0.9, size: [0.18, 0.08] }));
          }
        } else if (phase === 'done' && t > MOTION_SECONDS.hop) return true;
        return false;
      },
      end() {},
    };
  };

  const bathScene = (player: PetPlayer): Running => {
    const spot = stage(player, 1.7);
    const tub = prop('tub', spot);
    const edge = toward(spot, { x: player.x, z: player.z }, 0.95);
    const out = toward(spot, { x: player.x, z: player.z }, 1.05);
    pet.goTo({ ...edge, face: spot, run: true });
    let phase: 'come' | 'in' | 'wash' | 'out' | 'shake' | 'done' = 'come';
    let t = 0;
    let bubbles = 0;
    const wait = { waited: 0 };
    return {
      name: 'care:bath',
      view: spot.angle + 0.9,
      update(dt) {
        t += dt;
        animateProp(tub, dt);
        if (phase === 'come' && reached(wait, dt)) {
          phase = 'in';
          t = 0;
          pet.goTo({ x: spot.x, z: spot.z, y: spot.y + 0.08, face: { x: player.x, z: player.z }, speed: 1 });
          pet.perform('jump', gentle);
        } else if (phase === 'in' && t > MOTION_SECONDS.jump) {
          phase = 'wash';
          t = 0;
          pet.perform('wiggle', gentle);
          options.playerAction('wash', 2.8);
          say('bath');
        } else if (phase === 'wash') {
          bubbles -= dt;
          if (bubbles <= 0) {
            bubbles = 0.1 / density;
            spawn({ shape: 'bubble', at: [spot.x + jitter(0.45), spot.y + 0.35 + Math.random() * 0.3, spot.z + jitter(0.45)], velocity: [jitter(0.1), 0.45 + Math.random() * 0.3, jitter(0.1)], life: 1.6, size: [0.12, 0.3], sway: 0.5, alpha: 0.85 });
          }
          if (t > 2.8) {
            phase = 'out';
            t = 0;
            pet.goTo({ x: out.x, z: out.z, face: { x: player.x, z: player.z }, speed: 1.1 });
            pet.perform('jump', gentle);
          }
        } else if (phase === 'out' && t > MOTION_SECONDS.jump) {
          phase = 'shake';
          t = 0;
          pet.perform('shake', gentle);
          tub.leaving = true;
          const [x, y, z] = headAt();
          burst(14, (i) => {
            const a = (i / 14) * Math.PI * 2;
            return { shape: 'drop', at: [x, y - 0.25, z], velocity: [Math.cos(a) * 1.6, 1.4, Math.sin(a) * 1.6], gravity: 7, life: 0.7, size: [0.12, 0.08] };
          });
        } else if (phase === 'shake' && t > MOTION_SECONDS.shake) {
          phase = 'done';
          t = 0;
          pet.perform('hop', gentle);
          burst(6, () => ({ shape: 'sparkle', at: headAt(), velocity: [jitter(0.8), 0.5 + Math.random() * 0.5, jitter(0.8)], life: 1, size: [0.2, 0.08] }));
        } else if (phase === 'done' && t > MOTION_SECONDS.hop) return true;
        return false;
      },
      end() {
        disposeShape(tub.mesh);
      },
    };
  };

  const playScene = (player: PetPlayer): Running => {
    const [fx, fz] = forward(player.facing);
    const ball = prop('ball', { x: player.x + fx * 0.6, y: player.y, z: player.z + fz * 0.6 });
    // Where it lands: as far ahead as the ground allows.
    let landing = stage(player, 5);
    for (const distance of [5, 4, 3]) {
      landing = stage(player, distance);
      if (landing.x !== player.x || landing.z !== player.z) break;
    }
    const from = new Vector3(ball.mesh.position.x, ball.mesh.position.y, ball.mesh.position.z);
    const to = new Vector3(landing.x, landing.y, landing.z);
    const home = stage(player, 1.1);
    options.playerAction('kick', 0.9);
    pet.perform('beg', gentle);
    let phase: 'ready' | 'fly' | 'fetch' | 'back' | 'drop' = 'ready';
    let t = 0;
    const wait = { waited: 0 };
    const mouth = new Vector3();
    return {
      name: 'care:play',
      // Looking along the throw: the ball's flight and the run to it in view.
      view: landing.angle + 0.35,
      update(dt) {
        t += dt;
        animateProp(ball, dt);
        if (phase === 'ready' && t > 0.45) {
          phase = 'fly';
          t = 0;
          pet.perform(null);
          pet.goTo({ x: to.x, z: to.z, run: true });
          say('play');
        } else if (phase === 'fly') {
          const k = Math.min(1, t / 0.9);
          ball.mesh.position.lerpVectors(from, to, k);
          ball.mesh.position.y += Math.sin(k * Math.PI) * 1.8;
          ball.mesh.rotation.x += dt * 9;
          if (k >= 1) {
            phase = 'fetch';
            t = 0;
            burst(3, () => ({ shape: 'puff', at: [to.x, to.y + 0.1, to.z], velocity: [jitter(0.5), 0.3, jitter(0.5)], life: 0.6, size: [0.2, 0.45], alpha: 0.6 }));
          }
        } else if (phase === 'fetch' && reached(wait, dt)) {
          phase = 'back';
          t = 0;
          wait.waited = 0;
          pet.goTo({ x: home.x, z: home.z, face: { x: player.x, z: player.z }, run: true });
        } else if (phase === 'back') {
          // In its mouth on the way back.
          mouth.set(pet.anchors.mouth.x, pet.anchors.mouth.y - 0.16 / pet.scale, pet.anchors.mouth.z).multiplyScalar(pet.scale).applyAxisAngle(UP, pet.root.rotation.y).add(pet.root.position);
          ball.mesh.position.copy(mouth);
          if (reached(wait, dt)) {
            phase = 'drop';
            t = 0;
            ball.mesh.position.y = pet.root.position.y;
            pet.perform('hop', gentle);
            burst(5, () => ({ shape: Math.random() < 0.5 ? 'star' : 'note', at: headAt(), velocity: [jitter(0.6), 0.8, jitter(0.6)], life: 1.3, size: [0.22, 0.34], sway: 0.5 }));
          }
        } else if (phase === 'drop') {
          if (t > 0.6) ball.leaving = true;
          if (t > MOTION_SECONDS.hop) return true;
        }
        return false;
      },
      end() {
        disposeShape(ball.mesh);
      },
    };
  };

  const napScene = (player: PetPlayer): Running => {
    // Its own bed when she is home on the same floor and near it; else a cushion right here.
    const near = options.bed && Math.abs(options.bed.y - player.y) < 1.5 && Math.hypot(options.bed.x - player.x, options.bed.z - player.z) < BED_REACH;
    const bed = near ? options.bed : null;
    const spot = bed ? { ...bed, angle: Math.atan2(bed.x - player.x, bed.z - player.z) } : stage(player, 1.5);
    const cushion = bed ? null : prop('cushion', spot);
    // On the cushion of its bed or of the one brought out.
    pet.goTo({ x: spot.x, z: spot.z, y: spot.y + 0.12, face: { x: player.x, z: player.z } });
    let phase: 'come' | 'sleep' | 'wake' = 'come';
    let t = 0;
    let zzz = 0;
    const wait = { waited: 0 };
    return {
      name: 'care:nap',
      view: spot.angle + 0.9,
      update(dt) {
        t += dt;
        if (cushion) animateProp(cushion, dt);
        if (phase === 'come' && reached(wait, dt)) {
          phase = 'sleep';
          t = 0;
          pet.perform('nap');
          say('nap');
        } else if (phase === 'sleep') {
          zzz -= dt;
          if (zzz <= 0) {
            zzz = 0.65 / Math.max(0.5, density);
            const [x, y, z] = headAt();
            spawn({ shape: 'zzz', at: [x + 0.15, y, z], velocity: [0.15, 0.45, 0], life: 1.8, size: [0.22, 0.42], sway: 0.4 });
          }
          if (t > 3.8) {
            phase = 'wake';
            t = 0;
            pet.perform('greet', gentle);
            if (cushion) cushion.leaving = true;
          }
        } else if (phase === 'wake' && t > MOTION_SECONDS.greet) return true;
        return false;
      },
      end() {
        if (cushion) disposeShape(cushion.mesh);
      },
    };
  };

  const TRICK_EFFECT: Record<PetTrick, ParticleSpawn['shape']> = { sit: 'heart', spin: 'sparkle', jump: 'star', roll: 'sparkle', 'high-five': 'star', dance: 'note' };
  const trickScene = (player: PetPlayer, trick: PetTrick): Running => {
    const spot = stage(player, 1.3);
    pet.goTo({ x: spot.x, z: spot.z, face: { x: player.x, z: player.z }, run: true });
    let phase: 'come' | 'show' = 'come';
    let t = 0;
    let effects = 0;
    const wait = { waited: 0 };
    const motion: PetMotion = trick;
    const length = trick === 'sit' ? 2.4 : MOTION_SECONDS[motion];
    return {
      name: `trick:${trick}`,
      view: spot.angle + 1,
      update(dt) {
        t += dt;
        if (phase === 'come' && reached(wait, dt)) {
          phase = 'show';
          t = 0;
          pet.perform(motion, gentle);
          if (trick === 'high-five') options.playerAction('wave', 1.4);
          say('trick');
        } else if (phase === 'show') {
          effects -= dt;
          if (effects <= 0) {
            effects = 0.3 / density;
            spawn({ shape: TRICK_EFFECT[trick], at: headAt(), velocity: [jitter(0.6), 0.7, jitter(0.6)], life: 1.2, size: [0.2, 0.32], sway: 0.5 });
          }
          if (t > length) {
            if (trick === 'sit') pet.perform(null);
            return true;
          }
        }
        return false;
      },
      end() {},
    };
  };

  const sniffScene = (player: PetPlayer, place: readonly [number, number, number]): Running => {
    const [px, , pz] = place;
    const far = Math.hypot(px - player.x, pz - player.z);
    const run = Math.max(1, Math.min(SNIFF_RUN, far - SNIFF_SHORT, far * 0.6));
    const target = toward({ x: player.x, z: player.z }, { x: px, z: pz }, run);
    // Stops short where the way is blocked: the last open spot along the line.
    let end = { x: player.x, z: player.z };
    for (let d = 0.5; d <= run; d += 0.5) {
      const at = toward({ x: player.x, z: player.z }, target, d);
      if (!standable(at.x, at.z, ground(at.x, at.z, player.y))) break;
      end = at;
    }
    pet.perform('sniff', gentle);
    let phase: 'nose' | 'trail' | 'point' = 'nose';
    let t = 0;
    let prints = 0;
    const wait = { waited: 0 };
    return {
      name: 'sniff',
      view: Math.atan2(px - player.x, pz - player.z) + 0.6,
      update(dt) {
        t += dt;
        if (phase === 'nose' && t > 1) {
          phase = 'trail';
          t = 0;
          pet.goTo({ x: end.x, z: end.z, face: { x: px, z: pz }, speed: 2.2 });
          say('sniff');
        } else if (phase === 'trail') {
          prints -= dt;
          if (prints <= 0) {
            prints = 0.25;
            // Little paw marks left on the ground as it goes.
            spawn({ shape: 'puff', at: [pet.root.position.x, pet.root.position.y + 0.04, pet.root.position.z], velocity: [0, 0, 0], life: 2.6, size: [0.16, 0.12], color: '#8a5a32', alpha: 0.7 });
          }
          if (reached(wait, dt)) {
            phase = 'point';
            t = 0;
            pet.perform('beg', gentle);
            burst(3, () => ({ shape: 'sparkle', at: headAt(), velocity: [jitter(0.4), 0.6, jitter(0.4)], life: 1, size: [0.2, 0.1] }));
          }
        } else if (phase === 'point' && t > 1.6) {
          pet.perform(null);
          return true;
        }
        return false;
      },
      end() {},
    };
  };

  const greetScene = (player: PetPlayer): Running => {
    // It comes running from a little way behind her.
    const [fx, fz] = forward(player.facing);
    const sx = player.x - fx * 4;
    const sz = player.z - fz * 4;
    const sy = ground(sx, sz, player.y);
    pet.place(player.x, player.y, player.z, player.facing);
    if (Math.abs(sy - player.y) <= 1 && standable(sx, sz, sy)) pet.root.position.set(sx, sy, sz);
    const spot = stage(player, 1.2);
    pet.goTo({ x: spot.x, z: spot.z, face: { x: player.x, z: player.z }, run: true });
    let phase: 'come' | 'hello' = 'come';
    let t = 0;
    const wait = { waited: 0 };
    return {
      name: 'greet',
      view: player.facing,
      update(dt) {
        t += dt;
        if (phase === 'come' && reached(wait, dt)) {
          phase = 'hello';
          t = 0;
          pet.perform('greet', gentle);
          say(options.outing ? 'outing' : 'greet');
          burst(3, () => ({ shape: 'heart', at: headAt(), velocity: [jitter(0.3), 0.8, jitter(0.3)], life: 1.3, size: [0.22, 0.34], sway: 0.6 }));
        } else if (phase === 'hello' && t > MOTION_SECONDS.greet) return true;
        return false;
      },
      end() {},
    };
  };

  const celebrateScene = (player: PetPlayer): Running => {
    const spot = stage(player, 1.3);
    pet.goTo({ x: spot.x, z: spot.z, face: { x: player.x, z: player.z }, run: true });
    let phase: 'come' | 'joy' = 'come';
    let t = 0;
    let effects = 0;
    const wait = { waited: 0 };
    return {
      name: 'celebrate',
      view: player.facing,
      update(dt) {
        t += dt;
        if (phase === 'come' && (reached(wait, dt) || t > 1.2)) {
          phase = 'joy';
          t = 0;
          pet.perform('dance', gentle);
          say('cheer');
        } else if (phase === 'joy') {
          effects -= dt;
          if (effects <= 0) {
            effects = 0.3 / density;
            spawn({ shape: Math.random() < 0.5 ? 'star' : 'heart', at: headAt(), velocity: [jitter(0.7), 0.9, jitter(0.7)], life: 1.3, size: [0.22, 0.36], sway: 0.5 });
          }
          if (t > MOTION_SECONDS.dance) return true;
        }
        return false;
      },
      end() {},
    };
  };

  /** A spot beside her seat or bed it can stand on (right, left, then in front); where it is when none is open. */
  const besideSeat = (player: PetPlayer, seat: { x: number; z: number; lying: boolean }): PetGoal => {
    const side = seat.lying ? 1.1 : 0.95;
    for (const turn of [Math.PI / 2, -Math.PI / 2, 0]) {
      const [fx, fz] = forward(player.facing + turn);
      const x = seat.x + fx * side;
      const z = seat.z + fz * side;
      if (standable(x, z, ground(x, z, player.y))) return { x, z, face: { x: seat.x, z: seat.z } };
    }
    return { x: pet.root.position.x, z: pet.root.position.z, face: { x: seat.x, z: seat.z } };
  };
  /** Four points round her it runs between, hopping at each (those it can stand on). */
  const circleRound = (player: PetPlayer): Array<[number, number]> => {
    const points: Array<[number, number]> = [];
    for (let i = 0; i < 4; i++) {
      const a = player.facing + Math.PI * 0.4 + (i * Math.PI) / 2;
      const x = player.x + Math.sin(a) * 1.7;
      const z = player.z + Math.cos(a) * 1.7;
      if (standable(x, z, ground(x, z, player.y))) points.push([x, z]);
    }
    return points;
  };

  let pending: ((player: PetPlayer) => Running) | null = null;
  const start = (make: (player: PetPlayer) => Running): void => {
    pending = make;
  };
  const stop = (): void => {
    if (!running) return;
    running.end();
    running = null;
    pet.goTo(null);
    pet.perform(null);
    options.onScene(null);
  };

  return {
    care(action) {
      start((player) => ({ feed: feedScene, pet: petScene, bath: bathScene, play: playScene, nap: napScene })[action](player));
    },
    trick(trick) {
      start((player) => trickScene(player, trick));
    },
    sniff(places) {
      if (sniffCooldown > 0 || places.length === 0) return false;
      sniffCooldown = SNIFF_COOLDOWN;
      start((player) => {
        const nearest = [...places].sort((a, b) => Math.hypot(a[0] - player.x, a[2] - player.z) - Math.hypot(b[0] - player.x, b[2] - player.z))[0] ?? places[0];
        return sniffScene(player, nearest ?? [player.x, player.y, player.z]);
      });
      return true;
    },
    celebrate() {
      start(celebrateScene);
    },
    touched() {
      if (running || pending) return;
      pet.perform('wiggle', gentle);
      say('pet');
      burst(3, () => ({ shape: 'heart', at: headAt(), velocity: [jitter(0.3), 0.8, jitter(0.3)], life: 1.3, size: [0.22, 0.34], sway: 0.6 }));
    },
    greet() {
      if (!running) start(greetScene);
    },
    update(dt, player) {
      sniffCooldown = Math.max(0, sniffCooldown - dt);
      if (pending && !player.riding) {
        const make = pending;
        pending = null;
        if (running) running.end();
        pet.perform(null);
        playRound = null;
        running = make(player);
        mood = 'scene';
        options.onScene(running.name);
      }
      // Walking off ends a scene (the pet comes along); a ride ends it too. Not a greeting, a cheer or a sniff:
      // those go on round her as she walks (she often follows the sniffing pet at once).
      if (running && (player.riding || (player.speed > 0.5 && !WALK_ALONG.has(running.name)))) stop();
      if (running) {
        if (running.update(dt, player)) stop();
      } else {
        // On its own: by her seat or bed, round her while she stands still, else at her heels.
        const still = player.speed < 0.1 && !player.seated && !player.riding;
        idleFor = still ? idleFor + dt : 0;
        if (player.seated) {
          const next = player.seated.lying ? 'nap-with' : 'sit-with';
          if (mood !== next) {
            mood = next;
            playRound = null;
            pet.perform(null);
            pet.goTo(besideSeat(player, player.seated));
          }
          if (pet.arrived && pet.motion === null) pet.perform(player.seated.lying ? 'nap' : 'sit');
        } else if (still && (mood === 'play-round' || idleFor > IDLE_PLAY)) {
          if (mood !== 'play-round' || !playRound) {
            mood = 'play-round';
            playRound = { points: circleRound(player), index: 0, sent: -1, rest: 0, sitting: false };
            pet.perform(null);
          }
          if (playRound.rest > 0) {
            playRound.rest -= dt;
            // Sat by her a while after its round: it follows again, and plays again after another still spell.
            if (playRound.rest <= 0 && playRound.sitting) {
              mood = 'follow';
              idleFor = 0;
              playRound = null;
              pet.goTo(null);
              pet.perform(null);
            }
          } else if (playRound.index < playRound.points.length) {
            const point = playRound.points[playRound.index];
            // Sent once to each point; there it hops, then on to the next.
            if (point && playRound.sent !== playRound.index) {
              playRound.sent = playRound.index;
              pet.goTo({ x: point[0], z: point[1], run: true });
            } else if (pet.arrived) {
              playRound.index += 1;
              pet.perform('hop', gentle);
              playRound.rest = MOTION_SECONDS.hop;
            }
          } else {
            pet.goTo({ x: pet.root.position.x, z: pet.root.position.z, face: { x: player.x, z: player.z } });
            pet.perform('sit');
            playRound.rest = ROUND_REST;
            playRound.sitting = true;
          }
        } else if (mood !== 'follow') {
          mood = 'follow';
          playRound = null;
          pet.goTo(null);
          if (pet.motion === 'sit' || pet.motion === 'nap') pet.perform(null);
        }
      }
      pet.update(dt, player, ground);
    },
    get viewYaw() {
      return running && running.name !== 'greet' && running.name !== 'celebrate' ? running.view : null;
    },
    get scene() {
      return running?.name ?? null;
    },
    get mood() {
      return mood;
    },
    get sniffCooldown() {
      return sniffCooldown;
    },
    dispose() {
      running?.end();
      running = null;
      pet.dispose();
    },
  };
}
