// Seesaw logic ("Ai nặng nhất?"): three or four animal friends of about the same size, and seesaws that each
// show one pair: the heavier friend's end sits down. The child works out who is heaviest (or, every other
// round, lightest) from the seesaws alone and taps that friend in the line below. Right on the first try: a
// point and a new round. Wrong: the friend shrugs and a new seesaw appears comparing that friend with the
// answer; finding the answer after that ends the round without a point, so guessing does not pay.
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

/** Friends who look about the same size, so only the seesaws tell (draw.ts maps them to pictures). */
export const FRIENDS = ['cat', 'rabbit', 'fox', 'dog', 'panda', 'penguin', 'frog', 'duck'] as const;
export type Friend = (typeof FRIENDS)[number];

export interface Seesaw {
  /** Indexes into `friends`: who sits on the left and on the right end. */
  left: number;
  right: number;
  /** When it appeared (a hint drops in). */
  shownAt: number;
}

export type Question = 'heaviest' | 'lightest';

export interface SeesawLogicState {
  friends: Friend[];
  /** Weight rank of each friend: 0 = lightest. */
  rank: number[];
  seesaws: Seesaw[];
  question: Question;
  /** Where each friend stands in the line (tap targets). */
  spots: Point[];
  spotRadius: number;
  /** Who was tapped last, whether right, and when. */
  picked: number;
  pickedRight: boolean;
  pickedAt: number;
  /** Seconds until the next round (0 while one is played). */
  nextIn: number;
  /** Wrong picks this round. */
  wrong: number;
  rounds: number;
  score: number;
  time: number;
}

const NEXT_SECONDS = 1.1;
/** Seconds after a wrong pick before the next one counts (the friend shrugs, the hint drops in). */
const WRONG_PAUSE = 1.6;

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

/** The friend the question asks for. */
export const answerOf = (state: SeesawLogicState): number => {
  const want = state.question === 'heaviest' ? state.friends.length - 1 : 0;
  return state.rank.indexOf(want);
};

export function createSeesawLogic({ arena, rng }: GameSetup): MinigameLogic<SeesawLogicState> {
  const events = eventQueue();
  const state: SeesawLogicState = {
    friends: [],
    rank: [],
    seesaws: [],
    question: 'heaviest',
    spots: [],
    spotRadius: 0,
    picked: -1,
    pickedRight: false,
    pickedAt: -9,
    nextIn: 0,
    wrong: 0,
    rounds: 0,
    score: 0,
    time: 0,
  };

  const deal = (): void => {
    const count = state.rounds < 3 ? 3 : 4;
    state.friends = shuffle([...FRIENDS], rng).slice(0, count);
    state.rank = shuffle(
      state.friends.map((_, i) => i),
      rng,
    );
    // One seesaw for each pair next to each other by weight: enough to find the answer, in a shuffled order.
    const byRank = state.friends.map((_, i) => state.rank.indexOf(i));
    const pairs: Seesaw[] = [];
    for (let r = 0; r + 1 < count; r += 1) {
      const a = byRank[r] ?? 0;
      const b = byRank[r + 1] ?? 0;
      pairs.push(rng.chance(0.5) ? { left: a, right: b, shownAt: state.time } : { left: b, right: a, shownAt: state.time });
    }
    state.seesaws = shuffle(pairs, rng);
    state.question = state.rounds % 2 === 0 ? 'heaviest' : 'lightest';
    const lineY = arena.height - Math.max(90, arena.height * 0.12);
    const gap = Math.min(170, (arena.width - 40) / count);
    state.spotRadius = Math.max(TOUCH_RADIUS + 10, Math.min(70, gap * 0.42));
    state.spots = state.friends.map((_, i) => ({ x: arena.width / 2 + (i - (count - 1) / 2) * gap, y: lineY }));
    state.picked = -1;
    state.nextIn = 0;
    state.wrong = 0;
  };

  deal();

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
      if (state.nextIn > 0) {
        state.nextIn -= dt;
        if (state.nextIn <= 0) {
          state.rounds += 1;
          deal();
        }
        return;
      }
      for (const tap of input.taps) {
        if (tap.y < HUD_SAFE_TOP) continue;
        const reach = state.spotRadius * 1.3;
        const index = state.spots.findIndex((s) => Math.abs(tap.x - s.x) <= reach && Math.abs(tap.y - s.y) <= reach * 1.2);
        if (index < 0) continue;
        const answer = answerOf(state);
        if (state.wrong > 0 && state.time - state.pickedAt < WRONG_PAUSE) continue;
        state.picked = index;
        state.pickedAt = state.time;
        state.pickedRight = index === answer;
        const spot = state.spots[index] ?? { x: 0, y: 0 };
        if (index === answer) {
          state.nextIn = NEXT_SECONDS;
          if (state.wrong === 0) {
            state.score += 1;
            events.push({ type: 'score', x: spot.x, y: spot.y - state.spotRadius });
          } else events.push({ type: 'action', x: spot.x, y: spot.y - state.spotRadius });
          break;
        }
        state.wrong += 1;
        events.push({ type: 'miss', x: spot.x, y: spot.y, note: 86, voice: 'whistle' });
        // A hint: this friend against the answer, unless that seesaw is already there.
        const shown = state.seesaws.some((s) => (s.left === index && s.right === answer) || (s.left === answer && s.right === index));
        if (!shown) state.seesaws.push({ left: index, right: answer, shownAt: state.time });
        break;
      }
    },
  };
}

/** Seconds the bot studies the seesaws before answering, like a child thinking. */
const BOT_THINK = 1.8;

/** Good play: after a look at the seesaws, the right friend. */
export function seesawLogicBot(state: SeesawLogicState, _context: BotContext): BotMove {
  if (state.nextIn > 0) return {};
  const shownFor = state.time - Math.max(...state.seesaws.map((s) => s.shownAt), state.pickedAt);
  if (shownFor < BOT_THINK) return {};
  const spot = state.spots[answerOf(state)];
  return spot ? { tap: spot } : {};
}
