// Stone path memory: stepping stones are scattered across a stream. Some of them light up one after another
// (a path from this bank to the far one); then the child taps the same stones in the same order and hops
// across. Each stream crossed is a point and the next path is one stone longer (4 up to 8). A wrong stone
// sinks a little with a splash and the path is shown again, from the start. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export type StonePhase = 'show' | 'play' | 'cross' | 'oops';

export interface Stone extends Point {
  r: number;
  row: number;
  col: number;
  /** Seconds since it lit (show) or was stepped on; large = long ago. */
  litAgo: number;
  /** Seconds since a wrong tap sank it a little. */
  sankAgo: number;
}

export interface StoneState {
  stones: Stone[];
  /** Stone indexes of the path, near bank first. */
  path: number[];
  phase: StonePhase;
  phaseTime: number;
  /** Stones of the path the child has stepped on so far. */
  stepped: number;
  /** Where the child stands: a stone index, or -1 on the near bank, -2 on the far bank. */
  at: number;
  /** Seconds since the last hop (the hop arc). */
  hopAgo: number;
  hopFrom: Point;
  nearBank: number;
  farBank: number;
  streams: number;
  score: number;
  time: number;
}

const ROWS = 4;
/** Seconds each stone stays lit while the path is shown. */
export const SHOW_STEP = 0.62;
const CROSS_SECONDS = 1.3;
const OOPS_SECONDS = 1.0;
const MIN_PATH = 4;
const MAX_PATH = 8;

/** A path from the bottom row to the top row: up, left or right steps, never back on itself. */
function makePath(rng: Rng, cols: number, length: number): Array<[number, number]> {
  for (let tries = 0; tries < 400; tries += 1) {
    const sideSteps = length - ROWS;
    let row = 0;
    let col = rng.int(0, cols - 1);
    const cells: Array<[number, number]> = [[row, col]];
    let sides = 0;
    let lastDir = 0;
    while (row < ROWS - 1 || sides < sideSteps) {
      const ups = ROWS - 1 - row;
      const sidesLeft = sideSteps - sides;
      const goUp = ups > 0 && (sidesLeft === 0 || rng.chance(ups / (ups + sidesLeft)));
      if (goUp) {
        row += 1;
        lastDir = 0;
      } else {
        const options = [-1, 1].filter((d) => d !== -lastDir && col + d >= 0 && col + d < cols && !cells.some(([r, c]) => r === row && c === col + d));
        const dir = options.length > 0 ? (options[rng.int(0, options.length - 1)] ?? 1) : 0;
        if (dir === 0) break;
        col += dir;
        sides += 1;
        lastDir = dir;
      }
      cells.push([row, col]);
    }
    if (cells.length === length && row === ROWS - 1) return cells;
  }
  // Fallback: straight across with a few side steps along the top row.
  const cells: Array<[number, number]> = [];
  for (let r = 0; r < ROWS; r += 1) cells.push([r, 0]);
  for (let c = 1; cells.length < length; c += 1) cells.push([ROWS - 1, c]);
  return cells;
}

export function createStonePath({ arena, rng }: GameSetup): MinigameLogic<StoneState> {
  const events = eventQueue();
  const cols = arena.width > arena.height ? 6 : 5;
  const nearBank = arena.height - 55;
  const farBank = HUD_SAFE_TOP + 45;
  const state: StoneState = {
    stones: [],
    path: [],
    phase: 'show',
    phaseTime: 0,
    stepped: 0,
    at: -1,
    hopAgo: 9,
    hopFrom: { x: arena.width / 2, y: nearBank },
    nearBank,
    farBank,
    streams: 0,
    score: 0,
    time: 0,
  };

  function newStream(): void {
    const length = Math.min(MAX_PATH, MIN_PATH + state.streams);
    const marginX = 70;
    const cellW = (arena.width - marginX * 2) / (cols - 1);
    const top = farBank + 75;
    const bottom = nearBank - 75;
    const cellH = (bottom - top) / (ROWS - 1);
    const r = Math.max(TOUCH_RADIUS + 4, Math.min(cellW, cellH) * 0.36);
    state.stones = [];
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const jx = rng.range(-0.12, 0.12) * cellW;
        const jy = rng.range(-0.1, 0.1) * cellH;
        state.stones.push({ x: marginX + col * cellW + jx, y: bottom - row * cellH + jy, r, row, col, litAgo: 99, sankAgo: 99 });
      }
    }
    state.path = makePath(rng, cols, length).map(([row, col]) => row * cols + col);
    state.at = -1;
    state.stepped = 0;
    state.phase = 'show';
    state.phaseTime = 0;
  }

  const currentPoint = (): Point => {
    const stone = state.stones[state.at];
    if (state.at >= 0 && stone) return stone;
    return { x: arena.width / 2, y: state.at === -2 ? farBank : nearBank };
  };

  function hopTo(at: number): void {
    state.hopFrom = currentPoint();
    state.at = at;
    state.hopAgo = 0;
  }

  function tap(p: Point): void {
    let best = -1;
    let bestD = Infinity;
    state.stones.forEach((s, i) => {
      const d = Math.hypot(s.x - p.x, s.y - p.y);
      if (d < s.r + 18 && d < bestD) {
        best = i;
        bestD = d;
      }
    });
    const stone = state.stones[best];
    if (!stone) return;
    if (best === state.path[state.stepped]) {
      hopTo(best);
      stone.litAgo = 0;
      state.stepped += 1;
      events.push({ type: 'action', x: stone.x, y: stone.y, note: 60 + state.stepped * 2, voice: 'bell' });
      if (state.stepped === state.path.length) {
        state.phase = 'cross';
        state.phaseTime = 0;
      }
    } else if (best !== state.at) {
      stone.sankAgo = 0;
      state.phase = 'oops';
      state.phaseTime = 0;
      events.push({ type: 'miss', x: stone.x, y: stone.y });
    }
  }

  newStream();

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
      state.hopAgo += dt;
      for (const s of state.stones) {
        s.litAgo += dt;
        s.sankAgo += dt;
      }
      switch (state.phase) {
        case 'show': {
          const shown = Math.floor(state.phaseTime / SHOW_STEP);
          const stone = state.stones[state.path[shown] ?? -1];
          if (stone && stone.litAgo > SHOW_STEP) {
            stone.litAgo = 0;
            events.push({ type: 'action', x: stone.x, y: stone.y, note: 62 + shown * 2, voice: 'bell' });
          }
          if (shown >= state.path.length) {
            state.phase = 'play';
            state.phaseTime = 0;
          }
          break;
        }
        case 'play':
          for (const p of input.taps) if (state.phase === 'play') tap(p);
          break;
        case 'cross':
          if (state.at !== -2 && state.hopAgo > 0.35) {
            hopTo(-2);
            state.score += 1;
            state.streams += 1;
            events.push({ type: 'score', x: arena.width / 2, y: farBank });
          }
          if (state.phaseTime > CROSS_SECONDS) newStream();
          break;
        case 'oops':
          // Back to the near bank and watch the path again.
          if (state.phaseTime > OOPS_SECONDS) {
            hopTo(-1);
            state.stepped = 0;
            state.phase = 'show';
            state.phaseTime = 0;
          }
          break;
      }
    },
  };
}

/** Good play with a perfect memory: taps the next stone of the path every 0.4 s. */
export function stonePathBot(state: StoneState, _context: BotContext): BotMove {
  if (state.phase !== 'play' || state.hopAgo < 0.4) return {};
  const stone = state.stones[state.path[state.stepped] ?? -1];
  return stone ? { tap: { x: stone.x, y: stone.y } } : {};
}
