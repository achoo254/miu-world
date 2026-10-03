// Package drop: a plane flies across the top again and again; a tap drops a gift that opens a parachute and
// drifts down, still carried forward by the plane's speed, so it must be dropped early (before the plane is
// over the target). The target is a house on an island or a boat bobbing on the water, marked with a ring.
// Twelve gifts; each one that lands on the target is a point. A gift falls in the same time on every screen.
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export type TargetKind = 'house' | 'boat';

export interface Target {
  kind: TargetKind;
  x: number;
  /** Units per second (boats drift to and fro; houses stand still). */
  vx: number;
  /** Seconds since it got a gift (a happy hop), or since it appeared. */
  gotAgo: number;
  bornAgo: number;
}

export interface Gift {
  x0: number;
  y0: number;
  /** Forward speed it left the plane with. */
  vx: number;
  /** Seconds since it was dropped. */
  age: number;
  /** Where it lands, and how it ended: on the target or in the water (null while falling). */
  result: 'hit' | 'splash' | null;
  /** Seconds since it landed. */
  after: number;
}

export interface PackageDropState {
  planeX: number;
  planeY: number;
  planeSpeed: number;
  /** The water line targets float on. */
  seaY: number;
  target: Target;
  gift: Gift | null;
  giftsLeft: number;
  score: number;
  time: number;
}

export const GIFTS = 12;
/** Seconds a gift takes from the plane to the water, on every screen. */
export const FALL_SECONDS = 1.5;
/** How quickly a gift loses the plane's forward speed under its parachute (seconds). */
const DRIFT_TAU = 0.6;
/** The gift keeps this share of the plane's speed when it leaves. */
const CARRY = 0.85;
/** Half the width that counts as landing on the target: wider than the picture. */
export const CATCH_HALF = 72;
const SPEED_START = 240;
const SPEED_END = 310;
const BOAT_SPEED = 45;
/** Seconds a landed gift stays on screen before the next one may fall. */
const AFTER_SECONDS = 0.7;

/** How far forward a gift dropped at `vx` travels while it falls. */
export const leadFor = (vx: number): number => vx * DRIFT_TAU * (1 - Math.exp(-FALL_SECONDS / DRIFT_TAU));

/** Where a gift is `age` seconds after leaving the plane: a quick drop, then a gentle float under the parachute. */
export function giftPosition(gift: Gift, seaY: number): { x: number; y: number } {
  const u = Math.min(1, gift.age / FALL_SECONDS);
  const ease = 1 - (1 - u) ** 1.35;
  return { x: gift.x0 + gift.vx * DRIFT_TAU * (1 - Math.exp(-Math.min(gift.age, FALL_SECONDS) / DRIFT_TAU)), y: gift.y0 + (seaY - gift.y0) * ease };
}

export function createPackageDrop({ arena, duration, params, rng }: GameSetup): MinigameLogic<PackageDropState> {
  const factor = typeof params.speed === 'number' ? Math.min(1.4, Math.max(0.7, params.speed)) : 1;
  const events = eventQueue();
  const seaY = arena.height - 95;
  const maxLead = leadFor(SPEED_END * factor * CARRY);
  const minX = Math.min(arena.width - 120, maxLead + 60);
  const maxX = arena.width - 70;

  const newTarget = (previous: number | null): Target => {
    let x = rng.range(minX, maxX);
    // Somewhere new: not right where the last gift went.
    if (previous !== null && Math.abs(x - previous) < 150) x = x < (minX + maxX) / 2 ? Math.min(maxX, x + 200) : Math.max(minX, x - 200);
    const kind: TargetKind = rng.chance(0.5) ? 'boat' : 'house';
    return { kind, x, vx: kind === 'boat' ? (rng.chance(0.5) ? 1 : -1) * BOAT_SPEED : 0, gotAgo: 9, bornAgo: 0 };
  };

  const state: PackageDropState = {
    planeX: -60,
    planeY: HUD_SAFE_TOP + 70,
    planeSpeed: SPEED_START * factor,
    seaY,
    target: newTarget(null),
    gift: null,
    giftsLeft: GIFTS,
    score: 0,
    time: 0,
  };

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.giftsLeft === 0 && state.gift === null;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      const progress = Math.min(1, state.time / duration);
      state.planeSpeed = (SPEED_START + (SPEED_END - SPEED_START) * progress) * factor;
      state.planeX += state.planeSpeed * dt;
      if (state.planeX > arena.width + 90) state.planeX = -90;

      const target = state.target;
      target.gotAgo += dt;
      target.bornAgo += dt;
      if (target.kind === 'boat') {
        target.x += target.vx * dt;
        if (target.x < minX || target.x > maxX) {
          target.vx *= -1;
          target.x = Math.min(maxX, Math.max(minX, target.x));
        }
      }

      // A touch drops a gift, when none is falling and the plane is over the sea.
      const wantsDrop = input.pressed || input.taps.length > 0;
      if (wantsDrop && !state.gift && state.giftsLeft > 0 && state.planeX > 0 && state.planeX < arena.width) {
        state.gift = { x0: state.planeX, y0: state.planeY + 30, vx: state.planeSpeed * CARRY, age: 0, result: null, after: 0 };
        state.giftsLeft -= 1;
        events.push({ type: 'action', x: state.planeX, y: state.planeY + 30 });
      }

      const gift = state.gift;
      if (!gift) return;
      if (gift.result === null) {
        gift.age += dt;
        if (gift.age >= FALL_SECONDS) {
          const { x } = giftPosition(gift, seaY);
          if (Math.abs(x - target.x) <= CATCH_HALF) {
            gift.result = 'hit';
            state.score += 1;
            target.gotAgo = 0;
            events.push({ type: 'score', x: target.x, y: seaY - 60 });
          } else {
            gift.result = 'splash';
            events.push({ type: 'miss', x, y: seaY });
          }
        }
        return;
      }
      gift.after += dt;
      if (gift.after >= AFTER_SECONDS) {
        if (gift.result === 'hit') state.target = newTarget(target.x);
        state.gift = null;
      }
    },
  };
}

/** Where the target will be after `seconds`, bouncing between its bounds like the game moves it. */
function targetAfter(state: PackageDropState, seconds: number, arenaWidth: number): number {
  const { target } = state;
  if (target.vx === 0) return target.x;
  const x = target.x + target.vx * seconds;
  // Close enough for a bot: a boat seldom turns during one fall.
  return Math.min(arenaWidth - 70, Math.max(0, x));
}

/** Good play: drop when the gift, carried forward, will land on where the target will be. */
export function packageDropBot(state: PackageDropState, context: BotContext): BotMove {
  if (state.gift || state.giftsLeft === 0 || state.planeX <= 0) return {};
  const landing = state.planeX + leadFor(state.planeSpeed * CARRY);
  const aim = targetAfter(state, FALL_SECONDS, context.arena.width);
  // The plane moves about a tenth of its speed between two decisions: drop on the closest one.
  return Math.abs(landing - aim) <= state.planeSpeed * 0.06 ? { tap: { x: context.arena.width / 2, y: context.arena.height / 2 } } : {};
}
