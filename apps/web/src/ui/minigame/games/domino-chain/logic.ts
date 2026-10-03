// Domino chain: on the table a dotted path curves from the first domino to a bell, around piles of books. The
// child drags along the path and dominoes stand up behind her finger, evenly spaced (a drag that starts near a
// domino carries on from it). One set on a book pile topples at once and breaks the line. A tap on a standing
// domino pushes it: each one falling knocks over its neighbours. If the chain reaches the bell, it rings: a point
// and a new path. If it stops at a gap, the child stands more dominoes and pushes again. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface Domino extends Point {
  angle: number;
  /** up → falling → down; broken: toppled where it could not stand. */
  state: 'up' | 'falling' | 'down' | 'broken';
  t: number;
}

export interface Block {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DominoState {
  path: Point[];
  bell: Point;
  blocks: Block[];
  dominoes: Domino[];
  /** Where the next domino goes from, while dragging. */
  anchor: Point | null;
  phase: 'build' | 'rang';
  phaseTime: number;
  paths: number;
  lastTapAt: number;
  score: number;
  time: number;
}

export const GAP = 44;
export const REACH = 64;
const FALL_SECONDS = 0.16;
const RANG_PAUSE = 1.5;

const inBlock = (b: Block, p: Point, margin: number): boolean => p.x > b.x - margin && p.x < b.x + b.w + margin && p.y > b.y - margin && p.y < b.y + b.h + margin;

export function createDominoChain({ arena, rng }: GameSetup): MinigameLogic<DominoState> {
  const events = eventQueue();
  const area = { x: 70, y: HUD_SAFE_TOP + 60, w: arena.width - 140, h: arena.height - HUD_SAFE_TOP - 120 };
  const state: DominoState = { path: [], bell: { x: 0, y: 0 }, blocks: [], dominoes: [], anchor: null, phase: 'build', phaseTime: 0, paths: 0, lastTapAt: -1, score: 0, time: 0 };

  function newPath(r: Rng): void {
    const landscape = area.w >= area.h;
    const s = landscape ? { x: area.x, y: area.y + r.range(0.2, 0.8) * area.h } : { x: area.x + r.range(0.2, 0.8) * area.w, y: area.y };
    const e = landscape ? { x: area.x + area.w, y: area.y + r.range(0.2, 0.8) * area.h } : { x: area.x + r.range(0.2, 0.8) * area.w, y: area.y + area.h };
    // A bend to one side, around a pile of books on the straight line.
    const nx = -(e.y - s.y);
    const ny = e.x - s.x;
    const len = Math.hypot(nx, ny) || 1;
    const bend = (r.chance(0.5) ? 1 : -1) * Math.min(landscape ? area.h : area.w, len) * 0.38;
    const c = { x: (s.x + e.x) / 2 + (nx / len) * bend * 1.3, y: (s.y + e.y) / 2 + (ny / len) * bend * 1.3 };
    const clampIn = (p: Point): Point => ({ x: Math.min(area.x + area.w, Math.max(area.x, p.x)), y: Math.min(area.y + area.h, Math.max(area.y, p.y)) });
    state.path = Array.from({ length: 81 }, (_, i) => {
      const t = i / 80;
      return clampIn({ x: (1 - t) ** 2 * s.x + 2 * (1 - t) * t * c.x + t * t * e.x, y: (1 - t) ** 2 * s.y + 2 * (1 - t) * t * c.y + t * t * e.y });
    });
    const mid = { x: (s.x + e.x) / 2, y: (s.y + e.y) / 2 };
    state.blocks = [{ x: mid.x - 45, y: mid.y - 35, w: 90, h: 70 }];
    state.bell = e;
    const first = state.path[3] ?? s;
    state.dominoes = [{ x: s.x, y: s.y, angle: Math.atan2(first.y - s.y, first.x - s.x), state: 'up', t: 0 }];
    state.anchor = null;
    state.phase = 'build';
    state.phaseTime = 0;
  }

  function place(at: Point, angle: number): void {
    if (state.dominoes.some((d) => Math.hypot(d.x - at.x, d.y - at.y) < GAP * 0.6)) return;
    const broken = state.blocks.some((b) => inBlock(b, at, 14)) || at.x < 20 || at.x > arena.width - 20 || at.y < HUD_SAFE_TOP || at.y > arena.height - 10;
    state.dominoes.push({ ...at, angle, state: broken ? 'broken' : 'up', t: 0 });
    events.push(broken ? { type: 'miss', ...at } : { type: 'action', ...at, note: 84, voice: 'bell' });
  }

  newPath(rng);

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
      if (state.phase === 'rang') {
        if (state.phaseTime >= RANG_PAUSE) {
          state.paths += 1;
          newPath(rng);
        }
        return;
      }
      // Pushing: a tap on a standing domino.
      for (const tap of input.taps) {
        const d = state.dominoes.find((x) => x.state === 'up' && Math.hypot(x.x - tap.x, x.y - tap.y) < 44);
        if (d) {
          d.state = 'falling';
          d.t = 0;
          state.lastTapAt = state.time;
        }
      }
      // Building: dominoes stand behind the dragging finger.
      if (input.pressed && input.pointer) {
        const near = state.dominoes.filter((d) => d.state !== 'broken' && Math.hypot(d.x - (input.pointer?.x ?? 0), d.y - (input.pointer?.y ?? 0)) < 70);
        near.sort((a, b) => Math.hypot(a.x - (input.pointer?.x ?? 0), a.y - (input.pointer?.y ?? 0)) - Math.hypot(b.x - (input.pointer?.x ?? 0), b.y - (input.pointer?.y ?? 0)));
        state.anchor = near[0] ? { x: near[0].x, y: near[0].y } : { ...input.pointer };
      }
      const finger = input.pointer;
      let anchor = state.anchor;
      if (finger && anchor) {
        for (let guard = 0; guard < 20 && Math.hypot(finger.x - anchor.x, finger.y - anchor.y) >= GAP; guard += 1) {
          const dx = finger.x - anchor.x;
          const dy = finger.y - anchor.y;
          const d = Math.hypot(dx, dy);
          const at: Point = { x: anchor.x + (dx / d) * GAP, y: anchor.y + (dy / d) * GAP };
          place(at, Math.atan2(dy, dx));
          anchor = at;
        }
        state.anchor = anchor;
      }
      if (!input.pointer) state.anchor = null;
      // Falling.
      for (const d of state.dominoes) {
        if (d.state !== 'falling') continue;
        d.t += dt;
        if (d.t < FALL_SECONDS) continue;
        d.state = 'down';
        for (const other of state.dominoes) {
          if (other.state === 'up' && Math.hypot(other.x - d.x, other.y - d.y) <= REACH) {
            other.state = 'falling';
            other.t = 0;
          }
        }
        events.push({ type: 'action', x: d.x, y: d.y, note: 60 + (state.dominoes.filter((x) => x.state === 'down').length % 12) * 2, voice: 'drum' });
        if (Math.hypot(state.bell.x - d.x, state.bell.y - d.y) <= REACH + 20) {
          state.phase = 'rang';
          state.phaseTime = 0;
          state.score += 1;
          events.push({ type: 'score', ...state.bell, note: 88, voice: 'bell' });
          return;
        }
      }
    },
  };
}

/** Index of the path point nearest p. */
function nearestIndex(path: readonly Point[], p: Point): number {
  let best = 0;
  let bestD = Infinity;
  path.forEach((q, i) => {
    const d = Math.hypot(q.x - p.x, q.y - p.y);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
}

/** Good play: drags along the path from the last domino to the bell, then pushes the first one. */
export function dominoBot(state: DominoState, _context: BotContext): BotMove {
  if (state.phase !== 'build' || state.dominoes.some((d) => d.state === 'falling')) return {};
  const standing = state.dominoes.filter((d) => d.state === 'up');
  const nearBell = standing.some((d) => Math.hypot(d.x - state.bell.x, d.y - state.bell.y) <= REACH + 10);
  if (nearBell && !state.anchor) {
    const first = state.dominoes[0];
    return first && first.state === 'up' ? { tap: { x: first.x, y: first.y } } : {};
  }
  if (nearBell) return {};
  const furthest = standing.reduce((best, d) => Math.max(best, nearestIndex(state.path, d)), 0);
  const ahead = state.path[Math.min(state.path.length - 1, furthest + 6)] ?? state.bell;
  if (!state.anchor) {
    const last = standing.find((d) => nearestIndex(state.path, d) === furthest) ?? standing[0];
    return last ? { touch: { x: last.x, y: last.y } } : {};
  }
  return { touch: ahead };
}
