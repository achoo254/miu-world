// Spot the difference: two pictures side by side (one above the other on a tall screen) look the same but
// differ in five places: something missing, something swapped, something bigger, something extra. A tap on a
// difference in either picture rings it in both: a point. A wrong tap rests the magnifier for half a second;
// after five wrong taps one difference starts to glow as a hint. Five found, a new pair of pictures comes.
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import type { SpriteName } from '../../sprites';
import { HUD_SAFE_TOP, type Arena, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const SCENE_SPRITES: readonly SpriteName[] = [
  'deciduous-tree', 'evergreen-tree', 'mushroom', 'sunflower', 'tulip', 'house', 'rabbit', 'fox', 'bear', 'duck', 'chicken', 'frog',
  'butterfly', 'honeybee', 'snail', 'red-apple', 'strawberry', 'watermelon', 'banana', 'carrot', 'balloon', 'kite', 'soccer-ball', 'teddy-bear',
  'gift', 'bicycle', 'owl', 'penguin', 'turtle', 'cherries',
];

export type DiffKind = 'missing' | 'swapped' | 'bigger' | 'extra';

export interface Thing {
  sprite: SpriteName;
  /** Position and size as shares of the picture (size of its shorter side). */
  u: number;
  v: number;
  size: number;
  /** How it differs on the right/lower picture (null: the same in both). */
  diff: DiffKind | null;
  /** The picture it shows instead, for a swapped one. */
  other: SpriteName;
  found: boolean;
}

export interface Panel {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SpotDiffState {
  panels: [Panel, Panel];
  things: Thing[];
  /** Seconds the magnifier rests after a wrong tap. */
  rest: number;
  wrong: number;
  /** The difference glowing as a hint (-1 none), and seconds left. */
  hint: number;
  hintLeft: number;
  /** Where the last wrong tap was, and seconds since. */
  missAt: Point | null;
  missAgo: number;
  doneAgo: number;
  scenes: number;
  score: number;
  time: number;
}

export const DIFFS = 5;
const REST = 0.5;
const HINT_AFTER = 5;
const NEXT_SECONDS = 1.4;

export function panels(arena: Arena): [Panel, Panel] {
  const gap = 18;
  const top = HUD_SAFE_TOP + 10;
  if (arena.width > arena.height) {
    const w = (arena.width - gap * 3) / 2;
    const h = arena.height - top - gap;
    return [
      { x: gap, y: top, w, h },
      { x: gap * 2 + w, y: top, w, h },
    ];
  }
  const w = arena.width - gap * 2;
  const h = (arena.height - top - gap * 2) / 2;
  return [
    { x: gap, y: top, w, h },
    { x: gap, y: top + h + gap, w, h },
  ];
}

/** Hit radius of a thing in a panel (units): bigger than its picture, never under a finger's width. */
export const thingReach = (panel: Panel, thing: Thing): number => Math.max(48, thing.size * Math.min(panel.w, panel.h) * 0.62);

export function thingAt(panel: Panel, thing: Thing): Point {
  return { x: panel.x + thing.u * panel.w, y: panel.y + thing.v * panel.h };
}

function makeScene(rng: Rng, panel: Panel): Thing[] {
  const wide = panel.w > panel.h;
  const cols = wide ? 4 : 3;
  const rows = wide ? 3 : 4;
  const slots: Array<{ u: number; v: number }> = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) slots.push({ u: (c + 0.5) / cols + rng.range(-0.06, 0.06), v: 0.18 + ((r + 0.5) / rows) * 0.78 + rng.range(-0.04, 0.04) });
  }
  // Shuffle the slots and the pictures.
  const pool = [...SCENE_SPRITES];
  for (const list of [slots, pool] as unknown[][]) {
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = rng.int(0, i);
      [list[i], list[j]] = [list[j], list[i]];
    }
  }
  const kinds: DiffKind[] = ['missing', 'swapped', 'bigger', 'extra', rng.pick(['missing', 'swapped', 'bigger'] as const)];
  const things: Thing[] = slots.map((slot, i) => ({
    sprite: pool[i] ?? 'star',
    ...slot,
    size: rng.range(0.15, 0.2),
    diff: i < kinds.length ? (kinds[i] ?? null) : null,
    other: pool[slots.length + i] ?? 'star',
    found: false,
  }));
  return things;
}

export function createSpotDiff({ arena, rng }: GameSetup): MinigameLogic<SpotDiffState> {
  const events = eventQueue();
  const both = panels(arena);
  const state: SpotDiffState = { panels: both, things: makeScene(rng, both[0]), rest: 0, wrong: 0, hint: -1, hintLeft: 0, missAt: null, missAgo: 9, doneAgo: -1, scenes: 0, score: 0, time: 0 };

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
      state.rest = Math.max(0, state.rest - dt);
      state.missAgo += dt;
      state.hintLeft = Math.max(0, state.hintLeft - dt);
      if (state.doneAgo >= 0) {
        state.doneAgo += dt;
        if (state.doneAgo >= NEXT_SECONDS) {
          state.things = makeScene(rng, both[0]);
          Object.assign(state, { doneAgo: -1, wrong: 0, hint: -1, hintLeft: 0 });
        }
        return;
      }
      const press = input.pressed ? (input.pointer ?? input.taps[0] ?? null) : null;
      if (!press || state.rest > 0) return;
      const panel = state.panels.find((p) => press.x >= p.x && press.x <= p.x + p.w && press.y >= p.y && press.y <= p.y + p.h);
      if (!panel) return;
      // The same spot in the picture it was tapped on, whichever that was.
      const hit = state.things.findIndex((t) => t.diff && !t.found && Math.hypot(thingAt(panel, t).x - press.x, thingAt(panel, t).y - press.y) <= thingReach(panel, t));
      const thing = state.things[hit];
      if (thing) {
        thing.found = true;
        state.score += 1;
        if (state.hint === hit) state.hint = -1;
        events.push({ type: 'score', ...thingAt(panel, thing) });
        if (state.things.filter((t) => t.diff).every((t) => t.found)) {
          state.doneAgo = 0;
          state.scenes += 1;
        }
        return;
      }
      state.rest = REST;
      state.wrong += 1;
      state.missAt = press;
      state.missAgo = 0;
      events.push({ type: 'miss', x: press.x, y: press.y });
      if (state.wrong >= HINT_AFTER) {
        state.wrong = 0;
        state.hint = state.things.findIndex((t) => t.diff && !t.found);
        state.hintLeft = 3;
      }
    },
  };
}

/** Good play: tap the next difference not yet found, in the first picture. */
export function spotDiffBot(state: SpotDiffState, _context: BotContext): BotMove {
  if (state.doneAgo >= 0 || state.rest > 0) return {};
  const thing = state.things.find((t) => t.diff && !t.found);
  return thing ? { tap: thingAt(state.panels[0], thing) } : {};
}
