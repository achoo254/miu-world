// Cup stacking (sport stacking 3-3-3): three stations of three nested cups. Up: at each station from left to
// right, tap where a cup goes: the two bottom places first, then the top. Down: from left to right again, the
// top cup first, then the two bottom ones, back into a nest. Tapping the top place before the bottom ones
// (or a bottom cup while the top one still sits on it) topples the tower: it falls and that station starts its
// step again. Each station built or taken down is a point; a whole round up and down is six. Pure: no DOM, no
// canvas.
import { eventQueue } from '../../define-minigame';
import { type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export type Slot = 'left' | 'right' | 'top';
export const SLOTS: readonly Slot[] = ['left', 'right', 'top'];

export interface Station {
  x: number;
  /** Cups standing in the pyramid (the rest are in the nest). */
  placed: Set<Slot>;
  /** Seconds since it toppled (cups tumbling), large when not. */
  toppledAgo: number;
  /** Seconds since each slot changed (a cup sliding in or out). */
  moved: Record<Slot, number>;
}

export interface CupState {
  stations: Station[];
  /** Up the three stations, then down them. */
  phase: 'up' | 'down';
  /** The station being worked on (0–2). */
  current: number;
  cupW: number;
  cupH: number;
  tableY: number;
  /** Seconds the stopwatch shows for this round, and the best round so far. */
  roundTime: number;
  best: number | null;
  rounds: number;
  lastTapAt: number;
  score: number;
  time: number;
}

const TOPPLE_SECONDS = 0.8;

/** Where a station's pyramid stands: left of its middle, with the nest of spare cups on the right. */
export const pyramidX = (state: CupState, station: Station): number => station.x - state.cupW / 2 - 6;
export const nestX = (state: CupState, station: Station): number => station.x + state.cupW + 6;

/** Centre of a slot's cup at a station (a pyramid of two and one). */
export function slotCentre(state: CupState, station: Station, slot: Slot): Point {
  const { cupW, cupH, tableY } = state;
  const x = pyramidX(state, station);
  if (slot === 'top') return { x, y: tableY - cupH * 1.5 };
  return { x: x + (slot === 'left' ? -1 : 1) * (cupW / 2 + 4), y: tableY - cupH / 2 };
}

export function createCupStacking({ arena }: GameSetup): MinigameLogic<CupState> {
  const events = eventQueue();
  const spacing = arena.width / 3;
  // A pyramid two cups wide and a nest one cup wide fit in each third of the table.
  const cupW = Math.min(88, (spacing - 34) / 3);
  const cupH = cupW * 1.15;
  const state: CupState = {
    stations: [0, 1, 2].map((i) => ({ x: spacing * (i + 0.5), placed: new Set<Slot>(), toppledAgo: 9, moved: { left: 9, right: 9, top: 9 } })),
    phase: 'up',
    current: 0,
    cupW,
    cupH,
    tableY: arena.height - 90,
    roundTime: 0,
    best: null,
    rounds: 0,
    lastTapAt: -9,
    score: 0,
    time: 0,
  };

  /** The slot under a point at a station, or null (a slot's area is a little bigger than its cup). */
  function slotAt(station: Station, p: Point): Slot | null {
    let best: Slot | null = null;
    let bestD = Infinity;
    for (const slot of SLOTS) {
      const c = slotCentre(state, station, slot);
      const dx = Math.abs(p.x - c.x);
      const dy = Math.abs(p.y - c.y);
      if (dx <= cupW / 2 + 10 && dy <= cupH / 2 + 10 && dx + dy < bestD) {
        best = slot;
        bestD = dx + dy;
      }
    }
    return best;
  }

  function topple(station: Station): void {
    station.toppledAgo = 0;
    // The station starts its step again: back in the nest to build, or built again to take down.
    station.placed = state.phase === 'up' ? new Set() : new Set(SLOTS);
    events.push({ type: 'hit', x: station.x, y: state.tableY - cupH });
  }

  function tap(p: Point): void {
    const station = state.stations[state.current];
    if (!station || station.toppledAgo < TOPPLE_SECONDS) return;
    const slot = slotAt(station, p);
    if (!slot) {
      if (state.stations.some((s, i) => i !== state.current && Math.abs(p.x - s.x) < spacing / 2)) events.push({ type: 'miss', ...p });
      return;
    }
    state.lastTapAt = state.time;
    const c = slotCentre(state, station, slot);
    if (state.phase === 'up') {
      if (station.placed.has(slot)) return;
      if (slot === 'top' && !(station.placed.has('left') && station.placed.has('right'))) return topple(station);
      station.placed.add(slot);
    } else {
      if (!station.placed.has(slot)) return;
      if (slot !== 'top' && station.placed.has('top')) return topple(station);
      station.placed.delete(slot);
    }
    station.moved[slot] = 0;
    events.push({ type: 'action', ...c, note: state.phase === 'up' ? 67 + SLOTS.indexOf(slot) * 2 : 74 - SLOTS.indexOf(slot) * 2, voice: 'bell' });
    const finished = state.phase === 'up' ? station.placed.size === 3 : station.placed.size === 0;
    if (!finished) return;
    state.score += 1;
    events.push({ type: 'score', x: station.x, y: state.tableY - cupH * 2.2 });
    state.current += 1;
    if (state.current < 3) return;
    state.current = 0;
    if (state.phase === 'up') {
      state.phase = 'down';
      return;
    }
    state.phase = 'up';
    state.rounds += 1;
    state.best = state.best === null ? state.roundTime : Math.min(state.best, state.roundTime);
    state.roundTime = 0;
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
      state.roundTime += dt;
      for (const s of state.stations) {
        s.toppledAgo += dt;
        for (const slot of SLOTS) s.moved[slot] += dt;
      }
      for (const p of input.taps) tap(p);
    },
  };
}

/** Seconds the bot takes between two cups, like a quick child. */
const BOT_PAUSE = 0.3;

/** Good play: the right order every time. */
export function cupStackingBot(state: CupState, _context: BotContext): BotMove {
  if (state.time - state.lastTapAt < BOT_PAUSE) return {};
  const station = state.stations[state.current];
  if (!station || station.toppledAgo < 0.8) return {};
  const order: Slot[] = state.phase === 'up' ? ['left', 'right', 'top'] : ['top', 'left', 'right'];
  const slot = order.find((s) => (state.phase === 'up' ? !station.placed.has(s) : station.placed.has(s)));
  return slot ? { tap: slotCentre(state, station, slot) } : {};
}
