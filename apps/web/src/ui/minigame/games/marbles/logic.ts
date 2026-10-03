// Marbles: seven marbles sit inside a chalk ring. The child pulls back (drag anywhere, away from where she
// wants to shoot, and let go, like a catapult) and her big shooter marble flies the other way; marbles bump
// each other and roll to a stop. Every marble knocked out of the ring is a point. She has eight shots; the
// shooter shoots again from where it stopped (moved to just outside the ring if it stopped inside). An empty
// ring is filled again. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface Marble extends Point {
  vx: number;
  vy: number;
  r: number;
  colour: number;
  /** Knocked out of the ring (and counted). */
  out: boolean;
  /** Seconds since it went out (it fades into the pile). */
  outAgo: number;
}

export interface MarblesState {
  centre: Point;
  ring: number;
  shooter: Marble;
  marbles: Marble[];
  shotsLeft: number;
  /** The pull in progress: where it started and where the finger is. */
  pull: { from: Point; to: Point } | null;
  /** A shot is rolling. */
  rolling: boolean;
  racks: number;
  score: number;
  time: number;
}

export const SHOTS = 8;
const RACK = 7;
export const MARBLE_R = 17;
export const SHOOTER_R = 22;
const FRICTION = 460;
/** Shot speed per unit of pull, and the fastest shot. */
export const PULL_POWER = 5.2;
export const MAX_SPEED = 1150;
const MIN_PULL = 24;
const SUBSTEPS = 3;

function rack(rng: Rng, centre: Point, ring: number): Marble[] {
  const marbles: Marble[] = [];
  for (let tries = 0; marbles.length < RACK && tries < 400; tries += 1) {
    const a = rng.range(0, Math.PI * 2);
    const d = Math.sqrt(rng.next()) * ring * 0.62;
    const x = centre.x + Math.cos(a) * d;
    const y = centre.y + Math.sin(a) * d;
    if (marbles.every((m) => Math.hypot(m.x - x, m.y - y) > MARBLE_R * 2 + 10)) marbles.push({ x, y, vx: 0, vy: 0, r: MARBLE_R, colour: marbles.length % 4, out: false, outAgo: 0 });
  }
  return marbles;
}

/** Where a shot of this pull goes: the opposite way, faster for a longer pull. */
export function shotOf(dx: number, dy: number): { vx: number; vy: number } | null {
  const length = Math.hypot(dx, dy);
  if (length < MIN_PULL) return null;
  const speed = Math.min(MAX_SPEED, length * PULL_POWER);
  return { vx: (-dx / length) * speed, vy: (-dy / length) * speed };
}

export function createMarbles({ arena, rng }: GameSetup): MinigameLogic<MarblesState> {
  const events = eventQueue();
  const top = HUD_SAFE_TOP + 20;
  const ring = Math.min(arena.width, arena.height - top) * 0.3;
  const centre = { x: arena.width / 2, y: top + (arena.height - top) * 0.45 };
  const home = { x: centre.x, y: Math.min(arena.height - 50, centre.y + ring + 100) };
  const state: MarblesState = {
    centre,
    ring,
    shooter: { ...home, vx: 0, vy: 0, r: SHOOTER_R, colour: -1, out: false, outAgo: 0 },
    marbles: rack(rng, centre, ring),
    shotsLeft: SHOTS,
    pull: null,
    rolling: false,
    racks: 1,
    score: 0,
    time: 0,
  };

  const shoot = (dx: number, dy: number): void => {
    const shot = shotOf(dx, dy);
    if (!shot || state.shotsLeft <= 0) return;
    state.shooter.vx = shot.vx;
    state.shooter.vy = shot.vy;
    state.shotsLeft -= 1;
    state.rolling = true;
    events.push({ type: 'action', x: state.shooter.x, y: state.shooter.y });
  };

  const settle = (): void => {
    state.rolling = false;
    const s = state.shooter;
    // Off the play area: back home. Inside the ring: just outside it, the way it lies from the middle.
    if (s.x < s.r || s.y < top + s.r || s.x > arena.width - s.r || s.y > arena.height - s.r) Object.assign(s, home);
    const d = Math.hypot(s.x - centre.x, s.y - centre.y);
    if (d < ring + s.r + 10) {
      const k = (ring + s.r + 30) / Math.max(1, d);
      s.x = centre.x + (s.x - centre.x) * k;
      s.y = centre.y + (s.y - centre.y) * k;
      if (s.y > arena.height - s.r || s.y < top + s.r || s.x < s.r || s.x > arena.width - s.r) Object.assign(s, home);
    }
    if (state.marbles.every((m) => m.out)) {
      state.marbles = rack(rng, centre, ring);
      state.racks += 1;
    }
  };

  const physics = (dt: number): void => {
    const all = [state.shooter, ...state.marbles.filter((m) => !m.out || m.outAgo < 0.2)];
    for (const m of all) {
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      const speed = Math.hypot(m.vx, m.vy);
      const slowed = Math.max(0, speed - FRICTION * dt);
      if (speed > 0) {
        m.vx *= slowed / speed;
        m.vy *= slowed / speed;
      }
      // The play area's edges: a soft bounce.
      if (m.x < m.r || m.x > arena.width - m.r) {
        m.vx *= -0.5;
        m.x = Math.min(arena.width - m.r, Math.max(m.r, m.x));
      }
      if (m.y < top + m.r || m.y > arena.height - m.r) {
        m.vy *= -0.5;
        m.y = Math.min(arena.height - m.r, Math.max(top + m.r, m.y));
      }
    }
    for (let i = 0; i < all.length; i += 1) {
      for (let j = i + 1; j < all.length; j += 1) {
        const a = all[i];
        const b = all[j];
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        const overlap = a.r + b.r - dist;
        if (overlap <= 0 || dist === 0) continue;
        const nx = dx / dist;
        const ny = dy / dist;
        // Push apart, then trade the speed along the line between them (the shooter is a little heavier).
        const ma = a.r * a.r;
        const mb = b.r * b.r;
        a.x -= nx * overlap * (mb / (ma + mb));
        a.y -= ny * overlap * (mb / (ma + mb));
        b.x += nx * overlap * (ma / (ma + mb));
        b.y += ny * overlap * (ma / (ma + mb));
        const relative = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
        if (relative <= 0) continue;
        const impulse = (1.9 * relative) / (1 / ma + 1 / mb);
        a.vx -= (impulse / ma) * nx;
        a.vy -= (impulse / ma) * ny;
        b.vx += (impulse / mb) * nx;
        b.vy += (impulse / mb) * ny;
        if (relative > 120) events.push({ type: 'action', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
      }
    }
  };

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.shotsLeft === 0 && !state.rolling;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      for (const m of state.marbles) if (m.out) m.outAgo += dt;
      if (state.rolling) {
        for (let k = 0; k < SUBSTEPS; k += 1) physics(dt / SUBSTEPS);
        for (const m of state.marbles) {
          if (!m.out && Math.hypot(m.x - centre.x, m.y - centre.y) > ring + m.r) {
            m.out = true;
            m.outAgo = 0;
            state.score += 1;
            events.push({ type: 'score', x: m.x, y: m.y });
          }
        }
        const moving = [state.shooter, ...state.marbles.filter((m) => !m.out)].some((m) => Math.hypot(m.vx, m.vy) > 4);
        if (!moving) {
          for (const m of [state.shooter, ...state.marbles]) {
            m.vx = 0;
            m.vy = 0;
          }
          settle();
        }
        return;
      }
      // A quick flick shoots at once; a slow pull shoots when the finger lifts.
      const swipe = input.swipes[0];
      if (swipe) {
        state.pull = null;
        shoot(swipe.dx, swipe.dy);
        return;
      }
      if (input.pressed && input.pointer) state.pull = { from: input.pointer, to: input.pointer };
      if (state.pull && input.pointer) state.pull.to = input.pointer;
      if (state.pull && (!input.pointer || input.released)) {
        const { from, to } = state.pull;
        state.pull = null;
        shoot(to.x - from.x, to.y - from.y);
      }
    },
  };
}

/** Good play: hit the marble that can be knocked straight out with the smallest cut, as hard as possible. */
export function marblesBot(state: MarblesState, _context: BotContext): BotMove {
  if (state.rolling || state.shotsLeft <= 0) return {};
  const s = state.shooter;
  const inside = state.marbles.filter((m) => !m.out);
  let best: { aim: Point; cut: number } | null = null;
  for (const m of inside) {
    const outward = { x: m.x - state.centre.x, y: m.y - state.centre.y };
    const len = Math.hypot(outward.x, outward.y) || 1;
    const nx = outward.x / len;
    const ny = outward.y / len;
    // Where the shooter must touch it to send it straight out.
    const ghost = { x: m.x - nx * (m.r + s.r), y: m.y - ny * (m.r + s.r) };
    const gx = ghost.x - s.x;
    const gy = ghost.y - s.y;
    const gl = Math.hypot(gx, gy) || 1;
    const cut = Math.acos(Math.max(-1, Math.min(1, (gx * nx + gy * ny) / gl)));
    const blocked = inside.some((o) => {
      if (o === m) return false;
      const t = Math.max(0, Math.min(1, ((o.x - s.x) * gx + (o.y - s.y) * gy) / (gl * gl)));
      return Math.hypot(s.x + gx * t - o.x, s.y + gy * t - o.y) < o.r + s.r;
    });
    const score = cut + (blocked ? 3 : 0) + (state.ring - len) / state.ring;
    if (!best || score < best.cut) best = { aim: ghost, cut: score };
  }
  if (!best) return {};
  const dx = best.aim.x - s.x;
  const dy = best.aim.y - s.y;
  const length = Math.hypot(dx, dy) || 1;
  const pull = MAX_SPEED / PULL_POWER;
  return { swipe: { from: { x: s.x, y: s.y }, dx: (-dx / length) * pull, dy: (-dy / length) * pull } };
}
