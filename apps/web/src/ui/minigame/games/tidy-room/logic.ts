// Tidy room: a tidy room with toys in their places (on the shelf, the bed, the table, the window sill…) is
// shown for a few seconds; then the little chick runs through and everything lands in a heap in the middle.
// The child drags each toy back to where it was. Right place: it snaps in (a point). Another toy's place: it
// hops back to the heap, no penalty. Anywhere else it just stays where it was put. A tidy room brings the next
// one, with more toys. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import type { SpriteName } from '../../sprites';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export type Furniture = 'shelf' | 'window' | 'bed' | 'table' | 'box' | 'chair';

export interface Spot extends Point {
  furniture: Furniture;
}

export interface Toy {
  picture: SpriteName;
  /** Its own place (index into spots). */
  home: number;
  x: number;
  y: number;
  /** Where it lies in the heap (it hops back there after a wrong place). */
  heap: Point;
  placed: boolean;
  /** Seconds since it snapped in, or hopped back (-1 for neither). */
  snappedAgo: number;
  hoppedAgo: number;
}

export type Phase = 'look' | 'mess' | 'play' | 'tidy';

export interface TidyState {
  spots: Spot[];
  toys: Toy[];
  phase: Phase;
  /** Seconds left of the look, the mess, or the tidy celebration. */
  timer: number;
  lookSeconds: number;
  /** The toy in the finger, or -1. */
  held: number;
  rooms: number;
  floorY: number;
  lastMoveAt: number;
  score: number;
  time: number;
}

export const SNAP_REACH = 70;
const PICK_REACH = TOUCH_RADIUS + 26;
const MESS_SECONDS = 1.1;
const TIDY_SECONDS = 1.2;
const TOYS: readonly SpriteName[] = ['teddy-bear', 'kite', 'soccer-ball', 'drum', 'puzzle-piece', 'rocket', 'gift', 'unicorn', 'basketball', 'balloon'];

/** Places in the room, as fractions of the play area: furniture along the walls, the middle left free. */
const LANDSCAPE: readonly [number, number, Furniture][] = [
  [0.1, 0.18, 'shelf'],
  [0.26, 0.18, 'shelf'],
  [0.5, 0.2, 'window'],
  [0.74, 0.18, 'shelf'],
  [0.9, 0.18, 'shelf'],
  [0.12, 0.78, 'bed'],
  [0.88, 0.75, 'table'],
  [0.7, 0.92, 'box'],
  [0.3, 0.92, 'chair'],
];
const PORTRAIT: readonly [number, number, Furniture][] = [
  [0.15, 0.14, 'shelf'],
  [0.5, 0.14, 'shelf'],
  [0.85, 0.14, 'shelf'],
  [0.5, 0.33, 'window'],
  [0.18, 0.62, 'bed'],
  [0.82, 0.62, 'table'],
  [0.2, 0.9, 'chair'],
  [0.8, 0.9, 'box'],
  [0.15, 0.36, 'shelf'],
];

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

export function createTidyRoom({ arena, rng }: GameSetup): MinigameLogic<TidyState> {
  const events = eventQueue();
  const landscape = arena.width > arena.height * 1.15;
  const area = { x: 30, y: HUD_SAFE_TOP + 20, w: arena.width - 60, h: arena.height - HUD_SAFE_TOP - 50 };
  const spots: Spot[] = (landscape ? LANDSCAPE : PORTRAIT).map(([fx, fy, furniture]) => ({ x: area.x + fx * area.w, y: area.y + fy * area.h, furniture }));
  const heapCentre = { x: arena.width / 2, y: area.y + area.h * (landscape ? 0.55 : 0.48) };
  const state: TidyState = { spots, toys: [], phase: 'look', timer: 0, lookSeconds: 4, held: -1, rooms: 0, floorY: area.y + area.h * (landscape ? 0.42 : 0.4), lastMoveAt: 0, score: 0, time: 0 };

  function newRoom(): void {
    const count = Math.min(7, 4 + state.rooms);
    const places = shuffle(spots.map((_, i) => i), rng).slice(0, count);
    const pictures = shuffle([...TOYS], rng).slice(0, count);
    state.toys = places.map((home, i) => {
      const spot = spots[home] ?? heapCentre;
      const a = (i / count) * Math.PI * 2 + rng.range(-0.3, 0.3);
      const heap = { x: heapCentre.x + Math.cos(a) * 110, y: heapCentre.y + Math.sin(a) * 70 };
      return { picture: pictures[i] ?? 'teddy-bear', home, x: spot.x, y: spot.y, heap, placed: true, snappedAgo: -1, hoppedAgo: -1 };
    });
    state.phase = 'look';
    state.lookSeconds = Math.max(3, 4.5 - state.rooms * 0.3);
    state.timer = state.lookSeconds;
    state.held = -1;
    state.rooms += 1;
  }
  newRoom();

  let lastPointer: Point | null = null;

  function drop(toy: Toy, at: Point): void {
    const spot = spots.findIndex((s) => Math.hypot(s.x - at.x, s.y - at.y) <= SNAP_REACH);
    state.lastMoveAt = state.time;
    if (spot === toy.home) {
      const home = spots[spot] ?? at;
      toy.x = home.x;
      toy.y = home.y;
      toy.placed = true;
      toy.snappedAgo = 0;
      state.score += 1;
      events.push({ type: 'score', x: home.x, y: home.y - 30 });
      if (state.toys.every((t) => t.placed)) {
        state.phase = 'tidy';
        state.timer = TIDY_SECONDS;
      }
    } else if (spot >= 0) {
      toy.x = toy.heap.x;
      toy.y = toy.heap.y;
      toy.hoppedAgo = 0;
      events.push({ type: 'miss', x: at.x, y: at.y });
    } else {
      toy.x = at.x;
      toy.y = at.y;
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
      for (const t of state.toys) {
        if (t.snappedAgo >= 0) t.snappedAgo += dt;
        if (t.hoppedAgo >= 0) t.hoppedAgo += dt;
      }
      if (state.phase !== 'play') {
        state.timer -= dt;
        if (state.timer > 0) {
          lastPointer = input.pointer;
          return;
        }
        if (state.phase === 'look') {
          state.phase = 'mess';
          state.timer = MESS_SECONDS;
          events.push({ type: 'action', x: arena.width / 2, y: heapCentre.y, note: 60, voice: 'drum' });
        } else if (state.phase === 'mess') {
          state.phase = 'play';
          state.lastMoveAt = state.time;
          for (const t of state.toys) {
            t.x = t.heap.x;
            t.y = t.heap.y;
            t.placed = false;
          }
        } else newRoom();
        lastPointer = input.pointer;
        return;
      }
      if (input.pressed && input.pointer && state.held < 0) {
        const p = input.pointer;
        let best = -1;
        let bestD = PICK_REACH;
        state.toys.forEach((t, i) => {
          const d = Math.hypot(t.x - p.x, t.y - p.y);
          if (!t.placed && d < bestD) {
            best = i;
            bestD = d;
          }
        });
        state.held = best;
      }
      const toy = state.toys[state.held];
      if (toy && input.pointer) {
        toy.x = input.pointer.x;
        toy.y = input.pointer.y;
      }
      if (input.released && toy) {
        state.held = -1;
        drop(toy, lastPointer ?? toy);
      }
      lastPointer = input.pointer;
    },
  };
}

/** Good play: carries each toy home (it remembers where everything was), one after the other. */
export function tidyRoomBot(state: TidyState, _context: BotContext): BotMove {
  if (state.phase !== 'play') return {};
  const held = state.toys[state.held];
  if (held) {
    const home = state.spots[held.home];
    if (!home) return {};
    return Math.hypot(held.x - home.x, held.y - home.y) < 4 ? {} : { touch: { x: home.x, y: home.y } };
  }
  if (state.time - state.lastMoveAt < 0.35) return {};
  const next = state.toys.find((t) => !t.placed);
  return next ? { touch: { x: next.x, y: next.y } } : {};
}
