// Egg catch: hens walk along a branch at the top and lay eggs; a cheeky monkey drops rocks. The child drags
// (or taps) to move the basket under what falls: an egg is a point, a golden egg three, a rock costs one of
// three hearts. A missed egg only cracks on the grass. Items fall in the same time on every screen shape, a
// little faster as the round goes on. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export type ItemKind = 'egg' | 'golden' | 'rock';

export interface Item {
  kind: ItemKind;
  x: number;
  y: number;
  /** Units per second downwards. */
  vy: number;
  /** Seconds since it was caught or hit the grass; -1 while falling. */
  ended: number;
  caught: boolean;
}

export interface Dropper {
  x: number;
  /** Walking direction along the branch (-1, 1). */
  dir: number;
  /** Seconds since it last dropped something (a little hop). */
  dropped: number;
}

export interface EggCatchState {
  branchY: number;
  basketY: number;
  groundY: number;
  basketX: number;
  /** Seconds since the basket caught something (a squash), or got hit (a shake). */
  caughtAgo: number;
  hitAgo: number;
  hens: Dropper[];
  monkey: Dropper;
  items: Item[];
  lives: number;
  score: number;
  time: number;
}

const LIVES = 3;
/** Half the width that catches: wider than the basket picture, so a near catch is a catch. */
export const CATCH_HALF = 78;
const BASKET_SPEED = 2600;
/** Seconds from the branch to the basket, at the start and at the end of the round. */
const FALL_START = 1.8;
const FALL_END = 1.15;
/** Seconds between two drops, at the start and at the end. */
const GAP_START = 0.8;
const GAP_END = 0.48;
const ROCK_SHARE = 0.22;
const GOLDEN_SHARE = 0.12;
const WALK_SPEED = 70;

export function createEggCatch({ arena, duration, params, rng }: GameSetup): MinigameLogic<EggCatchState> {
  const factor = typeof params.speed === 'number' ? Math.min(1.6, Math.max(0.6, params.speed)) : 1;
  const events = eventQueue();
  const branchY = HUD_SAFE_TOP + 50;
  const groundY = arena.height - 40;
  const basketY = arena.height - 120;
  const margin = 70;
  const state: EggCatchState = {
    branchY,
    basketY,
    groundY,
    basketX: arena.width / 2,
    caughtAgo: 9,
    hitAgo: 9,
    hens: [0.2, 0.5, 0.8].map((f, i) => ({ x: arena.width * f, dir: i % 2 === 0 ? 1 : -1, dropped: 9 })),
    monkey: { x: arena.width * 0.65, dir: -1, dropped: 9 },
    items: [],
    lives: LIVES,
    score: 0,
    time: 0,
  };
  let nextDrop = 1.0;
  let lastEgg: { x: number; at: number } | null = null;

  const progress = (): number => Math.min(1, state.time / duration);
  const fallSpeed = (): number => ((basketY - branchY) / (FALL_START + (FALL_END - FALL_START) * progress())) * factor;
  const walk = (d: Dropper, dt: number): void => {
    d.x += d.dir * WALK_SPEED * dt;
    if (d.x < margin || d.x > arena.width - margin) d.dir *= -1;
    d.x = Math.min(arena.width - margin, Math.max(margin, d.x));
    d.dropped += dt;
  };

  function drop(): void {
    const rock = rng.chance(ROCK_SHARE);
    if (rock) {
      // Never right on top of an egg that just fell: there is always a fair way to catch it.
      let x = state.monkey.x;
      if (lastEgg && state.time - lastEgg.at < 0.5 && Math.abs(x - lastEgg.x) < CATCH_HALF * 2) x = lastEgg.x + (x < lastEgg.x ? -1 : 1) * CATCH_HALF * 2.2;
      x = Math.min(arena.width - margin, Math.max(margin, x));
      state.monkey.dropped = 0;
      state.items.push({ kind: 'rock', x, y: branchY + 30, vy: fallSpeed(), ended: -1, caught: false });
      return;
    }
    const hen = state.hens[rng.int(0, state.hens.length - 1)] ?? state.monkey;
    hen.dropped = 0;
    const kind: ItemKind = rng.chance(GOLDEN_SHARE) ? 'golden' : 'egg';
    state.items.push({ kind, x: hen.x, y: branchY + 30, vy: fallSpeed(), ended: -1, caught: false });
    lastEgg = { x: hen.x, at: state.time };
  }

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
      state.caughtAgo += dt;
      state.hitAgo += dt;

      // The basket goes where the finger is (a tap moves it there too), quickly but not in one jump.
      const target = input.pointer?.x ?? input.taps.at(-1)?.x;
      if (target !== undefined) {
        const goal = Math.min(arena.width - 50, Math.max(50, target));
        const step = BASKET_SPEED * dt;
        state.basketX += Math.max(-step, Math.min(step, goal - state.basketX));
      }

      for (const hen of state.hens) walk(hen, dt);
      walk(state.monkey, dt);
      nextDrop -= dt;
      if (nextDrop <= 0) {
        drop();
        nextDrop += (GAP_START + (GAP_END - GAP_START) * progress()) / factor;
      }

      for (const item of state.items) {
        if (item.ended >= 0) {
          item.ended += dt;
          continue;
        }
        const before = item.y;
        item.y += item.vy * dt;
        // Into the basket as it passes the rim.
        if (before < basketY - 20 && item.y >= basketY - 20 && Math.abs(item.x - state.basketX) <= CATCH_HALF) {
          item.ended = 0;
          item.caught = true;
          if (item.kind === 'rock') {
            state.lives -= 1;
            state.hitAgo = 0;
            events.push({ type: 'hit', x: item.x, y: basketY });
          } else {
            const points = item.kind === 'golden' ? 3 : 1;
            state.score += points;
            state.caughtAgo = 0;
            events.push({ type: 'score', x: item.x, y: basketY - 30, points });
          }
        } else if (item.y >= groundY) {
          item.y = groundY;
          item.ended = 0;
          if (item.kind !== 'rock') events.push({ type: 'miss', x: item.x, y: groundY });
        }
      }
      state.items = state.items.filter((i) => i.ended < 0.7);
    },
  };
}

/** Good play: under the next egg to land (golden ones first when close), out from under a rock. */
export function eggCatchBot(state: EggCatchState, context: BotContext): BotMove {
  const falling = state.items.filter((i) => i.ended < 0 && i.y < state.basketY - 20);
  const arrival = (i: { y: number; vy: number }): number => (state.basketY - 20 - i.y) / i.vy;
  // A golden egg counts as landing a little sooner: worth hurrying for.
  const urgency = (i: Item): number => arrival(i) - (i.kind === 'golden' ? 0.3 : 0);
  const eggs = falling.filter((i) => i.kind !== 'rock').sort((a, b) => urgency(a) - urgency(b));
  let x = eggs[0]?.x ?? state.basketX;
  const rock = falling.find((i) => i.kind === 'rock' && arrival(i) < 0.6 && Math.abs(i.x - x) < CATCH_HALF + 20);
  if (rock) x = rock.x + (x <= rock.x ? -1 : 1) * (CATCH_HALF * 2 + 30);
  x = Math.min(context.arena.width - 50, Math.max(50, x));
  return { touch: { x, y: state.basketY } };
}
