// Scissor trace: a shape is drawn in dots on a sheet of paper. The child puts her finger on the scissors and
// moves them along the dotted line; they cut as long as the finger stays near the line. Wandering far off
// stops the scissors where they are, until she puts her finger back on them. Cutting all round frees the shape:
// a point, and the next shape is drawn. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const SHAPES = ['circle', 'heart', 'star', 'house', 'fish', 'triangle'] as const;
export type ShapeKind = (typeof SHAPES)[number];

export interface ScissorState {
  shape: ShapeKind;
  centre: Point;
  radius: number;
  /** The line, as points about SAMPLE units apart, starting and ending at the same place. */
  path: Point[];
  /** Points cut so far. */
  progress: number;
  /** The finger is on the scissors and cutting. */
  cutting: boolean;
  /** The scissors stopped because the finger wandered off (for the hint). */
  lost: boolean;
  /** Sum of how far the finger was from the line while cutting, and samples, for "Đẹp quá!". */
  wobble: number;
  samples: number;
  /** Seconds since the shape was cut free (-1 while cutting); whether it was neat. */
  doneAgo: number;
  neat: boolean;
  shapes: number;
  score: number;
  time: number;
}

const SAMPLE = 8;
/** The finger cuts while this close to the line ahead. */
export const NEAR = 48;
/** Further than this from the scissors, they stop. */
const LOSE = 120;
/** The finger may grab the scissors from this far. */
const GRAB = 80;
/** How far ahead along the line (in points) one move may cut: a quick finger, not a jump across the shape. */
const AHEAD = 24;
const NEXT_SECONDS = 1.2;

function outline(kind: ShapeKind): Point[] {
  const ring = (n: number, f: (t: number) => Point): Point[] => Array.from({ length: n + 1 }, (_, i) => f((i / n) * Math.PI * 2));
  switch (kind) {
    case 'circle':
      return ring(48, (t) => ({ x: Math.sin(t), y: -Math.cos(t) }));
    case 'heart':
      return ring(64, (t) => ({ x: (16 * Math.sin(t) ** 3) / 17, y: -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17 - 0.1 }));
    case 'star':
      return Array.from({ length: 11 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        const r = i % 2 === 0 ? 1 : 0.48;
        return { x: Math.sin(a) * r, y: -Math.cos(a) * r + 0.05 };
      });
    case 'house':
      return [
        { x: 0, y: -0.95 },
        { x: 0.85, y: -0.15 },
        { x: 0.85, y: 0.9 },
        { x: -0.85, y: 0.9 },
        { x: -0.85, y: -0.15 },
        { x: 0, y: -0.95 },
      ];
    case 'fish':
      return [
        { x: 0.95, y: 0 },
        { x: 0.55, y: 0.5 },
        { x: -0.25, y: 0.5 },
        { x: -0.6, y: 0.12 },
        { x: -0.98, y: 0.55 },
        { x: -0.98, y: -0.55 },
        { x: -0.6, y: -0.12 },
        { x: -0.25, y: -0.5 },
        { x: 0.55, y: -0.5 },
        { x: 0.95, y: 0 },
      ];
    case 'triangle':
      return [
        { x: 0, y: -0.95 },
        { x: 0.95, y: 0.8 },
        { x: -0.95, y: 0.8 },
        { x: 0, y: -0.95 },
      ];
  }
}

/** The outline scaled to the sheet and cut into points SAMPLE apart. */
export function samplePath(kind: ShapeKind, centre: Point, radius: number): Point[] {
  const corners = outline(kind).map((p) => ({ x: centre.x + p.x * radius, y: centre.y + p.y * radius }));
  const path: Point[] = [];
  for (let i = 0; i < corners.length - 1; i += 1) {
    const a = corners[i];
    const b = corners[i + 1];
    if (!a || !b) continue;
    const steps = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / SAMPLE));
    for (let k = 0; k < steps; k += 1) path.push({ x: a.x + ((b.x - a.x) * k) / steps, y: a.y + ((b.y - a.y) * k) / steps });
  }
  const first = path[0];
  if (first) path.push({ ...first });
  return path;
}

export function createScissorTrace({ arena, rng }: GameSetup): MinigameLogic<ScissorState> {
  const events = eventQueue();
  const top = HUD_SAFE_TOP + 20;
  const centre = { x: arena.width / 2, y: top + (arena.height - top) / 2 };
  const radius = Math.min(arena.width, arena.height - top) * 0.36;
  const state: ScissorState = {
    shape: 'circle',
    centre,
    radius,
    path: [],
    progress: 0,
    cutting: false,
    lost: false,
    wobble: 0,
    samples: 0,
    doneAgo: -1,
    neat: false,
    shapes: 0,
    score: 0,
    time: 0,
  };
  const newShape = (): void => {
    const kinds = SHAPES.filter((k) => k !== state.shape);
    state.shape = rng.pick(kinds as [ShapeKind, ...ShapeKind[]]);
    state.path = samplePath(state.shape, centre, radius);
    Object.assign(state, { progress: 0, cutting: false, lost: false, wobble: 0, samples: 0, doneAgo: -1, neat: false });
  };
  newShape();

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
      if (state.doneAgo >= 0) {
        state.doneAgo += dt;
        if (state.doneAgo >= NEXT_SECONDS) newShape();
        return;
      }
      const at = state.path[state.progress];
      const finger = input.pointer;
      if (!at) return;
      if (!finger) {
        state.cutting = false;
        return;
      }
      if (!state.cutting) {
        // A finger put on (or slid back to) the scissors picks them up again.
        if (Math.hypot(finger.x - at.x, finger.y - at.y) <= GRAB) {
          state.cutting = true;
          state.lost = false;
        }
        return;
      }
      if (Math.hypot(finger.x - at.x, finger.y - at.y) > LOSE) {
        state.cutting = false;
        state.lost = true;
        events.push({ type: 'miss', x: at.x, y: at.y });
        return;
      }
      // Cut on to the furthest point ahead the finger is near.
      // How far the finger is from the line (its nearest point) measures how neat the cut is.
      let next = state.progress;
      let gap = Infinity;
      for (let i = state.progress; i <= Math.min(state.path.length - 1, state.progress + AHEAD); i += 1) {
        const p = state.path[i];
        if (!p) break;
        const d = Math.hypot(finger.x - p.x, finger.y - p.y);
        gap = Math.min(gap, d);
        if (d <= NEAR) next = i;
      }
      if (next > state.progress) {
        state.wobble += gap * (next - state.progress);
        state.samples += next - state.progress;
        if (Math.floor(next / 12) > Math.floor(state.progress / 12)) events.push({ type: 'action', x: finger.x, y: finger.y });
        state.progress = next;
      }
      if (state.progress >= state.path.length - 1) {
        state.shapes += 1;
        state.score += 1;
        state.doneAgo = 0;
        state.cutting = false;
        state.neat = state.wobble / Math.max(1, state.samples) < 16;
        events.push({ type: 'score', x: centre.x, y: centre.y });
      }
    },
  };
}

/** Good play: hold the scissors and slide them a little way along the line each tenth of a second. */
export function scissorTraceBot(state: ScissorState, _context: BotContext): BotMove {
  if (state.doneAgo >= 0) return {};
  const at = state.path[state.progress];
  if (!at) return {};
  if (!state.cutting) return { touch: at };
  const ahead = state.path[Math.min(state.path.length - 1, state.progress + 7)] ?? at;
  return { touch: ahead };
}
