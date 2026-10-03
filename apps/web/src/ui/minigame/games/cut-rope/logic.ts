// Cut the rope: a candy hangs on one or two ropes from pegs; a hungry frog sits below. A swipe across a rope
// (or a finger dragged across it) cuts it; with no rope left the candy flies off with its swing. Into the
// frog's mouth: a point and the next level; out of the box: the level is set up again. Every level is built
// by simulating a winning cut first and putting the frog where that candy lands, so each has an answer that
// comes round again every swing. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface Rope {
  anchor: Point;
  length: number;
}

export interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface Level {
  ropes: Rope[];
  start: Body;
  frog: Point;
  /** The rope the answer cuts first when there are two. */
  firstCut: number;
}

export interface CutRopeState {
  box: { left: number; top: number; width: number; height: number };
  level: Level;
  ropes: Rope[];
  candy: Body;
  /** Seconds since the candy was eaten / lost (-1 while in play). */
  eaten: number;
  lost: number;
  /** Cut ropes fading out: where they hung. */
  snapped: Array<{ from: Point; to: Point; t: number }>;
  levels: number;
  score: number;
  time: number;
}

export const GRAVITY = 1400;
const DAMPING = 0.9995;
export const MOUTH = 62;
const NEXT = 1.1;
const RESET = 0.8;
const STEP = 1 / 60;
/** A level's right moment must add up to at least this many steps (a fifth of a second) in four seconds. */
const MIN_WINDOW_STEPS = 14;

/** One physics step of the candy on its ropes (shared by the game, the level maker and the bot). */
export function stepCandy(candy: Body, ropes: readonly Rope[], dt: number): void {
  candy.vy += GRAVITY * dt;
  candy.vx *= DAMPING;
  candy.vy *= DAMPING;
  candy.x += candy.vx * dt;
  candy.y += candy.vy * dt;
  for (let k = 0; k < 3; k += 1) {
    for (const rope of ropes) {
      const dx = candy.x - rope.anchor.x;
      const dy = candy.y - rope.anchor.y;
      const d = Math.hypot(dx, dy);
      if (d <= rope.length || d === 0) continue;
      const nx = dx / d;
      const ny = dy / d;
      candy.x = rope.anchor.x + nx * rope.length;
      candy.y = rope.anchor.y + ny * rope.length;
      const out = candy.vx * nx + candy.vy * ny;
      if (out > 0) {
        candy.vx -= out * nx;
        candy.vy -= out * ny;
      }
    }
  }
}

/** Where a free candy reaches the mouth line, or null if it leaves the box first. */
function flight(candy: Body, ropes: readonly Rope[], frogY: number, box: CutRopeState['box'], seconds: number, frog?: Point): Point | null {
  const c = { ...candy };
  for (let t = 0; t < seconds; t += STEP) {
    stepCandy(c, ropes, STEP);
    if (frog && Math.hypot(c.x - frog.x, c.y - frog.y) < MOUTH) return { x: c.x, y: c.y };
    if (!frog && c.y >= frogY && c.vy > 0) return { x: c.x, y: c.y };
    if (c.y > box.top + box.height + 40 || c.x < box.left - 40 || c.x > box.left + box.width + 40) return null;
  }
  return null;
}

/** Steps (in the first four seconds after the first cut) at which cutting the last rope feeds the frog. */
function windowSteps(start: Body, ropes: readonly Rope[], firstCut: number, frog: Point, box: CutRopeState['box']): number {
  const candy = { ...start };
  const left = firstCut >= 0 ? ropes.filter((_, i) => i !== firstCut) : [...ropes];
  let hits = 0;
  for (let t = 0; t < 4; t += STEP) {
    stepCandy(candy, left, STEP);
    if (flight(candy, [], 0, box, 3, frog)) hits += 1;
  }
  return hits;
}

function makeLevel(rng: Rng, box: CutRopeState['box'], index: number): Level {
  const frogY = box.top + box.height - 70;
  const anchorY = box.top + 30;
  for (;;) {
    const two = index > 0 && rng.chance(0.55);
    let ropes: Rope[];
    let start: Body;
    let firstCut = 0;
    if (!two) {
      const anchor = { x: box.left + box.width * rng.range(0.3, 0.7), y: anchorY };
      const length = Math.min(box.height * 0.45, rng.range(170, 250));
      const angle = rng.range(0.55, 0.95) * (rng.chance(0.5) ? 1 : -1);
      ropes = [{ anchor, length }];
      start = { x: anchor.x + Math.sin(angle) * length, y: anchor.y + Math.cos(angle) * length, vx: 0, vy: 0 };
    } else {
      const a = { x: box.left + box.width * rng.range(0.12, 0.3), y: anchorY + rng.range(0, 40) };
      const b = { x: box.left + box.width * rng.range(0.7, 0.88), y: anchorY + rng.range(0, 40) };
      start = { x: a.x + (b.x - a.x) * rng.range(0.35, 0.65), y: anchorY + Math.min(box.height * 0.4, rng.range(150, 220)), vx: 0, vy: 0 };
      ropes = [a, b].map((anchor) => ({ anchor, length: Math.hypot(start.x - anchor.x, start.y - anchor.y) }));
      firstCut = rng.int(0, 1);
    }
    // The swing on the last rope stays inside the box (it swings as far out on both sides).
    const last = ropes[two ? 1 - firstCut : 0];
    if (!last) continue;
    const reach = Math.abs(start.x - last.anchor.x);
    if (last.anchor.x - reach < box.left + 30 || last.anchor.x + reach > box.left + box.width - 30) continue;
    // Try the answer: (cut the first rope,) let it swing, cut the last one at some moment.
    const candy = { ...start };
    let left = [...ropes];
    if (two) {
      left = ropes.filter((_, i) => i !== firstCut);
      for (let t = 0; t < 0.2; t += STEP) stepCandy(candy, ropes, STEP);
    }
    const landings: Point[] = [];
    for (let t = 0; t < 4; t += STEP) {
      stepCandy(candy, left, STEP);
      if (Math.round(t / STEP) % 3 !== 0 || t < 0.3) continue;
      const land = flight(candy, [], frogY, box, 3);
      if (land && land.x > box.left + 70 && land.x < box.left + box.width - 70) landings.push(land);
    }
    // Of a few places it can land, the frog sits where the right moment comes round most often.
    let best: { frog: Point; hits: number } | null = null;
    for (let k = 0; k < 5 && landings.length > 0; k += 1) {
      const land = landings[rng.int(0, landings.length - 1)];
      if (!land) continue;
      const frog = { x: land.x, y: frogY };
      const hits = windowSteps(start, ropes, two ? firstCut : -1, frog, box);
      if (!best || hits > best.hits) best = { frog, hits };
    }
    if (best && best.hits >= MIN_WINDOW_STEPS) return { ropes, start, frog: best.frog, firstCut };
  }
}

const crosses = (p1: Point, p2: Point, q1: Point, q2: Point): boolean => {
  const d = (a: Point, b: Point, c: Point): number => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  return d(p1, p2, q1) * d(p1, p2, q2) < 0 && d(q1, q2, p1) * d(q1, q2, p2) < 0;
};

export function createCutRope({ arena, rng }: GameSetup): MinigameLogic<CutRopeState> {
  const events = eventQueue();
  const width = Math.min(arena.width - 40, 620);
  const height = Math.min(arena.height - HUD_SAFE_TOP - 30, 760);
  const box = { left: (arena.width - width) / 2, top: HUD_SAFE_TOP + 10 + (arena.height - HUD_SAFE_TOP - 30 - height) / 2, width, height };
  const first = makeLevel(rng, box, 0);
  const state: CutRopeState = { box, level: first, ropes: [...first.ropes], candy: { ...first.start }, eaten: -1, lost: -1, snapped: [], levels: 0, score: 0, time: 0 };
  let lastPointer: Point | null = null;

  const setUp = (): void => {
    state.ropes = [...state.level.ropes];
    state.candy = { ...state.level.start };
    state.eaten = -1;
    state.lost = -1;
  };

  function cut(a: Point, b: Point): void {
    const keep: Rope[] = [];
    for (const rope of state.ropes) {
      if (crosses(a, b, rope.anchor, state.candy)) {
        state.snapped.push({ from: rope.anchor, to: { x: state.candy.x, y: state.candy.y }, t: 0 });
        events.push({ type: 'action', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
      } else keep.push(rope);
    }
    state.ropes = keep;
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
      for (const s of state.snapped) s.t += dt;
      state.snapped = state.snapped.filter((s) => s.t < 0.5);
      if (state.eaten >= 0) {
        state.eaten += dt;
        if (state.eaten >= NEXT) {
          state.levels += 1;
          state.level = makeLevel(rng, box, state.levels);
          setUp();
        }
        return;
      }
      if (state.lost >= 0) {
        state.lost += dt;
        if (state.lost >= RESET) setUp();
        return;
      }
      for (const s of input.swipes) cut(s.from, { x: s.from.x + s.dx, y: s.from.y + s.dy });
      if (input.pointer && lastPointer) cut(lastPointer, input.pointer);
      lastPointer = input.pointer;

      stepCandy(state.candy, state.ropes, dt);
      const { frog } = state.level;
      if (Math.hypot(state.candy.x - frog.x, state.candy.y - frog.y) < MOUTH) {
        state.eaten = 0;
        state.score += 1;
        events.push({ type: 'score', x: frog.x, y: frog.y - 40 });
      } else if (state.ropes.length === 0 && (state.candy.y > box.top + box.height + 40 || state.candy.x < box.left - 60 || state.candy.x > box.left + box.width + 60)) {
        state.lost = 0;
        events.push({ type: 'miss', x: Math.min(box.left + box.width, Math.max(box.left, state.candy.x)), y: box.top + box.height });
      }
    },
  };
}

/** Good play: on two ropes, cut the one the answer cuts first; on one, cut when the flight ends in the mouth. */
export function cutRopeBot(state: CutRopeState, _context: BotContext): BotMove {
  if (state.eaten >= 0 || state.lost >= 0 || state.ropes.length === 0) return {};
  const swipeAcross = (rope: Rope): BotMove => {
    const dx = state.candy.x - rope.anchor.x;
    const dy = state.candy.y - rope.anchor.y;
    const d = Math.hypot(dx, dy) || 1;
    // A short stroke across the rope near its peg, clear of any other rope.
    for (const along of [0.3, 0.15, 0.5, 0.7]) {
      const at = { x: rope.anchor.x + dx * along, y: rope.anchor.y + dy * along };
      const from = { x: at.x + (dy / d) * 35, y: at.y - (dx / d) * 35 };
      const to = { x: at.x - (dy / d) * 35, y: at.y + (dx / d) * 35 };
      if (state.ropes.every((other) => other === rope || !crosses(from, to, other.anchor, state.candy))) return { swipe: { from, dx: to.x - from.x, dy: to.y - from.y } };
    }
    return {};
  };
  if (state.ropes.length > 1) {
    const rope = state.ropes.find((r) => r === state.level.ropes[state.level.firstCut]) ?? state.ropes[0];
    return rope ? swipeAcross(rope) : {};
  }
  const rope = state.ropes[0];
  if (!rope) return {};
  // The swipe cuts on the very next step: will the candy, let go now, fly into the mouth?
  return flight(state.candy, [], 0, state.box, 3, state.level.frog) ? swipeAcross(rope) : {};
}
