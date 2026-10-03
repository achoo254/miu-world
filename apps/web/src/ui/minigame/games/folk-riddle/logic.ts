// Folk riddle: a riddle appears line by line on a paper card ("Con gì đuôi ngắn tai dài…"), with four pictures
// (each with its name) to choose from once the second line is out. One guess per riddle: the right picture is a
// point; a wrong one shows the answer for a moment and costs one of three hearts (so guessing at random does not
// pay), then the next riddle comes. The sooner the child knows, the more riddles fit in the round. Riddles do
// not repeat until all were asked.
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';
import { RIDDLES, type Riddle } from './riddles';

export interface Choice extends Point {
  /** Index into RIDDLES of the riddle whose answer this picture is. */
  riddle: number;
  r: number;
}

export type Phase = 'ask' | 'right' | 'wrong';

export interface FolkRiddleState {
  /** Index into RIDDLES of the riddle being asked. */
  current: number;
  choices: Choice[];
  /** The picked choice (index into `choices`), or -1. */
  picked: number;
  phase: Phase;
  phaseTime: number;
  card: { x: number; y: number; w: number; h: number };
  asked: number;
  lives: number;
  score: number;
  time: number;
}

/** Seconds between two lines of a riddle. */
export const LINE_SECONDS = 2.0;
/** Lines out before the pictures can be tapped. */
export const LINES_BEFORE_ANSWER = 2;
const RIGHT_PAUSE = 1.2;
const WRONG_PAUSE = 2.5;
/** Seconds after the last line before the answer is shown anyway. */
const WAIT_AFTER_LAST = 7;
const LIVES = 3;

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

export const linesShown = (state: FolkRiddleState): number => {
  const riddle = RIDDLES[state.current];
  if (!riddle) return 0;
  if (state.phase !== 'ask') return riddle.lines.length;
  return Math.min(riddle.lines.length, 1 + Math.floor(state.phaseTime / LINE_SECONDS));
};

export const canAnswer = (state: FolkRiddleState): boolean => state.phase === 'ask' && state.phaseTime >= LINE_SECONDS * (LINES_BEFORE_ANSWER - 1);

export function createFolkRiddle({ arena, rng }: GameSetup): MinigameLogic<FolkRiddleState> {
  const events = eventQueue();
  const top = HUD_SAFE_TOP + 10;
  const landscape = arena.width > arena.height;
  const cardH = 230;
  const card = { x: 20, y: top, w: arena.width - 40, h: cardH };
  // Four pictures: one row on a wide screen, two by two on a tall one.
  const below = { y: top + cardH + 16, h: arena.height - top - cardH - 26 };
  const r = landscape
    ? Math.max(TOUCH_RADIUS * 1.5, Math.min(86, (arena.width - 100) / 8.6, below.h / 2.7))
    : Math.max(TOUCH_RADIUS * 1.5, Math.min(110, (arena.width - 90) / 4.4, below.h / 5.2));
  const slots: Point[] = landscape
    ? [0, 1, 2, 3].map((i) => ({ x: arena.width / 2 + (i - 1.5) * (arena.width - 40) * 0.245, y: below.y + below.h / 2 - r * 0.15 }))
    : [0, 1, 2, 3].map((i) => ({ x: arena.width / 2 + (i % 2 === 0 ? -1 : 1) * (arena.width - 40) * 0.25, y: below.y + below.h * (Math.floor(i / 2) === 0 ? 0.27 : 0.72) - r * 0.15 }));

  let queue: number[] = [];
  const state: FolkRiddleState = { current: 0, choices: [], picked: -1, phase: 'ask', phaseTime: 0, card, asked: 0, lives: LIVES, score: 0, time: 0 };

  function ask(): void {
    if (queue.length === 0) {
      queue = shuffle(
        RIDDLES.map((_, i) => i),
        rng,
      );
      // Never the same riddle twice in a row across a refill.
      if (queue[0] === state.current && queue.length > 1) queue.push(queue.shift() ?? 0);
    }
    state.current = queue.shift() ?? 0;
    const others = shuffle(
      RIDDLES.map((_, i) => i).filter((i) => i !== state.current),
      rng,
    ).slice(0, 3);
    const picks = shuffle([state.current, ...others], rng);
    state.choices = picks.map((riddle, i) => ({ riddle, r, ...(slots[i] ?? { x: 0, y: 0 }) }));
    state.picked = -1;
    state.phase = 'ask';
    state.phaseTime = 0;
    state.asked += 1;
  }

  function settle(picked: number): void {
    state.picked = picked;
    const choice = state.choices[picked];
    if (choice && choice.riddle === state.current) {
      state.phase = 'right';
      state.score += 1;
      events.push({ type: 'score', x: choice.x, y: choice.y - choice.r });
    } else {
      state.phase = 'wrong';
      // Running out of time is no guess: only a wrong pick costs a heart.
      if (choice) state.lives -= 1;
      events.push({ type: choice ? 'hit' : 'miss', x: choice?.x ?? arena.width / 2, y: choice?.y ?? arena.height / 2 });
    }
    state.phaseTime = 0;
  }

  ask();

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.lives <= 0 && state.phase === 'ask';
    },
    get lives() {
      return state.lives;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      const before = linesShown(state);
      state.phaseTime += dt;
      if (state.phase === 'right' || state.phase === 'wrong') {
        if (state.phaseTime >= (state.phase === 'right' ? RIGHT_PAUSE : WRONG_PAUSE)) ask();
        return;
      }
      const riddle: Riddle | undefined = RIDDLES[state.current];
      if (linesShown(state) > before) events.push({ type: 'action', x: card.x + card.w / 2, y: card.y + card.h / 2 });
      if (canAnswer(state)) {
        for (const tap of input.taps) {
          const index = state.choices.findIndex((c) => Math.hypot(tap.x - c.x, tap.y - (c.y + c.r * 0.2)) <= c.r * 1.3);
          if (index >= 0) {
            settle(index);
            return;
          }
        }
      }
      if (riddle && state.phaseTime >= LINE_SECONDS * (riddle.lines.length - 1) + WAIT_AFTER_LAST) settle(-1);
    },
  };
}

/** Good play: knows every riddle, answers as soon as the pictures can be tapped. */
export function folkRiddleBot(state: FolkRiddleState, _context: BotContext): BotMove {
  if (!canAnswer(state)) return {};
  const right = state.choices.find((c) => c.riddle === state.current);
  return right ? { tap: { x: right.x, y: right.y } } : {};
}
