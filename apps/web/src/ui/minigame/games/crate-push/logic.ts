// Crate push (a small Sokoban): the child walks a storeroom by swiping (or tapping beside herself) and pushes
// crates onto the starred spots. Crates can be pushed, never pulled; a crate stuck in a corner off its spot
// makes the restart button pulse. Each finished room is a point and opens the next (one crate, then two).
// Every room is hand-made and proven solvable by the search the bot uses. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point, type SwipeDirection } from '../../types';

/** Rooms by difficulty: `#` wall, `.` spot, `$` crate, `@` the child. */
export const ROOMS: readonly (readonly string[])[][] = [
  [
    ['#######', '#.    #', '#  $  #', '#   @ #', '#     #', '#######'],
    ['#######', '#@    #', '# ##  #', '#  $ .#', '#     #', '#######'],
    ['#######', '#   . #', '# #$# #', '#  @  #', '#     #', '#######'],
  ],
  [
    ['########', '#      #', '# $  $ #', '# .  . #', '#  @   #', '########'],
    ['#######', '#. $  #', '#  @  #', '#  $ .#', '#     #', '#######'],
    ['########', '#   #  #', '# $   .#', '#  @#  #', '#.$    #', '#      #', '########'],
    ['#######', '# .#  #', '#  $  #', '#.$@# #', '#     #', '#######'],
  ],
  [
    ['#######', '#.  # #', '# $   #', '## #$ #', '#  @ .#', '#     #', '#######'],
    ['########', '#  .   #', '# ##$# #', '#   @  #', '# $##  #', '#   .  #', '########'],
  ],
];

export interface Cell {
  x: number;
  y: number;
}

export interface CrateState {
  cols: number;
  rows: number;
  walls: boolean[];
  spots: Cell[];
  crates: Cell[];
  player: Cell;
  /** Where the child came from on the last step and how long ago (a slide), and the crate she pushed. */
  from: Cell;
  moved: number;
  pushed: number;
  facing: SwipeDirection;
  /** Grid placement on screen. */
  cell: number;
  originX: number;
  originY: number;
  reset: Point;
  /** A crate is stuck where it can never reach a spot. */
  stuck: boolean;
  /** Seconds since the room was finished (-1 while playing). */
  solved: number;
  rooms: number;
  moves: number;
  score: number;
  time: number;
}

const STEP: Readonly<Record<SwipeDirection, Cell>> = { left: { x: -1, y: 0 }, right: { x: 1, y: 0 }, up: { x: 0, y: -1 }, down: { x: 0, y: 1 } };
const DIRECTIONS: readonly SwipeDirection[] = ['up', 'down', 'left', 'right'];
const NEXT_ROOM = 1.2;

const same = (a: Cell, b: Cell): boolean => a.x === b.x && a.y === b.y;
export const isWall = (state: Pick<CrateState, 'walls' | 'cols' | 'rows'>, c: Cell): boolean => c.x < 0 || c.y < 0 || c.x >= state.cols || c.y >= state.rows || state.walls[c.y * state.cols + c.x] === true;

export function parseRoom(rows: readonly string[]): Pick<CrateState, 'cols' | 'rows' | 'walls' | 'spots' | 'crates' | 'player'> {
  const cols = Math.max(...rows.map((r) => r.length));
  const walls: boolean[] = [];
  const spots: Cell[] = [];
  const crates: Cell[] = [];
  let player: Cell = { x: 1, y: 1 };
  rows.forEach((row, y) => {
    for (let x = 0; x < cols; x += 1) {
      const c = row[x] ?? ' ';
      walls.push(c === '#');
      if (c === '.' || c === '*' || c === '+') spots.push({ x, y });
      if (c === '$' || c === '*') crates.push({ x, y });
      if (c === '@' || c === '+') player = { x, y };
    }
  });
  return { cols, rows: rows.length, walls, spots, crates, player };
}

type Grid = Pick<CrateState, 'cols' | 'rows' | 'walls' | 'spots'>;

/** One step of the rules: the new child and crates, or null when the way is blocked. */
export function tryStep(grid: Grid, player: Cell, crates: readonly Cell[], dir: SwipeDirection): { player: Cell; crates: Cell[]; pushed: number } | null {
  const d = STEP[dir];
  const next = { x: player.x + d.x, y: player.y + d.y };
  if (isWall(grid, next)) return null;
  const hit = crates.findIndex((c) => same(c, next));
  if (hit < 0) return { player: next, crates: [...crates], pushed: -1 };
  const beyond = { x: next.x + d.x, y: next.y + d.y };
  if (isWall(grid, beyond) || crates.some((c) => same(c, beyond))) return null;
  return { player: next, crates: crates.map((c, i) => (i === hit ? beyond : c)), pushed: hit };
}

const solvedBy = (grid: Grid, crates: readonly Cell[]): boolean => crates.every((c) => grid.spots.some((s) => same(s, c)));
const stateKey = (player: Cell, crates: readonly Cell[]): string => `${player.x},${player.y}|${crates.map((c) => `${c.x},${c.y}`).sort().join(';')}`;

const plans = new Map<string, SwipeDirection | null>();

/** The first step of a shortest solution from here (null when solved or impossible), cached per position. */
export function solveStep(grid: Grid, player: Cell, crates: readonly Cell[]): SwipeDirection | null {
  const gridKey = grid.walls.map((w) => (w ? 1 : 0)).join('') + grid.spots.map((s) => `${s.x},${s.y}`).join(';');
  const startKey = `${gridKey}#${stateKey(player, crates)}`;
  const cached = plans.get(startKey);
  if (cached !== undefined) return cached;
  if (solvedBy(grid, crates)) return null;
  const seen = new Set([stateKey(player, crates)]);
  const queue: Array<{ player: Cell; crates: Cell[]; path: SwipeDirection[] }> = [{ player, crates: [...crates], path: [] }];
  for (let head = 0; head < queue.length && head < 200000; head += 1) {
    const node = queue[head];
    if (!node) break;
    for (const dir of DIRECTIONS) {
      const next = tryStep(grid, node.player, node.crates, dir);
      if (!next) continue;
      const k = stateKey(next.player, next.crates);
      if (seen.has(k)) continue;
      seen.add(k);
      const path = [...node.path, dir];
      if (solvedBy(grid, next.crates)) {
        let p = player;
        let cs = [...crates];
        for (const step of path) {
          plans.set(`${gridKey}#${stateKey(p, cs)}`, step);
          const moved = tryStep(grid, p, cs, step);
          if (!moved) break;
          p = moved.player;
          cs = moved.crates;
        }
        return path[0] ?? null;
      }
      queue.push({ player: next.player, crates: next.crates, path });
    }
  }
  plans.set(startKey, null);
  return null;
}

/** A crate off its spot in a corner can never move out again. */
function anyStuck(state: CrateState): boolean {
  return state.crates.some((c) => {
    if (state.spots.some((s) => same(s, c))) return false;
    const w = (dx: number, dy: number): boolean => isWall(state, { x: c.x + dx, y: c.y + dy });
    return (w(-1, 0) || w(1, 0)) && (w(0, -1) || w(0, 1));
  });
}

export function createCratePush({ arena, rng }: GameSetup): MinigameLogic<CrateState> {
  const events = eventQueue();
  const state: CrateState = {
    cols: 0,
    rows: 0,
    walls: [],
    spots: [],
    crates: [],
    player: { x: 0, y: 0 },
    from: { x: 0, y: 0 },
    moved: 9,
    pushed: -1,
    facing: 'down',
    cell: 80,
    originX: 0,
    originY: 0,
    reset: { x: arena.width - 70, y: arena.height - 70 },
    stuck: false,
    solved: -1,
    rooms: 0,
    moves: 0,
    score: 0,
    time: 0,
  };
  let room: readonly string[] = [];

  function load(rows: readonly string[]): void {
    room = rows;
    Object.assign(state, parseRoom(rows));
    state.from = { ...state.player };
    state.moved = 9;
    state.pushed = -1;
    state.stuck = false;
    state.solved = -1;
    state.moves = 0;
    const top = HUD_SAFE_TOP + 20;
    const availW = arena.width - 40;
    const availH = arena.height - top - 150;
    state.cell = Math.floor(Math.min(96, availW / state.cols, availH / state.rows));
    state.originX = (arena.width - state.cell * state.cols) / 2;
    state.originY = top + (availH - state.cell * state.rows) / 2;
  }
  const pickRoom = (): void => {
    const tier = ROOMS[Math.min(state.rooms, ROOMS.length - 1)] ?? [];
    load(tier[rng.int(0, tier.length - 1)] ?? []);
  };
  pickRoom();

  const centre = (c: Cell): Point => ({ x: state.originX + (c.x + 0.5) * state.cell, y: state.originY + (c.y + 0.5) * state.cell });

  function walk(dir: SwipeDirection): void {
    state.facing = dir;
    const next = tryStep(state, state.player, state.crates, dir);
    if (!next) {
      events.push({ type: 'miss', ...centre(state.player) });
      return;
    }
    const onSpot = (cs: readonly Cell[]): number => cs.filter((c) => state.spots.some((s) => same(s, c))).length;
    const before = onSpot(state.crates);
    state.from = state.player;
    state.player = next.player;
    state.crates = next.crates;
    state.pushed = next.pushed;
    state.moved = 0;
    state.moves += 1;
    if (next.pushed >= 0) events.push({ type: 'action', ...centre(next.crates[next.pushed] ?? state.player) });
    if (onSpot(state.crates) > before && !solvedBy(state, state.crates)) {
      // A crate on its spot: a little note going up.
      events.push({ type: 'action', ...centre(next.crates[next.pushed] ?? state.player), note: 72, voice: 'bell' });
    }
    state.stuck = anyStuck(state);
    if (solvedBy(state, state.crates)) {
      state.solved = 0;
      state.score += 1;
      events.push({ type: 'score', ...centre(state.player) });
    }
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
      state.moved += dt;
      if (state.solved >= 0) {
        state.solved += dt;
        if (state.solved >= NEXT_ROOM) {
          state.rooms += 1;
          pickRoom();
        }
        return;
      }
      for (const swipe of input.swipes) walk(swipe.direction);
      for (const tap of input.taps) {
        if (Math.hypot(tap.x - state.reset.x, tap.y - state.reset.y) < 56) {
          load(room);
          events.push({ type: 'action', ...state.reset });
          continue;
        }
        // A tap beside her (any distance along the way she should go) steps that way.
        const at = centre(state.player);
        const dx = tap.x - at.x;
        const dy = tap.y - at.y;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < state.cell * 0.5) continue;
        walk(Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down');
      }
    },
  };
}

/** Good play: follow a shortest solution, restarting a room it has made impossible. */
export function cratePushBot(state: CrateState, _context: BotContext): BotMove {
  if (state.solved >= 0) return {};
  const dir = solveStep(state, state.player, state.crates);
  if (!dir) return { tap: state.reset };
  const from = { x: state.originX + (state.player.x + 0.5) * state.cell, y: state.originY + (state.player.y + 0.5) * state.cell };
  const d = STEP[dir];
  return { swipe: { from, dx: d.x * 80, dy: d.y * 80 } };
}
