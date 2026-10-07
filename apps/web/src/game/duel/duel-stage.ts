// A boss fight played out in the running world (React asks with `duel-open`, game-bridge): the child faces the boss,
// the camera frames them both above the question card, her controls rest. Each blow she lets go of (`aim`) leaves
// her hand as a star and waits by the answer she picked until the server's word comes back: it lands on the boss
// (sparks, a stagger), bounces off harmlessly (the boss answers with bubbles, she ducks, the view shakes a little),
// fizzles (no answer came back), or wins the fight (the boss bows out). Everything is drawn with the map's particle
// layer (two draw calls whatever happens) and the boss's own clips: the stage adds no mesh. When there is no boss on
// screen, no place to stand by it or a wall in the way, the fight is `unavailable` and React shows it as a card.
//
// Per frame it writes where the boss and the child's hand are on screen into the anchors React registered
// (`--duel-x`, `--duel-y` in CSS px): the answers React draws round the boss follow it without a React render.
import { Vector3, type PerspectiveCamera } from 'three';
import { raycastGrid, type SolidAt } from '@miu/voxel/grid-collision';
import type { DuelAnchors, DuelOutcome, DuelState } from '../../game-bridge/game-store';
import type { ParticleSpawn } from '../interact/effect-particles';
import type { CameraView } from '../player/camera-rig';
import { seededRandom } from '../entities/seeded-random';
import { DUEL_POSE_SECONDS, type DuelPose } from './duel-poses';
import { frameDuel } from './duel-camera';

type Point = readonly [number, number, number];

/** What the stage needs of a boss (an InteractableObject). */
export interface DuelBoss {
  readonly def: { readonly id: string; readonly position: readonly number[]; readonly radius: number };
  readonly available: boolean;
  readonly height: number;
  duelPose(pose: DuelPose | null): void;
}

export interface DuelStageDeps {
  camera: PerspectiveCamera;
  viewport(): { width: number; height: number };
  /** The game is up and drawing (a fight asked for before that is a card). */
  ready(): boolean;
  findBoss(targetId: string): DuelBoss | null;
  /** Open ground beside the boss within its reach, or none. */
  standSpot(boss: DuelBoss): Point | null;
  /** The child (her controller): where her feet are and the way she faces. */
  player: { readonly position: Vector3; facing: number };
  /** Puts her down at a spot facing that way (a fight reopened far from its boss). */
  place(spot: Point, facing: number): void;
  solid: SolidAt;
  /** The camera's set view (null: back behind her, the follow view's yaw `behind`), eased or at once. */
  view(view: CameraView | null, snap: boolean, behind: number): void;
  shake(seconds: number, size: number): void;
  /** One of her gestures (player-actions.ts) for some seconds. */
  act(action: 'throw' | 'dodge' | 'cheer', seconds: number): void;
  spawn(particle: ParticleSpawn): void;
  anchors(): DuelAnchors | null;
  emit(state: DuelState): void;
  /** Her stick and buttons (and an autowalk under way) shown and working, or put away for the fight. */
  controls(on: boolean): void;
}

/** A star in the air: from her hand to the answer, waiting there, then on to the boss (or bounced). */
interface Shot {
  from: Vector3;
  hover: Vector3;
  phase: 'flying' | 'hovering' | 'striking';
  t: number;
  /** The server's word, once it came (resolved when the star has reached the answer). */
  outcome: DuelOutcome | null;
}

/** Seconds a star takes from her hand to the answer, and from there into the boss. */
const FLIGHT_S = 0.45;
const STRIKE_S = 0.25;
/** How high the throw arcs over the straight line (blocks). */
const ARC = 1.2;
/** The point the boss is hit at: this share of its height up. */
const CHEST = 0.55;
/** Seconds between taunts while it waits: 4 to 7. */
const TAUNT_MIN_S = 4;
const TAUNT_SPREAD_S = 3;
/** The farthest a waiting star stands from the boss's chest (blocks). */
const HOVER_REACH = 1.6;
/** Anchors move only when the spot moved this far (CSS px): no style writes while nothing moves. */
const ANCHOR_STEP = 0.5;
/** Less motion: the most sparks one blow makes. */
export const CALM_SPARKS = 8;

const GOLD = '#ffd54a';
const BUBBLE = '#bfe8ff';

export class DuelStage {
  private boss: DuelBoss | null = null;
  private calm = false;
  private state: DuelState = null;
  private pose: DuelPose = 'wait';
  private poseLeft = Infinity;
  private tauntIn = TAUNT_MIN_S;
  private random: () => number = Math.random;
  private shot: Shot | null = null;
  private readonly at = new Vector3();
  /** Scratch points reused each frame (no allocation per frame). */
  private readonly chest = new Vector3();
  private readonly spot = new Vector3();
  private readonly written = new WeakMap<HTMLElement, { x: number; y: number }>();

  constructor(private readonly deps: DuelStageDeps) {}

  /** A fight is set up in the world (the child's controls rest meanwhile). */
  get active(): boolean {
    return this.state === 'staged';
  }

  get stage(): DuelState {
    return this.state;
  }

  open(targetId: string, calm: boolean): void {
    if (this.state !== null) this.close();
    this.calm = calm;
    const boss = this.deps.ready() ? this.deps.findBoss(targetId) : null;
    const staged = boss?.available ? this.stageAt(boss) : false;
    this.state = staged ? 'staged' : 'unavailable';
    this.deps.emit(this.state);
  }

  /** Sets the fight up by the boss: false when there is no place for her or no clear view of the two. */
  private stageAt(boss: DuelBoss): boolean {
    const { player } = this.deps;
    const [bx = 0, by = 0, bz = 0] = boss.def.position;
    const here: Point = [player.position.x, player.position.y, player.position.z];
    const near = Math.hypot(here[0] - bx, here[1] - by, here[2] - bz) <= boss.def.radius;
    const spot = near ? here : this.deps.standSpot(boss);
    if (!spot) return false;
    const view = this.clearView(spot, boss);
    if (!view) return false;
    const facing = Math.atan2(bx - spot[0], bz - spot[2]);
    if (!near) this.deps.place(spot, facing);
    player.facing = facing;
    this.boss = boss;
    this.random = seededRandom(boss.def.id);
    this.setPose('wait');
    this.deps.controls(false);
    this.deps.view(view, this.calm, facing + Math.PI);
    if (!near) this.burst([spot[0], spot[1] + 0.6, spot[2]], 'sparkle', this.calm ? 4 : 10, 1.2);
    return true;
  }

  /** A framing of her and the boss with nothing solid between the camera and either of them, trying both sides. */
  private clearView(spot: Point, boss: DuelBoss): CameraView | null {
    const { camera, solid } = this.deps;
    const [bx = 0, by = 0, bz = 0] = boss.def.position;
    const heads = [new Vector3(spot[0], spot[1] + 1.2, spot[2]), new Vector3(bx, by + boss.height * CHEST, bz)];
    for (const side of [1, -1] as const) {
      const view = frameDuel({ player: spot, boss: [bx, by, bz], bossHeight: boss.height, aspect: camera.aspect, fov: camera.fov, side });
      if (!view.fits) continue;
      if (heads.every((head) => clearLine(view.position, head, solid))) return { position: view.position, target: view.target };
    }
    return null;
  }

  cue(cue: 'aim', to: { x: number; y: number }): void;
  cue(cue: DuelOutcome): void;
  cue(cue: 'aim' | DuelOutcome, to?: { x: number; y: number }): void {
    if (!this.active || !this.boss) return;
    if (cue === 'aim') {
      this.aim(to ?? { x: 0, y: 0 });
      return;
    }
    if (cue === 'ally-hit') {
      // A party member's blow: sparks rain down on the boss from above.
      const top = this.bossPoint(1);
      top.y += 2;
      for (let i = 0; i < (this.calm ? 5 : 12); i++) {
        this.deps.spawn({ shape: i % 2 ? 'sparkle' : 'star', at: [top.x + this.jitter(0.8), top.y, top.z + this.jitter(0.8)], velocity: [0, -1, 0], gravity: 3, life: 0.9, size: [0.3, 0.15], color: GOLD });
      }
      this.setPose('hit');
      return;
    }
    if (this.shot) {
      this.shot.outcome = cue;
      if (this.shot.phase === 'hovering') this.resolve(this.shot);
      return;
    }
    // No star in the air (less motion, or the word came without a throw): the outcome plays at the boss.
    this.land(cue, this.bossPoint(CHEST));
  }

  /** The screen changed shape (a phone turned, a window resized): the camera frames the two again, at once. */
  readonly reframe = (): void => {
    if (!this.active || !this.boss) return;
    const p = this.deps.player.position;
    const view = this.clearView([p.x, p.y, p.z], this.boss);
    if (view) this.deps.view(view, true, this.deps.player.facing + Math.PI);
  };

  close(): void {
    if (this.state === null) return;
    const wasStaged = this.state === 'staged';
    this.state = null;
    this.shot = null;
    this.boss?.duelPose(null);
    this.boss = null;
    if (wasStaged) {
      this.deps.controls(true);
      this.deps.view(null, this.calm, this.deps.player.facing + Math.PI);
    }
    this.deps.emit(null);
  }

  update(dt: number): void {
    if (!this.active || !this.boss) return;
    this.poseLeft -= dt;
    if (this.poseLeft <= 0) this.setPose('wait');
    if (this.pose === 'wait' && !this.shot) {
      this.tauntIn -= dt;
      if (this.tauntIn <= 0) this.setPose('taunt');
    }
    if (this.shot) this.fly(this.shot, dt);
    this.writeAnchors();
  }

  private setPose(pose: DuelPose): void {
    this.pose = pose;
    this.poseLeft = DUEL_POSE_SECONDS[pose];
    if (pose === 'wait' || pose === 'taunt') this.tauntIn = TAUNT_MIN_S + this.random() * TAUNT_SPREAD_S;
    this.boss?.duelPose(pose);
  }

  private aim(to: { x: number; y: number }): void {
    const hover = this.hoverPoint(to);
    this.deps.act('throw', 0.6);
    if (this.calm) {
      // Less motion: no flight, the star simply shows by the answer and waits.
      this.shot = { from: hover.clone(), hover, phase: 'hovering', t: 0, outcome: null };
      this.deps.spawn({ shape: 'star', at: [hover.x, hover.y, hover.z], velocity: [0, 0, 0], life: 0.6, size: [0.45, 0.4], color: GOLD });
      return;
    }
    const p = this.deps.player.position;
    const right = this.deps.player.facing - Math.PI / 2;
    const from = new Vector3(p.x + Math.sin(right) * 0.3, p.y + 1.1, p.z + Math.cos(right) * 0.3);
    this.shot = { from, hover, phase: 'flying', t: 0, outcome: null };
  }

  private fly(shot: Shot, dt: number): void {
    shot.t += dt;
    if (shot.phase === 'flying') {
      const k = Math.min(1, shot.t / FLIGHT_S);
      this.at.lerpVectors(shot.from, shot.hover, k);
      this.at.y += Math.sin(k * Math.PI) * ARC;
      this.trail();
      if (k >= 1) {
        shot.phase = 'hovering';
        shot.t = 0;
        if (shot.outcome) this.resolve(shot);
      }
      return;
    }
    if (shot.phase === 'hovering') {
      if (this.calm) return;
      // Waiting for the server's word: it circles the answer.
      this.at.set(shot.hover.x + Math.cos(shot.t * 6) * 0.15, shot.hover.y + Math.sin(shot.t * 9) * 0.08, shot.hover.z + Math.sin(shot.t * 6) * 0.15);
      this.trail();
      return;
    }
    const k = Math.min(1, shot.t / STRIKE_S);
    this.at.lerpVectors(shot.hover, this.bossPoint(CHEST, this.chest), k);
    this.trail();
    if (k >= 1) {
      this.shot = null;
      this.land(shot.outcome ?? 'hit', this.bossPoint(CHEST));
    }
  }

  /** The star at `at` this frame, with a short sparkling tail. */
  private trail(): void {
    const { x, y, z } = this.at;
    this.deps.spawn({ shape: 'star', at: [x, y, z], velocity: [0, 0, 0], life: 0.18, size: [0.5, 0.3], color: GOLD });
    this.deps.spawn({ shape: 'sparkle', at: [x, y, z], velocity: [this.jitter(0.4), this.jitter(0.4), this.jitter(0.4)], life: 0.35, size: [0.18, 0.05], color: GOLD });
  }

  private resolve(shot: Shot): void {
    const outcome = shot.outcome ?? 'fizzle';
    if ((outcome === 'hit' || outcome === 'win') && !this.calm) {
      shot.phase = 'striking';
      shot.t = 0;
      return;
    }
    this.shot = null;
    this.land(outcome, shot.hover);
  }

  /** What a blow does once it gets there: `at` is where the star is (the boss's chest for a blow that lands). */
  private land(outcome: DuelOutcome, at: Vector3): void {
    const point: Point = [at.x, at.y, at.z];
    switch (outcome) {
      case 'hit':
      case 'win':
        // Less motion: the star shown by the answer, these sparks and the halo make the blow's eight.
        this.burst(point, 'star', this.calm ? CALM_SPARKS - 2 : 20, 3);
        this.deps.spawn({ shape: 'halo', at: point, velocity: [0, 0, 0], life: 0.3, size: [1.2, 1.8], alpha: 0.8 });
        this.setPose(outcome === 'win' ? 'lose' : 'hit');
        if (outcome === 'win') this.deps.act('cheer', 2);
        return;
      case 'miss': {
        // It bounces off harmlessly; the boss answers with a few bubbles toward her, she ducks.
        if (!this.calm) this.deps.spawn({ shape: 'star', at: point, velocity: [this.jitter(1), 3, this.jitter(1)], gravity: 6, life: 0.9, size: [0.4, 0.3], color: GOLD });
        const chest = this.bossPoint(CHEST);
        const p = this.deps.player.position;
        const toward = new Vector3(p.x - chest.x, p.y + 1 - chest.y, p.z - chest.z).normalize().multiplyScalar(1.6);
        for (let i = 0; i < (this.calm ? 4 : 8); i++) {
          this.deps.spawn({ shape: 'bubble', at: [chest.x, chest.y, chest.z], velocity: [toward.x + this.jitter(0.5), toward.y + this.jitter(0.4), toward.z + this.jitter(0.5)], life: 1.2, size: [0.25, 0.35], color: BUBBLE, sway: 0.3 });
        }
        this.setPose('counter');
        this.deps.act('dodge', 0.6);
        if (!this.calm) this.deps.shake(0.15, 0.05);
        return;
      }
      case 'fizzle':
      case 'ally-hit':
        this.burst(point, 'puff', this.calm ? 3 : 6, 0.8);
        return;
    }
  }

  private burst(at: Point, shape: ParticleSpawn['shape'], count: number, speed: number): void {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      this.deps.spawn({
        shape: i % 3 === 2 && shape === 'star' ? 'sparkle' : shape,
        at,
        velocity: [Math.cos(a) * speed, speed * 0.5 + this.jitter(speed * 0.3), Math.sin(a) * speed],
        gravity: shape === 'puff' ? 0 : 4,
        life: 0.7,
        size: shape === 'puff' ? [0.3, 0.7] : [0.3, 0.12],
        color: shape === 'puff' ? undefined : GOLD,
        alpha: shape === 'puff' ? 0.6 : 1,
      });
    }
  }

  /** A point on the boss: `share` of its height up (written into `into` when given, else a new vector). */
  private bossPoint(share: number, into = new Vector3()): Vector3 {
    const [x = 0, y = 0, z = 0] = this.boss?.def.position ?? [];
    return into.set(x, y + (this.boss?.height ?? 1) * share, z);
  }

  /**
   * Where the star waits for the answer at screen point `to`: on the upright plane through the boss's chest, facing
   * her, within reach of the boss (a point off that plane, or behind the camera, falls back to just before the boss).
   */
  private hoverPoint(to: { x: number; y: number }): Vector3 {
    const { camera } = this.deps;
    const { width, height } = this.deps.viewport();
    const chest = this.bossPoint(CHEST);
    const p = this.deps.player.position;
    const normal = new Vector3(p.x - chest.x, 0, p.z - chest.z);
    if (normal.lengthSq() < 1e-6) normal.set(0, 0, 1);
    normal.normalize();
    const fallback = chest.clone().addScaledVector(normal, 0.6);
    if (width <= 0 || height <= 0) return fallback;
    const ray = new Vector3((to.x / width) * 2 - 1, 1 - (to.y / height) * 2, 0.5).unproject(camera).sub(camera.position).normalize();
    const facing = ray.dot(normal);
    if (Math.abs(facing) < 1e-4) return fallback;
    const t = chest.clone().sub(camera.position).dot(normal) / facing;
    if (t <= 0) return fallback;
    const hit = camera.position.clone().addScaledVector(ray, t);
    const off = hit.sub(chest);
    if (off.length() > HOVER_REACH) off.setLength(HOVER_REACH);
    return chest.add(off).addScaledVector(normal, 0.3);
  }

  private writeAnchors(): void {
    const anchors = this.deps.anchors();
    if (!anchors) return;
    const { camera } = this.deps;
    const viewport = this.deps.viewport();
    const p = this.deps.player.position;
    this.write(anchors.boss, this.bossPoint(CHEST, this.chest), camera, viewport);
    this.write(anchors.player, this.spot.set(p.x, p.y + 1, p.z), camera, viewport);
  }

  private write(el: HTMLElement | null, point: Vector3, camera: PerspectiveCamera, viewport: { width: number; height: number }): void {
    if (!el) return;
    point.project(camera);
    const x = ((point.x + 1) / 2) * viewport.width;
    const y = ((1 - point.y) / 2) * viewport.height;
    const last = this.written.get(el);
    if (last && Math.abs(last.x - x) < ANCHOR_STEP && Math.abs(last.y - y) < ANCHOR_STEP) return;
    this.written.set(el, { x, y });
    el.style.setProperty('--duel-x', `${x.toFixed(1)}px`);
    el.style.setProperty('--duel-y', `${y.toFixed(1)}px`);
    el.style.visibility = 'visible';
  }

  private jitter(size: number): number {
    return (this.random() - 0.5) * 2 * size;
  }
}

/** Whether nothing solid stands on the straight line from `from` to `to`. */
function clearLine(from: Vector3, to: Vector3, solid: SolidAt): boolean {
  const dir = to.clone().sub(from);
  const length = dir.length();
  if (length < 1e-6) return true;
  dir.divideScalar(length);
  return raycastGrid([from.x, from.y, from.z], [dir.x, dir.y, dir.z], length, solid) === null;
}
