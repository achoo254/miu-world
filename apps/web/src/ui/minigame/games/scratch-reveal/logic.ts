// Scratch reveal: a card covered with snow (sand on the beach maps) hides a big picture of an animal. Rubbing
// the card with a finger scrapes the cover away under it; once a little of the picture shows, three answers
// appear beside the card. The right one scores two points when most of the card is still covered (a sharp
// guess) or one point after more scratching; a wrong one just fades out and she scratches on. Then the next
// card. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

/** Animals draw.ts has pictures for (answers are indexes into its list). */
export const ANIMAL_COUNT = 20;
/** The cover is a GRID × GRID board of cells. */
export const GRID = 14;
/** Answers show once this share of the cover is gone; a right answer before SHARP is worth two. */
export const OPEN_AT = 0.12;
export const SHARP = 0.35;
const REVEAL_SECONDS = 1;

export interface Choice {
  animal: number;
  x: number;
  y: number;
  wrong: boolean;
  /** Seconds since it was tapped (a wobble, a fade). */
  since: number;
}

export interface ScratchState {
  card: { x: number; y: number; size: number };
  /** True where the cover has been scratched away (row-major GRID × GRID). */
  cleared: boolean[];
  clearedShare: number;
  brush: number;
  answer: number;
  choices: Choice[];
  /** Radius of an answer button. */
  choiceRadius: number;
  /** Seconds left of showing the whole picture after a right answer (0 while guessing). */
  reveal: number;
  /** Points the last right answer was worth (for the banner). */
  lastPoints: number;
  rounds: number;
  /** Where the finger was on the last step, for scratching along its path. */
  last: Point | null;
  score: number;
  time: number;
}

function pickChoices(answer: number, rng: Rng): number[] {
  const set = new Set([answer]);
  while (set.size < 3) set.add(rng.int(0, ANIMAL_COUNT - 1));
  const list = [...set];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = rng.int(0, i);
    const a = list[i];
    const b = list[j];
    if (a !== undefined && b !== undefined) {
      list[i] = b;
      list[j] = a;
    }
  }
  return list;
}

export function createScratchReveal({ arena, rng }: GameSetup): MinigameLogic<ScratchState> {
  const events = eventQueue();
  const landscape = arena.width > arena.height;
  const radius = 62;
  const size = landscape ? Math.min(arena.height - HUD_SAFE_TOP - 50, arena.width * 0.55) : Math.min(arena.width - 60, arena.height - HUD_SAFE_TOP - 240);
  // On a tall screen the card and the answers below it sit together in the middle of the space.
  const block = size + 40 + radius * 2;
  const tallTop = HUD_SAFE_TOP + 24 + Math.max(0, (arena.height - HUD_SAFE_TOP - 54 - block) / 2);
  const card = landscape ? { x: Math.max(30, arena.width * 0.5 - size - 40), y: HUD_SAFE_TOP + 24, size } : { x: (arena.width - size) / 2, y: tallTop, size };
  const slots: Point[] = landscape
    ? [-1, 0, 1].map((k) => ({ x: card.x + size + (arena.width - card.x - size) / 2, y: card.y + size / 2 + k * (radius * 2 + 22) }))
    : [-1, 0, 1].map((k) => ({ x: arena.width / 2 + k * (radius * 2 + 40), y: Math.min(arena.height - radius - 30, card.y + size + 40 + radius) }));
  const state: ScratchState = {
    card,
    cleared: [],
    clearedShare: 0,
    brush: size * 0.11,
    answer: 0,
    choices: [],
    choiceRadius: radius,
    reveal: 0,
    lastPoints: 0,
    rounds: 0,
    last: null,
    score: 0,
    time: 0,
  };
  let previous = -1;

  function deal(): void {
    let answer = rng.int(0, ANIMAL_COUNT - 1);
    if (answer === previous) answer = (answer + 1) % ANIMAL_COUNT;
    previous = answer;
    state.answer = answer;
    state.cleared = new Array<boolean>(GRID * GRID).fill(false);
    state.clearedShare = 0;
    state.choices = pickChoices(answer, rng).map((animal, i) => ({ animal, x: slots[i]?.x ?? 0, y: slots[i]?.y ?? 0, wrong: false, since: 9 }));
    state.rounds += 1;
  }

  /** Scrapes the cover along the finger's path from `a` to `b`. */
  function scratch(a: Point, b: Point): void {
    const cell = card.size / GRID;
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    const samples = Math.max(1, Math.ceil(length / (state.brush * 0.5)));
    let count = 0;
    for (let s = 0; s <= samples; s += 1) {
      const x = a.x + ((b.x - a.x) * s) / samples;
      const y = a.y + ((b.y - a.y) * s) / samples;
      const c0 = Math.max(0, Math.floor((x - state.brush - card.x) / cell));
      const c1 = Math.min(GRID - 1, Math.floor((x + state.brush - card.x) / cell));
      const r0 = Math.max(0, Math.floor((y - state.brush - card.y) / cell));
      const r1 = Math.min(GRID - 1, Math.floor((y + state.brush - card.y) / cell));
      for (let r = r0; r <= r1; r += 1) {
        for (let c = c0; c <= c1; c += 1) {
          const cx = card.x + (c + 0.5) * cell;
          const cy = card.y + (r + 0.5) * cell;
          if (Math.hypot(cx - x, cy - y) <= state.brush && !state.cleared[r * GRID + c]) {
            state.cleared[r * GRID + c] = true;
            count += 1;
          }
        }
      }
    }
    if (count > 0) state.clearedShare = state.cleared.filter(Boolean).length / (GRID * GRID);
  }

  const onCard = (p: Point): boolean => p.x >= card.x - 20 && p.x <= card.x + card.size + 20 && p.y >= card.y - 20 && p.y <= card.y + card.size + 20;

  function choose(p: Point): void {
    if (state.clearedShare < OPEN_AT) return;
    const choice = state.choices.find((c) => !c.wrong && Math.hypot(c.x - p.x, c.y - p.y) <= state.choiceRadius + 12);
    if (!choice) return;
    choice.since = 0;
    if (choice.animal !== state.answer) {
      choice.wrong = true;
      events.push({ type: 'miss', x: choice.x, y: choice.y });
      return;
    }
    const points = state.clearedShare < SHARP ? 2 : 1;
    state.score += points;
    state.lastPoints = points;
    state.reveal = REVEAL_SECONDS;
    events.push({ type: 'score', x: card.x + card.size / 2, y: card.y + card.size / 2, points });
  }

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
      for (const c of state.choices) c.since += dt;
      if (state.reveal > 0) {
        state.reveal -= dt;
        if (state.reveal <= 0) {
          state.reveal = 0;
          deal();
        }
        state.last = null;
        return;
      }
      const p = input.pointer;
      if (p && onCard(p)) {
        scratch(state.last ?? p, p);
        state.last = p;
      } else state.last = null;
      for (const tap of input.taps) choose(tap);
    },
  };
}

/** Good play: rubs a winding path over the card until under a third shows, then picks the right animal. */
export function scratchBot(state: ScratchState, _context: BotContext): BotMove {
  if (state.reveal > 0) return {};
  const right = state.choices.find((c) => c.animal === state.answer);
  if (state.clearedShare >= 0.3 && right) return { tap: { x: right.x, y: right.y } };
  const { x, y, size } = state.card;
  const t = state.time;
  return { touch: { x: x + size / 2 + size * 0.36 * Math.sin(t * 2.3), y: y + size / 2 + size * 0.36 * Math.sin(t * 1.6 + 1) } };
}
