// Math race: four cars race along a track; the child's car is slower than the others on its own. A sign above
// shows a sum (grade 2: adding and taking away within 20, whole tens, a two-digit number and a one-digit one);
// three answers wait at the bottom. The right one gives her car a burst of speed (bursts add up, to a limit);
// a wrong one slows it for a second. Points by place at the finish: first 5, second 3, third 2, last 1; the
// goal of 3 is first or second. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

/** The race is this many units long. */
export const TRACK = 1000;
const BASE_SPEED = 18;
const BOOST_SPEED = 34;
/** Seconds of boost a right answer adds, and the most that can be stored. */
const BOOST_PER_ANSWER = 1.6;
const BOOST_MAX = 4;
const SLOW_SECONDS = 1;
const SLOW_SPEED = 6;
/** Rivals' speeds: they finish in about 32–38 seconds. */
const RIVAL_SPEEDS = [26, 28.5, 31] as const;
/** Seconds after the child's finish before the round ends (the flag waves). */
const FINISH_HOLD = 1.2;
const PLACE_POINTS = [5, 3, 2, 1] as const;

export interface Sum {
  text: string;
  answer: number;
  options: number[];
}

export interface Car {
  /** 0 = the child's car. */
  id: number;
  at: number;
  speed: number;
  /** Race time it crossed the line, or -1. */
  finishedAt: number;
}

export interface MathRaceState {
  cars: Car[];
  sum: Sum;
  /** Answer bubbles' centres (same order as `sum.options`) and radius. */
  buttons: Point[];
  buttonRadius: number;
  boost: number;
  slow: number;
  /** Seconds since the last answer, and whether it was right (the sign flashes). */
  answeredAgo: number;
  lastRight: boolean;
  /** Bubble tapped last (it squashes). */
  lastButton: number;
  place: number;
  finishedFor: number;
  answered: number;
  score: number;
  time: number;
}

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

/** A grade 2 sum and three answers to choose from (the right one and two near misses). */
export function makeSum(rng: Rng, level: number): Sum {
  const kind = rng.int(0, level >= 2 ? 4 : 3);
  let a: number;
  let b: number;
  let plus: boolean;
  switch (kind) {
    case 0: // adding within 20, often over ten
      a = rng.int(3, 9);
      b = rng.int(2, 9);
      plus = true;
      break;
    case 1: // taking away within 20, often across ten
      a = rng.int(11, 18);
      b = rng.int(2, 9);
      if (a - b < 2) b = a - 2;
      plus = false;
      break;
    case 2: // whole tens
      a = rng.int(1, 8) * 10;
      b = rng.int(1, 9) * 10;
      plus = rng.chance(0.5);
      if (plus && a + b > 100) b = 100 - a;
      if (!plus && b > a) [a, b] = [b, a];
      if (!plus && a === b) a += 10;
      break;
    case 3: // a two-digit number and a one-digit one, no carrying
      a = rng.int(2, 9) * 10 + rng.int(1, 5);
      b = rng.int(1, 4);
      plus = rng.chance(0.5);
      break;
    default: // two-digit and one-digit with carrying (level 2)
      a = rng.int(2, 8) * 10 + rng.int(5, 9);
      b = rng.int(3, 9);
      plus = true;
  }
  const answer = plus ? a + b : a - b;
  const near = shuffle([answer + 1, answer - 1, answer + 2, answer - 2, answer + 10, answer - 10].filter((n) => n >= 0 && n !== answer), rng);
  const options = shuffle([answer, ...near.slice(0, 2)], rng);
  return { text: `${a} ${plus ? '+' : '−'} ${b} = ?`, answer, options };
}

export function createMathRace({ arena, params, rng }: GameSetup): MinigameLogic<MathRaceState> {
  const level = typeof params.level === 'number' ? Math.round(Math.min(2, Math.max(1, params.level))) : 1;
  const events = eventQueue();
  const landscape = arena.width > arena.height;
  const buttonRadius = landscape ? TOUCH_RADIUS + 16 : Math.max(TOUCH_RADIUS + 14, Math.min(72, arena.width / 8));
  const buttonY = arena.height - buttonRadius - (landscape ? 14 : 30);
  const spread = Math.min(arena.width / 3, 220);
  const buttons = [-1, 0, 1].map((i) => ({ x: arena.width / 2 + i * spread, y: buttonY }));
  const cars: Car[] = [{ id: 0, at: 0, speed: BASE_SPEED, finishedAt: -1 }, ...shuffle([...RIVAL_SPEEDS], rng).map((v, i) => ({ id: i + 1, at: 0, speed: v * rng.range(0.96, 1.04), finishedAt: -1 }))];
  const state: MathRaceState = { cars, sum: makeSum(rng, level), buttons, buttonRadius, boost: 0, slow: 0, answeredAgo: 9, lastRight: true, lastButton: -1, place: 0, finishedFor: 0, answered: 0, score: 0, time: 0 };
  const child = (): Car => state.cars[0] ?? { id: 0, at: 0, speed: 0, finishedAt: -1 };

  function answer(index: number): void {
    const value = state.sum.options[index];
    const b = buttons[index];
    if (value === undefined || !b) return;
    state.answeredAgo = 0;
    state.lastButton = index;
    state.answered += 1;
    if (value === state.sum.answer) {
      state.lastRight = true;
      state.boost = Math.min(BOOST_MAX, state.boost + BOOST_PER_ANSWER);
      events.push({ type: 'action', x: b.x, y: b.y - buttonRadius });
    } else {
      state.lastRight = false;
      state.slow = SLOW_SECONDS;
      state.boost = 0;
      events.push({ type: 'miss', x: b.x, y: b.y });
    }
    state.sum = makeSum(rng, level);
  }

  return {
    state,
    get score() {
      return state.place > 0 ? (PLACE_POINTS[state.place - 1] ?? 1) : 0;
    },
    get done() {
      return state.place > 0 && state.finishedFor >= FINISH_HOLD;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.answeredAgo += dt;
      const me = child();
      if (state.place > 0) state.finishedFor += dt;
      if (me.finishedAt < 0) {
        for (const tap of input.taps) {
          const index = buttons.findIndex((b) => Math.hypot(b.x - tap.x, b.y - tap.y) <= buttonRadius * 1.25);
          if (index >= 0) answer(index);
        }
      }
      state.slow = Math.max(0, state.slow - dt);
      state.boost = Math.max(0, state.boost - dt);
      me.speed = state.slow > 0 ? SLOW_SPEED : state.boost > 0 ? BASE_SPEED + BOOST_SPEED : BASE_SPEED;
      for (const car of state.cars) {
        if (car.finishedAt >= 0) {
          car.at += car.speed * dt * 0.5;
          continue;
        }
        car.at += car.speed * dt;
        if (car.at >= TRACK) {
          car.finishedAt = state.time;
          if (car.id === 0) {
            state.place = state.cars.filter((c) => c.finishedAt >= 0).length;
            events.push({ type: 'score', x: arena.width - 90, y: HUD_SAFE_TOP + 120, points: PLACE_POINTS[state.place - 1] ?? 1 });
          }
        }
      }
    },
  };
}

/** Good play: works out the sum and taps the right answer, a little after it appears. */
export function mathRaceBot(state: MathRaceState, _context: BotContext): BotMove {
  if (state.answeredAgo < 0.5 || state.boost > 2.5) return {};
  const index = state.sum.options.indexOf(state.sum.answer);
  const b = state.buttons[index];
  return b ? { tap: b } : {};
}
