// Dart wobble: a big dartboard and a wobbly aim. The aim circles round the board, its loop shrinking to the
// bullseye and swelling out again in a steady beat (with a little shake on top, a hand that is not quite
// still). A tap throws a dart where the aim is at that moment; rings score 50, 30, 20, 10, the board's rim 5.
// Six darts; each dart's aim loops a little faster. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export interface Dart {
  /** Where it lands, relative to the board's centre. */
  dx: number;
  dy: number;
  points: number;
  /** Seconds since thrown: it flies for FLIGHT seconds, then sticks. */
  t: number;
}

export interface DartState {
  boardX: number;
  boardY: number;
  radius: number;
  /** The aim, relative to the board's centre. */
  aimX: number;
  aimY: number;
  /** Phase of the aim's loop for this dart (seconds of wobble). */
  phase: number;
  darts: Dart[];
  /** Darts left in the hand. */
  left: number;
  /** Seconds until the next dart is ready (after one lands). */
  cooldown: number;
  score: number;
  time: number;
}

export const DARTS = 6;
export const FLIGHT = 0.3;
const COOLDOWN = 0.9;
/** Ring edges as fractions of the board's radius, and their points (outside the last: the rim). */
export const RINGS: ReadonlyArray<readonly [number, number]> = [
  [0.14, 50],
  [0.36, 30],
  [0.6, 20],
  [0.84, 10],
  [1.0, 5],
];

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export function pointsAt(distance: number, radius: number): number {
  for (const [edge, points] of RINGS) if (distance <= edge * radius) return points;
  return 0;
}

export function createDartWobble({ arena, params, rng }: GameSetup): MinigameLogic<DartState> {
  const wobble = typeof params.wobble === 'number' ? clamp(params.wobble, 0.6, 1.5) : 1;
  const events = eventQueue();
  const room = Math.min(arena.width, arena.height - HUD_SAFE_TOP - 200);
  const radius = clamp(room * 0.42, 150, 250);
  const state: DartState = {
    boardX: arena.width / 2,
    boardY: HUD_SAFE_TOP + 30 + radius + Math.max(0, (arena.height - HUD_SAFE_TOP - 200 - radius * 2) * 0.3),
    radius,
    aimX: 0,
    aimY: 0,
    phase: rng.range(0, 3),
    darts: [],
    left: DARTS,
    cooldown: 0,
    score: 0,
    time: 0,
  };
  // Each round's own loop: speed of the circling and of the in-and-out beat.
  const spin = rng.range(2.2, 2.8) * (rng.chance(0.5) ? 1 : -1);
  const beat = rng.range(1.5, 1.8);
  const shake = rng.range(0, 10);

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      const last = state.darts[state.darts.length - 1];
      return state.left === 0 && (!last || last.t >= FLIGHT + 0.6);
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      for (const d of state.darts) {
        const before = d.t;
        d.t += dt;
        if (before < FLIGHT && d.t >= FLIGHT) {
          if (d.points > 0) {
            state.score += d.points;
            events.push({ type: 'score', x: state.boardX + d.dx, y: state.boardY + d.dy, points: d.points });
          } else events.push({ type: 'miss', x: state.boardX + d.dx, y: state.boardY + d.dy });
        }
      }
      if (state.left === 0) return;
      state.cooldown = Math.max(0, state.cooldown - dt);
      // Later darts loop faster.
      const thrown = DARTS - state.left;
      state.phase += dt * wobble * (1 + thrown * 0.07);
      const p = state.phase;
      const r = radius * 0.85 * Math.abs(Math.sin(p * beat));
      const a = p * spin;
      state.aimX = Math.cos(a) * r + Math.sin(p * 9 + shake) * 4;
      state.aimY = Math.sin(a) * r + Math.cos(p * 7 + shake) * 4;
      if (input.taps.length > 0 && state.cooldown <= 0) {
        const points = pointsAt(Math.hypot(state.aimX, state.aimY), radius);
        state.darts.push({ dx: state.aimX, dy: state.aimY, points, t: 0 });
        state.left -= 1;
        state.cooldown = COOLDOWN;
        events.push({ type: 'action', x: arena.width / 2, y: arena.height - 120 });
      }
    },
  };
}

/** Good play: throw when the aim is in the bullseye. */
export function dartBot(state: DartState, context: BotContext): BotMove {
  if (state.cooldown > 0 || state.left === 0) return {};
  return Math.hypot(state.aimX, state.aimY) < state.radius * 0.1 ? { tap: { x: context.arena.width / 2, y: context.arena.height - 150 } } : {};
}
