// Fair share: a long cake (or a slab of watermelon) lies on the table and two, three or four friends wait with
// their plates. The child swipes down across it to cut, one stroke a cut, until there is a piece for each
// friend. Equal pieces (within a small margin) are a point and slide onto the plates; when one piece is too
// big it glows, the right cut lines show dashed for a moment and she cuts the same cake again.
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Swipe } from '../../types';

export type ShareFriend = 'cat' | 'rabbit' | 'fox' | 'bear' | 'panda' | 'penguin';
export const SHARE_FRIENDS: readonly ShareFriend[] = ['cat', 'rabbit', 'fox', 'bear', 'panda', 'penguin'];

export type SharePhase = 'cut' | 'shared' | 'uneven';

export interface ShareState {
  cake: { x0: number; x1: number; y: number; h: number; kind: 'cake' | 'melon' };
  friends: ShareFriend[];
  /** Cut positions (x), in the order made. */
  cuts: number[];
  /** Seconds since each cut (the knife flash). */
  cutAgo: number[];
  phase: SharePhase;
  phaseTime: number;
  /** Index (left to right) of the pieces that came out too big, after an uneven cut. */
  tooBig: number[];
  cakes: number;
  score: number;
  time: number;
}

const SHARED_SECONDS = 1.3;
const UNEVEN_SECONDS = 1.6;

/** Piece lengths left to right for these cuts. */
export function pieces(x0: number, x1: number, cuts: readonly number[]): number[] {
  const edges = [x0, ...[...cuts].sort((a, b) => a - b), x1];
  return edges.slice(1).map((x, i) => x - (edges[i] ?? x0));
}

/** Every piece is within 12% (at least 16 units) of a fair share. */
export function isFair(lengths: readonly number[]): boolean {
  const total = lengths.reduce((a, b) => a + b, 0);
  const fair = total / lengths.length;
  const margin = Math.max(16, fair * 0.12);
  return lengths.every((l) => Math.abs(l - fair) <= margin);
}

export function createFairShare({ arena, rng }: GameSetup): MinigameLogic<ShareState> {
  const events = eventQueue();
  const length = Math.min(arena.width - 110, 720);
  const tall = arena.height > arena.width * 1.3;
  const cakeY = tall ? arena.height * 0.56 : Math.max(HUD_SAFE_TOP + 230, arena.height * 0.55);
  const state: ShareState = {
    cake: { x0: (arena.width - length) / 2, x1: (arena.width + length) / 2, y: cakeY, h: tall ? 160 : 120, kind: 'cake' },
    friends: [],
    cuts: [],
    cutAgo: [],
    phase: 'cut',
    phaseTime: 0,
    tooBig: [],
    cakes: 0,
    score: 0,
    time: 0,
  };

  function newCake(): void {
    const n = state.cakes < 2 ? 2 : rng.int(2, 4);
    const pool = [...SHARE_FRIENDS];
    state.friends = Array.from({ length: n }, () => pool.splice(rng.int(0, pool.length - 1), 1)[0] ?? 'cat');
    state.cake.kind = rng.chance(0.5) ? 'cake' : 'melon';
    state.cuts = [];
    state.cutAgo = [];
    state.tooBig = [];
    state.phase = 'cut';
    state.phaseTime = 0;
  }

  /** Where a downward stroke crosses the middle of the cake, or null when it does not cut it. */
  function cutAt(s: Swipe): number | null {
    if (Math.abs(s.dy) < Math.abs(s.dx) * 1.2) return null;
    const { y, h, x0, x1 } = state.cake;
    const top = Math.min(s.from.y, s.from.y + s.dy);
    const bottom = Math.max(s.from.y, s.from.y + s.dy);
    // A stroke that stops short still counts if it reaches the cake.
    if (bottom < y - h / 2 - 40 || top > y + h / 2 + 40) return null;
    const t = s.dy === 0 ? 0 : Math.min(1, Math.max(0, (y - s.from.y) / s.dy));
    const x = s.from.x + s.dx * t;
    return x > x0 + 8 && x < x1 - 8 ? x : null;
  }

  function cut(x: number): void {
    state.cuts.push(x);
    state.cutAgo.push(0);
    events.push({ type: 'action', x, y: state.cake.y });
    if (state.cuts.length < state.friends.length - 1) return;
    const lengths = pieces(state.cake.x0, state.cake.x1, state.cuts);
    state.phaseTime = 0;
    if (isFair(lengths)) {
      state.phase = 'shared';
      state.score += 1;
      events.push({ type: 'score', x: (state.cake.x0 + state.cake.x1) / 2, y: state.cake.y - 80 });
    } else {
      const fair = (state.cake.x1 - state.cake.x0) / lengths.length;
      state.tooBig = lengths.map((l, i) => (l > fair ? i : -1)).filter((i) => i >= 0);
      state.phase = 'uneven';
      events.push({ type: 'miss', x: (state.cake.x0 + state.cake.x1) / 2, y: state.cake.y });
    }
  }

  newCake();

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
      state.cutAgo = state.cutAgo.map((a) => a + dt);
      if (state.phase === 'cut') {
        for (const s of input.swipes) {
          const x = cutAt(s);
          if (x !== null && state.phase === 'cut') cut(x);
        }
      } else if (state.phase === 'shared' && state.phaseTime > SHARED_SECONDS) {
        state.cakes += 1;
        newCake();
      } else if (state.phase === 'uneven' && state.phaseTime > UNEVEN_SECONDS) {
        state.cuts = [];
        state.cutAgo = [];
        state.tooBig = [];
        state.phase = 'cut';
        state.phaseTime = 0;
      }
    },
  };
}

/** Good play: cuts at the fair places (a little off, like a steady hand), one stroke every 0.4 s. */
export function fairShareBot(state: ShareState, _context: BotContext): BotMove {
  if (state.phase !== 'cut' || (state.cutAgo.at(-1) ?? 9) < 0.4 || state.phaseTime < 0.3) return {};
  const { x0, x1, y, h } = state.cake;
  const k = state.cuts.length + 1;
  const n = state.friends.length;
  const x = x0 + ((x1 - x0) * k) / n + (k % 2 === 0 ? 4 : -4);
  return { swipe: { from: { x, y: y - h / 2 - 50 }, dx: 0, dy: h + 100 } };
}
