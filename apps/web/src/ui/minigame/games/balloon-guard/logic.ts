// Balloon guard: the child's friend floats up the sky under a big balloon while leaves, chestnuts and pebbles
// drop toward it. The child drags an umbrella (held a little above her finger) to knock them away. Each metre
// climbed is a point; something hitting the balloon slows it for a moment and costs one of three hearts.
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const UMBRELLA_R = 64;
/** The umbrella floats this far above the finger, so the finger never hides it. */
export const LIFT = 80;
export const BALLOON_R = 50;
const CLIMB = 3.2;
const SLOW_SECONDS = 1.5;
const LIVES = 3;
const UMBRELLA_SPEED = 2200;
/** Falling things: leaf, chestnut, pebble (draw.ts pictures). */
const KINDS = [
  { speed: 150, r: 24 },
  { speed: 310, r: 20 },
  { speed: 240, r: 24 },
] as const;

export interface Faller {
  kind: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  knocked: boolean;
}

export interface BalloonState {
  balloon: Point;
  umbrella: Point;
  fallers: Faller[];
  metres: number;
  slowUntil: number;
  hitAt: number;
  lives: number;
  score: number;
  time: number;
}

export function createBalloonGuard({ arena, duration, rng }: GameSetup): MinigameLogic<BalloonState> {
  const events = eventQueue();
  const baseY = HUD_SAFE_TOP + (arena.height - HUD_SAFE_TOP) * 0.62;
  const state: BalloonState = {
    balloon: { x: arena.width / 2, y: baseY },
    umbrella: { x: arena.width / 2, y: baseY - 170 },
    fallers: [],
    metres: 0,
    slowUntil: 0,
    hitAt: -9,
    lives: LIVES,
    score: 0,
    time: 0,
  };
  let spawnIn = 1.2;
  const swayAt = (t: number): number => arena.width / 2 + Math.sin(t * 0.7) * Math.min(120, arena.width * 0.15);

  const spawn = (r: Rng): void => {
    const kind = r.int(0, KINDS.length - 1);
    const k = KINDS[kind] ?? KINDS[0];
    const vy = k.speed * (1 + (state.time / duration) * 0.5);
    // Aimed at where the balloon will be when it gets there.
    const arrive = state.time + (state.balloon.y - 40 - HUD_SAFE_TOP) / vy;
    const x = Math.min(arena.width - 30, Math.max(30, swayAt(arrive) + r.range(-40, 40)));
    state.fallers.push({ kind, x, y: HUD_SAFE_TOP - 10, vx: 0, vy, knocked: false });
  };

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
      const slow = state.time < state.slowUntil;
      state.metres += (slow ? CLIMB / 2 : CLIMB) * dt;
      const before = state.score;
      state.score = Math.floor(state.metres);
      if (state.score > before && state.score % 10 === 0) events.push({ type: 'score', x: state.balloon.x, y: state.balloon.y - 80, points: 10 });
      // The balloon sways gently.
      state.balloon.x = swayAt(state.time);

      const prev = { ...state.umbrella };
      const p = input.pointer;
      if (p) {
        const tx = p.x;
        const ty = Math.max(HUD_SAFE_TOP, p.y - LIFT);
        const d = Math.hypot(tx - state.umbrella.x, ty - state.umbrella.y);
        const move = Math.min(d, UMBRELLA_SPEED * dt);
        if (d > 0) {
          state.umbrella.x += ((tx - state.umbrella.x) / d) * move;
          state.umbrella.y += ((ty - state.umbrella.y) / d) * move;
        }
      }
      const uvx = (state.umbrella.x - prev.x) / dt;
      const uvy = (state.umbrella.y - prev.y) / dt;

      spawnIn -= dt;
      if (spawnIn <= 0) {
        spawn(rng);
        spawnIn += 0.95 - 0.4 * Math.min(1, state.time / duration);
      }
      const kept: Faller[] = [];
      for (const f of state.fallers) {
        const k = KINDS[f.kind] ?? KINDS[0];
        if (f.kind === 0 && !f.knocked) f.vx = Math.cos(state.time * 3 + f.y * 0.02) * 40;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        if (!f.knocked) {
          const du = f.x - state.umbrella.x;
          const dv = f.y - state.umbrella.y;
          const d = Math.hypot(du, dv);
          if (d < UMBRELLA_R + k.r) {
            f.knocked = true;
            const nx = d > 0 ? du / d : 0;
            const ny = d > 0 ? dv / d : -1;
            f.vx = nx * 520 + uvx * 0.3 + (nx >= 0 ? 120 : -120);
            f.vy = ny * 300 + uvy * 0.3 - 150;
            events.push({ type: 'action', x: f.x, y: f.y });
          } else if (Math.hypot(f.x - state.balloon.x, f.y - (state.balloon.y - 40)) < BALLOON_R + k.r) {
            state.lives -= 1;
            state.hitAt = state.time;
            state.slowUntil = state.time + SLOW_SECONDS;
            events.push({ type: 'hit', x: f.x, y: f.y });
            continue;
          }
        } else f.vy += 900 * dt;
        if (f.y < arena.height + 40 && f.x > -60 && f.x < arena.width + 60) kept.push(f);
      }
      state.fallers = kept;
    },
  };
}

/** Good play: the umbrella over whatever will reach the balloon first; otherwise resting above the balloon. */
export function balloonBot(state: BalloonState, _context: BotContext): BotMove {
  const guardY = state.balloon.y - 170;
  let best: Faller | null = null;
  let soonest = Infinity;
  for (const f of state.fallers) {
    if (f.knocked || f.y > guardY + 30) continue;
    const t = (state.balloon.y - 40 - f.y) / f.vy;
    if (Math.abs(f.x - state.balloon.x) < BALLOON_R + 80 && t < soonest) {
      soonest = t;
      best = f;
    }
  }
  const x = best ? best.x : state.balloon.x;
  const y = best ? Math.max(best.y + 40, guardY - 60) : guardY;
  return { touch: { x, y: y + LIFT } };
}
