// Sheepdog herd: ducks wander about a meadow; they keep together and waddle away from the dog. The child
// drags the dog around to drive them through the gap in the fence into the pen (once close to the gap a
// duck sees the straw and goes in by itself): every duck in the pen is a point, and a new one waddles in
// from the far side. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface HerdDuck {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Seconds since it went into the pen (-1: still out). */
  penned: number;
}

export interface Pen {
  left: number;
  top: number;
  right: number;
  bottom: number;
  /** The side with the gap, and the gap's middle and half-width. */
  side: 'left' | 'bottom';
  gap: Point;
  gapHalf: number;
}

export interface HerdState {
  pen: Pen;
  dogX: number;
  dogY: number;
  /** Which way the dog faces (for the picture). */
  dogLeft: boolean;
  ducks: HerdDuck[];
  score: number;
  time: number;
}

const FLOCK = 6;
const SCARE = 170;
const FLEE = 900;
const WANDER = 40;
const MAX_FLEE = 130;
const DOG_SPEED = 360;

export function insidePen(pen: Pen, p: Point): boolean {
  return p.x > pen.left && p.x < pen.right && p.y > pen.top && p.y < pen.bottom;
}

export function createSheepdogHerd({ arena, rng }: GameSetup): MinigameLogic<HerdState> {
  const events = eventQueue();
  const wide = arena.width >= arena.height;
  const pen: Pen = wide
    ? { left: arena.width - 190, right: arena.width - 20, top: arena.height / 2 + 20 - 130, bottom: arena.height / 2 + 20 + 130, side: 'left', gap: { x: arena.width - 190, y: arena.height / 2 + 20 }, gapHalf: 95 }
    : { left: arena.width / 2 - 140, right: arena.width / 2 + 140, top: HUD_SAFE_TOP + 20, bottom: HUD_SAFE_TOP + 190, side: 'bottom', gap: { x: arena.width / 2, y: HUD_SAFE_TOP + 190 }, gapHalf: 100 };
  const state: HerdState = { pen, dogX: wide ? 120 : arena.width / 2, dogY: wide ? arena.height / 2 : arena.height - 120, dogLeft: false, ducks: [], score: 0, time: 0 };
  let nextId = 0;

  /** A new duck, on the side of the field away from the pen. */
  const spawn = (r: Rng): HerdDuck => {
    const x = wide ? r.range(arena.width * 0.15, arena.width * 0.45) : r.range(80, arena.width - 80);
    const y = wide ? r.range(HUD_SAFE_TOP + 60, arena.height - 60) : r.range(HUD_SAFE_TOP + 440, Math.min(arena.height - 60, Math.max(HUD_SAFE_TOP + 560, arena.height * 0.7)));
    return { id: (nextId += 1), x, y, vx: 0, vy: 0, penned: -1 };
  };
  for (let i = 0; i < FLOCK; i += 1) state.ducks.push(spawn(rng));

  function blockFence(d: HerdDuck, prev: Point): void {
    if (!insidePen(pen, d)) return;
    // In through the gap: home.
    const throughGap =
      pen.side === 'left' ? prev.x <= pen.left && Math.abs(d.y - pen.gap.y) < pen.gapHalf : prev.y >= pen.bottom && Math.abs(d.x - pen.gap.x) < pen.gapHalf;
    if (throughGap || insidePen(pen, prev)) {
      if (d.penned < 0) {
        d.penned = 0;
        state.score += 1;
        events.push({ type: 'score', x: d.x, y: d.y });
      }
      return;
    }
    // Into the fence elsewhere: back off it.
    d.x = prev.x;
    d.y = prev.y;
    d.vx = -d.vx * 0.5;
    d.vy = -d.vy * 0.5;
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
      const aim = input.pointer;
      if (aim) {
        const dx = aim.x - state.dogX;
        const dy = aim.y - state.dogY;
        const d = Math.hypot(dx, dy);
        const move = Math.min(d, DOG_SPEED * dt);
        if (d > 1) {
          state.dogX += (dx / d) * move;
          state.dogY += (dy / d) * move;
          state.dogLeft = dx < 0;
        }
      }
      const out = state.ducks.filter((d) => d.penned < 0);
      const cx = out.reduce((s, d) => s + d.x, 0) / Math.max(1, out.length);
      const cy = out.reduce((s, d) => s + d.y, 0) / Math.max(1, out.length);
      for (const d of state.ducks) {
        if (d.penned >= 0) {
          d.penned += dt;
          // Settle inside the pen.
          d.vx *= 0.9;
          d.vy *= 0.9;
          d.x = Math.min(pen.right - 25, Math.max(pen.left + 25, d.x + d.vx * dt));
          d.y = Math.min(pen.bottom - 25, Math.max(pen.top + 25, d.y + d.vy * dt));
          continue;
        }
        const ax = d.x - state.dogX;
        const ay = d.y - state.dogY;
        const dist = Math.hypot(ax, ay);
        if (dist < SCARE) {
          const push = (FLEE * (1 - dist / SCARE)) / Math.max(dist, 1);
          d.vx += ax * push * dt;
          d.vy += ay * push * dt;
        } else {
          d.vx += rng.range(-WANDER, WANDER) * dt * 4 + (cx - d.x) * 0.3 * dt;
          d.vy += rng.range(-WANDER, WANDER) * dt * 4 + (cy - d.y) * 0.3 * dt;
        }
        // Close to the gap, a duck sees the straw inside and wanders in by itself.
        const inside = pen.side === 'left' ? { x: pen.left + 60, y: pen.gap.y } : { x: pen.gap.x, y: pen.bottom - 60 };
        const toGap = Math.hypot(d.x - pen.gap.x, d.y - pen.gap.y);
        if (toGap < 125) {
          d.vx += ((inside.x - d.x) / toGap) * 260 * dt;
          d.vy += ((inside.y - d.y) / toGap) * 260 * dt;
        }
        // Personal space.
        for (const o of out) {
          if (o === d) continue;
          const sx = d.x - o.x;
          const sy = d.y - o.y;
          const s = Math.hypot(sx, sy);
          if (s < 44 && s > 0.01) {
            d.vx += (sx / s) * 160 * dt;
            d.vy += (sy / s) * 160 * dt;
          }
        }
        const speed = Math.hypot(d.vx, d.vy);
        const max = dist < SCARE ? MAX_FLEE : toGap < 125 ? 70 : 35;
        if (speed > max) {
          d.vx *= max / speed;
          d.vy *= max / speed;
        }
        d.vx *= 0.985;
        d.vy *= 0.985;
        const prev = { x: d.x, y: d.y };
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        if (d.x < 30 || d.x > arena.width - 30) d.vx = -d.vx;
        if (d.y < HUD_SAFE_TOP + 20 || d.y > arena.height - 30) d.vy = -d.vy;
        d.x = Math.min(arena.width - 30, Math.max(30, d.x));
        d.y = Math.min(arena.height - 30, Math.max(HUD_SAFE_TOP + 20, d.y));
        blockFence(d, prev);
      }
      // Penned ducks stay a while to be seen, then a new duck comes out on the field.
      const settled = state.ducks.filter((d) => d.penned > 2.5);
      if (settled.length > 0) {
        state.ducks = state.ducks.filter((d) => d.penned <= 2.5);
        for (let i = 0; i < settled.length; i += 1) state.ducks.push(spawn(rng));
      }
    },
  };
}

/**
 * Good play, as a shepherd does it: if a duck has strayed from the others, fetch it back from its far side;
 * otherwise walk up behind the whole group (on the side away from the gap) and drive it in.
 */
export function sheepdogBot(state: HerdState, _context: BotContext): BotMove {
  const { pen } = state;
  const out = state.ducks.filter((d) => d.penned < 0);
  if (out.length === 0) return {};
  const goal = pen.side === 'left' ? { x: pen.left + 40, y: pen.gap.y } : { x: pen.gap.x, y: pen.bottom - 40 };
  const cx = out.reduce((s, d) => s + d.x, 0) / out.length;
  const cy = out.reduce((s, d) => s + d.y, 0) / out.length;
  const stray = out.map((d) => ({ d, far: Math.hypot(d.x - cx, d.y - cy) })).sort((a, b) => b.far - a.far)[0];
  // Steer the stray toward the group, or the group toward the gap.
  const [from, to] = stray && stray.far > 110 ? [{ x: stray.d.x, y: stray.d.y }, { x: cx, y: cy }] : [{ x: cx, y: cy }, goal];
  const dx = from.x - to.x;
  const dy = from.y - to.y;
  const d = Math.hypot(dx, dy) || 1;
  const spread = stray && stray.far <= 110 ? stray.far : 0;
  const behind = { x: from.x + (dx / d) * (70 + spread), y: from.y + (dy / d) * (70 + spread) };
  // Coming from the wrong side: swing wide round instead of running through them.
  const dogAhead = (state.dogX - from.x) * -dx + (state.dogY - from.y) * -dy > 0;
  if (dogAhead && Math.hypot(state.dogX - from.x, state.dogY - from.y) < 230) {
    const side = { x: -dy / d, y: dx / d };
    return { touch: { x: from.x + side.x * 220 + (dx / d) * 80, y: from.y + side.y * 220 + (dy / d) * 80 } };
  }
  return { touch: behind };
}
