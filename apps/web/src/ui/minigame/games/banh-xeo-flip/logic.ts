// Bánh xèo: three pans sit on the stove. A tap on an empty pan pours batter; it cooks from pale to golden
// (a ring round the pan fills, green while golden). A tap while golden flips it (folded over, the other side
// cooks); a tap on a golden folded cake slides it onto the plate: a point. Flipped or served too early, the
// cake is still raw and earns nothing (so tapping all the time does not work); left too long it burns, and three burnt cakes end the round early. Three pans at once keep the hands busy.
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type Arena, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export type PanPhase = 'empty' | 'first' | 'second' | 'burnt' | 'served';

export interface Pan extends Point {
  phase: PanPhase;
  /** Seconds on the current side (or since it burnt or was served). */
  t: number;
  /** Seconds this side takes to turn golden. */
  golden: number;
  /** Seconds since a too-early tap (a wiggle). */
  nudged: number;
  /** A side was flipped while still raw: this cake earns nothing. */
  raw: boolean;
}

export interface BanhXeoState {
  pans: Pan[];
  panRadius: number;
  plate: Point;
  lives: number;
  served: number;
  score: number;
  time: number;
}

/** Seconds a side stays golden before it starts to burn. */
export const GOLDEN_SECONDS = 2.2;
const BURNT_SECONDS = 1.2;
const SERVED_SECONDS = 0.6;
const LIVES = 3;

export type Doneness = 'raw' | 'golden' | 'burnt';

/** How done the side in the pan is. */
export function doneness(pan: Pan): Doneness {
  if (pan.t < pan.golden) return 'raw';
  return pan.t < pan.golden + GOLDEN_SECONDS ? 'golden' : 'burnt';
}

function layout(arena: Arena): { pans: Point[]; panRadius: number; plate: Point } {
  const top = HUD_SAFE_TOP + 20;
  const panRadius = Math.min(84, arena.width / 7.4);
  const spacing = Math.min(arena.width / 3, 260);
  const y = top + (arena.height - top) * (arena.width > arena.height ? 0.42 : 0.4);
  const pans = [-1, 0, 1].map((k) => ({ x: arena.width / 2 + k * spacing, y }));
  return { pans, panRadius, plate: { x: arena.width / 2, y: Math.min(arena.height - 80, y + panRadius + 150) } };
}

export function createBanhXeo({ arena, params, rng }: GameSetup): MinigameLogic<BanhXeoState> {
  const factor = typeof params.speed === 'number' ? Math.min(1.5, Math.max(0.6, params.speed)) : 1;
  const events = eventQueue();
  const place = layout(arena);
  const cookTime = (r: Rng): number => r.range(2.6, 3.6) / factor;
  const state: BanhXeoState = {
    pans: place.pans.map((p) => ({ ...p, phase: 'empty', t: 0, golden: 3, nudged: 9, raw: false })),
    panRadius: place.panRadius,
    plate: place.plate,
    lives: LIVES,
    served: 0,
    score: 0,
    time: 0,
  };

  const tapPan = (pan: Pan): void => {
    if (pan.phase === 'empty') {
      pan.phase = 'first';
      pan.t = 0;
      pan.raw = false;
      pan.golden = cookTime(rng);
      events.push({ type: 'action', x: pan.x, y: pan.y });
      return;
    }
    if (pan.phase !== 'first' && pan.phase !== 'second') return;
    if (doneness(pan) !== 'golden') {
      pan.nudged = 0;
      pan.raw = true;
    }
    if (pan.phase === 'first') {
      pan.phase = 'second';
      pan.t = 0;
      pan.golden = cookTime(rng) * 0.8;
      events.push({ type: 'action', x: pan.x, y: pan.y });
      return;
    }
    pan.phase = 'served';
    pan.t = 0;
    if (pan.raw) {
      events.push({ type: 'miss', x: pan.x, y: pan.y });
      return;
    }
    state.served += 1;
    state.score += 1;
    events.push({ type: 'score', x: pan.x, y: pan.y - 40 });
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
      const press = input.pressed ? (input.pointer ?? input.taps[0] ?? null) : null;
      if (press) {
        // The nearest pan within reach (pans are big, the handle side counts too).
        const pan = state.pans
          .map((p) => ({ p, d: Math.hypot(p.x - press.x, p.y - press.y) }))
          .filter(({ d }) => d <= state.panRadius + 30)
          .sort((a, b) => a.d - b.d)[0]?.p;
        if (pan) tapPan(pan);
      }
      for (const pan of state.pans) {
        pan.t += dt;
        pan.nudged += dt;
        if ((pan.phase === 'first' || pan.phase === 'second') && doneness(pan) === 'burnt') {
          pan.phase = 'burnt';
          pan.t = 0;
          state.lives -= 1;
          events.push({ type: 'hit', x: pan.x, y: pan.y });
        } else if (pan.phase === 'burnt' && pan.t >= BURNT_SECONDS) pan.phase = 'empty';
        else if (pan.phase === 'served' && pan.t >= SERVED_SECONDS) pan.phase = 'empty';
      }
    },
  };
}

/** Good play: deal with the most urgent golden cake first, and keep every empty pan cooking. */
export function banhXeoBot(state: BanhXeoState, _context: BotContext): BotMove {
  const ready = state.pans
    .filter((p) => (p.phase === 'first' || p.phase === 'second') && doneness(p) === 'golden')
    .sort((a, b) => b.t - b.golden - (a.t - a.golden));
  const pan = ready[0] ?? state.pans.find((p) => p.phase === 'empty');
  return pan ? { tap: { x: pan.x, y: pan.y } } : {};
}
