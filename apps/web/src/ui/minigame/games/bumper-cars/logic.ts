// Bumper cars: a round floor at the fair. The child's car drives toward her finger; three other cars wander
// and now and then come for her. Cars bounce off each other; a car pushed off the edge of the floor leaves it
// for a moment. Every other car she knocks off is a point (it comes back after two seconds); if she goes off
// herself, she drives back on after two seconds. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface Car extends Point {
  vx: number;
  vy: number;
  mine: boolean;
  /** Seconds off the floor (it comes back after BACK_SECONDS), or -1 on it. */
  out: number;
  /** When the child's car last bumped it. */
  bumpedAt: number;
  /** Where a wandering car is heading. */
  aim: Point;
  colour: number;
}

export interface BumperState {
  cars: Car[];
  centre: Point;
  radius: number;
  score: number;
  time: number;
}

export const CAR_R = 34;
const BACK_SECONDS = 2;
const MY_SPEED = 400;
const THEIR_SPEED = 230;
const MY_MASS = 1.7;
const CREDIT_SECONDS = 1.5;

export function createBumperCars({ arena, rng }: GameSetup): MinigameLogic<BumperState> {
  const events = eventQueue();
  // The same floor on every screen, so a push carries as far.
  const radius = Math.min(225, Math.min(arena.width - 60, arena.height - HUD_SAFE_TOP - 60) / 2);
  const centre = { x: arena.width / 2, y: HUD_SAFE_TOP + 20 + (arena.height - HUD_SAFE_TOP - 20) / 2 };
  const onFloor = (r: Rng, far: Point | null): Point => {
    for (let i = 0; i < 20; i += 1) {
      const a = r.range(0, Math.PI * 2);
      const d = r.range(0, radius * 0.6);
      const p = { x: centre.x + Math.cos(a) * d, y: centre.y + Math.sin(a) * d };
      if (!far || Math.hypot(p.x - far.x, p.y - far.y) > CAR_R * 4) return p;
    }
    return { ...centre };
  };
  const me: Car = { ...centre, vx: 0, vy: 0, mine: true, out: -1, bumpedAt: -9, aim: centre, colour: 0 };
  const state: BumperState = { cars: [me], centre, radius, score: 0, time: 0 };
  for (let i = 0; i < 3; i += 1) {
    const p = onFloor(rng, me);
    state.cars.push({ ...p, vx: 0, vy: 0, mine: false, out: -1, bumpedAt: -9, aim: onFloor(rng, null), colour: i + 1 });
  }

  function steer(car: Car, target: Point, speed: number, rate: number, dt: number): void {
    const dx = target.x - car.x;
    const dy = target.y - car.y;
    const d = Math.hypot(dx, dy);
    const want = Math.min(speed, d * 4);
    const k = Math.min(1, rate * dt);
    car.vx += ((d > 0 ? (dx / d) * want : 0) - car.vx) * k;
    car.vy += ((d > 0 ? (dy / d) * want : 0) - car.vy) * k;
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
      for (const car of state.cars) {
        if (car.out >= 0) {
          car.out += dt;
          if (car.out >= BACK_SECONDS) {
            Object.assign(car, onFloor(rng, car.mine ? null : me), { vx: 0, vy: 0, out: -1 });
          }
          continue;
        }
        if (car.mine) {
          const target = input.pointer ?? input.taps.at(-1) ?? null;
          if (target) steer(car, target, MY_SPEED, 5, dt);
          else {
            car.vx *= 1 - Math.min(1, dt * 2);
            car.vy *= 1 - Math.min(1, dt * 2);
          }
        } else {
          if (Math.hypot(car.aim.x - car.x, car.aim.y - car.y) < 40 || rng.chance(dt * 0.4)) {
            // Now and then it goes for the child's car.
            car.aim = me.out < 0 && rng.chance(0.35) ? { x: me.x, y: me.y } : onFloor(rng, null);
          }
          steer(car, car.aim, THEIR_SPEED, 2.5, dt);
        }
        car.x += car.vx * dt;
        car.y += car.vy * dt;
      }
      // Bumps.
      const live = state.cars.filter((c) => c.out < 0);
      for (let i = 0; i < live.length; i += 1) {
        for (let j = i + 1; j < live.length; j += 1) {
          const a = live[i];
          const b = live[j];
          if (!a || !b) continue;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d = Math.hypot(dx, dy);
          if (d >= CAR_R * 2 || d === 0) continue;
          const nx = dx / d;
          const ny = dy / d;
          const ma = a.mine ? MY_MASS : 1;
          const mb = b.mine ? MY_MASS : 1;
          const overlap = CAR_R * 2 - d;
          a.x -= nx * overlap * (mb / (ma + mb));
          a.y -= ny * overlap * (mb / (ma + mb));
          b.x += nx * overlap * (ma / (ma + mb));
          b.y += ny * overlap * (ma / (ma + mb));
          const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
          if (rel <= 0) continue;
          // A springy bump (a little more than elastic: it is a bumper car).
          const impulse = (2.2 * rel) / (1 / ma + 1 / mb);
          a.vx -= (impulse / ma) * nx;
          a.vy -= (impulse / ma) * ny;
          b.vx += (impulse / mb) * nx;
          b.vy += (impulse / mb) * ny;
          if (a.mine) b.bumpedAt = state.time;
          if (b.mine) a.bumpedAt = state.time;
          events.push({ type: 'action', x: a.x + nx * CAR_R, y: a.y + ny * CAR_R });
        }
      }
      for (const car of live) {
        if (Math.hypot(car.x - centre.x, car.y - centre.y) <= radius + CAR_R * 0.3) continue;
        car.out = 0;
        if (car.mine) events.push({ type: 'hit', x: car.x, y: car.y });
        else if (state.time - car.bumpedAt <= CREDIT_SECONDS) {
          state.score += 1;
          events.push({ type: 'score', x: car.x, y: car.y });
        } else events.push({ type: 'miss', x: car.x, y: car.y });
      }
    },
  };
}

/** Good play: picks the car nearest the edge, gets between it and the middle, then rams it outward. */
export function bumperBot(state: BumperState, _context: BotContext): BotMove {
  const me = state.cars.find((c) => c.mine);
  if (!me || me.out >= 0) return {};
  const { centre, radius } = state;
  const others = state.cars.filter((c) => !c.mine && c.out < 0);
  others.sort((a, b) => Math.hypot(b.x - centre.x, b.y - centre.y) - Math.hypot(a.x - centre.x, a.y - centre.y));
  const target = others[0];
  if (!target) return { touch: centre };
  const d = Math.hypot(target.x - centre.x, target.y - centre.y) || 1;
  const ux = (target.x - centre.x) / d;
  const uy = (target.y - centre.y) / d;
  const behind = (me.x - target.x) * ux + (me.y - target.y) * uy;
  const side = Math.abs((me.x - target.x) * -uy + (me.y - target.y) * ux);
  const clamp = (p: Point): Point => {
    const pd = Math.hypot(p.x - centre.x, p.y - centre.y);
    const max = radius * 0.8;
    return pd <= max ? p : { x: centre.x + ((p.x - centre.x) / pd) * max, y: centre.y + ((p.y - centre.y) / pd) * max };
  };
  if (behind < -CAR_R && side < CAR_R) return { touch: clamp({ x: target.x + ux * 120, y: target.y + uy * 120 }) };
  return { touch: clamp({ x: target.x - ux * 90, y: target.y - uy * 90 }) };
}
