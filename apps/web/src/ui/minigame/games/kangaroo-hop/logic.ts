// Kangaroo hop: a kangaroo hops along a number line, always the same jump (+2, then +5, then +10, then mixed),
// shown on its sign. Before it jumps, the child taps the stone where it will land to put a carrot there:
// three numbered stones glow ahead of it. Carrot under its feet: it eats it (a point). Carrot elsewhere: it
// hops past, no penalty. Near 100 it starts a new field from a small number. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export type Phase = 'wait' | 'jump';

export interface KangarooState {
  /** Where the kangaroo stands (a number) and how far it jumps. */
  at: number;
  step: number;
  /** Numbers of the three stones ahead; the right one is at + step. */
  stones: number[];
  /** The stone with the carrot, or null. */
  carrot: number | null;
  phase: Phase;
  /** Seconds left before the jump (wait) or of the jump (jump). */
  timer: number;
  waitSeconds: number;
  /** Number where the jump started (the picture flies between). */
  from: number;
  /** The number line shown: numbers lo … hi across the screen (eases after every jump). */
  lo: number;
  hi: number;
  lineY: number;
  lineLeft: number;
  lineRight: number;
  stoneY: number;
  /** What happened at the last landing, and when. */
  lastLanding: 'ate' | 'missed' | null;
  landedAt: number;
  jumps: number;
  score: number;
  time: number;
}

export const JUMP_SECONDS = 0.6;
export const STONE_RADIUS = 44;
const WAIT_START = 2.8;
const WAIT_END = 1.9;
/** Stones are this far from the screen's edges. */
const EDGE = 60;

/** The jump for the n-th hop: +2 four times, +5 four times, +10 four times, then any of them. */
export function stepFor(n: number, rng: Rng): number {
  if (n < 4) return 2;
  if (n < 8) return 5;
  if (n < 12) return 10;
  return rng.pick([2, 5, 10] as const);
}

/** The three stones ahead: the right landing among two near misses, spaced so each stone is easy to tap. */
export function stonesFor(at: number, step: number, rng: Rng): number[] {
  const spacing = step === 2 ? 1 : 2;
  const shapes: readonly (readonly number[])[] = [
    [-2, -1, 0],
    [-1, 0, 1],
    [0, 1, 2],
  ];
  const ahead = [0, 1, 2];
  const shape = shapes[rng.int(0, shapes.length - 1)] ?? ahead;
  const stones = shape.map((k) => at + step + k * spacing);
  // Every stone ahead of the kangaroo (a short +2 leaves no room behind the landing).
  return stones.every((n) => n > at) ? stones : ahead.map((k) => at + step + k * spacing);
}

/** x of a number on the line as shown now. */
export function numberX(state: KangarooState, n: number): number {
  return state.lineLeft + ((n - state.lo) / (state.hi - state.lo)) * (state.lineRight - state.lineLeft);
}

/** Where a stone is drawn: over its number; when stones stand close (+10 on a narrow screen) the middle one sits higher. */
export function stonePos(state: KangarooState, n: number): Point {
  const i = state.stones.indexOf(n);
  const a = state.stones[0];
  const b = state.stones[1];
  const tight = a !== undefined && b !== undefined && Math.abs(numberX(state, b) - numberX(state, a)) < 2 * STONE_RADIUS + 16;
  return { x: numberX(state, n), y: state.stoneY - (tight && i === 1 ? STONE_RADIUS * 2 + 6 : 0) };
}

export function createKangarooHop({ arena, duration, rng }: GameSetup): MinigameLogic<KangarooState> {
  const events = eventQueue();
  const lineY = arena.height - Math.max(170, (arena.height - HUD_SAFE_TOP) * 0.3);
  const state: KangarooState = {
    at: rng.int(0, 8),
    step: 2,
    stones: [],
    carrot: null,
    phase: 'wait',
    timer: WAIT_START,
    waitSeconds: WAIT_START,
    from: 0,
    lo: 0,
    hi: 10,
    lineY,
    lineLeft: EDGE,
    lineRight: arena.width - EDGE,
    stoneY: lineY - 120,
    lastLanding: null,
    landedAt: -9,
    jumps: 0,
    score: 0,
    time: 0,
  };
  // What the line eases toward.
  let target = { lo: 0, hi: 10 };

  function aim(): void {
    state.step = stepFor(state.jumps, rng);
    if (state.at + state.step + 4 > 100) state.at = rng.int(0, 6);
    state.stones = stonesFor(state.at, state.step, rng);
    const top = Math.max(...state.stones);
    // The kangaroo near the left, the farthest stone near the right.
    target = { lo: state.at - 0.8, hi: top + 0.8 };
    state.carrot = null;
    state.phase = 'wait';
    state.waitSeconds = WAIT_START + (WAIT_END - WAIT_START) * Math.min(1, state.time / duration);
    state.timer = state.waitSeconds;
  }
  aim();
  state.lo = target.lo;
  state.hi = target.hi;

  const stoneAt = (p: Point): number | null => {
    let best: number | null = null;
    let bestD = TOUCH_RADIUS + 10;
    for (const n of state.stones) {
      const at = stonePos(state, n);
      const d = Math.hypot(p.x - at.x, p.y - at.y);
      if (d < bestD) {
        best = n;
        bestD = d;
      }
    }
    return best;
  };

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
      // Taps are read against the picture the child saw, before the line moves on.
      if (state.phase === 'wait') {
        for (const p of input.taps) {
          const n = stoneAt(p);
          if (n === null) continue;
          state.carrot = n;
          events.push({ type: 'action', ...stonePos(state, n) });
        }
      }
      const ease = Math.min(1, dt * 5);
      state.lo += (target.lo - state.lo) * ease;
      state.hi += (target.hi - state.hi) * ease;
      state.timer -= dt;
      if (state.phase === 'wait') {
        if (state.timer <= 0) {
          state.phase = 'jump';
          state.timer = JUMP_SECONDS;
          state.from = state.at;
          state.at += state.step;
        }
        return;
      }
      if (state.timer > 0) return;
      // Landed.
      state.jumps += 1;
      state.landedAt = state.time;
      const x = numberX(state, state.at);
      if (state.carrot === state.at) {
        state.score += 1;
        state.lastLanding = 'ate';
        events.push({ type: 'score', x, y: state.lineY - 60, note: 67 + (state.score % 6), voice: 'bell' });
      } else {
        state.lastLanding = 'missed';
        events.push({ type: 'miss', x, y: state.lineY });
      }
      aim();
    },
  };
}

/** Good play: a beat to think, then the carrot on the right stone. */
export function kangarooHopBot(state: KangarooState, _context: BotContext): BotMove {
  if (state.phase !== 'wait' || state.waitSeconds - state.timer < 0.6) return {};
  const right = state.at + state.step;
  if (state.carrot === right || !state.stones.includes(right)) return {};
  return { tap: stonePos(state, right) };
}
