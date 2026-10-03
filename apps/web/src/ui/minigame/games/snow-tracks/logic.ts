// Who went by? Footprints appear one by one along a winding way through the snow, and the child taps which
// animal made them: a rabbit's hops (two long feet ahead of two small ones), a fox's neat single line, a
// bird's paired three-toed hops, or a penguin's waddle with its tail dragging. Right on the first try is a point
// and the animal pops out at the end of its tracks; a wrong guess greys that animal out, waits a moment and
// shows more prints. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const ANIMALS = ['rabbit', 'fox', 'bird', 'penguin'] as const;
export type Animal = (typeof ANIMALS)[number];

export type PrintKind = 'hind' | 'front' | 'paw' | 'claw' | 'web' | 'drag';

export interface Print {
  x: number;
  y: number;
  /** Direction of travel there (radians); the print points along it (plus its own splay). */
  angle: number;
  kind: PrintKind;
}

export type TracksPhase = 'guess' | 'reveal';

export interface SnowTracksState {
  animal: number;
  prints: Print[];
  /** Prints visible so far (fractional while the next one fades in). */
  shown: number;
  buttons: Point[];
  buttonRadius: number;
  /** Animals already guessed wrong this round. */
  ruledOut: boolean[];
  wrongThisRound: boolean;
  /** Until this time guesses are not taken (after a wrong one). */
  lockedUntil: number;
  phase: TracksPhase;
  phaseAgo: number;
  /** Where the field is (prints stay inside). */
  field: { top: number; bottom: number };
  rounds: number;
  score: number;
  time: number;
}

/** Prints shown per second, and the extra ones a wrong guess reveals. */
const PRINT_RATE = 4.2;
const HINT_PRINTS = 4;
const LOCK_SECONDS = 0.9;
const REVEAL_SECONDS = 1.1;

/**
 * Footprints of `animal` along a gentle winding way across the field: left to right (or back) on a wide field,
 * top to bottom (or back) on a tall one.
 */
export function makePrints(animal: Animal, rng: Rng, width: number, top: number, bottom: number): Print[] {
  const tall = bottom - top > width;
  const forward = rng.chance(0.5);
  const margin = 50;
  const across = tall ? width : bottom - top;
  const length = (tall ? bottom - top : width) - margin * 2;
  const centre = rng.range(across * 0.3, across * 0.7);
  const amp = Math.min(70, across / 4);
  const phase = rng.range(0, Math.PI * 2);
  const waves = tall ? 1.5 : 1;
  const pathAt = (s: number): { x: number; y: number; angle: number } => {
    const t = s / length;
    const along = forward ? margin + s : margin + length - s;
    const side = Math.min(across - 30, Math.max(30, centre + Math.sin(t * Math.PI * 2 * waves + phase) * amp));
    const slope = Math.cos(t * Math.PI * 2 * waves + phase) * amp * ((Math.PI * 2 * waves) / length);
    const dir = forward ? 1 : -1;
    return tall ? { x: side, y: top + along, angle: Math.atan2(dir, slope) } : { x: along, y: top + side, angle: Math.atan2(slope, dir) };
  };
  const out: Print[] = [];
  const side = (p: { x: number; y: number; angle: number }, offset: number, forward = 0): Point => ({
    x: p.x + Math.cos(p.angle) * forward - Math.sin(p.angle) * offset,
    y: p.y + Math.sin(p.angle) * forward + Math.cos(p.angle) * offset,
  });
  if (animal === 'rabbit') {
    for (let s = 0; s < length; s += 80) {
      const p = pathAt(s);
      out.push({ ...side(p, 0, -22), angle: p.angle, kind: 'front' });
      out.push({ ...side(p, 0, -8), angle: p.angle, kind: 'front' });
      out.push({ ...side(p, -12, 14), angle: p.angle, kind: 'hind' });
      out.push({ ...side(p, 12, 14), angle: p.angle, kind: 'hind' });
    }
  } else if (animal === 'fox') {
    for (let s = 0, k = 0; s < length; s += 34, k += 1) {
      const p = pathAt(s);
      out.push({ ...side(p, k % 2 === 0 ? -3 : 3), angle: p.angle, kind: 'paw' });
    }
  } else if (animal === 'bird') {
    for (let s = 0; s < length; s += 48) {
      const p = pathAt(s);
      out.push({ ...side(p, -9), angle: p.angle, kind: 'claw' });
      out.push({ ...side(p, 9), angle: p.angle, kind: 'claw' });
    }
  } else {
    for (let s = 0, k = 0; s < length; s += 28, k += 1) {
      const p = pathAt(s);
      if (k % 3 === 1) out.push({ ...side(p, 0, -14), angle: p.angle, kind: 'drag' });
      out.push({ ...side(p, k % 2 === 0 ? -14 : 14), angle: p.angle + (k % 2 === 0 ? -0.45 : 0.45), kind: 'web' });
    }
  }
  return out;
}

export function createSnowTracks({ arena, rng }: GameSetup): MinigameLogic<SnowTracksState> {
  const events = eventQueue();
  const buttonRadius = Math.max(TOUCH_RADIUS + 10, Math.min(72, (arena.width - 60) / 9));
  const buttonY = arena.height - buttonRadius - 28;
  const field = { top: HUD_SAFE_TOP + 20, bottom: buttonY - buttonRadius - 30 };
  const state: SnowTracksState = {
    animal: 0,
    prints: [],
    shown: 0,
    buttons: ANIMALS.map((_, i) => ({ x: arena.width / 2 + (i - 1.5) * Math.min(arena.width / 4.2, buttonRadius * 2.6), y: buttonY })),
    buttonRadius,
    ruledOut: ANIMALS.map(() => false),
    wrongThisRound: false,
    lockedUntil: 0,
    phase: 'guess',
    phaseAgo: 0,
    field,
    rounds: 0,
    score: 0,
    time: 0,
  };

  const newRound = (): void => {
    let animal = rng.int(0, ANIMALS.length - 1);
    if (state.rounds > 0 && animal === state.animal) animal = (animal + rng.int(1, ANIMALS.length - 1)) % ANIMALS.length;
    state.animal = animal;
    state.prints = makePrints(ANIMALS[animal] ?? 'fox', rng, arena.width, field.top, field.bottom);
    state.shown = 0;
    state.ruledOut = ANIMALS.map(() => false);
    state.wrongThisRound = false;
    state.phase = 'guess';
    state.phaseAgo = 0;
  };

  newRound();

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
      state.shown = Math.min(state.prints.length, state.shown + PRINT_RATE * dt);
      if (state.phase === 'reveal') {
        if (state.phaseAgo >= REVEAL_SECONDS) {
          state.rounds += 1;
          newRound();
        }
        return;
      }
      if (state.time < state.lockedUntil) return;
      for (const tap of input.taps) {
        const index = state.buttons.findIndex((b) => Math.hypot(tap.x - b.x, tap.y - b.y) <= state.buttonRadius * 1.25);
        if (index < 0 || state.ruledOut[index]) continue;
        const at = state.buttons[index] ?? tap;
        if (index === state.animal) {
          state.phase = 'reveal';
          state.phaseAgo = 0;
          state.shown = state.prints.length;
          if (!state.wrongThisRound) {
            state.score += 1;
            events.push({ type: 'score', x: at.x, y: at.y });
          } else events.push({ type: 'action', x: at.x, y: at.y });
        } else {
          state.ruledOut[index] = true;
          state.wrongThisRound = true;
          state.lockedUntil = state.time + LOCK_SECONDS;
          state.shown = Math.min(state.prints.length, state.shown + HINT_PRINTS);
          events.push({ type: 'miss', x: at.x, y: at.y });
        }
        break;
      }
    },
  };
}

/** Good play: looks at the first few prints, then names the animal. */
export function snowTracksBot(state: SnowTracksState, _context: BotContext): BotMove {
  if (state.phase !== 'guess' || state.shown < 6) return {};
  const button = state.buttons[state.animal];
  return button ? { tap: button } : {};
}
