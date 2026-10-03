// Helix drop: a ball bounces on the floors of a round tower. Every floor has a gap; the child drags sideways to
// turn the tower so the gap comes under the ball, and it drops to the next floor (a point for each floor passed).
// Red patches on the lower floors must not be under the ball when it lands: that costs one of three hearts.
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export const SEGMENTS = 12;
const SEG = (Math.PI * 2) / SEGMENTS;
export const GRAVITY = 2400;
/** Height of a bounce above a floor, and the floors' spacing (world units). */
const BOUNCE = 95;
export const FLOOR_GAP = 160;
const LIVES = 3;
/** Fastest fall (units per second): a drop through several gaps stays easy to follow. */
const MAX_FALL = 620;

export type Segment = 'floor' | 'gap' | 'red';

export interface HelixState {
  floors: Segment[][];
  /** Tower turn (radians). */
  turn: number;
  /** The ball's height in the world (down is +; floor k is at k × FLOOR_GAP) and speed. */
  ballY: number;
  vy: number;
  camY: number;
  /** The finger's x last step (for the drag), or null. */
  fingerX: number | null;
  centreX: number;
  radius: number;
  /** Tower turn (radians) per unit of drag: a drag across most of the screen turns it once round. */
  turnPerUnit: number;
  ballScreenY: number;
  hitAt: number;
  landedAt: number;
  passedAt: number;
  lives: number;
  score: number;
  time: number;
}

const wrap = (a: number): number => ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

/** The segment index facing the child (under the ball) for a tower turned by `turn`. */
export const frontSegment = (turn: number): number => Math.floor(wrap(Math.PI / 2 - turn) / SEG) % SEGMENTS;

/** Floor `k`: a two-segment gap and, lower down, some red patches. */
export function makeFloor(rng: Rng, k: number): Segment[] {
  const floor: Segment[] = new Array<Segment>(SEGMENTS).fill('floor');
  const gap = rng.int(0, SEGMENTS - 1);
  floor[gap] = 'gap';
  floor[(gap + 1) % SEGMENTS] = 'gap';
  const reds = k < 3 ? 0 : Math.min(4, 1 + Math.floor(k / 6) + rng.int(0, 1));
  for (let n = 0; n < reds; n += 1) {
    const i = rng.int(0, SEGMENTS - 1);
    if (floor[i] === 'floor') floor[i] = 'red';
  }
  return floor;
}

export function createHelixDrop({ arena, rng }: GameSetup): MinigameLogic<HelixState> {
  const events = eventQueue();
  const radius = Math.min(arena.width * 0.38, 250);
  const free = arena.height - HUD_SAFE_TOP;
  const state: HelixState = {
    floors: [],
    turn: 0,
    ballY: -BOUNCE,
    vy: 0,
    camY: 0,
    fingerX: null,
    centreX: arena.width / 2,
    radius,
    turnPerUnit: (Math.PI * 2) / (arena.width * 0.9),
    ballScreenY: HUD_SAFE_TOP + free * 0.38,
    hitAt: -9,
    landedAt: -9,
    passedAt: -9,
    lives: LIVES,
    score: 0,
    time: 0,
  };
  // The first floor's gap never starts right under the ball.
  for (let k = 0; k < 10; k += 1) state.floors.push(makeFloor(rng, k));
  const first = state.floors[0];
  if (first && first[frontSegment(0)] === 'gap') state.turn = Math.PI;

  const bounceSpeed = Math.sqrt(2 * GRAVITY * BOUNCE);

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
      // Dragging right turns the front of the tower to the right.
      const x = input.pointer?.x ?? null;
      if (x !== null && state.fingerX !== null && !input.pressed) state.turn -= (x - state.fingerX) * state.turnPerUnit;
      state.fingerX = x;

      const before = state.ballY;
      state.vy = Math.min(MAX_FALL, state.vy + GRAVITY * dt);
      state.ballY += state.vy * dt;
      const k = Math.floor(before / FLOOR_GAP) + 1;
      const level = k * FLOOR_GAP;
      if (state.vy > 0 && before < level && state.ballY >= level) {
        while (state.floors.length < k + 10) state.floors.push(makeFloor(rng, state.floors.length));
        const segment = state.floors[k]?.[frontSegment(state.turn)] ?? 'floor';
        if (segment === 'gap') {
          state.score += 1;
          state.passedAt = state.time;
          events.push({ type: 'score', x: state.centreX, y: state.ballScreenY + 40, note: 67 + Math.min(17, state.score % 18), voice: 'bell' });
        } else {
          state.ballY = level;
          state.vy = -bounceSpeed;
          state.landedAt = state.time;
          if (segment === 'red') {
            state.lives -= 1;
            state.hitAt = state.time;
            events.push({ type: 'hit', x: state.centreX, y: state.ballScreenY });
          }
        }
      }
      // The camera keeps the ball at its place on screen, easing down after a drop.
      state.camY += (state.ballY - state.camY) * Math.min(1, dt * 8);
    },
  };
}

/** The floor the ball will land on next. */
export const nextFloor = (state: HelixState): number => Math.floor(state.ballY / FLOOR_GAP) + 1;

/** Good play: turns the next floor's gap to the front, a finger's drag at a time; when the ball is about to land
 * and the gap is out of reach, it turns a plain (not red) part to the front instead. */
export function helixBot(state: HelixState, context: BotContext): BotMove {
  const k = nextFloor(state);
  const floor = state.floors[k];
  if (!floor) return {};
  const gap = floor.findIndex((s, i) => s === 'gap' && floor[(i + 1) % SEGMENTS] === 'gap');
  if (gap < 0) return {};
  // Turn so the middle of the gap faces front: π/2 - turn = (gap + 1) × SEG.
  const target = Math.PI / 2 - (gap + 1) * SEG;
  let delta = wrap(target - state.turn);
  if (delta > Math.PI) delta -= Math.PI * 2;
  const y = context.arena.height * 0.75;
  const middle = context.arena.width / 2;
  if (state.fingerX === null) return { touch: { x: middle, y } };
  if (Math.abs(delta) < 0.05) {
    // Lined up: while the ball rises, bring the finger back toward the middle for the next turn.
    if (Math.abs(state.fingerX - middle) > context.arena.width * 0.25 && state.vy < 0) return {};
    return { touch: { x: state.fingerX, y } };
  }
  const lo = 30;
  const hi = context.arena.width - 30;
  const fingerX = state.fingerX;
  const xFor = (d: number): number => fingerX - d / state.turnPerUnit;
  let x = Math.min(hi, Math.max(lo, xFor(delta)));
  const landingIn = state.vy > 0 ? (k * FLOOR_GAP - state.ballY) / state.vy : 1;
  if (Math.abs(x - xFor(delta)) > 1 && landingIn < 0.3) {
    // The gap is out of reach before the ball lands: of the turns in reach, the one nearest the gap that is not red.
    let best: number | null = null;
    for (let d = -Math.PI; d <= Math.PI; d += SEG / 2) {
      const reach = xFor(d);
      if (reach < lo || reach > hi || floor[frontSegment(state.turn + d)] === 'red') continue;
      if (best === null || Math.abs(d - delta) < Math.abs(best - delta)) best = d;
    }
    if (best !== null) x = xFor(best);
  }
  // At the edge with more to turn: lift the finger, to put it down again in the middle.
  if (Math.abs(x - fingerX) < 1) return {};
  return { touch: { x, y } };
}
