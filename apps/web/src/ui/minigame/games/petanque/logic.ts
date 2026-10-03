// Pétanque: a small gold jack lies on a gravel court. The child and the owl take turns lobbing three steel
// balls each. She puts a finger down and pulls it upward: the longer the pull, the further the ball flies, a
// pull to the side sends it to that side (a dotted line shows where it will land). A ball rolls a little on
// landing and knocks other balls (or the jack) it hits. When all six are down, whoever has the ball nearest
// the jack scores one point for each of their balls nearer than the other side's best. Her points are the
// score; a new end starts with the jack somewhere else. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const BALLS_EACH = 3;
export const BALL_R = 17;
export const JACK_R = 10;
const FLIGHT_SECONDS = 0.75;
const LAND_SPEED = 90;
const FRICTION = 260;
const AI_DELAY = 0.8;
const END_SECONDS = 2;
/** A pull of this many units sends the ball this many times as far. */
const REACH_Y = 2.3;
const REACH_X = 1.6;

export interface Ball {
  owner: 'child' | 'owl' | 'jack';
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface Flight {
  from: Point;
  to: Point;
  age: number;
  owner: 'child' | 'owl';
}

export interface PetanqueState {
  balls: Ball[];
  flight: Flight | null;
  turn: 'child' | 'owl';
  thrown: { child: number; owl: number };
  /** Seconds the owl has been thinking, or since the end was scored; -1 while a throw is landing. */
  wait: number;
  phase: 'play' | 'scored';
  /** Some ball is still rolling. */
  rolling: boolean;
  lastEnd: { child: number; owl: number } | null;
  owlScore: number;
  /** The child's pull: where it started and where the finger is now. */
  aimFrom: Point | null;
  aimTo: Point | null;
  thrower: Point;
  court: { left: number; right: number; top: number; bottom: number };
  ends: number;
  score: number;
  time: number;
}

/** Where a pull from `from` to `to` lands, kept on the court. */
export function landing(state: Pick<PetanqueState, 'thrower' | 'court'>, from: Point, to: Point): Point {
  const x = state.thrower.x + (to.x - from.x) * REACH_X;
  const y = state.thrower.y + Math.min(0, to.y - from.y) * REACH_Y;
  return { x: Math.max(state.court.left + BALL_R, Math.min(state.court.right - BALL_R, x)), y: Math.max(state.court.top + BALL_R, Math.min(state.thrower.y - 60, y)) };
}

/** Points of an end: who has the nearest ball, and how many of theirs beat the other side's best. */
export function scoreEnd(balls: readonly Ball[]): { child: number; owl: number } {
  const jack = balls.find((b) => b.owner === 'jack');
  if (!jack) return { child: 0, owl: 0 };
  const dist = (b: Ball): number => Math.hypot(b.x - jack.x, b.y - jack.y);
  const best = (o: 'child' | 'owl'): number => Math.min(Infinity, ...balls.filter((b) => b.owner === o).map(dist));
  const c = best('child');
  const o = best('owl');
  if (c === o) return { child: 0, owl: 0 };
  const winner = c < o ? 'child' : 'owl';
  const other = Math.max(c, o);
  const points = balls.filter((b) => b.owner === winner && dist(b) < other).length;
  return winner === 'child' ? { child: points, owl: 0 } : { child: 0, owl: points };
}

export function createPetanque({ arena, rng }: GameSetup): MinigameLogic<PetanqueState> {
  const events = eventQueue();
  const court = { left: Math.max(20, arena.width / 2 - 260), right: Math.min(arena.width - 20, arena.width / 2 + 260), top: HUD_SAFE_TOP + 30, bottom: arena.height - 20 };
  const thrower = { x: arena.width / 2, y: court.bottom - 70 };
  const state: PetanqueState = { balls: [], flight: null, turn: 'child', thrown: { child: 0, owl: 0 }, wait: 0, phase: 'play', rolling: false, lastEnd: null, owlScore: 0, aimFrom: null, aimTo: null, thrower, court, ends: 0, score: 0, time: 0 };

  function newEnd(r: Rng): void {
    const span = thrower.y - 160 - court.top;
    state.balls = [{ owner: 'jack', x: arena.width / 2 + r.range(-100, 100), y: court.top + 40 + r.range(0, Math.max(40, span * 0.6)), vx: 0, vy: 0 }];
    state.thrown = { child: 0, owl: 0 };
    state.turn = state.ends % 2 === 0 ? 'child' : 'owl';
    state.wait = 0;
    state.phase = 'play';
    state.ends += 1;
  }

  function launch(owner: 'child' | 'owl', to: Point): void {
    state.flight = { from: { ...thrower }, to, age: 0, owner };
    state.thrown[owner] += 1;
    events.push({ type: 'action', x: thrower.x, y: thrower.y });
  }

  function nextTurn(): void {
    const { child, owl } = state.thrown;
    if (child >= BALLS_EACH && owl >= BALLS_EACH) {
      const end = scoreEnd(state.balls);
      state.lastEnd = end;
      state.score += end.child;
      state.owlScore += end.owl;
      state.phase = 'scored';
      state.wait = 0;
      const jack = state.balls.find((b) => b.owner === 'jack');
      events.push(end.child > 0 ? { type: 'score', x: jack?.x ?? thrower.x, y: (jack?.y ?? thrower.y) - 30, points: end.child } : { type: 'miss', x: jack?.x ?? thrower.x, y: jack?.y ?? thrower.y });
      return;
    }
    // The side further from the jack throws next (the usual rule), as long as it has balls left.
    const end = scoreEnd(state.balls);
    const losing: 'child' | 'owl' = end.child > 0 ? 'owl' : end.owl > 0 ? 'child' : state.turn === 'child' ? 'owl' : 'child';
    state.turn = state.thrown[losing] < BALLS_EACH ? losing : losing === 'child' ? 'owl' : 'child';
    state.wait = 0;
  }

  /** The owl aims at the jack with a wobble, or now and then at the child's best ball to knock it away. */
  function owlThrow(): void {
    const jack = state.balls.find((b) => b.owner === 'jack');
    if (!jack) return;
    const mine = state.balls.filter((b) => b.owner === 'child').sort((a, b) => Math.hypot(a.x - jack.x, a.y - jack.y) - Math.hypot(b.x - jack.x, b.y - jack.y))[0];
    const shoot = mine && scoreEnd(state.balls).child > 0 && rng.chance(0.35);
    const aim = shoot && mine ? mine : jack;
    const spread = shoot ? 40 : 75;
    launch('owl', { x: aim.x + rng.range(-spread, spread), y: aim.y + rng.range(-spread, spread) + 18 });
  }

  /** Rolling balls slow down and push each other apart. */
  function roll(dt: number): boolean {
    let moving = false;
    for (const b of state.balls) {
      const speed = Math.hypot(b.vx, b.vy);
      if (speed <= 0) continue;
      const slower = Math.max(0, speed - FRICTION * dt);
      b.vx *= slower / speed;
      b.vy *= slower / speed;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (slower > 0) moving = true;
    }
    for (let i = 0; i < state.balls.length; i += 1) {
      for (let j = i + 1; j < state.balls.length; j += 1) {
        const a = state.balls[i];
        const b = state.balls[j];
        if (!a || !b) continue;
        const ra = a.owner === 'jack' ? JACK_R : BALL_R;
        const rb = b.owner === 'jack' ? JACK_R : BALL_R;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.01;
        if (d >= ra + rb) continue;
        const nx = dx / d;
        const ny = dy / d;
        const overlap = ra + rb - d;
        // The jack is light: it takes most of a push.
        const ma = a.owner === 'jack' ? 0.4 : 1;
        const mb = b.owner === 'jack' ? 0.4 : 1;
        const shareA = mb / (ma + mb);
        a.x -= nx * overlap * shareA;
        a.y -= ny * overlap * shareA;
        b.x += nx * overlap * (1 - shareA);
        b.y += ny * overlap * (1 - shareA);
        const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
        if (rel > 0) {
          const impulse = (2 * rel) / (ma + mb);
          a.vx -= impulse * mb * nx;
          a.vy -= impulse * mb * ny;
          b.vx += impulse * ma * nx;
          b.vy += impulse * ma * ny;
          moving = true;
        }
      }
    }
    return moving;
  }

  newEnd(rng);

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
      const moving = roll(dt);
      state.rolling = moving;
      // The child's pull: it counts only when it is her turn and everything has stopped.
      const ready = state.phase === 'play' && !state.flight && !moving && state.wait !== -1 && state.turn === 'child' && state.thrown.child < BALLS_EACH;
      if (input.pressed && input.pointer && ready) state.aimFrom = input.pointer;
      if (input.pointer && state.aimFrom) state.aimTo = input.pointer;
      if (input.released) {
        if (ready && state.aimFrom && state.aimTo && state.aimFrom.y - state.aimTo.y > 30) {
          launch('child', landing(state, state.aimFrom, state.aimTo));
          state.wait = -1;
        }
        state.aimFrom = null;
        state.aimTo = null;
      }
      if (state.phase === 'scored') {
        state.wait += dt;
        if (state.wait >= END_SECONDS) newEnd(rng);
        return;
      }
      const f = state.flight;
      if (f) {
        f.age += dt;
        if (f.age >= FLIGHT_SECONDS) {
          const dx = f.to.x - f.from.x;
          const dy = f.to.y - f.from.y;
          const d = Math.hypot(dx, dy) || 1;
          state.balls.push({ owner: f.owner, x: f.to.x, y: f.to.y, vx: (dx / d) * LAND_SPEED, vy: (dy / d) * LAND_SPEED });
          state.flight = null;
          events.push({ type: 'action', x: f.to.x, y: f.to.y, note: 48, voice: 'drum' });
        }
        return;
      }
      if (moving) return;
      // A throw has landed and everything has stopped: whose turn now (or the end is scored).
      if (state.wait === -1) {
        nextTurn();
        return;
      }
      if (state.turn === 'owl') {
        state.wait += dt;
        if (state.wait >= AI_DELAY) {
          owlThrow();
          state.wait = -1;
        }
        return;
      }
    },
  };
}

/** Good play: pulls exactly toward the jack, a little short so the ball rolls up to it. */
export function petanqueBot(state: PetanqueState, _context: BotContext): BotMove {
  if (state.phase !== 'play' || state.turn !== 'child' || state.flight || state.rolling || state.wait === -1 || state.thrown.child >= BALLS_EACH) return {};
  const jack = state.balls.find((b) => b.owner === 'jack');
  if (!jack) return {};
  // Land short of the jack by the little roll after landing, so the ball stops by it: beside the balls already
  // there rather than into them.
  const dx = jack.x - state.thrower.x;
  const dy = jack.y - state.thrower.y;
  const d = Math.hypot(dx, dy) || 1;
  const ux = dx / d;
  const uy = dy / d;
  const roll = (LAND_SPEED * LAND_SPEED) / (2 * FRICTION);
  const touch = BALL_R + JACK_R + 2;
  const spots = [0, 1, -1].map((side) => {
    const stop = { x: jack.x - ux * touch * (side === 0 ? 1 : 0.4) - uy * side * touch, y: jack.y - uy * touch * (side === 0 ? 1 : 0.4) + ux * side * touch };
    const clear = Math.min(Infinity, ...state.balls.filter((b) => b.owner !== 'jack').map((b) => Math.hypot(b.x - stop.x, b.y - stop.y)));
    return { stop, clear };
  });
  const spot = spots.find((s) => s.clear > BALL_R * 2.4) ?? spots[0];
  const stop = spot?.stop ?? { x: jack.x, y: jack.y };
  const target = { x: stop.x - ux * roll, y: stop.y - uy * roll };
  const from = { x: state.thrower.x, y: state.thrower.y };
  const to = { x: from.x + (target.x - state.thrower.x) / REACH_X, y: from.y + (target.y - state.thrower.y) / REACH_Y };
  if (!state.aimFrom) return { touch: from };
  if (!state.aimTo || Math.hypot(state.aimTo.x - to.x, state.aimTo.y - to.y) > 1) return { touch: to };
  return {};
}
