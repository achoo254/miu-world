// Rising water (Sơn Tinh dâng núi): eight hills with a house on each stand by the river. Thủy Tinh sends
// waves at one hill at a time; a ripple and a dashed line show a moment before how high the water will reach.
// Holding a finger on a hill raises it (Sơn Tinh lifts the mountain). A wave that stays below the hilltop is
// beaten (a point); one that comes over it soaks the house, and that house's people climb to safety: no more
// points from that hill, nothing else lost. Waves grow higher through the round. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export const HILLS = 8;

export interface Hill {
  /** Height of the hilltop above the ground (units). */
  height: number;
  wet: boolean;
  /** Seconds since it was last raised (a dust puff), or since it got wet. */
  raisedAgo: number;
}

export interface Wave {
  hill: number;
  /** Height the water reaches, and seconds until it does (negative: falling back). */
  level: number;
  peakIn: number;
  judged: boolean;
}

export interface RisingState {
  hills: Hill[];
  waves: Wave[];
  groundY: number;
  colW: number;
  maxHeight: number;
  /** The hill being raised, or -1. */
  raising: number;
  score: number;
  time: number;
}

export const WARN_SECONDS = 2.2;
const RAISE_SPEED = 150;
const START_HEIGHT = 55;
const LEVEL_START = 70;
const LEVEL_END = 250;
const GAP_START = 2.3;
const GAP_END = 1.4;

/** How high the water stands at a hill now (0 when no wave is there). */
export function waterAt(state: RisingState, hill: number): number {
  let level = 0;
  for (const w of state.waves) {
    if (w.hill !== hill) continue;
    const t = w.peakIn;
    const k = t > 0 ? Math.max(0, 1 - t / 0.7) : Math.max(0, 1 + t / 0.8);
    level = Math.max(level, w.level * k);
  }
  return level;
}

export function createRisingWater({ arena, duration, rng }: GameSetup): MinigameLogic<RisingState> {
  const events = eventQueue();
  const groundY = arena.height - 60;
  const state: RisingState = {
    hills: Array.from({ length: HILLS }, () => ({ height: START_HEIGHT, wet: false, raisedAgo: 9 })),
    waves: [],
    groundY,
    colW: arena.width / HILLS,
    maxHeight: groundY - HUD_SAFE_TOP - 90,
    raising: -1,
    score: 0,
    time: 0,
  };
  let nextIn = 1;

  function sendWave(): void {
    const progress = Math.min(1, state.time / duration);
    const busy = new Set(state.waves.map((w) => w.hill));
    const free = state.hills.map((_, i) => i).filter((i) => !busy.has(i) && !state.hills[i]?.wet);
    const pool = free.length > 0 ? free : state.hills.map((_, i) => i).filter((i) => !busy.has(i));
    const hill = pool[rng.int(0, Math.max(0, pool.length - 1))];
    if (hill === undefined) return;
    const base = LEVEL_START + (LEVEL_END - LEVEL_START) * progress;
    state.waves.push({ hill, level: Math.min(state.maxHeight - 20, base + rng.range(0, 40)), peakIn: WARN_SECONDS, judged: false });
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
      nextIn -= dt;
      if (nextIn <= 0) {
        sendWave();
        nextIn = GAP_START + (GAP_END - GAP_START) * Math.min(1, state.time / duration);
      }
      state.raising = input.pointer ? Math.min(HILLS - 1, Math.max(0, Math.floor(input.pointer.x / state.colW))) : -1;
      state.hills.forEach((h, i) => {
        h.raisedAgo += dt;
        if (i === state.raising && h.height < state.maxHeight) {
          h.height = Math.min(state.maxHeight, h.height + RAISE_SPEED * dt);
          h.raisedAgo = 0;
        }
      });
      for (const w of state.waves) {
        w.peakIn -= dt;
        if (w.judged || w.peakIn > 0) continue;
        w.judged = true;
        const hill = state.hills[w.hill];
        if (!hill) continue;
        const x = (w.hill + 0.5) * state.colW;
        if (hill.wet) continue;
        if (w.level > hill.height) {
          hill.wet = true;
          hill.raisedAgo = 0;
          events.push({ type: 'hit', x, y: groundY - hill.height });
        } else {
          state.score += 1;
          events.push({ type: 'score', x, y: groundY - hill.height - 40 });
        }
      }
      state.waves = state.waves.filter((w) => w.peakIn > -0.8);
    },
  };
}

/** Good play: holds the dry hill whose wave comes soonest and would come over it. */
export function risingWaterBot(state: RisingState, _context: BotContext): BotMove {
  const danger = state.waves
    .filter((w) => !w.judged && !state.hills[w.hill]?.wet && (state.hills[w.hill]?.height ?? 0) < w.level + 12)
    .sort((a, b) => a.peakIn - b.peakIn)[0];
  if (!danger) return {};
  return { touch: { x: (danger.hill + 0.5) * state.colW, y: state.groundY - 40 } };
}
