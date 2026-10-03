// Cat and mouse ("Mèo đuổi chuột", the folk game): friends hold hands in a ring and raise and lower their arms
// in turn, half the gaps at a time. The child drags the mouse; the cat chases it. Mouse and cat can only pass
// through the ring where arms are up. Lead the cat through a gap that is about to close: when the arms come
// down in front of the cat it is blocked (a point) and sits dizzy for a moment. A cat that catches the mouse
// sends it back to the middle. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const KIDS = 8;
/** Seconds each half of the gaps stays up (then down). */
export const PERIOD = 1.8;

export interface CatMouseState {
  centre: Point;
  radius: number;
  /** Half the angle of a gap one can pass through. */
  gapHalf: number;
  mouse: Point;
  cat: Point;
  /** The gap the mouse last went through (the cat follows), −1 for none. */
  trail: number;
  /** Seconds the cat stays dizzy, and when it was blocked or caught the mouse. */
  dizzy: number;
  blockedAt: number;
  caughtAt: number;
  catSpeed: number;
  score: number;
  time: number;
}

const MOUSE_SPEED = 250;
const DIZZY_SECONDS = 1.1;
const CATCH = 42;

/** Angle of gap `k` (between friend k and friend k+1). */
export const gapAngle = (k: number): number => ((k + 0.5) * Math.PI * 2) / KIDS - Math.PI / 2;
/** Whether gap `k` has its arms up at time `t`. */
export const isOpen = (k: number, t: number): boolean => (Math.floor(t / PERIOD) + k) % 2 === 0;
/** Seconds until gap `k` changes. */
export const untilChange = (t: number): number => PERIOD - (t % PERIOD);

const angleDiff = (a: number, b: number): number => Math.atan2(Math.sin(a - b), Math.cos(a - b));

/**
 * Where to head next to get from `from` to `to` on the same side of the ring without cutting across it: straight
 * when it is close round, otherwise a step round the ring.
 */
export function around(state: Pick<CatMouseState, 'centre' | 'radius'>, from: Point, to: Point): Point {
  const { centre, radius } = state;
  const fr = Math.hypot(from.x - centre.x, from.y - centre.y);
  if (fr < radius) return to;
  const fa = Math.atan2(from.y - centre.y, from.x - centre.x);
  const ta = Math.atan2(to.y - centre.y, to.x - centre.x);
  const diff = angleDiff(ta, fa);
  if (Math.abs(diff) < 0.45) return to;
  const r = Math.max(fr, radius + 45);
  const a = fa + Math.sign(diff) * 0.45;
  return { x: centre.x + Math.cos(a) * r, y: centre.y + Math.sin(a) * r };
}

export function createCatMouse({ arena, duration, rng }: GameSetup): MinigameLogic<CatMouseState> {
  const events = eventQueue();
  const radius = Math.min(arena.width - 160, arena.height - HUD_SAFE_TOP - 100) * 0.5;
  const centre = { x: arena.width / 2, y: HUD_SAFE_TOP + (arena.height - HUD_SAFE_TOP) / 2 };
  const gapHalf = (Math.PI / KIDS) * 0.55;
  const state: CatMouseState = {
    centre,
    radius,
    gapHalf,
    mouse: { ...centre },
    cat: { x: centre.x, y: centre.y },
    trail: -1,
    dizzy: 0,
    blockedAt: -9,
    caughtAt: -9,
    catSpeed: 150,
    score: 0,
    time: 0,
  };

  // The cat starts outside the ring, somewhere round it.
  const start = rng.range(0, Math.PI * 2);
  state.cat = { x: centre.x + Math.cos(start) * (radius + 70), y: Math.max(HUD_SAFE_TOP + 20, centre.y + Math.sin(start) * (radius + 70)) };
  const polar = (p: Point): { r: number; a: number } => ({ r: Math.hypot(p.x - centre.x, p.y - centre.y), a: Math.atan2(p.y - centre.y, p.x - centre.x) });
  const gapAt = (a: number): number => {
    for (let k = 0; k < KIDS; k += 1) if (Math.abs(angleDiff(a, gapAngle(k))) <= gapHalf) return k;
    return -1;
  };
  /** Moves `p` toward `to` by up to `dist`, through the ring only at an open gap; returns the gap crossed. */
  const move = (p: Point, to: Point, dist: number): { at: Point; crossed: number; blocked: boolean } => {
    const d = Math.hypot(to.x - p.x, to.y - p.y);
    const k = d <= dist ? 1 : dist / d;
    const q = { x: p.x + (to.x - p.x) * k, y: p.y + (to.y - p.y) * k };
    q.x = Math.min(arena.width - 30, Math.max(30, q.x));
    q.y = Math.min(arena.height - 30, Math.max(HUD_SAFE_TOP + 10, q.y));
    const a = polar(p);
    const b = polar(q);
    const inside = a.r < radius;
    if (inside === b.r < radius) {
      // Not crossing, but keep off the line of friends.
      if (Math.abs(b.r - radius) < 14 && gapAt(b.a) < 0) {
        const r = inside ? radius - 14 : radius + 14;
        return { at: { x: centre.x + Math.cos(b.a) * r, y: centre.y + Math.sin(b.a) * r }, crossed: -1, blocked: false };
      }
      return { at: q, crossed: -1, blocked: false };
    }
    const gap = gapAt(b.a);
    if (gap >= 0 && isOpen(gap, state.time)) return { at: q, crossed: gap, blocked: false };
    const r = inside ? radius - 14 : radius + 14;
    return { at: { x: centre.x + Math.cos(b.a) * r, y: centre.y + Math.sin(b.a) * r }, crossed: -1, blocked: true };
  };
  /** The point just beyond gap `k` on the far side from `p`. */
  const through = (p: Point, k: number): Point => {
    const r = polar(p).r < radius ? radius + 40 : radius - 40;
    return { x: centre.x + Math.cos(gapAngle(k)) * r, y: centre.y + Math.sin(gapAngle(k)) * r };
  };

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
      state.catSpeed = 150 + 35 * Math.min(1, state.time / duration);
      const finger = input.pointer ?? input.taps[0];
      if (finger && state.time - state.caughtAt > 0.8) {
        const m = move(state.mouse, finger, MOUSE_SPEED * dt);
        state.mouse = m.at;
        if (m.crossed >= 0) state.trail = m.crossed;
      }
      if (state.dizzy > 0) {
        state.dizzy -= dt;
        return;
      }
      if (state.time - state.caughtAt < 0.8) return;
      const sameSide = polar(state.cat).r < radius === polar(state.mouse).r < radius;
      let goal = state.mouse;
      let viaGap = -1;
      if (!sameSide) {
        // Follow the mouse's way through; if that gap is down, the nearest gap that is up.
        viaGap = state.trail;
        if (viaGap < 0 || !isOpen(viaGap, state.time)) {
          const ca = polar(state.cat).a;
          let best = -1;
          for (let k = 0; k < KIDS; k += 1) if (isOpen(k, state.time) && (best < 0 || Math.abs(angleDiff(ca, gapAngle(k))) < Math.abs(angleDiff(ca, gapAngle(best))))) best = k;
          viaGap = state.trail >= 0 && Math.hypot(state.cat.x - through(state.mouse, state.trail).x, state.cat.y - through(state.mouse, state.trail).y) < 70 ? state.trail : best;
        }
        if (viaGap >= 0) {
          // Round to this side of the gap first, then through it.
          const ownR = polar(state.cat).r < radius ? radius - 30 : radius + 30;
          const door = { x: centre.x + Math.cos(gapAngle(viaGap)) * ownR, y: centre.y + Math.sin(gapAngle(viaGap)) * ownR };
          goal = Math.hypot(state.cat.x - door.x, state.cat.y - door.y) < 30 ? through(state.cat, viaGap) : around(state, state.cat, door);
        }
      } else goal = around(state, state.cat, state.mouse);
      const c = move(state.cat, goal, state.catSpeed * dt);
      state.cat = c.at;
      if (c.blocked && viaGap >= 0 && viaGap === state.trail && Math.abs(angleDiff(polar(state.cat).a, gapAngle(viaGap))) <= state.gapHalf * 1.6) {
        // The arms came down right in front of the cat.
        state.score += 1;
        state.dizzy = DIZZY_SECONDS;
        state.blockedAt = state.time;
        state.trail = -1;
        events.push({ type: 'score', x: state.cat.x, y: state.cat.y - 40 });
      }
      if (Math.hypot(state.cat.x - state.mouse.x, state.cat.y - state.mouse.y) < CATCH) {
        state.caughtAt = state.time;
        state.mouse = { ...centre };
        state.trail = -1;
        const ca = polar(state.cat).a + Math.PI;
        state.cat = { x: centre.x + Math.cos(ca) * (radius + 90), y: centre.y + Math.sin(ca) * (radius + 90) };
        events.push({ type: 'hit', x: centre.x, y: centre.y });
      }
    },
  };
}

/**
 * Good play: with the cat on this side, run for a gap the mouse reaches first that will close after the mouse is
 * through and before the cat is; wait just beyond it. With no such gap, keep away from the cat.
 */
export function catMouseBot(state: CatMouseState, _context: BotContext): BotMove {
  const { centre, radius } = state;
  const polar = (p: Point): { r: number; a: number } => ({ r: Math.hypot(p.x - centre.x, p.y - centre.y), a: Math.atan2(p.y - centre.y, p.x - centre.x) });
  const m = polar(state.mouse);
  const c = polar(state.cat);
  const inside = m.r < radius;
  const sameSide = inside === c.r < radius;
  const at = (r: number, k: number): Point => ({ x: centre.x + Math.cos(gapAngle(k)) * r, y: centre.y + Math.sin(gapAngle(k)) * r });
  const dist = (p: Point, q: Point): number => Math.hypot(p.x - q.x, p.y - q.y);
  const catNear = dist(state.cat, state.mouse) < 130;
  if (!sameSide && state.trail >= 0 && !catNear) return { touch: around(state, state.mouse, at(inside ? radius - 90 : radius + 90, state.trail)) };
  const left = untilChange(state.time);
  let best = -1;
  let bestD = Infinity;
  for (let k = 0; k < KIDS; k += 1) {
    if (!isOpen(k, state.time)) continue;
    const gate = at(radius, k);
    const dm = dist(state.mouse, gate);
    const dc = dist(state.cat, gate);
    const mouseThrough = dm / 250 + 0.2;
    const catThrough = dc / state.catSpeed;
    if (dm < dc - 30 && left > mouseThrough && left < catThrough + 0.3 && dm < bestD) {
      best = k;
      bestD = dm;
    }
  }
  if (best >= 0) {
    const near = at(inside ? radius - 25 : radius + 25, best);
    return { touch: dist(state.mouse, near) < 30 ? at(inside ? radius + 90 : radius - 90, best) : around(state, state.mouse, near) };
  }
  // Keep away: the point on this side of the ring opposite the cat.
  const r = inside ? radius * 0.45 : radius + 70;
  const a = c.a + Math.PI;
  return { touch: around(state, state.mouse, { x: centre.x + Math.cos(a) * r, y: centre.y + Math.sin(a) * r }) };
}
