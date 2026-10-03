// Rain shield: a puppy sits on the grass and a rain cloud is coming. The child draws one stroke (a limited
// amount of ink) to make a roof; when she lifts her finger the rain starts, slanted by the wind. Drops that
// hit the roof run down it and drip off its lower end. If the puppy stays dry until the shower ends, the level
// is passed (a point) and the next one has a stronger wind and the puppy somewhere else; if a drop reaches it,
// it shakes itself and the level is drawn again. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const RAIN_SECONDS = 6;
const FALL = 420;
const SLIDE = 320;
const DROPS_PER_SECOND = 45;
export const DOG_RADIUS = 42;
const AFTER_SECONDS = 1;

export interface Drop {
  x: number;
  y: number;
  /** Index of the roof segment it runs along, or -1 while falling. */
  on: number;
}

export interface RainState {
  phase: 'draw' | 'rain' | 'dry' | 'wet';
  inPhase: number;
  dog: Point;
  wind: number;
  stroke: Point[];
  ink: number;
  drops: Drop[];
  cloudY: number;
  groundY: number;
  levels: number;
  score: number;
  time: number;
}

/** Where segment p1–p2 crosses segment a–b (as a share t along p1–p2), or null. */
function cross(p1: Point, p2: Point, a: Point, b: Point): number | null {
  const d = (p2.x - p1.x) * (b.y - a.y) - (p2.y - p1.y) * (b.x - a.x);
  if (Math.abs(d) < 1e-9) return null;
  const t = ((a.x - p1.x) * (b.y - a.y) - (a.y - p1.y) * (b.x - a.x)) / d;
  const u = ((a.x - p1.x) * (p2.y - p1.y) - (a.y - p1.y) * (p2.x - p1.x)) / d;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? t : null;
}

export const strokeLength = (stroke: readonly Point[]): number => stroke.reduce((s, p, i) => (i === 0 ? 0 : s + Math.hypot(p.x - (stroke[i - 1]?.x ?? p.x), p.y - (stroke[i - 1]?.y ?? p.y))), 0);

export function createRainShield({ arena, params, rng }: GameSetup): MinigameLogic<RainState> {
  const ink = typeof params.ink === 'number' ? Math.min(500, Math.max(200, params.ink)) : 300;
  const events = eventQueue();
  const groundY = arena.height - 60;
  const level = (r: Rng, n: number): { dog: Point; wind: number } => {
    const strength = Math.min(150, 40 + n * 25);
    const wind = n === 0 ? 0 : (r.chance(0.5) ? -1 : 1) * r.range(strength * 0.6, strength);
    return { dog: { x: r.range(arena.width * 0.35, arena.width * 0.65), y: groundY - DOG_RADIUS }, wind };
  };
  const first = level(rng, 0);
  const state: RainState = { phase: 'draw', inPhase: 0, dog: first.dog, wind: first.wind, stroke: [], ink, drops: [], cloudY: HUD_SAFE_TOP + 40, groundY, levels: 0, score: 0, time: 0 };
  let carry = 0;

  function next(passed: boolean): void {
    if (passed) {
      state.levels += 1;
      const l = level(rng, state.levels);
      state.dog = l.dog;
      state.wind = l.wind;
    }
    state.stroke = [];
    state.drops = [];
    state.phase = 'draw';
    state.inPhase = 0;
  }

  function stepDrop(d: Drop, dt: number): void {
    if (d.on >= 0) {
      const a = state.stroke[d.on];
      const b = state.stroke[d.on + 1];
      if (!a || !b) {
        d.on = -1;
        return;
      }
      // Run toward the lower end of this piece; off its end it carries on to the next piece or drips.
      const [hi, lo, dir] = a.y <= b.y ? [a, b, 1] : [b, a, -1];
      const len = Math.hypot(lo.x - hi.x, lo.y - hi.y) || 1;
      d.x += ((lo.x - hi.x) / len) * SLIDE * dt;
      d.y += ((lo.y - hi.y) / len) * SLIDE * dt;
      const past = (d.x - hi.x) * (lo.x - hi.x) + (d.y - hi.y) * (lo.y - hi.y) >= len * len;
      if (past) {
        // The next piece along, if the water keeps running down it.
        const nextPiece = d.on + dir;
        const far = state.stroke[dir === 1 ? d.on + 2 : d.on - 1];
        d.x = lo.x;
        d.y = lo.y + 1;
        d.on = far && far.y >= lo.y && nextPiece >= 0 ? nextPiece : -1;
      }
      return;
    }
    const from = { x: d.x, y: d.y };
    d.x += state.wind * dt;
    d.y += FALL * dt;
    for (let i = 0; i < state.stroke.length - 1; i += 1) {
      const a = state.stroke[i];
      const b = state.stroke[i + 1];
      if (!a || !b) continue;
      const t = cross(from, d, a, b);
      if (t !== null) {
        d.x = from.x + (d.x - from.x) * t;
        d.y = from.y + (d.y - from.y) * t - 1;
        d.on = i;
        return;
      }
    }
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
      state.inPhase += dt;
      switch (state.phase) {
        case 'draw': {
          const p = input.pointer;
          if (p && p.y > state.cloudY + 40) {
            const last = state.stroke[state.stroke.length - 1];
            if (!last || (Math.hypot(p.x - last.x, p.y - last.y) >= 6 && strokeLength(state.stroke) + Math.hypot(p.x - last.x, p.y - last.y) <= ink)) state.stroke.push({ ...p });
          }
          if (input.released) {
            if (strokeLength(state.stroke) >= 60) {
              state.phase = 'rain';
              state.inPhase = 0;
              events.push({ type: 'action', x: arena.width / 2, y: state.cloudY });
            } else state.stroke = [];
          }
          return;
        }
        case 'rain': {
          // Drops start over a band upwind of the puppy, so slanted rain reaches it.
          const upwind = -(state.wind / FALL) * (state.dog.y - state.cloudY);
          if (state.inPhase < RAIN_SECONDS - 1) {
            carry += DROPS_PER_SECOND * dt;
            while (carry >= 1) {
              carry -= 1;
              state.drops.push({ x: state.dog.x + upwind + rng.range(-260, 260), y: state.cloudY + 30, on: -1 });
            }
          }
          for (const d of state.drops) {
            stepDrop(d, dt);
            if (Math.hypot(d.x - state.dog.x, d.y - state.dog.y) <= DOG_RADIUS) {
              state.phase = 'wet';
              state.inPhase = 0;
              events.push({ type: 'hit', x: state.dog.x, y: state.dog.y });
              return;
            }
          }
          state.drops = state.drops.filter((d) => d.y < state.groundY && d.x > -50 && d.x < arena.width + 50);
          if (state.inPhase >= RAIN_SECONDS) {
            state.phase = 'dry';
            state.inPhase = 0;
            state.score += 1;
            events.push({ type: 'score', x: state.dog.x, y: state.dog.y - 60 });
          }
          return;
        }
        case 'dry':
        case 'wet':
          if (state.inPhase >= AFTER_SECONDS) next(state.phase === 'dry');
      }
    },
  };
}

/** Good play: a straight roof upwind over the puppy, sloping down the way the wind blows. */
export function rainShieldBot(state: RainState, _context: BotContext): BotMove {
  if (state.phase !== 'draw') return {};
  const h = 150;
  const y = state.dog.y - h;
  const cx = state.dog.x - (state.wind / FALL) * h;
  const down = state.wind >= 0 ? 1 : -1;
  const half = Math.min(125, state.ink / 2 - 10);
  const start = { x: cx - down * half, y: y - 30 };
  const end = { x: cx + down * half, y: y + 30 };
  if (state.stroke.length === 0) return { touch: start };
  if (state.stroke.length === 1) return { touch: end };
  return {};
}
