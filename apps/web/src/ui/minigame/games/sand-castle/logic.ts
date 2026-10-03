// Sand castle: the child holds a finger down to scoop sand into the bucket; the sand rises while she holds.
// The bucket has a green band: let go with the sand inside it, then tap an empty spot on the castle to turn the
// bucket over into a tower (a point). Too little sand and the tower crumbles; too much and it slumps (no point,
// try again). The band sits at a new height for every tower. Four towers make a castle, and a new one starts.
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const TOWERS = 4;
/** Bucket fills per second of holding; it never holds more than OVERFLOW. */
export const FILL_RATE = 0.55;
const OVERFLOW = 1.2;
const NEXT_CASTLE = 1.2;

export interface Spot {
  at: Point;
  built: boolean;
  /** Seconds since a tower failed here ('crumble' or 'slump'), large = long ago. */
  failedAgo: number;
  failed: 'crumble' | 'slump' | null;
  /** Seconds since built (it rises). */
  builtAgo: number;
}

export interface SandState {
  fill: number;
  band: { lo: number; hi: number };
  filling: boolean;
  spots: Spot[];
  spotRadius: number;
  bucket: Point;
  /** Seconds since the castle was finished, -1 while building. */
  finished: number;
  castles: number;
  score: number;
  time: number;
}

export function createSandCastle({ arena, params, rng }: GameSetup): MinigameLogic<SandState> {
  const width = typeof params.band === 'number' ? Math.min(0.3, Math.max(0.1, params.band)) : 0.18;
  const events = eventQueue();
  const spotRadius = Math.max(TOUCH_RADIUS + 12, Math.min(70, (arena.width - 60) / (TOWERS * 2.4)));
  const castleY = HUD_SAFE_TOP + Math.min(220, (arena.height - HUD_SAFE_TOP) * 0.4);
  const gap = Math.min((arena.width - 40) / TOWERS, spotRadius * 2.6);
  const newBand = (): { lo: number; hi: number } => {
    const mid = rng.range(0.45 + width / 2, 1 - width / 2);
    return { lo: mid - width / 2, hi: mid + width / 2 };
  };
  const state: SandState = {
    fill: 0,
    band: newBand(),
    filling: false,
    spots: [],
    spotRadius,
    bucket: { x: arena.width / 2, y: arena.height - 120 },
    finished: -1,
    castles: 0,
    score: 0,
    time: 0,
  };

  function newCastle(): void {
    state.spots = Array.from({ length: TOWERS }, (_, i) => ({ at: { x: arena.width / 2 + (i - (TOWERS - 1) / 2) * gap, y: castleY }, built: false, failedAgo: 99, failed: null, builtAgo: 99 }));
    state.finished = -1;
    state.castles += 1;
  }

  const spotAt = (p: Point): Spot | undefined => state.spots.find((s) => !s.built && Math.hypot(s.at.x - p.x, s.at.y - p.y) <= spotRadius * 1.3);

  function place(spot: Spot): void {
    if (state.fill <= 0.02) return;
    const { lo, hi } = state.band;
    if (state.fill >= lo && state.fill <= hi) {
      spot.built = true;
      spot.builtAgo = 0;
      state.score += 1;
      events.push({ type: 'score', x: spot.at.x, y: spot.at.y - spotRadius });
      if (state.spots.every((s) => s.built)) state.finished = 0;
    } else {
      spot.failed = state.fill < lo ? 'crumble' : 'slump';
      spot.failedAgo = 0;
      events.push({ type: 'miss', x: spot.at.x, y: spot.at.y });
    }
    state.fill = 0;
    state.band = newBand();
  }

  newCastle();

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
      for (const s of state.spots) {
        s.failedAgo += dt;
        s.builtAgo += dt;
      }
      if (state.finished >= 0) {
        state.finished += dt;
        if (state.finished >= NEXT_CASTLE) newCastle();
        state.filling = false;
        return;
      }
      for (const tap of input.taps) {
        const spot = spotAt(tap);
        if (spot) place(spot);
      }
      // Holding anywhere but on the castle scoops sand.
      const p = input.pointer;
      state.filling = p !== null && input.holdTime > 0.12 && !spotAt(p);
      if (state.filling) state.fill = Math.min(OVERFLOW, state.fill + FILL_RATE * dt);
    },
  };
}

/** Good play: holds until the sand is in the middle of the band, lets go, then taps an empty spot. */
export function sandCastleBot(state: SandState, _context: BotContext): BotMove {
  if (state.finished >= 0) return {};
  const target = (state.band.lo + state.band.hi) / 2;
  if (state.fill < target - 0.03) return { touch: state.bucket };
  const spot = state.spots.find((s) => !s.built);
  return spot ? { tap: spot.at } : {};
}
