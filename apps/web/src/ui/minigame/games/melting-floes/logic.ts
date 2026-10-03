// Melting floes ("Băng trôi tan dần"): the child's penguin and three friends stand on ice floes in a cold sea.
// Each floe cracks after a while (it shows cracks and shakes) and then sinks; new floes bob up elsewhere. A tap
// on a floe next to the penguin hops it across. Fish pop up on floes: landing on one is a point. A penguin
// still on a floe when it sinks falls in and swims to the nearest floe, losing a heart; three hearts.
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface Floe {
  /** Seconds of ice left (cracking in the last CRACK seconds); ≤ 0 means sunk, back after `back` seconds. */
  life: number;
  back: number;
  fish: boolean;
}

export interface MeltingFloesState {
  cols: number;
  rows: number;
  slots: Point[];
  floes: Floe[];
  slotSize: number;
  /** The penguin's slot, the slot it hops from (−1 when not hopping) and hop progress. */
  at: number;
  from: number;
  hop: number;
  /** Seconds left swimming after a fall (0 when not). */
  swimming: number;
  friends: number[];
  lives: number;
  score: number;
  time: number;
}

export const CRACK = 1.6;
const HOP_SECONDS = 0.28;
const SWIM_SECONDS = 0.9;
const LIVES = 3;

const lifeFor = (r: Rng, progress: number): number => r.range(5.5 - 1.5 * progress, 9 - 2 * progress);

export function createMeltingFloes({ arena, duration, rng }: GameSetup): MinigameLogic<MeltingFloesState> {
  const events = eventQueue();
  const landscape = arena.width >= arena.height;
  const cols = landscape ? 5 : 3;
  const rows = landscape ? 3 : arena.height > 1000 ? 6 : 5;
  const cellW = (arena.width - 40) / cols;
  const cellH = (arena.height - HUD_SAFE_TOP - 30) / rows;
  const slotSize = Math.min(cellW, cellH) * 0.82;
  const slots = Array.from({ length: cols * rows }, (_, i) => ({ x: 20 + cellW * ((i % cols) + 0.5), y: HUD_SAFE_TOP + 10 + cellH * (Math.floor(i / cols) + 0.5) }));
  const state: MeltingFloesState = {
    cols,
    rows,
    slots,
    floes: slots.map(() => ({ life: rng.range(3, 9), back: 0, fish: false })),
    slotSize,
    at: Math.floor(rows / 2) * cols + Math.floor(cols / 2),
    from: -1,
    hop: 1,
    swimming: 0,
    friends: [],
    lives: LIVES,
    score: 0,
    time: 0,
  };
  const start = state.floes[state.at];
  if (start) start.life = 7;
  state.friends = [0, cols - 1, cols * rows - 1].filter((i) => i !== state.at);
  let nextFish = 0.8;
  let friendHop = 1.5;

  const adjacent = (a: number, b: number): boolean => a !== b && Math.abs((a % cols) - (b % cols)) <= 1 && Math.abs(Math.floor(a / cols) - Math.floor(b / cols)) <= 1;
  const afloat = (i: number): boolean => (state.floes[i]?.life ?? 0) > 0;
  const nearestFloe = (from: number): number => {
    let best = -1;
    let bestD = Infinity;
    state.slots.forEach((s, i) => {
      if ((state.floes[i]?.life ?? 0) <= CRACK) return;
      const p = state.slots[from] ?? s;
      const d = Math.hypot(s.x - p.x, s.y - p.y);
      if (d < bestD) {
        best = i;
        bestD = d;
      }
    });
    return best;
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
      const progress = Math.min(1, state.time / duration);
      for (const f of state.floes) {
        if (f.life > 0) {
          f.life -= dt;
          if (f.life <= 0) {
            f.back = rng.range(1.5, 3);
            f.fish = false;
          }
        } else {
          f.back -= dt;
          if (f.back <= 0) f.life = lifeFor(rng, progress);
        }
      }
      nextFish -= dt;
      if (nextFish <= 0 && state.floes.filter((f) => f.fish).length < 2) {
        const options = state.floes.map((f, i) => (f.life > 3 && !f.fish && i !== state.at ? i : -1)).filter((i) => i >= 0);
        const pick = state.floes[options[rng.int(0, options.length - 1)] ?? -1];
        if (pick) pick.fish = true;
        nextFish = rng.range(1.2, 2.2);
      }
      friendHop -= dt;
      if (friendHop <= 0) {
        state.friends = state.friends.map((f) => {
          if ((state.floes[f]?.life ?? 0) > CRACK + 0.5) return f;
          const next = state.slots.findIndex((_, i) => adjacent(f, i) && (state.floes[i]?.life ?? 0) > 2 && i !== state.at);
          return next >= 0 ? next : f;
        });
        friendHop = 0.5;
      }

      if (state.swimming > 0) {
        state.swimming -= dt;
        if (state.swimming <= 0) {
          const to = nearestFloe(state.at);
          if (to >= 0) state.at = to;
        }
        return;
      }
      if (state.hop < 1) state.hop = Math.min(1, state.hop + dt / HOP_SECONDS);
      if (state.hop >= 1) {
        const tap = input.taps.find((t) => t.y > HUD_SAFE_TOP);
        if (tap) {
          const reach = state.slotSize * 0.6;
          const i = state.slots.findIndex((s) => Math.abs(tap.x - s.x) <= reach && Math.abs(tap.y - s.y) <= reach);
          if (i >= 0 && adjacent(state.at, i) && afloat(i)) {
            state.from = state.at;
            state.at = i;
            state.hop = 0;
            const s = state.slots[i] ?? { x: 0, y: 0 };
            events.push({ type: 'action', x: s.x, y: s.y });
          }
        }
      }
      const here = state.floes[state.at];
      if (state.hop >= 1 && here && here.fish) {
        here.fish = false;
        state.score += 1;
        const s = state.slots[state.at] ?? { x: 0, y: 0 };
        events.push({ type: 'score', x: s.x, y: s.y - 40 });
      }
      if (state.hop >= 1 && here && here.life <= 0) {
        state.lives -= 1;
        state.swimming = SWIM_SECONDS;
        const s = state.slots[state.at] ?? { x: 0, y: 0 };
        events.push({ type: 'hit', x: s.x, y: s.y });
      }
    },
  };
}

/** Good play: to an adjacent fish on safe ice; off a cracking floe; otherwise toward the nearest fish. */
export function meltingFloesBot(state: MeltingFloesState, _context: BotContext): BotMove {
  if (state.swimming > 0 || state.hop < 1) return {};
  const { cols } = state;
  const adjacent = (a: number, b: number): boolean => a !== b && Math.abs((a % cols) - (b % cols)) <= 1 && Math.abs(Math.floor(a / cols) - Math.floor(b / cols)) <= 1;
  const life = (i: number): number => state.floes[i]?.life ?? 0;
  const near = state.slots.map((_, i) => i).filter((i) => adjacent(state.at, i) && life(i) > 1.2);
  const tapAt = (i: number): BotMove => {
    const s = state.slots[i];
    return s ? { tap: s } : {};
  };
  const fishNear = near.find((i) => state.floes[i]?.fish);
  if (fishNear !== undefined) return tapAt(fishNear);
  const fish = state.slots.map((_, i) => i).filter((i) => state.floes[i]?.fish);
  const dist = (i: number, j: number): number => Math.hypot((state.slots[i]?.x ?? 0) - (state.slots[j]?.x ?? 0), (state.slots[i]?.y ?? 0) - (state.slots[j]?.y ?? 0));
  if (fish.length > 0) {
    const goal = fish.reduce((a, b) => (dist(a, state.at) < dist(b, state.at) ? a : b));
    const step = near.filter((i) => life(i) > 2).sort((a, b) => dist(a, goal) - dist(b, goal))[0];
    if (step !== undefined && dist(step, goal) < dist(state.at, goal)) return tapAt(step);
  }
  if (life(state.at) < CRACK + 0.6) {
    const safest = near.sort((a, b) => life(b) - life(a))[0];
    if (safest !== undefined) return tapAt(safest);
  }
  return {};
}
