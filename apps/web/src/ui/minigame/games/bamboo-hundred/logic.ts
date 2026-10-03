// The hundred-knot bamboo: bamboo knots with numbers lie scattered; the first knot already stands, with the
// counting step beside it (+1, +2, +5 or +10). The child taps the knots in counting order to grow the bamboo;
// a knot that does not come next wobbles and the bamboo rests a moment (so tapping at random does not pay). A whole bamboo calls "khắc nhập!" and a new one starts with the
// next step. Each joined knot is a point. Numbers stay within 100. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

/** Knots in a whole bamboo, the first one standing already. */
export const KNOTS = 8;
const DECOYS = 3;
export const STEPS = [1, 2, 5, 10] as const;
const MAGIC_SECONDS = 1.3;
/** Seconds taps are not taken after a wrong knot. */
export const REST_SECONDS = 1.5;
const NOTES = [60, 62, 64, 67, 69, 72, 74, 76];

export interface Knot {
  value: number;
  x: number;
  y: number;
  /** Joined to the bamboo (flies to the stalk). */
  joined: boolean;
  joinedAt: number;
  wobbleAt: number;
}

export interface BambooState {
  step: number;
  /** The numbers of the bamboo in order (the first is standing). */
  sequence: number[];
  knots: Knot[];
  /** Knots on the stalk (1 … KNOTS). */
  height: number;
  phase: 'grow' | 'magic';
  phaseAgo: number;
  knotW: number;
  knotH: number;
  stalk: { x: number; bottom: number; segment: number };
  bamboos: number;
  lastTapAt: number;
  /** Until this time taps are not taken (after a wrong knot). */
  restUntil: number;
  score: number;
  time: number;
}

/** A counting sequence for this step, every number from 1 to 100. */
export function makeSequence(step: number, rng: Rng): number[] {
  const last = 100 - step * (KNOTS - 1);
  let start: number;
  if (step === 1) start = rng.int(1, last);
  else if (step === 2) start = rng.int(1, last);
  else start = step * rng.int(1, Math.floor(last / step));
  return Array.from({ length: KNOTS }, (_, i) => start + i * step);
}

function shuffle<T>(items: T[], rng: Rng): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = rng.int(0, i);
    const a = items[i];
    const b = items[j];
    if (a !== undefined && b !== undefined) {
      items[i] = b;
      items[j] = a;
    }
  }
  return items;
}

export function createBambooHundred({ arena, rng }: GameSetup): MinigameLogic<BambooState> {
  const events = eventQueue();
  const knotW = Math.min(140, arena.width * 0.22);
  const knotH = 78;
  const stalkX = Math.max(56, arena.width * 0.08);
  const bottom = arena.height - 24;
  const segment = (bottom - HUD_SAFE_TOP - 20) / KNOTS;
  const field = { left: stalkX + 70, right: arena.width - 14, top: HUD_SAFE_TOP + 16, bottom: arena.height - 16 };
  const state: BambooState = {
    step: 1,
    sequence: [],
    knots: [],
    height: 1,
    phase: 'grow',
    phaseAgo: 0,
    knotW,
    knotH,
    stalk: { x: stalkX, bottom, segment },
    bamboos: 0,
    lastTapAt: -9,
    restUntil: 0,
    score: 0,
    time: 0,
  };

  const grow = (): void => {
    const step = STEPS[state.bamboos % STEPS.length] ?? 1;
    state.step = step;
    state.sequence = makeSequence(step, rng);
    const wanted = state.sequence.slice(1);
    const used = new Set(state.sequence);
    const decoys: number[] = [];
    for (let tries = 0; decoys.length < DECOYS && tries < 50; tries += 1) {
      const near = (wanted[rng.int(0, wanted.length - 1)] ?? 10) + rng.pick([-1, 1, 3, -3] as const);
      if (near >= 1 && near <= 100 && !used.has(near)) {
        used.add(near);
        decoys.push(near);
      }
    }
    // Spread the knots over a grid of spots, shuffled, a little jittered.
    const cols = Math.max(2, Math.floor((field.right - field.left) / (knotW + 18)));
    const rows = Math.max(2, Math.floor((field.bottom - field.top) / (knotH + 26)));
    const cellW = (field.right - field.left) / cols;
    const cellH = (field.bottom - field.top) / rows;
    const spots = shuffle(
      Array.from({ length: cols * rows }, (_, i) => ({ x: field.left + ((i % cols) + 0.5) * cellW, y: field.top + (Math.floor(i / cols) + 0.5) * cellH })),
      rng,
    );
    state.knots = [...wanted, ...decoys].map((value, i) => {
      const spot = spots[i % spots.length] ?? { x: arena.width / 2, y: arena.height / 2 };
      return { value, x: spot.x + rng.range(-8, 8), y: spot.y + rng.range(-6, 6), joined: false, joinedAt: 0, wobbleAt: -9 };
    });
    state.height = 1;
    state.phase = 'grow';
    state.phaseAgo = 0;
  };

  const knotAt = (p: Point): Knot | undefined =>
    state.knots.find((k) => !k.joined && Math.abs(p.x - k.x) <= state.knotW / 2 + 10 && Math.abs(p.y - k.y) <= state.knotH / 2 + 12);

  grow();

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
      state.phaseAgo += dt;
      if (state.phase === 'magic') {
        if (state.phaseAgo >= MAGIC_SECONDS) {
          state.bamboos += 1;
          grow();
        }
        return;
      }
      if (state.time < state.restUntil) return;
      for (const tap of input.taps) {
        const knot = knotAt(tap);
        if (!knot) continue;
        state.lastTapAt = state.time;
        if (knot.value === state.sequence[state.height]) {
          knot.joined = true;
          knot.joinedAt = state.time;
          state.height += 1;
          state.score += 1;
          const done = state.height >= KNOTS;
          events.push({ type: 'score', x: knot.x, y: knot.y, note: NOTES[state.height - 1] ?? 76, voice: 'bell' });
          if (done) {
            state.phase = 'magic';
            state.phaseAgo = 0;
          }
        } else {
          knot.wobbleAt = state.time;
          state.restUntil = state.time + REST_SECONDS;
          events.push({ type: 'miss', x: knot.x, y: knot.y });
        }
        break;
      }
    },
  };
}

/** Good play: the next number, a short look between taps. */
export function bambooBot(state: BambooState, _context: BotContext): BotMove {
  if (state.phase !== 'grow' || state.time - state.lastTapAt < 0.35) return {};
  const next = state.sequence[state.height];
  const knot = state.knots.find((k) => !k.joined && k.value === next);
  return knot ? { tap: { x: knot.x, y: knot.y } } : {};
}
