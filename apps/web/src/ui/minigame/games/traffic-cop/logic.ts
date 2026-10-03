// Traffic cop: cars come to a crossroads from all four sides and stop at the line. The child taps a waiting
// car (or any car in its queue) to wave the front one across. Cars from the left and right must not cross
// while cars from above and below are in the middle, or they bump: one of three hearts. A car that waits too
// long honks, then goes on its own (no point for that one), so leaving the crossing alone soon ends in bumps.
// Every car the child waves across is a point; more cars come as the round goes on. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type Arena, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

/** Where a car comes from: n drives down from the top, s up from the bottom, w right from the left, e left. */
export type Arm = 'n' | 's' | 'w' | 'e';
export const ARMS: readonly Arm[] = ['n', 's', 'w', 'e'];
export type CarKind = 'car' | 'bus';
export type CarPhase = 'approach' | 'waiting' | 'go' | 'crashed';

export interface Car {
  id: number;
  arm: Arm;
  kind: CarKind;
  colour: number;
  /** Distance travelled from where it appeared. */
  s: number;
  speed: number;
  phase: CarPhase;
  /** Seconds spent at the line. */
  waited: number;
  /** Seconds since it crashed. */
  crashedAgo: number;
  counted: boolean;
  /** The child waved it across (a car that left on its own scores nothing). */
  waved: boolean;
}

export interface TrafficState {
  centre: Point;
  road: number;
  /** Distance along each arm from where cars appear to the stop line. */
  stopAt: Record<Arm, number>;
  cars: Car[];
  lives: number;
  score: number;
  time: number;
}

export const CAR_LENGTH: Record<CarKind, number> = { car: 72, bus: 112 };
export const CAR_WIDTH = 44;
const GAP = 22;
/** The stop line is this far before the crossing's edge (behind the zebra crossing). */
const LINE_GAP = 44;
const APPROACH_SPEED = 230;
const GO_SPEED = 330;
/** A waiting car honks after HONK seconds and drives off by itself after LEAVE. */
export const HONK = 5;
export const LEAVE = 7;
const LIVES = 3;
/** Cars a second at the start and at the end of the round. */
const RATE_START = 0.55;
const RATE_END = 0.95;
/** A tap this close to a car of an arm waves that arm's front car. */
export const TAP_REACH = 80;

const vertical = (arm: Arm): boolean => arm === 'n' || arm === 's';

/** Where a car is on screen and which way it faces (radians, 0 = to the right). */
export function carPose(state: TrafficState, car: Car): { x: number; y: number; angle: number } {
  const { centre, road, stopAt } = state;
  const lane = road / 4;
  const fromLine = car.s - stopAt[car.arm];
  // Distance from the centre along its way (negative before the middle).
  const d = fromLine - road / 2 - LINE_GAP;
  switch (car.arm) {
    case 'n':
      return { x: centre.x - lane, y: centre.y + d, angle: Math.PI / 2 };
    case 's':
      return { x: centre.x + lane, y: centre.y - d, angle: -Math.PI / 2 };
    case 'w':
      return { x: centre.x + d, y: centre.y + lane, angle: 0 };
    case 'e':
      return { x: centre.x - d, y: centre.y - lane, angle: Math.PI };
  }
}

/** The car's front is past the stop line, and its back has not yet left the crossing. */
export const inCrossing = (state: TrafficState, car: Car): boolean => {
  const fromLine = car.s - state.stopAt[car.arm];
  return fromLine > 0 && fromLine - CAR_LENGTH[car.kind] < state.road + LINE_GAP * 2;
};

function layout(arena: Arena): Pick<TrafficState, 'centre' | 'road' | 'stopAt'> {
  const top = HUD_SAFE_TOP + 10;
  const centre = { x: arena.width / 2, y: top + (arena.height - top) / 2 };
  const road = 170;
  const toLine = (span: number): number => span - road / 2 - LINE_GAP + 60;
  return { centre, road, stopAt: { n: toLine(centre.y - top + 40), s: toLine(arena.height - centre.y), w: toLine(centre.x), e: toLine(arena.width - centre.x) } };
}

export function createTrafficCop({ arena, duration, params, rng }: GameSetup): MinigameLogic<TrafficState> {
  const factor = typeof params.traffic === 'number' ? Math.min(1.5, Math.max(0.6, params.traffic)) : 1;
  const events = eventQueue();
  const state: TrafficState = { ...layout(arena), cars: [], lives: LIVES, score: 0, time: 0 };
  let nextId = 1;
  let nextSpawn = 0.6;

  const spawn = (r: Rng): void => {
    const arm = r.pick(ARMS as [Arm, ...Arm[]]);
    const last = state.cars.filter((c) => c.arm === arm && c.phase !== 'go').sort((a, b) => a.s - b.s)[0];
    // The queue reaches back to where cars appear: this one waits round the corner.
    if (last && last.s < CAR_LENGTH[last.kind] + GAP + 10) return;
    state.cars.push({ id: nextId, arm, kind: r.chance(0.2) ? 'bus' : 'car', colour: r.int(0, 3), s: 0, speed: APPROACH_SPEED, phase: 'approach', waited: 0, crashedAgo: 0, counted: false, waved: false });
    nextId += 1;
  };

  /** The first car of an arm that has not been waved across yet. */
  const frontOf = (arm: Arm): Car | undefined =>
    state.cars.filter((c) => c.arm === arm && (c.phase === 'approach' || c.phase === 'waiting')).sort((a, b) => b.s - a.s)[0];

  const wave = (car: Car, byChild: boolean): void => {
    car.phase = 'go';
    car.waved = byChild;
    const pose = carPose(state, car);
    events.push({ type: 'action', x: pose.x, y: pose.y });
  };

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.lives <= 0;
    },
    get lives() {
      return state.lives;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      const progress = Math.min(1, state.time / duration);
      nextSpawn -= dt;
      if (nextSpawn <= 0) {
        spawn(rng);
        nextSpawn += rng.range(0.6, 1.4) / ((RATE_START + (RATE_END - RATE_START) * progress) * factor);
      }

      const press = input.pressed ? (input.pointer ?? input.taps[0] ?? null) : null;
      if (press) {
        let best: Car | undefined;
        let bestDistance = TAP_REACH;
        for (const car of state.cars) {
          if (car.phase === 'go' || car.phase === 'crashed') continue;
          const pose = carPose(state, car);
          const d = Math.hypot(pose.x - press.x, pose.y - press.y);
          if (d < bestDistance) {
            bestDistance = d;
            best = car;
          }
        }
        const front = best ? frontOf(best.arm) : undefined;
        if (front) wave(front, true);
      }

      // Movement: queued cars close up behind the one ahead and stop at the line; waved cars drive on.
      for (const arm of ARMS) {
        const lane = state.cars.filter((c) => c.arm === arm).sort((a, b) => b.s - a.s);
        let limit = Infinity;
        for (const car of lane) {
          if (car.phase === 'crashed') {
            car.crashedAgo += dt;
            limit = car.s - CAR_LENGTH[car.kind] - GAP;
            continue;
          }
          if (car.phase === 'go') {
            car.speed = Math.min(GO_SPEED, car.speed + 500 * dt);
            car.s += car.speed * dt;
            limit = car.s - CAR_LENGTH[car.kind] - GAP;
            continue;
          }
          const stop = Math.min(state.stopAt[arm], limit);
          car.s = Math.min(stop, car.s + APPROACH_SPEED * dt);
          const atLine = car.s >= state.stopAt[arm] - 0.5;
          car.phase = atLine ? 'waiting' : 'approach';
          if (atLine) {
            car.waited += dt;
            if (car.waited >= LEAVE) wave(car, false);
          }
          limit = car.s - CAR_LENGTH[car.kind] - GAP;
        }
      }

      // Bumps: a car crossing one way meets a car crossing the other way.
      const crossing = state.cars.filter((c) => c.phase === 'go' && inCrossing(state, c));
      for (const a of crossing) {
        for (const b of crossing) {
          if (a.id >= b.id || vertical(a.arm) === vertical(b.arm) || a.phase !== 'go' || b.phase !== 'go') continue;
          const pa = carPose(state, a);
          const pb = carPose(state, b);
          const reachA = vertical(a.arm) ? { x: CAR_WIDTH / 2, y: CAR_LENGTH[a.kind] / 2 } : { x: CAR_LENGTH[a.kind] / 2, y: CAR_WIDTH / 2 };
          const reachB = vertical(b.arm) ? { x: CAR_WIDTH / 2, y: CAR_LENGTH[b.kind] / 2 } : { x: CAR_LENGTH[b.kind] / 2, y: CAR_WIDTH / 2 };
          const centreOf = (car: Car, pose: { x: number; y: number; angle: number }): Point => ({ x: pose.x - (Math.cos(pose.angle) * CAR_LENGTH[car.kind]) / 2, y: pose.y - (Math.sin(pose.angle) * CAR_LENGTH[car.kind]) / 2 });
          const ca = centreOf(a, pa);
          const cb = centreOf(b, pb);
          if (Math.abs(ca.x - cb.x) < reachA.x + reachB.x - 6 && Math.abs(ca.y - cb.y) < reachA.y + reachB.y - 6) {
            a.phase = 'crashed';
            b.phase = 'crashed';
            state.lives -= 1;
            events.push({ type: 'hit', x: (ca.x + cb.x) / 2, y: (ca.y + cb.y) / 2 });
          }
        }
      }

      // Across: a point; gone: off the list. Bumped cars are towed away after a moment.
      for (const car of state.cars) {
        if (car.phase === 'go' && !car.counted && car.s - state.stopAt[car.arm] - CAR_LENGTH[car.kind] > state.road + LINE_GAP * 2) {
          car.counted = true;
          if (car.waved) {
            state.score += 1;
            const pose = carPose(state, car);
            events.push({ type: 'score', x: pose.x, y: pose.y });
          }
        }
      }
      state.cars = state.cars.filter((c) => (c.phase === 'crashed' ? c.crashedAgo < 1.2 : c.s < state.stopAt[c.arm] * 2 + state.road + 200));
    },
  };
}

/** Good play: wave the longest-waiting front car whose way across is clear of crossing traffic. */
export function trafficCopBot(state: TrafficState, _context: BotContext): BotMove {
  const busy = (arm: Arm): boolean =>
    state.cars.some((c) => c.phase === 'crashed' || (c.phase === 'go' && vertical(c.arm) !== vertical(arm) && c.s - state.stopAt[c.arm] - CAR_LENGTH[c.kind] < state.road + LINE_GAP * 2 + 12));
  const ready = state.cars
    .filter((c) => c.phase === 'waiting' && !busy(c.arm))
    .filter((c) => !state.cars.some((o) => o.arm === c.arm && o.phase === 'waiting' && o.s > c.s))
    .sort((a, b) => b.waited - a.waited);
  // Cars from the other direction also waiting at their line: only one direction at a time.
  const first = ready[0];
  if (!first) return {};
  const pose = carPose(state, first);
  return { tap: { x: pose.x, y: pose.y } };
}
