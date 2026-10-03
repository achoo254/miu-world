// Water pistol: a fairground booth with three shelves of tin ducks gliding left and right (the middle shelf the
// other way). The child holds a finger on the screen and a jet of water follows it, a little behind (the aim
// eases toward the finger, so fast targets need leading). A target kept in the jet for a moment flips down:
// a duck is a point, a rare bullseye three. The tank empties while the jet runs and refills when the finger
// lifts, so the child sprays in bursts instead of holding forever. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export type TargetKind = 'duck' | 'bullseye';

export interface Target {
  kind: TargetKind;
  row: number;
  x: number;
  /** Seconds it has been in the jet (dries off slowly when the jet moves away). */
  wet: number;
  /** Seconds since it was knocked down (-1 while standing). */
  down: number;
}

export interface Row {
  y: number;
  /** Units per second, signed. */
  vx: number;
  /** Seconds until the next target rolls in. */
  nextIn: number;
}

export interface WaterPistolState {
  rows: Row[];
  targets: Target[];
  gun: Point;
  /** Where the jet lands now (eases toward the finger). */
  aim: Point;
  spraying: boolean;
  /** 0 … 1. */
  water: number;
  /** The tank ran dry: no water until it refills a little. */
  dry: boolean;
  score: number;
  time: number;
}

/** Seconds of jet a full tank holds, and seconds to refill it from empty. */
const TANK_SECONDS = 2.6;
const REFILL_SECONDS = 1.4;
/** Seconds in the jet that knock a target down. */
export const SOAK_SECONDS = 0.3;
/** How close the jet's centre must be to a target: wider than the picture, for young hands. */
export const HIT_RADIUS = 52;
/** How quickly the aim follows the finger (per second). */
const AIM_FOLLOW = 7;
const BULLSEYE_SHARE = 0.14;
const TARGET_HALF = 40;

export function createWaterPistol({ arena, duration, params, rng }: GameSetup): MinigameLogic<WaterPistolState> {
  const factor = typeof params.speed === 'number' ? Math.min(1.6, Math.max(0.6, params.speed)) : 1;
  const events = eventQueue();
  const top = HUD_SAFE_TOP + 70;
  const bottom = Math.min(arena.height * 0.6, top + 520);
  const gap = (bottom - top) / 2;
  const state: WaterPistolState = {
    rows: [0, 1, 2].map((i) => ({ y: top + gap * i, vx: (i % 2 === 0 ? 1 : -1) * (80 + i * 18) * factor, nextIn: rng.range(0, 0.8) })),
    targets: [],
    // On a tall phone the pistol comes up toward the booth instead of sitting far below it.
    gun: { x: arena.width / 2, y: Math.min(arena.height - 80, bottom + 330) },
    aim: { x: arena.width / 2, y: (top + bottom) / 2 },
    spraying: false,
    water: 1,
    dry: false,
    score: 0,
    time: 0,
  };
  // Shelves start partly filled so there is something to aim at from the first second.
  state.rows.forEach((row, r) => {
    for (let x = rng.range(60, 180); x < arena.width - 40; x += rng.range(240, 340)) state.targets.push({ kind: 'duck', row: r, x, wet: 0, down: -1 });
    row.nextIn = rng.range(0.6, 1.4);
  });

  const progress = (): number => Math.min(1, state.time / duration);

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
      const ramp = 1 + 0.35 * progress();

      // Targets roll in from the side each shelf moves away from.
      state.rows.forEach((row, r) => {
        row.nextIn -= dt;
        if (row.nextIn <= 0) {
          const kind: TargetKind = rng.chance(BULLSEYE_SHARE) ? 'bullseye' : 'duck';
          state.targets.push({ kind, row: r, x: row.vx > 0 ? -TARGET_HALF : arena.width + TARGET_HALF, wet: 0, down: -1 });
          row.nextIn = rng.range(2.3, 3.5) / ramp;
        }
      });
      for (const t of state.targets) {
        const row = state.rows[t.row];
        if (!row) continue;
        if (t.down >= 0) {
          t.down += dt;
          continue;
        }
        t.x += row.vx * ramp * (t.kind === 'bullseye' ? 1.35 : 1) * dt;
      }
      state.targets = state.targets.filter((t) => t.down < 0.6 && t.x > -TARGET_HALF * 2 && t.x < arena.width + TARGET_HALF * 2);

      // The aim eases toward the finger; the jet runs while it touches and there is water.
      const finger = input.pointer;
      if (finger) {
        const k = Math.min(1, AIM_FOLLOW * dt);
        state.aim.x += (finger.x - state.aim.x) * k;
        state.aim.y += (Math.min(finger.y, state.gun.y - 120) - state.aim.y) * k;
      }
      if (input.pressed && !state.dry) events.push({ type: 'action', x: state.gun.x, y: state.gun.y - 40 });
      state.spraying = finger !== null && !state.dry;
      if (state.spraying) {
        state.water = Math.max(0, state.water - dt / TANK_SECONDS);
        if (state.water <= 0) state.dry = true;
      } else if (!finger || state.dry) {
        state.water = Math.min(1, state.water + dt / REFILL_SECONDS);
        if (state.dry && state.water >= 0.35 && !finger) state.dry = false;
      }

      for (const t of state.targets) {
        if (t.down >= 0) continue;
        const row = state.rows[t.row];
        if (!row) continue;
        const inJet = state.spraying && Math.hypot(t.x - state.aim.x, row.y - state.aim.y) <= HIT_RADIUS;
        t.wet = inJet ? t.wet + dt : Math.max(0, t.wet - dt * 0.5);
        if (t.wet >= SOAK_SECONDS) {
          t.down = 0;
          const points = t.kind === 'bullseye' ? 3 : 1;
          state.score += points;
          events.push({ type: 'score', x: t.x, y: row.y - 30, points });
        }
      }
    },
  };
}

/**
 * Good play: aim a little ahead of the standing target nearest the jet, spray in bursts, and let the tank refill
 * when it runs low (lifting the finger for a breath, as a child would).
 */
export function waterPistolBot(state: WaterPistolState, context: BotContext): BotMove {
  if (state.dry || (!state.spraying && state.water < 0.7)) return {};
  const standing = state.targets.filter((t) => t.down < 0 && t.x > 40 && t.x < context.arena.width - 40);
  let best: { x: number; y: number; d: number } | null = null;
  for (const t of standing) {
    const row = state.rows[t.row];
    if (!row) continue;
    const lead = row.vx * (t.kind === 'bullseye' ? 1.35 : 1) * 0.3;
    const x = t.x + lead;
    const d = Math.hypot(x - state.aim.x, row.y - state.aim.y) - (t.kind === 'bullseye' ? 120 : 0);
    if (!best || d < best.d) best = { x, y: row.y, d };
  }
  if (!best) return {};
  return { touch: { x: Math.min(context.arena.width - 30, Math.max(30, best.x)), y: best.y } };
}
