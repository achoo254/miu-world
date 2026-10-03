// High dive: the child stands at the end of a diving board over the pool. A tap jumps; she tucks and somersaults
// as she falls. A second tap opens her out straight; she stops spinning (and, if she is close, straightens to
// head first). Entering the water head first is a clean dive (a point and a small splash); feet, back or belly
// first is a big funny "splat", no point. Eight dives from boards of different heights; then the round ends.
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export type DivePhase = 'ready' | 'air' | 'splash';

export interface HighDiveState {
  phase: DivePhase;
  phaseAgo: number;
  /** Body angle (radians, 0 = head up, π = head down) and spin (rad/s). */
  angle: number;
  spin: number;
  opened: boolean;
  /** Board height (y of the board top), the diver's height now, the water line, and fall time. */
  boardY: number;
  y: number;
  waterY: number;
  fall: number;
  x: number;
  dives: number;
  lastClean: boolean;
  score: number;
  time: number;
}

export const DIVES = 8;
/** Head first within this angle (radians) is clean. */
export const CLEAN = 0.45;
/** Opening within this angle of head first straightens her the rest of the way. */
const ASSIST = 0.9;
const TUCK_SPIN = Math.PI * 2 * 0.95;
const SPLASH_SECONDS = 1.3;

/** Signed distance (radians) from head first. */
export const fromHeadFirst = (angle: number): number => {
  const d = (((angle - Math.PI) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2);
  return d - Math.PI;
};

export function createHighDive({ arena, rng }: GameSetup): MinigameLogic<HighDiveState> {
  const events = eventQueue();
  const waterY = arena.height - Math.max(110, arena.height * 0.16);
  const state: HighDiveState = {
    phase: 'ready',
    phaseAgo: 0,
    angle: 0,
    spin: 0,
    opened: false,
    boardY: 0,
    y: 0,
    waterY,
    fall: 1.5,
    x: arena.width * 0.42,
    dives: 0,
    lastClean: false,
    score: 0,
    time: 0,
  };
  const ready = (r: Rng): void => {
    const top = HUD_SAFE_TOP + 70;
    const share = r.range(0, 0.45);
    state.boardY = top + (waterY - top - 160) * share;
    state.y = state.boardY;
    // Higher boards give longer falls: 1.2 … 1.7 s.
    state.fall = 1.7 - 0.5 * share / 0.45;
    state.angle = 0;
    state.spin = 0;
    state.opened = false;
    state.phase = 'ready';
    state.phaseAgo = 0;
  };
  ready(rng);
  let fallSpeed = 0;
  let g = 0;

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.dives >= DIVES && state.phase === 'splash' && state.phaseAgo >= SPLASH_SECONDS - 0.01;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.phaseAgo += dt;
      const tapped = input.taps.some((t) => t.y > HUD_SAFE_TOP);
      if (state.phase === 'ready') {
        if (tapped) {
          state.phase = 'air';
          state.phaseAgo = 0;
          state.spin = TUCK_SPIN;
          // A little hop up, then down to the water in `fall` seconds.
          const h = waterY - state.boardY;
          g = (2 * (h + 40)) / (state.fall * state.fall) + 80;
          fallSpeed = -Math.sqrt(2 * g * 40);
          events.push({ type: 'action', x: state.x, y: state.boardY });
        }
        return;
      }
      if (state.phase === 'air') {
        if (tapped && !state.opened) {
          state.opened = true;
          events.push({ type: 'action', x: state.x, y: state.y, note: 79, voice: 'whistle' });
        }
        if (state.opened) {
          state.spin *= Math.exp(-10 * dt);
          const off = fromHeadFirst(state.angle);
          if (Math.abs(off) < ASSIST) state.angle -= off * Math.min(1, 7 * dt);
        }
        state.angle += state.spin * dt;
        fallSpeed += g * dt;
        state.y += fallSpeed * dt;
        if (state.y >= waterY) {
          state.y = waterY;
          state.dives += 1;
          state.lastClean = state.opened && Math.abs(fromHeadFirst(state.angle)) <= CLEAN;
          state.phase = 'splash';
          state.phaseAgo = 0;
          if (state.lastClean) {
            state.score += 1;
            events.push({ type: 'score', x: state.x, y: waterY - 40 });
          } else events.push({ type: 'hit', x: state.x, y: waterY, note: 43, voice: 'drum' });
        }
        return;
      }
      if (state.phaseAgo >= SPLASH_SECONDS && state.dives < DIVES) ready(rng);
    },
  };
}

/** Good play: jump after a breath, open up when the somersault comes round to head first. */
export function highDiveBot(state: HighDiveState, _context: BotContext): BotMove {
  const tap = { x: state.x, y: state.waterY - 200 };
  if (state.phase === 'ready') return state.phaseAgo > 0.4 ? { tap } : {};
  if (state.phase !== 'air' || state.opened) return {};
  const soon = fromHeadFirst(state.angle + state.spin * 0.05);
  return Math.abs(soon) < 0.4 ? { tap } : {};
}
