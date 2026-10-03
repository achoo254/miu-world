// Jetpack hold: the child flies across a city with a rocket on her back. Holding the screen fires the rocket
// and she rises; letting go, she sinks. Coins come in lines and waves to pick up; storm clouds drift in
// between and cost one of three hearts. Coins are never laid along the street, so nobody wins by doing
// nothing. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export interface Coin {
  x: number;
  y: number;
  /** Seconds since it was picked up; -1 while it waits. */
  taken: number;
}

export interface Storm {
  x: number;
  y: number;
  /** Seconds since it zapped the child (a flash); -1 before. */
  zapped: number;
}

export interface JetpackState {
  /** The band she flies in: her centre stays between these. */
  top: number;
  bottom: number;
  playerX: number;
  playerY: number;
  /** Up is negative, as on screen. */
  vy: number;
  thrusting: boolean;
  invulnerable: number;
  /** Total distance flown, for scrolling the city. */
  distance: number;
  speed: number;
  coins: Coin[];
  storms: Storm[];
  lives: number;
  score: number;
  time: number;
}

const LIVES = 3;
const GRAVITY = 1500;
const THRUST = 3300;
const MAX_RISE = 560;
const MAX_FALL = 620;
const BASE_SPEED = 300;
const RAMP = 0.4;
const INVULNERABLE_SECONDS = 1.5;
/** Pick-up reach of a coin and the storm's bite: generous for coins, small for storms. */
export const COIN_REACH = 58;
export const STORM_REACH = 62;
/** No coin lower than this above the street: idling on the ground earns nothing. */
const FLOOR_CLEAR = 150;
const LEAD_SECONDS = 1.4;
/** The band is at most this tall on a long phone, centred, so a climb never takes ages. */
const MAX_BAND = 720;

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** Lays a stretch of coins (and maybe a storm) from screen x `x`; returns where the next may start. */
function layPattern(state: JetpackState, rng: Rng, x: number, progress: number): number {
  const lo = state.top + 30;
  const hi = state.bottom - FLOOR_CLEAR;
  const coin = (cx: number, cy: number): void => {
    state.coins.push({ x: cx, y: clamp(cy, lo, hi), taken: -1 });
  };
  const centre = rng.range(lo + 60, hi - 60);
  const roll = rng.next();
  let end: number;
  if (roll < 0.35) {
    // A wave of coins: follow it up and down.
    const amp = rng.range(70, 140);
    for (let i = 0; i < 7; i += 1) coin(x + i * 62, centre + Math.sin(i * 0.9) * amp);
    end = x + 7 * 62;
  } else if (roll < 0.65) {
    // A straight line, a storm above or below it.
    for (let i = 0; i < 6; i += 1) coin(x + i * 62, centre);
    const above = centre - lo > hi - centre;
    if (progress > 0.05) state.storms.push({ x: x + 3 * 62, y: centre + (above ? -1 : 1) * rng.range(130, 170), zapped: -1 });
    end = x + 6 * 62;
  } else {
    // A storm in the middle with coins arcing round it: over or under.
    const sy = rng.range(lo + 120, hi - 80);
    state.storms.push({ x: x + 180, y: sy, zapped: -1 });
    const over = sy - lo > 180;
    for (let i = 0; i < 6; i += 1) coin(x + i * 72, sy + (over ? -1 : 1) * (150 + Math.sin((i / 5) * Math.PI) * 30) * (i === 0 || i === 5 ? 0.6 : 1));
    end = x + 6 * 72;
  }
  return end + rng.range(220, 360) - progress * 60;
}

export function createJetpackHold({ arena, duration, params, rng }: GameSetup): MinigameLogic<JetpackState> {
  const factor = typeof params.speed === 'number' ? clamp(params.speed, 0.6, 1.6) : 1;
  const events = eventQueue();
  const available = arena.height - 70 - (HUD_SAFE_TOP + 40);
  const band = Math.min(available, MAX_BAND);
  const top = HUD_SAFE_TOP + 40 + (available - band) / 2;
  const bottom = top + band;
  const state: JetpackState = {
    top,
    bottom,
    playerX: Math.max(130, arena.width * 0.24),
    playerY: bottom,
    vy: 0,
    thrusting: false,
    invulnerable: 0,
    distance: 0,
    speed: BASE_SPEED * factor,
    coins: [],
    storms: [],
    lives: LIVES,
    score: 0,
    time: 0,
  };
  let nextPattern = state.playerX + BASE_SPEED * factor * LEAD_SECONDS;

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
      const progress = Math.min(1, state.time / duration);
      state.speed = BASE_SPEED * factor * (1 + RAMP * progress);
      state.invulnerable = Math.max(0, state.invulnerable - dt);

      const wasThrusting = state.thrusting;
      state.thrusting = input.pointer !== null;
      if (state.thrusting && !wasThrusting) events.push({ type: 'action', x: state.playerX - 30, y: state.playerY + 40 });
      state.vy += (GRAVITY - (state.thrusting ? THRUST : 0)) * dt;
      state.vy = clamp(state.vy, -MAX_RISE, MAX_FALL);
      state.playerY += state.vy * dt;
      if (state.playerY > state.bottom) {
        state.playerY = state.bottom;
        state.vy = 0;
      }
      if (state.playerY < state.top) {
        state.playerY = state.top;
        state.vy = Math.max(0, state.vy);
      }

      const move = state.speed * dt;
      state.distance += move;
      nextPattern -= move;
      for (const c of state.coins) c.x -= move;
      for (const s of state.storms) s.x -= move;
      while (nextPattern < arena.width + 80) nextPattern = layPattern(state, rng, nextPattern, progress);

      for (const c of state.coins) {
        if (c.taken >= 0) {
          c.taken += dt;
          continue;
        }
        if (Math.hypot(c.x - state.playerX, c.y - state.playerY) < COIN_REACH) {
          c.taken = 0;
          state.score += 1;
          events.push({ type: 'score', x: c.x, y: c.y });
        }
      }
      for (const s of state.storms) {
        if (s.zapped >= 0) s.zapped += dt;
        if (state.invulnerable > 0 || s.zapped >= 0) continue;
        if (Math.hypot(s.x - state.playerX, s.y - state.playerY) < STORM_REACH) {
          s.zapped = 0;
          state.lives -= 1;
          state.invulnerable = INVULNERABLE_SECONDS;
          events.push({ type: 'hit', x: state.playerX, y: state.playerY });
        }
      }
      state.coins = state.coins.filter((c) => c.x > -60 && c.taken < 0.5);
      state.storms = state.storms.filter((s) => s.x > -120);
    },
  };
}

/** Good play: aim for the next coin ahead, steer round a storm in the way, hold to rise toward the aim. */
export function jetpackBot(state: JetpackState, _context: BotContext): BotMove {
  const ahead = state.coins.filter((c) => c.taken < 0 && c.x > state.playerX - 10).sort((a, b) => a.x - b.x);
  let target = ahead[0]?.y ?? (state.top + state.bottom) / 2;
  for (const s of state.storms) {
    const dx = s.x - state.playerX;
    if (dx < -STORM_REACH || dx > 260) continue;
    if (Math.abs(s.y - target) < STORM_REACH + 70 || Math.abs(s.y - state.playerY) < STORM_REACH + 40) {
      const over = s.y - 150 > state.top;
      const under = s.y + 150 < state.bottom;
      target = over && (!under || state.playerY < s.y) ? s.y - 150 : s.y + 150;
    }
  }
  // Where she will be a decision from now, falling or rising.
  const predicted = state.playerY + state.vy * 0.14;
  return predicted > target ? { touch: { x: state.playerX, y: state.playerY } } : {};
}
