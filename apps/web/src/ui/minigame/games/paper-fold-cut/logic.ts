// Paper fold and cut: a square of paper is folded in half, in four, in eight or in twelve (a snowflake). A
// picture shows how the paper should look when opened. Three dashed lines are drawn on the folded paper; the
// child swipes along the one whose cut makes that picture (one swipe, one cut: the small piece falls away).
// The paper opens: the same as the picture is a point and a new fold comes; different, both show side by side
// for a moment and she tries again. Unfolding is mirroring: the folded piece copied round by the folds.
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

/** Folds: n = 1 (in half), 2 (in four), 4 (in eight), 6 (in twelve). The paper opens into 2n copies. */
export type Fold = 1 | 2 | 4 | 6;

export interface Cut {
  a: Point;
  b: Point;
  /** The folded piece left after the cut (in the folded paper's own units). */
  kept: Point[];
}

export interface FoldState {
  fold: Fold;
  /** The folded piece before any cut. */
  piece: Point[];
  cuts: Cut[];
  answer: number;
  /** Where the folded paper and the picture are drawn, and their scale (units per paper unit). */
  paper: Point;
  picture: Point;
  scale: number;
  /** Units per paper unit for the folded piece (it fits its half of the screen). */
  paperK: number;
  /** A finished try: which cut, whether right, how long ago. */
  tried: { cut: number; right: boolean; ago: number } | null;
  shapes: number;
  shownAt: number;
  score: number;
  time: number;
}

const RIGHT_SECONDS = 1.3;
const WRONG_SECONDS = 1.6;
const FOLDS: readonly Fold[] = [1, 2, 4, 6];

/** The folded piece for a fold, in paper units (the unfolded paper spans −1 … 1). */
export function pieceFor(fold: Fold): Point[] {
  if (fold === 1)
    return [
      { x: -1, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: -1, y: 1 },
    ];
  if (fold === 2)
    return [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ];
  const a = Math.PI / fold;
  return [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: Math.tan(a) },
  ];
}

export function area(poly: readonly Point[]): number {
  let s = 0;
  for (let i = 0; i < poly.length; i += 1) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    if (p && q) s += p.x * q.y - q.x * p.y;
  }
  return Math.abs(s) / 2;
}

/** The part of a polygon on one side of the line a→b (sign 1 left, -1 right). */
export function clip(poly: readonly Point[], a: Point, b: Point, sign: number): Point[] {
  const side = (p: Point): number => sign * ((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x));
  const out: Point[] = [];
  for (let i = 0; i < poly.length; i += 1) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    if (!p || !q) continue;
    const sp = side(p);
    const sq = side(q);
    if (sp >= 0) out.push(p);
    if (sp * sq < 0) {
      const t = sp / (sp - sq);
      out.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
    }
  }
  return out;
}

/** A cut along a→b: the smaller piece falls away. */
export function cutWith(piece: readonly Point[], a: Point, b: Point): Point[] {
  const left = clip(piece, a, b, 1);
  const right = clip(piece, a, b, -1);
  return area(left) >= area(right) ? left : right;
}

/** A point on the piece's outline, `t` (0–1) of the way round. */
function onOutline(piece: readonly Point[], edge: number, t: number): Point {
  const p = piece[edge % piece.length] ?? { x: 0, y: 0 };
  const q = piece[(edge + 1) % piece.length] ?? p;
  return { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t };
}

/** Three different cuts across the piece, each taking away a fair bit (not a crumb, not most of it). */
export function makeCuts(rng: Rng, piece: readonly Point[]): Cut[] {
  const whole = area(piece);
  const cuts: Cut[] = [];
  for (let attempt = 0; attempt < 400 && cuts.length < 3; attempt += 1) {
    const e1 = rng.int(0, piece.length - 1);
    let e2 = rng.int(0, piece.length - 1);
    if (e2 === e1) e2 = (e1 + 1) % piece.length;
    const a = onOutline(piece, e1, rng.range(0.15, 0.85));
    const b = onOutline(piece, e2, rng.range(0.15, 0.85));
    const kept = cutWith(piece, a, b);
    const removed = 1 - area(kept) / whole;
    if (removed < 0.1 || removed > 0.42) continue;
    const far = cuts.every((c) => Math.min(Math.hypot(c.a.x - a.x, c.a.y - a.y) + Math.hypot(c.b.x - b.x, c.b.y - b.y), Math.hypot(c.a.x - b.x, c.a.y - b.y) + Math.hypot(c.b.x - a.x, c.b.y - a.y)) > 0.45);
    if (far) cuts.push({ a, b, kept });
  }
  return cuts;
}

export function createPaperFoldCut({ arena, rng }: GameSetup): MinigameLogic<FoldState> {
  const events = eventQueue();
  const landscape = arena.width > arena.height * 1.15;
  const top = HUD_SAFE_TOP + 40;
  const scale = landscape ? Math.min(arena.width / 4 - 30, (arena.height - top - 40) / 2.2) : Math.min(arena.width / 2 - 50, (arena.height - top - 60) / 4.6);
  const state: FoldState = {
    fold: 1,
    piece: [],
    cuts: [],
    answer: 0,
    paper: landscape ? { x: arena.width * 0.75, y: top + (arena.height - top) / 2 } : { x: arena.width / 2, y: arena.height - scale * 1.3 - 30 },
    picture: landscape ? { x: arena.width * 0.25, y: top + (arena.height - top) / 2 } : { x: arena.width / 2, y: top + scale * 1.15 + 20 },
    scale,
    paperK: scale,
    tried: null,
    shapes: 0,
    shownAt: 0,
    score: 0,
    time: 0,
  };

  function next(): void {
    const fold = state.shapes < FOLDS.length ? (FOLDS[state.shapes] ?? 2) : (FOLDS[rng.int(0, FOLDS.length - 1)] ?? 2);
    state.fold = fold;
    state.piece = pieceFor(fold);
    const wide = Math.max(...state.piece.map((q) => q.x)) - Math.min(...state.piece.map((q) => q.x));
    state.paperK = Math.min(scale * 1.3, ((landscape ? arena.width * 0.4 : arena.width - 60) / wide), (landscape ? arena.height - top - 60 : scale * 2.3));
    state.cuts = makeCuts(rng, state.piece);
    state.answer = rng.int(0, Math.max(0, state.cuts.length - 1));
    state.tried = null;
    state.shapes += 1;
    state.shownAt = state.time;
  }
  next();

  /** Paper units → arena units for the folded paper (its piece centred on `paper`). */
  const toArena = (p: Point): Point => {
    const xs = state.piece.map((q) => q.x);
    const ys = state.piece.map((q) => q.y);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    return { x: state.paper.x + (p.x - cx) * state.paperK, y: state.paper.y + (p.y - cy) * state.paperK };
  };

  function match(from: Point, to: Point): number {
    const dir = Math.atan2(to.y - from.y, to.x - from.x);
    const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
    let best = -1;
    let bestScore = Infinity;
    state.cuts.forEach((c, i) => {
      const a = toArena(c.a);
      const b = toArena(c.b);
      let turn = Math.abs(dir - Math.atan2(b.y - a.y, b.x - a.x)) % Math.PI;
      turn = Math.min(turn, Math.PI - turn);
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const off = Math.abs((b.x - a.x) * (mid.y - a.y) - (b.y - a.y) * (mid.x - a.x)) / len;
      const score = turn * 100 + off;
      if (turn < 0.6 && off < state.scale * 0.45 && score < bestScore) {
        best = i;
        bestScore = score;
      }
    });
    return best;
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
      if (state.tried) {
        state.tried.ago += dt;
        if (state.tried.right && state.tried.ago >= RIGHT_SECONDS) next();
        else if (!state.tried.right && state.tried.ago >= WRONG_SECONDS) state.tried = null;
        return;
      }
      for (const s of input.swipes) {
        const cut = match(s.from, { x: s.from.x + s.dx, y: s.from.y + s.dy });
        if (cut < 0) continue;
        const right = cut === state.answer;
        state.tried = { cut, right, ago: 0 };
        if (right) {
          state.score += 1;
          events.push({ type: 'score', ...state.picture });
        } else events.push({ type: 'miss', ...state.paper });
        break;
      }
    },
  };
}

/** Good play: looks a moment, then swipes along the cut that makes the picture. */
export function paperFoldCutBot(state: FoldState, _context: BotContext): BotMove {
  if (state.tried || state.time - state.shownAt < 1) return {};
  const cut = state.cuts[state.answer];
  if (!cut) return {};
  const xs = state.piece.map((q) => q.x);
  const ys = state.piece.map((q) => q.y);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const at = (p: Point): Point => ({ x: state.paper.x + (p.x - cx) * state.paperK, y: state.paper.y + (p.y - cy) * state.paperK });
  const a = at(cut.a);
  const b = at(cut.b);
  return { swipe: { from: a, dx: b.x - a.x, dy: b.y - a.y } };
}
