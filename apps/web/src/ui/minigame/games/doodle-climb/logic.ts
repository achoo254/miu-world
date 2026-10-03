// Doodle climb: a frog bounces by itself on leaves and clouds; the child drags left and right to steer it onto
// the next one up. The view climbs with the frog; the score is the best height in metres. A frog that falls
// off the bottom is set back on the lowest pad in view (no hearts lost). Pads zigzag left and right, so a frog
// nobody steers keeps bouncing where it started. Later on some clouds drift, and a mushroom now and then
// bounces twice as high. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export type PadKind = 'leaf' | 'cloud';

export interface Pad {
  id: number;
  kind: PadKind;
  /** Centre x on screen; y in world units (up is negative, the start pad is at 0). */
  x: number;
  y: number;
  /** Half its width. */
  half: number;
  /** Units per second sideways (drifting clouds), 0 for still pads. */
  drift: number;
  spring: boolean;
  /** Seconds since the frog last bounced on it (a dip). */
  bounced: number;
}

export interface DoodleState {
  /** World y shown at the top of the screen. */
  cameraY: number;
  frogX: number;
  frogY: number;
  vx: number;
  vy: number;
  /** World y of the start pad, and the best (lowest) y the frog reached. */
  baseY: number;
  bestY: number;
  /** The pad it last bounced from. */
  lastPad: number;
  pads: Pad[];
  /** Seconds since it was set back after a fall (a blink). */
  respawned: number;
  /** Seconds since the last spring bounce (a spin). */
  sprung: number;
  score: number;
  time: number;
}

export const BOUNCE_SPEED = 1150;
const SPRING_SPEED = 1650;
export const GRAVITY = 2100;
const STEER_SPEED = 720;
/** World units per metre on the score. */
export const UNITS_PER_METRE = 40;
/** Pads keep this far from the middle column (more than the frog's reach), so idling never climbs. */
const SIDE_CLEAR = 100;
const FROG_HALF = 34;
/** The frog stays at or below this fraction of the screen while climbing. */
const CAMERA_FRACTION = 0.45;

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export function createDoodleClimb({ arena, duration, params, rng }: GameSetup): MinigameLogic<DoodleState> {
  const gapFactor = typeof params.gap === 'number' ? clamp(params.gap, 0.7, 1.3) : 1;
  const events = eventQueue();
  const margin = 70;
  const startY = 0;
  const screenFloor = arena.height - 90;
  const state: DoodleState = {
    cameraY: startY - screenFloor,
    frogX: arena.width / 2,
    frogY: startY,
    vx: 0,
    vy: -BOUNCE_SPEED,
    baseY: startY,
    bestY: startY,
    lastPad: 0,
    pads: [{ id: 0, kind: 'leaf', x: arena.width / 2, y: startY, half: 90, drift: 0, spring: false, bounced: 9 }],
    respawned: 9,
    sprung: 9,
    score: 0,
    time: 0,
  };
  let nextId = 1;
  let topY = startY;
  const centre = arena.width / 2;
  let side = rng.chance(0.5) ? 1 : -1;

  function layPad(r: Rng): void {
    const progress = Math.min(1, state.time / duration);
    const gap = r.range(130, 175 + 35 * progress) * gapFactor;
    const y = topY - gap;
    // Zigzag: pads take turns left and right of the middle, never over it, so the frog must be steered.
    side = -side;
    const x = side < 0 ? r.range(margin + 40, centre - SIDE_CLEAR) : r.range(centre + SIDE_CLEAR, arena.width - margin - 40);
    const cloud = progress > 0.15 && r.chance(0.35);
    const drift = cloud && progress > 0.3 && r.chance(0.5) ? r.range(40, 80) * (r.chance(0.5) ? 1 : -1) : 0;
    state.pads.push({ id: nextId, kind: cloud ? 'cloud' : 'leaf', x, y, half: cloud ? 78 : 70, drift, spring: !cloud && r.chance(0.1), bounced: 9 });
    nextId += 1;
    topY = y;
  }

  const metres = (): number => Math.max(0, Math.floor((state.baseY - state.bestY) / UNITS_PER_METRE));

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
      state.respawned += dt;
      state.sprung += dt;

      // Steering: the frog slides toward the finger (a tap sets where it heads too).
      const aim = input.pointer?.x ?? input.taps.at(-1)?.x;
      if (aim !== undefined) {
        const want = clamp(aim, FROG_HALF, arena.width - FROG_HALF) - state.frogX;
        state.vx = clamp(want * 8, -STEER_SPEED, STEER_SPEED);
      } else state.vx *= 0.85;
      state.frogX = clamp(state.frogX + state.vx * dt, FROG_HALF, arena.width - FROG_HALF);

      const before = state.frogY;
      state.vy += GRAVITY * dt;
      state.frogY += state.vy * dt;

      for (const pad of state.pads) {
        pad.bounced += dt;
        if (pad.drift !== 0) {
          // A drifting cloud stays on its own side of the middle.
          pad.x += pad.drift * dt;
          const left = pad.x < centre;
          const lo = left ? margin : centre + SIDE_CLEAR;
          const hi = left ? centre - SIDE_CLEAR : arena.width - margin;
          if (pad.x < lo || pad.x > hi) {
            pad.drift = -pad.drift;
            pad.x = clamp(pad.x, lo, hi);
          }
        }
      }
      // Lands only while falling, crossing the pad's top.
      if (state.vy > 0) {
        for (const pad of state.pads) {
          if (before <= pad.y && state.frogY >= pad.y && Math.abs(state.frogX - pad.x) <= pad.half + FROG_HALF * 0.6) {
            state.frogY = pad.y;
            state.vy = -(pad.spring ? SPRING_SPEED : BOUNCE_SPEED);
            pad.bounced = 0;
            if (pad.spring) state.sprung = 0;
            const higher = pad.id !== state.lastPad && pad.y < (state.pads.find((p) => p.id === state.lastPad)?.y ?? Infinity);
            state.lastPad = pad.id;
            events.push({ type: 'action', x: pad.x, y: pad.y - state.cameraY });
            if (higher && pad.y < state.bestY) {
              const was = metres();
              state.bestY = pad.y;
              const gained = metres() - was;
              if (gained > 0) events.push({ type: 'score', x: state.frogX, y: pad.y - state.cameraY - 40, points: gained });
            }
            break;
          }
        }
      }
      state.score = metres();

      // The view follows upward only.
      const wantCamera = state.frogY - arena.height * CAMERA_FRACTION;
      if (wantCamera < state.cameraY) state.cameraY = wantCamera;
      while (topY > state.cameraY - 200) layPad(rng);

      // Fell off the bottom: back onto the lowest pad still in view, under the frog's column if it can.
      if (state.frogY - state.cameraY > arena.height + 60) {
        const visible = state.pads.filter((p) => p.y - state.cameraY < arena.height - 60 && p.y - state.cameraY > HUD_SAFE_TOP);
        const pad = visible.sort((a, b) => b.y - a.y)[0] ?? state.pads[state.pads.length - 1];
        if (pad) {
          state.frogX = pad.x;
          state.frogY = pad.y - 4;
          state.vy = -BOUNCE_SPEED;
          state.vx = 0;
          state.lastPad = pad.id;
        }
        state.respawned = 0;
        events.push({ type: 'miss', x: state.frogX, y: arena.height - 80 });
      }
      state.pads = state.pads.filter((p) => p.y - state.cameraY < arena.height + 400);
    },
  };
}

/** Good play: steer under the next pad up (the lowest one above the pad it last left). */
export function doodleBot(state: DoodleState, context: BotContext): BotMove {
  const from = state.pads.find((p) => p.id === state.lastPad);
  const fromY = from?.y ?? state.frogY;
  const apex = state.frogY - (state.vy < 0 ? (state.vy * state.vy) / (2 * GRAVITY) : 0);
  const above = state.pads.filter((p) => p.y < fromY - 20 && p.y > apex + 25).sort((a, b) => b.y - a.y);
  // While still rising, aim at the highest pad it can still reach; while falling, at the nearest one under it.
  const under = state.vy < 0 ? above : above.filter((p) => p.y >= state.frogY - 5);
  const target = under[under.length - 1];
  const x = target ? target.x + target.drift * 0.2 : (from?.x ?? context.arena.width / 2);
  return { touch: { x, y: context.arena.height - 120 } };
}
