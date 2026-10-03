// Pitch stairs: a row of icicles hangs in an ice cave, low notes on the left (long icicles), high ones on the
// right (short). Two icicles ring one after the other, each lighting up as it sounds; the child taps the up
// arrow when the second note was higher, the down arrow when it was lower. Right: she climbs one icy step (a
// point). Wrong: she stays where she is and both icicles show which way it went. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

/** C major from middle C up an octave: the icicles' notes, left to right. */
export const SCALE = [60, 62, 64, 65, 67, 69, 71, 72] as const;

export type PitchPhase = 'listen' | 'answer' | 'right' | 'wrong';

export interface PitchButton extends Point {
  r: number;
  dir: 'up' | 'down';
}

export interface PitchState {
  /** Icicle centres along the top (left = low). */
  icicles: Point[];
  first: number;
  second: number;
  phase: PitchPhase;
  phaseTime: number;
  /** Seconds since each icicle rang (the glow). */
  rangAgo: number[];
  buttons: PitchButton[];
  /** Which button was tapped last, and when (the press). */
  pressed: 'up' | 'down' | null;
  pressedAt: number;
  steps: number;
  /** Seconds since the last climb (the hop up a step). */
  climbAgo: number;
  score: number;
  time: number;
}

/** Seconds from the start of a question to each note. */
const FIRST_AT = 0.25;
export const SECOND_AT = 0.95;
const RIGHT_SECONDS = 0.55;
const WRONG_SECONDS = 1.3;

export function createPitchStairs({ arena, duration, rng }: GameSetup): MinigameLogic<PitchState> {
  const events = eventQueue();
  const margin = 60;
  const gap = (arena.width - margin * 2) / (SCALE.length - 1);
  const icicles = SCALE.map((_, i) => ({ x: margin + i * gap, y: HUD_SAFE_TOP + 20 }));
  const buttonR = 66;
  // Landscape: the arrows stand at both sides; portrait: side by side at the bottom.
  const wide = arena.width > arena.height * 1.15;
  const buttonY = wide ? arena.height - 150 : arena.height - buttonR - 40;
  const buttonX = wide ? [buttonR + 34, arena.width - buttonR - 34] : [arena.width * 0.27, arena.width * 0.73];
  const state: PitchState = {
    icicles,
    first: 0,
    second: 0,
    phase: 'listen',
    phaseTime: 0,
    rangAgo: SCALE.map(() => 99),
    buttons: [
      { x: buttonX[0] ?? 0, y: buttonY, r: buttonR, dir: 'up' },
      { x: buttonX[1] ?? 0, y: buttonY, r: buttonR, dir: 'down' },
    ],
    pressed: null,
    pressedAt: -9,
    steps: 0,
    climbAgo: 9,
    score: 0,
    time: 0,
  };

  function ask(): void {
    // Far-apart notes first; neighbours (one step) later in the round.
    const late = state.time / duration > 0.5;
    const minGap = late ? 1 : 2;
    const a = rng.int(0, SCALE.length - 1);
    let b = a;
    while (Math.abs(b - a) < minGap) b = rng.int(0, SCALE.length - 1);
    state.first = a;
    state.second = b;
    state.phase = 'listen';
    state.phaseTime = 0;
  }

  const ring = (i: number): void => {
    state.rangAgo[i] = 0;
    const icicle = state.icicles[i];
    if (icicle) events.push({ type: 'action', x: icicle.x, y: icicle.y + 60, note: SCALE[i], voice: 'bell' });
  };

  function answer(dir: 'up' | 'down', at: Point): void {
    state.pressed = dir;
    state.pressedAt = state.time;
    const right = (state.second > state.first) === (dir === 'up');
    state.phaseTime = 0;
    if (right) {
      state.phase = 'right';
      state.steps += 1;
      state.score += 1;
      state.climbAgo = 0;
      events.push({ type: 'score', x: at.x, y: at.y - 80 });
    } else {
      state.phase = 'wrong';
      events.push({ type: 'miss', x: at.x, y: at.y });
    }
  }

  ask();

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
      state.climbAgo += dt;
      const before = state.phaseTime;
      state.phaseTime += dt;
      state.rangAgo = state.rangAgo.map((a) => a + dt);
      if (state.phase === 'listen' || state.phase === 'answer') {
        if (before < FIRST_AT && state.phaseTime >= FIRST_AT) ring(state.first);
        if (before < SECOND_AT && state.phaseTime >= SECOND_AT) {
          ring(state.second);
          state.phase = 'answer';
        }
      }
      if (state.phase === 'answer') {
        for (const tap of input.taps) {
          const button = state.buttons.find((b) => Math.hypot(b.x - tap.x, b.y - tap.y) <= b.r + 14);
          if (button) {
            answer(button.dir, button);
            break;
          }
        }
      }
      if (state.phase === 'right' && state.phaseTime > RIGHT_SECONDS) ask();
      if (state.phase === 'wrong' && state.phaseTime > WRONG_SECONDS) ask();
    },
  };
}

/** Good play: hears every pair right and answers a beat after the second note. */
export function pitchStairsBot(state: PitchState, _context: BotContext): BotMove {
  if (state.phase !== 'answer' || state.phaseTime < SECOND_AT + 0.2) return {};
  const button = state.buttons.find((b) => b.dir === (state.second > state.first ? 'up' : 'down'));
  return button ? { tap: { x: button.x, y: button.y } } : {};
}
