// Butterfly net: butterflies flutter over a meadow of flowers. The child drags the net toward one; the net
// follows her finger a little behind. Moving the net fast near a butterfly startles it and it flies off to
// another flower; creeping up slowly works. Lifting the finger swings the net down: a calm butterfly under it
// is caught (a point) and a new one comes. A swing over nothing just misses. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface Butterfly extends Point {
  /** The flower it flutters over, and where it flies to when it moves on. */
  home: Point;
  /** Seconds left of being scared (it flies fast and cannot be caught). */
  scared: number;
  /** Seconds until it moves to another flower on its own. */
  stay: number;
  phase: number;
  kind: number;
}

export interface NetState {
  net: Point;
  /** How fast the net moved lately (units per second, smoothed). */
  netSpeed: number;
  holding: boolean;
  butterflies: Butterfly[];
  flowers: Point[];
  /** Seconds since the last swing, and whether it caught. */
  swingAgo: number;
  caught: boolean;
  field: { x: number; y: number; w: number; h: number };
  score: number;
  time: number;
}

/** Faster than this within STARTLE_RANGE scares a butterfly. */
export const STARTLE_SPEED = 260;
export const STARTLE_RANGE = 170;
export const CATCH_RANGE = 62;
const FOLLOW = 8;
const COUNT = 4;

export function createButterflyNet({ arena, rng }: GameSetup): MinigameLogic<NetState> {
  const events = eventQueue();
  const field = { x: 60, y: HUD_SAFE_TOP + 50, w: arena.width - 120, h: arena.height - HUD_SAFE_TOP - 130 };
  const flowers: Point[] = [];
  const cols = Math.max(3, Math.round(field.w / 220));
  const rows = Math.max(2, Math.round(field.h / 200));
  for (let r = 0; r < rows; r += 1) for (let c = 0; c < cols; c += 1) flowers.push({ x: field.x + ((c + 0.5) / cols) * field.w + rng.range(-30, 30), y: field.y + ((r + 0.5) / rows) * field.h + rng.range(-25, 25) });
  const state: NetState = { net: { x: arena.width / 2, y: arena.height - 70 }, netSpeed: 0, holding: false, butterflies: [], flowers, swingAgo: 9, caught: false, field, score: 0, time: 0 };

  const freeFlower = (r: Rng, avoid: Point | null): Point => {
    const options = flowers.filter((f) => !state.butterflies.some((b) => b.home === f) && (!avoid || Math.hypot(f.x - avoid.x, f.y - avoid.y) > 200));
    return options[r.int(0, Math.max(0, options.length - 1))] ?? flowers[0] ?? { x: 300, y: 300 };
  };
  const spawn = (): Butterfly => {
    const home = freeFlower(rng, state.net);
    return { x: home.x, y: field.y - 80, home, scared: 0, stay: rng.range(4, 7), phase: rng.range(0, 6), kind: rng.int(0, 2) };
  };
  for (let i = 0; i < COUNT; i += 1) state.butterflies.push(spawn());

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
      state.swingAgo += dt;
      const before = { ...state.net };
      if (input.pointer) {
        const k = Math.min(1, FOLLOW * dt);
        state.net.x += (input.pointer.x - state.net.x) * k;
        state.net.y += (input.pointer.y - state.net.y) * k;
      }
      const speed = Math.hypot(state.net.x - before.x, state.net.y - before.y) / dt;
      state.netSpeed += (speed - state.netSpeed) * Math.min(1, dt * 10);
      state.holding = input.pointer !== null;

      for (const b of state.butterflies) {
        b.phase += dt;
        b.scared = Math.max(0, b.scared - dt);
        b.stay -= dt;
        if (b.stay <= 0) {
          b.home = freeFlower(rng, b);
          b.stay = rng.range(4, 7);
        }
        const near = Math.hypot(b.x - state.net.x, b.y - state.net.y) < STARTLE_RANGE;
        if (near && state.netSpeed > STARTLE_SPEED && b.scared <= 0 && state.holding) {
          b.scared = 1.2;
          b.home = freeFlower(rng, state.net);
          b.stay = rng.range(4, 7);
          events.push({ type: 'miss', x: b.x, y: b.y });
        }
        // Flutter around the flower; fly there quickly when moving on or scared.
        const target = { x: b.home.x + Math.sin(b.phase * 1.7) * 26, y: b.home.y - 30 + Math.sin(b.phase * 2.3) * 16 };
        const k = Math.min(1, dt * (b.scared > 0 ? 4 : 1.6));
        b.x += (target.x - b.x) * k;
        b.y += (target.y - b.y) * k;
      }

      if (input.released) {
        state.swingAgo = 0;
        const hit = state.butterflies.find((b) => b.scared <= 0 && Math.hypot(b.x - state.net.x, b.y - state.net.y) <= CATCH_RANGE);
        state.caught = Boolean(hit);
        if (hit) {
          state.score += 1;
          events.push({ type: 'score', x: hit.x, y: hit.y });
          state.butterflies = state.butterflies.filter((b) => b !== hit);
          state.butterflies.push(spawn());
        } else {
          events.push({ type: 'action', ...state.net });
        }
      }
    },
  };
}

/** Good play: hurries to near the closest calm butterfly, creeps the last stretch, swings when over it. */
export function butterflyBot(state: NetState, _context: BotContext): BotMove {
  const calm = state.butterflies.filter((b) => b.scared <= 0 && b.y > state.field.y - 20);
  let target: Butterfly | null = null;
  for (const b of calm) if (!target || Math.hypot(b.x - state.net.x, b.y - state.net.y) < Math.hypot(target.x - state.net.x, target.y - state.net.y)) target = b;
  if (!target) return { touch: state.net };
  const dx = target.x - state.net.x;
  const dy = target.y - state.net.y;
  const d = Math.hypot(dx, dy);
  if (d < CATCH_RANGE * 0.5 && state.holding) return {};
  // Close to any butterfly the finger stays just ahead of the net, so the net creeps.
  const nearAny = state.butterflies.some((b) => Math.hypot(b.x - state.net.x, b.y - state.net.y) < STARTLE_RANGE + 60);
  const lead = nearAny ? 24 : 90;
  const step = Math.min(d, lead);
  return { touch: { x: state.net.x + (dx / (d || 1)) * step, y: state.net.y + (dy / (d || 1)) * step } };
}
