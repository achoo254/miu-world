// Net cast ("Quăng chài"): the child stands in a canoe on the river, with shoals of fish swimming about. A
// swipe throws the round cast net: its direction is where, its length how far (the net flies farther than the
// swipe). The net takes a moment in the air, and fish that notice its shadow dart away, so the throw must lead
// a moving shoal. Every fish under the net when it lands is a point; then the net is hauled back in.
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface Fish extends Point {
  vx: number;
  vy: number;
  shoal: number;
  /** Tropical fish look different (just for fun). */
  tropical: boolean;
  caughtAt: number;
}

export type NetPhase = 'ready' | 'flying' | 'hauling';

export interface NetCastState {
  boat: Point;
  fish: Fish[];
  phase: NetPhase;
  phaseAgo: number;
  /** Where the net is going to land, and the net's radius. */
  target: Point;
  radius: number;
  /** The water's box. */
  water: { top: number; bottom: number; left: number; right: number };
  lastCatch: number;
  shoals: number;
  score: number;
  time: number;
}

/** The net flies this many times the swipe's length. */
export const THROW_GAIN = 2.2;
export const FLY_SECONDS = 0.9;
const HAUL_SECONDS = 0.7;
const SHOALS = 4;
/** In the last part of the flight, fish this near the landing spot dart away at this speed. */
const NOTICE = 0.4;
const DART = 80;

export function createNetCast({ arena, rng }: GameSetup): MinigameLogic<NetCastState> {
  const events = eventQueue();
  const boat = { x: arena.width / 2, y: arena.height - 90 };
  const water = { top: HUD_SAFE_TOP + 30, bottom: boat.y - 110, left: 30, right: arena.width - 30 };
  const state: NetCastState = {
    boat,
    fish: [],
    phase: 'ready',
    phaseAgo: 0,
    target: { ...boat },
    radius: Math.min(100, arena.width * 0.14),
    water,
    lastCatch: 0,
    shoals: 0,
    score: 0,
    time: 0,
  };

  const addShoal = (r: Rng): void => {
    const id = state.shoals;
    state.shoals += 1;
    const speed = r.range(55, 105);
    const angle = r.range(0, Math.PI * 2);
    const cx = r.range(water.left + 80, water.right - 80);
    const cy = r.range(water.top + 60, water.bottom - 60);
    const tropical = r.chance(0.3);
    for (let k = r.int(3, 6); k > 0; k -= 1) {
      state.fish.push({ x: cx + r.range(-45, 45), y: cy + r.range(-35, 35), vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, shoal: id, tropical, caughtAt: -1 });
    }
  };
  for (let i = 0; i < SHOALS; i += 1) addShoal(rng);

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
      state.phaseAgo += dt;
      const swimming = state.fish.filter((f) => f.caughtAt < 0);
      for (const f of swimming) {
        // Bounce off the banks; a shoal wanders a little.
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        if (f.x < water.left || f.x > water.right) f.vx = -f.vx;
        if (f.y < water.top || f.y > water.bottom) f.vy = -f.vy;
        f.x = Math.min(water.right, Math.max(water.left, f.x));
        f.y = Math.min(water.bottom, Math.max(water.top, f.y));
        if (state.phase === 'flying' && state.phaseAgo > FLY_SECONDS - NOTICE) {
          const dx = f.x - state.target.x;
          const dy = f.y - state.target.y;
          const d = Math.hypot(dx, dy);
          if (d < state.radius * 1.4 && d > 1) {
            f.x += (dx / d) * DART * dt;
            f.y += (dy / d) * DART * dt;
          }
        }
      }
      if (state.phase === 'ready') {
        const swipe = input.swipes.find((s) => s.from.y > HUD_SAFE_TOP);
        if (swipe) {
          state.target = {
            x: Math.min(water.right, Math.max(water.left, boat.x + swipe.dx * THROW_GAIN)),
            y: Math.min(water.bottom, Math.max(water.top, boat.y - 60 + swipe.dy * THROW_GAIN)),
          };
          state.phase = 'flying';
          state.phaseAgo = 0;
          events.push({ type: 'action', x: boat.x, y: boat.y - 40 });
        }
      } else if (state.phase === 'flying' && state.phaseAgo >= FLY_SECONDS) {
        let caught = 0;
        for (const f of swimming) {
          if (Math.hypot(f.x - state.target.x, f.y - state.target.y) > state.radius) continue;
          f.caughtAt = state.time;
          caught += 1;
        }
        state.lastCatch = caught;
        state.score += caught;
        state.phase = 'hauling';
        state.phaseAgo = 0;
        if (caught > 0) events.push({ type: 'score', x: state.target.x, y: state.target.y, points: caught });
        else events.push({ type: 'miss', x: state.target.x, y: state.target.y });
      } else if (state.phase === 'hauling' && state.phaseAgo >= HAUL_SECONDS) {
        state.phase = 'ready';
        state.phaseAgo = 0;
        state.fish = state.fish.filter((f) => f.caughtAt < 0);
      }
      // Keep the river full: a new shoal swims in for each one caught out.
      const live = new Set(state.fish.filter((f) => f.caughtAt < 0).map((f) => f.shoal));
      for (let k = live.size; k < SHOALS; k += 1) addShoal(rng);
    },
  };
}

/** Good play: the biggest shoal, where it will be when the net lands. */
export function netCastBot(state: NetCastState, _context: BotContext): BotMove {
  if (state.phase !== 'ready' || state.phaseAgo < 0.3) return {};
  const groups = new Map<number, Fish[]>();
  for (const f of state.fish) if (f.caughtAt < 0) groups.set(f.shoal, [...(groups.get(f.shoal) ?? []), f]);
  let best: Fish[] = [];
  for (const g of groups.values()) if (g.length > best.length) best = g;
  if (best.length === 0) return {};
  const lead = FLY_SECONDS + 0.12;
  const x = best.reduce((s, f) => s + f.x + f.vx * lead, 0) / best.length;
  const y = best.reduce((s, f) => s + f.y + f.vy * lead, 0) / best.length;
  return { swipe: { from: { x: state.boat.x, y: state.boat.y - 20 }, dx: (x - state.boat.x) / THROW_GAIN, dy: (y - state.boat.y + 60) / THROW_GAIN } };
}
