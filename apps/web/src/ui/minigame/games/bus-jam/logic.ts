// Bus jam: little animals fill the station's waiting area, each wearing its group's colour. Buses come one
// at a time, each for one group, three seats. The child taps an animal that has a free way up to the top
// edge: it walks out and boards if its bus is the one waiting, or sits on the bench (five seats) to wait for
// its bus. A full bus drives off (a point) and the next one comes; animals on the bench board it if it is
// theirs. A full bench means the station is set again (no points lost). Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import type { SpriteName } from '../../sprites';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

/** The groups: an animal each (colour comes from draw.ts), so colour is never the only clue. */
export const GROUPS: readonly SpriteName[] = ['cat', 'rabbit', 'frog', 'panda', 'fox'];
export const SEATS = 3;

export interface Rider {
  group: number;
  /** Grid cell, or -1 once out of the grid. */
  cell: number;
  /** Bench seat, or -1. */
  seat: number;
  boarded: boolean;
  /** Where it walks from and when it left (for the walk). */
  from: Point;
  leftAt: number;
}

export interface BusState {
  cols: number;
  rows: number;
  /** Grid's top-left and cell size; the exit is the grid's top edge. */
  left: number;
  top: number;
  cell: number;
  riders: Rider[];
  /** Buses still to come for this station (groups), the first one waiting at the stop. */
  buses: number[];
  /** Riders on the waiting bus. */
  aboard: number;
  /** Seconds since the bus at the stop arrived; it drives off when full. */
  busAge: number;
  departing: number;
  departingGroup: number;
  benchSize: number;
  benchY: number;
  stop: Point;
  /** Seconds since the bench filled up (the station is set again), large = long ago. */
  resetAgo: number;
  /** Seconds since a tap on an animal with no way out (it shakes). */
  blocked: { cell: number; ago: number };
  stations: number;
  score: number;
  time: number;
}

const DEPART_SECONDS = 0.9;
export const WALK_SECONDS = 0.35;

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

/** Cells (of a cols × rows grid) with a free way up through empty cells to the top edge. */
export function freeCells(cols: number, rows: number, occupied: ReadonlySet<number>): Set<number> {
  const reach = new Set<number>();
  // Flood from the top edge through empty cells; an occupied cell touching the flood (or the edge) can leave.
  const queue: number[] = [];
  for (let c = 0; c < cols; c += 1) {
    if (!occupied.has(c)) {
      reach.add(c);
      queue.push(c);
    }
  }
  while (queue.length > 0) {
    const i = queue.shift() ?? 0;
    const r = Math.floor(i / cols);
    const c = i % cols;
    for (const [nr, nc] of [
      [r + 1, c],
      [r - 1, c],
      [r, c + 1],
      [r, c - 1],
    ] as const) {
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      const n = nr * cols + nc;
      if (occupied.has(n) || reach.has(n)) continue;
      reach.add(n);
      queue.push(n);
    }
  }
  const out = new Set<number>();
  for (const i of occupied) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const around = [r > 0 ? i - cols : -1, r < rows - 1 ? i + cols : -1, c > 0 ? i - 1 : -1, c < cols - 1 ? i + 1 : -1];
    if (r === 0 || around.some((n) => n >= 0 && reach.has(n))) out.add(i);
  }
  return out;
}

export function createBusJam({ arena, params, rng }: GameSetup): MinigameLogic<BusState> {
  const benchSize = typeof params.bench === 'number' ? Math.round(Math.min(7, Math.max(3, params.bench))) : 5;
  const events = eventQueue();
  const wide = arena.width > arena.height;
  const cols = wide ? 5 : 4;
  // Three rows, or six on a tall phone (always a multiple of three animals).
  const avail = arena.height - HUD_SAFE_TOP - 40;
  const cell = Math.min((arena.width - 40) / cols, 130);
  const rows = avail - 230 >= cell * 6 ? 6 : 3;
  const size = Math.min(cell, (avail - 230) / rows);
  const block = 230 + rows * size;
  const top = HUD_SAFE_TOP + 20 + Math.max(0, (avail - block) / 2);
  const state: BusState = {
    cols,
    rows,
    left: (arena.width - cols * size) / 2,
    top: top + 230,
    cell: size,
    riders: [],
    buses: [],
    aboard: 0,
    busAge: 0,
    departing: -1,
    departingGroup: 0,
    benchSize,
    benchY: top + 165,
    stop: { x: arena.width / 2, y: top + 70 },
    resetAgo: 99,
    blocked: { cell: -1, ago: 99 },
    stations: 0,
    score: 0,
    time: 0,
  };

  function newStation(): void {
    const count = cols * rows;
    const buses = count / SEATS;
    const kinds = shuffle([...GROUPS.keys()], rng).slice(0, Math.min(GROUPS.length, 4 + Math.floor(state.stations / 3)));
    const busList = Array.from({ length: buses }, (_, i) => kinds[i % kinds.length] ?? 0);
    const riders = shuffle(busList.flatMap((g) => [g, g, g]), rng);
    state.riders = riders.map((group, cellIndex) => ({ group, cell: cellIndex, seat: -1, boarded: false, from: cellCentre(state, cellIndex), leftAt: -9 }));
    state.buses = shuffle(busList, rng);
    state.aboard = 0;
    state.busAge = 0;
    state.stations += 1;
  }

  const benchX = (seat: number): number => arena.width / 2 + (seat - (benchSize - 1) / 2) * Math.min(100, (arena.width - 40) / benchSize);
  const occupied = (): Set<number> => new Set(state.riders.filter((r) => r.cell >= 0).map((r) => r.cell));

  function board(rider: Rider, from: Point): void {
    rider.boarded = true;
    rider.cell = -1;
    rider.seat = -1;
    rider.from = from;
    rider.leftAt = state.time;
    state.aboard += 1;
    if (state.aboard === SEATS) {
      state.score += 1;
      state.departing = 0;
      state.departingGroup = state.buses[0] ?? 0;
      events.push({ type: 'score', x: state.stop.x, y: state.stop.y });
    }
  }

  function nextBus(): void {
    state.buses.shift();
    state.aboard = 0;
    state.busAge = 0;
    if (state.buses.length === 0) {
      newStation();
      return;
    }
    // Animals on the bench for this bus get on.
    for (const r of state.riders) {
      if (r.seat >= 0 && r.group === state.buses[0] && state.aboard < SEATS) board(r, { x: benchX(r.seat), y: state.benchY });
    }
  }

  function tap(p: Point): void {
    const c = Math.floor((p.x - state.left) / state.cell);
    const row = Math.floor((p.y - state.top) / state.cell);
    if (c < 0 || c >= cols || row < 0 || row >= rows) return;
    const index = row * cols + c;
    const rider = state.riders.find((r) => r.cell === index);
    if (!rider) return;
    if (!freeCells(cols, rows, occupied()).has(index)) {
      state.blocked = { cell: index, ago: 0 };
      events.push({ type: 'miss', x: p.x, y: p.y });
      return;
    }
    const from = cellCentre(state, index);
    if (rider.group === state.buses[0] && state.aboard < SEATS && state.departing < 0) {
      board(rider, from);
      events.push({ type: 'action', x: from.x, y: from.y });
      return;
    }
    const taken = new Set(state.riders.filter((r) => r.seat >= 0).map((r) => r.seat));
    const seat = Array.from({ length: benchSize }, (_, i) => i).find((i) => !taken.has(i));
    if (seat === undefined) return;
    rider.cell = -1;
    rider.seat = seat;
    rider.from = from;
    rider.leftAt = state.time;
    events.push({ type: 'action', x: from.x, y: from.y });
    if (taken.size + 1 >= benchSize) {
      // Bench full: set the station again.
      state.resetAgo = 0;
      events.push({ type: 'hit', x: arena.width / 2, y: state.benchY });
      newStation();
    }
  }

  newStation();

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
      state.busAge += dt;
      state.resetAgo += dt;
      state.blocked.ago += dt;
      if (state.departing >= 0) {
        state.departing += dt;
        if (state.departing >= DEPART_SECONDS) {
          state.departing = -1;
          state.riders = state.riders.filter((r) => !r.boarded);
          nextBus();
        }
        return;
      }
      for (const p of input.taps) tap(p);
    },
  };
}

export function cellCentre(state: Pick<BusState, 'left' | 'top' | 'cell' | 'cols'>, index: number): Point {
  return { x: state.left + ((index % state.cols) + 0.5) * state.cell, y: state.top + (Math.floor(index / state.cols) + 0.5) * state.cell };
}

/**
 * Good play: sends the waiting bus's animals first; otherwise benches the animal that opens a way for them (or
 * whose bus comes soonest), and only fills the last bench seat when nothing else can be done.
 */
export function busJamBot(state: BusState, _context: BotContext): BotMove {
  if (state.departing >= 0 || Math.floor(state.time * 10) % 3 !== 0) return {};
  const occupied = new Set(state.riders.filter((r) => r.cell >= 0).map((r) => r.cell));
  const free = freeCells(state.cols, state.rows, occupied);
  const ready = state.riders.filter((r) => r.cell >= 0 && free.has(r.cell));
  const waiting = state.buses[0];
  const now = ready.find((r) => r.group === waiting);
  if (now) return { tap: cellCentre(state, now.cell) };
  const soon = (r: Rider): number => {
    const at = state.buses.indexOf(r.group);
    return at < 0 ? 99 : at;
  };
  // How many of the waiting bus's animals would be free once this one is out.
  const opens = (r: Rider): number => {
    const rest = new Set(occupied);
    rest.delete(r.cell);
    const after = freeCells(state.cols, state.rows, rest);
    return state.riders.filter((x) => x.cell >= 0 && x !== r && x.group === waiting && after.has(x.cell)).length;
  };
  const pick = [...ready].sort((a, b) => opens(b) - opens(a) || soon(a) - soon(b))[0];
  return pick ? { tap: cellCentre(state, pick.cell) } : {};
}
