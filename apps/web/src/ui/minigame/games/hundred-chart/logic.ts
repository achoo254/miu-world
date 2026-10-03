// Hundred chart: the 1–100 board with a few numbers missing. The missing numbers wait in a tray as pieces; the
// child drags each into its gap (or taps it, then the gap). The right gap keeps it, a point; a wrong gap
// bounces it back to the tray. Once every gap is filled a new board comes. Early boards scatter the gaps; later
// ones take out a cross of five (a number and the four around it), so the row and column rules matter.
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';
import { createPickDrop, stepPickDrop, type PickDrop } from './pick-and-drop';

export interface Piece {
  value: number;
  /** Home in the tray. */
  home: Point;
  placed: boolean;
  /** Seconds since it bounced off a wrong gap. */
  bounced: number;
}

export interface ChartState {
  /** Board's top-left corner and cell size. */
  left: number;
  top: number;
  cell: number;
  /** Numbers missing from the board (1–100). */
  holes: number[];
  pieces: Piece[];
  pieceRadius: number;
  pick: PickDrop;
  /** Seconds since the last board was finished (it shines, then the next comes); -1 while playing. */
  cleared: number;
  boards: number;
  score: number;
  time: number;
}

const NEXT_SECONDS = 0.9;

/** The board cell (row, col from 0) of a number 1–100. */
export const cellOf = (n: number): { row: number; col: number } => ({ row: Math.floor((n - 1) / 10), col: (n - 1) % 10 });

export function cellCentre(state: ChartState, n: number): Point {
  const { row, col } = cellOf(n);
  return { x: state.left + (col + 0.5) * state.cell, y: state.top + (row + 0.5) * state.cell };
}

function shuffle<T>(items: T[], rng: Rng): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = rng.int(0, i);
    const a = items[i];
    const b = items[j];
    if (a !== undefined && b !== undefined) {
      items[i] = b;
      items[j] = a;
    }
  }
  return items;
}

/** Gaps for a board: scattered ones, or a cross of five around a number not on the edge. */
export function pickHoles(rng: Rng, count: number, cross: boolean): number[] {
  if (cross) {
    const row = rng.int(1, 8);
    const col = rng.int(1, 8);
    const n = row * 10 + col + 1;
    return [n, n - 1, n + 1, n - 10, n + 10];
  }
  const out = new Set<number>();
  while (out.size < count) {
    const n = rng.int(2, 99);
    // Not next to another gap: each gap has numbers around it to read.
    if ([...out].some((m) => Math.abs(m - n) === 1 || Math.abs(m - n) === 10)) continue;
    out.add(n);
  }
  return [...out];
}

export function createHundredChart({ arena, params, rng }: GameSetup): MinigameLogic<ChartState> {
  const count = typeof params.holes === 'number' ? Math.round(Math.min(6, Math.max(2, params.holes))) : 4;
  const events = eventQueue();
  const landscape = arena.width > arena.height * 1.1;
  const pieceRadius = Math.max(TOUCH_RADIUS + 6, 50);
  const trayDepth = pieceRadius * 4 + 60;
  const side = landscape ? Math.min(arena.height - HUD_SAFE_TOP - 24, arena.width - trayDepth - 60) : Math.min(arena.width - 24, arena.height - HUD_SAFE_TOP - trayDepth - 60);
  const cell = side / 10;
  const left = landscape ? 20 : (arena.width - side) / 2;
  const top = landscape ? HUD_SAFE_TOP + 8 : HUD_SAFE_TOP + 20;
  const state: ChartState = { left, top, cell, holes: [], pieces: [], pieceRadius, pick: createPickDrop(), cleared: -1, boards: 0, score: 0, time: 0 };

  /** Tray places for `n` pieces: one or two columns right of the board, or one or two rows under it. */
  function trayHomes(n: number): Point[] {
    const lines = n > 4 ? 2 : 1;
    const perLine = Math.ceil(n / lines);
    const step = pieceRadius * 2 + 16;
    return Array.from({ length: n }, (_, i) => {
      const line = Math.floor(i / perLine);
      const inLine = line === lines - 1 ? n - line * perLine : perLine;
      const k = i % perLine;
      if (landscape) {
        const x = left + side + (arena.width - left - side) / 2 + (lines === 2 ? (line - 0.5) * step : 0);
        return { x, y: top + side / 2 + (k - (inLine - 1) / 2) * step };
      }
      const y = top + side + 30 + pieceRadius + line * step;
      return { x: arena.width / 2 + (k - (inLine - 1) / 2) * step, y };
    });
  }

  function newBoard(): void {
    const cross = state.boards >= 1 && rng.chance(0.6);
    state.holes = pickHoles(rng, count, cross);
    const values = shuffle([...state.holes], rng);
    const homes = trayHomes(values.length);
    state.pieces = values.map((value, i) => ({ value, home: homes[i] ?? { x: 0, y: 0 }, placed: false, bounced: 99 }));
    state.pick = createPickDrop();
    state.cleared = -1;
    state.boards += 1;
  }

  const pieceAt = (p: Point): number => state.pieces.findIndex((piece) => !piece.placed && Math.hypot(piece.home.x - p.x, piece.home.y - p.y) <= pieceRadius * 1.2);

  /** The gap nearest a point, if the point is on or right next to it. */
  const holeAt = (p: Point): number | null => {
    let best: number | null = null;
    let bestD = cell * 1.1;
    for (const n of state.holes) {
      if (state.pieces.some((piece) => piece.placed && piece.value === n)) continue;
      const c = cellCentre(state, n);
      const d = Math.hypot(c.x - p.x, c.y - p.y);
      if (d < bestD) {
        best = n;
        bestD = d;
      }
    }
    return best;
  };

  function drop(index: number, at: Point): boolean {
    const piece = state.pieces[index];
    const hole = holeAt(at);
    if (!piece || hole === null) return false;
    const c = cellCentre(state, hole);
    if (hole === piece.value) {
      piece.placed = true;
      state.score += 1;
      events.push({ type: 'score', x: c.x, y: c.y });
      if (state.pieces.every((p) => p.placed)) state.cleared = 0;
      return true;
    }
    piece.bounced = 0;
    events.push({ type: 'miss', x: c.x, y: c.y });
    return false;
  }

  newBoard();

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
      for (const piece of state.pieces) piece.bounced += dt;
      if (state.cleared >= 0) {
        state.cleared += dt;
        if (state.cleared >= NEXT_SECONDS) newBoard();
        return;
      }
      stepPickDrop(state.pick, input, pieceAt, drop);
    },
  };
}

/** Good play: reads where each number belongs; taps a piece, then its gap. */
export function hundredChartBot(state: ChartState, _context: BotContext): BotMove {
  if (state.cleared >= 0 || Math.floor(state.time * 10) % 4 !== 0) return {};
  const chosen = state.pieces[state.pick.selected];
  if (chosen && !chosen.placed) return { tap: cellCentre(state, chosen.value) };
  const next = state.pieces.find((p) => !p.placed);
  return next ? { tap: next.home } : {};
}
