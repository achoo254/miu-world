// Boomerang throw: mangoes and coconuts hang in the trees. The child swipes to throw her boomerang: it flies out
// the way she swiped (as far as the swipe was long), loops and comes back. Every fruit it touches drops: a point.
// As it comes back, a tap catches it, ready to throw again at once; missed, it lands in the grass and she waits
// a moment for another. Fruit grows back on the trees. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface Fruit extends Point {
  kind: number;
  /** Seconds since it was hit (it falls), or -1 on the tree. */
  hit: number;
  /** Seconds until a picked spot grows fruit again. */
  regrow: number;
}

export interface Throw {
  dir: Point;
  reach: number;
  t: number;
}

export interface BoomerangState {
  hand: Point;
  fruits: Fruit[];
  flight: Throw | null;
  /** Seconds until a new boomerang after a missed catch (0 = in hand). */
  wait: number;
  caughtAgo: number;
  lastHitAt: number;
  score: number;
  time: number;
}

export const FLIGHT = 1.6;
/** From this share of the flight on (and a little after), a tap catches it. */
export const CATCH_FROM = 0.78;
const LATE_CATCH = 0.35;
const WAIT = 2;
const HIT_R = 46;
const REGROW = 1.5;

/** Where a boomerang is `t` seconds into a throw. */
export function flightPoint(hand: Point, f: Pick<Throw, 'dir' | 'reach'>, t: number): Point {
  const th = Math.min(1, t / FLIGHT) * Math.PI * 2;
  const nx = -f.dir.y;
  const ny = f.dir.x;
  const a = (f.reach / 2) * (1 - Math.cos(th));
  const b = f.reach * 0.28 * Math.sin(th);
  return { x: hand.x + f.dir.x * a + nx * b, y: hand.y + f.dir.y * a + ny * b };
}

export function createBoomerang({ arena, rng }: GameSetup): MinigameLogic<BoomerangState> {
  const events = eventQueue();
  const hand = { x: arena.width / 2, y: arena.height - 90 };
  const maxReach = Math.min(hand.y - HUD_SAFE_TOP - 30, 620);
  const state: BoomerangState = { hand, fruits: [], flight: null, wait: 0, caughtAgo: 9, lastHitAt: -9, score: 0, time: 0 };
  // Fruit spots in three tree crowns within a throw's reach.
  const crownY = Math.max(HUD_SAFE_TOP + 80, hand.y - maxReach * 0.72);
  const crowns = [0.2, 0.5, 0.8].map((f, i) => ({ x: arena.width * f, y: crownY + (i === 1 ? 0 : 50) }));
  const place = (r: Rng): void => {
    for (const c of crowns) {
      for (let k = 0; k < 3; k += 1) {
        const a = (k / 3) * Math.PI * 2 + r.range(-0.4, 0.4);
        state.fruits.push({ x: c.x + Math.cos(a) * 60, y: c.y + Math.sin(a) * 40 + 20, kind: r.int(0, 1), hit: -1, regrow: 0 });
      }
    }
  };
  place(rng);

  const reachOf = (dx: number, dy: number): number => Math.min(maxReach, Math.max(240, Math.hypot(dx, dy) * 2.2));

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
      state.caughtAgo += dt;
      for (const f of state.fruits) {
        if (f.hit >= 0) {
          f.hit += dt;
          if (f.hit >= REGROW) {
            f.hit = -1;
            f.kind = rng.int(0, 1);
          }
        }
      }
      if (state.wait > 0) {
        state.wait = Math.max(0, state.wait - dt);
        return;
      }
      const flight = state.flight;
      if (!flight) {
        const swipe = input.swipes.find((s) => s.dy < 0);
        if (swipe) {
          const d = Math.hypot(swipe.dx, swipe.dy) || 1;
          state.flight = { dir: { x: swipe.dx / d, y: swipe.dy / d }, reach: reachOf(swipe.dx, swipe.dy), t: 0 };
          events.push({ type: 'action', ...hand });
        }
        return;
      }
      flight.t += dt;
      const at = flightPoint(hand, flight, flight.t);
      for (const f of state.fruits) {
        if (f.hit >= 0 || Math.hypot(f.x - at.x, f.y - at.y) > HIT_R) continue;
        f.hit = 0;
        state.score += 1;
        state.lastHitAt = state.time;
        events.push({ type: 'score', x: f.x, y: f.y, note: 72 + (state.score % 6) * 2, voice: 'bell' });
      }
      if (flight.t >= FLIGHT * CATCH_FROM && input.taps.length > 0) {
        state.flight = null;
        state.caughtAgo = 0;
        events.push({ type: 'action', ...hand, note: 67, voice: 'clap' });
        return;
      }
      if (flight.t >= FLIGHT + LATE_CATCH) {
        state.flight = null;
        state.wait = WAIT;
        events.push({ type: 'miss', ...hand });
      }
    },
  };
}

/** Good play: picks the throw through the most fruit, catches it on the way back. */
export function boomerangBot(state: BoomerangState, _context: BotContext): BotMove {
  if (state.wait > 0) return {};
  if (state.flight) return state.flight.t >= FLIGHT * CATCH_FROM + 0.05 ? { tap: state.hand } : {};
  const maxReach = Math.min(state.hand.y - HUD_SAFE_TOP - 30, 620);
  let best = { dx: 0, dy: -150, hits: -1 };
  for (let deg = -165; deg <= -15; deg += 6) {
    const a = (deg * Math.PI) / 180;
    for (const reach of [260, 360, 460, maxReach]) {
      const dir = { x: Math.cos(a), y: Math.sin(a) };
      let hits = 0;
      const live = state.fruits.filter((f) => f.hit < 0);
      const seen = new Set<Fruit>();
      for (let t = 0; t < FLIGHT; t += 0.04) {
        const p = flightPoint(state.hand, { dir, reach }, t);
        for (const f of live) {
          if (!seen.has(f) && Math.hypot(f.x - p.x, f.y - p.y) <= HIT_R - 6) {
            seen.add(f);
            hits += 1;
          }
        }
      }
      if (hits > best.hits) best = { dx: (dir.x * reach) / 2.2, dy: (dir.y * reach) / 2.2, hits };
    }
  }
  return { swipe: { from: state.hand, dx: best.dx, dy: best.dy } };
}
