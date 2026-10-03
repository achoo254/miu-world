// Archery in the wind: a target stands across the field; the wind blows a different way and strength for each
// arrow (a big arrow and drifting leaves show it). The child puts a finger down to draw the bow (the aim ring
// appears on the target's centre), slides the finger to move the ring, and lifts it to shoot. The arrow flies
// for half a second and the wind carries it sideways, so a good archer aims upwind. Rings score 10, 8, 6, 4, 2
// from the middle out; arrows stay in the target. Eight arrows a round. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface Arrow {
  from: Point;
  /** Where it was aimed, and where the wind takes it. */
  aim: Point;
  to: Point;
  t: number;
  points: number;
}

export interface ArcheryState {
  target: Point;
  /** The target's outer radius; rings are fifths of it. */
  radius: number;
  bow: Point;
  /** -1 … 1: wind to the left or right, for the arrow being drawn now. */
  wind: number;
  /** Where the finger went down, while the bow is drawn. */
  drawFrom: Point | null;
  /** Seconds the bow has been drawn. */
  drawTime: number;
  aim: Point;
  arrow: Arrow | null;
  /** Arrows that landed: in the target or in the grass behind (0 points). */
  stuck: Arrow[];
  arrowsLeft: number;
  /** Seconds since the last arrow landed (the next one is ready after a beat). */
  restAgo: number;
  /** The last result to show ("10!", "Gió mạnh quá!"). */
  lastPoints: number | null;
  score: number;
  time: number;
}

export const ARROWS = 8;
export const FLIGHT_SECONDS = 0.5;
const REST_SECONDS = 0.6;
/** A touch shorter than this does not shoot (a bow needs drawing). */
const MIN_DRAW = 0.18;
/** How far the strongest wind carries an arrow, in target radii. */
export const WIND_DRIFT = 1.25;
export const RING_POINTS = [10, 8, 6, 4, 2] as const;

/** Points for an arrow landing `distance` from the centre of a target of this radius. */
export function ringPoints(distance: number, radius: number): number {
  const ring = Math.floor((distance / radius) * 5);
  return RING_POINTS[ring] ?? 0;
}

export function createArchery({ arena, params, rng }: GameSetup): MinigameLogic<ArcheryState> {
  const factor = typeof params.wind === 'number' ? Math.min(1.5, Math.max(0.3, params.wind)) : 1;
  const events = eventQueue();
  const below = arena.height - HUD_SAFE_TOP;
  const radius = Math.min(arena.width * 0.36, arena.height * 0.25, 205);
  const target = { x: arena.width / 2, y: HUD_SAFE_TOP + (arena.width > arena.height ? below * 0.36 : Math.max(radius + 120, below * 0.3)) };
  const newWind = (): number => (rng.chance(0.5) ? -1 : 1) * rng.range(0.35, 1) * factor;
  const state: ArcheryState = {
    target,
    radius,
    bow: { x: arena.width / 2, y: arena.height - 95 },
    wind: newWind(),
    drawFrom: null,
    drawTime: 0,
    aim: { ...target },
    arrow: null,
    stuck: [],
    arrowsLeft: ARROWS,
    restAgo: 9,
    lastPoints: null,
    score: 0,
    time: 0,
  };
  const ready = (): boolean => state.arrow === null && state.arrowsLeft > 0 && state.restAgo >= REST_SECONDS;
  const aimFor = (from: Point, finger: Point): Point => ({
    x: Math.min(arena.width - 20, Math.max(20, target.x + (finger.x - from.x) * 1.1)),
    y: Math.min(arena.height - 160, Math.max(HUD_SAFE_TOP + 10, target.y + (finger.y - from.y) * 1.1)),
  });

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.arrowsLeft <= 0 && state.arrow === null && state.restAgo >= REST_SECONDS + 0.4;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.restAgo += dt;
      if (ready()) {
        if (!state.drawFrom && input.pointer) {
          state.drawFrom = input.pointer;
          state.drawTime = 0;
          state.aim = { ...target };
        }
        if (state.drawFrom && input.pointer) {
          state.drawTime += dt;
          state.aim = aimFor(state.drawFrom, input.pointer);
        }
        if (state.drawFrom && !input.pointer) {
          if (state.drawTime >= MIN_DRAW) {
            const to = { x: state.aim.x + state.wind * WIND_DRIFT * radius, y: state.aim.y };
            state.arrow = { from: { ...state.bow }, aim: { ...state.aim }, to, t: 0, points: 0 };
            state.arrowsLeft -= 1;
            events.push({ type: 'action', x: state.bow.x, y: state.bow.y - 40 });
          }
          state.drawFrom = null;
          state.drawTime = 0;
        }
      } else if (!input.pointer) state.drawFrom = null;

      const arrow = state.arrow;
      if (arrow) {
        arrow.t += dt;
        if (arrow.t >= FLIGHT_SECONDS) {
          arrow.points = ringPoints(Math.hypot(arrow.to.x - target.x, arrow.to.y - target.y), radius);
          state.stuck.push(arrow);
          state.arrow = null;
          state.restAgo = 0;
          state.lastPoints = arrow.points;
          if (arrow.points > 0) {
            state.score += arrow.points;
            events.push({ type: 'score', x: arrow.to.x, y: arrow.to.y, points: arrow.points, ...(arrow.points === 10 ? { note: 84, voice: 'bell' as const } : {}) });
          } else events.push({ type: 'miss', x: arrow.to.x, y: arrow.to.y });
          if (state.arrowsLeft > 0) state.wind = newWind();
        }
      }
    },
  };
}

/** Good play: wait for the next arrow, put a finger down below, slide it upwind of the centre, hold, let go. */
export function archeryBot(state: ArcheryState, _context: BotContext): BotMove {
  if (state.arrow || state.arrowsLeft <= 0 || state.restAgo < 0.9) return {};
  const from = { x: state.bow.x, y: state.bow.y };
  if (!state.drawFrom) return { touch: from };
  // Leans into the wind a little short of exactly, as a child would.
  if (state.drawTime < 0.5) return { touch: { x: from.x - (0.9 * state.wind * WIND_DRIFT * state.radius) / 1.1, y: from.y - 8 } };
  return {};
}
