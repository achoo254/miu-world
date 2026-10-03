// Firefly torch: a forest at night. A torch beam follows the child's finger (a tap moves it there too).
// Fireflies drift about in the dark, blinking now and then so she can spot them; inside the beam they shine
// all the time. A tap on a firefly lit by the beam catches it into the jar; one in the dark cannot be
// caught (the beam moves to the tap instead). Fireflies shy away from the light a little. Pure.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export interface Firefly {
  x: number;
  y: number;
  /** Wander heading (radians) and speed. */
  heading: number;
  speed: number;
  /** Blink clock: it glows in the dark during the first part of each cycle. */
  blink: number;
  cycle: number;
  /** Seconds since caught (flies to the jar); -1 while free. */
  caught: number;
}

export interface FireflyState {
  /** The play area fireflies stay in. */
  top: number;
  bottom: number;
  beamX: number;
  beamY: number;
  beamRadius: number;
  jarX: number;
  jarY: number;
  flies: Firefly[];
  score: number;
  time: number;
}

const COUNT = 6;
const BEAM_SPEED = 1500;
export const BEAM_RADIUS = 130;
/** A tap catches a lit firefly this close to it. */
export const CATCH_REACH = TOUCH_RADIUS + 25;
const GLOW_SECONDS = 0.6;
const SHY = 40;
/** Seconds from a catch until a new firefly comes out (the caught one flies to the jar first). */
const RESPAWN = 1.4;

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** Lit: inside the beam. */
export const isLit = (state: FireflyState, f: Firefly): boolean => Math.hypot(f.x - state.beamX, f.y - state.beamY) <= state.beamRadius;

export function createFireflyTorch({ arena, params, rng }: GameSetup): MinigameLogic<FireflyState> {
  const factor = typeof params.speed === 'number' ? clamp(params.speed, 0.6, 1.5) : 1;
  const events = eventQueue();
  const top = HUD_SAFE_TOP + 40;
  const bottom = arena.height - 170;
  const margin = 50;
  const state: FireflyState = {
    top,
    bottom,
    beamX: arena.width / 2,
    beamY: (top + bottom) / 2,
    beamRadius: BEAM_RADIUS,
    jarX: arena.width - 80,
    jarY: arena.height - 80,
    flies: [],
    score: 0,
    time: 0,
  };
  const spawn = (): Firefly => {
    // Away from the beam, so each one has to be found.
    let x = rng.range(margin, arena.width - margin);
    let y = rng.range(top, bottom);
    for (let k = 0; k < 6 && Math.hypot(x - state.beamX, y - state.beamY) < BEAM_RADIUS * 1.6; k += 1) {
      x = rng.range(margin, arena.width - margin);
      y = rng.range(top, bottom);
    }
    return { x, y, heading: rng.range(0, Math.PI * 2), speed: rng.range(40, 80) * factor, blink: rng.range(0, 2), cycle: rng.range(1.8, 2.8), caught: -1 };
  };
  for (let i = 0; i < COUNT; i += 1) state.flies.push(spawn());

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

      // A tap on a lit firefly catches it (the beam as it was before the tap moves it).
      for (const tap of input.taps) {
        const f = state.flies.find((fly) => fly.caught < 0 && isLit(state, fly) && Math.hypot(fly.x - tap.x, fly.y - tap.y) < CATCH_REACH);
        if (f) {
          f.caught = 0;
          state.score += 1;
          events.push({ type: 'score', x: f.x, y: f.y });
        }
      }
      const aim = input.pointer ?? input.taps.at(-1) ?? null;
      if (aim) {
        const dx = clamp(aim.x, 0, arena.width) - state.beamX;
        const dy = clamp(aim.y, top - 40, bottom + 60) - state.beamY;
        const d = Math.hypot(dx, dy);
        const move = Math.min(d, BEAM_SPEED * dt);
        if (d > 0) {
          state.beamX += (dx / d) * move;
          state.beamY += (dy / d) * move;
        }
      }

      for (const f of state.flies) {
        if (f.caught >= 0) {
          f.caught += dt;
          continue;
        }
        f.blink = (f.blink + dt) % f.cycle;
        f.heading += rng.range(-2, 2) * dt;
        let vx = Math.cos(f.heading) * f.speed;
        let vy = Math.sin(f.heading) * f.speed;
        // Shy of the light.
        const bx = f.x - state.beamX;
        const by = f.y - state.beamY;
        const bd = Math.hypot(bx, by);
        if (bd < state.beamRadius && bd > 1) {
          vx += (bx / bd) * SHY;
          vy += (by / bd) * SHY;
        }
        f.x += vx * dt;
        f.y += vy * dt;
        if (f.x < margin || f.x > arena.width - margin) f.heading = Math.PI - f.heading;
        if (f.y < top || f.y > bottom) f.heading = -f.heading;
        f.x = clamp(f.x, margin, arena.width - margin);
        f.y = clamp(f.y, top, bottom);
      }
      // A caught one reaches the jar; a new one comes out somewhere in the dark.
      state.flies = state.flies.map((f) => (f.caught >= RESPAWN ? spawn() : f));
    },
  };
}

/** Glows in the dark right now (a blink), so she can spot it. */
export const isBlinking = (f: Firefly): boolean => f.blink < GLOW_SECONDS;

/**
 * Good play, with the child's eyes: tap a lit firefly; otherwise sweep the beam to the nearest one that is
 * blinking or lit (the bot does not see in the dark), or along the forest when none shows.
 */
export function fireflyBot(state: FireflyState, context: BotContext): BotMove {
  const free = state.flies.filter((f) => f.caught < 0);
  const lit = free.find((f) => Math.hypot(f.x - state.beamX, f.y - state.beamY) < state.beamRadius - 20);
  if (lit) return { tap: { x: lit.x, y: lit.y } };
  const seen = free.filter((f) => isBlinking(f)).sort((a, b) => Math.hypot(a.x - state.beamX, a.y - state.beamY) - Math.hypot(b.x - state.beamX, b.y - state.beamY))[0];
  if (seen) return { touch: { x: seen.x, y: seen.y } };
  const sweep = (context.time * 0.25) % 1;
  return { touch: { x: context.arena.width * (0.15 + 0.7 * Math.abs(sweep * 2 - 1)), y: state.top + (state.bottom - state.top) * (0.5 + 0.35 * Math.sin(context.time * 1.3)) } };
}
