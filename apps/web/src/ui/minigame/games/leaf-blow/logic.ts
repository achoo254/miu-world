// Leaf blow: autumn leaves lie all over the yard and a wooden frame waits at one side. While the child holds
// a finger down, a fan sits under it and blows every leaf near it away from it (harder the closer), so she
// puts the fan behind a leaf to send it into the frame: a leaf that lands inside is a point and stays on the
// pile. Leaves slide and slow down on the grass; a new one drifts down from the trees every two seconds.
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export type LeafKind = 0 | 1 | 2;

export interface Leaf {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  kind: LeafKind;
  /** Seconds left of drifting down from a tree (0 once it lies on the grass and can be blown). */
  falling: number;
  /** Seconds since it landed on the pile (-1 while loose). */
  piled: number;
  /** Its place on the pile, which it slides to once in. */
  pileX: number;
  pileY: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LeafBlowState {
  /** Where leaves may lie: the yard inside its edges. */
  yard: Rect;
  /** The frame leaves are blown into. */
  pile: Rect;
  leaves: Leaf[];
  /** The fan, under the finger while it is held (null when nothing touches). */
  fan: Point | null;
  /** Where the fan was last, shown faded as a hint when nothing touches. */
  lastFan: Point;
  /** Seconds the fan has been blowing (its blades turn). */
  spinTime: number;
  score: number;
  time: number;
}

/** How far the fan's wind reaches, and its push (units/s²) right next to it. */
export const FAN_RADIUS = 175;
const FAN_PUSH = 2300;
/** Leaves slow down on the grass: their speed falls by this factor every second. */
const FRICTION = 2.6;
const LEAF_RADIUS = 24;
const START_LEAVES = 24;
const MAX_LOOSE = 30;
const NEW_LEAF_SECONDS = 2;
const FALL_SECONDS = 1.2;

const inside = (r: Rect, x: number, y: number, pad = 0): boolean => x >= r.x + pad && x <= r.x + r.w - pad && y >= r.y + pad && y <= r.y + r.h - pad;

export function createLeafBlow({ arena, params, rng }: GameSetup): MinigameLogic<LeafBlowState> {
  const power = typeof params.power === 'number' ? Math.min(1.5, Math.max(0.6, params.power)) : 1;
  const events = eventQueue();
  const yard: Rect = { x: 16, y: HUD_SAFE_TOP + 6, w: arena.width - 32, h: arena.height - HUD_SAFE_TOP - 22 };
  const landscape = arena.width > arena.height;
  // The frame: along the right edge on a wide screen, along the top on a tall one (below the HUD).
  const pile: Rect = landscape
    ? { x: yard.x + yard.w - 200, y: yard.y + yard.h / 2 - 120, w: 190, h: 240 }
    : { x: arena.width / 2 - 140, y: yard.y + 8, w: 280, h: 170 };
  const pileCentre = { x: pile.x + pile.w / 2, y: pile.y + pile.h / 2 };
  const state: LeafBlowState = { yard, pile, leaves: [], fan: null, lastFan: { x: arena.width / 2, y: arena.height * 0.75 }, spinTime: 0, score: 0, time: 0 };

  /** A spot on the grass well away from the frame (leaves never start nearly in). */
  function looseSpot(): Point {
    for (let i = 0; i < 40; i += 1) {
      const x = rng.range(yard.x + 40, yard.x + yard.w - 40);
      const y = rng.range(yard.y + 40, yard.y + yard.h - 40);
      if (Math.hypot(x - pileCentre.x, y - pileCentre.y) > Math.max(pile.w, pile.h) * 0.6 + 120) return { x, y };
    }
    return landscape ? { x: yard.x + 80, y: yard.y + yard.h / 2 } : { x: arena.width / 2, y: yard.y + yard.h - 80 };
  }

  function addLeaf(falling: number): void {
    const spot = looseSpot();
    state.leaves.push({ x: spot.x, y: spot.y, vx: 0, vy: 0, angle: rng.range(0, Math.PI * 2), spin: 0, kind: rng.int(0, 2) as LeafKind, falling, piled: -1, pileX: 0, pileY: 0 });
  }

  for (let i = 0; i < START_LEAVES; i += 1) addLeaf(0);
  let nextLeaf = NEW_LEAF_SECONDS;

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
      state.fan = input.pointer ? { x: input.pointer.x, y: input.pointer.y } : null;
      if (state.fan) {
        state.lastFan = state.fan;
        state.spinTime += dt;
        if (input.pressed) events.push({ type: 'action', x: state.fan.x, y: state.fan.y });
      }

      nextLeaf -= dt;
      if (nextLeaf <= 0) {
        nextLeaf += NEW_LEAF_SECONDS;
        if (state.leaves.filter((l) => l.piled < 0).length < MAX_LOOSE) addLeaf(FALL_SECONDS);
      }

      const drag = Math.exp(-FRICTION * dt);
      for (const leaf of state.leaves) {
        if (leaf.piled >= 0) {
          leaf.piled += dt;
          const ease = Math.min(1, dt * 6);
          leaf.x += (leaf.pileX - leaf.x) * ease;
          leaf.y += (leaf.pileY - leaf.y) * ease;
          continue;
        }
        if (leaf.falling > 0) {
          leaf.falling = Math.max(0, leaf.falling - dt);
          leaf.angle += dt * 3;
          continue;
        }
        const fan = state.fan;
        if (fan) {
          const dx = leaf.x - fan.x;
          const dy = leaf.y - fan.y;
          const d = Math.hypot(dx, dy);
          if (d < FAN_RADIUS) {
            const push = FAN_PUSH * power * (1 - d / FAN_RADIUS);
            // Right under the fan the wind still has a direction: straight away from the middle of the screen.
            const nx = d > 1 ? dx / d : 0;
            const ny = d > 1 ? dy / d : 1;
            leaf.vx += nx * push * dt;
            leaf.vy += ny * push * dt;
            leaf.spin += (nx - ny) * push * dt * 0.004;
          }
        }
        leaf.vx *= drag;
        leaf.vy *= drag;
        leaf.spin *= drag;
        leaf.x += leaf.vx * dt;
        leaf.y += leaf.vy * dt;
        leaf.angle += leaf.spin * dt;
        // The yard's edges: a leaf bounces softly back in.
        if (leaf.x < yard.x + LEAF_RADIUS || leaf.x > yard.x + yard.w - LEAF_RADIUS) {
          leaf.x = Math.min(yard.x + yard.w - LEAF_RADIUS, Math.max(yard.x + LEAF_RADIUS, leaf.x));
          leaf.vx *= -0.4;
        }
        if (leaf.y < yard.y + LEAF_RADIUS || leaf.y > yard.y + yard.h - LEAF_RADIUS) {
          leaf.y = Math.min(yard.y + yard.h - LEAF_RADIUS, Math.max(yard.y + LEAF_RADIUS, leaf.y));
          leaf.vy *= -0.4;
        }
        if (inside(pile, leaf.x, leaf.y, 14)) {
          leaf.piled = 0;
          // Slides onto the heap in the middle of the frame (a rounder heap the more there are).
          const spread = Math.min(1, 0.35 + state.score * 0.03);
          leaf.pileX = pileCentre.x + rng.range(-0.38, 0.38) * pile.w * spread;
          leaf.pileY = pileCentre.y + rng.range(-0.38, 0.38) * pile.h * spread;
          leaf.vx = 0;
          leaf.vy = 0;
          state.score += 1;
          events.push({ type: 'score', x: leaf.x, y: leaf.y });
        }
      }
    },
  };
}

/**
 * Good play: picks the loose leaf nearest the frame and holds the fan just behind it, on the far side from the
 * frame, so the wind sends it straight in.
 */
export function leafBlowBot(state: LeafBlowState, _context: BotContext): BotMove {
  const pile = { x: state.pile.x + state.pile.w / 2, y: state.pile.y + state.pile.h / 2 };
  const loose = state.leaves.filter((l) => l.piled < 0 && l.falling <= 0);
  let best: Leaf | undefined;
  let bestD = Infinity;
  for (const leaf of loose) {
    const d = Math.hypot(leaf.x - pile.x, leaf.y - pile.y);
    if (d < bestD) {
      bestD = d;
      best = leaf;
    }
  }
  if (!best) return {};
  const dx = best.x - pile.x;
  const dy = best.y - pile.y;
  const d = Math.hypot(dx, dy) || 1;
  const back = 70;
  const x = Math.min(state.yard.x + state.yard.w, Math.max(state.yard.x, best.x + (dx / d) * back));
  const y = Math.min(state.yard.y + state.yard.h, Math.max(state.yard.y, best.y + (dy / d) * back));
  return { touch: { x, y } };
}
