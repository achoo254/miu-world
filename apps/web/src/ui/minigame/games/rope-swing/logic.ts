// Rope swing: a monkey crosses a jungle river from tree stump to tree stump on vines. Holding the screen hooks
// a vine onto the nearest hook ahead (it waits for one to come in reach) and the monkey swings; letting go
// flies it off with the swing's speed. A gentle push along the swing keeps it moving forward, so a child who
// lets go on the forward upswing always gets on. Passing a stump is a stage; a fall into the river puts the
// monkey back on the last stump. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export interface Hook {
  x: number;
  y: number;
}

export interface Stump {
  x: number;
  /** Top of the stump. */
  y: number;
  half: number;
  /** Passed by the monkey (bananas taken). */
  reached: boolean;
}

export interface RopeSwingState {
  riverY: number;
  /** World x shown at the left edge. */
  cameraX: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Index of the hook it hangs from, or -1. */
  hooked: number;
  ropeLength: number;
  /** Standing on a stump (index), or -1 in the air. */
  standing: number;
  /** The stump it starts from after a fall. */
  checkpoint: number;
  /** Seconds left before it comes back after a splash (0 when playing). */
  splashed: number;
  hooks: Hook[];
  stumps: Stump[];
  score: number;
  time: number;
}

const GRAVITY = 1500;
/** Push along the swing, forward only (units/s²). */
const ASSIST = 260;
const MAX_SPEED = 950;
const MIN_ROPE = 110;
const MAX_ROPE = 320;
export const REACH = 360;
const SPLASH_SECONDS = 0.9;
const STUMP_HALF = 80;
const HOOKS_PER_STAGE = 3;
const WALK = 220;
const PLAY_HEIGHT = 400;

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/**
 * The hook a press would catch: the nearest one in reach that is not behind the monkey (from a stump, only
 * ones ahead of it), or -1.
 */
export function catchableHook(state: RopeSwingState, reach = REACH): number {
  let best = -1;
  let bestD = Infinity;
  const behind = state.standing >= 0 ? -60 : 40;
  state.hooks.forEach((h, i) => {
    const d = Math.hypot(h.x - state.x, h.y - state.y);
    if (d <= reach && h.x > state.x - behind && h.y < state.y - 30 && d < bestD) {
      best = i;
      bestD = d;
    }
  });
  return best;
}

export function createRopeSwing({ arena, params, rng }: GameSetup): MinigameLogic<RopeSwingState> {
  const reachFactor = typeof params.reach === 'number' ? clamp(params.reach, 0.8, 1.3) : 1;
  const reach = REACH * reachFactor;
  const events = eventQueue();
  // The same 400-unit band on every screen: centred on a tall one, under the HUD on a wide one.
  const riverY = Math.min(arena.height - 50, Math.max(HUD_SAFE_TOP + 40 + PLAY_HEIGHT, arena.height / 2 + PLAY_HEIGHT / 2));
  const bandTop = riverY - PLAY_HEIGHT;
  const stumpTop = riverY - 120;
  const state: RopeSwingState = {
    riverY,
    cameraX: -arena.width * 0.3,
    x: 0,
    y: stumpTop,
    vx: 0,
    vy: 0,
    hooked: -1,
    ropeLength: 0,
    standing: 0,
    checkpoint: 0,
    splashed: 0,
    hooks: [],
    stumps: [{ x: 0, y: stumpTop, half: STUMP_HALF, reached: true }],
    score: 0,
    time: 0,
  };

  /** Lays the hooks of one stage after the last stump, and the stump that ends it. */
  function layStage(): void {
    const last = state.stumps[state.stumps.length - 1];
    if (!last) return;
    let x = last.x + rng.range(130, 170);
    for (let i = 0; i < HOOKS_PER_STAGE; i += 1) {
      if (i > 0) x += rng.range(240, 290);
      state.hooks.push({ x, y: bandTop + rng.range(0, 90) });
    }
    state.stumps.push({ x: x + rng.range(200, 240), y: stumpTop + rng.range(-30, 20), half: STUMP_HALF, reached: false });
  }
  for (let i = 0; i < 3; i += 1) layStage();

  const hookInReach = (): number => catchableHook(state, reach);

  function grab(index: number): void {
    const hook = state.hooks[index];
    if (!hook) return;
    state.hooked = index;
    state.standing = -1;
    // Never so long that the bottom of the swing dips into the river.
    state.ropeLength = clamp(Math.hypot(hook.x - state.x, hook.y - state.y), MIN_ROPE, Math.min(MAX_ROPE, state.riverY - 70 - hook.y));
    events.push({ type: 'action', x: hook.x - state.cameraX, y: hook.y });
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
      const holding = input.pointer !== null;

      if (state.splashed > 0) {
        state.splashed -= dt;
        if (state.splashed <= 0) {
          const stump = state.stumps[state.checkpoint];
          state.splashed = 0;
          state.standing = state.checkpoint;
          state.x = stump?.x ?? 0;
          state.y = stump?.y ?? state.riverY - 120;
          state.vx = 0;
          state.vy = 0;
        }
      } else {
        if (holding && state.hooked < 0) {
          const index = hookInReach();
          if (index >= 0) grab(index);
        }
        if (!holding && state.hooked >= 0) {
          state.hooked = -1;
          state.vx *= 1.05;
          state.vy *= 1.05;
          events.push({ type: 'action', x: state.x - state.cameraX, y: state.y });
        }

        const stand = state.stumps[state.standing];
        if (stand) {
          // On a stump: walks to its middle, ready to catch the next hook.
          state.x += Math.max(-WALK * dt, Math.min(WALK * dt, stand.x - state.x));
        } else {
          const before = state.y;
          state.vy += GRAVITY * dt;
          const hook = state.hooks[state.hooked];
          if (hook) {
            // Forward push along the swing.
            const rx = state.x - hook.x;
            const ry = state.y - hook.y;
            const len = Math.hypot(rx, ry) || 1;
            let tx = -ry / len;
            let ty = rx / len;
            if (tx < 0) {
              tx = -tx;
              ty = -ty;
            }
            if (state.vx * tx + state.vy * ty > -40) {
              state.vx += tx * ASSIST * dt;
              state.vy += ty * ASSIST * dt;
            }
          }
          const speed = Math.hypot(state.vx, state.vy);
          if (speed > MAX_SPEED) {
            state.vx *= MAX_SPEED / speed;
            state.vy *= MAX_SPEED / speed;
          }
          state.x += state.vx * dt;
          state.y += state.vy * dt;
          if (hook) {
            // The vine: never longer than its length; the outward speed is taken away.
            const rx = state.x - hook.x;
            const ry = state.y - hook.y;
            const len = Math.hypot(rx, ry) || 1;
            if (len > state.ropeLength) {
              const nx = rx / len;
              const ny = ry / len;
              state.x = hook.x + nx * state.ropeLength;
              state.y = hook.y + ny * state.ropeLength;
              const out = state.vx * nx + state.vy * ny;
              if (out > 0) {
                state.vx -= out * nx;
                state.vy -= out * ny;
              }
            }
          } else if (state.vy > 0) {
            // Lands on a stump top while falling (or scrambles up when it comes in just under the edge).
            state.stumps.forEach((s, i) => {
              const onTop = before <= s.y && state.y >= s.y;
              const atEdge = state.y > s.y && state.y < s.y + 50;
              if (state.standing < 0 && (onTop || atEdge) && Math.abs(state.x - s.x) <= s.half) {
                state.standing = i;
                state.y = s.y;
                state.vx = 0;
                state.vy = 0;
                events.push({ type: 'action', x: state.x - state.cameraX, y: s.y });
              }
            });
          }
        }

        // A stump passed (flown over or landed on) is a stage won.
        state.stumps.forEach((s, i) => {
          if (!s.reached && state.x >= s.x - s.half * 0.5 && state.y < state.riverY) {
            s.reached = true;
            state.checkpoint = i;
            state.score += 1;
            events.push({ type: 'score', x: s.x - state.cameraX, y: s.y - 60 });
          }
        });

        if (state.y > state.riverY) {
          state.hooked = -1;
          state.splashed = SPLASH_SECONDS;
          events.push({ type: 'miss', x: state.x - state.cameraX, y: state.riverY });
        }
      }

      const last = state.stumps[state.stumps.length - 1];
      if (last && last.x - state.x < arena.width * 2) layStage();
      const wantCamera = state.x - arena.width * 0.35;
      state.cameraX += (wantCamera - state.cameraX) * Math.min(1, dt * 5);
    },
  };
}

/** Where a monkey let go now would fly: does it come within reach of a hook ahead, or down onto a stump? */
function flightLands(state: RopeSwingState, from: number): boolean {
  const vx = state.vx * 1.05;
  const vy = state.vy * 1.05;
  const nextHook = state.hooks.find((h) => h.x > from + 60);
  const stump = state.stumps.find((s) => !s.reached || s.x > state.x);
  let lastY = state.y;
  for (let t = 0.02; t < 1.4; t += 0.02) {
    const px = state.x + vx * t;
    const py = state.y + vy * t + 0.5 * GRAVITY * t * t;
    if (py > state.riverY) return false;
    if (nextHook && Math.hypot(nextHook.x - px, nextHook.y - py) < REACH * 0.85 && nextHook.y < py - 60 && vy + GRAVITY * t > -150) return true;
    if (stump && Math.abs(px - stump.x) < stump.half * 0.7 && lastY <= stump.y && py >= stump.y) return true;
    lastY = py;
  }
  return false;
}

/** Good play: hook on when a hook is in reach, let go on the forward upswing when the flight reaches what is next. */
export function ropeSwingBot(state: RopeSwingState, _context: BotContext): BotMove {
  const hold = { touch: { x: 300, y: 400 } };
  if (state.splashed > 0) return {};
  const hook = state.hooks[state.hooked];
  if (hook) return state.vx > 150 && state.x > hook.x && flightLands(state, hook.x) ? {} : hold;
  if (state.standing >= 0) return hold;
  // In the air: let it come down onto a stump right below, else catch the next hook once it is in reach.
  const stump = state.stumps.find((s) => s.x > state.x - s.half);
  if (stump && Math.abs(stump.x - state.x) < stump.half && state.vy > 0) return {};
  return catchableHook(state, REACH * 0.92) >= 0 ? hold : {};
}
