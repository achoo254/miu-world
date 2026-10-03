// Chicken feed: a yard with two big greedy hens and three little chicks. Tapping tosses a handful of grain
// there. Every bird walks to the nearest grain it sees and pecks it up: hens see the whole yard, run fast,
// gobble and are never full; chicks only notice grain close by and nibble slowly. A
// chick that eats five grains is full (a point): it goes to nap by the coop and a new chick hatches. Feed the
// chicks where the hens are not. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface Grain {
  x: number;
  y: number;
  /** Seconds until it lands (it flies from the hand first). */
  landIn: number;
  fromX: number;
  fromY: number;
}

export interface Bird {
  hen: boolean;
  x: number;
  y: number;
  /** Where it wanders when it sees no grain. */
  wanderTo: Point;
  /** Grains eaten (chicks are full at FULL), seconds until it can peck again, seconds it has been looking at a grain. */
  ate: number;
  peck: number;
  notice: number;
  /** Chicks: seconds since full (-1 while hungry); seconds since hatched. */
  fullAgo: number;
  age: number;
  facing: number;
}

export interface ChickenFeedState {
  yard: { x: number; y: number; w: number; h: number };
  coop: Point;
  hand: Point;
  birds: Bird[];
  grains: Grain[];
  /** Seconds until the hand can toss again. */
  reload: number;
  score: number;
  time: number;
}

export const FULL = 5;
const HANDFUL = 5;
const RELOAD = 0.7;
const HEN_SPEED = 175;
const CHICK_SPEED = 75;
const HEN_SIGHT = 900;
const CHICK_SIGHT = 160;
/** Hens are busy pecking at the ground: they take this long to notice new grain. */
const HEN_NOTICE = 0.2;
/** Seconds between two pecks: hens gobble, chicks nibble. */
const HEN_PECK = 0.12;
const CHICK_PECK = 0.38;
const CHICKS = 3;

export function createChickenFeed({ arena, rng }: GameSetup): MinigameLogic<ChickenFeedState> {
  const events = eventQueue();
  const top = HUD_SAFE_TOP + 20;
  const yard = { x: 30, y: top, w: arena.width - 60, h: arena.height - top - 30 };
  const coop = { x: yard.x + 80, y: yard.y + 70 };
  const state: ChickenFeedState = { yard, coop, hand: { x: arena.width / 2, y: arena.height + 40 }, birds: [], grains: [], reload: 0, score: 0, time: 0 };
  const somewhere = (): Point => ({ x: yard.x + rng.range(70, yard.w - 70), y: yard.y + rng.range(90, yard.h - 50) });
  const bird = (hen: boolean, at: Point): Bird => ({ hen, ...at, wanderTo: somewhere(), ate: 0, peck: 0, notice: 0, fullAgo: -1, age: 9, facing: 1 });
  state.birds.push(bird(true, somewhere()), bird(true, somewhere()));
  for (let i = 0; i < CHICKS; i += 1) state.birds.push(bird(false, somewhere()));

  function toss(at: Point): void {
    const x = Math.min(yard.x + yard.w - 30, Math.max(yard.x + 30, at.x));
    const y = Math.min(yard.y + yard.h - 20, Math.max(yard.y + 30, at.y));
    for (let i = 0; i < HANDFUL; i += 1) {
      const a = rng.range(0, Math.PI * 2);
      const r = rng.range(6, 40);
      state.grains.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, landIn: 0.25, fromX: state.hand.x, fromY: state.hand.y });
    }
    state.reload = RELOAD;
    events.push({ type: 'action', x, y });
  }

  function move(b: Bird, to: Point, speed: number, dt: number): number {
    const dx = to.x - b.x;
    const dy = to.y - b.y;
    const d = Math.hypot(dx, dy);
    if (d > 1) {
      const step = Math.min(d, speed * dt);
      b.x += (dx / d) * step;
      b.y += (dy / d) * step;
      if (Math.abs(dx) > 2) b.facing = Math.sign(dx);
    }
    return d;
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
      state.reload = Math.max(0, state.reload - dt);
      for (const tap of input.taps) if (state.reload <= 0) toss(tap);
      for (const g of state.grains) g.landIn = Math.max(0, g.landIn - dt);

      for (const b of state.birds) {
        b.age += dt;
        b.peck = Math.max(0, b.peck - dt);
        if (b.fullAgo >= 0) {
          // Off to nap by the coop; a new chick hatches there a little later.
          b.fullAgo += dt;
          move(b, { x: state.coop.x + 60, y: state.coop.y + 40 }, CHICK_SPEED, dt);
          if (b.fullAgo > 2.2) {
            Object.assign(b, bird(false, { x: state.coop.x, y: state.coop.y + 20 }), { age: 0 });
          }
          continue;
        }
        if (b.age < 0.6) continue;
        const sight = b.hen ? HEN_SIGHT : CHICK_SIGHT;
        let target: Grain | null = null;
        let best = sight;
        for (const g of state.grains) {
          if (g.landIn > 0) continue;
          const d = Math.hypot(g.x - b.x, g.y - b.y);
          if (d < best) {
            best = d;
            target = g;
          }
        }
        if (!target) {
          b.notice = 0;
          if (move(b, b.wanderTo, (b.hen ? HEN_SPEED : CHICK_SPEED) * 0.35, dt) < 5) b.wanderTo = somewhere();
          continue;
        }
        b.notice += dt;
        if (b.hen && b.notice < HEN_NOTICE) continue;
        const d = move(b, target, b.hen ? HEN_SPEED : CHICK_SPEED, dt);
        if (d < 18 && b.peck <= 0) {
          state.grains.splice(state.grains.indexOf(target), 1);
          b.peck = b.hen ? HEN_PECK : CHICK_PECK;
          if (!b.hen) {
            b.ate += 1;
            if (b.ate >= FULL) {
              b.fullAgo = 0;
              state.score += 1;
              events.push({ type: 'score', x: b.x, y: b.y });
            }
          }
        }
      }
    },
  };
}

/** Good play: toss at the hungry chick that is farthest from the hens, twice a second. */
export function chickenFeedBot(state: ChickenFeedState, _context: BotContext): BotMove {
  if (state.reload > 0 || Math.round(state.time * 10) % 8 !== 0) return {};
  const hens = state.birds.filter((b) => b.hen);
  const chicks = state.birds.filter((b) => !b.hen && b.fullAgo < 0 && b.age >= 0.6);
  let best: Bird | null = null;
  let room = -1;
  for (const c of chicks) {
    const d = Math.min(...hens.map((h) => Math.hypot(h.x - c.x, h.y - c.y)));
    if (d > room) {
      room = d;
      best = c;
    }
  }
  return best ? { tap: { x: best.x, y: best.y } } : {};
}
