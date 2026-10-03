// Shape sorter: wooden blocks (circle, square, triangle, star) slide down a chute toward a toy box. The box's
// round lid has four holes, one of each shape, and only the hole at the top of the lid sits under the chute.
// The child taps the right side of the box to turn the lid clockwise, the left side to turn it back, so the
// hole of the same shape waits under each block: it drops in (a point); any other hole bounces it out.
// Blocks come quicker as the round goes on, and later two may be on the way at once. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const SHAPES = ['circle', 'square', 'triangle', 'star'] as const;
export type Shape = (typeof SHAPES)[number];

export interface Block {
  shape: Shape;
  y: number;
  /** Units per second down the chute. */
  vy: number;
  /** null while falling; then whether it went in, and seconds since. */
  result: 'in' | 'out' | null;
  since: number;
  /** Sideways direction it bounces off to (-1, 1). */
  bounce: number;
}

export interface ShapeSorterState {
  /** Centre and radius of the lid; the chute is straight above its centre. */
  lid: Point;
  lidRadius: number;
  /** Quarter turns of the lid (the hole of SHAPES[i] is i quarter turns clockwise from the top at 0). */
  turns: number;
  /** The lid's drawn angle in quarter turns, easing toward `turns`. */
  shown: number;
  chuteTop: number;
  /** Where a block meets the lid: the top hole's centre. */
  holeY: number;
  blocks: Block[];
  /** Last side tapped and when (the arrow on that side flashes). */
  tappedSide: -1 | 1;
  tappedAt: number;
  score: number;
  time: number;
}

/** Seconds between two blocks and down the chute, at the start and at the end of the round. */
const GAP_START = 2.1;
const GAP_END = 1.25;
const FALL_START = 2.8;
const FALL_END = 1.7;
const TURN_SECONDS = 0.14;
const NOTES: Readonly<Record<Shape, number>> = { circle: 72, square: 76, triangle: 79, star: 84 };

/** The shape under the chute for `turns` quarter turns of the lid. */
export function shapeOnTop(turns: number): Shape {
  // Turning clockwise by one brings the hole that sat a quarter turn anticlockwise (to the left) to the top.
  const index = (((-turns % 4) + 4) % 4) as 0 | 1 | 2 | 3;
  return SHAPES[index];
}

export function createShapeSorter({ arena, duration, rng }: GameSetup): MinigameLogic<ShapeSorterState> {
  const events = eventQueue();
  const lidRadius = Math.min(150, arena.width * 0.27, (arena.height - HUD_SAFE_TOP) * 0.22);
  const lid = { x: arena.width / 2, y: arena.height - lidRadius - Math.max(70, arena.height * 0.08) };
  const holeY = lid.y - lidRadius * 0.58;
  const state: ShapeSorterState = {
    lid,
    lidRadius,
    turns: 0,
    shown: 0,
    chuteTop: HUD_SAFE_TOP + 10,
    holeY,
    blocks: [],
    tappedSide: 1,
    tappedAt: -9,
    score: 0,
    time: 0,
  };
  let nextBlock = 1.2;
  let last: Shape | null = null;
  const progress = (): number => Math.min(1, state.time / duration);

  const spawn = (): void => {
    // Never the same shape three times running feels samey; a fresh one is likelier.
    let shape = SHAPES[rng.int(0, 3)] ?? 'circle';
    if (shape === last && rng.chance(0.6)) shape = SHAPES[rng.int(0, 3)] ?? 'circle';
    last = shape;
    const fall = FALL_START + (FALL_END - FALL_START) * progress();
    state.blocks.push({ shape, y: state.chuteTop, vy: (holeY - state.chuteTop) / fall, result: null, since: 0, bounce: rng.chance(0.5) ? -1 : 1 });
  };

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
      for (const tap of input.taps) {
        if (tap.y < HUD_SAFE_TOP) continue;
        const side = tap.x >= lid.x ? 1 : -1;
        state.turns += side;
        state.tappedSide = side;
        state.tappedAt = state.time;
        events.push({ type: 'action', x: lid.x + side * lidRadius, y: lid.y });
      }
      const ease = Math.min(1, dt / TURN_SECONDS);
      state.shown += (state.turns - state.shown) * ease * 2;
      if (Math.abs(state.turns - state.shown) < 0.01) state.shown = state.turns;

      nextBlock -= dt;
      if (nextBlock <= 0) {
        spawn();
        nextBlock += GAP_START + (GAP_END - GAP_START) * progress();
      }
      for (const block of state.blocks) {
        if (block.result) {
          block.since += dt;
          continue;
        }
        block.y += block.vy * dt;
        if (block.y < holeY) continue;
        block.y = holeY;
        if (shapeOnTop(state.turns) === block.shape) {
          block.result = 'in';
          state.score += 1;
          events.push({ type: 'score', x: lid.x, y: holeY, note: NOTES[block.shape], voice: 'bell' });
        } else {
          block.result = 'out';
          events.push({ type: 'miss', x: lid.x, y: holeY });
        }
      }
      state.blocks = state.blocks.filter((b) => b.since < 0.8);
    },
  };
}

/** Good play: turn the lid the short way round so the next block's hole is on top. */
export function shapeSorterBot(state: ShapeSorterState, _context: BotContext): BotMove {
  const next = state.blocks.filter((b) => !b.result).sort((a, b) => b.y - a.y)[0];
  if (!next) return {};
  const want = SHAPES.indexOf(next.shape);
  const now = SHAPES.indexOf(shapeOnTop(state.turns));
  // One clockwise turn brings the hole one place to the left (index - 1) to the top.
  const clockwise = (((now - want) % 4) + 4) % 4;
  if (clockwise === 0) return {};
  const side = clockwise <= 2 ? 1 : -1;
  return { tap: { x: state.lid.x + side * state.lidRadius * 0.8, y: state.lid.y } };
}
