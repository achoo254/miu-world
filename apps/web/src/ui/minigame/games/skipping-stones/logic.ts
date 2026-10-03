// Skipping stones: the child stands on the left bank of a lake and swipes to the right to throw a flat stone.
// A fast, straight (level) swipe makes it skip up to ten times; a slow or slanted one only once or twice. Stars
// float on the water: a skip that lands on one picks it up for two more points. The score is skips plus star
// points; six stones, then the round is over. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Swipe } from '../../types';

export const MAX_SKIPS = 10;
const STAR_REACH = 42;
const NEXT_SECONDS = 0.7;

export interface Throw {
  /** Where each skip touches the water (x), in order. */
  skips: number[];
  /** Seconds since the throw. */
  age: number;
  /** Seconds the whole flight takes. */
  flight: number;
}

export interface StonesState {
  waterY: number;
  bankX: number;
  stars: { x: number; taken: boolean }[];
  current: Throw | null;
  /** Seconds until the next stone is ready (0 when it is). */
  wait: number;
  thrown: number;
  stones: number;
  /** Skips of the last throw (shown big). */
  lastSkips: number;
  score: number;
  time: number;
}

/** Skips for a swipe: speed gives power, a level line gives straightness. */
export function skipsFor(swipe: Pick<Swipe, 'dx' | 'dy' | 'speed'>): number {
  if (swipe.dx <= 0) return 0;
  const power = Math.max(0, Math.min(1, (swipe.speed - 300) / 1500));
  const angle = Math.atan2(Math.abs(swipe.dy), swipe.dx);
  const straight = Math.max(0, Math.min(1, 1 - angle / ((40 * Math.PI) / 180)));
  return 1 + Math.round((MAX_SKIPS - 1) * power * straight);
}

function placeStars(rng: Rng, bankX: number, width: number): { x: number; taken: boolean }[] {
  return Array.from({ length: 3 }, () => ({ x: rng.range(bankX + 120, width - 40), taken: false }));
}

export function createSkippingStones({ arena, params, rng }: GameSetup): MinigameLogic<StonesState> {
  const stones = typeof params.stones === 'number' ? Math.round(Math.min(10, Math.max(3, params.stones))) : 6;
  const events = eventQueue();
  const waterY = Math.max(HUD_SAFE_TOP + 200, arena.height * 0.6);
  const bankX = Math.min(130, arena.width * 0.18);
  const state: StonesState = { waterY, bankX, stars: placeStars(rng, bankX, arena.width), current: null, wait: 0, thrown: 0, stones, lastSkips: 0, score: 0, time: 0 };

  function throwStone(swipe: Swipe): void {
    const n = skipsFor(swipe);
    if (n === 0) return;
    const water = arena.width - bankX - 30;
    // Skips get shorter one after another; more skips cover more of the lake.
    const first = (water * 0.22 * (0.55 + 0.45 * (n / MAX_SKIPS))) / (1 + rng.range(-0.05, 0.05));
    const skips: number[] = [];
    let x = bankX + 30;
    let d = first;
    for (let i = 0; i < n; i += 1) {
      x = Math.min(arena.width - 20, x + d);
      skips.push(x);
      d *= 0.8;
    }
    state.current = { skips, age: 0, flight: 0.35 + n * 0.17 };
    state.thrown += 1;
    state.lastSkips = n;
    state.score += n;
    for (const skip of skips) {
      const star = state.stars.find((s) => !s.taken && Math.abs(s.x - skip) <= STAR_REACH);
      if (star) {
        star.taken = true;
        state.score += 2;
        events.push({ type: 'score', x: star.x, y: waterY - 30, points: 2 });
      }
    }
    events.push({ type: 'action', x: bankX, y: waterY - 60 });
  }

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.thrown >= stones && state.current === null && state.wait <= 0;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      const c = state.current;
      if (c) {
        const before = c.age;
        c.age += dt;
        c.skips.forEach((x, i) => {
          const at = (c.flight * (i + 1)) / c.skips.length;
          if (before < at && c.age >= at) events.push({ type: 'miss', x, y: state.waterY, note: 72 + i * 2, voice: 'bell' });
        });
        if (c.age >= c.flight + 0.3) {
          state.current = null;
          state.wait = NEXT_SECONDS;
          if (state.stars.every((s) => s.taken)) state.stars = placeStars(rng, bankX, arena.width);
        }
        return;
      }
      if (state.wait > 0) {
        state.wait = Math.max(0, state.wait - dt);
        return;
      }
      const swipe = input.swipes.find((s) => s.direction === 'right');
      if (swipe && state.thrown < stones) throwStone(swipe);
    },
  };
}

/** Where the stone is: arcs between skips, from the bank to the last skip, then it sinks. */
export function stoneAt(state: StonesState): { x: number; y: number } | null {
  const c = state.current;
  if (!c) return null;
  const n = c.skips.length;
  const t = Math.min(1, c.age / c.flight) * n;
  const k = Math.min(n - 1, Math.floor(t));
  const from = k === 0 ? state.bankX + 30 : (c.skips[k - 1] ?? 0);
  const to = c.skips[k] ?? from;
  const u = Math.min(1, t - k);
  const height = (k === 0 ? 90 : 60 * Math.pow(0.8, k)) * Math.sin(u * Math.PI);
  return { x: from + (to - from) * u, y: state.waterY - 8 - height - (k === 0 ? (1 - u) * 50 : 0) };
}

/** Good play: a fast, level swipe across the water. */
export function skippingStonesBot(state: StonesState, context: BotContext): BotMove {
  if (state.current || state.wait > 0) return {};
  return { swipe: { from: { x: state.bankX, y: Math.min(context.arena.height - 40, state.waterY + 40) }, dx: 420, dy: 8 } };
}
