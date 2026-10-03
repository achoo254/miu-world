// Lantern parade (rước đèn Trung thu): the child walks in the night parade behind her friends, holding a
// star lantern. Holding the finger down walks faster, letting go slows down. Too fast and the candle
// flickers (the needle in the red); too long in the red and it goes out, and she stops to light it again.
// Mooncakes lie along the street: walking over one with the lantern lit picks it up (a point). Falling too
// far behind the friends, the mooncakes they pass are taken by others. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { BotContext, BotMove, GameInput, GameSetup, MinigameLogic } from '../../types';

export interface LanternParadeState {
  /** Her distance along the street and speed; the friends' (the parade's) distance and speed. */
  x: number;
  speed: number;
  paradeX: number;
  paradeSpeed: number;
  holding: boolean;
  /** Seconds spent too fast (the flame flickers); seconds left to light the candle again (0: lit). */
  flicker: number;
  relight: number;
  /** Mooncakes along the street: where, and whether picked up (1), taken by others (2) or still there (0). */
  cakes: { x: number; state: 0 | 1 | 2 }[];
  /** Seconds since the last cake was picked up. */
  pickedAgo: number;
  screenX: number;
  groundY: number;
  score: number;
  time: number;
}

/** Faster than this and the flame flickers. */
export const SAFE_SPEED = 175;
export const MAX_SPEED = 260;
const SPEED_UP = 230;
const SLOW_DOWN = 190;
const FLICKER_LIMIT = 1.0;
const RELIGHT_SECONDS = 2;
const CAKE_GAP = 380;
/** Cakes the parade has passed by this much are taken by others. */
export const LEFT_BEHIND = 420;
/** She cannot walk into the friends in front. */
const BEHIND_PARADE = 70;
const PICK = 34;

export function createLanternParade({ arena, duration, params, rng }: GameSetup): MinigameLogic<LanternParadeState> {
  const factor = typeof params.pace === 'number' ? Math.min(1.4, Math.max(0.7, params.pace)) : 1;
  const events = eventQueue();
  const cakes: LanternParadeState['cakes'] = [];
  for (let x = 520; x < 150 * duration + 1500; x += CAKE_GAP + rng.range(-60, 60)) cakes.push({ x, state: 0 });
  const state: LanternParadeState = {
    x: 0,
    speed: 0,
    paradeX: 260,
    paradeSpeed: 120,
    holding: false,
    flicker: 0,
    relight: 0,
    cakes,
    pickedAgo: 9,
    screenX: Math.min(260, arena.width * 0.28),
    groundY: arena.height - 130,
    score: 0,
    time: 0,
  };
  const phase = rng.range(0, 6);

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
      state.pickedAgo += dt;
      state.holding = input.pointer !== null;
      // The parade walks at a changing pace, now and then almost stopping.
      state.paradeSpeed = factor * Math.max(30, 128 + 55 * Math.sin(state.time * 0.45 + phase) + 25 * Math.sin(state.time * 1.3));
      state.paradeX += state.paradeSpeed * dt;

      if (state.relight > 0) {
        state.relight = Math.max(0, state.relight - dt);
        state.speed = 0;
        if (state.relight === 0) state.flicker = 0;
      } else {
        state.speed = state.holding ? Math.min(MAX_SPEED, state.speed + SPEED_UP * dt) : Math.max(0, state.speed - SLOW_DOWN * dt);
        state.flicker = state.speed > SAFE_SPEED ? state.flicker + dt : Math.max(0, state.flicker - dt * 1.5);
        if (state.flicker >= FLICKER_LIMIT) {
          state.relight = RELIGHT_SECONDS;
          state.speed = 0;
          events.push({ type: 'hit', x: state.screenX, y: state.groundY - 120 });
        }
      }
      state.x = Math.min(state.paradeX - BEHIND_PARADE, state.x + state.speed * dt);
      if (state.x >= state.paradeX - BEHIND_PARADE) state.speed = Math.min(state.speed, state.paradeSpeed);

      for (const c of state.cakes) {
        if (c.state !== 0) continue;
        if (state.relight === 0 && Math.abs(c.x - state.x) < PICK) {
          c.state = 1;
          state.score += 1;
          state.pickedAgo = 0;
          events.push({ type: 'score', x: state.screenX, y: state.groundY - 40 });
        } else if (state.paradeX - c.x > LEFT_BEHIND && c.x > state.x) {
          c.state = 2;
          events.push({ type: 'miss', x: state.screenX + c.x - state.x, y: state.groundY - 30 });
        }
      }
    },
  };
}

/** Good play: keep up with the friends, just under the flickering speed. */
export function lanternParadeBot(state: LanternParadeState, _context: BotContext): BotMove {
  if (state.relight > 0) return {};
  const gap = state.paradeX - state.x;
  const hold = state.speed < (gap > 200 ? 150 : 110) && gap > 110;
  return hold ? { touch: { x: 300, y: 400 } } : {};
}
