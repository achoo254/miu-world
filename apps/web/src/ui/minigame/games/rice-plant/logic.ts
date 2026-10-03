// Rice plant: the child plants rice seedlings in a flooded paddy, stepping backwards, so the field slides past
// her. Faint marks in the mud come by evenly spaced; she taps when a mark reaches her hand (the ring) and the
// seedling stands straight on it: a point. A tap with no mark at the hand plants a crooked seedling (no point).
// Each seedling takes a moment to pick from the bundle, and the bundle holds a set number, so planting all the
// time empties it fast. The field speeds up a little as the round goes on. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export interface Plant {
  /** Position in field units (grows downward as the field slides). */
  y: number;
  straight: boolean;
}

export interface RicePlantState {
  /** How far the field has slid (units). */
  travel: number;
  /** Field position of the next mark, and those after it, every MARK_GAP. */
  marks: number[];
  plants: Plant[];
  /** Screen x of the planting column and y of the hand. */
  columnX: number;
  handY: number;
  bundle: number;
  /** Seconds before the hand holds the next seedling. */
  reach: number;
  lastPlant: 'straight' | 'crooked' | null;
  lastPlantAt: number;
  score: number;
  time: number;
}

export const MARK_GAP = 110;
/** Units either side of a mark that still plant straight. */
export const TOLERANCE = 18;
export const BUNDLE = 60;
const REACH_SECONDS = 0.4;
const SPEED_START = 120;
const SPEED_END = 175;

/** Screen y of something at field position `fieldY` (the field slides down as she steps back). */
export const screenY = (state: RicePlantState, fieldY: number): number => fieldY + state.travel;

export function createRicePlant({ arena, duration, params }: GameSetup): MinigameLogic<RicePlantState> {
  const pace = typeof params.speed === 'number' ? Math.min(1.4, Math.max(0.6, params.speed)) : 1;
  const events = eventQueue();
  const handY = HUD_SAFE_TOP + (arena.height - HUD_SAFE_TOP) * 0.42;
  const columnX = arena.width / 2 + 40;
  // The first mark reaches the hand after about a second and a half.
  const first = handY - SPEED_START * pace * 1.5;
  const state: RicePlantState = {
    travel: 0,
    marks: Array.from({ length: 12 }, (_, i) => first - i * MARK_GAP),
    plants: [],
    columnX,
    handY,
    bundle: BUNDLE,
    reach: 0,
    lastPlant: null,
    lastPlantAt: -9,
    score: 0,
    time: 0,
  };

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.bundle <= 0 && state.reach <= 0;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.reach = Math.max(0, state.reach - dt);
      const speed = (SPEED_START + (SPEED_END - SPEED_START) * Math.min(1, state.time / duration)) * pace;
      state.travel += speed * dt;
      // Marks that slid past the hand unplanted are just mud; keep a dozen ahead.
      state.marks = state.marks.filter((m) => screenY(state, m) < handY + TOLERANCE + 1);
      while (state.marks.length < 12) state.marks.push((state.marks[state.marks.length - 1] ?? -state.travel) - MARK_GAP);
      state.plants = state.plants.filter((p) => screenY(state, p.y) < arena.height + 80);

      if (input.taps.length === 0 || state.reach > 0 || state.bundle <= 0) return;
      state.bundle -= 1;
      state.reach = REACH_SECONDS;
      state.lastPlantAt = state.time;
      const handField = handY - state.travel;
      const mark = state.marks.find((m) => Math.abs(m - handField) <= TOLERANCE);
      if (mark !== undefined) {
        state.marks = state.marks.filter((m) => m !== mark);
        state.plants.push({ y: mark, straight: true });
        state.score += 1;
        state.lastPlant = 'straight';
        events.push({ type: 'score', x: columnX, y: handY - 30 });
      } else {
        state.plants.push({ y: handField, straight: false });
        state.lastPlant = 'crooked';
        events.push({ type: 'miss', x: columnX, y: handY });
      }
    },
  };
}

/** Good play: taps as a mark is about to reach the hand. */
export function ricePlantBot(state: RicePlantState, _context: BotContext): BotMove {
  if (state.reach > 0) return {};
  const handField = state.handY - state.travel;
  // The tap lands on the next step; the field moves under 3 units a step.
  const near = state.marks.some((m) => m - handField >= -TOLERANCE * 0.6 && m - handField <= TOLERANCE * 0.5);
  return near ? { tap: { x: state.columnX, y: state.handY } } : {};
}
