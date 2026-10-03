// Sink or float: things ride a belt and drop off its end into a tank of water, one every few seconds. Before
// a thing drops, the child guesses: swipe up (or tap the up button) if it will float, down if it will sink.
// Then it drops and shows what really happens: a right guess is a point; a wrong one, or none, just shows the
// answer. Things come on a steady belt, so guessing the same way every time gets about half: not enough.
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import type { SpriteName } from '../../sprites';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const FLOATS: readonly SpriteName[] = ['wood', 'leaf', 'feather', 'duck', 'balloon', 'red-apple', 'coconut', 'lemon', 'soccer-ball', 'canoe'];
export const SINKS: readonly SpriteName[] = ['rock', 'key', 'coin', 'spiral-shell', 'magnet', 'gem', 'egg', 'bell', 'canned-food', 'trophy'];

export type Guess = 'float' | 'sink';

export interface Thing {
  sprite: SpriteName;
  floats: boolean;
  /** Round time when it drops off the belt. */
  dropAt: number;
  guess: Guess | null;
  /** null until it lands in the water; then whether the guess was right. */
  right: boolean | null;
  /** Where it settles in the tank (x) once dropped. */
  settleX: number;
}

export interface SinkFloatState {
  things: Thing[];
  /** The belt runs from beltLeft to the drop point (dropX) at beltY; the tank lies under the drop point. */
  beltY: number;
  beltLeft: number;
  dropX: number;
  tank: { x: number; y: number; w: number; h: number };
  /** Guess buttons: up (float) and down (sink). */
  upButton: Point;
  downButton: Point;
  buttonRadius: number;
  /** Seconds between two things. */
  gap: number;
  score: number;
  time: number;
}

/** Seconds a thing takes to fall from the belt into the water, and to sink to the bottom or bob up. */
export const FALL_SECONDS = 0.45;
export const SETTLE_SECONDS = 0.7;
const FIRST_DROP = 2.6;

function bag(rng: Rng, count: number): { sprite: SpriteName; floats: boolean }[] {
  // Half float, half sink, shuffled, with no long runs of the same answer.
  const out: { sprite: SpriteName; floats: boolean }[] = [];
  let lastRun = 0;
  let last: boolean | null = null;
  let floatsLeft = Math.ceil(count / 2);
  let sinksLeft = count - floatsLeft;
  for (let i = 0; i < count; i += 1) {
    let floats = rng.int(1, floatsLeft + sinksLeft) <= floatsLeft;
    if (lastRun >= 2 && floats === last) floats = !floats;
    if (floats && floatsLeft === 0) floats = false;
    if (!floats && sinksLeft === 0) floats = true;
    if (floats) floatsLeft -= 1;
    else sinksLeft -= 1;
    lastRun = floats === last ? lastRun + 1 : 1;
    last = floats;
    const pool = floats ? FLOATS : SINKS;
    out.push({ sprite: pool[rng.int(0, pool.length - 1)] ?? 'rock', floats });
  }
  return out;
}

export function createSinkFloat({ arena, duration, params, rng }: GameSetup): MinigameLogic<SinkFloatState> {
  const gap = typeof params.gap === 'number' ? Math.min(4, Math.max(1.8, params.gap)) : 2.5;
  const events = eventQueue();
  const count = Math.ceil((duration - FIRST_DROP) / gap) + 1;
  const tankW = Math.min(arena.width * 0.62, 460);
  const beltY = HUD_SAFE_TOP + 70;
  const tankTop = beltY + 110;
  const dropX = arena.width / 2;
  const buttonRadius = Math.max(TOUCH_RADIUS + 10, 54);
  const side = dropX + tankW / 2 + buttonRadius + 20;
  // Buttons beside the tank when there is room, under it on a tall screen.
  const below = side + buttonRadius > arena.width - 10;
  const tankH = below ? Math.min(arena.height - tankTop - buttonRadius * 2 - 70, 560) : Math.min(arena.height - tankTop - 40, 420);
  const tank = { x: dropX - tankW / 2, y: tankTop, w: tankW, h: tankH };
  const buttonY = tankTop + tankH + buttonRadius + 30;
  const state: SinkFloatState = {
    things: bag(rng, count).map((t, i) => ({ ...t, dropAt: FIRST_DROP + i * gap, guess: null, right: null, settleX: dropX + rng.range(-tankW * 0.32, tankW * 0.32) })),
    beltY,
    beltLeft: 0,
    dropX,
    tank,
    upButton: below ? { x: arena.width * 0.3, y: buttonY } : { x: side, y: tankTop + tankH * 0.25 },
    downButton: below ? { x: arena.width * 0.7, y: buttonY } : { x: side, y: tankTop + tankH * 0.75 },
    buttonRadius,
    gap,
    score: 0,
    time: 0,
  };

  /** The next thing to drop that has not been guessed: what a guess is about. */
  const current = (): Thing | undefined => state.things.find((t) => t.dropAt > state.time && t.dropAt - state.time < gap + 0.2 && t.guess === null);

  function guess(g: Guess): void {
    const thing = current();
    if (!thing) return;
    thing.guess = g;
    events.push({ type: 'action', x: thingX(state, thing), y: beltY - 30, note: g === 'float' ? 76 : 64, voice: 'bell' });
  }

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
      for (const s of input.swipes) {
        if (s.direction === 'up') guess('float');
        if (s.direction === 'down') guess('sink');
      }
      for (const tap of input.taps) {
        const r = buttonRadius * 1.3;
        if (Math.hypot(tap.x - state.upButton.x, tap.y - state.upButton.y) <= r) guess('float');
        else if (Math.hypot(tap.x - state.downButton.x, tap.y - state.downButton.y) <= r) guess('sink');
      }
      for (const thing of state.things) {
        if (thing.right !== null || state.time < thing.dropAt + FALL_SECONDS) continue;
        thing.right = thing.guess !== null && (thing.guess === 'float') === thing.floats;
        const y = thing.floats ? tank.y + 40 : tank.y + tank.h - 40;
        if (thing.right) {
          state.score += 1;
          events.push({ type: 'score', x: thing.settleX, y });
        } else {
          events.push({ type: 'miss', x: thing.settleX, y });
        }
      }
    },
  };
}

/** Where a thing on the belt is drawn: it reaches the drop point at its drop time. */
export function thingX(state: SinkFloatState, thing: Thing): number {
  const speed = (state.dropX - state.beltLeft + 60) / (state.gap * 1.6);
  return state.dropX - (thing.dropAt - state.time) * speed;
}

/** Good play: knows what floats; guesses as soon as the next thing is on its way. */
export function sinkFloatBot(state: SinkFloatState, _context: BotContext): BotMove {
  const thing = state.things.find((t) => t.dropAt > state.time && t.dropAt - state.time < state.gap && t.guess === null);
  if (!thing || thing.dropAt - state.time > state.gap - 0.4) return {};
  const from = { x: state.dropX, y: state.beltY + 160 };
  return { swipe: { from, dx: 0, dy: thing.floats ? -120 : 120 } };
}
