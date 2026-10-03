// Magic letters ("Nét chữ phép màu"): balloons drift down, each carrying a big letter and a picture of a word
// that starts with it (o – ong, c – cá, l – lá…). The child writes a letter with one stroke of her finger,
// anywhere on the screen; if it reads as the letter of a balloon in the sky, the lowest such balloon pops (a
// point). A balloon that reaches the ground costs a heart (four hearts). Balloons come a little quicker as the
// round goes on. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';
import { LETTERS, MATCH, MODELS, recognise, type Letter } from './recognize';

export interface Balloon {
  letter: Letter;
  x: number;
  y: number;
  /** Seconds since it popped (−1 while flying). */
  popped: number;
}

export interface MagicLettersState {
  balloons: Balloon[];
  /** The stroke being written, and the last one's reading (shown for a moment). */
  stroke: Point[];
  lastRead: Letter | null;
  lastReadAt: number;
  lastHit: boolean;
  fallSpeed: number;
  groundY: number;
  lives: number;
  score: number;
  time: number;
}

export const LIVES = 4;
const NOTES: Readonly<Record<Letter, number>> = { o: 72, c: 74, l: 76, n: 77, m: 79, v: 81, s: 83, b: 84 };

export function createMagicLetters({ arena, duration, rng }: GameSetup): MinigameLogic<MagicLettersState> {
  const events = eventQueue();
  const groundY = arena.height - 40;
  const state: MagicLettersState = { balloons: [], stroke: [], lastRead: null, lastReadAt: -9, lastHit: false, fallSpeed: 0, groundY, lives: LIVES, score: 0, time: 0 };
  let nextBalloon = 0.5;
  let last: Letter | null = null;

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.lives <= 0;
    },
    get lives() {
      return state.lives;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      const progress = Math.min(1, state.time / duration);
      // Seconds from the top to the ground: 10 at first, 7 at the end.
      state.fallSpeed = (groundY - HUD_SAFE_TOP) / (10 - 3 * progress);
      nextBalloon -= dt;
      if (nextBalloon <= 0 && state.balloons.filter((b) => b.popped < 0).length < 3) {
        let letter = LETTERS[rng.int(0, LETTERS.length - 1)] ?? 'o';
        if (letter === last) letter = LETTERS[(LETTERS.indexOf(letter) + 1) % LETTERS.length] ?? 'o';
        last = letter;
        state.balloons.push({ letter, x: rng.range(80, arena.width - 80), y: HUD_SAFE_TOP + 20, popped: -1 });
        nextBalloon = 3.2 - 1.0 * progress;
      }
      for (const b of state.balloons) {
        if (b.popped >= 0) {
          b.popped += dt;
          continue;
        }
        b.y += state.fallSpeed * dt;
        if (b.y >= groundY - 50) {
          b.popped = 0;
          state.lives -= 1;
          events.push({ type: 'hit', x: b.x, y: groundY - 50 });
        }
      }
      state.balloons = state.balloons.filter((b) => b.popped < 0.6);

      if (input.pointer) state.stroke.push({ ...input.pointer });
      if (!input.released) return;
      const reading = recognise(state.stroke);
      state.stroke = [];
      if (!reading) return;
      state.lastRead = reading.score <= MATCH ? reading.letter : null;
      state.lastReadAt = state.time;
      const target = state.balloons.filter((b) => b.popped < 0 && b.letter === state.lastRead).sort((a, b) => b.y - a.y)[0];
      state.lastHit = target !== undefined;
      if (target) {
        target.popped = 0;
        state.score += 1;
        events.push({ type: 'score', x: target.x, y: target.y, note: NOTES[target.letter], voice: 'bell' });
      } else events.push({ type: 'miss', x: arena.width / 2, y: arena.height / 2 });
    },
  };
}

/** Points the bot's finger goes through to write a letter in a box at (x, y), `size` units per x-height. */
export function writing(letter: Letter, x: number, y: number, size: number): Point[] {
  const model = MODELS[letter];
  const n = letter === 'm' ? 20 : 12;
  return Array.from({ length: n }, (_, i) => model[Math.round((i * (model.length - 1)) / (n - 1))] ?? { x: 0, y: 0 }).map((p) => ({ x: x + p.x * size, y: y + p.y * size }));
}

/** The bot's letter in progress (kept beside the state, not in it). */
const plans = new WeakMap<MagicLettersState, { points: Point[]; next: number }>();

/** Good play: write the letter of the lowest balloon, one point of the stroke per decision, then let go. */
export function magicLettersBot(state: MagicLettersState, context: BotContext): BotMove {
  const plan = plans.get(state);
  if (plan && plan.next < plan.points.length) {
    const p = plan.points[plan.next];
    plan.next += 1;
    return p ? { touch: p } : {};
  }
  if (plan) {
    plans.delete(state);
    return {};
  }
  const lowest = state.balloons.filter((b) => b.popped < 0).sort((a, b) => b.y - a.y)[0];
  if (!lowest) return {};
  const size = Math.min(150, context.arena.width * 0.22);
  const points = writing(lowest.letter, context.arena.width / 2 - size / 2, context.arena.height * 0.55, size);
  plans.set(state, { points, next: 1 });
  return points[0] ? { touch: points[0] } : {};
}
