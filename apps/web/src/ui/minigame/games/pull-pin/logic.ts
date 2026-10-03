// Pull the pin: glass chambers hold coloured balls and mud, held up by pins. Swiping (or tapping) a pin pulls it
// out and whatever was above falls through to where that opening leads: another chamber, the cup at the bottom
// or the bin at the side. Balls all in the cup solve the board (a point, next board); mud in the cup, balls in
// the bin, or balls landing on mud (mixed) spoil it, and it is set again. Boards come from a few shapes,
// sometimes mirrored, each solvable in a known order of pins. Contents leave a chamber through its floor when
// that pin is out (they fall straight down), otherwise through a side. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export type Content = 'balls' | 'mud' | 'mixed' | null;
export type Target = number | 'cup' | 'bin';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PinSpec {
  from: number;
  to: Target;
  /** Which side of the chamber it closes. */
  edge: 'bottom' | 'left' | 'right';
}

export interface Board {
  chambers: { rect: Rect; content: Content }[];
  pins: PinSpec[];
  /** Pins (by index) in an order that solves it. */
  solution: number[];
}

const R = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });
/** The cup and the bin, in board units (0–1 across the board). */
export const CUP = R(0.34, 0.8, 0.32, 0.18);
export const BIN = R(0.8, 0.78, 0.18, 0.2);

export const BOARDS: readonly Board[] = [
  {
    // Two chambers over a funnel: never let the mud into the funnel.
    chambers: [
      { rect: R(0.06, 0.04, 0.34, 0.26), content: 'balls' },
      { rect: R(0.56, 0.04, 0.34, 0.26), content: 'mud' },
      { rect: R(0.3, 0.44, 0.4, 0.2), content: null },
    ],
    pins: [
      { from: 0, to: 2, edge: 'bottom' },
      { from: 1, to: 2, edge: 'bottom' },
      { from: 1, to: 'bin', edge: 'right' },
      { from: 2, to: 'cup', edge: 'bottom' },
    ],
    solution: [2, 0, 3],
  },
  {
    // Balls over mud: empty the mud into the bin and open the floor before the balls come down.
    chambers: [
      { rect: R(0.3, 0.04, 0.4, 0.22), content: 'balls' },
      { rect: R(0.3, 0.38, 0.4, 0.24), content: 'mud' },
    ],
    pins: [
      { from: 1, to: 'cup', edge: 'bottom' },
      { from: 0, to: 1, edge: 'bottom' },
      { from: 1, to: 'bin', edge: 'right' },
    ],
    solution: [2, 0, 1],
  },
  {
    // Two ball chambers and one of mud over a funnel.
    chambers: [
      { rect: R(0.02, 0.04, 0.26, 0.24), content: 'balls' },
      { rect: R(0.34, 0.04, 0.26, 0.24), content: 'balls' },
      { rect: R(0.66, 0.04, 0.26, 0.24), content: 'mud' },
      { rect: R(0.2, 0.44, 0.48, 0.2), content: null },
    ],
    pins: [
      { from: 2, to: 3, edge: 'bottom' },
      { from: 0, to: 3, edge: 'bottom' },
      { from: 3, to: 'cup', edge: 'bottom' },
      { from: 1, to: 3, edge: 'bottom' },
      { from: 2, to: 'bin', edge: 'right' },
    ],
    solution: [4, 1, 3, 2],
  },
];

export interface Fall {
  content: Content;
  from: Point;
  to: Point;
  age: number;
}

export interface PinState {
  board: number;
  mirrored: boolean;
  chambers: { rect: Rect; content: Content }[];
  pins: (PinSpec & { pulled: boolean; pulledAgo: number })[];
  inCup: Content;
  inBin: Content;
  falls: Fall[];
  /** The board's box on screen (arena units). */
  box: Rect;
  /** 'play', or how the board ended and how long ago. */
  result: 'play' | 'solved' | 'spoiled';
  resultAgo: number;
  /** Pins pulled so far on this board, in order (for the bot). */
  pulled: number[];
  solved: number;
  score: number;
  time: number;
}

const FALL_SECONDS = 0.45;
const RESULT_SECONDS = 1.3;

export function createPullPin({ arena, rng }: GameSetup): MinigameLogic<PinState> {
  const events = eventQueue();
  const w = Math.min(arena.width - 40, 560);
  const h = Math.min(arena.height - HUD_SAFE_TOP - 40, 620, w * 1.25);
  const box = { x: (arena.width - w) / 2, y: HUD_SAFE_TOP + 20 + (arena.height - HUD_SAFE_TOP - 40 - h) / 2, w, h };
  const state: PinState = { board: 0, mirrored: false, chambers: [], pins: [], inCup: null, inBin: null, falls: [], box, result: 'play', resultAgo: 0, pulled: [], solved: 0, score: 0, time: 0 };
  let order: number[] = [];

  function setBoard(index: number, mirrored: boolean): void {
    const board = BOARDS[index] ?? BOARDS[0];
    if (!board) return;
    state.board = index;
    state.mirrored = mirrored;
    const flip = (r: Rect): Rect => (mirrored ? { ...r, x: 1 - r.x - r.w } : r);
    state.chambers = board.chambers.map((c) => ({ rect: flip(c.rect), content: c.content }));
    state.pins = board.pins.map((p) => ({ ...p, edge: mirrored && p.edge !== 'bottom' ? (p.edge === 'left' ? 'right' : 'left') : p.edge, pulled: false, pulledAgo: 99 }));
    state.inCup = null;
    state.inBin = null;
    state.falls = [];
    state.result = 'play';
    state.pulled = [];
  }

  function nextBoard(): void {
    if (order.length === 0) order = [0, 1, 2].sort(() => rng.next() - 0.5);
    setBoard(order.pop() ?? 0, rng.chance(0.5));
  }

  /** Lets everything fall through open pins until nothing moves; then judges the board. */
  function settle(): void {
    for (let guard = 0; guard < 10; guard += 1) {
      let moved = false;
      state.chambers.forEach((c, i) => {
        if (!c.content) return;
        // Through the floor if it is open (falling straight down), else out of a side.
        const open = state.pins.filter((p) => p.from === i && p.pulled);
        const pin = open.find((p) => p.edge === 'bottom') ?? open[0];
        if (!pin) return;
        const content = c.content;
        c.content = null;
        state.falls.push({ content, from: centreOf(state, c.rect), to: targetPoint(state, pin.to), age: 0 });
        moved = true;
        if (pin.to === 'cup') state.inCup = mix(state.inCup, content);
        else if (pin.to === 'bin') state.inBin = mix(state.inBin, content);
        else {
          const target = state.chambers[pin.to];
          if (target) target.content = mix(target.content, content);
        }
      });
      if (!moved) break;
    }
    const spoiled = state.inCup === 'mud' || state.inCup === 'mixed' || state.inBin === 'balls' || state.inBin === 'mixed' || state.chambers.some((c) => c.content === 'mixed');
    const done = !spoiled && state.inCup === 'balls' && !state.chambers.some((c) => c.content === 'balls');
    if (spoiled) {
      state.result = 'spoiled';
      state.resultAgo = 0;
      events.push({ type: 'hit', x: box.x + box.w / 2, y: box.y + box.h * 0.85 });
    } else if (done) {
      state.result = 'solved';
      state.resultAgo = 0;
      state.score += 1;
      state.solved += 1;
      events.push({ type: 'score', x: box.x + box.w / 2, y: box.y + box.h * 0.8 });
    }
  }

  function pull(i: number): void {
    const pin = state.pins[i];
    if (!pin || pin.pulled || state.result !== 'play') return;
    pin.pulled = true;
    pin.pulledAgo = 0;
    state.pulled.push(i);
    const at = pinSegment(state, pin);
    events.push({ type: 'action', x: at.handle.x, y: at.handle.y });
    settle();
  }

  const pinAt = (p: Point): number => {
    let best = -1;
    let bestD = TOUCH_RADIUS * 1.2;
    state.pins.forEach((pin, i) => {
      if (pin.pulled) return;
      const { a, b, handle } = pinSegment(state, pin);
      const d = Math.min(distanceToSegment(p, a, b), Math.hypot(p.x - handle.x, p.y - handle.y));
      if (d < bestD) {
        best = i;
        bestD = d;
      }
    });
    return best;
  };

  nextBoard();

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
      for (const f of state.falls) f.age += dt;
      state.falls = state.falls.filter((f) => f.age < FALL_SECONDS);
      for (const p of state.pins) p.pulledAgo += dt;
      if (state.result !== 'play') {
        state.resultAgo += dt;
        if (state.resultAgo >= RESULT_SECONDS) {
          if (state.result === 'solved') nextBoard();
          else setBoard(state.board, state.mirrored);
        }
        return;
      }
      for (const s of input.swipes) pull(pinAt(s.from));
      for (const t of input.taps) pull(pinAt(t));
    },
  };
}

function mix(a: Content, b: Content): Content {
  if (!a) return b;
  if (!b || a === b) return a;
  return 'mixed';
}

export const toArena = (state: Pick<PinState, 'box'>, r: Rect): Rect => ({ x: state.box.x + r.x * state.box.w, y: state.box.y + r.y * state.box.h, w: r.w * state.box.w, h: r.h * state.box.h });

export function centreOf(state: Pick<PinState, 'box'>, r: Rect): Point {
  const a = toArena(state, r);
  return { x: a.x + a.w / 2, y: a.y + a.h / 2 };
}

export function targetRect(state: Pick<PinState, 'box' | 'mirrored' | 'chambers'>, to: Target): Rect {
  if (to === 'cup') return CUP;
  if (to === 'bin') return state.mirrored ? { ...BIN, x: 1 - BIN.x - BIN.w } : BIN;
  return state.chambers[to]?.rect ?? CUP;
}

export const targetPoint = (state: Pick<PinState, 'box' | 'mirrored' | 'chambers'>, to: Target): Point => centreOf(state, targetRect(state, to));

/** A pin's bar across its opening and the handle the child grabs, in arena units. */
export function pinSegment(state: Pick<PinState, 'box' | 'chambers'>, pin: PinSpec): { a: Point; b: Point; handle: Point } {
  const r = toArena(state, state.chambers[pin.from]?.rect ?? CUP);
  if (pin.edge === 'bottom') return { a: { x: r.x - 14, y: r.y + r.h + 6 }, b: { x: r.x + r.w + 14, y: r.y + r.h + 6 }, handle: { x: r.x + r.w + 30, y: r.y + r.h + 6 } };
  const x = pin.edge === 'right' ? r.x + r.w + 6 : r.x - 6;
  const dir = pin.edge === 'right' ? 1 : -1;
  return { a: { x, y: r.y + r.h * 0.3 }, b: { x, y: r.y + r.h + 10 }, handle: { x: x + dir * 22, y: r.y + r.h * 0.3 - 18 } };
}

function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
}

/** Good play: knows each board's order and pulls the next pin of it, a moment after the last. */
export function pullPinBot(state: PinState, _context: BotContext): BotMove {
  if (state.result !== 'play' || state.falls.length > 0 || Math.floor(state.time * 10) % 4 !== 0) return {};
  const solution = BOARDS[state.board]?.solution ?? [];
  const next = solution.find((i) => !state.pulled.includes(i));
  const pin = next === undefined ? undefined : state.pins[next];
  if (!pin) return {};
  const { a, b } = pinSegment(state, pin);
  return { tap: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
}
