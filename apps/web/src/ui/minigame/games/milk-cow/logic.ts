// Milk the cow: a cow stands over a bucket; her udder has two teats that slowly fill (they swell pink). A
// downward swipe on a full teat squirts milk into the bucket (a point, and a little note that climbs as the
// bucket fills); a swipe on one not full yet only dribbles and wears the cow's patience. Out of patience,
// she moos and steps aside for two seconds. Taking turns left and right is the rhythm that works. Every ten
// squirts fill a bucket. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface Teat {
  at: Point;
  /** Milk ready, 0–1. */
  fill: number;
  /** Seconds since squirted (a stream) or dribbled. */
  squirted: number;
  dribbled: number;
}

export interface MilkState {
  cowX: number;
  cowY: number;
  teats: [Teat, Teat];
  bucketY: number;
  /** Squirts in the current bucket, and full buckets so far. */
  inBucket: number;
  buckets: number;
  patience: number;
  /** Seconds left of the cow's huff (swipes do nothing). */
  huff: number;
  score: number;
  time: number;
}

export const FULL = 0.75;
export const PATIENCE = 3;
const REFILL = 0.8;
const PATIENCE_BACK = 2;
const HUFF_SECONDS = 2.5;
export const PER_BUCKET = 10;
/** A swipe starting this close (across) to a teat milks it. */
export const TEAT_REACH = 95;

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export function createMilkCow({ arena, params }: GameSetup): MinigameLogic<MilkState> {
  const factor = typeof params.refill === 'number' ? clamp(params.refill, 0.6, 1.5) : 1;
  const events = eventQueue();
  const cowY = HUD_SAFE_TOP + 150 + Math.max(0, (arena.height - 600) * 0.3);
  const teatY = cowY + 150;
  const cowX = arena.width / 2;
  const teat = (dx: number): Teat => ({ at: { x: cowX + dx, y: teatY }, fill: 1, squirted: 9, dribbled: 9 });
  const state: MilkState = {
    cowX,
    cowY,
    teats: [teat(-75), teat(75)],
    bucketY: Math.min(arena.height - 90, teatY + 220),
    inBucket: 0,
    buckets: 0,
    patience: PATIENCE,
    huff: 0,
    score: 0,
    time: 0,
  };
  let patienceClock = 0;

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
      state.huff = Math.max(0, state.huff - dt);
      for (const t of state.teats) {
        // While she huffs she has stepped aside: no milk comes.
        if (state.huff <= 0) t.fill = Math.min(1, t.fill + REFILL * factor * dt);
        t.squirted += dt;
        t.dribbled += dt;
      }
      if (state.patience < PATIENCE) {
        patienceClock += dt;
        if (patienceClock >= PATIENCE_BACK) {
          patienceClock = 0;
          state.patience += 1;
        }
      }
      if (state.huff > 0) return;
      for (const s of input.swipes) {
        if (s.dy <= 0 || Math.abs(s.dy) < Math.abs(s.dx)) continue;
        const t = [...state.teats].sort((a, b) => Math.abs(a.at.x - s.from.x) - Math.abs(b.at.x - s.from.x))[0];
        if (!t || Math.abs(t.at.x - s.from.x) > TEAT_REACH || s.from.y < state.cowY) continue;
        if (t.fill >= FULL) {
          t.fill = 0;
          t.squirted = 0;
          state.score += 1;
          state.inBucket += 1;
          events.push({ type: 'score', x: t.at.x, y: state.bucketY - 40, note: 67 + state.inBucket, voice: 'bell' });
          if (state.inBucket >= PER_BUCKET) {
            state.inBucket = 0;
            state.buckets += 1;
          }
        } else {
          t.dribbled = 0;
          t.fill = 0;
          state.patience -= 1;
          patienceClock = 0;
          if (state.patience <= 0) {
            state.huff = HUFF_SECONDS;
            state.patience = PATIENCE;
            events.push({ type: 'hit', x: state.cowX, y: state.cowY - 60 });
          } else events.push({ type: 'miss', x: t.at.x, y: t.at.y + 40 });
        }
      }
    },
  };
}

/** Good play: milk whichever teat is full, never one that is not. */
export function milkBot(state: MilkState, _context: BotContext): BotMove {
  if (state.huff > 0) return {};
  const t = [...state.teats].sort((a, b) => b.fill - a.fill)[0];
  if (!t || t.fill < FULL + 0.02) return {};
  return { swipe: { from: { x: t.at.x, y: t.at.y - 10 }, dx: 0, dy: 90 } };
}
