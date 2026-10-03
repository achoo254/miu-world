// Beach volleyball against the crab: the ball's shadow on the sand shows where it will come down. The child
// drags to run under it and bumps it back over the net by herself. Tapping while the ball is just above her
// head spikes it instead: fast and low into the far corner, hard for the crab to reach. A ball that lands in
// the sand is the other side's point. Points are the child's score; if the crab reaches five first, a new set
// starts with a slower crab. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Which side it is heading to, and whether it was spiked. */
  to: 'child' | 'crab';
  spiked: boolean;
}

export type Phase = 'rally' | 'point';

export interface VolleyState {
  groundY: number;
  netX: number;
  netTop: number;
  /** Height where a player meets the ball (head height). */
  contactY: number;
  child: { x: number; target: number; hitAgo: number };
  crab: { x: number; hitAgo: number; speed: number };
  ball: Ball;
  phase: Phase;
  /** Seconds left of the pause after a point. */
  pause: number;
  /** Who won the last point. */
  lastPoint: 'child' | 'crab' | null;
  set: { child: number; crab: number };
  sets: number;
  score: number;
  time: number;
}

export const GRAVITY = 900;
/** How far sideways a player reaches to play the ball. */
export const REACH = 72;
const CHILD_SPEED = 700;
const CRAB_SPEED = 250;
const SET_POINTS = 5;
/** A spike can be hit while the ball is this far above the head (and coming down). */
export const SPIKE_ABOVE = 170;

/** Velocity that takes the ball from (x0, y0) to (x1, y1) in t seconds under gravity. */
function aim(x0: number, y0: number, x1: number, y1: number, t: number): { vx: number; vy: number } {
  return { vx: (x1 - x0) / t, vy: (y1 - y0) / t - 0.5 * GRAVITY * t };
}

/** Where the ball will be at contact height on its way down (x), or null if it is not coming down to it. */
export function landingX(ball: Ball, contactY: number): number | null {
  // y(t) = y + vy t + g t² / 2 = contactY, the later root.
  const a = 0.5 * GRAVITY;
  const b = ball.vy;
  const c = ball.y - contactY;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const t = (-b + Math.sqrt(disc)) / (2 * a);
  return t >= 0 ? ball.x + ball.vx * t : null;
}

export function createVolleyballBeach({ arena, rng }: GameSetup): MinigameLogic<VolleyState> {
  const events = eventQueue();
  const groundY = arena.height - 110;
  const netX = arena.width / 2;
  const contactY = groundY - 120;
  const state: VolleyState = {
    groundY,
    netX,
    netTop: groundY - Math.min(210, (groundY - 200) * 0.45),
    contactY,
    child: { x: netX / 2, target: netX / 2, hitAgo: 9 },
    crab: { x: netX * 1.5, hitAgo: 9, speed: CRAB_SPEED },
    ball: { x: netX * 1.5, y: contactY, vx: 0, vy: 0, to: 'child', spiked: false },
    phase: 'point',
    pause: 1,
    lastPoint: null,
    set: { child: 0, crab: 0 },
    sets: 1,
    score: 0,
    time: 0,
  };
  const margin = 50;

  function send(from: { x: number; y: number }, to: 'child' | 'crab', r: Rng, spiked = false): void {
    const lo = to === 'child' ? margin : netX + margin;
    const hi = to === 'child' ? netX - margin : arena.width - margin;
    // A spike goes low and fast to the end the crab is not at; other balls anywhere, high and slow.
    const mid = (lo + hi) / 2;
    const farEnd = Math.abs(state.crab.x - mid) < 20 ? r.chance(0.5) : state.crab.x < mid;
    const x = spiked ? (farEnd ? hi - r.range(0, (hi - lo) * 0.15) : lo + r.range(0, (hi - lo) * 0.15)) : r.range(lo, hi);
    const t = spiked ? 0.5 : r.range(1.25, 1.5);
    const v = aim(from.x, from.y, x, contactY, t);
    state.ball = { x: from.x, y: from.y, ...v, to, spiked };
  }

  function point(winner: 'child' | 'crab'): void {
    state.phase = 'point';
    state.pause = 1.1;
    state.lastPoint = winner;
    state.set[winner] += 1;
    if (winner === 'child') {
      state.score += 1;
      events.push({ type: 'score', x: state.ball.x, y: groundY - 40 });
    } else events.push({ type: 'miss', x: state.ball.x, y: groundY });
    if (state.set.crab >= SET_POINTS || state.set.child >= SET_POINTS) {
      // A new set; the crab tires a little each time it wins one.
      if (state.set.crab >= SET_POINTS) state.crab.speed *= 0.85;
      state.set = { child: 0, crab: 0 };
      state.sets += 1;
    }
  }

  function serve(): void {
    state.phase = 'rally';
    send({ x: state.crab.x, y: contactY }, 'child', rng);
    state.crab.hitAgo = 0;
    events.push({ type: 'action', x: state.crab.x, y: contactY });
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
      state.child.hitAgo += dt;
      state.crab.hitAgo += dt;
      // The child runs toward the finger, on her side of the net.
      if (input.pointer) state.child.target = Math.min(netX - 40, Math.max(40, input.pointer.x));
      const dxc = state.child.target - state.child.x;
      state.child.x += Math.max(-CHILD_SPEED * dt, Math.min(CHILD_SPEED * dt, dxc));
      if (state.phase === 'point') {
        state.pause -= dt;
        if (state.pause <= 0) serve();
        return;
      }
      const { ball } = state;
      // The crab runs to where the ball will come down on its side (a spike catches it flat-footed).
      const crabGoal = ball.to === 'crab' ? (landingX(ball, contactY) ?? state.crab.x) : netX * 1.5;
      const dxk = Math.min(arena.width - 40, Math.max(netX + 40, crabGoal)) - state.crab.x;
      const crabSpeed = state.crab.speed * (ball.spiked ? 0.3 : 1);
      state.crab.x += Math.max(-crabSpeed * dt, Math.min(crabSpeed * dt, dxk));

      const before = ball.y;
      ball.vy += GRAVITY * dt;
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      const falling = ball.vy > 0;
      // A spike: tapped while the ball drops toward the child's head, close above it.
      if (ball.to === 'child' && falling && input.taps.length > 0 && Math.abs(ball.x - state.child.x) <= REACH + 20 && ball.y >= contactY - SPIKE_ABOVE && ball.y <= contactY + 10) {
        send({ x: state.child.x, y: Math.min(ball.y, contactY) }, 'crab', rng, true);
        state.child.hitAgo = 0;
        events.push({ type: 'action', x: state.child.x, y: contactY - 40, note: 72, voice: 'clap' });
        return;
      }
      if (falling && before < contactY && ball.y >= contactY) {
        const side = ball.to === 'child' ? state.child : state.crab;
        // A spike is only dug out by a crab standing right where it lands.
        if (Math.abs(ball.x - side.x) <= (ball.spiked ? REACH * 0.4 : REACH)) {
          side.hitAgo = 0;
          send({ x: ball.x, y: contactY }, ball.to === 'child' ? 'crab' : 'child', rng);
          events.push({ type: 'action', x: ball.x, y: contactY, note: 67, voice: 'drum' });
          return;
        }
      }
      if (ball.y >= groundY) point(ball.to === 'child' ? 'crab' : 'child');
    },
  };
}

/** Good play: runs under the ball's landing spot and spikes whenever it can. */
export function volleyballBot(state: VolleyState, _context: BotContext): BotMove {
  const { ball } = state;
  if (state.phase === 'rally' && ball.to === 'child') {
    const x = landingX(ball, state.contactY) ?? state.child.x;
    const near = Math.abs(ball.x - state.child.x) <= REACH && ball.vy > 0 && ball.y >= state.contactY - 140 && ball.y <= state.contactY - 20;
    if (near) return { tap: { x: state.child.x, y: state.contactY } };
    return { touch: { x, y: state.groundY } };
  }
  return { touch: { x: state.netX / 2, y: state.groundY } };
}
