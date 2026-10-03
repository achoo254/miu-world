// Magnet sweep: odds and ends lie on a sandy yard. The child drags a big magnet over them: iron things (keys,
// paper clips, nuts and bolts) jump up and stick to it; wood, leaves, feathers and shells stay where they are.
// The more it carries, the heavier and slower the magnet; a full magnet picks up nothing more. Carried to the
// toolbox, everything drops in: a point each. New things turn up as old ones are cleared. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

/** Kinds 0–3 are iron (draw.ts: key, old key, paper clip, nut and bolt); 4–8 are not. */
export const IRON_KINDS = 4;
export const KINDS = 9;
export const CAPACITY = 8;
export const PICK_RADIUS = 62;
export const BOX_RADIUS = 95;

export interface Thing extends Point {
  kind: number;
  /** Seconds since it appeared (pops in), and its resting tilt. */
  age: number;
  tilt: number;
  /** Stuck to the magnet: its place around it and how far it has flown there (0–1). */
  stuck: { angle: number; fly: number } | null;
}

export interface MagnetState {
  magnet: Point;
  things: Thing[];
  box: Point;
  load: number;
  /** Seconds since the last drop into the box (the lid bounces). */
  droppedAgo: number;
  field: { x: number; y: number; w: number; h: number };
  score: number;
  time: number;
}

const SPEED = 480;
const IRON_ON_FIELD = 8;
const OTHERS_ON_FIELD = 8;

export const isIron = (t: Thing): boolean => t.kind < IRON_KINDS;

export function createMagnetSweep({ arena, rng }: GameSetup): MinigameLogic<MagnetState> {
  const events = eventQueue();
  const field = { x: 40, y: HUD_SAFE_TOP + 30, w: arena.width - 80, h: arena.height - HUD_SAFE_TOP - 70 };
  const landscape = arena.width > arena.height;
  const box = landscape ? { x: field.x + 70, y: field.y + field.h - 70 } : { x: arena.width / 2, y: field.y + field.h - 60 };
  const state: MagnetState = {
    magnet: { x: arena.width / 2 + (landscape ? 120 : 0), y: field.y + field.h * 0.4 },
    things: [],
    box,
    load: 0,
    droppedAgo: 9,
    field,
    score: 0,
    time: 0,
  };

  function place(kind: number, r: Rng): void {
    for (let tries = 0; tries < 40; tries += 1) {
      const x = r.range(field.x + 30, field.x + field.w - 30);
      const y = r.range(field.y + 30, field.y + field.h - 30);
      const nearBox = Math.hypot(x - box.x, y - box.y) < BOX_RADIUS + 60;
      const crowded = state.things.some((t) => !t.stuck && Math.hypot(t.x - x, t.y - y) < 70);
      if (!nearBox && !crowded) {
        state.things.push({ kind, x, y, age: 0, tilt: r.range(-0.6, 0.6), stuck: null });
        return;
      }
    }
  }

  function restock(): void {
    const loose = state.things.filter((t) => !t.stuck);
    let iron = loose.filter(isIron).length;
    let others = loose.length - iron;
    while (iron < IRON_ON_FIELD) {
      place(rng.int(0, IRON_KINDS - 1), rng);
      iron += 1;
    }
    while (others < OTHERS_ON_FIELD) {
      place(rng.int(IRON_KINDS, KINDS - 1), rng);
      others += 1;
    }
  }

  restock();
  for (const t of state.things) t.age = 9;

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
      state.droppedAgo += dt;
      for (const t of state.things) {
        t.age += dt;
        if (t.stuck) t.stuck.fly = Math.min(1, t.stuck.fly + dt * 5);
      }
      const target = input.pointer ?? input.taps.at(-1) ?? null;
      if (target) {
        // Heavier when loaded: a full magnet moves at less than half speed.
        const speed = SPEED * (1 - 0.07 * state.load);
        const dx = target.x - state.magnet.x;
        const dy = target.y - state.magnet.y;
        const d = Math.hypot(dx, dy);
        const move = Math.min(d, speed * dt);
        if (d > 0) {
          state.magnet.x = Math.min(field.x + field.w, Math.max(field.x, state.magnet.x + (dx / d) * move));
          state.magnet.y = Math.min(field.y + field.h, Math.max(field.y, state.magnet.y + (dy / d) * move));
        }
      }
      // Iron jumps up to the magnet.
      for (const t of state.things) {
        if (t.stuck || !isIron(t) || state.load >= CAPACITY || t.age < 0.3) continue;
        if (Math.hypot(t.x - state.magnet.x, t.y - state.magnet.y) <= PICK_RADIUS) {
          t.stuck = { angle: rng.range(0, Math.PI * 2), fly: 0 };
          state.load += 1;
          events.push({ type: 'action', x: t.x, y: t.y, note: 72 + state.load, voice: 'bell' });
        }
      }
      // Into the toolbox.
      if (state.load > 0 && Math.hypot(state.magnet.x - box.x, state.magnet.y - box.y) <= BOX_RADIUS) {
        const points = state.load;
        state.things = state.things.filter((t) => !t.stuck);
        state.load = 0;
        state.score += points;
        state.droppedAgo = 0;
        events.push({ type: 'score', x: box.x, y: box.y - 50, points });
        restock();
      }
      // Stuck things ride with the magnet; the field fills up again as it empties.
      if (state.things.filter((t) => !t.stuck && isIron(t)).length < IRON_ON_FIELD - 4) restock();
    },
  };
}

/** Good play: sweeps up the nearest iron until heavy, then heads for the toolbox. */
export function magnetBot(state: MagnetState, _context: BotContext): BotMove {
  const loose = state.things.filter((t) => !t.stuck && isIron(t));
  const { magnet, box } = state;
  const distBox = Math.hypot(magnet.x - box.x, magnet.y - box.y);
  let nearest: Thing | null = null;
  let best = Infinity;
  for (const t of loose) {
    // Prefer things on the way to the box when already carrying some.
    const d = Math.hypot(t.x - magnet.x, t.y - magnet.y) + (state.load > 0 ? Math.hypot(t.x - box.x, t.y - box.y) * 0.5 : 0);
    if (d < best) {
      best = d;
      nearest = t;
    }
  }
  const goHome = state.load >= CAPACITY - 2 || (state.load > 0 && (!nearest || best > distBox + 250));
  const target = goHome || !nearest ? box : nearest;
  return { touch: { x: target.x, y: target.y } };
}
