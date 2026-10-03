// Bat echo: a little bat in a dark cave maze. A quick tap makes it squeak: the cave walls around it light up
// for a moment and fade. Dragging leads the bat (it flies toward the finger at its own speed). Bumping a wall
// stuns it for a second. Reaching the moonlit way out is a point and the next cave is a little bigger.
// Mazes are made by a random walk that knocks through walls, so there is always exactly one way.
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const BAT_RADIUS = 16;
const WALL = 4;
const SPEED = 230;
const STUN_SECONDS = 1;
export const ECHO_SECONDS = 1.3;
export const ECHO_RADIUS = 280;
const NEXT_SECONDS = 1;

export interface Segment {
  a: Point;
  b: Point;
}

export interface Cave {
  cols: number;
  rows: number;
  cell: number;
  left: number;
  top: number;
  /** Open passages: `${i},${j}` for neighbouring cells i < j. */
  open: Set<string>;
  walls: Segment[];
  exit: number;
}

export interface EchoState {
  cave: Cave;
  bat: Point;
  /** Seconds since the last squeak (walls glow while it is short). */
  echoAgo: number;
  echoAt: Point;
  stunned: number;
  /** Seconds since the bat flew out (the next cave comes), -1 inside. */
  out: number;
  caves: number;
  score: number;
  time: number;
}

const key = (i: number, j: number): string => (i < j ? `${i},${j}` : `${j},${i}`);

export function makeCave(rng: Rng, arenaW: number, arenaH: number, level: number): Cave {
  const want = Math.max(96, 150 - level * 12);
  const cols = Math.max(3, Math.floor((arenaW - 40) / want));
  const rows = Math.max(3, Math.floor((arenaH - HUD_SAFE_TOP - 40) / want));
  const cell = Math.min((arenaW - 40) / cols, (arenaH - HUD_SAFE_TOP - 40) / rows);
  const left = (arenaW - cols * cell) / 2;
  const top = HUD_SAFE_TOP + 20 + (arenaH - HUD_SAFE_TOP - 40 - rows * cell) / 2;
  const open = new Set<string>();
  const seen = new Set<number>([0]);
  const stack = [0];
  while (stack.length > 0) {
    const i = stack[stack.length - 1] ?? 0;
    const r = Math.floor(i / cols);
    const c = i % cols;
    const next = [r > 0 ? i - cols : -1, r < rows - 1 ? i + cols : -1, c > 0 ? i - 1 : -1, c < cols - 1 ? i + 1 : -1].filter((n) => n >= 0 && !seen.has(n));
    if (next.length === 0) {
      stack.pop();
      continue;
    }
    const n = next[rng.int(0, next.length - 1)] ?? 0;
    open.add(key(i, n));
    seen.add(n);
    stack.push(n);
  }
  const walls: Segment[] = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const i = r * cols + c;
      const x = left + c * cell;
      const y = top + r * cell;
      if (c === cols - 1 || !open.has(key(i, i + 1))) walls.push({ a: { x: x + cell, y }, b: { x: x + cell, y: y + cell } });
      if (r === rows - 1 || !open.has(key(i, i + cols))) walls.push({ a: { x, y: y + cell }, b: { x: x + cell, y: y + cell } });
      if (c === 0) walls.push({ a: { x, y }, b: { x, y: y + cell } });
      if (r === 0) walls.push({ a: { x, y }, b: { x: x + cell, y } });
    }
  }
  return { cols, rows, cell, left, top, open, walls, exit: cols * rows - 1 };
}

export function cellCentre(cave: Cave, i: number): Point {
  return { x: cave.left + ((i % cave.cols) + 0.5) * cave.cell, y: cave.top + (Math.floor(i / cave.cols) + 0.5) * cave.cell };
}

export function cellOf(cave: Cave, p: Point): number {
  const c = Math.max(0, Math.min(cave.cols - 1, Math.floor((p.x - cave.left) / cave.cell)));
  const r = Math.max(0, Math.min(cave.rows - 1, Math.floor((p.y - cave.top) / cave.cell)));
  return r * cave.cols + c;
}

function distanceToSegment(p: Point, s: Segment): number {
  const dx = s.b.x - s.a.x;
  const dy = s.b.y - s.a.y;
  const t = Math.max(0, Math.min(1, ((p.x - s.a.x) * dx + (p.y - s.a.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(p.x - (s.a.x + dx * t), p.y - (s.a.y + dy * t));
}

export const hitsWall = (cave: Cave, p: Point): boolean => cave.walls.some((w) => distanceToSegment(p, w) < BAT_RADIUS + WALL);

/** Cells from `from` to the exit through open passages. */
export function route(cave: Cave, from: number): number[] {
  const prev = new Map<number, number>([[from, -1]]);
  const queue = [from];
  while (queue.length > 0) {
    const i = queue.shift() ?? 0;
    if (i === cave.exit) break;
    const r = Math.floor(i / cave.cols);
    const c = i % cave.cols;
    for (const n of [r > 0 ? i - cave.cols : -1, r < cave.rows - 1 ? i + cave.cols : -1, c > 0 ? i - 1 : -1, c < cave.cols - 1 ? i + 1 : -1]) {
      if (n < 0 || prev.has(n) || !cave.open.has(key(i, n))) continue;
      prev.set(n, i);
      queue.push(n);
    }
  }
  const path: number[] = [];
  for (let i: number | undefined = cave.exit; i !== undefined && i >= 0; i = prev.get(i)) path.unshift(i);
  return path[0] === from ? path : [from];
}

export function createBatEcho({ arena, rng }: GameSetup): MinigameLogic<EchoState> {
  const events = eventQueue();
  const first = makeCave(rng, arena.width, arena.height, 0);
  const state: EchoState = { cave: first, bat: cellCentre(first, 0), echoAgo: 9, echoAt: cellCentre(first, 0), stunned: 0, out: -1, caves: 1, score: 0, time: 0 };

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
      state.echoAgo += dt;
      if (state.out >= 0) {
        state.out += dt;
        if (state.out >= NEXT_SECONDS) {
          state.cave = makeCave(rng, arena.width, arena.height, state.caves);
          state.caves += 1;
          state.bat = cellCentre(state.cave, 0);
          state.out = -1;
          state.echoAgo = 0;
          state.echoAt = state.bat;
        }
        return;
      }
      if (input.taps.length > 0) {
        state.echoAgo = 0;
        state.echoAt = { ...state.bat };
        events.push({ type: 'action', x: state.bat.x, y: state.bat.y, note: 96, voice: 'whistle' });
      }
      if (state.stunned > 0) {
        state.stunned = Math.max(0, state.stunned - dt);
        return;
      }
      const p = input.pointer;
      if (p) {
        const dx = p.x - state.bat.x;
        const dy = p.y - state.bat.y;
        const d = Math.hypot(dx, dy);
        if (d > 2) {
          const s = Math.min(d, SPEED * dt);
          const next = { x: state.bat.x + (dx / d) * s, y: state.bat.y + (dy / d) * s };
          if (hitsWall(state.cave, next)) {
            state.stunned = STUN_SECONDS;
            state.bat = { x: state.bat.x - (dx / d) * 6, y: state.bat.y - (dy / d) * 6 };
            if (hitsWall(state.cave, state.bat)) state.bat = cellCentre(state.cave, cellOf(state.cave, state.bat));
            events.push({ type: 'hit', x: next.x, y: next.y });
          } else state.bat = next;
        }
      }
      const exit = cellCentre(state.cave, state.cave.exit);
      if (Math.hypot(state.bat.x - exit.x, state.bat.y - exit.y) < state.cave.cell * 0.3) {
        state.score += 1;
        state.out = 0;
        events.push({ type: 'score', x: exit.x, y: exit.y });
      }
    },
  };
}

/** Good play: squeaks now and then and flies cell by cell along the way out. */
export function batEchoBot(state: EchoState, _context: BotContext): BotMove {
  if (state.out >= 0 || state.stunned > 0) return {};
  if (state.echoAgo > 2.5) return { tap: state.bat };
  const here = cellOf(state.cave, state.bat);
  const path = route(state.cave, here);
  const centre = cellCentre(state.cave, here);
  const next = path[1];
  if (next === undefined) return { touch: centre };
  // Go on toward the next cell when lined up with it; otherwise first back to the middle of this one.
  const to = cellCentre(state.cave, next);
  const lined = Math.abs(to.x - centre.x) > 1 ? Math.abs(state.bat.y - centre.y) < 4 : Math.abs(state.bat.x - centre.x) < 4;
  const target = lined ? next : here;
  return { touch: cellCentre(state.cave, target) };
}
