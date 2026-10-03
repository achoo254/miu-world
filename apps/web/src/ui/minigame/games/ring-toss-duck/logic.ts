// Ring toss: three ducks bob on a pond at different distances, drifting slowly. Each throw takes two taps:
// the first stops a power meter that swings near-to-far (how far the ring flies), the second stops a needle
// that swings left-to-right (where it goes). A soft marker on the water shows where the ring would land, so the
// child sees the effect of each tap. The ring flies in an arc; landing close enough to a duck's neck (a
// generous, snapping catch) rings it: a point, and the ring stays on the duck. Ten rings a round.
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export type Phase = 'power' | 'aim' | 'flying' | 'rest';

export interface Duck {
  x: number;
  y: number;
  /** 0 = far … 1 = near: size and catch radius grow with it. */
  depth: number;
  vx: number;
  /** Rings it wears, and seconds since the last one landed (a happy wiggle). */
  rings: number;
  ringedAgo: number;
}

export interface Ring {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  t: number;
  /** The duck it lands on (index), or -1 for a splash. */
  duck: number;
}

export interface RingTossState {
  pondTop: number;
  pondBottom: number;
  throwX: number;
  throwY: number;
  /** Half the width the needle covers at full swing. */
  spread: number;
  ducks: Duck[];
  phase: Phase;
  /** Seconds in the current phase (the meter and the needle swing with it). */
  phaseTime: number;
  /** Locked power (0 near … 1 far) once the first tap is made. */
  power: number;
  ring: Ring | null;
  /** Where the last ring splashed (for ripples) and how long ago. */
  splash: { x: number; y: number; ago: number } | null;
  ringsLeft: number;
  score: number;
  time: number;
}

export const RINGS = 10;
/** Seconds for the meter to go near → far → near, and for the needle left → right → left. */
export const POWER_PERIOD = 1.6;
export const AIM_PERIOD = 2.0;
const FLIGHT_SECONDS = 0.7;
const REST_SECONDS = 0.7;
/** Catch radii around a near duck's neck (scaled down with distance): generous for young hands. */
const CATCH_X = 62;
const CATCH_Y = 50;

/** The power meter's value after `t` seconds of its phase: 0 → 1 → 0 smoothly. */
export const meterAt = (t: number): number => 0.5 - 0.5 * Math.cos((2 * Math.PI * t) / POWER_PERIOD);
/** The needle after `t` seconds: -1 (left) … 1 (right), starting straight ahead. */
export const needleAt = (t: number): number => Math.sin((2 * Math.PI * t) / AIM_PERIOD);

export const scaleFor = (depth: number): number => 0.62 + 0.38 * depth;

export function landingFor(state: RingTossState, power: number, needle: number): { x: number; y: number } {
  return { x: state.throwX + needle * state.spread, y: state.pondBottom - power * (state.pondBottom - state.pondTop) };
}

/** The duck a ring landing at (x, y) is caught by, or -1. */
export function duckCaught(state: RingTossState, x: number, y: number): number {
  let best = -1;
  let bestD = 1;
  state.ducks.forEach((d, i) => {
    const s = scaleFor(d.depth);
    const dx = (x - d.x) / (CATCH_X * s);
    const dy = (y - d.y) / (CATCH_Y * s);
    const dist = dx * dx + dy * dy;
    if (dist <= bestD) {
      bestD = dist;
      best = i;
    }
  });
  return best;
}

export function createRingToss({ arena, rng }: GameSetup): MinigameLogic<RingTossState> {
  const events = eventQueue();
  const pondTop = HUD_SAFE_TOP + 70;
  const throwY = arena.height - 90;
  const pondBottom = throwY - Math.min(190, arena.height * 0.24);
  const margin = 70;
  const state: RingTossState = {
    pondTop,
    pondBottom,
    throwX: arena.width / 2,
    throwY,
    spread: arena.width / 2 - margin,
    ducks: [0.12, 0.5, 0.88].map((depth, i) => ({
      x: rng.range(margin + 40, arena.width - margin - 40),
      y: pondTop + depth * (pondBottom - pondTop),
      depth,
      vx: (rng.chance(0.5) ? 1 : -1) * rng.range(22, 40) * (i === 1 ? 1.2 : 1),
      rings: 0,
      ringedAgo: 9,
    })),
    phase: 'power',
    phaseTime: 0,
    power: 0,
    ring: null,
    splash: null,
    ringsLeft: RINGS,
    score: 0,
    time: 0,
  };

  const enter = (phase: Phase): void => {
    state.phase = phase;
    state.phaseTime = 0;
  };

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.ringsLeft <= 0 && state.phase === 'rest' && state.phaseTime >= REST_SECONDS;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.phaseTime += dt;
      if (state.splash) state.splash.ago += dt;
      for (const d of state.ducks) {
        d.ringedAgo += dt;
        d.x += d.vx * dt;
        const s = scaleFor(d.depth);
        const lo = margin * s + 20;
        const hi = arena.width - margin * s - 20;
        if (d.x < lo || d.x > hi) {
          d.vx *= -1;
          d.x = Math.min(hi, Math.max(lo, d.x));
        }
      }
      const tapped = input.taps.length > 0;
      switch (state.phase) {
        case 'power':
          if (tapped) {
            state.power = meterAt(state.phaseTime);
            enter('aim');
            events.push({ type: 'action', x: state.throwX, y: state.throwY, note: 67, voice: 'bell' });
          }
          break;
        case 'aim':
          if (tapped) {
            const to = landingFor(state, state.power, needleAt(state.phaseTime));
            state.ring = { fromX: state.throwX, fromY: state.throwY - 50, toX: to.x, toY: to.y, t: 0, duck: -1 };
            state.ringsLeft -= 1;
            enter('flying');
            events.push({ type: 'action', x: state.throwX, y: state.throwY - 50 });
          }
          break;
        case 'flying': {
          const ring = state.ring;
          if (!ring) break;
          ring.t += dt;
          if (ring.t >= FLIGHT_SECONDS) {
            const caught = duckCaught(state, ring.toX, ring.toY);
            const duck = state.ducks[caught];
            if (duck) {
              duck.rings += 1;
              duck.ringedAgo = 0;
              ring.duck = caught;
              state.score += 1;
              events.push({ type: 'score', x: duck.x, y: duck.y - 40 * scaleFor(duck.depth), note: 72 + state.score, voice: 'bell' });
            } else {
              state.splash = { x: ring.toX, y: ring.toY, ago: 0 };
              events.push({ type: 'miss', x: ring.toX, y: ring.toY });
            }
            state.ring = null;
            enter('rest');
          }
          break;
        }
        case 'rest':
          if (state.phaseTime >= REST_SECONDS && state.ringsLeft > 0) enter('power');
          break;
      }
    },
  };
}

/** Where a duck will be after `seconds` of drifting (bounces ignored: the bot re-picks if it turns). */
const ahead = (d: Duck, seconds: number): number => d.x + d.vx * seconds;

/**
 * Good play: pick the duck easiest to reach, then tap each swing at the step closest to the value it needs
 * (it looks one decision ahead, so it waits for a better moment when one is coming).
 */
export function ringTossBot(state: RingTossState, _context: BotContext): BotMove {
  const step = 1 / 60;
  const decision = 0.1;
  const target = state.ducks.reduce((a, b) => (Math.abs(ahead(b, 1.6) - state.throwX) < Math.abs(ahead(a, 1.6) - state.throwX) ? b : a));
  const tap = { x: state.throwX, y: state.throwY };
  if (state.phase === 'power') {
    if (state.phaseTime < 0.3) return {};
    const need = (state.pondBottom - target.y) / (state.pondBottom - state.pondTop);
    const now = Math.abs(meterAt(state.phaseTime + step) - need);
    const next = Math.abs(meterAt(state.phaseTime + decision + step) - need);
    return now <= next && now < 0.08 ? { tap } : {};
  }
  if (state.phase === 'aim') {
    if (state.phaseTime < 0.3) return {};
    const landX = (t: number): number => ahead(target, t + FLIGHT_SECONDS);
    const errAt = (t: number): number => Math.abs(state.throwX + needleAt(state.phaseTime + t) * state.spread - landX(t));
    const now = errAt(step);
    const next = errAt(decision + step);
    return now <= next && now < CATCH_X * scaleFor(target.depth) * 0.6 ? { tap } : {};
  }
  return {};
}
