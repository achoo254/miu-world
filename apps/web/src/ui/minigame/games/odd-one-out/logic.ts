// Odd one out: a few pictures dance on the grass, all from one group (fruit, vehicles, sea animals…) but one.
// The child taps the one that does not belong: a point, and a new set comes. Early sets mix groups far apart
// (fruit and buses); later ones mix near groups (fruit and vegetables, birds and other animals). A wrong tap
// costs nothing but the set sulks for a moment (no taps count), so tapping everything quickly does not pay.
// A set nobody answers in a while is shuffled into a new one. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import type { SpriteName } from '../../sprites';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export type Group = 'land' | 'sea' | 'birds' | 'insects' | 'fruit' | 'vegetables' | 'vehicles' | 'balls' | 'sweets' | 'sky' | 'plants';

export const GROUPS: Readonly<Record<Group, readonly SpriteName[]>> = {
  land: ['cat', 'dog-face', 'rabbit', 'fox', 'bear', 'panda', 'monkey-face', 'cow', 'pig', 'goat'],
  sea: ['tropical-fish', 'fish', 'dolphin', 'crab', 'octopus', 'spiral-shell'],
  birds: ['bird', 'owl', 'penguin', 'duck', 'parrot', 'chicken', 'baby-chick'],
  insects: ['honeybee', 'butterfly', 'snail', 'ant'],
  fruit: ['red-apple', 'banana', 'strawberry', 'watermelon', 'grapes', 'lemon', 'pineapple', 'cherries'],
  vegetables: ['carrot', 'tomato', 'ear-of-corn', 'cucumber', 'hot-pepper', 'leafy-green'],
  vehicles: ['bus', 'automobile', 'bicycle', 'airplane', 'sailboat', 'rocket', 'canoe', 'fire-engine'],
  balls: ['soccer-ball', 'basketball', 'volleyball', 'baseball', 'tennis'],
  sweets: ['candy', 'lollipop', 'doughnut', 'ice-cream', 'cookie', 'birthday-cake'],
  sky: ['sun', 'cloud', 'rainbow', 'snowflake', 'high-voltage', 'full-moon'],
  plants: ['tulip', 'sunflower', 'lotus', 'seedling', 'herb', 'clover', 'evergreen-tree', 'cactus'],
};

/** Groups close enough to make a harder set: the odd one looks like it could belong. */
const NEAR: readonly (readonly [Group, Group])[] = [
  ['fruit', 'vegetables'],
  ['land', 'birds'],
  ['land', 'sea'],
  ['birds', 'insects'],
  ['sweets', 'fruit'],
  ['plants', 'vegetables'],
  ['sea', 'birds'],
];

const GROUP_IDS = Object.keys(GROUPS) as Group[];
/** Seconds the set sulks after a wrong tap. */
export const SULK_SECONDS = 1.6;
/** Seconds between a right answer and the next set. */
const NEXT_SECONDS = 0.55;
/** A set nobody answers is shuffled after this long (shorter later in the round). */
const STALE_START = 9;
const STALE_END = 6;

export interface Item {
  sprite: SpriteName;
  odd: boolean;
  x: number;
  y: number;
  /** Seconds since tapped wrongly (a shake); large = long ago. */
  shook: number;
}

export interface OddState {
  items: Item[];
  /** Picture size (units across) and the radius a tap reaches. */
  size: number;
  reach: number;
  /** Seconds since this set appeared. */
  age: number;
  /** Seconds left of the sulk after a wrong tap (0 when taps count). */
  sulk: number;
  /** Seconds since the odd one was found (the set celebrates, then leaves); -1 while playing. */
  solved: number;
  sets: number;
  score: number;
  time: number;
}

function shuffle<T>(items: T[], rng: Rng): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = rng.int(0, i);
    const a = items[i];
    const b = items[j];
    if (a !== undefined && b !== undefined) {
      items[i] = b;
      items[j] = a;
    }
  }
  return items;
}

/** Cell centres for `count` pictures in the area under the HUD: rows as even as possible, the last centred. */
export function layout(count: number, area: { x: number; y: number; w: number; h: number }): { points: Point[]; size: number } {
  let best = { cols: count, size: 0 };
  for (let cols = 2; cols <= count; cols += 1) {
    const rows = Math.ceil(count / cols);
    const size = Math.min(area.w / cols, area.h / rows);
    if (size > best.size) best = { cols, size };
  }
  const { cols, size } = best;
  const rows = Math.ceil(count / cols);
  const points: Point[] = [];
  for (let i = 0; i < count; i += 1) {
    const row = Math.floor(i / cols);
    const inRow = row === rows - 1 ? count - row * cols : cols;
    const col = i % cols;
    const left = area.x + (area.w - inRow * size) / 2;
    const top = area.y + (area.h - rows * size) / 2;
    points.push({ x: left + (col + 0.5) * size, y: top + (row + 0.5) * size });
  }
  return { points, size };
}

export function createOddOneOut({ arena, duration, params, rng }: GameSetup): MinigameLogic<OddState> {
  const count = typeof params.items === 'number' ? Math.round(Math.min(7, Math.max(4, params.items))) : 5;
  const events = eventQueue();
  const area = { x: 20, y: HUD_SAFE_TOP + 40, w: arena.width - 40, h: arena.height - HUD_SAFE_TOP - 70 };
  const { points, size: cell } = layout(count, area);
  const size = Math.min(150, cell * 0.72);
  const state: OddState = { items: [], size, reach: Math.max(TOUCH_RADIUS * 1.5, cell * 0.5), age: 0, sulk: 0, solved: -1, sets: 0, score: 0, time: 0 };

  function deal(): void {
    // Near groups more often as the round goes on.
    const hard = rng.chance(Math.min(0.75, 0.15 + (state.time / duration) * 0.8));
    let main: Group;
    let odd: Group;
    const pair = NEAR[rng.int(0, NEAR.length - 1)];
    if (hard && pair) {
      [main, odd] = rng.chance(0.5) ? [pair[0], pair[1]] : [pair[1], pair[0]];
    } else {
      main = GROUP_IDS[rng.int(0, GROUP_IDS.length - 1)] ?? 'fruit';
      const far = GROUP_IDS.filter((g) => g !== main && !NEAR.some(([a, b]) => (a === main && b === g) || (b === main && a === g)));
      odd = far[rng.int(0, far.length - 1)] ?? 'vehicles';
    }
    const same = shuffle([...GROUPS[main]], rng).slice(0, count - 1);
    const other = GROUPS[odd][rng.int(0, GROUPS[odd].length - 1)] ?? 'star';
    const sprites = shuffle([...same.map((s) => ({ sprite: s, odd: false })), { sprite: other, odd: true }], rng);
    state.items = sprites.map((s, i) => ({ ...s, x: points[i]?.x ?? arena.width / 2, y: points[i]?.y ?? arena.height / 2, shook: 99 }));
    state.age = 0;
    state.solved = -1;
    state.sets += 1;
  }

  const itemAt = (p: Point): Item | undefined => {
    let best: Item | undefined;
    let bestD = state.reach;
    for (const item of state.items) {
      const d = Math.hypot(item.x - p.x, item.y - p.y);
      if (d <= bestD) {
        best = item;
        bestD = d;
      }
    }
    return best;
  };

  deal();

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
      state.age += dt;
      state.sulk = Math.max(0, state.sulk - dt);
      for (const item of state.items) item.shook += dt;
      if (state.solved >= 0) {
        state.solved += dt;
        if (state.solved >= NEXT_SECONDS) deal();
        return;
      }
      const stale = STALE_START + (STALE_END - STALE_START) * Math.min(1, state.time / duration);
      if (state.age > stale) {
        deal();
        return;
      }
      for (const tap of input.taps) {
        if (state.sulk > 0 || state.solved >= 0) break;
        const item = itemAt(tap);
        if (!item) continue;
        if (item.odd) {
          state.score += 1;
          state.solved = 0;
          events.push({ type: 'score', x: item.x, y: item.y - state.size / 2 });
        } else {
          item.shook = 0;
          state.sulk = SULK_SECONDS;
          events.push({ type: 'miss', x: item.x, y: item.y });
        }
      }
    },
  };
}

/** Good play: looks for a moment, then taps the odd one. */
export function oddOneOutBot(state: OddState, _context: BotContext): BotMove {
  if (state.solved >= 0 || state.sulk > 0 || state.age < 0.5) return {};
  const odd = state.items.find((i) => i.odd);
  return odd ? { tap: { x: odd.x, y: odd.y } } : {};
}
