// Frisbee dog: a puppy runs to and fro across the park. The child swipes up from her spot to throw the disc:
// the swipe's direction and length set where it comes down (a curved swipe makes it swoop on the way), and it
// takes a moment to fly, so it must be thrown to where the puppy is going. The puppy leaps for a disc landing
// close to it (a point), and catches one thrown right to where it was going without a dash (two points).
// Twelve discs a round. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const DISCS = 12;
/** A disc landing this close to the puppy is caught. */
export const CATCH = 72;
/** Thrown this close to where the puppy was going: caught without a dash, two points. */
export const BULLSEYE = 40;
/** Throw distance per unit of swipe, and the shortest and longest throws. */
export const THROW_GAIN = 2.6;
const MIN_THROW = 140;
const READY_SECONDS = 0.6;
const CHASE_SECONDS = 0.4;
const CHASE_SPEED = 220;

export interface Disc {
  from: Point;
  to: Point;
  /** Sideways swoop (share of the throw's length, + to the right of the way it flies). */
  curve: number;
  /** Seconds in the air so far, and how long it flies. */
  t: number;
  flight: number;
  result: 'flying' | 'caught' | 'missed';
  endedAt: number;
  /** How far from where the puppy was running to the landing spot, measured as the dash began (-1 before). */
  gap: number;
}

export interface FrisbeeState {
  thrower: Point;
  dog: Point;
  dogDir: number;
  dogSpeed: number;
  disc: Disc | null;
  thrown: number;
  readyAt: number;
  /** The finger's way since it went down (for a curved swipe). */
  path: Point[];
  maxThrow: number;
  bounds: { left: number; right: number };
  score: number;
  time: number;
}

export const flightTime = (distance: number): number => 0.45 + distance / 700;

/** Where the puppy will be after `seconds`, running and turning at the edges (no chasing). */
export function dogAfter(state: Pick<FrisbeeState, 'dog' | 'dogDir' | 'dogSpeed' | 'bounds'>, seconds: number): Point {
  const { left, right } = state.bounds;
  const span = right - left;
  let x = state.dog.x - left + state.dogDir * state.dogSpeed * seconds;
  // Unfold the bounces.
  const period = span * 2;
  x = ((x % period) + period) % period;
  if (x > span) x = period - x;
  return { x: left + x, y: state.dog.y };
}

/** Signed sideways bend of a finger's way, as a share of its length. */
export function curveOf(path: readonly Point[]): number {
  const a = path[0];
  const b = path[path.length - 1];
  if (!a || !b) return 0;
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  if (len < 1) return 0;
  let most = 0;
  for (const p of path) {
    const cross = ((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)) / len;
    if (Math.abs(cross) > Math.abs(most)) most = cross;
  }
  return Math.max(-0.5, Math.min(0.5, most / len));
}

export function createFrisbeeDog({ arena, rng }: GameSetup): MinigameLogic<FrisbeeState> {
  const events = eventQueue();
  const thrower = { x: arena.width / 2, y: arena.height - 90 };
  const bounds = { left: 60, right: arena.width - 60 };
  const maxThrow = Math.hypot(arena.width / 2, thrower.y - HUD_SAFE_TOP);
  const state: FrisbeeState = {
    thrower,
    dog: { x: arena.width * 0.3, y: 0 },
    dogDir: 1,
    dogSpeed: 180,
    disc: null,
    thrown: 0,
    readyAt: 0.3,
    path: [],
    maxThrow,
    bounds,
    score: 0,
    time: 0,
  };

  const newRun = (r: Rng): void => {
    // A new lane across the park each throw: nearer or further, slower or quicker.
    const near = thrower.y - 170;
    const far = Math.max(HUD_SAFE_TOP + 80, thrower.y - 560);
    state.dog.y = r.range(far, Math.max(far + 1, near));
    state.dogSpeed = r.range(150, 230) + state.thrown * 4;
    if (r.chance(0.35)) state.dogDir = -state.dogDir;
  };
  newRun(rng);

  const throwDisc = (dx: number, dy: number, curve: number): void => {
    if (state.disc || state.time < state.readyAt || state.thrown >= DISCS) return;
    const len = Math.hypot(dx, dy);
    if (dy > -30 || len < 40) return;
    const distance = Math.min(maxThrow, Math.max(MIN_THROW, len * THROW_GAIN));
    const to = { x: Math.min(arena.width - 20, Math.max(20, thrower.x + (dx / len) * distance)), y: Math.max(HUD_SAFE_TOP + 20, thrower.y + (dy / len) * distance) };
    state.disc = { from: { ...thrower }, to, curve, t: 0, flight: flightTime(distance), result: 'flying', endedAt: 0, gap: -1 };
    state.thrown += 1;
    events.push({ type: 'action', x: thrower.x, y: thrower.y - 40 });
  };

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.thrown >= DISCS && state.disc === null;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      // The puppy runs (and turns at the edges); near a landing disc it dashes for it.
      const disc = state.disc;
      const chasing = disc && disc.result === 'flying' && disc.flight - disc.t <= CHASE_SECONDS && Math.hypot(disc.to.x - state.dog.x, disc.to.y - state.dog.y) < CATCH * 2.2;
      if (chasing && disc) {
        if (disc.gap < 0) {
          const own = dogAfter(state, disc.flight - disc.t);
          disc.gap = Math.hypot(disc.to.x - own.x, disc.to.y - own.y);
        }
        const dx = disc.to.x - state.dog.x;
        const dy = disc.to.y - state.dog.y;
        const d = Math.hypot(dx, dy);
        const step = Math.min(d, CHASE_SPEED * dt);
        if (d > 0) {
          state.dog.x += (dx / d) * step;
          state.dog.y += (dy / d) * step;
        }
      } else if (!disc || disc.result === 'flying') {
        state.dog.x += state.dogDir * state.dogSpeed * dt;
        if (state.dog.x < bounds.left || state.dog.x > bounds.right) {
          state.dogDir = -state.dogDir;
          state.dog.x = Math.min(bounds.right, Math.max(bounds.left, state.dog.x));
        }
      }

      if (disc) {
        if (disc.result === 'flying') {
          disc.t += dt;
          if (disc.t >= disc.flight) {
            disc.t = disc.flight;
            disc.endedAt = state.time;
            if (Math.hypot(disc.to.x - state.dog.x, disc.to.y - state.dog.y) <= CATCH) {
              disc.result = 'caught';
              const points = disc.gap >= 0 && disc.gap <= BULLSEYE ? 2 : 1;
              state.score += points;
              events.push({ type: 'score', x: disc.to.x, y: disc.to.y, points });
            } else {
              disc.result = 'missed';
              events.push({ type: 'miss', x: disc.to.x, y: disc.to.y });
            }
          }
        } else if (state.time - disc.endedAt >= READY_SECONDS) {
          state.disc = null;
          state.readyAt = state.time;
          newRun(rng);
        }
      }

      // A throw: a quick swipe, or a slower drag let go.
      const swipe = input.swipes[0];
      if (input.pressed && input.pointer) state.path = [input.pointer];
      else if (input.pointer && state.path.length > 0) state.path.push(input.pointer);
      if (swipe) {
        throwDisc(swipe.dx, swipe.dy, state.path.length > 2 ? curveOf(state.path) : 0);
        state.path = [];
      } else if (input.released && state.path.length > 1) {
        const a = state.path[0];
        const b = state.path[state.path.length - 1];
        if (a && b) throwDisc(b.x - a.x, b.y - a.y, curveOf(state.path));
        state.path = [];
      } else if (input.released) state.path = [];
    },
  };
}

/** Good play: leads the puppy, aiming where it will be when the disc comes down. */
export function frisbeeBot(state: FrisbeeState, _context: BotContext): BotMove {
  if (state.disc || state.time < state.readyAt + 0.15) return {};
  let target = state.dog;
  for (let k = 0; k < 4; k += 1) {
    const distance = Math.min(state.maxThrow, Math.max(MIN_THROW, Math.hypot(target.x - state.thrower.x, target.y - state.thrower.y)));
    target = dogAfter(state, flightTime(distance) + 1 / 60);
  }
  const dx = target.x - state.thrower.x;
  const dy = target.y - state.thrower.y;
  const len = Math.hypot(dx, dy);
  const swipe = Math.max(MIN_THROW, len) / THROW_GAIN;
  return { swipe: { from: { x: state.thrower.x, y: state.thrower.y + 40 }, dx: (dx / len) * swipe, dy: (dy / len) * swipe } };
}
