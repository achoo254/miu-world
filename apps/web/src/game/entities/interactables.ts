// Interactables from entities.json (NPCs, quest clues, the riddle tree, chest, gate): one runtime
// object each, with an interaction radius and a state pushed by React (`set-world-state`, from the
// server). The prompt label is a React component; the game only reports which target is nearest and
// where it sits on screen. Animal NPCs follow npc-behavior.ts: varied actions, turning to Miu, greetings.
import {
  AnimationMixer,
  Box3,
  BoxGeometry,
  CanvasTexture,
  Color,
  Group,
  LoopOnce,
  Mesh,
  MeshLambertMaterial,
  SRGBColorSpace,
  Vector3,
  type AnimationAction,
  type AnimationClip,
  type Camera,
  type Material,
  type Object3D,
} from 'three';
import { clone as cloneModel } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { fillPlayerName } from '@miu/quest/player-name';
import type { Interactable, WorldEntities } from '@miu/voxel/world-entities';
import type { TargetState } from '../../game-bridge/game-store';
import type { GuardedGltfLoader } from '../asset-loader';
import { NpcBehavior, angleDelta, type NpcClip } from './npc-behavior';
import { duelPoseFrame, type DuelClip, type DuelPose } from '../duel/duel-poses';
import { mergeParts } from '../ambient/merge-parts';
import { createRiddleBoard } from './riddle-board';
import { seededRandom } from './seeded-random';

export interface InteractableObject {
  readonly def: Interactable;
  readonly root: Object3D;
  /** False while hidden: a hidden target never gets a prompt. */
  readonly available: boolean;
  /** `player`: Miu's position, which animal NPCs watch; `viewer`: the camera (no target turns to it: block-model props spin). */
  update(dt: number, player: { readonly x: number; readonly z: number }, viewer?: { readonly x: number; readonly z: number }): void;
  setState(state: TargetState | undefined): void;
  /** False while the same character stands at another place of the story (castHidden). */
  setPresent(present: boolean): void;
  /** False while it is too far to be seen (it is not drawn, yet stays available: the arrow and the walk still find it). */
  setDrawn(drawn: boolean): void;
  /** Screen position (CSS px) of the point above the target, for the prompt anchor. */
  screenAnchor(camera: Camera, viewport: { width: number; height: number }): { x: number; y: number };
  /** Height of its top over its feet (blocks): where a boss is hit, where its head is. */
  readonly height: number;
  /**
   * A boss fight's pose (duel/duel-poses.ts): while set, it turns to face the child and plays the pose instead of its
   * everyday behaviour; null gives it back its own ways. A new pose starts from its beginning.
   */
  duelPose(pose: DuelPose | null): void;
}

/** Clues bob gently until found so a child notices them. */
const BOB_HEIGHT = 0.12;
const BOB_SPEED = 2.2;
/** A clue built as a block model turns slowly in place (radians a second) until found, so it reads from every side. */
const SPIN_SPEED = 0.6;

/** Whether a target is a block-model prop (assets/generated/props) that spins in place until found. */
export function spinsInPlace(def: Pick<Interactable, 'model'>): boolean {
  return def.model?.startsWith('generated/props/') ?? false;
}
/** An open gate sinks into the ground over this many seconds. */
const GATE_OPEN_SECONDS = 1.2;
/** NPC clips blend into each other over this many seconds instead of snapping. */
const NPC_FADE_SECONDS = 0.3;
const NPC_CLIPS: readonly DuelClip[] = ['idle', 'walk', 'eat', 'dance', 'gesture-positive', 'gesture-negative'];
/** How fast a boss in a fight turns to face the child (share of the gap a second). */
const DUEL_TURN = 6;

/**
 * Plays the behaviour's clip on the model: each clip change cross-fades, and the idle loop starts at
 * a random phase and speed so two animals never move in step.
 */
/**
 * Model clips that play each NPC action: a Cube Pet animal has them under these names; a chibi character
 * from the character library (the player's rig) waves to greet, cheers for a dance and picks up to eat.
 */
const NPC_CLIP_NAMES: Readonly<Record<DuelClip, readonly string[]>> = {
  idle: ['idle'],
  walk: ['walk'],
  eat: ['eat', 'pick-up'],
  dance: ['dance', 'cheer'],
  'gesture-positive': ['gesture-positive', 'wave', 'emote-yes'],
  // Only a boss fight plays it (a taunt, a blow that lands): a Cube Pet's head shake, a blocky character's "no".
  'gesture-negative': ['gesture-negative', 'emote-no'],
};

function npcAnimator(mixer: AnimationMixer, clips: readonly AnimationClip[], random: () => number): { seconds: Partial<Record<NpcClip, number>>; play(clip: DuelClip): void } {
  const actions = new Map<DuelClip, AnimationAction>();
  const seconds: Partial<Record<DuelClip, number>> = {};
  for (const name of NPC_CLIPS) {
    const clip = NPC_CLIP_NAMES[name].map((n) => clips.find((c) => c.name === n)).find((c) => c !== undefined);
    if (!clip) continue;
    actions.set(name, mixer.clipAction(clip));
    seconds[name] = clip.duration;
  }
  const idle = actions.get('idle');
  if (idle) {
    idle.time = random() * (seconds.idle ?? 0);
    idle.timeScale = 0.9 + random() * 0.2;
    idle.play();
  }
  let current: DuelClip = 'idle';
  return {
    seconds,
    play(clip) {
      if (clip === current) return;
      const from = actions.get(current);
      const to = actions.get(clip);
      if (!to) return;
      to.reset().play();
      if (from) from.crossFadeTo(to, NPC_FADE_SECONDS, false);
      current = clip;
    },
  };
}

/**
 * Nearest available target whose radius contains the player, or null. The quest step's own target (`preferred`)
 * wins whenever she is within its radius, so a prop standing beside it never takes its prompt; next, the nearest
 * of the other things the step still takes (`stepTargets`: the clues of a search not found yet), so a character
 * standing beside the second clue never takes its prompt either. Pure: unit-tested.
 */
export function pickNearest<T extends { readonly available: boolean; readonly def: { id: string; position: readonly number[]; radius: number } }>(
  targets: readonly T[],
  player: { x: number; y: number; z: number },
  preferred: string | null = null,
  stepTargets: readonly string[] = [],
): T | null {
  let best: T | null = null;
  let bestDistance = Infinity;
  let bestOfStep: T | null = null;
  let bestOfStepDistance = Infinity;
  for (const target of targets) {
    if (!target.available) continue;
    const [x = 0, y = 0, z = 0] = target.def.position;
    const distance = Math.hypot(x - player.x, y - player.y, z - player.z);
    if (distance > target.def.radius) continue;
    if (preferred !== null && target.def.id === preferred) return target;
    if (distance < bestOfStepDistance && stepTargets.includes(target.def.id)) {
      bestOfStep = target;
      bestOfStepDistance = distance;
    }
    if (distance < bestDistance) {
      best = target;
      bestDistance = distance;
    }
  }
  return bestOfStep ?? best;
}

/** Envelope drawn in code (no pack has one): a thin box with a painted face, one draw call. */
function createLetter(): Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 88;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#fbf3df';
    ctx.fillRect(0, 0, 128, 88);
    ctx.strokeStyle = '#c9b48a';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(4, 6);
    ctx.lineTo(64, 50);
    ctx.lineTo(124, 6);
    ctx.stroke();
    ctx.fillStyle = '#d6454f'; // wax seal
    ctx.beginPath();
    ctx.arc(64, 50, 11, 0, Math.PI * 2);
    ctx.fill();
  }
  const face = new CanvasTexture(canvas);
  face.colorSpace = SRGBColorSpace;
  const letter = new Mesh(new BoxGeometry(0.6, 0.42, 0.04), new MeshLambertMaterial({ map: face }));
  letter.rotation.x = -0.35; // leaning back, face towards the path
  letter.position.y = 0.35;
  return letter;
}

async function buildVisual(
  loader: GuardedGltfLoader,
  def: Interactable,
  shadows: boolean,
): Promise<{ root: Object3D; mixer: AnimationMixer | null; clips: readonly AnimationClip[]; open: AnimationAction | null }> {
  if (def.model) {
    const gltf = await loader.load(def.model);
    // The loader shares one scene per model: each target gets its own copy, or a second calf or box of a
    // lesson would take the first one's model away (an object has one parent).
    const root = cloneModel(gltf.scene);
    root.scale.setScalar(def.scale ?? 1);
    // Every shadow caster is one more draw call (Master Plan §12): small clues cast none, and a
    // multi-part model (a Cube Pet has 6–7 parts) casts only from its largest part.
    const parts: Mesh[] = [];
    root.traverse((o) => {
      o.receiveShadow = shadows;
      if (o instanceof Mesh) parts.push(o);
    });
    const radius = (mesh: Mesh): number => {
      mesh.geometry.computeBoundingSphere();
      return mesh.geometry.boundingSphere?.radius ?? 0;
    };
    // A multi-part model becomes one skinned mesh (one draw call, one shadow); a single mesh stays as is.
    const merged = mergeParts(root, shadows && def.kind !== 'object');
    const largest = merged.length > 0 ? null : parts.reduce<Mesh | null>((best, mesh) => (!best || radius(mesh) > radius(best) ? mesh : best), null);
    if (largest) largest.castShadow = shadows && def.kind !== 'object';
    if (def.tint) tint(root, new Color(def.tint));
    if (gltf.animations.length === 0) return { root, mixer: null, clips: [], open: null };
    const mixer = new AnimationMixer(root);
    // Animal NPCs get their clips from npc-behavior; everything else loops its one clip.
    const idle = def.kind === 'npc' ? undefined : gltf.animations.find((a) => a.name === def.animation);
    if (idle) mixer.clipAction(idle).play();
    const openClip = def.kind === 'chest' ? gltf.animations.find((a) => a.name === 'open') : undefined;
    const open = openClip ? mixer.clipAction(openClip).setLoop(LoopOnce, 1) : null;
    if (open) open.clampWhenFinished = true;
    return { root, mixer, clips: gltf.animations, open };
  }
  const root = new Group();
  if (def.shape === 'letter') root.add(createLetter());
  if (def.board) root.add(await createRiddleBoard(def.board, shadows));
  return { root, mixer: null, clips: [], open: null };
}

/** Multiplies the model's own materials (copies: the loader shares them between targets) by `color`. */
function tint(root: Object3D, color: Color): void {
  root.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    const recolor = (m: Material): Material => {
      const copy = m.clone();
      if ('color' in copy && copy.color instanceof Color) copy.color.multiply(color);
      return copy;
    };
    o.material = Array.isArray(o.material) ? o.material.map(recolor) : recolor(o.material);
  });
}

/**
 * Targets as the child meets them: `{name}` in a name, a prompt's action or a painted board (the board before
 * the child's home, "Nhà của {name}") reads as the child's character name.
 */
export function namedForPlayer(targets: readonly Interactable[], playerName: string): Interactable[] {
  return targets.map((t) => ({
    ...t,
    name: fillPlayerName(t.name, playerName),
    label: fillPlayerName(t.label, playerName),
    ...(t.board ? { board: fillPlayerName(t.board, playerName) } : {}),
  }));
}

export async function loadInteractables(
  loader: GuardedGltfLoader,
  entities: WorldEntities,
  shadows: boolean,
): Promise<InteractableObject[]> {
  return Promise.all(
    entities.interactables.map(async (def): Promise<InteractableObject> => {
      const { root, mixer, clips, open } = await buildVisual(loader, def, shadows);
      const holder = new Group();
      holder.name = `interactable:${def.id}`;
      holder.position.set(...def.position);
      holder.rotation.y = (def.yaw * Math.PI) / 180;
      holder.add(root);
      // Label height from the visual's bounds; terrain-drawn targets (no visual) get a fixed height.
      holder.updateMatrixWorld(true);
      const bounds = new Box3().setFromObject(root);
      const labelHeight = bounds.isEmpty() ? 1.5 : bounds.max.y - def.position[1] + 0.3;

      const bobs = def.kind === 'object' && (def.model !== undefined || def.shape !== undefined);
      const spins = spinsInPlace(def);
      let npc: { behavior: NpcBehavior; play(clip: DuelClip): void } | null = null;
      if (def.kind === 'npc' && mixer) {
        const random = seededRandom(def.id);
        const animator = npcAnimator(mixer, clips, random);
        const behavior = new NpcBehavior({
          homeYaw: holder.rotation.y,
          noticeRadius: def.radius * 2,
          greetRadius: def.radius,
          clipSeconds: animator.seconds,
          random,
        });
        npc = { behavior, play: animator.play };
      }
      let state: TargetState | undefined;
      let present = true;
      let drawn = true;
      const show = (): void => {
        holder.visible = present && drawn && state !== 'hidden';
      };
      let time = 0;
      let gateSink = 0;
      /** The boss fight's pose and how long it has played (null: its own ways). */
      let duel: { pose: DuelPose; t: number } | null = null;
      /** The model's own lean and height, which a pose adds to and gives back. */
      const rest = { pitch: root.rotation.x, roll: root.rotation.z, lift: root.position.y };
      const anchor = new Vector3();
      return {
        def,
        root: holder,
        get available() {
          return present && state !== 'hidden';
        },
        update(dt, player) {
          time += dt;
          if (spins && state === undefined) holder.rotation.y += dt * SPIN_SPEED;
          if (duel) {
            // In a fight it faces the child and plays its pose; the everyday behaviour keeps turning to her meanwhile,
            // so nothing snaps when the fight ends.
            duel.t += dt;
            const dx = player.x - holder.position.x;
            const dz = player.z - holder.position.z;
            npc?.behavior.step(dt, { dx, dz });
            holder.rotation.y += angleDelta(holder.rotation.y, Math.atan2(dx, dz)) * Math.min(1, dt * DUEL_TURN);
            const frame = duelPoseFrame(duel.pose, duel.t);
            root.rotation.x = rest.pitch + frame.pitch;
            root.rotation.z = rest.roll + frame.roll;
            root.position.y = rest.lift + frame.lift;
            npc?.play(frame.clip);
          } else if (npc && holder.visible) {
            const frame = npc.behavior.step(dt, { dx: player.x - holder.position.x, dz: player.z - holder.position.z });
            holder.rotation.y = frame.yaw;
            npc.play(frame.clip);
          }
          mixer?.update(dt);
          if (bobs) root.position.y = state === undefined ? (Math.sin(time * BOB_SPEED) * 0.5 + 0.5) * BOB_HEIGHT : 0;
          if (def.kind === 'gate' && state === 'open' && gateSink < 1) {
            gateSink = Math.min(1, gateSink + dt / GATE_OPEN_SECONDS);
            root.position.y = -gateSink * (bounds.max.y - bounds.min.y);
          }
        },
        setState(next) {
          if (next === state) return;
          state = next;
          show();
          if (next === 'open') open?.reset().play();
        },
        setPresent(next) {
          present = next;
          show();
        },
        setDrawn(next) {
          if (next === drawn) return;
          drawn = next;
          show();
        },
        height: labelHeight - 0.3,
        duelPose(pose) {
          if (pose === null) {
            if (!duel) return;
            duel = null;
            root.rotation.x = rest.pitch;
            root.rotation.z = rest.roll;
            root.position.y = rest.lift;
            npc?.play('idle');
            return;
          }
          duel = { pose, t: 0 };
        },
        screenAnchor(camera, viewport) {
          anchor.copy(holder.position).setY(holder.position.y + labelHeight).project(camera);
          return { x: ((anchor.x + 1) / 2) * viewport.width, y: ((1 - anchor.y) / 2) * viewport.height };
        },
      };
    }),
  );
}
