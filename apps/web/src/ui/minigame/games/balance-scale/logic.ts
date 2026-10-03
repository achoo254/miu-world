// Balance scale: a load sits on the left pan, its weight written on it. Fruits on a shelf below carry their
// own weights. The child drags (or taps) fruits onto the right pan and taps one on the pan to take it back;
// the beam tilts toward the heavier side. When both sides weigh the same and stay so a moment, the scale
// rings: a point, and a new load. Every load is the sum of some fruits on the shelf. Pure: no DOM.
import { eventQueue } from '../../define-minigame';
import type { SpriteName } from '../../sprites';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const FRUITS: readonly SpriteName[] = ['cherries', 'strawberry', 'lemon', 'red-apple', 'banana', 'grapes', 'carrot', 'pineapple'];
export const LOADS: readonly SpriteName[] = ['watermelon', 'pineapple', 'gift', 'teddy-bear'];

export interface Fruit {
  sprite: SpriteName;
  weight: number;
  /** On the right pan. */
  onPan: boolean;
  /** Its spot on the shelf. */
  home: Point;
  /** Being dragged: where it is. */
  dragAt: Point | null;
}

export interface BalanceState {
  load: number;
  loadSprite: SpriteName;
  fruits: Fruit[];
  pivotX: number;
  pivotY: number;
  arm: number;
  /** Beam angle (radians, positive: right side down) easing toward the weights. */
  tilt: number;
  /** Seconds both sides have been equal. */
  level: number;
  /** Seconds since balanced (-1 while not), before the next load. */
  balanced: number;
  dragging: number;
  rounds: number;
  score: number;
  time: number;
}

const HOLD_LEVEL = 0.5;
const NEXT = 1.2;
const PICK_REACH = TOUCH_RADIUS + 25;

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
export const panWeight = (state: BalanceState): number => state.fruits.filter((f) => f.onPan).reduce((sum, f) => sum + f.weight, 0);

/** Where the left and right pans hang now. */
export function pans(state: BalanceState): { left: Point; right: Point } {
  const dx = Math.cos(state.tilt) * state.arm;
  const dy = Math.sin(state.tilt) * state.arm;
  return { left: { x: state.pivotX - dx, y: state.pivotY - dy + 120 }, right: { x: state.pivotX + dx, y: state.pivotY + dy + 120 } };
}

export function createBalanceScale({ arena, rng }: GameSetup): MinigameLogic<BalanceState> {
  const events = eventQueue();
  const arm = clamp(arena.width * 0.3, 150, 260);
  const pivotY = HUD_SAFE_TOP + 70 + Math.max(0, (arena.height - 600) * 0.25);
  const shelfY = arena.height - 90;
  const state: BalanceState = {
    load: 0,
    loadSprite: 'watermelon',
    fruits: [],
    pivotX: arena.width / 2,
    pivotY,
    arm,
    tilt: 0,
    level: 0,
    balanced: -1,
    dragging: -1,
    rounds: 0,
    score: 0,
    time: 0,
  };

  function deal(): void {
    const count = arena.width > 760 ? 6 : 5;
    const maxWeight = state.rounds < 2 ? 4 : 6;
    const sprites = [...FRUITS];
    const fruits: Fruit[] = [];
    const gap = Math.min(130, (arena.width - 40) / count);
    for (let i = 0; i < count; i += 1) {
      const sprite = sprites.splice(rng.int(0, sprites.length - 1), 1)[0] ?? 'lemon';
      fruits.push({ sprite, weight: rng.int(1, maxWeight), onPan: false, home: { x: arena.width / 2 + (i - (count - 1) / 2) * gap, y: shelfY }, dragAt: null });
    }
    // The load: the sum of two (later three) of them.
    const pick = state.rounds < 2 ? 2 : 3;
    const chosen = [...fruits];
    let load = 0;
    for (let k = 0; k < pick; k += 1) {
      const i = rng.int(0, chosen.length - 1);
      load += chosen[i]?.weight ?? 0;
      chosen.splice(i, 1);
    }
    state.fruits = fruits;
    state.load = load;
    state.loadSprite = LOADS[state.rounds % LOADS.length] ?? 'watermelon';
    state.level = 0;
    state.balanced = -1;
    state.dragging = -1;
  }
  deal();

  const fruitAt = (p: Point): number => {
    const { right } = pans(state);
    let best = -1;
    let bestD = PICK_REACH;
    state.fruits.forEach((f, i) => {
      const at = f.onPan ? panSpot(state, i, right) : f.home;
      const d = Math.hypot(at.x - p.x, at.y - p.y);
      if (d < bestD) {
        best = i;
        bestD = d;
      }
    });
    return best;
  };
  const overPan = (p: Point): boolean => {
    const { right } = pans(state);
    return Math.abs(p.x - right.x) < 130 && p.y < right.y + 90 && p.y > right.y - 200;
  };

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
      if (state.balanced >= 0) {
        state.balanced += dt;
        state.tilt *= 0.9;
        if (state.balanced >= NEXT) {
          state.rounds += 1;
          deal();
        }
        return;
      }
      // Drag from the shelf to the pan.
      if (input.pressed && input.pointer) {
        const i = fruitAt(input.pointer);
        if (i >= 0 && !state.fruits[i]?.onPan) state.dragging = i;
      }
      const dragged = state.fruits[state.dragging];
      if (dragged && input.pointer) dragged.dragAt = input.pointer;
      if (input.released && dragged) {
        if (dragged.dragAt && overPan(dragged.dragAt)) {
          dragged.onPan = true;
          events.push({ type: 'action', x: dragged.dragAt.x, y: dragged.dragAt.y });
        }
        dragged.dragAt = null;
        state.dragging = -1;
      }
      // Taps: a shelf fruit hops onto the pan, a pan fruit back to the shelf.
      for (const tap of input.taps) {
        const i = fruitAt(tap);
        const f = state.fruits[i];
        if (!f) continue;
        f.onPan = !f.onPan;
        f.dragAt = null;
        events.push({ type: 'action', x: tap.x, y: tap.y });
      }

      const diff = panWeight(state) - state.load;
      const target = clamp(diff * 0.06, -0.35, 0.35);
      state.tilt += (target - state.tilt) * Math.min(1, dt * 6);
      state.level = diff === 0 && state.dragging < 0 ? state.level + dt : 0;
      if (state.level >= HOLD_LEVEL) {
        state.balanced = 0;
        state.score += 1;
        events.push({ type: 'score', x: state.pivotX, y: state.pivotY - 30 });
      }
    },
  };
}

/** Where fruit i sits on the right pan (in a little row). */
export function panSpot(state: BalanceState, i: number, right: Point): Point {
  const onPan = state.fruits.map((f, k) => (f.onPan ? k : -1)).filter((k) => k >= 0);
  const slot = onPan.indexOf(i);
  return { x: right.x + (slot - (onPan.length - 1) / 2) * 52, y: right.y - 40 - (slot % 2) * 6 };
}

/** The fruits (indices) that weigh exactly `target`, or null. */
export function subsetFor(weights: readonly number[], target: number): number[] | null {
  const n = weights.length;
  for (let mask = 0; mask < 1 << n; mask += 1) {
    let sum = 0;
    for (let i = 0; i < n; i += 1) if (mask & (1 << i)) sum += weights[i] ?? 0;
    if (sum === target) return weights.map((_, i) => i).filter((i) => (mask & (1 << i)) !== 0);
  }
  return null;
}

/** Good play: work out which fruits make the load and tap them on (and wrong ones off). */
export function balanceBot(state: BalanceState, _context: BotContext): BotMove {
  if (state.balanced >= 0) return {};
  const want = subsetFor(state.fruits.map((f) => f.weight), state.load);
  if (!want) return {};
  const i = state.fruits.findIndex((f, k) => f.onPan !== want.includes(k));
  const f = state.fruits[i];
  if (!f) return {};
  return { tap: f.onPan ? panSpot(state, i, pans(state).right) : f.home };
}
