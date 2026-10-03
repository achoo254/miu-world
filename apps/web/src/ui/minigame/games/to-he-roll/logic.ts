// Tò he roll: a customer asks for a dough stick of so many centimetres. The dough lies on a ruler, its left end
// at 0; the child rubs back and forth anywhere on the table to roll it longer (it only grows, never shrinks),
// then taps the knife to cut. Within half a centimetre: the stick becomes a coloured tò he bird for the
// customer (a point) and the next one asks. Too long or too short: the dough is balled up and rolled again;
// no penalty. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import type { SpriteName } from '../../sprites';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface ToHeState {
  /** Asked length (whole cm) and the dough's length now (cm). */
  target: number;
  length: number;
  customer: SpriteName;
  /** Centimetres on the ruler, units per centimetre, where it starts, and its line. */
  maxCm: number;
  perCm: number;
  rulerX: number;
  rulerY: number;
  knife: Point & { r: number };
  /** How far the dough has rolled (turns the stripes). */
  rolled: number;
  /** The last cut: how it went and when (a bird for the customer, or the dough balled up). */
  cut: { result: 'right' | 'long' | 'short'; length: number; ago: number } | null;
  sticks: number;
  /** Where the finger last was (null when lifted): the bot plans its next rub from it. */
  fingerX: number | null;
  lastMoveAt: number;
  score: number;
  time: number;
}

/** The ruler's length on a wide screen; a narrow one shows 13 cm (targets stop at 12). */
export const MAX_CM = 15;
const NARROW_MAX_CM = 13;
export const START_CM = 2;
/** Centimetres the dough grows per arena unit the finger rubs. */
export const GROW_PER_UNIT = 1 / 220;
export const TOLERANCE = 0.5;
const SERVE_SECONDS = 1.3;
const REDO_SECONDS = 1;
const CUSTOMERS: readonly SpriteName[] = ['rabbit', 'fox', 'panda', 'monkey-face', 'cat-face', 'dog-face', 'bear', 'owl'];

function nextTarget(rng: Rng, last: number): number {
  let t = rng.int(3, 12);
  if (t === last) t = t >= 12 ? t - 1 : t + 1;
  return t;
}

export function createToHeRoll({ arena, rng }: GameSetup): MinigameLogic<ToHeState> {
  const events = eventQueue();
  const maxCm = arena.width < 700 ? NARROW_MAX_CM : MAX_CM;
  const perCm = (arena.width - 120) / maxCm;
  const knifeR = 62;
  const state: ToHeState = {
    target: 0,
    length: START_CM,
    customer: 'rabbit',
    maxCm,
    perCm,
    rulerX: 60,
    // Above the knife, which sits in the bottom corner.
    rulerY: Math.min(arena.height - knifeR * 2 - 152, Math.max(HUD_SAFE_TOP + 300, arena.height * 0.55)),
    knife: { x: arena.width - knifeR - 30, y: arena.height - knifeR - 30, r: knifeR },
    rolled: 0,
    cut: null,
    sticks: 0,
    fingerX: null,
    lastMoveAt: 0,
    score: 0,
    time: 0,
  };

  function nextCustomer(): void {
    state.target = nextTarget(rng, state.target);
    state.customer = CUSTOMERS[rng.int(0, CUSTOMERS.length - 1)] ?? 'rabbit';
    state.length = START_CM;
    state.cut = null;
    state.sticks += 1;
    state.lastMoveAt = state.time;
  }
  nextCustomer();

  const onKnife = (p: Point): boolean => Math.hypot(p.x - state.knife.x, p.y - state.knife.y) <= state.knife.r + 12;
  let last: Point | null = null;

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
      state.fingerX = input.pointer?.x ?? null;
      if (state.cut) {
        state.cut.ago += dt;
        if (state.cut.result === 'right' && state.cut.ago >= SERVE_SECONDS) nextCustomer();
        else if (state.cut.result !== 'right' && state.cut.ago >= REDO_SECONDS) {
          state.cut = null;
          state.length = START_CM;
        }
        last = input.pointer;
        return;
      }
      // Rolling: sideways rubbing anywhere but on the knife.
      if (input.pointer && last && !onKnife(input.pointer)) {
        const dx = Math.abs(input.pointer.x - last.x);
        if (dx > 0) {
          state.length = Math.min(maxCm, state.length + dx * GROW_PER_UNIT);
          state.rolled += dx;
          state.lastMoveAt = state.time;
        }
      }
      last = input.pointer;
      for (const p of input.taps) {
        if (!onKnife(p)) continue;
        const off = state.length - state.target;
        const result = Math.abs(off) <= TOLERANCE ? 'right' : off > 0 ? 'long' : 'short';
        state.cut = { result, length: state.length, ago: 0 };
        state.lastMoveAt = state.time;
        const end = { x: state.rulerX + state.length * perCm, y: state.rulerY - 40 };
        if (result === 'right') {
          state.score += 1;
          events.push({ type: 'score', ...end });
        } else events.push({ type: 'miss', ...end });
        break;
      }
    },
  };
}

/** Good play: long rubs while far, shorter ones near the mark, then the knife. */
export function toHeRollBot(state: ToHeState, context: BotContext): BotMove {
  if (state.cut) return {};
  const left = state.target - state.length;
  if (left <= 0.15) return { tap: { x: state.knife.x, y: state.knife.y } };
  const y = state.rulerY - 60;
  const from = state.fingerX ?? context.arena.width / 2;
  if (state.fingerX === null) return { touch: { x: from, y } };
  const stroke = Math.min(300, left / GROW_PER_UNIT);
  // Back and forth across the middle of the table.
  const x = from + stroke > context.arena.width - 160 ? from - stroke : from + stroke;
  return { touch: { x, y } };
}
