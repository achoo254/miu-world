// Jar estimate: a jar of sweets shows for three seconds, then a cloth covers it. The child slides the needle
// along the ruler to how many sweets she thinks there were and taps "Xong". Then the sweets pour out into rows
// of ten so she can count them by tens and ones: a guess within a fifth of the real number (at least 2) is a
// point. Nothing is lost for a far guess; she just sees the count. Eight jars. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export type JarPhase = 'show' | 'guess' | 'reveal';

export interface JarState {
  jar: { x: number; y: number; size: number };
  /** Sweet positions inside the jar (arena units) and which sweet each is. */
  sweets: Array<Point & { kind: 0 | 1 | 2 }>;
  count: number;
  phase: JarPhase;
  phaseTime: number;
  guess: number;
  /** The ruler: from x0 (0) to x1 (MAX), at y. */
  ruler: { x0: number; x1: number; y: number };
  dragging: boolean;
  done: { x: number; y: number; w: number; h: number };
  /** The last guess was close enough. */
  close: boolean;
  round: number;
  score: number;
  time: number;
}

export const MAX = 100;
export const ROUNDS = 8;
export const SHOW_SECONDS = 3;
/** Seconds to guess before the jar opens on its own. */
const GUESS_SECONDS = 11;
export const REVEAL_SECONDS = 2.6;

/** Close enough: within a fifth of the real number, and never stricter than 2. */
export const isClose = (guess: number, count: number): boolean => Math.abs(guess - count) <= Math.max(2, Math.round(count * 0.2));

export function createJarEstimate({ arena, rng }: GameSetup): MinigameLogic<JarState> {
  const events = eventQueue();
  const rulerY = arena.height - 150;
  // The jar sits in the middle of the space above the ruler, as big as it fits.
  const room = rulerY - 125 - HUD_SAFE_TOP;
  const size = Math.min(420, room, arena.width * 0.62);
  const state: JarState = {
    jar: { x: arena.width / 2, y: HUD_SAFE_TOP + 10 + room / 2, size },
    sweets: [],
    count: 0,
    phase: 'show',
    phaseTime: 0,
    guess: 0,
    ruler: { x0: 70, x1: arena.width - 70, y: rulerY },
    dragging: false,
    done: { x: arena.width / 2 - 90, y: arena.height - 92, w: 180, h: 70 },
    close: false,
    round: 0,
    score: 0,
    time: 0,
  };

  function newJar(): void {
    const top = Math.min(80, 25 + state.round * 8);
    state.count = rng.int(Math.min(12 + state.round * 3, 40), top);
    // Sweets fill the jar's belly from the bottom up, a little jumbled.
    const { x, y, size: s } = state.jar;
    const cols = 9;
    const cell = (s * 0.62) / cols;
    state.sweets = Array.from({ length: state.count }, (_, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      return {
        x: x - s * 0.31 + cell * (col + 0.5) + rng.range(-0.25, 0.25) * cell,
        y: y + s * 0.36 - cell * 0.8 * (row + 0.5) + rng.range(-0.2, 0.2) * cell,
        kind: (rng.chance(0.6) ? 0 : rng.int(1, 2)) as 0 | 1 | 2,
      };
    });
    state.guess = 0;
    state.phase = 'show';
    state.phaseTime = 0;
  }

  const valueAt = (x: number): number => Math.round(Math.min(1, Math.max(0, (x - state.ruler.x0) / (state.ruler.x1 - state.ruler.x0))) * MAX);
  const inDone = (p: Point): boolean => p.x >= state.done.x - 10 && p.x <= state.done.x + state.done.w + 10 && p.y >= state.done.y - 10 && p.y <= state.done.y + state.done.h + 10;

  function submit(): void {
    state.close = isClose(state.guess, state.count);
    state.phase = 'reveal';
    state.phaseTime = 0;
    if (state.close) {
      state.score += 1;
      events.push({ type: 'score', x: state.jar.x, y: state.jar.y });
    } else {
      events.push({ type: 'miss', x: state.jar.x, y: state.jar.y });
    }
  }

  newJar();

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.round >= ROUNDS;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.phaseTime += dt;
      switch (state.phase) {
        case 'show':
          if (state.phaseTime >= SHOW_SECONDS) {
            state.phase = 'guess';
            state.phaseTime = 0;
            events.push({ type: 'action', x: state.jar.x, y: state.jar.y });
          }
          break;
        case 'guess': {
          const p = input.pointer;
          if (input.pressed && p && Math.abs(p.y - state.ruler.y) < 80) state.dragging = true;
          if (state.dragging && p) state.guess = valueAt(p.x);
          if (!p) state.dragging = false;
          const tapped = input.taps.find((t) => inDone(t));
          if (tapped || state.phaseTime >= GUESS_SECONDS) submit();
          break;
        }
        case 'reveal':
          if (state.phaseTime >= REVEAL_SECONDS) {
            state.round += 1;
            if (state.round < ROUNDS) newJar();
          }
          break;
      }
    },
  };
}

/** Good play: a fair guess (a little off, like a child), then "Xong". */
export function jarBot(state: JarState, _context: BotContext): BotMove {
  if (state.phase !== 'guess' || state.phaseTime < 0.5) return {};
  const target = Math.round(state.count * (state.round % 2 === 0 ? 1.08 : 0.93));
  const x = state.ruler.x0 + (target / MAX) * (state.ruler.x1 - state.ruler.x0);
  if (state.guess !== target) return { touch: { x, y: state.ruler.y } };
  if (state.dragging) return {};
  return { tap: { x: state.done.x + state.done.w / 2, y: state.done.y + state.done.h / 2 } };
}
