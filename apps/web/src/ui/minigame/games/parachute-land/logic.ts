// Parachute land: the child floats down to a little island under a parachute while the wind pushes her
// sideways (a steady breeze plus gusts, a new wind every jump). Holding a finger to one side steers her
// that way. Landing on the X is two points, near it one; a far landing or a splash in the sea is none, and the
// next jump comes. Eight jumps. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export type Landing = 'bullseye' | 'near' | 'far' | 'sea';

export interface ParachuteState {
  x: number;
  y: number;
  startY: number;
  groundY: number;
  /** Units per second down. */
  vy: number;
  /** Wind for this jump (units/s, + = right) and the gust on top of it now. */
  breeze: number;
  wind: number;
  /** Island from left to right, and the X on it. */
  island: { x0: number; x1: number };
  target: number;
  /** Seconds since landing; -1 while in the air. */
  landedAgo: number;
  landing: Landing | null;
  /** Sideways steering now (for the tilt). */
  steer: number;
  jumps: number;
  score: number;
  time: number;
}

export const JUMPS = 8;
export const BULLSEYE = 38;
export const NEAR = 100;
const DESCENT_SECONDS = 5;
export const STEER_GAIN = 3;
const STEER_MAX = 180;
const PAUSE_SECONDS = 1.3;

export function createParachuteLand({ arena, rng }: GameSetup): MinigameLogic<ParachuteState> {
  const events = eventQueue();
  const groundY = arena.height - 95;
  const startY = HUD_SAFE_TOP + 40;
  const state: ParachuteState = {
    x: arena.width / 2,
    y: startY,
    startY,
    groundY,
    vy: (groundY - startY) / DESCENT_SECONDS,
    breeze: 0,
    wind: 0,
    island: { x0: arena.width * 0.12, x1: arena.width * 0.88 },
    target: arena.width / 2,
    landedAgo: -1,
    landing: null,
    steer: 0,
    jumps: 0,
    score: 0,
    time: 0,
  };

  function jump(): void {
    const { x0, x1 } = state.island;
    state.breeze = rng.range(40, 110) * (rng.chance(0.5) ? -1 : 1);
    state.wind = state.breeze;
    state.x = rng.range(arena.width * 0.25, arena.width * 0.75);
    state.y = startY;
    // Where the wind alone would carry her: the X is never there.
    const drift = state.x + state.breeze * DESCENT_SECONDS;
    let target = rng.range(x0 + 50, x1 - 50);
    for (let tries = 0; tries < 30 && Math.abs(target - drift) < 170; tries += 1) target = rng.range(x0 + 50, x1 - 50);
    if (Math.abs(target - drift) < 170) target = drift > (x0 + x1) / 2 ? x0 + 50 : x1 - 50;
    state.target = target;
    state.landedAgo = -1;
    state.landing = null;
  }

  function land(): void {
    const d = Math.abs(state.x - state.target);
    const onIsland = state.x >= state.island.x0 && state.x <= state.island.x1;
    state.landing = !onIsland ? 'sea' : d <= BULLSEYE ? 'bullseye' : d <= NEAR ? 'near' : 'far';
    state.landedAgo = 0;
    state.jumps += 1;
    const points = state.landing === 'bullseye' ? 2 : state.landing === 'near' ? 1 : 0;
    if (points > 0) {
      state.score += points;
      events.push({ type: 'score', x: state.x, y: state.groundY - 60, points });
    } else {
      events.push({ type: 'miss', x: state.x, y: state.groundY });
    }
  }

  jump();

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.jumps >= JUMPS && state.landedAgo > PAUSE_SECONDS;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      if (state.landedAgo >= 0) {
        state.landedAgo += dt;
        if (state.landedAgo > PAUSE_SECONDS && state.jumps < JUMPS) jump();
        return;
      }
      state.wind = state.breeze + Math.sin(state.time * 1.7) * 22;
      const p = input.pointer;
      state.steer = p ? Math.max(-STEER_MAX, Math.min(STEER_MAX, (p.x - state.x) * STEER_GAIN)) : 0;
      state.x = Math.max(20, Math.min(arena.width - 20, state.x + (state.steer + state.wind) * dt));
      state.y += state.vy * dt;
      if (state.y >= state.groundY) {
        state.y = state.groundY;
        land();
      }
    },
  };
}

/** Good play: holds a finger upwind of the X so the steering just cancels the wind there. */
export function parachuteBot(state: ParachuteState, _context: BotContext): BotMove {
  if (state.landedAgo >= 0) return {};
  return { touch: { x: state.target - state.wind / STEER_GAIN, y: Math.min(state.groundY - 40, state.y + 160) } };
}
