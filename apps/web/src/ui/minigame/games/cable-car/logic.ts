// Cable car: cabins glide through the mountain station on an endless cable, then up to the peak. Each cabin
// seats four, and some seats are already taken by friends from the valley. Groups of one to four wait on the
// platform; the child taps a group while a cabin is in the boarding gate: if the group fits in the free seats,
// they hop in (a point for every passenger); too big, and they shake their heads and wait for the next cabin.
// Several small groups may share a cabin. Cabins come a little quicker as the round goes on.
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export const SEATS = 4;
/** Faces of passengers (draw.ts maps them to pictures). */
export const RIDER_COUNT = 8;

export interface Cabin {
  /** Distance along the cable from where it enters on the left. */
  s: number;
  /** Rider face per seat; -1 for a free seat. */
  seats: number[];
  /** When someone last boarded (a bounce). */
  boardedAt: number;
}

export interface Group {
  faces: number[];
  /** Its place in the queue (eases toward its slot). */
  x: number;
  /** When it last refused to board (a head shake), and when it joined. */
  refusedAt: number;
  joinedAt: number;
}

export interface CableCarState {
  cabins: Cabin[];
  groups: Group[];
  /** The cable: flat through the station at `stationY` up to `climbX`, then straight up to the top right. */
  stationY: number;
  climbX: number;
  gateLeft: number;
  gateRight: number;
  /** Where queued groups stand and how far apart. */
  queueY: number;
  slotX: number[];
  groupW: number;
  /** Cabin speed (units/s). */
  speed: number;
  score: number;
  time: number;
}

const QUEUE = 3;
const SPACING_START = 2.3;
const SPACING_END = 1.7;
const CLIMB_ANGLE = -0.62;

export const freeSeats = (cabin: Cabin): number => cabin.seats.filter((s) => s < 0).length;

/** Where a cabin is drawn for its distance along the cable. */
export function cabinPoint(state: CableCarState, s: number): { x: number; y: number } {
  const flat = state.climbX + 160;
  if (s <= flat) return { x: s - 160, y: state.stationY };
  const d = s - flat;
  return { x: state.climbX + Math.cos(CLIMB_ANGLE) * d, y: state.stationY + Math.sin(CLIMB_ANGLE) * d };
}

/** Group sizes, small ones likelier (a group of four needs an empty cabin). */
const SIZES = [1, 1, 2, 2, 2, 3, 3, 4] as const;

function newGroup(rng: Rng, x: number, time: number): Group {
  const size = rng.pick(SIZES);
  return { faces: Array.from({ length: size }, () => rng.int(0, RIDER_COUNT - 1)), x, refusedAt: -9, joinedAt: time };
}

export function createCableCar({ arena, duration, rng }: GameSetup): MinigameLogic<CableCarState> {
  const events = eventQueue();
  const stationY = HUD_SAFE_TOP + Math.max(40, (arena.height - HUD_SAFE_TOP - 330) * 0.45);
  const gateWidth = 230;
  const gateLeft = arena.width * 0.42 - gateWidth / 2;
  const climbX = Math.min(arena.width - 60, gateLeft + gateWidth + 130);
  const groupW = Math.min(180, (arena.width - 40) / QUEUE);
  const slotX = Array.from({ length: QUEUE }, (_, i) => arena.width / 2 + (i - (QUEUE - 1) / 2) * groupW);
  // Below the platform (cabins hang 34 + 104 units under the cable, the platform 70 lower).
  const queueY = stationY + 104 + 70 + 90;
  const state: CableCarState = {
    cabins: [],
    groups: slotX.map((x) => newGroup(rng, x, 0)),
    stationY,
    climbX,
    gateLeft,
    gateRight: gateLeft + gateWidth,
    queueY,
    slotX,
    groupW,
    speed: 150,
    score: 0,
    time: 0,
  };
  let nextCabin = 0;

  const spawnCabin = (): void => {
    // Some seats taken from the valley, but never so many that nobody waiting could get on.
    const smallest = Math.min(...state.groups.map((g) => g.faces.length));
    const taken = Math.min(rng.int(0, 3), SEATS - smallest);
    const seats = Array.from({ length: SEATS }, (_, i) => (i < taken ? rng.int(0, RIDER_COUNT - 1) : -1));
    state.cabins.push({ s: 0, seats, boardedAt: -9 });
  };

  /** The cabin in the boarding gate, if any. */
  const atGate = (): Cabin | undefined =>
    state.cabins.find((c) => {
      const p = cabinPoint(state, c.s);
      return p.y === stationY && p.x >= gateLeft && p.x <= state.gateRight;
    });

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
      const progress = Math.min(1, state.time / duration);
      const spacing = SPACING_START + (SPACING_END - SPACING_START) * progress;
      nextCabin -= dt;
      if (nextCabin <= 0) {
        spawnCabin();
        nextCabin += spacing;
      }
      for (const cabin of state.cabins) cabin.s += state.speed * dt;
      state.cabins = state.cabins.filter((c) => cabinPoint(state, c.s).y > -120);

      for (const tap of input.taps) {
        if (tap.y < stationY + 40) continue;
        const index = state.groups.findIndex((g) => Math.abs(tap.x - g.x) <= groupW / 2 && Math.abs(tap.y - queueY) <= 90);
        const group = state.groups[index];
        if (!group) continue;
        const cabin = atGate();
        if (!cabin || freeSeats(cabin) < group.faces.length) {
          group.refusedAt = state.time;
          events.push({ type: 'miss', x: group.x, y: queueY });
          continue;
        }
        let k = 0;
        for (let seat = 0; seat < SEATS && k < group.faces.length; seat += 1) {
          if ((cabin.seats[seat] ?? 0) >= 0) continue;
          cabin.seats[seat] = group.faces[k] ?? 0;
          k += 1;
        }
        cabin.boardedAt = state.time;
        state.score += group.faces.length;
        const p = cabinPoint(state, cabin.s);
        events.push({ type: 'score', x: p.x, y: p.y, points: group.faces.length, note: 72 + freeSeats(cabin) * 2, voice: 'bell' });
        // The queue moves up; a new group joins at the back.
        state.groups.splice(index, 1);
        state.groups.push(newGroup(rng, arena.width + groupW, state.time));
      }
      for (const [i, group] of state.groups.entries()) {
        const target = slotX[i] ?? group.x;
        group.x += (target - group.x) * Math.min(1, dt * 6);
      }
    },
  };
}

/** Good play: while a cabin is in the gate, the biggest waiting group that fits. */
export function cableCarBot(state: CableCarState, _context: BotContext): BotMove {
  const cabin = state.cabins.find((c) => {
    const p = cabinPoint(state, c.s);
    return p.y === state.stationY && p.x >= state.gateLeft + 10 && p.x <= state.gateRight - 10;
  });
  if (!cabin) return {};
  const free = freeSeats(cabin);
  let best: { x: number; size: number } | null = null;
  for (const [i, g] of state.groups.entries()) {
    const slot = state.slotX[i] ?? g.x;
    // Only groups standing still in their place (a child taps what she can see).
    if (Math.abs(g.x - slot) > 20) continue;
    if (g.faces.length <= free && (!best || g.faces.length > best.size)) best = { x: g.x, size: g.faces.length };
  }
  return best ? { tap: { x: best.x, y: state.queueY } } : {};
}
