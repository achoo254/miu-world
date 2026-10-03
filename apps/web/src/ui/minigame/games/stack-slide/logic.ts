// Stack slide (like Stack): a new floor slides to and fro above the tower; a tap drops it. The part over the
// floor below stays, the part hanging over the edge is cut off and falls, so floors get narrower. Dropped
// right on top (nearly exactly), nothing is cut, and three of those in a row widen the floor again. A floor
// dropped completely beside the tower ends the round (the height stays). Every floor is a point; floors
// slide faster as the tower grows. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export interface Floor {
  x: number;
  w: number;
}

export interface Chip {
  x: number;
  w: number;
  /** World height of its floor, and how far it has fallen and turned. */
  level: number;
  fall: number;
  vy: number;
  spin: number;
}

export interface StackSlideState {
  /** Floors from the ground up (the first is the base). */
  floors: Floor[];
  /** The floor sliding above the tower. */
  slider: Floor;
  dir: number;
  speed: number;
  chips: Chip[];
  /** Exact drops in a row; seconds since the last exact drop (a flash). */
  streak: number;
  perfectAgo: number;
  /** Seconds since the slider fell beside the tower (the round ends). */
  fallen: number;
  /** Screen y of the ground for floor 0 when the camera has not moved; the camera follows the top. */
  groundY: number;
  camera: number;
  arenaWidth: number;
  score: number;
  time: number;
}

export const FLOOR_HEIGHT = 46;
const BASE_WIDTH = 260;
/** Within this many units of the floor below, a drop is exact. */
export const PERFECT = 12;
const GROW = 14;
const SPEED_START = 210;
const SPEED_END = 340;

export function createStackSlide({ arena, duration, params }: GameSetup): MinigameLogic<StackSlideState> {
  const factor = typeof params.speed === 'number' ? Math.min(1.5, Math.max(0.6, params.speed)) : 1;
  const events = eventQueue();
  const base = Math.min(BASE_WIDTH, arena.width * 0.45);
  const state: StackSlideState = {
    floors: [{ x: arena.width / 2, w: base }],
    slider: { x: base / 2 + 20, w: base },
    dir: 1,
    speed: SPEED_START * factor,
    chips: [],
    streak: 0,
    perfectAgo: 9,
    fallen: -1,
    groundY: arena.height - 70,
    camera: 0,
    arenaWidth: arena.width,
    score: 0,
    time: 0,
  };
  /** Screen y of the top of floor n. */
  const floorTop = (n: number): number => state.groundY - (n + 1) * FLOOR_HEIGHT + state.camera;
  const lowest = HUD_SAFE_TOP + 170;

  function drop(): void {
    const top = state.floors[state.floors.length - 1];
    if (!top) return;
    const s = state.slider;
    const level = state.floors.length;
    const offset = s.x - top.x;
    let placed: Floor | null;
    if (Math.abs(offset) <= PERFECT) {
      placed = { x: top.x, w: s.w };
      state.streak += 1;
      state.perfectAgo = 0;
      if (state.streak >= 3) placed.w = Math.min(base, placed.w + GROW);
    } else {
      state.streak = 0;
      const left = Math.max(s.x - s.w / 2, top.x - top.w / 2);
      const right = Math.min(s.x + s.w / 2, top.x + top.w / 2);
      placed = right - left > 1 ? { x: (left + right) / 2, w: right - left } : null;
      // The part over the edge falls.
      const chipLeft = offset > 0 ? Math.max(right, s.x - s.w / 2) : s.x - s.w / 2;
      const chipRight = offset > 0 ? s.x + s.w / 2 : Math.min(left, s.x + s.w / 2);
      if (chipRight - chipLeft > 1) state.chips.push({ x: (chipLeft + chipRight) / 2, w: chipRight - chipLeft, level, fall: 0, vy: 0, spin: 0 });
    }
    if (!placed) {
      state.fallen = 0;
      events.push({ type: 'hit', x: s.x, y: floorTop(level) });
      return;
    }
    state.floors.push(placed);
    state.score += 1;
    events.push({ type: 'score', x: placed.x, y: floorTop(level) });
    // The next floor comes in from the side, alternately.
    state.dir = level % 2 === 0 ? 1 : -1;
    state.slider = { x: state.dir > 0 ? placed.w / 2 + 10 : arena.width - placed.w / 2 - 10, w: placed.w };
    state.speed = (SPEED_START + (SPEED_END - SPEED_START) * Math.min(1, state.time / duration)) * factor;
  }

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.fallen >= 0.9;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.perfectAgo += dt;
      for (const c of state.chips) {
        c.vy += 1400 * dt;
        c.fall += c.vy * dt;
        c.spin += dt * 3;
      }
      state.chips = state.chips.filter((c) => c.fall < 900);
      // The camera rises so the top floor stays in view.
      const want = Math.max(0, lowest - floorTop(state.floors.length));
      state.camera += (want - state.camera) * Math.min(1, dt * 6);
      if (state.fallen >= 0) {
        state.fallen += dt;
        return;
      }
      const s = state.slider;
      s.x += state.dir * state.speed * dt;
      if (s.x > arena.width - s.w / 2 - 10) state.dir = -1;
      if (s.x < s.w / 2 + 10) state.dir = 1;
      if (input.taps.length > 0) drop();
    },
  };
}

/** Good play: drop when the slider is closest to the floor below (it will only drift away next time). */
export function stackSlideBot(state: StackSlideState, _context: BotContext): BotMove {
  const top = state.floors[state.floors.length - 1];
  if (!top || state.fallen >= 0) return {};
  const now = Math.abs(state.slider.x - top.x);
  let next = state.slider.x + state.dir * state.speed * 0.1;
  const max = state.arenaWidth - state.slider.w / 2 - 10;
  const min = state.slider.w / 2 + 10;
  if (next > max) next = 2 * max - next;
  if (next < min) next = 2 * min - next;
  const later = Math.abs(next - top.x);
  return now <= PERFECT || (later > now && now < state.slider.w * 0.45) ? { tap: { x: state.slider.x, y: 400 } } : {};
}
