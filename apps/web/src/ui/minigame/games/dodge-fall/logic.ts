// Dodge fall: the child stands under a big tree; nuts (chestnuts in the forest, coconuts on the beach,
// snowballs on the mountain) drop from the branches, each with a shadow on the ground that grows and darkens
// as it comes. She drags to run left and right out from under them. Stars fall too and stay twinkling on the
// ground a moment: running over one picks it up. A hit dazes her for a second and costs one of three
// hearts. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { SpriteName } from '../../sprites';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export type FallKind = 'nut' | 'star';

export interface Faller {
  kind: FallKind;
  x: number;
  /** Seconds since it left the branch, and how long the drop takes. */
  t: number;
  fall: number;
  /** Seconds it has lain on the ground (stars wait to be picked up); -1 while falling. */
  landed: number;
  /** Picked up or bumped into the child. */
  done: boolean;
}

export interface DodgeState {
  branchY: number;
  groundY: number;
  playerX: number;
  /** Seconds of daze left after a hit (she cannot move). */
  dazed: number;
  /** Seconds since the last hit (blink while protected). */
  hitAgo: number;
  /** Direction she last ran (-1, 1), for facing. */
  facing: number;
  fallers: Faller[];
  lives: number;
  score: number;
  time: number;
}

const LIVES = 3;
const RUN_SPEED = 820;
const DAZE_SECONDS = 1;
/** Protected this long after a hit: one nut, one heart. */
const PROTECT_SECONDS = 1.6;
/** A nut hits when it lands this close; small, so a near miss is a miss. */
export const NUT_REACH = 56;
export const STAR_REACH = 70;
const STAR_WAIT = 2.2;
const NUT_GAP_START = 0.75;
const NUT_GAP_END = 0.45;
const STAR_GAP = 2.0;
const FALL_START = 1.5;
const FALL_END = 1.1;

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** The nut picture of each map's theme. */
export function nutSprite(theme: string): SpriteName {
  if (theme === 'beach' || theme === 'river') return 'coconut';
  if (theme === 'snow') return 'snowflake';
  if (theme === 'town' || theme === 'castle') return 'red-apple';
  return 'chestnut';
}

export function createDodgeFall({ arena, duration, params, rng }: GameSetup): MinigameLogic<DodgeState> {
  const factor = typeof params.speed === 'number' ? clamp(params.speed, 0.6, 1.5) : 1;
  const events = eventQueue();
  const groundY = Math.min(arena.height - 70, Math.max(HUD_SAFE_TOP + 430, arena.height / 2 + 230));
  const margin = 60;
  const state: DodgeState = {
    branchY: groundY - 400,
    groundY,
    playerX: arena.width / 2,
    dazed: 0,
    hitAgo: 9,
    facing: 1,
    fallers: [],
    lives: LIVES,
    score: 0,
    time: 0,
  };
  let nextNut = 0.8;
  let nextStar = 1.2;

  const progress = (): number => Math.min(1, state.time / duration);
  const fallTime = (): number => (FALL_START + (FALL_END - FALL_START) * progress()) / factor;

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
      state.dazed = Math.max(0, state.dazed - dt);
      state.hitAgo += dt;

      const aim = input.pointer?.x ?? input.taps.at(-1)?.x;
      if (aim !== undefined && state.dazed <= 0) {
        const want = clamp(aim, margin, arena.width - margin) - state.playerX;
        const move = clamp(want, -RUN_SPEED * dt, RUN_SPEED * dt);
        if (Math.abs(move) > 0.5) state.facing = Math.sign(move);
        state.playerX += move;
      }

      nextNut -= dt;
      if (nextNut <= 0) {
        // Half aim near where she stands (so standing still is never safe), half anywhere.
        const near = rng.chance(0.5);
        const x = near ? state.playerX + rng.range(-90, 90) : rng.range(margin, arena.width - margin);
        state.fallers.push({ kind: 'nut', x: clamp(x, margin, arena.width - margin), t: 0, fall: fallTime(), landed: -1, done: false });
        nextNut += (NUT_GAP_START + (NUT_GAP_END - NUT_GAP_START) * progress()) / factor;
      }
      nextStar -= dt;
      if (nextStar <= 0) {
        // Stars land away from where she is: she has to run for them.
        let x = rng.range(margin, arena.width - margin);
        if (Math.abs(x - state.playerX) < 160) x = clamp(state.playerX + (x < state.playerX ? -1 : 1) * rng.range(180, 320), margin, arena.width - margin);
        state.fallers.push({ kind: 'star', x, t: 0, fall: fallTime() * 0.9, landed: -1, done: false });
        nextStar += STAR_GAP * rng.range(0.85, 1.15);
      }

      for (const f of state.fallers) {
        if (f.done) continue;
        if (f.landed < 0) {
          f.t += dt;
          if (f.t >= f.fall) {
            f.landed = 0;
            if (f.kind === 'nut') {
              f.done = true;
              if (Math.abs(f.x - state.playerX) < NUT_REACH && state.hitAgo > PROTECT_SECONDS) {
                state.lives -= 1;
                state.dazed = DAZE_SECONDS;
                state.hitAgo = 0;
                events.push({ type: 'hit', x: state.playerX, y: groundY - 80 });
              } else events.push({ type: 'miss', x: f.x, y: groundY });
            }
          }
        } else {
          f.landed += dt;
          if (f.landed > STAR_WAIT) f.done = true;
        }
        if (f.kind === 'star' && !f.done && f.t > f.fall * 0.85 && Math.abs(f.x - state.playerX) < STAR_REACH) {
          f.done = true;
          f.landed = Math.max(0, f.landed);
          state.score += 1;
          events.push({ type: 'score', x: f.x, y: groundY - 60 });
        }
      }
      state.fallers = state.fallers.filter((f) => !f.done || (f.landed >= 0 && f.landed < 0.6 && f.kind === 'nut'));
    },
  };
}

/** Good play: run for the nearest star along a path no nut lands on while she passes. */
export function dodgeBot(state: DodgeState, context: BotContext): BotMove {
  const { width } = context.arena;
  const nuts = state.fallers.filter((f) => f.kind === 'nut' && f.landed < 0 && f.fall - f.t < 1);
  const wait = state.dazed;
  /** Nuts that would land on her if she ran straight for x from now. */
  const danger = (x: number): number =>
    nuts.filter((f) => {
      const at = f.fall - f.t;
      const run = Math.max(0, at - wait) * RUN_SPEED;
      const pos = state.playerX + Math.sign(x - state.playerX) * Math.min(Math.abs(x - state.playerX), run);
      return Math.abs(pos - f.x) < NUT_REACH + 25;
    }).length;
  const stars = state.fallers.filter((f) => f.kind === 'star' && !f.done).sort((a, b) => Math.abs(a.x - state.playerX) - Math.abs(b.x - state.playerX));
  const goal = stars[0]?.x ?? state.playerX;
  let best = state.playerX;
  let bestCost = Infinity;
  for (let x = 60; x <= width - 60; x += 15) {
    const cost = danger(x) * 10000 + Math.abs(x - goal);
    if (cost < bestCost) {
      bestCost = cost;
      best = x;
    }
  }
  return { touch: { x: best, y: state.groundY - 60 } };
}
