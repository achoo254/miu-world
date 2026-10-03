// Hide and seek: friends hide behind trees, bushes, crates and logs. Now and then one peeks out for a
// moment, then ducks back. Tapping the hiding place of a friend she saw peek (while it is still there)
// finds it (a point); after a little while a friend that peeked sneaks off to another place. The wind
// rustles places where nobody hides, to fool her. Tapping a place with nobody seen there makes her look a
// moment before she can tap again. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const PLACES = ['deciduous-tree', 'evergreen-tree', 'package', 'wood', 'herb', 'sunflower', 'deciduous-tree', 'evergreen-tree'] as const;
export const FRIENDS = ['rabbit', 'panda', 'monkey-face', 'penguin', 'frog', 'dog-face', 'owl'] as const;

export interface Place {
  x: number;
  y: number;
  size: number;
  kind: number;
  /** Seconds since the wind shook it. */
  rustleAgo: number;
}

export interface Friend {
  kind: number;
  /** The place it hides at. */
  place: number;
  /** Seconds since it last peeked out (it is seen while < PEEK_SECONDS), or a large number if not yet. */
  peekAgo: number;
  /** Seconds until it peeks next. */
  peekIn: number;
  /** Seconds since it was found (-1 while hiding). */
  foundAgo: number;
}

export interface HideAndSeekState {
  places: Place[];
  friends: Friend[];
  /** Seconds she must wait after tapping an empty place, and where that was. */
  looking: number;
  lookedAt: number;
  found: number[];
  score: number;
  time: number;
}

export const PEEK_SECONDS = 0.65;
/** A friend stays put this long after peeking, then sneaks off. */
export const STAY_SECONDS = 2.3;
const LOOK_SECONDS = 1.3;
const HIDING = 2;

export function createHideAndSeek({ arena, rng }: GameSetup): MinigameLogic<HideAndSeekState> {
  const events = eventQueue();
  const wide = arena.width >= arena.height;
  const cols = wide ? 4 : 3;
  const rows = wide ? 2 : Math.max(3, Math.min(4, Math.floor((arena.height - HUD_SAFE_TOP - 200) / 230)));
  const top = HUD_SAFE_TOP + 60;
  const cellW = (arena.width - 40) / cols;
  const cellH = (arena.height - top - 110) / rows;
  const size = Math.min(150, cellW * 0.8, cellH * 0.8);
  const places: Place[] = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      places.push({ x: 20 + cellW * (c + 0.5) + rng.range(-12, 12), y: top + cellH * (r + 0.6) + rng.range(-10, 10), size, kind: (r * cols + c) % PLACES.length, rustleAgo: 9 });
    }
  }
  const state: HideAndSeekState = { places, friends: [], looking: 0, lookedAt: -1, found: [], score: 0, time: 0 };
  let nextKind = rng.int(0, FRIENDS.length - 1);
  const freePlace = (except = -1): number => {
    const used = state.friends.filter((f) => f.foundAgo < 0).map((f) => f.place);
    const free = places.map((_, i) => i).filter((i) => i !== except && !used.includes(i));
    return free[rng.int(0, free.length - 1)] ?? 0;
  };
  const hide = (): Friend => {
    nextKind = (nextKind + 1) % FRIENDS.length;
    return { kind: nextKind, place: freePlace(), peekAgo: 99, peekIn: rng.range(1.0, 2.2), foundAgo: -1 };
  };
  for (let i = 0; i < HIDING; i += 1) state.friends.push(hide());

  const placeAt = (p: Point): number => {
    let best = -1;
    let bestD = Infinity;
    places.forEach((pl, i) => {
      const d = Math.hypot(pl.x - p.x, pl.y - p.y);
      if (d < pl.size * 0.75 && d < bestD) {
        best = i;
        bestD = d;
      }
    });
    return best;
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
      state.looking = Math.max(0, state.looking - dt);
      for (const pl of places) pl.rustleAgo += dt;
      if (rng.chance(dt * 1.1)) {
        const pl = places[rng.int(0, places.length - 1)];
        if (pl && !state.friends.some((f) => f.foundAgo < 0 && places[f.place] === pl)) pl.rustleAgo = 0;
      }

      for (const tap of input.taps) {
        if (state.looking > 0) break;
        const i = placeAt(tap);
        if (i < 0) continue;
        const friend = state.friends.find((f) => f.foundAgo < 0 && f.place === i && f.peekAgo < PEEK_SECONDS + STAY_SECONDS);
        const pl = places[i];
        if (friend && pl) {
          friend.foundAgo = 0;
          state.score += 1;
          state.found.push(friend.kind);
          events.push({ type: 'score', x: pl.x, y: pl.y - pl.size * 0.4 });
        } else if (pl) {
          state.looking = LOOK_SECONDS;
          state.lookedAt = i;
          events.push({ type: 'miss', x: pl.x, y: pl.y });
        }
      }

      for (const f of state.friends) {
        if (f.foundAgo >= 0) {
          f.foundAgo += dt;
          continue;
        }
        f.peekAgo += dt;
        f.peekIn -= dt;
        if (f.peekIn <= 0) {
          f.peekAgo = 0;
          f.peekIn = PEEK_SECONDS + STAY_SECONDS + rng.range(0.6, 1.8);
        }
        // Seen and not found in time: it sneaks off somewhere else.
        if (f.peekAgo >= PEEK_SECONDS + STAY_SECONDS && f.peekAgo < 50) {
          f.place = freePlace(f.place);
          f.peekAgo = 99;
          const pl = places[f.place];
          if (pl) pl.rustleAgo = 0.2;
        }
      }
      // Found friends run off; a new friend hides.
      const done = state.friends.filter((f) => f.foundAgo >= 1.2).length;
      state.friends = state.friends.filter((f) => f.foundAgo < 1.2);
      for (let i = 0; i < done; i += 1) state.friends.push(hide());
    },
  };
}

/** Good play: a moment after a friend peeks, tap where it was seen. */
export function hideAndSeekBot(state: HideAndSeekState, _context: BotContext): BotMove {
  const seen = state.friends.find((f) => f.foundAgo < 0 && f.peekAgo >= 0.3 && f.peekAgo < PEEK_SECONDS + STAY_SECONDS - 0.2);
  const pl = seen ? state.places[seen.place] : undefined;
  return pl && state.looking <= 0 ? { tap: { x: pl.x, y: pl.y } } : {};
}
