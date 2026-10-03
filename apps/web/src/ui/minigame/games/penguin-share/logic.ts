// Penguin share: a bucket of fish and two to four penguin friends on the ice. The child taps a penguin to give
// it one fish from the bucket. Once the bucket is empty, everyone having the same is a point (the penguins
// cheer) and a new round comes; if not, whoever got the most hands one fish back to the bucket to share again.
// Fish always divide evenly (an easy sharing of up to 12, the grade 2 "chia đều"). Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface Penguin {
  x: number;
  y: number;
  fish: number;
  /** When it last got or gave back a fish (a hop). */
  changedAt: number;
}

export type SharePhase = 'play' | 'giveBack' | 'cheer';

export interface PenguinShareState {
  penguins: Penguin[];
  bucket: Point;
  pile: number;
  /** Fish each penguin gets when shared fairly (for the bot and the tests). */
  each: number;
  size: number;
  phase: SharePhase;
  phaseAgo: number;
  /** Penguins (indexes) handing a fish back right now. */
  givingBack: number[];
  rounds: number;
  score: number;
  time: number;
}

/** Ways to share up to 12 fish fairly: [friends, fish each]. */
export const SHARES: readonly (readonly [number, number])[] = [
  [2, 2],
  [2, 3],
  [3, 2],
  [2, 4],
  [4, 2],
  [3, 3],
  [2, 5],
  [3, 4],
  [4, 3],
  [2, 6],
];
const GIVE_BACK_SECONDS = 0.8;
const CHEER_SECONDS = 1.2;
const NOTES = [67, 69, 72, 74, 76, 79, 81, 84, 86, 88, 91, 93];

export function createPenguinShare({ arena, rng }: GameSetup): MinigameLogic<PenguinShareState> {
  const events = eventQueue();
  const state: PenguinShareState = {
    penguins: [],
    bucket: { x: arena.width / 2, y: HUD_SAFE_TOP + 90 },
    pile: 0,
    each: 0,
    size: 0,
    phase: 'play',
    phaseAgo: 0,
    givingBack: [],
    rounds: 0,
    score: 0,
    time: 0,
  };

  const deal = (r: Rng): void => {
    // Easy shares first; bigger ones later.
    const pool = SHARES.slice(0, Math.min(SHARES.length, 4 + state.rounds * 2));
    const [friends, each] = pool[r.int(0, pool.length - 1)] ?? [2, 2];
    const size = Math.min(170, (arena.width - 40) / (friends + 0.4), (arena.height - HUD_SAFE_TOP) * 0.24);
    const y = HUD_SAFE_TOP + (arena.height - HUD_SAFE_TOP) * 0.62;
    state.penguins = Array.from({ length: friends }, (_, i) => ({ x: arena.width / 2 + (i - (friends - 1) / 2) * (arena.width - 40) / friends, y, fish: 0, changedAt: -9 }));
    state.size = size;
    state.each = each;
    state.pile = friends * each;
    state.phase = 'play';
    state.phaseAgo = 0;
  };

  /** The penguin under a tap: its body and the tray of fish in front of it, wider than the picture. */
  const penguinAt = (p: Point): Penguin | undefined => {
    const half = Math.max(TOUCH_RADIUS * 1.5, state.size * 0.6);
    return state.penguins.find((g) => Math.abs(p.x - g.x) <= half && p.y >= g.y - state.size * 0.8 && p.y <= g.y + state.size * 1.4);
  };

  deal(rng);

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
      if (state.phase === 'cheer') {
        if (state.phaseAgo >= CHEER_SECONDS) {
          state.rounds += 1;
          deal(rng);
        }
        return;
      }
      if (state.phase === 'giveBack') {
        if (state.phaseAgo >= GIVE_BACK_SECONDS) {
          state.phase = 'play';
          state.phaseAgo = 0;
        }
        return;
      }
      for (const tap of input.taps) {
        const penguin = penguinAt(tap);
        if (!penguin || state.pile <= 0) continue;
        penguin.fish += 1;
        penguin.changedAt = state.time;
        state.pile -= 1;
        const given = state.penguins.reduce((n, g) => n + g.fish, 0);
        events.push({ type: 'action', x: penguin.x, y: penguin.y - state.size * 0.3, note: NOTES[Math.min(NOTES.length - 1, given - 1)] ?? 72, voice: 'bell' });
        if (state.pile > 0) continue;
        const most = Math.max(...state.penguins.map((g) => g.fish));
        if (state.penguins.every((g) => g.fish === most)) {
          state.score += 1;
          state.phase = 'cheer';
          state.phaseAgo = 0;
          events.push({ type: 'score', x: arena.width / 2, y: penguin.y - state.size });
        } else {
          state.givingBack = [];
          for (const [index, g] of state.penguins.entries()) {
            if (g.fish !== most) continue;
            state.givingBack.push(index);
            g.fish -= 1;
            g.changedAt = state.time;
            state.pile += 1;
            events.push({ type: 'miss', x: g.x, y: g.y });
          }
          state.phase = 'giveBack';
          state.phaseAgo = 0;
        }
        break;
      }
    },
  };
}

/** Good play: a fish to whoever has fewest, one tap a decision. */
export function penguinShareBot(state: PenguinShareState, _context: BotContext): BotMove {
  if (state.phase !== 'play' || state.pile <= 0) return {};
  let target = state.penguins[0];
  for (const g of state.penguins) if (target && g.fish < target.fish) target = g;
  return target ? { tap: { x: target.x, y: target.y } } : {};
}
