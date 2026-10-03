// Runner: the child runs along a trail on her own; a tap (or a swipe up) jumps over rocks and logs, a swipe
// down ducks under low branches; stars along the way score. Three bumps end the run. The trail comes in
// short patterns (an obstacle with stars to win by clearing it, or a free line of stars), faster as the round
// goes on. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import type { BotContext, BotMove, GameInput, GameSetup, MinigameLogic } from '../../types';

export const GRAVITY = 2600;
export const JUMP_SPEED = 1050;
/** Fast fall when she swipes down in the air. */
const DIVE_SPEED = 1300;
const SLIDE_SECONDS = 0.6;
const INVULNERABLE_SECONDS = 1.3;
/** A tap shortly before landing still jumps (buffered), so a slightly early tap is never lost. */
const JUMP_BUFFER = 0.15;
const LIVES = 3;
/** Hit boxes are smaller than the pictures: a near miss is a miss, never a bump the child cannot see. */
const PLAYER_BOX = { w: 54, h: 80, slideH: 38 };
const BASE_SPEED = 380;
/** The trail is this much faster at the end of the round than at the start. */
const RAMP = 0.45;
const STAR_RADIUS = 46;
/** First obstacle after this many seconds: time to understand what is going on. */
const LEAD_SECONDS = 1.6;

export type ObstacleKind = 'rock' | 'log' | 'branch';

export interface Obstacle {
  kind: ObstacleKind;
  /** Centre, screen x. */
  x: number;
  w: number;
  /** For ground obstacles, height above the ground; for a branch, how high its bottom edge hangs. */
  h: number;
}

export interface Star {
  x: number;
  /** Height of its centre above the ground. */
  lift: number;
  /** Seconds since it was picked up; -1 while it waits on the trail. */
  taken: number;
}

export interface RunnerState {
  groundY: number;
  playerX: number;
  /** Height of her feet above the ground, and her vertical speed (up is positive). */
  lift: number;
  vy: number;
  /** Seconds of ducking left. */
  sliding: number;
  /** Seconds of blinking left after a bump. */
  invulnerable: number;
  /** Seconds since she last landed (squash on landing). */
  landed: number;
  /** Total distance run, for scrolling the scenery. */
  distance: number;
  speed: number;
  lives: number;
  score: number;
  time: number;
  obstacles: Obstacle[];
  stars: Star[];
}

const speedAt = (time: number, duration: number, factor: number): number => BASE_SPEED * factor * (1 + RAMP * Math.min(1, time / duration));

/** Lays a pattern starting at screen x `x`; returns where the next one may start. */
function layPattern(state: RunnerState, rng: Rng, x: number, progress: number): number {
  const star = (sx: number, lift: number): void => {
    state.stars.push({ x: sx, lift, taken: -1 });
  };
  const roll = rng.next();
  const groundStars = (from: number, count: number): void => {
    for (let i = 0; i < count; i += 1) star(from + i * 70, 40);
  };
  if (roll < 0.18) {
    // A free line of stars: a breather.
    groundStars(x, 5);
    return x + 5 * 70 + rng.range(140, 220);
  }
  if (roll < 0.42 && progress > 0.1) {
    // A low branch to duck under, stars beneath it.
    const w = 100;
    state.obstacles.push({ kind: 'branch', x: x + w / 2, w, h: 62 });
    for (let i = 0; i < 3; i += 1) star(x + w / 2 - 60 + i * 60, 26);
    return x + w + rng.range(330, 420);
  }
  // A rock or a log to jump, with an arc of stars over it.
  const kind: ObstacleKind = rng.chance(0.5) ? 'rock' : 'log';
  const w = kind === 'rock' ? 74 : 112;
  const h = kind === 'rock' ? 66 : 50;
  groundStars(x - 160, 2);
  state.obstacles.push({ kind, x: x + w / 2, w, h });
  for (let i = 0; i < 3; i += 1) star(x + w / 2 + (i - 1) * 85, 150 + (i === 1 ? 50 : 0));
  // Later on, a second obstacle right after the first now and then: two jumps in a row.
  if (progress > 0.45 && rng.chance(0.35)) {
    const x2 = x + w + rng.range(380, 460);
    state.obstacles.push({ kind: 'rock', x: x2 + 37, w: 74, h: 66 });
    star(x2 + 37, 190);
    return x2 + 74 + rng.range(330, 420);
  }
  return x + w + rng.range(340, 460);
}

export function createRunner({ arena, duration, params, rng }: GameSetup): MinigameLogic<RunnerState> {
  const factor = typeof params.speed === 'number' ? Math.min(1.6, Math.max(0.6, params.speed)) : 1;
  const events = eventQueue();
  // The trail sits low on a wide screen; on a tall one the action band is kept near the middle, not under a sky.
  const groundY = Math.min(arena.height - Math.min(arena.height * 0.25, 200), arena.height * 0.5 + 260);
  const state: RunnerState = {
    groundY,
    playerX: Math.max(120, arena.width * 0.22),
    lift: 0,
    vy: 0,
    sliding: 0,
    invulnerable: 0,
    landed: 1,
    distance: 0,
    speed: speedAt(0, duration, factor),
    lives: LIVES,
    score: 0,
    time: 0,
    obstacles: [],
    stars: [],
  };
  let nextPatternX = state.playerX + speedAt(0, duration, factor) * LEAD_SECONDS;
  let jumpBuffered = -1;

  const airborne = (): boolean => state.lift > 0 || state.vy > 0;
  const jump = (): void => {
    state.vy = JUMP_SPEED;
    state.sliding = 0;
    state.landed = 0;
    events.push({ type: 'action', x: state.playerX, y: groundY });
  };

  const playerBox = (): { left: number; right: number; bottom: number; top: number } => {
    const h = state.sliding > 0 && !airborne() ? PLAYER_BOX.slideH : PLAYER_BOX.h;
    return { left: state.playerX - PLAYER_BOX.w / 2, right: state.playerX + PLAYER_BOX.w / 2, bottom: state.lift, top: state.lift + h };
  };

  const bumps = (o: Obstacle): boolean => {
    const box = playerBox();
    // Obstacle boxes are trimmed by a fifth on each side: only a clear hit counts.
    const half = (o.w * 0.6) / 2;
    if (box.right < o.x - half || box.left > o.x + half) return false;
    return o.kind === 'branch' ? box.top > o.h : box.bottom < o.h * 0.8;
  };

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.lives <= 0;
    },
    get lives() {
      return state.lives;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.speed = speedAt(state.time, duration, factor);
      const move = state.speed * dt;
      state.distance += move;

      // Input: a tap or a swipe up jumps, a swipe down ducks (or dives back down from a jump).
      const wantsJump = input.taps.length > 0 || input.swipes.some((s) => s.direction === 'up');
      const wantsDuck = input.swipes.some((s) => s.direction === 'down');
      if (wantsDuck) {
        if (airborne()) state.vy = Math.min(state.vy, -DIVE_SPEED);
        state.sliding = SLIDE_SECONDS;
        jumpBuffered = -1;
      } else if (wantsJump) {
        if (!airborne()) jump();
        else jumpBuffered = JUMP_BUFFER;
      }

      // Body.
      if (airborne()) {
        state.vy -= GRAVITY * dt;
        state.lift += state.vy * dt;
        if (state.lift <= 0) {
          state.lift = 0;
          state.vy = 0;
          state.landed = 0;
          if (jumpBuffered > 0) jump();
        }
      }
      jumpBuffered -= dt;
      state.landed += dt;
      if (!airborne()) state.sliding = Math.max(0, state.sliding - dt);
      state.invulnerable = Math.max(0, state.invulnerable - dt);

      // The trail moves; new patterns come in from the right.
      for (const o of state.obstacles) o.x -= move;
      for (const s of state.stars) {
        s.x -= move;
        if (s.taken >= 0) s.taken += dt;
      }
      nextPatternX -= move;
      while (nextPatternX < arena.width + 400) nextPatternX = layPattern(state, rng, nextPatternX, state.time / duration);
      state.obstacles = state.obstacles.filter((o) => o.x + o.w > -100);
      state.stars = state.stars.filter((s) => s.x > -100 && s.taken < 0.6);

      // Stars she touches.
      const box = playerBox();
      const middle = (box.bottom + box.top) / 2;
      for (const s of state.stars) {
        if (s.taken >= 0) continue;
        if (Math.abs(s.x - state.playerX) < STAR_RADIUS && Math.abs(s.lift - middle) < STAR_RADIUS + (box.top - box.bottom) / 2) {
          s.taken = 0;
          state.score += 1;
          events.push({ type: 'score', x: s.x, y: groundY - s.lift });
        }
      }

      // Bumps.
      if (state.invulnerable <= 0) {
        const hit = state.obstacles.find(bumps);
        if (hit) {
          state.lives -= 1;
          state.invulnerable = INVULNERABLE_SECONDS;
          events.push({ type: 'hit', x: hit.x, y: groundY - hit.h / 2 });
        }
      }
    },
  };
}

/** Good play: jump a ground obstacle a moment before reaching it, duck a branch a moment before it. */
export function runnerBot(state: RunnerState, context: BotContext): BotMove {
  const ahead = state.obstacles.filter((o) => o.x + o.w / 2 > state.playerX - PLAYER_BOX.w / 2).sort((a, b) => a.x - b.x)[0];
  if (!ahead) return {};
  const seconds = (ahead.x - ahead.w / 2 - state.playerX) / state.speed;
  if (seconds > 0.42) return {};
  const centre = { x: context.arena.width / 2, y: context.arena.height / 2 };
  if (ahead.kind === 'branch') return state.sliding > 0.2 ? {} : { swipe: { from: centre, dx: 0, dy: 140 } };
  return state.lift > 0 || state.vy > 0 ? {} : { tap: centre };
}
