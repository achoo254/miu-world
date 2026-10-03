// Tết fireworks: golden rings drift in the night sky. The child puts her finger down under a ring: a rocket
// shoots up from there while she holds, and bursts where it is when she lets go. Every ring inside the burst
// lights up (two rings at once are two points). Sixteen rockets; one that is let go too early or too late
// just bursts in the dark. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface Ring extends Point {
  vx: number;
  /** Seconds since it appeared, or since it was lit (then it fades). */
  age: number;
  lit: boolean;
  colour: number;
}

export interface Rocket extends Point {
  /** Bursting: seconds since (-1 while rising), how many rings it lit. */
  burst: number;
  lit: number;
  colour: number;
}

export interface FireworksState {
  launchY: number;
  rings: Ring[];
  rocket: Rocket | null;
  rocketsLeft: number;
  score: number;
  time: number;
}

export const ROCKETS = 16;
export const RISE = 520;
/** A burst lights every ring whose middle is this close. */
export const BURST_REACH = 88;
export const RING_RADIUS = 46;
const BURST_SECONDS = 0.9;
const RINGS = 3;

export function createFireworks({ arena, rng }: GameSetup): MinigameLogic<FireworksState> {
  const events = eventQueue();
  const launchY = arena.height - 70;
  const top = HUD_SAFE_TOP + 70;
  const low = Math.max(top + 120, arena.height * 0.6);
  const newRing = (r: Rng, colour: number): Ring => ({ x: r.range(70, arena.width - 70), y: r.range(top, low), vx: (r.chance(0.5) ? 1 : -1) * r.range(18, 42), age: 0, lit: false, colour });
  const state: FireworksState = {
    launchY,
    rings: Array.from({ length: RINGS }, (_, i) => newRing(rng, i)),
    rocket: null,
    rocketsLeft: ROCKETS,
    score: 0,
    time: 0,
  };

  const burst = (rocket: Rocket): void => {
    rocket.burst = 0;
    let lit = 0;
    for (const ring of state.rings) {
      if (ring.lit || Math.hypot(ring.x - rocket.x, ring.y - rocket.y) > BURST_REACH) continue;
      ring.lit = true;
      ring.age = 0;
      lit += 1;
    }
    rocket.lit = lit;
    if (lit > 0) {
      state.score += lit;
      events.push({ type: 'score', x: rocket.x, y: rocket.y, points: lit, note: 79 + lit * 2, voice: 'bell' });
    } else events.push({ type: 'miss', x: rocket.x, y: rocket.y });
  };

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.rocketsLeft === 0 && state.rocket === null;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      for (const ring of state.rings) {
        ring.age += dt;
        if (ring.lit) continue;
        ring.x += ring.vx * dt;
        if (ring.x < 60 || ring.x > arena.width - 60) {
          ring.vx *= -1;
          ring.x = Math.min(arena.width - 60, Math.max(60, ring.x));
        }
      }
      // Lit rings fade, and new ones take their place.
      state.rings = state.rings.map((ring) => (ring.lit && ring.age > 1 ? newRing(rng, ring.colour) : ring));

      const rocket = state.rocket;
      if (!rocket) {
        const press = input.pressed ? (input.pointer ?? input.taps[0] ?? null) : null;
        if (press && state.rocketsLeft > 0) {
          state.rocket = { x: Math.min(arena.width - 30, Math.max(30, press.x)), y: launchY, burst: -1, lit: 0, colour: Math.floor(state.time * 7) % 4 };
          state.rocketsLeft -= 1;
          events.push({ type: 'action', x: press.x, y: launchY });
          // A quick tap is let go at once: it bursts low, right away.
          if (!input.pointer) burst(state.rocket);
        }
        return;
      }
      if (rocket.burst >= 0) {
        rocket.burst += dt;
        if (rocket.burst >= BURST_SECONDS) state.rocket = null;
        return;
      }
      rocket.y -= RISE * dt;
      if (!input.pointer || input.released || rocket.y <= HUD_SAFE_TOP + 20) burst(rocket);
    },
  };
}

/** Good play: launch under the ring that will have the most company, let go when the rocket reaches it. */
export function fireworksBot(state: FireworksState, _context: BotContext): BotMove {
  const rocket = state.rocket;
  if (rocket) {
    if (rocket.burst >= 0) return {};
    const target = state.rings.filter((r) => !r.lit).sort((a, b) => Math.abs(a.x - rocket.x) - Math.abs(b.x - rocket.x))[0];
    // Let go on the decision closest to the ring's height (the rocket climbs about 52 units between two).
    if (!target || rocket.y - RISE * 0.05 <= target.y) return {};
    return { touch: { x: rocket.x, y: rocket.y } };
  }
  if (state.rocketsLeft === 0) return {};
  const open = state.rings.filter((r) => !r.lit);
  const best = open
    .map((ring) => {
      const rise = (state.launchY - ring.y) / RISE;
      const x = ring.x + ring.vx * rise;
      const company = open.filter((o) => Math.hypot(o.x + o.vx * rise - x, o.y - ring.y) <= BURST_REACH - 10).length;
      return { x, company };
    })
    .sort((a, b) => b.company - a.company)[0];
  return best ? { touch: { x: best.x, y: state.launchY } } : {};
}
