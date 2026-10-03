// Three-span bag ("Túi ba gang", from the tale of the star fruit tree): the magic bird lands on the island with
// a cloth bag that holds exactly the number sewn on it. Numbered gems lie on the sand; the child taps gems to
// put them in the bag (tapping a gem in the bag takes it out again). Exactly the bag's number: the bird flies
// off with it (a point) and brings a new bag. Too much: the bag bursts open and the gems roll back to the sand
// to choose again. Every bag has a way of two or three gems; the others are decoys. Numbers stay within
// grade 2 adding (bags up to 20, gems 1–9). Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface Gem {
  value: number;
  /** Its place on the sand. */
  home: Point;
  inBag: boolean;
  /** When it last moved (into the bag or back), for the flight. */
  movedAt: number;
}

export type BagPhase = 'choose' | 'burst' | 'fly';

export interface ThreeSpanState {
  capacity: number;
  gems: Gem[];
  /** Indexes of one exact answer (for the bot and the tests). */
  answer: number[];
  bag: Point;
  gemRadius: number;
  phase: BagPhase;
  phaseAgo: number;
  bags: number;
  score: number;
  time: number;
}

const BURST_SECONDS = 0.9;
const FLY_SECONDS = 1.4;
const NOTES = [72, 74, 76, 77, 79, 81, 83, 84];

export const bagSum = (state: ThreeSpanState): number => state.gems.reduce((sum, g) => sum + (g.inBag ? g.value : 0), 0);

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

/** A bag and its gems: an exact way of two (early) or three gems, and decoys that do not make another pair. */
export function makeBag(rng: Rng, round: number): { capacity: number; values: number[]; answer: number[] } {
  const three = round >= 2 && rng.chance(0.5);
  const parts = three ? [rng.int(2, 7), rng.int(2, 7), rng.int(1, 6)] : [rng.int(2, 9), rng.int(2, 9)];
  const capacity = parts.reduce((a, b) => a + b, 0);
  const count = Math.min(8, 5 + Math.min(3, round));
  const values = [...parts];
  while (values.length < count) {
    const v = rng.int(1, 9);
    // A decoy may not finish the bag with one of the answer's gems (keeps one clear way for the early bags).
    if (round < 2 && parts.some((p) => p + v === capacity)) continue;
    values.push(v);
  }
  const order = shuffle(
    values.map((_, i) => i),
    rng,
  );
  const shuffled = order.map((i) => values[i] ?? 1);
  const answer = parts.map((_, k) => order.indexOf(k));
  return { capacity, values: shuffled, answer };
}

export function createThreeSpanBag({ arena, rng }: GameSetup): MinigameLogic<ThreeSpanState> {
  const events = eventQueue();
  const top = HUD_SAFE_TOP;
  const bag = { x: arena.width / 2, y: top + Math.min(150, (arena.height - top) * 0.2) };
  const state: ThreeSpanState = { capacity: 0, gems: [], answer: [], bag, gemRadius: 0, phase: 'choose', phaseAgo: 0, bags: 0, score: 0, time: 0 };

  const deal = (): void => {
    const { capacity, values, answer } = makeBag(rng, state.bags);
    // The sand below the bag: rows of up to four (three on a narrow screen).
    const perRow = arena.width >= 800 ? 4 : 3;
    const rows = Math.ceil(values.length / perRow);
    const areaTop = bag.y + 150;
    const areaH = arena.height - areaTop - 40;
    const cellW = (arena.width - 40) / perRow;
    const cellH = areaH / rows;
    const radius = Math.max(TOUCH_RADIUS + 6, Math.min(62, cellW * 0.36, cellH * 0.38));
    state.gems = values.map((value, i) => {
      const row = Math.floor(i / perRow);
      const inRow = Math.min(perRow, values.length - row * perRow);
      const col = i % perRow;
      const x = arena.width / 2 + (col - (inRow - 1) / 2) * cellW + rng.range(-10, 10);
      const y = areaTop + (row + 0.5) * cellH + rng.range(-8, 8);
      return { value, home: { x, y }, inBag: false, movedAt: -9 };
    });
    state.capacity = capacity;
    state.answer = answer;
    state.gemRadius = radius;
    state.phase = 'choose';
    state.phaseAgo = 0;
  };

  const gemAt = (p: Point): Gem | undefined => {
    // A gem in the bag is taken out by tapping the bag.
    const inBag = state.gems.filter((g) => g.inBag);
    if (Math.abs(p.x - bag.x) <= 110 && Math.abs(p.y - bag.y) <= 100 && inBag.length > 0) {
      return inBag.reduce((latest, g) => (g.movedAt > latest.movedAt ? g : latest));
    }
    const reach = state.gemRadius * 1.3;
    let best: Gem | undefined;
    let bestD = reach;
    for (const g of state.gems) {
      if (g.inBag) continue;
      const d = Math.hypot(p.x - g.home.x, p.y - g.home.y);
      if (d <= bestD) {
        best = g;
        bestD = d;
      }
    }
    return best;
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
      state.phaseAgo += dt;
      if (state.phase === 'burst') {
        if (state.phaseAgo >= BURST_SECONDS) {
          state.phase = 'choose';
          state.phaseAgo = 0;
        }
        return;
      }
      if (state.phase === 'fly') {
        if (state.phaseAgo >= FLY_SECONDS) {
          state.bags += 1;
          deal();
        }
        return;
      }
      for (const tap of input.taps) {
        const gem = gemAt(tap);
        if (!gem) continue;
        gem.inBag = !gem.inBag;
        gem.movedAt = state.time;
        const sum = bagSum(state);
        const count = state.gems.filter((g) => g.inBag).length;
        events.push({ type: 'action', x: gem.home.x, y: gem.home.y, note: NOTES[Math.min(NOTES.length - 1, count)] ?? 72, voice: 'bell' });
        if (sum === state.capacity) {
          state.score += 1;
          state.phase = 'fly';
          state.phaseAgo = 0;
          events.push({ type: 'score', x: bag.x, y: bag.y });
          break;
        }
        if (sum > state.capacity) {
          for (const g of state.gems) {
            if (!g.inBag) continue;
            g.inBag = false;
            g.movedAt = state.time;
          }
          state.phase = 'burst';
          state.phaseAgo = 0;
          events.push({ type: 'hit', x: bag.x, y: bag.y });
          break;
        }
      }
    },
  };
}

/** Seconds the bot looks before each gem, like a child adding up. */
const BOT_THINK = 0.9;

/** Good play: the gems of the exact answer, one at a time; anything else in the bag comes out first. */
export function threeSpanBot(state: ThreeSpanState, _context: BotContext): BotMove {
  if (state.phase !== 'choose') return {};
  const last = Math.max(state.phaseAgo > 0 ? state.time - state.phaseAgo : 0, ...state.gems.map((g) => g.movedAt));
  if (state.time - last < BOT_THINK) return {};
  const wrong = state.gems.findIndex((g, i) => g.inBag && !state.answer.includes(i));
  if (wrong >= 0) return { tap: { x: state.bag.x, y: state.bag.y } };
  const next = state.answer.map((i) => state.gems[i]).find((g) => g && !g.inBag);
  return next ? { tap: next.home } : {};
}
