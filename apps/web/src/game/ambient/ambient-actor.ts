// One villager or animal living its day: it picks a chore (weighted, never the same one twice in a
// row), plays the chore's beats one after another, stops to watch and greet the child who comes
// close, reacts when tapped, and then goes back to what it was doing. Pure (no three.js): the caller
// draws the returned frame and shows the returned speech.
import type { ActorFrame, Beat, Chore, Pose, Range, RoutineSpec, Speech, Vec3, Wings } from './ambient-types';

export interface ActorContext {
  /** The child's position, or null when there is no child to watch (review shots). */
  readonly player: { readonly x: number; readonly y: number; readonly z: number } | null;
  /** Height a walker stands at over a column of the map. */
  groundY(x: number, z: number): number;
  /** The device asks for reduced motion: lively chores are skipped and hops become walks. */
  readonly reduced: boolean;
  /** Length in seconds of a model clip, 0 when the model lacks it. */
  clipSeconds(clip: string): number;
}

export interface ActorStep {
  readonly frame: ActorFrame;
  readonly speech: Speech | null;
}

/** Turning speed in rad/s. */
const TURN_SPEED = 4;
const HOP_SECONDS = 0.42;
const HOP_PAUSE = 0.15;
const HOP_LENGTH = 0.9;
const HOP_HEIGHT = 0.45;
const FLY_SPEED = 4.5;
const CIRCLE_SPEED = 3.2;
/** Seconds a flyer takes to join its loop from where it is. */
const CIRCLE_JOIN = 1.5;
/** On its loop a bird glides only where it dips this steeply (cosine of the bob's phase): under a third of the way round. */
const GLIDE_SLOPE = -0.6;
const LEAP_SECONDS = 1.1;
/** A greeting does not repeat if the child steps out and back in within this many seconds. */
const GREET_COOLDOWN = 10;
/** The child must step this much further than the notice radius before the character resumes. */
const LEAVE_MARGIN = 1.5;
/** A clip the model lacks still takes this long, so a chore never stalls on it. */
const FALLBACK_CLIP_SECONDS = 1.5;

type Run =
  | { kind: 'move'; to: [number, number]; speed: number; clip: string; sideways: boolean }
  | { kind: 'hop'; targets: Array<[number, number]>; from: [number, number]; t: number; pause: number }
  | { kind: 'act'; clip: string; left: number; face: Vec3 | null; pose: Pose; speed: number; t: number }
  | { kind: 'fly'; from: Vec3; to: Vec3; height: number; t: number; seconds: number }
  | { kind: 'circle'; center: Vec3; radius: number; height: number; left: number; angle: number; t: number; from: Vec3 }
  | { kind: 'leap'; at: Vec3; height: number; t: number; after: number };

const between = (range: Range, random: () => number): number => range[0] + random() * (range[1] - range[0]);

/** Shortest signed angle from `from` to `to`, in (-π, π]. */
export function angleDelta(from: number, to: number): number {
  const d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) return d - Math.PI * 2;
  if (d <= -Math.PI) return d + Math.PI * 2;
  return d;
}

/** Weighted pick that never returns `last` when anything else is allowed. */
export function pickChore(chores: readonly Chore[], last: Chore | null, random: () => number): Chore | null {
  const pool = chores.length > 1 ? chores.filter((c) => c !== last) : chores;
  const total = pool.reduce((sum, c) => sum + c.weight, 0);
  let roll = random() * total;
  for (const chore of pool) {
    roll -= chore.weight;
    if (roll < 0) return chore;
  }
  return pool.at(-1) ?? null;
}

/** The spot an animal visit runs to (set next to the child just before the visit). */
const VISIT_SPOT = '__visit';

export class AmbientActor {
  private readonly pos: [number, number, number];
  private yaw: number;
  private pitch = 0;
  private held: number | null = null;
  private visible: boolean;
  private chore: Chore | null = null;
  private lastChore: Chore | null = null;
  private beatIndex = 0;
  private run: Run | null = null;
  /** Idle before the first chore, so neighbours never start in step. */
  private wait: number;
  private mode: 'chores' | 'attend' | 'react' = 'chores';
  /** The chore a reaction or a greeting interrupted, resumed at the same beat. */
  private resume: { chore: Chore | null; beat: number } | null = null;
  private greetLeft = 0;
  private greetCooldown = 0;
  private lastReact: Chore | null = null;
  private speech: Speech | null = null;
  /** An answer to a neighbour, said on the next frame. */
  private pending: Speech | null = null;
  private frameClip = 'idle';
  private frameClipSpeed = 1;
  private framePose: Pose = 'none';
  private posePlayed = 0;
  private wings: Wings = 'folded';

  constructor(
    readonly id: string,
    readonly spec: RoutineSpec,
    private readonly home: Vec3,
    homeYaw: number,
    private readonly spots: Record<string, Vec3>,
    private readonly random: () => number,
  ) {
    this.pos = [...home];
    this.yaw = homeYaw;
    this.visible = !spec.hiddenAtRest;
    this.wait = random() * 3;
  }

  get position(): Vec3 {
    return this.pos;
  }

  /** Busy with a reaction or in the air: a tap now does nothing. */
  get canReact(): boolean {
    return this.spec.reach > 0 && this.spec.react.length > 0 && this.mode !== 'react' && !this.airborne;
  }

  private get airborne(): boolean {
    return this.run?.kind === 'fly' || this.run?.kind === 'circle' || this.run?.kind === 'leap' || (this.run?.kind === 'hop' && this.run.t > 0);
  }

  private spot(ref: string): Vec3 {
    return ref === 'home' ? this.home : (this.spots[ref] ?? this.home);
  }

  /** The child tapped "Trò chuyện" / "Vuốt ve": play a reaction, then go back to the chore. */
  react(): boolean {
    if (!this.canReact) return false;
    return this.interrupt(this.spec.react);
  }

  /** The child finished a quest nearby: cheer with them, then go back to the chore (in the air: carry on). */
  celebrate(reduced: boolean): boolean {
    if (this.mode === 'react' || this.airborne) return false;
    return this.interrupt(reduced ? this.spec.celebrate.filter((c) => !c.lively) : this.spec.celebrate);
  }

  /**
   * Runs over to `at` (beside the child), says hello with its greeting, dances, and runs back home: the
   * "animal visit" surprise. Only animals on the ground, and not while busy or in the air.
   */
  visit(at: Vec3): boolean {
    if (this.spec.kind !== 'animal' || this.mode === 'react' || this.airborne) return false;
    this.spots[VISIT_SPOT] = at;
    return this.interrupt([
      {
        id: 'visit',
        weight: 1,
        beats: [
          { do: 'walk', to: VISIT_SPOT, clip: 'run', speed: this.spec.walkSpeed * 2.5 },
          { do: 'say', pool: this.spec.greet.pool },
          { do: 'act', clip: 'dance', loops: [2, 2] },
          { do: 'walk', to: 'home', clip: 'run', speed: this.spec.walkSpeed * 2.5 },
        ],
      },
    ]);
  }

  private interrupt(chores: readonly Chore[]): boolean {
    const chore = pickChore(chores, this.lastReact, this.random);
    if (!chore) return false;
    this.lastReact = chore;
    if (this.mode === 'chores') this.resume = { chore: this.chore, beat: this.beatIndex };
    this.mode = 'react';
    this.startChore(chore);
    return true;
  }

  /** Another villager spoke nearby: turn to them and answer from `pool` (only while working or resting). */
  answer(pool: string, speaker: Vec3): void {
    if (this.mode !== 'chores' || this.airborne || this.spec.kind !== 'person') return;
    this.turnTowards(speaker, Infinity);
    this.pending = { pool };
  }

  step(dt: number, ctx: ActorContext): ActorStep {
    this.speech = this.pending;
    this.pending = null;
    this.frameClip = 'idle';
    this.frameClipSpeed = 1;
    this.framePose = 'none';
    this.wings = 'folded';
    this.greetCooldown = Math.max(0, this.greetCooldown - dt);
    this.watchChild(ctx);

    if (this.mode === 'attend') this.attend(dt, ctx);
    else if (this.wait > 0) this.wait -= dt;
    else this.work(dt, ctx);

    if (this.spec.hiddenAtRest) this.visible = this.run?.kind === 'leap' && this.run.t < 1;
    return {
      frame: {
        position: [...this.pos],
        yaw: this.yaw,
        pitch: this.pitch,
        clip: this.frameClip,
        clipSpeed: this.frameClipSpeed,
        pose: this.framePose,
        poseTime: this.posePlayed,
        // A bee's wings never stop; a bird's only move in the air.
        wings: this.spec.wings === 'bee' ? 'buzz' : this.airborne ? this.wings : 'folded',
        held: this.held,
        visible: this.visible,
      },
      speech: this.speech,
    };
  }

  /** Starts or ends watching the child; the greeting plays once per visit. */
  private watchChild(ctx: ActorContext): void {
    if (this.spec.noticeRadius <= 0 || this.mode === 'react' || !ctx.player) return;
    const distance = Math.hypot(ctx.player.x - this.pos[0], ctx.player.y - this.pos[1], ctx.player.z - this.pos[2]);
    if (this.mode === 'chores' && distance <= this.spec.noticeRadius && !this.airborne) {
      this.mode = 'attend';
      this.resume = { chore: this.chore, beat: this.beatIndex };
      if (this.greetCooldown === 0) {
        this.greetLeft = ctx.clipSeconds(this.spec.greet.clip) || FALLBACK_CLIP_SECONDS;
        this.greetCooldown = GREET_COOLDOWN;
        this.speech = { pool: this.spec.greet.pool };
      }
    } else if (this.mode === 'attend' && distance > this.spec.noticeRadius + LEAVE_MARGIN) {
      this.mode = 'chores';
      this.backToChore();
    }
  }

  private attend(dt: number, ctx: ActorContext): void {
    if (ctx.player) this.turnTowards([ctx.player.x, ctx.player.y, ctx.player.z], TURN_SPEED * dt);
    if (this.greetLeft > 0) {
      this.greetLeft -= dt;
      this.frameClip = this.spec.greet.clip;
    } else {
      this.frameClip = this.spec.watchClip ?? 'idle';
    }
  }

  private backToChore(): void {
    const saved = this.resume;
    this.resume = null;
    if (saved?.chore) {
      this.chore = saved.chore;
      this.beatIndex = saved.beat;
      this.run = null;
    } else {
      this.chore = null;
    }
  }

  private startChore(chore: Chore): void {
    this.chore = chore;
    this.beatIndex = 0;
    this.run = null;
  }

  private work(dt: number, ctx: ActorContext): void {
    if (!this.chore) {
      const allowed = ctx.reduced ? this.spec.chores.filter((c) => !c.lively) : this.spec.chores;
      const next = pickChore(allowed, this.lastChore, this.random);
      if (!next) return; // nothing calm enough to do: stay put
      this.lastChore = next;
      this.startChore(next);
    }
    // Instant beats (hold, say) run back to back in the same frame; timed beats take the frame.
    for (let guard = 0; guard < 8; guard++) {
      const chore = this.chore;
      if (!chore) return;
      const beat = chore.beats[this.beatIndex];
      if (!beat) {
        this.finishChore();
        return;
      }
      if (!this.run && this.instant(beat)) {
        this.beatIndex++;
        continue;
      }
      this.run ??= this.begin(beat, ctx);
      if (this.advance(dt, ctx)) {
        this.run = null;
        this.beatIndex++;
      }
      return;
    }
  }

  private finishChore(): void {
    this.chore = null;
    this.run = null;
    if (this.mode === 'react') {
      this.mode = 'chores';
      this.backToChore();
    }
  }

  /** Hold and say take no time. */
  private instant(beat: Beat): boolean {
    if (beat.do === 'hold') {
      this.held = beat.item;
      return true;
    }
    if (beat.do === 'say') {
      this.speech = { pool: beat.pool, ...(beat.reply ? { reply: beat.reply } : {}) };
      return true;
    }
    return false;
  }

  private begin(beat: Beat, ctx: ActorContext): Run {
    const r = this.random;
    switch (beat.do) {
      case 'walk': {
        const to = this.spot(beat.to);
        return { kind: 'move', to: [to[0], to[2]], speed: beat.speed ?? this.spec.walkSpeed, clip: beat.clip ?? 'walk', sideways: beat.sideways ?? false };
      }
      case 'wander': {
        const a = r() * Math.PI * 2;
        const d = beat.radius * (0.4 + 0.6 * r());
        return { kind: 'move', to: [this.home[0] + Math.cos(a) * d, this.home[2] + Math.sin(a) * d], speed: beat.speed ?? this.spec.walkSpeed, clip: beat.clip ?? 'walk', sideways: beat.sideways ?? false };
      }
      case 'hop': {
        let goal: [number, number];
        if (beat.to === 'wander') {
          const a = r() * Math.PI * 2;
          const d = (beat.radius ?? 3) * (0.4 + 0.6 * r());
          goal = [this.home[0] + Math.cos(a) * d, this.home[2] + Math.sin(a) * d];
        } else {
          const s = this.spot(beat.to);
          goal = [s[0], s[2]];
        }
        if (ctx.reduced) return { kind: 'move', to: goal, speed: this.spec.walkSpeed, clip: 'walk', sideways: false };
        const count = Math.max(1, Math.round(between(beat.hops, r)));
        const targets: Array<[number, number]> = [];
        let [x, z] = [this.pos[0], this.pos[2]];
        for (let i = 0; i < count; i++) {
          const dx = goal[0] - x;
          const dz = goal[1] - z;
          const len = Math.hypot(dx, dz);
          const stepLen = Math.min(HOP_LENGTH, len / (count - i));
          if (len > 1e-3) {
            x += (dx / len) * stepLen;
            z += (dz / len) * stepLen;
          }
          targets.push([x, z]);
        }
        return { kind: 'hop', targets, from: [this.pos[0], this.pos[2]], t: 0, pause: 0 };
      }
      case 'act': {
        const loops = beat.loops ? Math.max(1, Math.round(between(beat.loops, r))) : 0;
        const clipLength = ctx.clipSeconds(beat.clip) || FALLBACK_CLIP_SECONDS;
        const speed = beat.speed ?? 1;
        const left = beat.seconds ? between(beat.seconds, r) : (loops * clipLength) / speed;
        return { kind: 'act', clip: beat.clip, left, face: beat.face ? this.spot(beat.face) : null, pose: beat.pose ?? 'none', speed, t: 0 };
      }
      case 'fly': {
        const to = this.spot(beat.to);
        const seconds = Math.max(1.2, Math.hypot(to[0] - this.pos[0], to[2] - this.pos[2]) / FLY_SPEED);
        return { kind: 'fly', from: [...this.pos], to, height: beat.height, t: 0, seconds };
      }
      case 'circle': {
        const center = this.spot(beat.around);
        return { kind: 'circle', center, radius: beat.radius, height: beat.height, left: between(beat.seconds, r), angle: Math.atan2(this.pos[2] - center[2], this.pos[0] - center[0]), t: 0, from: [...this.pos] };
      }
      case 'leap':
        return { kind: 'leap', at: this.spot(beat.at), height: beat.height, t: 0, after: between(beat.after, r) };
      default:
        return { kind: 'act', clip: 'idle', left: 0, face: null, pose: 'none', speed: 1, t: 0 };
    }
  }

  /** Moves the current beat on; true once it is done. */
  private advance(dt: number, ctx: ActorContext): boolean {
    const run = this.run;
    if (!run) return true;
    switch (run.kind) {
      case 'move': {
        const dx = run.to[0] - this.pos[0];
        const dz = run.to[1] - this.pos[2];
        const distance = Math.hypot(dx, dz);
        const stepLength = run.speed * dt;
        const heading = Math.atan2(dx, dz) + (run.sideways ? Math.PI / 2 : 0);
        if (distance > 0.05) this.turnTowardsYaw(heading, TURN_SPEED * 2 * dt);
        this.frameClip = run.clip;
        this.frameClipSpeed = Math.max(0.6, run.speed / Math.max(this.spec.walkSpeed, 0.1));
        if (distance <= stepLength) {
          this.pos[0] = run.to[0];
          this.pos[2] = run.to[1];
        } else {
          this.pos[0] += (dx / distance) * stepLength;
          this.pos[2] += (dz / distance) * stepLength;
        }
        this.pos[1] = ctx.groundY(this.pos[0], this.pos[2]);
        return distance <= stepLength;
      }
      case 'hop': {
        const target = run.targets[0];
        if (!target) return true;
        if (run.pause > 0) {
          run.pause -= dt;
          this.frameClip = 'idle';
          return false;
        }
        run.t += dt / HOP_SECONDS;
        const t = Math.min(1, run.t);
        this.pos[0] = run.from[0] + (target[0] - run.from[0]) * t;
        this.pos[2] = run.from[1] + (target[1] - run.from[1]) * t;
        this.pos[1] = ctx.groundY(this.pos[0], this.pos[2]) + Math.sin(Math.PI * t) * HOP_HEIGHT;
        this.turnTowardsYaw(Math.atan2(target[0] - run.from[0], target[1] - run.from[1]), TURN_SPEED * 3 * dt);
        this.frameClip = 'walk';
        this.frameClipSpeed = 1.6;
        if (t < 1) return false;
        run.targets.shift();
        run.from = [target[0], target[1]];
        run.t = 0;
        run.pause = HOP_PAUSE;
        return run.targets.length === 0;
      }
      case 'act': {
        run.left -= dt;
        run.t += dt;
        if (run.face) this.turnTowards(run.face, TURN_SPEED * dt);
        this.frameClip = run.clip;
        this.frameClipSpeed = run.speed;
        this.framePose = run.pose;
        this.posePlayed = run.t;
        return run.left <= 0;
      }
      case 'fly': {
        run.t += dt / run.seconds;
        const t = Math.min(1, run.t);
        const ease = t * t * (3 - 2 * t);
        const prevY = this.pos[1];
        this.pos[0] = run.from[0] + (run.to[0] - run.from[0]) * ease;
        this.pos[2] = run.from[2] + (run.to[2] - run.from[2]) * ease;
        this.pos[1] = run.from[1] + (run.to[1] - run.from[1]) * ease + Math.sin(Math.PI * t) * run.height;
        this.turnTowardsYaw(Math.atan2(run.to[0] - run.from[0], run.to[2] - run.from[2]), TURN_SPEED * dt);
        const climbing = this.pos[1] >= prevY;
        this.pitch = climbing ? 0.25 : -0.15;
        // Wings beat on the way up, glide the first part of the way down, and beat again to land.
        this.wings = climbing || t > 0.75 ? 'flap' : 'glide';
        this.frameClip = 'idle';
        if (t >= 1) this.pitch = 0;
        return t >= 1;
      }
      case 'circle': {
        run.left -= dt;
        run.t += dt;
        run.angle += (CIRCLE_SPEED / run.radius) * dt;
        const bob = Math.sin(run.angle * 2);
        const target: Vec3 = [run.center[0] + Math.cos(run.angle) * run.radius, run.center[1] + run.height + bob * 1.2, run.center[2] + Math.sin(run.angle) * run.radius];
        const join = Math.min(1, run.t / CIRCLE_JOIN);
        for (let i = 0; i < 3; i++) this.pos[i] = (run.from[i] ?? 0) + ((target[i] ?? 0) - (run.from[i] ?? 0)) * join;
        // Tangent of the loop (counter-clockwise seen from above).
        this.turnTowardsYaw(Math.atan2(-Math.sin(run.angle), Math.cos(run.angle)), TURN_SPEED * dt);
        // Beating round most of the loop; a short glide only where it dips fastest.
        const slope = Math.cos(run.angle * 2);
        this.wings = slope > GLIDE_SLOPE ? 'flap' : 'glide';
        this.pitch = slope > 0 ? 0.2 : -0.1;
        this.frameClip = 'idle';
        if (run.left > 0) return false;
        this.pitch = 0;
        return true;
      }
      case 'leap': {
        run.t += dt / LEAP_SECONDS;
        if (run.t < 1) {
          const t = run.t;
          this.pos[0] = run.at[0] + (t - 0.5) * 1.2 * Math.sin(this.yaw);
          this.pos[2] = run.at[2] + (t - 0.5) * 1.2 * Math.cos(this.yaw);
          this.pos[1] = run.at[1] - 0.6 + Math.sin(Math.PI * t) * run.height;
          this.pitch = Math.cos(Math.PI * t) * 0.9;
          this.wings = 'flap';
          return false;
        }
        run.after -= dt; // hidden under the water until the next leap
        this.pitch = 0;
        if (run.after > 0) return false;
        this.yaw = this.random() * Math.PI * 2; // the next leap heads somewhere else
        return true;
      }
    }
  }

  private turnTowards(point: Vec3, maxTurn: number): void {
    const dx = point[0] - this.pos[0];
    const dz = point[2] - this.pos[2];
    if (Math.hypot(dx, dz) < 0.05) return;
    this.turnTowardsYaw(Math.atan2(dx, dz), maxTurn);
  }

  private turnTowardsYaw(target: number, maxTurn: number): void {
    const remaining = angleDelta(this.yaw, target);
    this.yaw += Math.sign(remaining) * Math.min(Math.abs(remaining), maxTurn);
  }
}
