// Cắp cua bỏ giỏ: crabs scuttle sideways across the beach. The child drags a crab into the basket; the lid
// pops open to let it in, and stays open until she taps it shut. Left open too long, the crabs inside start
// climbing out one by one and scuttle away (they can be caught again). The score is the crabs in the basket.
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface Crab {
  id: number;
  x: number;
  y: number;
  /** Sideways speed (units/s, sign is the way it walks). */
  vx: number;
  /** In the child's fingers. */
  held: boolean;
  /** Just climbed out of the basket (drawn hurrying). */
  escaped: boolean;
}

export interface CapCuaState {
  crabs: Crab[];
  basket: Point & { r: number };
  lidOpen: boolean;
  /** Seconds the lid has been open. */
  openFor: number;
  /** Crabs in the basket. */
  inside: number;
  /** Seconds until the next crab climbs out (while the lid is too long open). */
  climbIn: number;
  sand: { top: number; bottom: number };
  /** Seconds since a crab went in (the basket wobbles). */
  fedAgo: number;
  lastPointer: Point | null;
  lastActAt: number;
  score: number;
  time: number;
}

export const GRAB_REACH = TOUCH_RADIUS + 22;
/** Seconds an open lid is safe; after that a crab climbs out every CLIMB_SECONDS. */
export const OPEN_GRACE = 2;
export const CLIMB_SECONDS = 1.3;
const MAX_CRABS = 4;
const SPAWN_SECONDS = 1.1;

export function createCapCua({ arena, rng }: GameSetup): MinigameLogic<CapCuaState> {
  const events = eventQueue();
  const basketR = 92;
  const state: CapCuaState = {
    crabs: [],
    basket: { x: arena.width / 2, y: arena.height - basketR - 30, r: basketR },
    lidOpen: false,
    openFor: 0,
    inside: 0,
    climbIn: CLIMB_SECONDS,
    sand: { top: HUD_SAFE_TOP + 110, bottom: arena.height - basketR * 2 - 60 },
    fedAgo: 9,
    lastPointer: null,
    lastActAt: 0,
    score: 0,
    time: 0,
  };
  let nextId = 0;
  let spawnIn = 0.3;

  function spawn(): void {
    const fromLeft = rng.chance(0.5);
    const speed = rng.range(70, 125);
    state.crabs.push({
      id: (nextId += 1),
      x: fromLeft ? -40 : arena.width + 40,
      y: rng.range(state.sand.top, Math.max(state.sand.top + 1, state.sand.bottom)),
      vx: fromLeft ? speed : -speed,
      held: false,
      escaped: false,
    });
  }

  const onBasket = (p: Point): boolean => Math.hypot(p.x - state.basket.x, p.y - state.basket.y) <= state.basket.r + 20;

  function putIn(crab: Crab): void {
    state.crabs = state.crabs.filter((c) => c !== crab);
    state.inside += 1;
    state.score = state.inside;
    if (!state.lidOpen) {
      state.lidOpen = true;
      state.openFor = 0;
      state.climbIn = CLIMB_SECONDS;
    }
    state.fedAgo = 0;
    events.push({ type: 'score', x: state.basket.x, y: state.basket.y - state.basket.r });
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
      state.fedAgo += dt;
      spawnIn -= dt;
      if (spawnIn <= 0 && state.crabs.filter((c) => !c.held).length < MAX_CRABS) {
        spawn();
        spawnIn = SPAWN_SECONDS;
      }
      const held = state.crabs.find((c) => c.held);
      // Pick up a crab where the finger goes down.
      if (input.pressed && input.pointer && !held) {
        const p = input.pointer;
        const crab = state.crabs.filter((c) => Math.hypot(c.x - p.x, c.y - p.y) <= GRAB_REACH).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
        if (crab) {
          crab.held = true;
          state.lastActAt = state.time;
          events.push({ type: 'action', x: crab.x, y: crab.y });
        }
      }
      const carried = state.crabs.find((c) => c.held);
      if (carried && input.pointer) {
        carried.x = input.pointer.x;
        carried.y = input.pointer.y;
      }
      if (input.released && carried) {
        carried.held = false;
        state.lastActAt = state.time;
        const at = state.lastPointer ?? carried;
        if (onBasket(at)) putIn(carried);
      }
      // A tap on the open lid shuts it.
      for (const p of input.taps) {
        if (state.lidOpen && onBasket(p) && !carried) {
          state.lidOpen = false;
          state.lastActAt = state.time;
          events.push({ type: 'action', x: state.basket.x, y: state.basket.y - 40, note: 60, voice: 'drum' });
        }
      }
      state.lastPointer = input.pointer;

      if (state.lidOpen) {
        state.openFor += dt;
        if (state.openFor > OPEN_GRACE && state.inside > 0) {
          state.climbIn -= dt;
          if (state.climbIn <= 0) {
            state.climbIn = CLIMB_SECONDS;
            state.inside -= 1;
            state.score = state.inside;
            const way = rng.chance(0.5) ? 1 : -1;
            state.crabs.push({ id: (nextId += 1), x: state.basket.x + way * 40, y: state.basket.y - state.basket.r * 0.8, vx: way * 150, held: false, escaped: true });
            events.push({ type: 'miss', x: state.basket.x, y: state.basket.y - state.basket.r });
          }
        }
      }
      for (const c of state.crabs) {
        if (c.held) continue;
        c.x += c.vx * dt;
        // Escaped crabs hurry back up onto the sand.
        if (c.escaped && c.y > state.sand.bottom) c.y -= 120 * dt;
      }
      state.crabs = state.crabs.filter((c) => c.held || (c.x > -80 && c.x < arena.width + 80));
    },
  };
}

/** Good play: shut an open lid first, then carry the nearest crab to the basket. */
export function capCuaBot(state: CapCuaState, context: BotContext): BotMove {
  const carried = state.crabs.find((c) => c.held);
  if (carried) {
    const atBasket = Math.hypot(carried.x - state.basket.x, carried.y - state.basket.y) < 20;
    return atBasket ? {} : { touch: { x: state.basket.x, y: state.basket.y } };
  }
  if (state.lidOpen) return { tap: { x: state.basket.x, y: state.basket.y } };
  if (state.time - state.lastActAt < 0.2) return {};
  const reachable = state.crabs.filter((c) => c.x > 30 && c.x < context.arena.width - 30);
  const crab = reachable.sort((a, b) => Math.hypot(a.x - state.basket.x, a.y - state.basket.y) - Math.hypot(b.x - state.basket.x, b.y - state.basket.y))[0];
  if (!crab) return {};
  // Where it will be a moment from now.
  return { touch: { x: crab.x + crab.vx * 0.03, y: crab.y } };
}
