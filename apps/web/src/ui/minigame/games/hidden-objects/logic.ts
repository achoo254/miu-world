// Hidden objects: a busy scene full of things, and a tray along the bottom with six pictures to find (no
// words needed). A tap on one of them in the scene sends it flying to its box in the tray: a point. Tapping
// something else rests the finger a moment. If nothing is found for a while, one of the wanted things
// twinkles. All six found, a new scene and a new tray. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import type { SpriteName } from '../../sprites';
import { HUD_SAFE_TOP, type Arena, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const HIDDEN_SPRITES: readonly SpriteName[] = [
  'red-apple', 'banana', 'strawberry', 'watermelon', 'grapes', 'lemon', 'pineapple', 'cherries', 'carrot', 'cookie', 'lollipop', 'doughnut',
  'ice-cream', 'candy', 'birthday-cake', 'egg', 'mushroom', 'tulip', 'sunflower', 'leaf', 'clover', 'maple-leaf', 'feather', 'spiral-shell',
  'soccer-ball', 'basketball', 'tennis', 'baseball', 'balloon', 'kite', 'teddy-bear', 'gift', 'key', 'bell', 'light-bulb', 'crown',
  'running-shoe', 'gloves', 'drum', 'magnet', 'stopwatch', 'rocket', 'bicycle', 'automobile', 'sailboat', 'duck', 'fish', 'snail',
  'butterfly', 'honeybee', 'turtle', 'crab', 'owl', 'frog', 'package', 'envelope',
];

export interface Item {
  sprite: SpriteName;
  x: number;
  y: number;
  size: number;
  rotate: number;
  /** Index in the tray (-1: not wanted), whether found, seconds since found. */
  slot: number;
  found: boolean;
  foundAgo: number;
}

export interface Box extends Point {
  size: number;
}

export interface HiddenState {
  scene: { x: number; y: number; w: number; h: number };
  items: Item[];
  tray: Box[];
  rest: number;
  /** Seconds since the last find (a hint twinkles after HINT_AFTER). */
  sinceFind: number;
  missAt: Point | null;
  missAgo: number;
  doneAgo: number;
  scenes: number;
  score: number;
  time: number;
}

export const WANTED = 6;
const REST = 0.4;
export const HINT_AFTER = 14;
const NEXT_SECONDS = 1.4;

export const itemReach = (item: Item): number => Math.max(44, item.size * 0.6);

function layout(arena: Arena): Pick<HiddenState, 'scene' | 'tray'> {
  const top = HUD_SAFE_TOP + 8;
  const trayH = 104;
  const scene = { x: 12, y: top, w: arena.width - 24, h: arena.height - top - trayH - 20 };
  const boxSize = Math.min(88, (arena.width - 40) / WANTED - 8);
  const step = (arena.width - 40) / WANTED;
  const tray = Array.from({ length: WANTED }, (_, i) => ({ x: 20 + step * (i + 0.5), y: arena.height - trayH / 2 - 8, size: boxSize }));
  return { scene, tray };
}

function makeScene(rng: Rng, scene: HiddenState['scene']): Item[] {
  const pool = [...HIDDEN_SPRITES];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = rng.int(0, i);
    [pool[i], pool[j]] = [pool[j] ?? 'star', pool[i] ?? 'star'];
  }
  const wanted = pool.slice(0, WANTED);
  const others = pool.slice(WANTED);
  const cell = 92;
  const cols = Math.max(4, Math.floor(scene.w / cell));
  const rows = Math.max(4, Math.floor(scene.h / cell));
  const cells: Point[] = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      cells.push({ x: scene.x + ((c + 0.5) * scene.w) / cols + rng.range(-14, 14), y: scene.y + ((r + 0.5) * scene.h) / rows + rng.range(-12, 12) });
    }
  }
  for (let i = cells.length - 1; i > 0; i -= 1) {
    const j = rng.int(0, i);
    [cells[i], cells[j]] = [cells[j] ?? { x: 0, y: 0 }, cells[i] ?? { x: 0, y: 0 }];
  }
  return cells.map((at, i) => {
    const slot = i < WANTED ? i : -1;
    const sprite = slot >= 0 ? (wanted[slot] ?? 'star') : (others[(i - WANTED) % others.length] ?? 'star');
    return { sprite, ...at, size: rng.range(58, 78), rotate: rng.range(-0.5, 0.5), slot, found: false, foundAgo: 0 };
  });
}

export function createHiddenObjects({ arena, rng }: GameSetup): MinigameLogic<HiddenState> {
  const events = eventQueue();
  const place = layout(arena);
  const state: HiddenState = { ...place, items: makeScene(rng, place.scene), rest: 0, sinceFind: 0, missAt: null, missAgo: 9, doneAgo: -1, scenes: 0, score: 0, time: 0 };

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
      state.sinceFind += dt;
      for (const item of state.items) if (item.found) item.foundAgo += dt;
      if (state.doneAgo >= 0) {
        state.doneAgo += dt;
        if (state.doneAgo >= NEXT_SECONDS) {
          state.items = makeScene(rng, state.scene);
          Object.assign(state, { doneAgo: -1, sinceFind: 0 });
        }
        return;
      }
      const press = input.pressed ? (input.pointer ?? input.taps[0] ?? null) : null;
      if (!press || state.rest > 0) return;
      const hit = state.items
        .filter((it) => it.slot >= 0 && !it.found && Math.hypot(it.x - press.x, it.y - press.y) <= itemReach(it))
        .sort((a, b) => Math.hypot(a.x - press.x, a.y - press.y) - Math.hypot(b.x - press.x, b.y - press.y))[0];
      if (hit) {
        hit.found = true;
        hit.foundAgo = 0;
        state.score += 1;
        state.sinceFind = 0;
        events.push({ type: 'score', x: hit.x, y: hit.y });
        if (state.items.filter((it) => it.slot >= 0).every((it) => it.found)) {
          state.doneAgo = 0;
          state.scenes += 1;
        }
        return;
      }
      if (press.y > state.scene.y + state.scene.h) return;
      state.rest = REST;
      state.missAt = press;
      state.missAgo = 0;
      events.push({ type: 'miss', x: press.x, y: press.y });
    },
  };
}

/** Good play: tap the wanted things one after another. */
export function hiddenObjectsBot(state: HiddenState, _context: BotContext): BotMove {
  if (state.doneAgo >= 0 || state.rest > 0) return {};
  const item = state.items.find((it) => it.slot >= 0 && !it.found);
  return item ? { tap: { x: item.x, y: item.y } } : {};
}
