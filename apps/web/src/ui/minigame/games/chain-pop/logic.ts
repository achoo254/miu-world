// Chain pop: jellyfish drift in the dark sea in loose schools. Each level the child gets ONE tap: a ring of light blooms there,
// and any jellyfish it touches lights up and blooms its own ring, which can light others: a chain. When the last
// ring fades, enough lit jellyfish (the number on the badge) passes the level: a point, and more jellyfish next
// time. Too few costs one of three pearls and the same level comes again with the sea stirred, so a careless
// tap is not free. The jellyfish swim in for a moment before a tap counts. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface Jelly extends Point {
  vx: number;
  vy: number;
  /** Seconds since it lit up, or -1 while dark. */
  lit: number;
}

/** A ring of light: from the tap or from a lit jellyfish. */
export interface Ring extends Point {
  age: number;
}

export type Phase = 'aim' | 'chain' | 'passed' | 'failed';

export interface ChainPopState {
  jellies: Jelly[];
  rings: Ring[];
  need: number;
  level: number;
  lives: number;
  phase: Phase;
  phaseTime: number;
  sea: { x: number; y: number; w: number; h: number };
  score: number;
  time: number;
}

export const JELLY_RADIUS = 26;
export const RING_RADIUS = 80;
const GROW = 0.5;
const HOLD = 0.8;
const SHRINK = 0.4;
export const RING_LIFE = GROW + HOLD + SHRINK;
const RESULT_PAUSE = 0.8;
/** Seconds the jellyfish take to swim in before a tap counts. */
export const SWIM_IN = 1.0;
const LIVES = 3;

/** Radius of a ring of this age (0 once gone). */
export function ringRadius(age: number): number {
  if (age < GROW) return RING_RADIUS * (age / GROW);
  if (age < GROW + HOLD) return RING_RADIUS;
  if (age < RING_LIFE) return RING_RADIUS * (1 - (age - GROW - HOLD) / SHRINK);
  return 0;
}

export function levelSetup(level: number): { count: number; need: number } {
  const count = Math.min(26, 9 + level * 2);
  return { count, need: Math.min(Math.floor(count * 0.7), Math.ceil(count * (0.4 + 0.045 * level))) };
}

/** Moves dark jellyfish, ages rings and lights what they touch. Shared by the game and the bot's look-ahead. */
export function advance(jellies: Jelly[], rings: Ring[], sea: ChainPopState['sea'], dt: number, onLight?: (j: Jelly) => void): void {
  for (const j of jellies) {
    if (j.lit >= 0) {
      j.lit += dt;
      continue;
    }
    j.x += j.vx * dt;
    j.y += j.vy * dt;
    if (j.x < sea.x + JELLY_RADIUS || j.x > sea.x + sea.w - JELLY_RADIUS) j.vx = -j.vx;
    if (j.y < sea.y + JELLY_RADIUS || j.y > sea.y + sea.h - JELLY_RADIUS) j.vy = -j.vy;
    j.x = Math.min(sea.x + sea.w - JELLY_RADIUS, Math.max(sea.x + JELLY_RADIUS, j.x));
    j.y = Math.min(sea.y + sea.h - JELLY_RADIUS, Math.max(sea.y + JELLY_RADIUS, j.y));
  }
  for (const r of rings) r.age += dt;
  const live = rings.filter((r) => r.age < RING_LIFE);
  for (const j of jellies) {
    if (j.lit >= 0) continue;
    if (live.some((r) => Math.hypot(j.x - r.x, j.y - r.y) <= ringRadius(r.age) + JELLY_RADIUS)) {
      j.lit = 0;
      rings.push({ x: j.x, y: j.y, age: 0 });
      onLight?.(j);
    }
  }
}

/**
 * How many jellyfish a tap at `at` would light, played forward in steps of `dt` (the game's own step is exact),
 * the tap landing `lead` game steps from now.
 */
export function chainFrom(state: ChainPopState, at: Point, dt = 1 / 60, lead = 0): number {
  const jellies = state.jellies.map((j) => ({ ...j }));
  for (let i = 0; i < lead; i += 1) advance(jellies, [], state.sea, 1 / 60);
  const rings: Ring[] = [{ ...at, age: 0 }];
  for (let t = 0; t < 12; t += dt) {
    advance(jellies, rings, state.sea, dt);
    if (rings.every((r) => r.age >= RING_LIFE)) break;
  }
  return jellies.filter((j) => j.lit >= 0).length;
}

export function createChainPop({ arena, rng }: GameSetup): MinigameLogic<ChainPopState> {
  const events = eventQueue();
  // A tall phone gets a sea no taller than an iPad's (rock above and below), so chains carry the same way.
  const seaW = arena.width - 32;
  const seaH = Math.min(arena.height - HUD_SAFE_TOP - 26, seaW * 1.5);
  const sea = { x: 16, y: HUD_SAFE_TOP + 10 + (arena.height - HUD_SAFE_TOP - 26 - seaH) / 2, w: seaW, h: seaH };
  const state: ChainPopState = { jellies: [], rings: [], need: 0, level: 0, lives: LIVES, phase: 'aim', phaseTime: 0, sea, score: 0, time: 0 };

  /** Deals a level that can be passed: the best tap lights more than needed (or the need comes down to it). */
  function deal(r: Rng): void {
    for (let tries = 0; tries < 8; tries += 1) {
      scatter(r);
      // A rough look (the schools drift while they swim in): keep a margin.
      const best = Math.max(0, ...state.jellies.map((j) => chainFrom(state, j, 0.05)));
      if (best >= state.need + 2 || tries === 7) {
        state.need = Math.max(2, Math.min(state.need, best - 2));
        return;
      }
    }
  }

  function scatter(r: Rng): void {
    const { count, need } = levelSetup(state.level);
    // More sea, more jellyfish: a phone's long sea gets a few more so they are as close as on an iPad.
    const scale = Math.max(1, (sea.w * sea.h) / (840 * 470));
    const n = Math.round(count * Math.min(1.6, scale));
    state.need = Math.round(need * Math.min(1.6, scale));
    // Jellyfish swim in a few loose schools: a tap in the right school starts the long chain.
    // A school drifts together (each jellyfish wanders a little off its school's course).
    const schools = Array.from({ length: 3 + Math.floor(state.level / 3) }, () => {
      const heading = r.range(0, Math.PI * 2);
      const v = r.range(25, 50);
      return { x: r.range(sea.x + 90, sea.x + sea.w - 90), y: r.range(sea.y + 90, sea.y + sea.h - 90), vx: Math.cos(heading) * v, vy: Math.sin(heading) * v };
    });
    state.jellies = Array.from({ length: n }, (_, i) => {
      const home = schools[i % schools.length] ?? { x: sea.x + sea.w / 2, y: sea.y + sea.h / 2, vx: 30, vy: 0 };
      const a = r.range(0, Math.PI * 2);
      const d = r.range(0, 110);
      const x = Math.min(sea.x + sea.w - 40, Math.max(sea.x + 40, home.x + Math.cos(a) * d));
      const y = Math.min(sea.y + sea.h - 40, Math.max(sea.y + 40, home.y + Math.sin(a) * d));
      return { x, y, vx: home.vx + r.range(-8, 8), vy: home.vy + r.range(-8, 8), lit: -1 };
    });
    state.rings = [];
    state.phase = 'aim';
    state.phaseTime = 0;
  }

  deal(rng);

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.lives <= 0 && state.phase === 'aim';
    },
    get lives() {
      return state.lives;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.phaseTime += dt;
      if (state.phase === 'passed' || state.phase === 'failed') {
        advance(state.jellies, state.rings, sea, dt);
        if (state.phaseTime >= RESULT_PAUSE) {
          if (state.phase === 'passed') state.level += 1;
          deal(rng);
        }
        return;
      }
      if (state.phase === 'aim') {
        advance(state.jellies, state.rings, sea, dt);
        const tap = input.taps[0];
        if (tap && tap.y >= sea.y - 20 && state.phaseTime >= SWIM_IN) {
          state.rings.push({ x: tap.x, y: tap.y, age: 0 });
          state.phase = 'chain';
          state.phaseTime = 0;
          events.push({ type: 'action', x: tap.x, y: tap.y });
        }
        return;
      }
      let lit = state.jellies.filter((j) => j.lit >= 0).length;
      advance(state.jellies, state.rings, sea, dt, (j) => {
        lit += 1;
        // Each new light rings a note a step higher: the chain plays a scale.
        events.push({ type: 'action', x: j.x, y: j.y, note: 60 + Math.min(24, lit * 2), voice: 'bell' });
      });
      if (state.rings.every((r) => r.age >= RING_LIFE)) {
        const passed = lit >= state.need;
        state.phase = passed ? 'passed' : 'failed';
        state.phaseTime = 0;
        if (passed) {
          state.score += 1;
          events.push({ type: 'score', x: arena.width / 2, y: arena.height / 2 });
        } else {
          state.lives -= 1;
          events.push({ type: 'hit', x: arena.width / 2, y: arena.height / 2 });
        }
      }
    },
  };
}

/** Seconds into a level when the bot looks for a good tap; at the last look it taps its best anyway. */
const BOT_LOOKS = [SWIM_IN + 0.1, SWIM_IN + 1.1, SWIM_IN + 2.1, SWIM_IN + 3.1];

/**
 * Good play: at a few moments it looks over the sea (a rough look-ahead from each jellyfish), and taps where the
 * chain would light enough; if the schools are too far apart it waits for them to drift closer.
 */
export function chainPopBot(state: ChainPopState, _context: BotContext): BotMove {
  if (state.phase !== 'aim') return {};
  const look = BOT_LOOKS.findIndex((t) => state.phaseTime >= t && state.phaseTime < t + 0.1);
  if (look < 0) return {};
  // The tap lands on the next step: aim where each jellyfish will be then.
  const candidates = state.jellies.map((j) => ({ x: j.x + j.vx / 60, y: j.y + j.vy / 60 }));
  const rough = candidates.map((at) => ({ at, lit: chainFrom(state, at, 1 / 20, 1) })).sort((a, b) => b.lit - a.lit);
  let best: { at: Point; lit: number } | null = null;
  for (const c of rough.slice(0, 3)) {
    const lit = chainFrom(state, c.at, 1 / 60, 1);
    if (!best || lit > best.lit) best = { at: c.at, lit };
  }
  if (!best) return {};
  return best.lit >= state.need || look === BOT_LOOKS.length - 1 ? { tap: best.at } : {};
}
