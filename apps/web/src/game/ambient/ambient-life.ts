// Life around the map (`ambients` in entities.json): villagers at their chores and animals going
// about their day, each driven by an AmbientActor. Only the nearest few are drawn and run (the rest
// are hidden and frozen) so the draw-call budget holds; villagers answer each other; the child can
// tap one to chat or pet it. Nothing here talks to the server: ambient life never rewards anything.
import { AnimationMixer, Box3, BoxGeometry, Group, Mesh, MeshLambertMaterial, Vector3, type AnimationAction, type AnimationClip, type Camera, type Object3D, type SkinnedMesh } from 'three';
import { freshPicker, type FreshPicker } from '@miu/quest/pick-fresh';
import type { Ambient } from '@miu/voxel/world-entities';
import type { GuardedGltfLoader } from '../asset-loader';
import { seededRandom } from '../entities/seeded-random';
import { AmbientActor, type ActorContext } from './ambient-actor';
import { AMBIENT_LINES } from './ambient-lines';
import { applyPose, applyWings, findPoseParts, resetPose, type PoseParts } from './ambient-poses';
import { ROUTINES } from './ambient-routines';
import { mergeParts } from './merge-parts';
import type { Vec3 } from './ambient-types';
import { createSpeechBubble } from './speech-bubble';

/** Drawn and running at once, by quality level (the rest wait, hidden, until the child comes closer). */
export const AMBIENT_LIMIT: Readonly<Record<string, number>> = { low: 6, mid: 9, high: 12 };
/**
 * Whatever the quality, the frame stays under the draw-call budget (Master Plan §12: 150): when the
 * last frame came close, the farthest characters leave first, and come back once there is room.
 */
const CALL_CEILING = 144;
/** Beyond this distance nobody is drawn, however few are near. */
const DRAW_RADIUS = 36;
/** Models of those further than this are let go (built again on return); those this near the start are built before the first frame. */
const RELEASE_RADIUS = 120;
const PRELOAD_RADIUS = 80;
/** Where the tap prompt floats over a character whose model is not built yet. */
const DEFAULT_LABEL_HEIGHT = 2.4;
/** How often the nearest set is chosen again (s). */
const RESELECT_SECONDS = 0.5;
/** Bubbles only show when the child is this close: nobody talks to an empty forest. */
const HEAR_RADIUS = 16;
/** A villager within this distance may answer another; the answer comes after a short pause. */
const ANSWER_RADIUS = 7;
const ANSWER_DELAY = 1.6;
/** An animal visit picks an animal this close (blocks), and stops this far from the child. */
const VISIT_RADIUS = 14;
const VISIT_STOP = 1.6;
const VISIT_SECONDS = 6;
/** How long cheering bubbles may show even beside a quest target (seconds). */
const CHEER_SECONDS = 4;
const CLIP_FADE = 0.25;
/** Length of each held item in the model's own units (a Blocky character is 2.7 tall). */
const HELD_LENGTH: Readonly<Record<string, number>> = { axe: 1.7, hoe: 2, bucket: 0.8, wood: 1, fish: 0.9, carrot: 0.7, spoon: 1 };
/** Hand of a Blocky character, in the right arm's own frame. */
const HAND: Vec3 = [-0.2, -0.95, 0.05];
/** Held items built in code because no pack has one. */
const BUILT_ROD = 'built:fishing-rod';

export interface AmbientTarget {
  readonly id: string;
  readonly name: string;
  readonly label: string;
  /** Live position (the character walks). */
  readonly position: readonly number[];
  readonly radius: number;
  readonly available: boolean;
  /** Height of the prompt above its feet. */
  readonly labelHeight: number;
}

export interface AmbientLife {
  readonly group: Group;
  /**
   * `questPrompt`: a quest prompt is up, so ambient bubbles stay hidden (except while cheering a finished
   * quest). `lastFrameCalls`: draw calls of the previous frame, which keeps the cast within the budget.
   */
  update(dt: number, player: { x: number; y: number; z: number }, questPrompt: boolean, lastFrameCalls: number): void;
  /** The tappable ambient character within reach of the child, nearest first, or null. */
  nearest(player: { x: number; y: number; z: number }): AmbientTarget | null;
  /** The child tapped it: it chats or does a trick. */
  react(id: string): boolean;
  /** Surprise: the nearest drawn animal runs over to the child, says hello and runs home. Returns its name, or null when none can. */
  visit(player: { x: number; y: number; z: number }): string | null;
  /** The child finished a quest: everyone near them cheers (their bubbles show even next to a quest target). Returns how many joined in. */
  celebrate(player: { x: number; y: number; z: number }): number;
  /** Screen position (CSS px) above the character, for the prompt anchor. */
  screenAnchor(target: AmbientTarget, camera: Camera, viewport: { width: number; height: number }): { x: number; y: number };
  readonly stats: { visible: number; reactions: number; celebrations: number; lastLine: string | null };
}

export interface AmbientOptions {
  quality: string;
  shadows: boolean;
  reduced: boolean;
  playerName: string;
  /** Standing height over a column, searched near `nearY` so a walker never lands on a canopy. */
  ground(x: number, z: number, nearY: number): number;
  /** Where the child starts (x, z): the characters round it are built before the first frame. */
  start?: readonly [number, number];
}

interface Visual {
  root: Object3D;
  mixer: AnimationMixer | null;
  clips: Map<string, AnimationAction>;
  parts: PoseParts;
  held: Object3D[];
  labelHeight: number;
}

function buildRod(): Object3D {
  const rod = new Group();
  const pole = new Mesh(new BoxGeometry(0.07, 2.6, 0.07), new MeshLambertMaterial({ color: '#8a5a2b' }));
  pole.position.y = 1.3;
  const line = new Mesh(new BoxGeometry(0.02, 1.4, 0.02), new MeshLambertMaterial({ color: '#f4f1e8' }));
  line.position.set(0, 2.6, 0.7);
  line.rotation.x = Math.PI / 2;
  rod.add(pole, line);
  return rod;
}

function heldKind(model: string): string {
  const file = model.split('/').pop() ?? model;
  return Object.keys(HELD_LENGTH).find((key) => file.includes(key)) ?? 'wood';
}

async function buildHeld(loader: GuardedGltfLoader, model: string): Promise<Object3D> {
  if (model === BUILT_ROD) return buildRod();
  const item = (await loader.load(model)).scene.clone(true);
  const size = new Box3().setFromObject(item).getSize(new Vector3());
  item.scale.setScalar((HELD_LENGTH[heldKind(model)] ?? 1) / Math.max(size.x, size.y, size.z, 1e-3));
  return item;
}

async function buildVisual(loader: GuardedGltfLoader, def: Ambient, shadows: boolean): Promise<Visual> {
  const gltf = await loader.load(def.model);
  // The loader shares one scene per model; several bunnies need their own copies (node animation, no skins).
  const model = gltf.scene.clone(true);
  model.scale.setScalar(def.scale);
  // Bounds before the parts leave the render layer (the merged skin has no static bounds).
  const bounds = new Box3().setFromObject(model);
  mergeParts(model, shadows);
  const parts = findPoseParts(model);
  const held: Object3D[] = [];
  for (const item of def.held ?? []) {
    const object = await buildHeld(loader, item);
    object.position.set(...HAND);
    // The handle in the fist, pointing forward and down: carried at rest, leading the swing when the arm rises.
    object.rotation.x = 2.2;
    object.visible = false;
    parts.armRight?.add(object);
    held.push(object);
  }
  const root = new Group();
  root.rotation.order = 'YXZ';
  root.add(model);
  const labelHeight = bounds.isEmpty() ? 1.5 : bounds.max.y + 0.25;
  const clips = new Map<string, AnimationAction>();
  const mixer = gltf.animations.length > 0 ? new AnimationMixer(model) : null;
  if (mixer) for (const clip of gltf.animations as AnimationClip[]) clips.set(clip.name, mixer.clipAction(clip));
  return { root, mixer, clips, parts, held, labelHeight };
}

export async function loadAmbientLife(loader: GuardedGltfLoader, ambients: readonly Ambient[], options: AmbientOptions): Promise<AmbientLife> {
  const group = new Group();
  group.name = 'ambient-life';
  const limit = AMBIENT_LIMIT[options.quality] ?? AMBIENT_LIMIT.low ?? 6;
  const stats = { visible: 0, reactions: 0, celebrations: 0, lastLine: null as string | null };
  /** Seconds the celebration still lets bubbles show next to a quest target. */
  let cheering = 0;

  // Every villager and animal has its actor from the start (cheap); its model is built only once the child
  // comes near (the nearest few draw at a time anyway) and let go again when far behind, so a map with
  // hundreds of them round its outer land costs no more than the few in view.
  const members = ambients.map((def) => {
    const spec = ROUTINES[def.routine];
    const random = seededRandom(def.id);
    // Its own copy of the spots: a visit adds one next to the child.
    const actor = new AmbientActor(def.id, spec, def.position, (def.yaw * Math.PI) / 180, { ...def.spots }, random);
    const bubble = createSpeechBubble();
    const pickers = new Map<string, FreshPicker<string>>();
    const line = (pool: string): string | null => {
      const lines = AMBIENT_LINES[pool];
      if (!lines?.length) return null;
      let picker = pickers.get(pool);
      if (!picker) pickers.set(pool, (picker = freshPicker(lines, random)));
      return picker.next().replaceAll('{name}', options.playerName);
    };
    const target: AmbientTarget & { position: number[]; available: boolean; labelHeight: number } = {
      id: def.id,
      name: def.name,
      label: spec.label,
      position: [...def.position],
      radius: spec.reach,
      available: false,
      labelHeight: DEFAULT_LABEL_HEIGHT,
    };
    const member = {
      def,
      spec,
      actor,
      visual: null as Visual | null,
      building: null as Promise<void> | null,
      bubble,
      line,
      context: null as unknown as { -readonly [K in keyof ActorContext]: ActorContext[K] },
      target,
      current: '',
      time: random() * 10,
      active: false,
    };
    member.context = {
      player: null,
      reduced: options.reduced,
      groundY: (x, z) => options.ground(x, z, actor.position[1]),
      clipSeconds: (clip) => member.visual?.clips.get(clip)?.getClip().duration ?? 0,
    };
    return member;
  });
  type Member = (typeof members)[number];

  /** Builds a member's model (once at a time); it joins the scene hidden, the next selection shows it. */
  const ensureVisual = (member: Member): Promise<void> => {
    if (member.visual) return Promise.resolve();
    member.building ??= buildVisual(loader, member.def, options.shadows).then((visual) => {
      member.building = null;
      visual.root.visible = false;
      member.bubble.sprite.position.y = visual.labelHeight;
      visual.root.add(member.bubble.sprite);
      member.target.labelHeight = visual.labelHeight + 0.9; // above the speech bubble's tail
      member.current = '';
      group.add(visual.root);
      member.visual = visual;
    });
    return member.building;
  };
  /** Lets a far member's model go (its merged skin is its own; the pack's meshes stay cached). */
  const releaseVisual = (member: Member): void => {
    const visual = member.visual;
    if (!visual) return;
    member.visual = null;
    visual.root.remove(member.bubble.sprite);
    group.remove(visual.root);
    visual.mixer?.stopAllAction();
    visual.root.traverse((o) => {
      if ((o as SkinnedMesh).isSkinnedMesh) (o as SkinnedMesh).geometry.dispose();
    });
  };
  // Those round the child at the start are ready before the first frame.
  if (options.start) {
    const [sx, sz] = options.start;
    await Promise.all(members.filter((m) => Math.hypot(m.def.position[0] - sx, m.def.position[2] - sz) <= PRELOAD_RADIUS).map(ensureVisual));
  }

  const play = (member: Member, clip: string, speed: number): void => {
    if (!member.visual) return;
    const { clips } = member.visual;
    const next = clips.get(clip) ?? clips.get('idle');
    if (!next) return;
    next.timeScale = speed;
    if (member.current === clip) return;
    const from = clips.get(member.current);
    next.reset().play();
    if (from && from !== next) from.crossFadeTo(next, CLIP_FADE, false);
    member.current = clip;
  };

  const replies: Array<{ member: Member; pool: string; from: Vec3; left: number }> = [];
  let reselect = 0;
  /** How many may be drawn now: the quality's limit, less whatever the budget cannot afford. */
  let allowed = limit;
  const anchor = new Vector3();

  const say = (member: Member, pool: string, player: { x: number; y: number; z: number }, quiet: boolean): void => {
    const [x, y, z] = member.actor.position;
    if (quiet || Math.hypot(player.x - x, player.y - y, player.z - z) > HEAR_RADIUS) return;
    const text = member.line(pool);
    if (!text) return;
    member.bubble.show(text);
    stats.lastLine = text;
  };

  return {
    group,
    stats,
    update(dt, player, questPrompt, lastFrameCalls) {
      cheering = Math.max(0, cheering - dt);
      const quiet = questPrompt && cheering <= 0;
      reselect -= dt;
      if (reselect <= 0) {
        reselect = RESELECT_SECONDS;
        if (lastFrameCalls > CALL_CEILING) allowed = Math.max(0, stats.visible - Math.ceil((lastFrameCalls - CALL_CEILING) / 2));
        else if (lastFrameCalls < CALL_CEILING - 6) allowed = Math.min(limit, allowed + 1);
        const near: Array<{ m: Member; d: number }> = [];
        for (const m of members) {
          const d = Math.hypot(player.x - m.actor.position[0], player.z - m.actor.position[2]);
          if (d <= DRAW_RADIUS) near.push({ m, d });
          // Far behind: its model goes; it is built again if the child comes back.
          else if (d > RELEASE_RADIUS && m.visual) releaseVisual(m);
        }
        const ranked = near.sort((a, b) => a.d - b.d).slice(0, allowed);
        const chosen = new Set<Member>();
        for (const { m } of ranked) {
          // A model still on its way joins at the next selection.
          if (m.visual) chosen.add(m);
          else void ensureVisual(m);
        }
        for (const m of members) {
          m.active = chosen.has(m);
          if (!m.active) {
            if (m.visual) m.visual.root.visible = false;
            m.target.available = false;
          }
        }
        stats.visible = chosen.size;
      }
      if (quiet) for (const m of members) m.bubble.hide();

      for (const m of members) {
        if (!m.active || !m.visual) continue;
        m.time += dt;
        m.context.player = player;
        const { frame, speech } = m.actor.step(dt, m.context);
        const { root, parts, held, mixer } = m.visual;
        root.visible = frame.visible;
        root.position.set(...frame.position);
        root.rotation.y = frame.yaw;
        root.rotation.x = -frame.pitch;
        play(m, frame.clip, frame.clipSpeed);
        resetPose(parts);
        mixer?.update(dt);
        applyPose(parts, frame.pose, frame.poseTime);
        applyWings(parts, frame.wings, m.time);
        // A bee bobs as it hovers.
        if (frame.wings === 'buzz') root.position.y += Math.sin(m.time * 6) * 0.08;
        held.forEach((item, i) => (item.visible = frame.held === i));
        m.target.position[0] = frame.position[0];
        m.target.position[1] = frame.position[1];
        m.target.position[2] = frame.position[2];
        m.target.available = frame.visible && m.actor.canReact;
        if (speech) {
          say(m, speech.pool, player, quiet);
          if (speech.reply) {
            const reply = speech.reply;
            const neighbour = members
              .filter((o) => o !== m && o.active && o.spec.kind === 'person')
              .map((o) => ({ o, d: Math.hypot(o.actor.position[0] - frame.position[0], o.actor.position[2] - frame.position[2]) }))
              .filter(({ d }) => d <= ANSWER_RADIUS)
              .sort((a, b) => a.d - b.d)[0]?.o;
            if (neighbour) replies.push({ member: neighbour, pool: reply, from: frame.position, left: ANSWER_DELAY });
          }
        }
        m.bubble.update(dt);
      }
      for (let i = replies.length - 1; i >= 0; i--) {
        const reply = replies[i];
        if (!reply) continue;
        reply.left -= dt;
        if (reply.left > 0) continue;
        replies.splice(i, 1);
        reply.member.actor.answer(reply.pool, reply.from);
      }
    },
    nearest(player) {
      let best: AmbientTarget | null = null;
      let bestDistance = Infinity;
      for (const { target } of members) {
        if (!target.available || target.radius <= 0) continue;
        const [x = 0, y = 0, z = 0] = target.position;
        const d = Math.hypot(x - player.x, y - player.y, z - player.z);
        if (d <= target.radius && d < bestDistance) {
          best = target;
          bestDistance = d;
        }
      }
      return best;
    },
    screenAnchor(target, camera, viewport) {
      const [x = 0, y = 0, z = 0] = target.position;
      anchor.set(x, y + target.labelHeight, z).project(camera);
      return { x: ((anchor.x + 1) / 2) * viewport.width, y: ((1 - anchor.y) / 2) * viewport.height };
    },
    react(id) {
      const member = members.find((m) => m.def.id === id);
      if (!member?.actor.react()) return false;
      stats.reactions++;
      return true;
    },
    visit(player) {
      const animal = members
        .filter((m) => m.active && m.spec.kind === 'animal')
        .map((m) => ({ m, d: Math.hypot(player.x - m.actor.position[0], player.z - m.actor.position[2]) }))
        .filter(({ d }) => d > VISIT_STOP && d <= VISIT_RADIUS)
        .sort((a, b) => a.d - b.d)[0];
      if (!animal) return null;
      // Stop a little short of the child, on its side.
      const [ax, , az] = animal.m.actor.position;
      const k = VISIT_STOP / animal.d;
      const at: Vec3 = [player.x + (ax - player.x) * k, player.y, player.z + (az - player.z) * k];
      if (!animal.m.actor.visit(at)) return null;
      cheering = Math.max(cheering, VISIT_SECONDS); // its hello shows even beside a quest target
      return animal.m.def.name;
    },
    celebrate(player) {
      let joined = 0;
      for (const m of members) {
        const [x, , z] = m.actor.position;
        // Everyone drawn around the child joins in, wherever the quest ends.
        if (Math.hypot(player.x - x, player.z - z) <= DRAW_RADIUS && m.actor.celebrate(options.reduced)) joined++;
      }
      cheering = CHEER_SECONDS;
      stats.celebrations += joined;
      return joined;
    },
  };
}
