// Hand span ("Đo bằng gang tay", grade 2 measuring): a table, a rope, a mat or a bamboo pole lies across the
// floor. The child taps along it to lay hand spans end to end from its left end: a hand laid close to the end of
// the last one snaps right against it, one laid too far off leaves a gap or overlaps (and shows red). Once the
// thing is covered, three numbers appear and the child taps how many spans long it is. Right: a point and the
// next thing. Wrong: the true spans light up for a moment, then the next thing comes. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const THINGS = ['table', 'rope', 'mat', 'pole'] as const;
export type Thing = (typeof THINGS)[number];

export interface Hand {
  /** Left edge along the thing. */
  left: number;
  /** Laid right against the last one (or the thing's end), not with a gap or an overlap. */
  snug: boolean;
  laidAt: number;
}

export type SpanPhase = 'lay' | 'count' | 'right' | 'wrong';

export interface HandSpanState {
  thing: Thing;
  /** True length in spans, and where the thing starts and ends. */
  spans: number;
  start: number;
  end: number;
  span: number;
  /** The line the thing lies along. */
  y: number;
  hands: Hand[];
  /** The three numbers to choose from, and where their buttons are. */
  choices: number[];
  buttons: Point[];
  buttonRadius: number;
  phase: SpanPhase;
  phaseAgo: number;
  /** Number tapped last. */
  chosen: number;
  things: number;
  score: number;
  time: number;
}

/** A hand this close (share of a span) to where it should go snaps into place. */
export const SNAP = 0.35;
const RIGHT_SECONDS = 1.1;
const WRONG_SECONDS = 1.8;
const NOTES = [67, 69, 71, 72, 74, 76, 77, 79];

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

/** Where the next hand's left edge should be: the thing's end or the last hand's end. */
export const nextEdge = (state: HandSpanState): number => {
  const last = state.hands.at(-1);
  return last ? last.left + state.span : state.start;
};

export function createHandSpan({ arena, rng }: GameSetup): MinigameLogic<HandSpanState> {
  const events = eventQueue();
  const maxSpans = 6;
  const span = Math.min(120, (arena.width - 70) / maxSpans);
  const y = HUD_SAFE_TOP + (arena.height - HUD_SAFE_TOP) * 0.42;
  const buttonRadius = Math.max(TOUCH_RADIUS + 12, Math.min(66, (arena.width - 80) / 7));
  const state: HandSpanState = {
    thing: 'table',
    spans: 3,
    start: 0,
    end: 0,
    span,
    y,
    hands: [],
    choices: [],
    buttons: [],
    buttonRadius,
    phase: 'lay',
    phaseAgo: 0,
    chosen: -1,
    things: 0,
    score: 0,
    time: 0,
  };

  const next = (): void => {
    state.thing = THINGS[(state.things + rng.int(0, 3)) % THINGS.length] ?? 'table';
    state.spans = rng.int(state.things < 2 ? 2 : 3, state.things < 2 ? 4 : maxSpans);
    const length = state.spans * span;
    state.start = (arena.width - length) / 2;
    state.end = state.start + length;
    state.hands = [];
    state.phase = 'lay';
    state.phaseAgo = 0;
    state.chosen = -1;
    const others = [state.spans - 1, state.spans + 1, state.spans + 2].filter((n) => n >= 1);
    state.choices = shuffle([state.spans, ...shuffle(others, rng).slice(0, 2)], rng);
    const by = Math.min(arena.height - buttonRadius - 40, y + 170 + buttonRadius);
    const gap = Math.min(190, (arena.width - 40) / 3);
    state.buttons = state.choices.map((_, i) => ({ x: arena.width / 2 + (i - 1) * gap, y: by }));
  };

  next();

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
      if (state.phase === 'right' || state.phase === 'wrong') {
        if (state.phaseAgo >= (state.phase === 'right' ? RIGHT_SECONDS : WRONG_SECONDS)) {
          state.things += 1;
          next();
        }
        return;
      }
      for (const tap of input.taps) {
        if (state.phase === 'lay') {
          // A tap near the thing lays the next hand centred on the tap, snapping against the last one.
          if (Math.abs(tap.y - y) > 140) continue;
          const want = nextEdge(state);
          let left = tap.x - span / 2;
          const snug = Math.abs(left - want) <= span * SNAP;
          if (snug) left = want;
          state.hands.push({ left, snug, laidAt: state.time });
          events.push({ type: 'action', x: left + span / 2, y, note: NOTES[Math.min(NOTES.length - 1, state.hands.length - 1)] ?? 72, voice: 'bell' });
          if (left + span >= state.end - span * SNAP || state.hands.length >= state.spans + 2) {
            state.phase = 'count';
            state.phaseAgo = 0;
          }
          continue;
        }
        const index = state.buttons.findIndex((b) => Math.hypot(tap.x - b.x, tap.y - b.y) <= buttonRadius * 1.25);
        if (index < 0) continue;
        const value = state.choices[index] ?? -1;
        state.chosen = index;
        state.phaseAgo = 0;
        const at = state.buttons[index] ?? { x: 0, y: 0 };
        if (value === state.spans) {
          state.score += 1;
          state.phase = 'right';
          events.push({ type: 'score', x: at.x, y: at.y });
        } else {
          state.phase = 'wrong';
          events.push({ type: 'miss', x: at.x, y: at.y });
        }
        break;
      }
    },
  };
}

/** Seconds between the bot's hands, and before it answers. */
const BOT_HAND = 0.4;
const BOT_ANSWER = 0.7;

/** Good play: hands laid snug end to end, then the number of spans. */
export function handSpanBot(state: HandSpanState, _context: BotContext): BotMove {
  const last = state.hands.at(-1)?.laidAt ?? state.time - state.phaseAgo;
  if (state.phase === 'lay') {
    if (state.time - last < BOT_HAND) return {};
    return { tap: { x: nextEdge(state) + state.span / 2, y: state.y } };
  }
  if (state.phase === 'count' && state.phaseAgo >= BOT_ANSWER) {
    const button = state.buttons[state.choices.indexOf(state.spans)];
    return button ? { tap: button } : {};
  }
  return {};
}
