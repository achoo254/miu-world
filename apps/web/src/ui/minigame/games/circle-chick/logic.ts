// Circle the chick: a chick sits in the middle of a field of hexagon tiles and wants to run off the edge. The
// child taps an empty tile to put up a piece of fence; then the chick takes one step toward the nearest edge
// (now and then it stops to peck). Fence it in so it has no way out: it is caught, a point. If it gets off the
// edge it runs home to the coop and a new field is laid out (nothing is lost). Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const COLS = 7;
export const ROWS = 7;
const START_FENCES = 12;
const PECK_CHANCE = 0.25;
const CHICK_STEP = 0.3;
const RESULT_PAUSE = 1.2;

export type Phase = 'play' | 'chick' | 'caught' | 'escaped';

export interface ChickState {
  fences: boolean[];
  chick: number;
  /** Where the chick stepped from (for the hop), and where it ran out to after escaping. */
  from: number;
  escapeTo: Point | null;
  phase: Phase;
  phaseTime: number;
  r: number;
  origin: Point;
  boards: number;
  lastTapAt: number;
  score: number;
  time: number;
}

/** Neighbours of a tile on the odd-row-shifted hex grid; -1 for "off the field". */
export function neighbours(i: number): number[] {
  const c = i % COLS;
  const r = Math.floor(i / COLS);
  const odd = r % 2 === 1;
  const offsets = odd
    ? [
        [0, -1],
        [1, -1],
        [-1, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ]
    : [
        [-1, -1],
        [0, -1],
        [-1, 0],
        [1, 0],
        [-1, 1],
        [0, 1],
      ];
  return offsets.map(([dc = 0, dr = 0]) => {
    const nc = c + dc;
    const nr = r + dr;
    return nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS ? -1 : nr * COLS + nc;
  });
}

/** Steps from each open tile to off the field (Infinity where there is no way out). */
export function exitDistances(fences: readonly boolean[]): number[] {
  const dist = fences.map(() => Infinity);
  const queue: number[] = [];
  for (let i = 0; i < fences.length; i += 1) {
    if (!fences[i] && neighbours(i).includes(-1)) {
      dist[i] = 1;
      queue.push(i);
    }
  }
  while (queue.length > 0) {
    const i = queue.shift() ?? 0;
    for (const n of neighbours(i)) {
      if (n < 0 || fences[n] || (dist[n] ?? 0) <= (dist[i] ?? 0) + 1) continue;
      dist[n] = (dist[i] ?? 0) + 1;
      queue.push(n);
    }
  }
  return dist;
}

export function tileCentre(state: Pick<ChickState, 'r' | 'origin'>, i: number): Point {
  const c = i % COLS;
  const r = Math.floor(i / COLS);
  const w = Math.sqrt(3) * state.r;
  return { x: state.origin.x + c * w + (r % 2 === 1 ? w / 2 : 0), y: state.origin.y + r * state.r * 1.5 };
}

export function createCircleChick({ arena, rng }: GameSetup): MinigameLogic<ChickState> {
  const events = eventQueue();
  const top = HUD_SAFE_TOP + 20;
  const availW = arena.width - 40;
  const availH = arena.height - top - 30;
  const r = Math.min(56, availW / (Math.sqrt(3) * (COLS + 0.5)), availH / ((ROWS - 1) * 1.5 + 2));
  const boardW = Math.sqrt(3) * r * (COLS + 0.5);
  const boardH = r * ((ROWS - 1) * 1.5 + 2);
  const origin = { x: (arena.width - boardW) / 2 + (Math.sqrt(3) * r) / 2, y: top + (availH - boardH) / 2 + r };
  const centre = Math.floor(ROWS / 2) * COLS + Math.floor(COLS / 2);
  const state: ChickState = { fences: [], chick: centre, from: centre, escapeTo: null, phase: 'play', phaseTime: 0, r, origin, boards: 0, lastTapAt: -1, score: 0, time: 0 };

  function newField(g: Rng): void {
    state.fences = Array.from({ length: COLS * ROWS }, () => false);
    let placed = 0;
    while (placed < START_FENCES) {
      const i = g.int(0, COLS * ROWS - 1);
      if (i === centre || state.fences[i] || neighbours(centre).includes(i)) continue;
      state.fences[i] = true;
      placed += 1;
    }
    state.chick = centre;
    state.from = centre;
    state.escapeTo = null;
    state.phase = 'play';
    state.phaseTime = 0;
  }

  function chickMoves(): void {
    const dist = exitDistances(state.fences);
    if (!Number.isFinite(dist[state.chick] ?? Infinity)) {
      state.phase = 'caught';
      state.phaseTime = 0;
      state.score += 1;
      events.push({ type: 'score', ...tileCentre(state, state.chick) });
      return;
    }
    state.phase = 'chick';
    state.phaseTime = 0;
    state.from = state.chick;
    if (rng.chance(PECK_CHANCE)) return;
    const options = neighbours(state.chick);
    if (options.includes(-1)) {
      // On the edge: off it goes.
      const at = tileCentre(state, state.chick);
      const away = { x: at.x - arena.width / 2, y: at.y - arena.height / 2 };
      const d = Math.hypot(away.x, away.y) || 1;
      state.escapeTo = { x: at.x + (away.x / d) * state.r * 3, y: at.y + (away.y / d) * state.r * 3 };
      state.phase = 'escaped';
      events.push({ type: 'miss', ...at });
      return;
    }
    const open = options.filter((n) => n >= 0 && !state.fences[n]);
    const best = Math.min(...open.map((n) => dist[n] ?? Infinity));
    const steps = open.filter((n) => dist[n] === best);
    state.chick = steps[rng.int(0, steps.length - 1)] ?? state.chick;
  }

  newField(rng);

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
      state.phaseTime += dt;
      if (state.phase === 'caught' || state.phase === 'escaped') {
        if (state.phaseTime >= RESULT_PAUSE) {
          state.boards += 1;
          newField(rng);
        }
        return;
      }
      if (state.phase === 'chick') {
        if (state.phaseTime >= CHICK_STEP) {
          state.phase = 'play';
          state.phaseTime = 0;
          // Fenced in after its step: caught at once.
          if (!Number.isFinite(exitDistances(state.fences)[state.chick] ?? Infinity)) chickMoves();
        }
        return;
      }
      for (const tap of input.taps) {
        let best = -1;
        let bestD = Infinity;
        for (let i = 0; i < state.fences.length; i += 1) {
          const p = tileCentre(state, i);
          const d = Math.hypot(p.x - tap.x, p.y - tap.y);
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        }
        if (best < 0 || bestD > state.r * 1.1 || state.fences[best] || best === state.chick) continue;
        state.fences[best] = true;
        state.lastTapAt = state.time;
        events.push({ type: 'action', ...tileCentre(state, best) });
        chickMoves();
        break;
      }
    },
  };
}

/** The fence that leaves the chick furthest from a way out (and with the fewest ways at that distance). */
export function bestFence(state: ChickState): number {
  let best = -1;
  let bestScore = -Infinity;
  for (let i = 0; i < state.fences.length; i += 1) {
    if (state.fences[i] || i === state.chick) continue;
    const fences = [...state.fences];
    fences[i] = true;
    const dist = exitDistances(fences);
    const d = dist[state.chick] ?? Infinity;
    if (!Number.isFinite(d)) return i;
    const open = neighbours(state.chick).filter((n) => n >= 0 && !fences[n]);
    const ways = open.filter((n) => (dist[n] ?? Infinity) === d - 1).length + (neighbours(state.chick).includes(-1) ? 3 : 0);
    const score = d * 10 - ways;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

/** Good play: a short look, then the fence that hems the chick in most. */
export function circleChickBot(state: ChickState, _context: BotContext): BotMove {
  if (state.phase !== 'play' || state.time - state.lastTapAt < 0.5) return {};
  const i = bestFence(state);
  return i < 0 ? {} : { tap: tileCentre(state, i) };
}
