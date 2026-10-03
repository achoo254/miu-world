// Đá cầu: a shuttlecock floats down (feathers make it fall slowly); a tap on it while it comes down kicks it
// back up. Every kick is a point; a cầu that reaches the ground only breaks the streak, and a friend tosses
// it back in. Half way through, a second cầu joins. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface Shuttle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Seconds before it is tossed back in after landing (0 while in play). */
  waiting: number;
  /** Seconds since its last kick (a little flash). */
  kicked: number;
}

export interface DaCauState {
  groundY: number;
  /** Where a kick sends the cầu up to. */
  apexY: number;
  shuttles: Shuttle[];
  /** Where the child stands (walks under the next cầu) and how long since she kicked. */
  kickerX: number;
  kickAgo: number;
  streak: number;
  best: number;
  score: number;
  time: number;
}

const GRAVITY = 700;
/** Feathers: a falling cầu never goes faster than this. */
export const FALL_MAX = 290;
/** Taps this close to a cầu kick it: far wider than the picture. */
export const KICK_RADIUS = Math.max(TOUCH_RADIUS * 1.6, 72);
const BACK_IN_SECONDS = 1.1;
const RISE = 480;

export function createDaCau({ arena, duration, params, rng }: GameSetup): MinigameLogic<DaCauState> {
  const factor = typeof params.speed === 'number' ? Math.min(1.5, Math.max(0.6, params.speed)) : 1;
  const events = eventQueue();
  const groundY = arena.height - 70;
  const apexY = Math.max(HUD_SAFE_TOP + 70, groundY - RISE);
  const tossIn = (s: Shuttle): void => {
    s.x = rng.range(arena.width * 0.25, arena.width * 0.75);
    s.y = apexY;
    s.vx = 0;
    s.vy = 0;
    s.waiting = 0;
    s.kicked = 9;
  };
  const first: Shuttle = { x: 0, y: 0, vx: 0, vy: 0, waiting: 0, kicked: 9 };
  tossIn(first);
  const state: DaCauState = { groundY, apexY, shuttles: [first], kickerX: arena.width / 2, kickAgo: 9, streak: 0, best: 0, score: 0, time: 0 };
  let secondAdded = false;

  function kick(s: Shuttle): void {
    // Up to the apex, drifting toward a new spot so the child follows it around a little.
    const g = GRAVITY * factor;
    const vy = -Math.sqrt(2 * g * Math.max(60, s.y - apexY));
    const flight = -vy / g + (groundY - 80 - apexY) / FALL_MAX;
    const target = rng.range(arena.width * 0.15, arena.width * 0.85);
    s.vy = vy;
    s.vx = (target - s.x) / flight;
    s.kicked = 0;
    state.kickAgo = 0;
    state.streak += 1;
    state.best = Math.max(state.best, state.streak);
    state.score += 1;
    events.push({ type: 'score', x: s.x, y: s.y });
  }

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return false;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.kickAgo += dt;
      if (!secondAdded && state.time >= duration / 2) {
        secondAdded = true;
        const second: Shuttle = { x: 0, y: 0, vx: 0, vy: 0, waiting: 0, kicked: 9 };
        tossIn(second);
        state.shuttles.push(second);
      }
      for (const tap of input.taps) {
        const s = nearestKickable(state, tap);
        if (s) kick(s);
        else events.push({ type: 'action', x: tap.x, y: tap.y });
      }
      for (const s of state.shuttles) {
        s.kicked += dt;
        if (s.waiting > 0) {
          s.waiting -= dt;
          if (s.waiting <= 0) tossIn(s);
          continue;
        }
        s.vy = Math.min(FALL_MAX * factor, s.vy + GRAVITY * factor * dt);
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        if (s.x < 40 || s.x > arena.width - 40) {
          s.vx = -s.vx;
          s.x = Math.min(arena.width - 40, Math.max(40, s.x));
        }
        if (s.y >= groundY) {
          s.y = groundY;
          s.waiting = BACK_IN_SECONDS;
          state.streak = 0;
          events.push({ type: 'miss', x: s.x, y: groundY });
        }
      }
      // The child walks under the cầu that will land first.
      const next = lowestFalling(state);
      if (next) state.kickerX += Math.sign(next.x - state.kickerX) * Math.min(Math.abs(next.x - state.kickerX), 520 * dt);
    },
  };
}

/** A cầu that may be kicked: in play and on its way down. */
export const kickable = (s: Shuttle): boolean => s.waiting <= 0 && s.vy > 0;

function nearestKickable(state: DaCauState, at: Point): Shuttle | null {
  let best: Shuttle | null = null;
  let bestD = KICK_RADIUS;
  for (const s of state.shuttles) {
    const d = Math.hypot(s.x - at.x, s.y - at.y);
    if (kickable(s) && d <= bestD) {
      best = s;
      bestD = d;
    }
  }
  return best;
}

function lowestFalling(state: DaCauState): Shuttle | undefined {
  return state.shuttles.filter((s) => s.waiting <= 0).sort((a, b) => b.y - a.y)[0];
}

/** Good play: kick the lowest falling cầu once it has come down a little. */
export function daCauBot(state: DaCauState, _context: BotContext): BotMove {
  const s = state.shuttles.filter((c) => kickable(c) && c.y > state.apexY + 60).sort((a, b) => b.y - a.y)[0];
  return s ? { tap: { x: s.x, y: s.y + s.vy * 0.05 } } : {};
}
