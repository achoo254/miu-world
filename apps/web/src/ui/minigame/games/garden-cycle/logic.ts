// Garden cycle: six beds. A tap on an empty bed sows a seed; plants grow while watered, and wilt (stop
// growing, a drop shows) when dry: a tap waters them, or a finger dragged across the beds waters every dry
// one it passes. A ripe vegetable is harvested with a tap (a point) and the bed is empty again. Now and then
// a bird lands on a young plant: tap it away within a few seconds or it eats the seedling. Wilting never
// kills a plant. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { SpriteName } from '../../sprites';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const CROPS: readonly SpriteName[] = ['carrot', 'tomato', 'ear-of-corn', 'leafy-green', 'strawberry'];

export interface Bed {
  at: Point;
  /** Empty (-1) or growing 0–1 (ripe at 1). */
  growth: number;
  crop: SpriteName;
  /** Water left, 0–1: growth needs some. */
  water: number;
  /** A bird on it: seconds it has been pecking (-1 when none). */
  bird: number;
  /** Seconds since it was last tapped for something (a little bounce). */
  touched: number;
}

export interface GardenState {
  beds: Bed[];
  bedHalf: number;
  /** Birds shooed away, flying off: where and how long ago. */
  flying: Array<{ x: number; y: number; t: number }>;
  score: number;
  time: number;
}

const GROW_SECONDS = 7;
const DRY_SECONDS = 3;
const BIRD_EATS = 2.6;
const BIRD_GAP = 4.5;
export const RIPE = 1;

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export function createGardenCycle({ arena, params, rng }: GameSetup): MinigameLogic<GardenState> {
  const factor = typeof params.growth === 'number' ? clamp(params.growth, 0.6, 1.5) : 1;
  const events = eventQueue();
  const wide = arena.width > arena.height;
  const cols = wide ? 3 : 2;
  const rows = wide ? 2 : 3;
  const top = HUD_SAFE_TOP + 40;
  const cellW = Math.min(260, (arena.width - 40) / cols);
  const cellH = Math.min(240, (arena.height - top - 40) / rows);
  const startY = top + (arena.height - top - 20 - cellH * rows) / 2;
  const beds: Bed[] = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      beds.push({ at: { x: arena.width / 2 + (c - (cols - 1) / 2) * cellW, y: startY + (r + 0.5) * cellH }, growth: -1, crop: 'carrot', water: 0, bird: -1, touched: 9 });
    }
  }
  const state: GardenState = { beds, bedHalf: Math.min(cellW, cellH) * 0.42, flying: [], score: 0, time: 0 };
  let nextBird = BIRD_GAP;

  const bedAt = (p: Point): Bed | undefined => state.beds.find((b) => Math.abs(b.at.x - p.x) <= state.bedHalf * 1.15 && Math.abs(b.at.y - p.y) <= state.bedHalf * 1.15);

  function tend(bed: Bed): void {
    bed.touched = 0;
    if (bed.bird >= 0) {
      state.flying.push({ x: bed.at.x, y: bed.at.y - 30, t: 0 });
      bed.bird = -1;
      events.push({ type: 'action', x: bed.at.x, y: bed.at.y - 30 });
      return;
    }
    if (bed.growth < 0) {
      bed.growth = 0;
      bed.water = 1;
      bed.crop = CROPS[rng.int(0, CROPS.length - 1)] ?? 'carrot';
      events.push({ type: 'action', x: bed.at.x, y: bed.at.y });
      return;
    }
    if (bed.growth >= RIPE) {
      bed.growth = -1;
      state.score += 1;
      events.push({ type: 'score', x: bed.at.x, y: bed.at.y - 40 });
      return;
    }
    if (bed.water < 0.35) water(bed);
  }

  function water(bed: Bed): void {
    if (bed.growth < 0 || bed.growth >= RIPE || bed.water >= 0.35) return;
    bed.water = 1;
    events.push({ type: 'action', x: bed.at.x, y: bed.at.y, note: 84, voice: 'bell' });
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
      for (const tap of input.taps) {
        const bed = bedAt(tap);
        if (bed) tend(bed);
      }
      // A finger held and moved over the beds waters the dry ones (a watering can).
      if (input.pointer && input.holdTime > 0.25) {
        const bed = bedAt(input.pointer);
        if (bed) water(bed);
      }

      for (const bed of state.beds) {
        bed.touched += dt;
        if (bed.growth < 0 || bed.growth >= RIPE) continue;
        if (bed.water > 0) bed.growth = Math.min(RIPE, bed.growth + (dt / GROW_SECONDS) * factor);
        bed.water = Math.max(0, bed.water - dt / DRY_SECONDS);
        if (bed.bird >= 0) {
          bed.bird += dt;
          if (bed.bird >= BIRD_EATS) {
            bed.bird = -1;
            bed.growth = -1;
            state.flying.push({ x: bed.at.x, y: bed.at.y - 30, t: 0 });
            events.push({ type: 'miss', x: bed.at.x, y: bed.at.y });
          }
        }
      }
      nextBird -= dt;
      if (nextBird <= 0) {
        const young = state.beds.filter((b) => b.growth >= 0 && b.growth < 0.6 && b.bird < 0);
        const bed = young[rng.int(0, Math.max(0, young.length - 1))];
        if (bed) bed.bird = 0;
        nextBird = BIRD_GAP * rng.range(0.7, 1.3);
      }
      for (const f of state.flying) f.t += dt;
      state.flying = state.flying.filter((f) => f.t < 1);
    },
  };
}

/** Good play: shoo birds first, then harvest, water the dry, sow the empty. */
export function gardenBot(state: GardenState, _context: BotContext): BotMove {
  const pick = (b: Bed | undefined): BotMove => (b ? { tap: b.at } : {});
  return (
    [
      state.beds.find((b) => b.bird >= 0),
      state.beds.find((b) => b.growth >= RIPE),
      state.beds.find((b) => b.growth >= 0 && b.growth < RIPE && b.water < 0.35),
      state.beds.find((b) => b.growth < 0),
    ]
      .map(pick)
      .find((m) => m.tap) ?? {}
  );
}
