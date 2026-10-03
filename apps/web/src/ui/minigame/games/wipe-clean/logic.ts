// Wipe clean: a muddy thing comes to the sink (the puppy, a teddy, the toy car…). The child rubs it with her
// finger three times over: soap first (the mud turns to bubbles), then water (the bubbles rinse off), then
// the towel (the drops dry). Each step is done when almost all of it is covered; the next tool comes on its
// own. A thing clean and dry is a point, and the next one comes. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { SpriteName } from '../../sprites';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const THINGS: readonly SpriteName[] = ['dog-face', 'teddy-bear', 'automobile', 'red-apple', 'soccer-ball', 'cat-face', 'bicycle'];
/** Squares across the thing; only those inside its round outline need cleaning. */
export const GRID = 10;
/** Share of the squares a step needs. */
export const ENOUGH = 0.95;
const BRUSH = 62;
const NEXT_STEP = 0.35;
const NEXT_THING = 0.9;

export type Tool = 'soap' | 'water' | 'towel';
export const TOOLS: readonly Tool[] = ['soap', 'water', 'towel'];

export interface WipeState {
  cx: number;
  cy: number;
  size: number;
  thing: number;
  /** Per square: -1 outside the thing, else how many steps it has had (0 muddy … 3 clean and dry). */
  cells: number[];
  /** The step being done (0 soap, 1 water, 2 towel, 3 done). */
  stage: number;
  /** Seconds since the step (or the thing) was finished: a pause before the next. */
  pause: number;
  last: Point | null;
  /** Where the finger is, for the tool picture. */
  finger: Point | null;
  score: number;
  time: number;
}

export function cellCentre(state: WipeState, i: number): Point {
  const cell = state.size / GRID;
  return { x: state.cx - state.size / 2 + ((i % GRID) + 0.5) * cell, y: state.cy - state.size / 2 + (Math.floor(i / GRID) + 0.5) * cell };
}

/** Share of the thing's squares that have had the current step. */
export function progress(state: WipeState): number {
  const inside = state.cells.filter((c) => c >= 0);
  return inside.filter((c) => c > state.stage).length / Math.max(1, inside.length);
}

function freshCells(): number[] {
  const out: number[] = [];
  for (let i = 0; i < GRID * GRID; i += 1) {
    const x = (i % GRID) + 0.5 - GRID / 2;
    const y = Math.floor(i / GRID) + 0.5 - GRID / 2;
    out.push(Math.hypot(x, y) <= GRID * 0.47 ? 0 : -1);
  }
  return out;
}

const distToSegment = (p: Point, a: Point, b: Point): number => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = dx * dx + dy * dy;
  const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len));
  return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
};

export function createWipeClean({ arena, rng }: GameSetup): MinigameLogic<WipeState> {
  const events = eventQueue();
  const size = Math.min(380, arena.width - 80, arena.height - HUD_SAFE_TOP - 210);
  const state: WipeState = {
    cx: arena.width / 2,
    cy: HUD_SAFE_TOP + 130 + size / 2 + Math.max(0, (arena.height - HUD_SAFE_TOP - 210 - size) / 3),
    size,
    thing: rng.int(0, THINGS.length - 1),
    cells: freshCells(),
    stage: 0,
    pause: -1,
    last: null,
    finger: null,
    score: 0,
    time: 0,
  };

  function rub(from: Point, to: Point): void {
    let changed = false;
    state.cells.forEach((c, i) => {
      if (c !== state.stage) return;
      if (distToSegment(cellCentre(state, i), from, to) <= BRUSH) {
        state.cells[i] = c + 1;
        changed = true;
      }
    });
    if (changed && progress(state) >= ENOUGH) {
      // Close enough: the last few squares are done too.
      state.cells = state.cells.map((c) => (c === state.stage ? c + 1 : c));
      state.stage += 1;
      state.pause = 0;
      if (state.stage >= TOOLS.length) {
        state.score += 1;
        events.push({ type: 'score', x: state.cx, y: state.cy - size / 2 });
      } else events.push({ type: 'action', x: state.cx, y: state.cy, note: 67 + state.stage * 4, voice: 'bell' });
    }
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
      state.finger = input.pointer;
      if (state.pause >= 0) {
        state.pause += dt;
        const wait = state.stage >= TOOLS.length ? NEXT_THING : NEXT_STEP;
        if (state.pause < wait) {
          state.last = input.pointer;
          return;
        }
        state.pause = -1;
        if (state.stage >= TOOLS.length) {
          state.thing = (state.thing + 1 + rng.int(0, THINGS.length - 2)) % THINGS.length;
          state.cells = freshCells();
          state.stage = 0;
        }
      }
      const p = input.pointer;
      if (p && state.last && Math.hypot(p.x - state.last.x, p.y - state.last.y) > 1.5) rub(state.last, p);
      state.last = p;
    },
  };
}

/** Good play: rub over the squares still left, in reading order, a quick stroke each tenth of a second. */
export function wipeCleanBot(state: WipeState, _context: BotContext): BotMove {
  if (state.pause >= 0) return {};
  const next = state.cells.findIndex((c) => c === state.stage);
  if (next < 0) return {};
  // Wiggle a little around the square so the finger always moves.
  const p = cellCentre(state, next);
  const wiggle = Math.round(state.time * 10) % 2 === 0 ? 8 : -8;
  return { touch: { x: p.x + wiggle, y: p.y } };
}
