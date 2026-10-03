// Lunchbox pack: foods ride a conveyor belt past a lunchbox with four compartments. The child taps a food (or
// drags it up) to pack it. A box needs one food of each of the four groups: rice and bread, vegetables, meat,
// fish and eggs, and fruit. Four different groups close the lid (a point); a box with two of the same group
// spills and the next box comes. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

/** Food group of each food (draw.ts has its picture): 0 starch, 1 vegetable, 2 protein, 3 fruit. */
export const FOOD_GROUPS = [0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 3, 3] as const;
export const GROUP_COUNT = 4;
const SPAWN_SECONDS = 0.8;
const CLOSE_SECONDS = 0.9;
/** A spilled box takes longer to clear up than a good one to close. */
const SPILL_SECONDS = 1.8;
/** Share of new foods from a group the box still lacks. */
const HELPFUL_SHARE = 0.4;

export interface Food {
  id: number;
  food: number;
  x: number;
  y: number;
  /** Being dragged by the finger. */
  held: boolean;
}

export interface LunchboxState {
  foods: Food[];
  /** Foods in the box, in compartment order. */
  packed: number[];
  phase: 'pack' | 'closed' | 'spilled';
  phaseAgo: number;
  box: Point;
  boxW: number;
  boxH: number;
  beltY: number;
  foodSize: number;
  speed: number;
  boxes: number;
  lastPackAt: number;
  score: number;
  time: number;
}

export const groupOf = (food: number): number => FOOD_GROUPS[food] ?? 0;

export function createLunchboxPack({ arena, rng, params }: GameSetup): MinigameLogic<LunchboxState> {
  const factor = typeof params.speed === 'number' ? Math.min(1.5, Math.max(0.6, params.speed)) : 1;
  const events = eventQueue();
  const free = arena.height - HUD_SAFE_TOP;
  const foodSize = Math.min(96, arena.width * 0.14);
  const beltY = arena.height - Math.max(90, free * 0.18);
  const boxW = Math.min(arena.width * 0.62, 380);
  const boxH = Math.min(boxW * 0.62, (beltY - HUD_SAFE_TOP) * 0.62);
  const state: LunchboxState = {
    foods: [],
    packed: [],
    phase: 'pack',
    phaseAgo: 0,
    box: { x: arena.width / 2, y: HUD_SAFE_TOP + 20 + boxH / 2 + Math.max(0, (beltY - HUD_SAFE_TOP - boxH - 150) * 0.35) },
    boxW,
    boxH,
    beltY,
    foodSize,
    speed: Math.min(170, arena.width * 0.2) * factor,
    boxes: 0,
    lastPackAt: -9,
    score: 0,
    time: 0,
  };
  let nextId = 1;
  let spawnIn = 0;

  const spawn = (): void => {
    const have = new Set(state.packed.map(groupOf));
    const missing = Array.from({ length: GROUP_COUNT }, (_, g) => g).filter((g) => !have.has(g));
    const group = missing.length > 0 && rng.chance(HELPFUL_SHARE) ? (missing[rng.int(0, missing.length - 1)] ?? 0) : rng.int(0, GROUP_COUNT - 1);
    const choices = FOOD_GROUPS.map((g, i) => (g === group ? i : -1)).filter((i) => i >= 0);
    const food = choices[rng.int(0, choices.length - 1)] ?? 0;
    state.foods.push({ id: nextId, food, x: arena.width + foodSize, y: beltY, held: false });
    nextId += 1;
  };

  const pack = (item: Food): void => {
    state.foods = state.foods.filter((f) => f !== item);
    state.packed.push(item.food);
    state.lastPackAt = state.time;
    events.push({ type: 'action', x: state.box.x, y: state.box.y });
    if (state.packed.length < GROUP_COUNT) return;
    state.phaseAgo = 0;
    if (new Set(state.packed.map(groupOf)).size === GROUP_COUNT) {
      state.phase = 'closed';
      state.score += 1;
      events.push({ type: 'score', x: state.box.x, y: state.box.y });
    } else {
      state.phase = 'spilled';
      events.push({ type: 'miss', x: state.box.x, y: state.box.y });
    }
  };

  const foodAt = (p: Point): Food | undefined => {
    let best: Food | undefined;
    let bestD = foodSize * 0.75;
    for (const f of state.foods) {
      const d = Math.hypot(p.x - f.x, p.y - f.y);
      if (d < bestD) {
        best = f;
        bestD = d;
      }
    }
    return best;
  };
  const overBox = (p: Point): boolean => Math.abs(p.x - state.box.x) <= state.boxW / 2 + 30 && Math.abs(p.y - state.box.y) <= state.boxH / 2 + 40;

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
      spawnIn -= dt;
      if (spawnIn <= 0) {
        spawn();
        spawnIn += SPAWN_SECONDS / factor;
      }
      for (const f of state.foods) if (!f.held) f.x -= state.speed * dt;
      state.foods = state.foods.filter((f) => f.x > -foodSize);
      if (state.phase !== 'pack') {
        for (const f of state.foods) f.held = false;
        if (state.phaseAgo >= (state.phase === 'spilled' ? SPILL_SECONDS : CLOSE_SECONDS)) {
          state.phase = 'pack';
          state.phaseAgo = 0;
          state.packed = [];
          state.boxes += 1;
        }
        return;
      }
      // Drag a food up into the box.
      const held = state.foods.find((f) => f.held);
      if (input.pressed && input.pointer && !held) {
        const f = foodAt(input.pointer);
        if (f) f.held = true;
      }
      const holding = state.foods.find((f) => f.held);
      if (holding && input.pointer) {
        holding.x = input.pointer.x;
        holding.y = input.pointer.y;
      }
      if (input.released && holding) {
        holding.held = false;
        if (overBox(holding)) {
          pack(holding);
          return;
        }
        holding.y = state.beltY;
      }
      // Or tap it.
      const tap = input.taps[0];
      if (tap) {
        const f = foodAt(tap);
        if (f) pack(f);
      }
    },
  };
}

/** Good play: packs a food of a group the box lacks, the one nearest the end of the belt first. */
export function lunchboxBot(state: LunchboxState, context: BotContext): BotMove {
  if (state.phase !== 'pack' || state.time - state.lastPackAt < 0.3) return {};
  const have = new Set(state.packed.map(groupOf));
  const wanted = state.foods.filter((f) => !have.has(groupOf(f.food)) && f.x > 40 && f.x < context.arena.width - 40).sort((a, b) => a.x - b.x);
  const pick = wanted[0];
  return pick ? { tap: { x: pick.x - state.speed * 0.02, y: pick.y } } : {};
}
