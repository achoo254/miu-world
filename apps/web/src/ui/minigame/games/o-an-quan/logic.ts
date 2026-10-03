// Ô ăn quan (a short game against the computer): two rows of five squares with five pebbles each, a "quan"
// square at each end holding one big stone worth ten. On her turn the child picks one of her squares (the
// bottom row) and a way (left or right): its pebbles are dropped one by one along the board. After the last
// one: if the next square has pebbles, she picks them up and sows on; if it is empty and the one after has
// stones, she wins those (and again on a run of empty-then-full); otherwise her turn ends. A quan square is
// never picked up. Then the computer plays. When both quan are taken each side keeps its own row and, while
// time remains, a new game starts. Her score is every stone she has won. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type Arena, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

/** Squares round the board, clockwise on screen: 0 the left quan, 1–5 the top row (left to right), 6 the right quan, 7–11 the bottom row (right to left). */
export const SQUARES = 12;
export const LEFT_QUAN = 0;
export const RIGHT_QUAN = 6;
export const CHILD_SQUARES = [7, 8, 9, 10, 11] as const;
export const COMPUTER_SQUARES = [1, 2, 3, 4, 5] as const;
export const QUAN_POINTS = 10;
const START_PEBBLES = 5;

export type Side = 'child' | 'computer';
/** +1 sows clockwise (along the bottom row that is toward the left), -1 the other way. */
export type Way = 1 | -1;

export interface Board {
  pebbles: number[];
  /** Big quan stones still on each square (only the two quan squares ever have one). */
  quan: number[];
}

/** One step of a move; `hand` is how many pebbles are in the hand after it. */
export type SowEvent = { kind: 'pick' | 'drop' | 'end'; at: number; hand: number } | { kind: 'capture'; at: number; hand: number; points: number };

export const isQuan = (i: number): boolean => i === LEFT_QUAN || i === RIGHT_QUAN;
const wrap = (i: number): number => ((i % SQUARES) + SQUARES) % SQUARES;
const stonesOn = (b: Board, i: number): number => (b.pebbles[i] ?? 0) + (b.quan[i] ?? 0);

/** One move, one stone at a time (the board changes as it goes): the same rules for the screen and for planning. */
export function* sowMove(board: Board, from: number, way: Way): Generator<SowEvent, void, void> {
  let hand = board.pebbles[from] ?? 0;
  board.pebbles[from] = 0;
  let at = from;
  yield { kind: 'pick', at, hand };
  // A cap on drops: relay sowing always ends in practice, this only guards against an endless loop.
  let drops = 0;
  for (;;) {
    while (hand > 0 && drops < 600) {
      drops += 1;
      at = wrap(at + way);
      board.pebbles[at] = (board.pebbles[at] ?? 0) + 1;
      hand -= 1;
      yield { kind: 'drop', at, hand };
    }
    const next = wrap(at + way);
    if (isQuan(next) || drops >= 600) break;
    if ((board.pebbles[next] ?? 0) > 0) {
      hand = board.pebbles[next] ?? 0;
      board.pebbles[next] = 0;
      at = next;
      yield { kind: 'pick', at, hand };
      continue;
    }
    // An empty square: win what lies beyond it, and again while empty-then-full repeats.
    let gap = next;
    for (;;) {
      const beyond = wrap(gap + way);
      if (stonesOn(board, beyond) === 0) break;
      const points = (board.pebbles[beyond] ?? 0) + (board.quan[beyond] ?? 0) * QUAN_POINTS;
      board.pebbles[beyond] = 0;
      board.quan[beyond] = 0;
      yield { kind: 'capture', at: beyond, hand: 0, points };
      gap = wrap(beyond + way);
      if (stonesOn(board, gap) !== 0) break;
    }
    break;
  }
  yield { kind: 'end', at, hand: 0 };
}

/** Points a move would win, played out on a copy. */
export function movePoints(board: Board, from: number, way: Way): number {
  const copy = { pebbles: [...board.pebbles], quan: [...board.quan] };
  let points = 0;
  for (const event of sowMove(copy, from, way)) if (event.kind === 'capture') points += event.points;
  return points;
}

export const squaresOf = (side: Side): readonly number[] => (side === 'child' ? CHILD_SQUARES : COMPUTER_SQUARES);
export const movesFor = (board: Board, side: Side): Array<{ from: number; way: Way }> =>
  squaresOf(side)
    .filter((i) => (board.pebbles[i] ?? 0) > 0)
    .flatMap((from) => [
      { from, way: 1 as Way },
      { from, way: -1 as Way },
    ]);

export const freshBoard = (): Board => ({
  pebbles: Array.from({ length: SQUARES }, (_, i) => (isQuan(i) ? 0 : START_PEBBLES)),
  quan: Array.from({ length: SQUARES }, (_, i) => (isQuan(i) ? 1 : 0)),
});

export interface Cell extends Point {
  w: number;
  h: number;
}

export interface QuanState {
  board: Board;
  cells: Cell[];
  cellSize: number;
  /** Arrow buttons under a picked square: screen-left and screen-right. */
  arrows: { left: Point; right: Point } | null;
  turn: Side;
  /** The child's picked square (-1 none). */
  picked: number;
  /** The move being played out, where the hand is and how many pebbles it holds. */
  sowing: { side: Side; hand: number; at: number } | null;
  /** Seconds until the next stone moves (or the computer moves). */
  wait: number;
  /** Stones won: the child's and the computer's (this game and earlier ones). */
  won: Record<Side, number>;
  /** The last capture, for a flash: square and seconds since. */
  flash: { at: number; ago: number; side: Side } | null;
  games: number;
  /** Seconds since a game ended (-1 while playing). */
  overAgo: number;
  score: number;
  time: number;
}

const DROP_SECONDS = 0.14;
const PICK_SECONDS = 0.3;
const THINK_SECONDS = 0.7;
const NEW_GAME_SECONDS = 2;
/** The computer plays its best move this often, otherwise any move. */
const COMPUTER_SKILL = 0.75;
export const ARROW_RADIUS = 48;

function layout(arena: Arena): { cells: Cell[]; cellSize: number } {
  const c = Math.min(112, (arena.width - 40) / 7);
  const left = (arena.width - c * 7) / 2;
  const top = HUD_SAFE_TOP + Math.max(40, (arena.height - HUD_SAFE_TOP - c * 2 - 140) * 0.4);
  const cells: Cell[] = [];
  for (let i = 0; i < SQUARES; i += 1) {
    if (i === LEFT_QUAN) cells.push({ x: left + c / 2, y: top + c, w: c, h: c * 2 });
    else if (i === RIGHT_QUAN) cells.push({ x: left + c * 6.5, y: top + c, w: c, h: c * 2 });
    else if (i < RIGHT_QUAN) cells.push({ x: left + c * (i + 0.5), y: top + c / 2, w: c, h: c });
    else cells.push({ x: left + c * (12 - i + 0.5), y: top + c * 1.5, w: c, h: c });
  }
  return { cells, cellSize: c };
}

export function createOAnQuan({ arena, rng }: GameSetup): MinigameLogic<QuanState> {
  const events = eventQueue();
  const place = layout(arena);
  const state: QuanState = {
    board: freshBoard(),
    ...place,
    arrows: null,
    turn: 'child',
    picked: -1,
    sowing: null,
    wait: 0,
    won: { child: 0, computer: 0 },
    flash: null,
    games: 0,
    overAgo: -1,
    score: 0,
    time: 0,
  };
  let move: Generator<SowEvent, void, void> | null = null;

  const cellAt = (p: Point): number => state.cells.findIndex((c) => Math.abs(p.x - c.x) <= c.w / 2 && Math.abs(p.y - c.y) <= c.h / 2);

  const start = (side: Side, from: number, way: Way): void => {
    move = sowMove(state.board, from, way);
    state.sowing = { side, hand: 0, at: from };
    state.picked = -1;
    state.arrows = null;
    state.wait = 0;
    const cell = state.cells[from];
    events.push({ type: 'action', x: cell?.x ?? 0, y: cell?.y ?? 0 });
  };

  const pick = (i: number): void => {
    state.picked = i;
    const cell = state.cells[i];
    if (!cell) return;
    const y = cell.y + state.cellSize / 2 + ARROW_RADIUS + 14;
    state.arrows = { left: { x: cell.x - ARROW_RADIUS - 8, y }, right: { x: cell.x + ARROW_RADIUS + 8, y } };
  };

  /** The side to play has no pebbles: it spreads one from its winnings on each square, or the game ends. */
  const ready = (side: Side): boolean => {
    if (movesFor(state.board, side).length > 0) return true;
    if (state.won[side] < 5) return false;
    state.won[side] -= 5;
    if (side === 'child') state.score = state.won.child;
    for (const i of squaresOf(side)) state.board.pebbles[i] = 1;
    return true;
  };

  const endGame = (): void => {
    for (const side of ['child', 'computer'] as const) for (const i of squaresOf(side)) {
      state.won[side] += state.board.pebbles[i] ?? 0;
      state.board.pebbles[i] = 0;
    }
    state.score = state.won.child;
    state.games += 1;
    state.overAgo = 0;
  };

  const gameOver = (): boolean => stonesOn(state.board, LEFT_QUAN) === 0 && stonesOn(state.board, RIGHT_QUAN) === 0;

  const finishMove = (side: Side): void => {
    state.sowing = null;
    move = null;
    if (gameOver()) {
      endGame();
      return;
    }
    const next: Side = side === 'child' ? 'computer' : 'child';
    if (!ready(next)) {
      endGame();
      return;
    }
    state.turn = next;
    state.wait = next === 'computer' ? THINK_SECONDS : 0;
  };

  const advance = (): void => {
    const sowing = state.sowing;
    if (!move || !sowing) return;
    const result = move.next();
    if (result.done) {
      finishMove(sowing.side);
      return;
    }
    const event = result.value;
    sowing.at = event.at;
    sowing.hand = event.hand;
    const cell = state.cells[event.at];
    if (event.kind === 'pick') state.wait = PICK_SECONDS;
    else if (event.kind === 'drop') {
      state.wait = DROP_SECONDS;
    } else if (event.kind === 'capture') {
      state.won[sowing.side] += event.points;
      if (sowing.side === 'child') {
        state.score = state.won.child;
        events.push({ type: 'score', x: cell?.x ?? 0, y: cell?.y ?? 0, points: event.points });
      } else events.push({ type: 'miss', x: cell?.x ?? 0, y: cell?.y ?? 0 });
      state.flash = { at: event.at, ago: 0, side: sowing.side };
      state.wait = PICK_SECONDS * 1.5;
    } else state.wait = PICK_SECONDS;
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
      if (state.flash) state.flash.ago += dt;
      if (state.overAgo >= 0) {
        state.overAgo += dt;
        if (state.overAgo >= NEW_GAME_SECONDS) {
          state.board = freshBoard();
          state.overAgo = -1;
          state.turn = state.games % 2 === 0 ? 'child' : 'computer';
          state.wait = state.turn === 'computer' ? THINK_SECONDS : 0;
        }
        return;
      }
      if (state.sowing) {
        state.wait -= dt;
        while (state.wait <= 0 && state.sowing) {
          advance();
        }
        return;
      }
      if (state.turn === 'computer') {
        state.wait -= dt;
        if (state.wait > 0) return;
        const moves = movesFor(state.board, 'computer');
        const best = [...moves].sort((a, b) => movePoints(state.board, b.from, b.way) - movePoints(state.board, a.from, a.way))[0];
        const choice = rng.chance(COMPUTER_SKILL) && best ? best : rng.pick(moves as [(typeof moves)[number], ...typeof moves]);
        if (choice) start('computer', choice.from, choice.way);
        return;
      }
      // The child's turn: a swipe from one of her squares plays it that way; or a tap picks, then an arrow.
      const swipe = input.swipes.find((s) => s.direction === 'left' || s.direction === 'right');
      if (swipe) {
        const from = cellAt(swipe.from);
        const target = (CHILD_SQUARES as readonly number[]).includes(from) ? from : state.picked;
        if (target >= 0 && (state.board.pebbles[target] ?? 0) > 0) {
          start('child', target, swipe.direction === 'left' ? 1 : -1);
          return;
        }
      }
      const press = input.pressed ? (input.pointer ?? input.taps[0] ?? null) : null;
      if (!press) return;
      if (state.arrows && state.picked >= 0) {
        if (Math.hypot(press.x - state.arrows.left.x, press.y - state.arrows.left.y) <= ARROW_RADIUS + 10) {
          start('child', state.picked, 1);
          return;
        }
        if (Math.hypot(press.x - state.arrows.right.x, press.y - state.arrows.right.y) <= ARROW_RADIUS + 10) {
          start('child', state.picked, -1);
          return;
        }
      }
      const i = cellAt(press);
      if ((CHILD_SQUARES as readonly number[]).includes(i) && (state.board.pebbles[i] ?? 0) > 0) pick(i);
    },
  };
}

/** Good play: the move that wins the most right away (planned on a copy of the board), as one swipe. */
export function oAnQuanBot(state: QuanState, _context: BotContext): BotMove {
  if (state.turn !== 'child' || state.sowing || state.overAgo >= 0) return {};
  const moves = movesFor(state.board, 'child');
  const best = moves.map((m) => ({ ...m, points: movePoints(state.board, m.from, m.way) })).sort((a, b) => b.points - a.points)[0];
  const cell = best ? state.cells[best.from] : undefined;
  if (!best || !cell) return {};
  return { swipe: { from: { x: cell.x, y: cell.y }, dx: best.way === 1 ? -90 : 90, dy: 0 } };
}

