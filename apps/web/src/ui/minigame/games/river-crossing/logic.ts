// River crossing: the child rows a little boat that carries her and one thing at a time. Three things wait on
// the near bank: something that chases (a dog), something that eats (a hen), and food (rice). Left alone
// together the dog chases the hen and the hen pecks the rice, so the order of the trips matters. Tap a thing on
// the boat's bank to load it (or tap the boat's load to put it back), tap the oar to cross. Everything over on
// the far bank is a point and a new set comes; a rule broken plays out (a funny chase) and the puzzle starts
// over. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export type Bank = 'near' | 'far';
/** Where each of the three things is: on a bank, or in the boat. */
export type Spot = Bank | 'boat';

/** The pairs that must not stay alone together: the chaser and the eater, the eater and the food. */
export const CONFLICTS: readonly (readonly [number, number])[] = [
  [0, 1],
  [1, 2],
];
/** Sets of things (draw.ts pictures them). */
export const SETS = 3;

const CROSS_SECONDS = 0.9;
const OOPS_SECONDS = 1.8;
const SOLVED_SECONDS = 1.4;

export interface CrossingState {
  set: number;
  spots: Spot[];
  boat: Bank;
  phase: 'load' | 'crossing' | 'oops' | 'solved';
  phaseAgo: number;
  /** The pair that broke the rule (for the chase picture). */
  culprits: [number, number] | null;
  /** The banks' centres, along the river's axis: across is x on a wide screen, y on a tall one. */
  wide: boolean;
  near: Point;
  far: Point;
  slot: number;
  oar: Point;
  oarRadius: number;
  trips: number;
  lastActAt: number;
  puzzles: number;
  score: number;
  time: number;
}

/** Where thing `i` sits on a bank: a row of three along the bank. */
export function slotPoint(state: Pick<CrossingState, 'wide' | 'near' | 'far' | 'slot'>, bank: Bank, i: number): Point {
  const centre = bank === 'near' ? state.near : state.far;
  const offset = (i - 1) * state.slot;
  return state.wide ? { x: centre.x, y: centre.y + offset } : { x: centre.x + offset, y: centre.y };
}

/** The boat's resting place at a bank's edge, or part way across while crossing. */
export function boatPoint(state: CrossingState): Point {
  const edge = (bank: Bank): Point => {
    const c = bank === 'near' ? state.near : state.far;
    const toward = bank === 'near' ? 1 : -1;
    const reach = state.slot * 1.25;
    // Near is left (wide) or bottom (tall); the boat waits on the river side of the bank.
    return state.wide ? { x: c.x + toward * reach, y: c.y } : { x: c.x, y: c.y - toward * reach };
  };
  if (state.phase !== 'crossing') return edge(state.boat);
  const from = edge(state.boat);
  const to = edge(state.boat === 'near' ? 'far' : 'near');
  const t = Math.min(1, state.phaseAgo / CROSS_SECONDS);
  const ease = t * t * (3 - 2 * t);
  return { x: from.x + (to.x - from.x) * ease, y: from.y + (to.y - from.y) * ease };
}

/** The pair left alone on `bank` that breaks a rule, if any. */
export function brokenRule(spots: readonly Spot[], bank: Bank): [number, number] | null {
  for (const [a, b] of CONFLICTS) if (spots[a] === bank && spots[b] === bank) return [a, b];
  return null;
}

/** The shortest list of trips (each the thing carried, or -1 for none) from here to everything across. */
export function solveCrossing(spots: readonly Spot[], boat: Bank): number[] {
  // State: bit i = thing i is on the far bank (things in the boat count as on the boat's bank); bit 3 = boat far.
  const key = (far: boolean[], boatFar: boolean): number => far.reduce((k, f, i) => k | (f ? 1 << i : 0), 0) | (boatFar ? 8 : 0);
  const start = key(
    spots.map((s) => (s === 'boat' ? boat === 'far' : s === 'far')),
    boat === 'far',
  );
  const prev = new Map<number, { from: number; cargo: number }>();
  const queue = [start];
  prev.set(start, { from: -1, cargo: -1 });
  for (let head = 0; head < queue.length; head += 1) {
    const k = queue[head] ?? 0;
    if ((k & 7) === 7) {
      const trips: number[] = [];
      for (let at = k; at !== start; ) {
        const step = prev.get(at);
        if (!step) break;
        trips.unshift(step.cargo);
        at = step.from;
      }
      return trips;
    }
    const boatFar = (k & 8) !== 0;
    for (let cargo = -1; cargo < 3; cargo += 1) {
      if (cargo >= 0 && (((k >> cargo) & 1) === 1) !== boatFar) continue;
      let next = k ^ 8;
      if (cargo >= 0) next ^= 1 << cargo;
      // The bank the boat leaves must be safe.
      const left = boatFar ? 'far' : 'near';
      const after: Spot[] = [0, 1, 2].map((i) => (((next >> i) & 1) === 1 ? 'far' : 'near'));
      if (brokenRule(after, left)) continue;
      if (prev.has(next)) continue;
      prev.set(next, { from: k, cargo });
      queue.push(next);
    }
  }
  return [];
}

export function createRiverCrossing({ arena }: GameSetup): MinigameLogic<CrossingState> {
  const events = eventQueue();
  const wide = arena.width >= arena.height;
  const free = arena.height - HUD_SAFE_TOP;
  const slot = Math.max(TOUCH_RADIUS * 2.2, Math.min(110, (wide ? free : arena.width) / 3.6));
  const near = wide ? { x: arena.width * 0.14, y: HUD_SAFE_TOP + free * 0.52 } : { x: arena.width / 2, y: arena.height - slot * 0.9 - 20 };
  const far = wide ? { x: arena.width * 0.86, y: HUD_SAFE_TOP + free * 0.52 } : { x: arena.width / 2, y: HUD_SAFE_TOP + slot * 0.8 };
  const oarRadius = Math.max(TOUCH_RADIUS + 8, 54);
  const state: CrossingState = {
    set: 0,
    spots: ['near', 'near', 'near'],
    boat: 'near',
    phase: 'load',
    phaseAgo: 0,
    culprits: null,
    wide,
    near,
    far,
    slot,
    oar: wide ? { x: arena.width / 2, y: arena.height - oarRadius - 24 } : { x: arena.width - oarRadius - 24, y: (near.y + far.y) / 2 },
    oarRadius,
    trips: 0,
    lastActAt: -9,
    puzzles: 0,
    score: 0,
    time: 0,
  };

  const reset = (): void => {
    state.spots = ['near', 'near', 'near'];
    state.boat = 'near';
    state.phase = 'load';
    state.phaseAgo = 0;
    state.culprits = null;
    state.trips = 0;
  };

  const cargo = (): number => state.spots.indexOf('boat');

  const tapAt = (p: Point): void => {
    const boat = boatPoint(state);
    const loaded = cargo();
    if (Math.hypot(p.x - state.oar.x, p.y - state.oar.y) <= state.oarRadius * 1.2) {
      depart();
      return;
    }
    if (Math.hypot(p.x - boat.x, p.y - boat.y) <= state.slot * 0.7) {
      if (loaded >= 0) {
        state.spots[loaded] = state.boat;
        events.push({ type: 'action', x: boat.x, y: boat.y });
      } else depart();
      state.lastActAt = state.time;
      return;
    }
    for (let i = 0; i < 3; i += 1) {
      if (state.spots[i] !== state.boat) continue;
      const at = slotPoint(state, state.boat, i);
      if (Math.hypot(p.x - at.x, p.y - at.y) > state.slot * 0.6) continue;
      if (loaded >= 0) state.spots[loaded] = state.boat;
      state.spots[i] = 'boat';
      state.lastActAt = state.time;
      events.push({ type: 'action', x: at.x, y: at.y });
      return;
    }
  };

  const depart = (): void => {
    state.lastActAt = state.time;
    const broken = brokenRule(state.spots, state.boat);
    if (broken) {
      state.phase = 'oops';
      state.phaseAgo = 0;
      state.culprits = broken;
      const at = slotPoint(state, state.boat, broken[1]);
      events.push({ type: 'hit', x: at.x, y: at.y });
      return;
    }
    state.phase = 'crossing';
    state.phaseAgo = 0;
    events.push({ type: 'action', x: state.oar.x, y: state.oar.y, note: 62, voice: 'drum' });
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
      state.phaseAgo += dt;
      if (state.phase === 'crossing') {
        if (state.phaseAgo < CROSS_SECONDS) return;
        state.boat = state.boat === 'near' ? 'far' : 'near';
        state.trips += 1;
        state.phase = 'load';
        state.phaseAgo = 0;
        const delivered = state.spots.every((s) => s === 'far' || (s === 'boat' && state.boat === 'far'));
        if (delivered) {
          state.spots = ['far', 'far', 'far'];
          state.phase = 'solved';
          state.score += 1;
          events.push({ type: 'score', x: state.far.x, y: state.far.y });
        }
        return;
      }
      if (state.phase === 'oops') {
        if (state.phaseAgo >= OOPS_SECONDS) reset();
        return;
      }
      if (state.phase === 'solved') {
        if (state.phaseAgo >= SOLVED_SECONDS) {
          state.puzzles += 1;
          state.set = state.puzzles % SETS;
          reset();
        }
        return;
      }
      const tap = input.taps[0];
      if (tap) tapAt(tap);
    },
  };
}

/** Good play: follows the shortest plan from where things are, one tap every few tenths of a second. */
export function riverCrossingBot(state: CrossingState, _context: BotContext): BotMove {
  if (state.phase !== 'load' || state.time - state.lastActAt < 0.35) return {};
  const plan = solveCrossing(state.spots, state.boat);
  const want = plan[0] ?? -1;
  const loaded = state.spots.indexOf('boat');
  if (loaded === want) return { tap: state.oar };
  if (want < 0) return { tap: boatPoint(state) };
  return { tap: slotPoint(state, state.boat, want) };
}
