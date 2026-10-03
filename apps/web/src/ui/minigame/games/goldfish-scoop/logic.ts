// Goldfish scooping (a fair game): fish swim in a tub. Putting a finger down dips the paper scoop into the
// water there; lifting the finger lifts it, and the fish over it come out into the bowl (a point each) if the
// scoop was under long enough for them to swim on. Fish dart away from a scoop that splashes down right on
// them or sweeps fast; a scoop held still makes nearby fish curious, and they come to look. Paper gets soggy: the longer it is in the water, and the faster it moves, the weaker it
// gets, until it tears. Two scoops; both torn and the round is over. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const FISH = ['tropical-fish', 'fish'] as const;

export interface Fish {
  x: number;
  y: number;
  heading: number;
  speed: number;
  kind: number;
  /** Seconds left of darting away (fast), and seconds until it notices a splash. */
  scared: number;
  notice: number;
  /** Seconds since it was scooped out (-1 while swimming). */
  caught: number;
  fromX: number;
  fromY: number;
}

export interface GoldfishState {
  tub: { x: number; y: number; w: number; h: number };
  bowl: Point;
  fish: Fish[];
  /** The scoop in the water (null when lifted), how long it has been under, its paper left (1 → 0). */
  scoop: Point | null;
  under: number;
  paper: number;
  /** Scoops not yet torn, counting the one in hand. */
  scoops: number;
  /** Seconds since the paper tore (the hand is empty until the finger lifts). */
  tornAgo: number;
  torn: boolean;
  /** Seconds the scoop has been held still. */
  still: number;
  /** Seconds since the last lift, and how many fish came up with it. */
  liftAgo: number;
  lifted: number;
  score: number;
  time: number;
}

export const SCOOP_RADIUS = 66;
const SCOOPS = 2;
/** The scoop must be under this long before fish can be lifted (they need to swim over the paper). */
export const MIN_UNDER = 0.35;
/** Paper lost per second under water, more when sweeping fast, and per fish lifted. */
const SOAK = 0.12;
const SWEEP = 0.0011;
const FISH_WEIGHT = 0.08;
const FISH_COUNT = 7;
const SPLASH = 58;
/** Calm fish this close to a still scoop swim over to look. */
const CURIOUS = 230;

export function createGoldfishScoop({ arena, rng }: GameSetup): MinigameLogic<GoldfishState> {
  const events = eventQueue();
  const wide = arena.width >= arena.height;
  const top = HUD_SAFE_TOP + 20;
  const tub = wide ? { x: 30, y: top, w: arena.width - 220, h: arena.height - top - 30 } : { x: 30, y: top, w: arena.width - 60, h: arena.height - top - 200 };
  const bowl = wide ? { x: arena.width - 100, y: arena.height - 120 } : { x: arena.width / 2, y: arena.height - 100 };
  const state: GoldfishState = { tub, bowl, fish: [], scoop: null, under: 0, paper: 1, scoops: SCOOPS, tornAgo: 9, torn: false, still: 0, liftAgo: 9, lifted: 0, score: 0, time: 0 };
  const spawn = (): Fish => ({
    x: tub.x + rng.range(60, tub.w - 60),
    y: tub.y + rng.range(60, tub.h - 60),
    heading: rng.range(0, Math.PI * 2),
    speed: rng.range(55, 95),
    kind: rng.int(0, FISH.length - 1),
    scared: 0,
    notice: -1,
    caught: -1,
    fromX: 0,
    fromY: 0,
  });
  for (let i = 0; i < FISH_COUNT; i += 1) state.fish.push(spawn());
  const inTub = (p: Point): boolean => p.x > tub.x && p.x < tub.x + tub.w && p.y > tub.y && p.y < tub.y + tub.h;
  let last: Point | null = null;

  function lift(): void {
    const scoop = state.scoop;
    if (!scoop) return;
    state.scoop = null;
    state.liftAgo = 0;
    state.lifted = 0;
    if (state.under < MIN_UNDER || state.torn) return;
    for (const f of state.fish) {
      if (f.caught >= 0 || Math.hypot(f.x - scoop.x, f.y - scoop.y) > SCOOP_RADIUS * 0.8) continue;
      f.caught = 0;
      f.fromX = f.x;
      f.fromY = f.y;
      state.lifted += 1;
      state.score += 1;
      state.paper -= FISH_WEIGHT;
      events.push({ type: 'score', x: f.x, y: f.y });
    }
    if (state.lifted === 0) events.push({ type: 'miss', ...scoop });
    if (state.paper <= 0) tear(scoop);
  }
  function tear(at: Point): void {
    state.torn = true;
    state.tornAgo = 0;
    state.scoops -= 1;
    state.scoop = null;
    events.push({ type: 'hit', ...at });
  }

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.scoops <= 0 && state.tornAgo > 0.8;
    },
    get lives() {
      return state.scoops;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.liftAgo += dt;
      state.tornAgo += dt;
      const p = input.pointer;

      if (input.pressed && p && inTub(p) && !state.torn && state.scoops > 0) {
        state.scoop = { ...p };
        state.under = 0;
        state.still = 0;
        last = p;
        events.push({ type: 'action', ...p });
        // A splash right on a fish: it notices a moment later and darts off.
        for (const f of state.fish) if (f.caught < 0 && Math.hypot(f.x - p.x, f.y - p.y) < SPLASH) f.notice = 0.12;
      }
      if (state.scoop && p) {
        const moved = last ? Math.hypot(p.x - last.x, p.y - last.y) : 0;
        const speed = moved / dt;
        state.scoop = { x: Math.min(tub.x + tub.w, Math.max(tub.x, p.x)), y: Math.min(tub.y + tub.h, Math.max(tub.y, p.y)) };
        state.under += dt;
        state.still = speed < 150 ? state.still + dt : 0;
        state.paper -= (SOAK + SWEEP * Math.max(0, speed - 150)) * dt;
        if (speed > 500) for (const f of state.fish) if (f.caught < 0 && Math.hypot(f.x - p.x, f.y - p.y) < SCOOP_RADIUS * 1.6) f.scared = 0.8;
        last = p;
        if (state.paper <= 0) tear(state.scoop);
      }
      if (!p && state.scoop) lift();
      if (!p && state.torn && state.tornAgo > 0.3 && state.scoops > 0) {
        // A fresh scoop in hand.
        state.torn = false;
        state.paper = 1;
      }

      for (const f of state.fish) {
        if (f.caught >= 0) {
          f.caught += dt;
          continue;
        }
        if (f.notice >= 0) {
          f.notice -= dt;
          if (f.notice < 0 && state.scoop) {
            f.scared = 0.9;
            f.heading = Math.atan2(f.y - state.scoop.y, f.x - state.scoop.x);
          }
        }
        f.scared = Math.max(0, f.scared - dt);
        if (rng.chance(dt * 0.6)) f.heading += rng.range(-1.2, 1.2);
        const scoop = state.scoop;
        if (scoop && f.scared <= 0 && state.still > 0.3 && Math.hypot(f.x - scoop.x, f.y - scoop.y) < CURIOUS) {
          // Turn toward the still scoop, a little at a time.
          const want = Math.atan2(scoop.y - f.y, scoop.x - f.x);
          const turn = Math.atan2(Math.sin(want - f.heading), Math.cos(want - f.heading));
          f.heading += Math.max(-2.2 * dt, Math.min(2.2 * dt, turn));
        }
        const v = f.speed * (f.scared > 0 ? 3 : 1);
        f.x += Math.cos(f.heading) * v * dt;
        f.y += Math.sin(f.heading) * v * dt;
        if (f.x < tub.x + 40 || f.x > tub.x + tub.w - 40) {
          f.heading = Math.PI - f.heading;
          f.x = Math.min(tub.x + tub.w - 40, Math.max(tub.x + 40, f.x));
        }
        if (f.y < tub.y + 40 || f.y > tub.y + tub.h - 40) {
          f.heading = -f.heading;
          f.y = Math.min(tub.y + tub.h - 40, Math.max(tub.y + 40, f.y));
        }
      }
      // Scooped fish land in the bowl; new fish swim in so the tub stays full.
      const landed = state.fish.filter((f) => f.caught >= 0.7).length;
      state.fish = state.fish.filter((f) => f.caught < 0.7);
      for (let i = 0; i < landed; i += 1) state.fish.push(spawn());
    },
  };
}

/** Good play: dip near fish but not on one, keep still, lift when one swims over the paper (or before it tears). */
export function goldfishScoopBot(state: GoldfishState, _context: BotContext): BotMove {
  const scoop = state.scoop;
  if (scoop) {
    const over = state.fish.some((f) => f.caught < 0 && Math.hypot(f.x - scoop.x, f.y - scoop.y) < SCOOP_RADIUS * 0.55);
    if ((over && state.under >= MIN_UNDER) || state.paper < 0.2 || state.under > 2.2) return {};
    return { touch: scoop };
  }
  if (state.torn || state.scoops <= 0 || state.liftAgo < 0.3) return {};
  // Beside a calm fish (not on top of any fish, which would scare it), where the most fish are near.
  const { tub } = state;
  const swimming = state.fish.filter((f) => f.caught < 0);
  let best: { at: Point; near: number } | null = null;
  for (const f of swimming) {
    if (f.scared > 0) continue;
    for (let k = 0; k < 8; k += 1) {
      const a = f.heading + (k * Math.PI) / 4;
      const at = { x: f.x + Math.cos(a) * 80, y: f.y + Math.sin(a) * 80 };
      if (at.x < tub.x + 50 || at.x > tub.x + tub.w - 50 || at.y < tub.y + 50 || at.y > tub.y + tub.h - 50) continue;
      if (swimming.some((o) => Math.hypot(o.x - at.x, o.y - at.y) < SPLASH + 8)) continue;
      const near = swimming.filter((o) => Math.hypot(o.x - at.x, o.y - at.y) < CURIOUS).length + (k === 0 ? 0.5 : 0);
      if (!best || near > best.near) best = { at, near };
    }
  }
  return best ? { touch: best.at } : {};
}
