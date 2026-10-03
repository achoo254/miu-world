// Bánh chưng wrap: build a square cake in a wooden mould, step by step as the recipe strip shows. Lay two
// leaves, then rice, beans, pork, beans, rice (tap the ingredient in the tray, or drag it into the mould).
// Fold the four leaf flaps in the order the arrow shows, each by swiping the way it folds (a swipe the wrong
// way springs the leaf open again: just fold again). Tie it with two crossing diagonal swipes. A finished
// cake is a point and goes to the plate. Wrong picks only wobble. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import type { SpriteName } from '../../sprites';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point, type SwipeDirection } from '../../types';

export type Ingredient = 'leaf' | 'rice' | 'beans' | 'meat';
export type Flap = 'top' | 'bottom' | 'left' | 'right';
export type Step = { kind: 'add'; item: Ingredient } | { kind: 'fold'; flap: Flap } | { kind: 'tie' };

export const SPRITE: Readonly<Record<Ingredient, SpriteName>> = { leaf: 'leafy-green', rice: 'cooked-rice', beans: 'beans', meat: 'cut-of-meat' };
export const TRAY_ORDER: readonly Ingredient[] = ['leaf', 'rice', 'beans', 'meat'];
const LAYERS: readonly Ingredient[] = ['leaf', 'leaf', 'rice', 'beans', 'meat', 'beans', 'rice'];
/** The way a swipe goes to fold each flap over the middle. */
export const FOLD_SWIPE: Readonly<Record<Flap, SwipeDirection>> = { top: 'down', bottom: 'up', left: 'right', right: 'left' };

export interface BanhChungState {
  steps: Step[];
  /** Steps done on this cake. */
  done: number;
  /** Diagonal ties made: one each way. */
  ties: { down: boolean; up: boolean };
  mould: Point;
  mouldHalf: number;
  tray: Point[];
  /** The ingredient being dragged and where, or null. */
  dragging: { item: Ingredient; at: Point } | null;
  /** Seconds since a wrong move (a wobble) and since the last right one. */
  wrongAgo: number;
  rightAgo: number;
  /** Seconds since the cake was finished (-1 while making it). */
  finished: number;
  cakes: number;
  score: number;
  time: number;
}

const NEXT = 1.1;
const TRAY_REACH = TOUCH_RADIUS + 25;

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

function recipe(rng: Rng): Step[] {
  const pairs: Array<[Flap, Flap]> = rng.chance(0.5) ? [['top', 'bottom'], ['left', 'right']] : [['left', 'right'], ['top', 'bottom']];
  const folds = pairs.flatMap(([a, b]) => (rng.chance(0.5) ? [a, b] : [b, a]));
  return [...LAYERS.map((item): Step => ({ kind: 'add', item })), ...folds.map((flap): Step => ({ kind: 'fold', flap })), { kind: 'tie' }];
}

/** A diagonal swipe: which way it crosses ('down' for ↘/↖, 'up' for ↗/↙), or null when not diagonal. */
export function diagonal(dx: number, dy: number): 'down' | 'up' | null {
  const big = Math.max(Math.abs(dx), Math.abs(dy));
  if (Math.min(Math.abs(dx), Math.abs(dy)) < big * 0.45) return null;
  return Math.sign(dx) === Math.sign(dy) ? 'down' : 'up';
}

export function createBanhChung({ arena, rng }: GameSetup): MinigameLogic<BanhChungState> {
  const events = eventQueue();
  const trayY = arena.height - 90;
  const mouldHalf = clamp(Math.min(arena.width * 0.24, (trayY - HUD_SAFE_TOP - 200) / 2), 90, 150);
  const gap = Math.min(150, (arena.width - 60) / TRAY_ORDER.length);
  const state: BanhChungState = {
    steps: recipe(rng),
    done: 0,
    ties: { down: false, up: false },
    mould: { x: arena.width / 2, y: HUD_SAFE_TOP + 110 + mouldHalf + Math.max(0, (trayY - HUD_SAFE_TOP - 200 - mouldHalf * 2) / 2) },
    mouldHalf,
    tray: TRAY_ORDER.map((_, i) => ({ x: arena.width / 2 + (i - (TRAY_ORDER.length - 1) / 2) * gap, y: trayY })),
    dragging: null,
    wrongAgo: 9,
    rightAgo: 9,
    finished: -1,
    cakes: 0,
    score: 0,
    time: 0,
  };

  const current = (): Step | undefined => state.steps[state.done];
  const advance = (at: Point): void => {
    state.done += 1;
    state.rightAgo = 0;
    if (state.done >= state.steps.length) {
      state.finished = 0;
      state.score += 1;
      events.push({ type: 'score', x: state.mould.x, y: state.mould.y - 40 });
    } else events.push({ type: 'action', ...at });
  };
  const wrong = (at: Point): void => {
    state.wrongAgo = 0;
    events.push({ type: 'miss', ...at });
  };
  const trayAt = (p: Point): number => state.tray.findIndex((t) => Math.hypot(t.x - p.x, t.y - p.y) < TRAY_REACH);
  const inMould = (p: Point): boolean => Math.abs(p.x - state.mould.x) < state.mouldHalf + 40 && Math.abs(p.y - state.mould.y) < state.mouldHalf + 40;

  function add(item: Ingredient, at: Point): void {
    const step = current();
    if (step?.kind === 'add' && step.item === item) advance(state.mould);
    else wrong(at);
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
      state.wrongAgo += dt;
      state.rightAgo += dt;
      if (state.finished >= 0) {
        state.finished += dt;
        if (state.finished >= NEXT) {
          state.cakes += 1;
          state.steps = recipe(rng);
          state.done = 0;
          state.ties = { down: false, up: false };
          state.finished = -1;
        }
        return;
      }
      // Drag an ingredient from the tray into the mould.
      if (input.pressed && input.pointer) {
        const i = trayAt(input.pointer);
        const item = TRAY_ORDER[i];
        if (item) state.dragging = { item, at: input.pointer };
      }
      if (state.dragging && input.pointer) state.dragging.at = input.pointer;
      if (input.released && state.dragging) {
        const { item, at } = state.dragging;
        state.dragging = null;
        if (inMould(at)) add(item, at);
      }
      for (const tap of input.taps) {
        const item = TRAY_ORDER[trayAt(tap)];
        if (item) add(item, tap);
      }
      for (const s of input.swipes) {
        // A drag out of the tray is not a fold.
        if (trayAt(s.from) >= 0) continue;
        const step = current();
        if (step?.kind === 'fold') {
          if (s.direction === FOLD_SWIPE[step.flap]) advance(state.mould);
          else wrong(state.mould);
        } else if (step?.kind === 'tie') {
          const way = diagonal(s.dx, s.dy);
          if (!way || state.ties[way]) {
            wrong(state.mould);
            continue;
          }
          state.ties[way] = true;
          if (state.ties.down && state.ties.up) advance(state.mould);
          else events.push({ type: 'action', ...state.mould });
        }
      }
    },
  };
}

/** Good play: the next step of the recipe, every time. */
export function banhChungBot(state: BanhChungState, _context: BotContext): BotMove {
  if (state.finished >= 0) return {};
  const step = state.steps[state.done];
  if (!step) return {};
  const { x, y } = state.mould;
  if (step.kind === 'add') {
    const at = state.tray[TRAY_ORDER.indexOf(step.item)];
    return at ? { tap: at } : {};
  }
  if (step.kind === 'fold') {
    const way: Readonly<Record<SwipeDirection, readonly [number, number]>> = { up: [0, -120], down: [0, 120], left: [-120, 0], right: [120, 0] };
    const [dx, dy] = way[FOLD_SWIPE[step.flap]];
    return { swipe: { from: { x: x - dx / 2, y: y - dy / 2 }, dx, dy } };
  }
  return state.ties.down ? { swipe: { from: { x: x + 60, y: y - 60 }, dx: -120, dy: 120 } } : { swipe: { from: { x: x - 60, y: y - 60 }, dx: 120, dy: 120 } };
}
