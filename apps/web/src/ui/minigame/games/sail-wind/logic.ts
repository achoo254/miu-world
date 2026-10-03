// Sail with the wind: a little sailing boat steers itself toward the next buoy (zigzagging when the buoy lies
// upwind), but its sail is the child's job. She drags anywhere: the sail's boom swings toward her finger. The
// wind (a big arrow) pushes on the sail, and only the push along the boat's way moves it: a sail set across
// the wind and the course fills and the boat speeds along; a sail along the wind flaps and the boat stops.
// Every buoy reached is a point. The wind turns now and then. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface SailState {
  boat: Point & { heading: number; speed: number };
  /** Boom angle from the stern (-π/2 … π/2). */
  boom: number;
  /** Direction the wind blows toward (radians). */
  wind: number;
  windChangeIn: number;
  buoy: Point;
  /** How well the sail draws now (0–1), for the picture. */
  drive: number;
  area: { x: number; y: number; w: number; h: number };
  /** Seconds since the last buoy was reached. */
  reachedAgo: number;
  score: number;
  time: number;
}

const MAX_SPEED = 170;
const TURN_RATE = 2;
/** The boat cannot sail closer to the wind than this; it zigzags instead. */
const CLOSE_HAULED = (50 * Math.PI) / 180;
export const REACH = 60;

const wrap = (a: number): number => a - Math.round(a / (Math.PI * 2)) * Math.PI * 2;

/** Push along the boat's way (0–1) from a wind toward `wind`, a boat heading `heading` and a boom at `boom`. */
export function driveFor(wind: number, heading: number, boom: number): number {
  const boomDir = heading + Math.PI + boom;
  // The sail's face: square to the boom, turned to face the wind.
  let nx = -Math.sin(boomDir);
  let ny = Math.cos(boomDir);
  const wx = Math.cos(wind);
  const wy = Math.sin(wind);
  let push = wx * nx + wy * ny;
  if (push < 0) {
    nx = -nx;
    ny = -ny;
    push = -push;
  }
  return Math.max(0, push * (nx * Math.cos(heading) + ny * Math.sin(heading)));
}

/** The best boom for this wind and heading (what a good sailor sets). */
export function bestBoom(wind: number, heading: number): number {
  let best = 0;
  let bestDrive = -1;
  for (let b = -Math.PI / 2; b <= Math.PI / 2 + 1e-9; b += 0.05) {
    const d = driveFor(wind, heading, b);
    if (d > bestDrive) {
      best = b;
      bestDrive = d;
    }
  }
  return best;
}

export function createSailWind({ arena, rng }: GameSetup): MinigameLogic<SailState> {
  const events = eventQueue();
  const area = { x: 60, y: HUD_SAFE_TOP + 70, w: arena.width - 120, h: arena.height - HUD_SAFE_TOP - 130 };
  const state: SailState = {
    boat: { x: area.x + area.w / 2, y: area.y + area.h * 0.8, heading: -Math.PI / 2, speed: 0 },
    boom: 0,
    wind: rng.range(0, Math.PI * 2),
    windChangeIn: 9,
    buoy: { x: 0, y: 0 },
    drive: 0,
    area,
    reachedAgo: 9,
    score: 0,
    time: 0,
  };

  function placeBuoy(r: Rng): void {
    for (let k = 0; k < 50; k += 1) {
      const p = { x: area.x + r.range(0, area.w), y: area.y + r.range(0, area.h) };
      if (Math.hypot(p.x - state.boat.x, p.y - state.boat.y) >= Math.min(260, Math.min(area.w, area.h) * 0.6)) {
        state.buoy = p;
        return;
      }
    }
    state.buoy = { x: area.x + area.w - state.boat.x + area.x, y: area.y + area.h - state.boat.y + area.y };
  }
  placeBuoy(rng);

  /** The course: straight at the buoy, or the nearer zigzag leg when the buoy lies upwind. */
  function course(): number {
    const bearing = Math.atan2(state.buoy.y - state.boat.y, state.buoy.x - state.boat.x);
    const upwind = state.wind + Math.PI;
    const off = wrap(bearing - upwind);
    if (Math.abs(off) >= CLOSE_HAULED) return bearing;
    return upwind + (off >= 0 ? CLOSE_HAULED : -CLOSE_HAULED);
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
      state.reachedAgo += dt;
      state.windChangeIn -= dt;
      if (state.windChangeIn <= 0) {
        state.wind += (rng.chance(0.5) ? 1 : -1) * rng.range(1, 2);
        state.windChangeIn = rng.range(8, 11);
        events.push({ type: 'action', x: 80, y: HUD_SAFE_TOP + 40, note: 70, voice: 'whistle' });
      }
      const { boat } = state;
      if (input.pointer) {
        const toFinger = Math.atan2(input.pointer.y - boat.y, input.pointer.x - boat.x);
        state.boom = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, wrap(toFinger - (boat.heading + Math.PI))));
      }
      const turn = wrap(course() - boat.heading);
      boat.heading += Math.max(-TURN_RATE * dt, Math.min(TURN_RATE * dt, turn));
      state.drive = driveFor(state.wind, boat.heading, state.boom);
      boat.speed += (state.drive * MAX_SPEED - boat.speed) * Math.min(1, dt * 2);
      boat.x = Math.min(state.area.x + state.area.w, Math.max(state.area.x, boat.x + Math.cos(boat.heading) * boat.speed * dt));
      boat.y = Math.min(state.area.y + state.area.h, Math.max(state.area.y, boat.y + Math.sin(boat.heading) * boat.speed * dt));
      if (Math.hypot(state.buoy.x - boat.x, state.buoy.y - boat.y) <= REACH) {
        state.score += 1;
        state.reachedAgo = 0;
        events.push({ type: 'score', x: state.buoy.x, y: state.buoy.y, note: 79, voice: 'bell' });
        placeBuoy(rng);
      }
    },
  };
}

/** Good play: sets the boom where it draws best, holding the finger out along it. */
export function sailWindBot(state: SailState, _context: BotContext): BotMove {
  const { boat } = state;
  const boom = bestBoom(state.wind, boat.heading);
  const a = boat.heading + Math.PI + boom;
  return { touch: { x: boat.x + Math.cos(a) * 130, y: boat.y + Math.sin(a) * 130 } };
}
