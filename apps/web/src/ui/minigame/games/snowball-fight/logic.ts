// Snowball fight: friends pop up behind snow forts across the field, wind up and throw a snowball at the
// child. She taps a friend to throw back (only while she is up: her own snowball flies a moment, and hits if
// the friend is still up when it arrives). Holding the screen ducks her behind her own fort; a snowball
// that arrives while she is up costs one of five hearts. A friend hit early never gets to throw. Pure.
import { eventQueue } from '../../define-minigame';
import type { SpriteName } from '../../sprites';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export const FRIENDS: readonly SpriteName[] = ['penguin', 'bear', 'fox', 'rabbit', 'panda'];

export interface Friend {
  x: number;
  y: number;
  sprite: SpriteName;
  /** Seconds it has been up (-1 while hidden), and how long it stays up. */
  up: number;
  stay: number;
  /** Already threw this time up. */
  threw: boolean;
  /** Seconds since she hit it (-1 when not): it hides, dizzy. */
  hit: number;
}

export interface Ball {
  /** From and to, and seconds flown of how long the flight is. */
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  t: number;
  flight: number;
  /** Hers (thrown at a friend: its index) or theirs (-1). */
  target: number;
  /** Seconds since it landed (a splat), -1 in flight. */
  splat: number;
}

export interface SnowballState {
  fortY: number;
  playerX: number;
  ducking: boolean;
  /** Seconds since she was hit (blink). */
  hitAgo: number;
  friends: Friend[];
  balls: Ball[];
  lives: number;
  score: number;
  time: number;
}

const LIVES = 5;
const WINDUP = 0.95;
export const THEIR_FLIGHT = 0.85;
export const MY_FLIGHT = 0.32;
/** A touch held this long ducks (a tap is shorter, so tapping a friend never ducks). */
export const DUCK_HOLD = 0.16;
const HIDE_AFTER_HIT = 1.6;
export const FRIEND_REACH = TOUCH_RADIUS + 30;

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export function createSnowballFight({ arena, duration, params, rng }: GameSetup): MinigameLogic<SnowballState> {
  const factor = typeof params.speed === 'number' ? clamp(params.speed, 0.6, 1.5) : 1;
  const events = eventQueue();
  const fortY = arena.height - 150;
  const fieldTop = HUD_SAFE_TOP + 110;
  const fieldBottom = Math.min(fortY - 220, fieldTop + 360);
  const count = arena.width > 750 ? 4 : 3;
  const friends: Friend[] = [];
  for (let i = 0; i < count; i += 1) {
    // Two rows of forts on a tall screen, one on a wide one.
    const row = arena.width > 750 ? i % 2 : i === 1 ? 1 : 0;
    friends.push({
      x: (arena.width * (i + 0.5)) / count,
      y: fieldTop + row * Math.max(0, fieldBottom - fieldTop) * 0.6,
      sprite: FRIENDS[i % FRIENDS.length] ?? 'penguin',
      up: -1,
      stay: 2,
      threw: false,
      hit: -1,
    });
  }
  const state: SnowballState = { fortY, playerX: arena.width / 2, ducking: false, hitAgo: 9, friends, balls: [], lives: LIVES, score: 0, time: 0 };
  let nextPop = 1.0;

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
      state.hitAgo += dt;
      const progress = Math.min(1, state.time / duration);
      state.ducking = input.pointer !== null && input.holdTime >= DUCK_HOLD;

      // Her throws: a tap on a friend that is up (only while she is up herself).
      if (!state.ducking) {
        for (const tap of input.taps) {
          const i = state.friends.findIndex((f) => f.up >= 0 && f.hit < 0 && Math.hypot(f.x - tap.x, f.y - 30 - tap.y) < FRIEND_REACH);
          const f = state.friends[i];
          if (!f) continue;
          state.balls.push({ fromX: state.playerX, fromY: fortY - 80, toX: f.x, toY: f.y - 30, t: 0, flight: MY_FLIGHT, target: i, splat: -1 });
          events.push({ type: 'action', x: state.playerX, y: fortY - 80 });
        }
      }

      // Friends pop up, wind up, throw, hide.
      nextPop -= dt;
      const upCount = state.friends.filter((f) => f.up >= 0).length;
      if (nextPop <= 0 && upCount < 2) {
        const hidden = state.friends.filter((f) => f.up < 0 && f.hit < 0);
        if (hidden.length > 0) {
          const f = hidden[rng.int(0, hidden.length - 1)];
          if (f) {
            f.up = 0;
            f.threw = false;
            f.stay = rng.range(1.7, 2.3);
          }
        }
        nextPop = rng.range(0.9, 1.4) * (1 - 0.35 * progress) / factor;
      }
      for (const f of state.friends) {
        if (f.hit >= 0) {
          f.hit += dt;
          if (f.hit > HIDE_AFTER_HIT) f.hit = -1;
          continue;
        }
        if (f.up < 0) continue;
        f.up += dt * factor;
        if (!f.threw && f.up >= WINDUP) {
          f.threw = true;
          state.balls.push({ fromX: f.x, fromY: f.y - 40, toX: state.playerX + rng.range(-30, 30), toY: fortY - 70, t: 0, flight: THEIR_FLIGHT / factor, target: -1, splat: -1 });
        }
        if (f.up >= f.stay) f.up = -1;
      }

      for (const b of state.balls) {
        if (b.splat >= 0) {
          b.splat += dt;
          continue;
        }
        b.t += dt;
        if (b.t < b.flight) continue;
        b.splat = 0;
        if (b.target >= 0) {
          const f = state.friends[b.target];
          if (f && f.up >= 0 && f.hit < 0) {
            f.up = -1;
            f.hit = 0;
            state.score += 1;
            events.push({ type: 'score', x: f.x, y: f.y - 40 });
          } else events.push({ type: 'miss', x: b.toX, y: b.toY });
        } else if (!state.ducking) {
          state.lives -= 1;
          state.hitAgo = 0;
          events.push({ type: 'hit', x: b.toX, y: b.toY });
        } else {
          // Splat on the fort wall.
          b.toY = fortY - 10;
          events.push({ type: 'miss', x: b.toX, y: fortY - 10 });
        }
      }
      state.balls = state.balls.filter((b) => b.splat < 0.5);
    },
  };
}

/** Good play: duck just before a snowball arrives, otherwise throw at a friend that will still be up. */
export function snowballBot(state: SnowballState, _context: BotContext): BotMove {
  const incoming = state.balls.some((b) => b.target < 0 && b.splat < 0 && b.flight - b.t < 0.42);
  if (incoming) return { touch: { x: state.playerX, y: state.fortY } };
  const aimed = new Set(state.balls.filter((b) => b.target >= 0 && b.splat < 0).map((b) => b.target));
  const target = state.friends.findIndex((f, i) => f.up >= 0 && f.hit < 0 && !aimed.has(i) && f.stay - f.up > MY_FLIGHT + 0.12);
  const f = state.friends[target];
  return f ? { tap: { x: f.x, y: f.y - 30 } } : {};
}
