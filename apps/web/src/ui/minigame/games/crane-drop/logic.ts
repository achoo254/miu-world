// Crane drop (like Tower Bloxx): a house floor swings on the crane's rope like a pendulum; a tap lets go and
// it falls straight down onto the tower. Landing over the top floor builds the tower one floor higher (a
// point); landing off it, the floor tumbles down (one of three hearts). Floors landed off-centre make the
// tower sway more, an exact landing calms it. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export interface CraneFloor {
  /** Offset from the floor below's centre (world units). */
  offset: number;
  style: number;
}

export interface Falling {
  x: number;
  /** Screen y of the floor's top and its downward speed. */
  y: number;
  vy: number;
  style: number;
  /** Seconds since it landed off the tower (-1 while falling): it tumbles away. */
  missed: number;
  missDir: number;
}

export interface CraneDropState {
  floors: CraneFloor[];
  /** The crane's pivot (screen), rope length, widest swing (radians), the swing's phase and its speed. */
  pivotX: number;
  pivotY: number;
  rope: number;
  swing: number;
  phase: number;
  omega: number;
  /** The tower's base centre; the top sways by `sway` units around the stacked offsets. */
  baseX: number;
  /** Where the base is sliding to, so a drifting tower stays on screen. */
  baseTarget: number;
  sway: number;
  /** Screen y the top of the tower is kept at, and the floor size. */
  topY: number;
  floorW: number;
  floorH: number;
  /** The floor on the hook (style), or null while one falls / before the next is hooked. */
  hooked: number | null;
  falling: Falling | null;
  hookIn: number;
  /** Seconds since a landing and how close it was (for "Đẹp!"). */
  landedAgo: number;
  exact: boolean;
  lives: number;
  score: number;
  time: number;
}

const LIVES = 3;
const GRAVITY = 1500;
/** A landing this close to the centre is exact (the sway calms). */
export const EXACT = 12;
const SWAY_MAX = 70;

const angle = (s: CraneDropState, ahead: number): number => s.swing * Math.sin(s.phase + s.omega * ahead);
/** Where the hooked floor's top centre is, now or `ahead` seconds from now. */
export const hookX = (s: CraneDropState, ahead = 0): number => s.pivotX + Math.sin(angle(s, ahead)) * s.rope;
export const hookY = (s: CraneDropState, ahead = 0): number => s.pivotY + Math.cos(angle(s, ahead)) * s.rope;
/** The tower top's centre x at round time t. */
export const towerX = (s: CraneDropState, t = s.time): number => s.baseX + s.floors.reduce((sum, f) => sum + f.offset, 0) + s.sway * Math.sin(t * 1.7);
/** Seconds a floor let go now (or `ahead` seconds from now) takes to reach the tower top. */
export const fallSeconds = (s: CraneDropState, ahead = 0): number => Math.sqrt((2 * Math.max(0, s.topY - s.floorH - hookY(s, ahead))) / GRAVITY);

export function createCraneDrop({ arena, duration, params, rng }: GameSetup): MinigameLogic<CraneDropState> {
  const factor = typeof params.speed === 'number' ? Math.min(1.5, Math.max(0.6, params.speed)) : 1;
  const events = eventQueue();
  const floorW = Math.min(170, arena.width * 0.3);
  // A long rope from above the screen: the floor swings wide but hangs at about the same height.
  const swing = 0.72;
  const rope = Math.min(225, arena.width * 0.36) / Math.sin(swing);
  const hookLow = HUD_SAFE_TOP + 150;
  const pivotY = hookLow - rope;
  const state: CraneDropState = {
    floors: [],
    pivotX: arena.width / 2,
    pivotY,
    rope,
    swing,
    omega: 2.6 * factor,
    phase: rng.range(0, Math.PI * 2),
    baseX: arena.width / 2,
    baseTarget: arena.width / 2,
    sway: 0,
    topY: Math.max(hookLow + 70 + 150, arena.height * 0.62),
    floorW,
    floorH: 70,
    hooked: 0,
    falling: null,
    hookIn: 0,
    landedAgo: 9,
    exact: false,
    lives: LIVES,
    score: 0,
    time: 0,
  };
  const progress = (): number => Math.min(1, state.time / duration);

  function land(f: Falling): void {
    const top = towerX(state);
    const offset = f.x - top;
    if (Math.abs(offset) > state.floorW * 0.62) {
      f.missed = 0;
      f.missDir = Math.sign(offset) || 1;
      state.lives -= 1;
      events.push({ type: 'hit', x: f.x, y: state.topY });
      return;
    }
    state.falling = null;
    state.floors.push({ offset: state.floors.length === 0 ? 0 : offset, style: f.style });
    // Keep the tower roughly centred on screen: the base slides under a drifting stack.
    state.baseTarget -= offset * 0.6;
    state.exact = Math.abs(offset) <= EXACT;
    state.sway = state.exact ? state.sway * 0.5 : Math.min(SWAY_MAX, state.sway + Math.abs(offset) * 0.35);
    state.landedAgo = 0;
    state.score += 1;
    state.hookIn = 0.45;
    events.push({ type: 'score', x: f.x, y: state.topY - state.floorH / 2, points: 1 });
  }

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.lives <= 0;
    },
    get lives() {
      return state.lives;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.landedAgo += dt;
      state.omega = (2.6 + 0.9 * progress()) * factor;
      state.phase += state.omega * dt;
      state.baseX += (state.baseTarget - state.baseX) * Math.min(1, dt * 2);
      if (state.hooked !== null && input.taps.length > 0) {
        state.falling = { x: hookX(state), y: hookY(state), vy: 0, style: state.hooked, missed: -1, missDir: 1 };
        state.hooked = null;
        events.push({ type: 'action', x: state.falling.x, y: state.falling.y });
      }
      const f = state.falling;
      if (f) {
        if (f.missed >= 0) {
          f.missed += dt;
          f.vy += GRAVITY * dt;
          f.y += f.vy * dt;
          f.x += f.missDir * 160 * dt;
          if (f.missed > 1) {
            state.falling = null;
            state.hookIn = 0.2;
          }
        } else {
          f.vy += GRAVITY * dt;
          f.y += f.vy * dt;
          if (f.y + state.floorH >= state.topY) {
            f.y = state.topY - state.floorH;
            land(f);
          }
        }
      }
      if (state.hooked === null && !state.falling) {
        state.hookIn -= dt;
        if (state.hookIn <= 0) state.hooked = (state.floors.length + 1) % 3;
      }
    },
  };
}

/** Good play: let go when the floor will land closest to the swaying top (next decision would be worse). */
export function craneDropBot(state: CraneDropState, _context: BotContext): BotMove {
  if (state.hooked === null) return {};
  const miss = (later: number): number => Math.abs(hookX(state, later) - towerX(state, state.time + later + fallSeconds(state, later)));
  const now = miss(0);
  return now <= EXACT || (miss(0.1) > now && now < state.floorW * 0.3) ? { tap: { x: state.pivotX, y: state.topY } } : {};
}
