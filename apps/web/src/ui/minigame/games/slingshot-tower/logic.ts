// Slingshot tower: a slingshot stands on the left; across the field a tower of parcels holds a teddy bear on
// top (sometimes on a stone ledge). The child puts a finger down anywhere, pulls back (the stone follows,
// dotted dots show the first part of its flight) and lets go: the stone flies in an arc. A stone hitting a
// parcel knocks it and everything above it tumbling down; the teddy falling is a toppled tower (a point), and a
// new tower slides in. Six stones a round. Tumbling is scripted (spin, gravity, bounces), not a rigid-body
// solver. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export type BodyKind = 'box' | 'teddy';

export interface Body {
  kind: BodyKind;
  x: number;
  y: number;
  /** Half the size (boxes are squares; the teddy counts as a box too). */
  half: number;
  rot: number;
  vx: number;
  vy: number;
  vr: number;
  /** Knocked off the tower and tumbling (or lying where it fell). */
  loose: boolean;
}

export interface Tower {
  bodies: Body[];
  /** A stone ledge under the tower (top y and half width), or null on the ground. */
  ledge: { x: number; top: number; half: number } | null;
  toppled: boolean;
  /** Seconds since it was toppled; slides out after a beat. */
  toppledAgo: number;
  /** Slides in from the right: 1 = off screen, 0 = in place. */
  enter: number;
}

export interface Stone {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Seconds it has been flying or rolling. */
  t: number;
  /** It already hit a parcel (it keeps flying, slower). */
  hit: boolean;
}

export interface SlingState {
  groundY: number;
  /** Where the stone rests in the sling. */
  pouch: Point;
  /** The finger's pull while aiming: where it went down and the stone's offset from the pouch. */
  drag: { from: Point; pull: Point } | null;
  stone: Stone | null;
  tower: Tower;
  /** The tower being cleared away (its debris fades) while the next one slides in. */
  oldTower: Tower | null;
  stonesLeft: number;
  /** Seconds since the last stone came to rest (the next is ready after a beat). */
  restAgo: number;
  score: number;
  time: number;
  /** For drawing: the arena width (towers slide in from the right edge). */
  width: number;
}

export const STONES = 6;
export const STONE_RADIUS = 20;
export const GRAVITY = 900;
export const MAX_PULL = 150;
const MIN_PULL = 24;
const BOX_HALF = 30;
const REST_SECONDS = 0.6;

/** Where the pulled stone sits in the band (never under the grass). */
export const heldStone = (state: { pouch: Point; groundY: number }, pull: Point): Point => ({
  x: state.pouch.x + pull.x,
  y: Math.min(state.pouch.y + pull.y, state.groundY - STONE_RADIUS),
});

/** The launch speed for the strongest pull: enough to reach the far end of this arena. */
export const maxSpeed = (width: number): number => Math.sqrt(GRAVITY * Math.max(400, width - 120)) * 1.15;

export function clampPull(p: Point): Point {
  const d = Math.hypot(p.x, p.y);
  return d <= MAX_PULL ? p : { x: (p.x / d) * MAX_PULL, y: (p.y / d) * MAX_PULL };
}

/** The stone's launch velocity for a pull (opposite to it, stronger the further it is pulled). */
export function launchVelocity(pull: Point, width: number): Point {
  const k = maxSpeed(width) / MAX_PULL;
  return { x: -pull.x * k, y: -pull.y * k };
}

function buildTower(rng: Rng, width: number, groundY: number, pouchX: number): Tower {
  const count = rng.int(2, 4);
  const near = Math.max(pouchX + 260, width * 0.5);
  const x = rng.range(near, width - 80);
  const onLedge = rng.chance(0.4);
  const ledge = onLedge ? { x, top: groundY - rng.range(70, 150), half: BOX_HALF + 22 } : null;
  const base = ledge ? ledge.top : groundY;
  const bodies: Body[] = [];
  for (let i = 0; i < count; i += 1) {
    // Parcels are stacked a little unevenly.
    bodies.push({ kind: 'box', x: x + rng.range(-5, 5), y: base - BOX_HALF - i * BOX_HALF * 2, half: BOX_HALF, rot: 0, vx: 0, vy: 0, vr: 0, loose: false });
  }
  bodies.push({ kind: 'teddy', x, y: base - count * BOX_HALF * 2 - 30, half: 30, rot: 0, vx: 0, vy: 0, vr: 0, loose: false });
  return { bodies, ledge, toppled: false, toppledAgo: 0, enter: 1 };
}

/** The first standing body a stone at (x, y) touches, or -1. */
export function bodyHit(tower: Tower, x: number, y: number): number {
  return tower.bodies.findIndex((b) => !b.loose && Math.abs(x - b.x) < b.half + STONE_RADIUS && Math.abs(y - b.y) < b.half + STONE_RADIUS);
}

/** Moves a stone one step: gravity, bounces on the ground and on top of the ledge, off the ledge's side. */
function moveStone(stone: Stone, dt: number, groundY: number, ledge: Tower['ledge']): void {
  const prevY = stone.y;
  stone.t += dt;
  stone.vy += GRAVITY * dt;
  stone.x += stone.vx * dt;
  stone.y += stone.vy * dt;
  if (ledge && Math.abs(stone.x - ledge.x) < ledge.half + STONE_RADIUS && stone.y > ledge.top - STONE_RADIUS) {
    if (prevY <= ledge.top - STONE_RADIUS) {
      stone.y = ledge.top - STONE_RADIUS;
      stone.vy = -stone.vy * 0.35;
      stone.vx *= 0.7;
    } else {
      stone.x = ledge.x + Math.sign(stone.x - ledge.x || -1) * (ledge.half + STONE_RADIUS);
      stone.vx = -stone.vx * 0.3;
    }
  }
  if (stone.y > groundY - STONE_RADIUS) {
    stone.y = groundY - STONE_RADIUS;
    if (stone.vy > 80) {
      stone.vy = -stone.vy * 0.35;
      stone.vx *= 0.7;
    } else if (stone.vy >= 0) {
      // Rolling on the grass slows it down.
      stone.vy = 0;
      stone.vx -= Math.sign(stone.vx) * Math.min(Math.abs(stone.vx), 500 * dt);
    }
  }
}

/** The stone has stopped being worth following: off screen, at rest, or flying too long. */
export const stoneFinished = (stone: Stone, groundY: number, width: number): boolean =>
  stone.x > width + 60 || stone.x < -60 || stone.t > 5 || (Math.abs(stone.vx) < 20 && stone.y >= groundY - STONE_RADIUS - 2);

export function createSlingshot({ arena, rng }: GameSetup): MinigameLogic<SlingState> {
  const events = eventQueue();
  const groundY = arena.height < 700 ? arena.height - 80 : arena.height * 0.75;
  const pouch = { x: Math.max(150, Math.min(190, arena.width * 0.2)), y: groundY - 120 };
  const state: SlingState = {
    groundY,
    pouch,
    drag: null,
    stone: null,
    tower: buildTower(rng, arena.width, groundY, pouch.x),
    oldTower: null,
    stonesLeft: STONES,
    restAgo: 9,
    score: 0,
    time: 0,
    width: arena.width,
  };
  state.tower.enter = 0;

  const ready = (): boolean => state.stone === null && state.stonesLeft > 0 && state.restAgo >= REST_SECONDS && state.tower.enter <= 0;

  function knock(index: number, stone: Stone): void {
    const tower = state.tower;
    const hitBody = tower.bodies[index];
    if (!hitBody) return;
    // The parcel hit and everything above it come loose.
    for (const b of tower.bodies) {
      if (b.loose || b.y > hitBody.y + 1) continue;
      const above = (hitBody.y - b.y) / (BOX_HALF * 2);
      b.loose = true;
      // A gentle tumble that stays on screen: the higher the parcel, the further it flies.
      b.vx = Math.sign(stone.vx) * rng.range(40, 110) + above * 35;
      b.vy = -rng.range(160, 320) - above * 40;
      b.vr = rng.range(-6, 6) + Math.sign(stone.vx) * 3;
    }
    stone.hit = true;
    stone.vx *= 0.35;
    stone.vy *= 0.5;
    events.push({ type: 'hit', x: hitBody.x, y: hitBody.y });
    const teddy = tower.bodies.find((b) => b.kind === 'teddy');
    if (teddy?.loose && !tower.toppled) {
      tower.toppled = true;
      tower.toppledAgo = 0;
      state.score += 1;
      events.push({ type: 'score', x: teddy.x, y: teddy.y - 30 });
    }
  }

  function tumble(tower: Tower, dt: number): void {
    for (const b of tower.bodies) {
      if (!b.loose) continue;
      const prevY = b.y;
      b.vy += GRAVITY * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.rot += b.vr * dt;
      // Lands on the ledge when it falls onto it, otherwise on the ground.
      const ledge = tower.ledge;
      const floor = ledge && Math.abs(b.x - ledge.x) < ledge.half && prevY <= ledge.top - b.half + 1 ? ledge.top : groundY;
      if (b.y > floor - b.half) {
        b.y = floor - b.half;
        b.vy = Math.abs(b.vy) > 60 ? -b.vy * 0.3 : 0;
        b.vx *= 0.6;
        b.vr *= 0.5;
        // Settle flat on a side.
        if (b.vy === 0) b.rot += (Math.round(b.rot / (Math.PI / 2)) * (Math.PI / 2) - b.rot) * Math.min(1, dt * 8);
      }
    }
  }

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.stonesLeft <= 0 && state.stone === null && state.restAgo >= 1.2;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.restAgo += dt;

      // Aiming: a finger down anywhere pulls the stone; lifting it lets go.
      if (ready()) {
        if (input.pointer) {
          if (!state.drag) state.drag = { from: input.pointer, pull: { x: 0, y: 0 } };
          state.drag.pull = clampPull({ x: input.pointer.x - state.drag.from.x, y: input.pointer.y - state.drag.from.y });
        } else if (state.drag) {
          const { pull } = state.drag;
          state.drag = null;
          if (Math.hypot(pull.x, pull.y) >= MIN_PULL) {
            const v = launchVelocity(pull, arena.width);
            state.stone = { x: pouch.x, y: pouch.y, vx: v.x, vy: v.y, t: 0, hit: false };
            state.stonesLeft -= 1;
            events.push({ type: 'action', x: pouch.x, y: pouch.y });
          }
        }
      } else if (!input.pointer) state.drag = null;

      const stone = state.stone;
      if (stone) {
        // Small sub-steps so a fast stone cannot pass through a parcel.
        for (let i = 0; i < 3 && state.stone; i += 1) {
          moveStone(stone, dt / 3, groundY, state.tower.ledge);
          const index = bodyHit(state.tower, stone.x, stone.y);
          if (index >= 0) knock(index, stone);
        }
        if (stoneFinished(stone, groundY, arena.width)) {
          if (!stone.hit) events.push({ type: 'miss', x: Math.min(arena.width - 30, Math.max(30, stone.x)), y: stone.y });
          state.stone = null;
          state.restAgo = 0;
        }
      }

      tumble(state.tower, dt);
      if (state.oldTower) {
        tumble(state.oldTower, dt);
        state.oldTower.toppledAgo += dt;
        if (state.oldTower.toppledAgo > 2.2) state.oldTower = null;
      }
      const tower = state.tower;
      tower.enter = Math.max(0, tower.enter - dt / 0.6);
      if (tower.toppled) {
        tower.toppledAgo += dt;
        if (tower.toppledAgo >= 1.1 && state.stone === null && state.stonesLeft > 0) {
          state.oldTower = tower;
          state.tower = buildTower(rng, arena.width, groundY, pouch.x);
        }
      }
    },
  };
}

/** Where a stone pulled this way would first hit the tower (body index, -1 for none), and whether in the air. */
export function shotHits(state: SlingState, pull: Point): { index: number; airborne: boolean } {
  const v = launchVelocity(pull, state.width);
  const stone: Stone = { x: state.pouch.x, y: state.pouch.y, vx: v.x, vy: v.y, t: 0, hit: false };
  const dt = 1 / 180;
  while (!stoneFinished(stone, state.groundY, state.width)) {
    moveStone(stone, dt, state.groundY, state.tower.ledge);
    const index = bodyHit(state.tower, stone.x, stone.y);
    if (index >= 0) return { index, airborne: stone.y < state.groundY - STONE_RADIUS - 2 };
  }
  return { index: -1, airborne: false };
}

/**
 * Good play: search pulls (angle and strength) for one whose flight hits the tower's lowest parcel, then pull
 * the stone there over two decisions and let go on the third, after a breath between shots.
 */
export function slingshotBot(state: SlingState, _context: BotContext): BotMove {
  if (state.stone || state.stonesLeft <= 0 || state.restAgo < 0.8 || state.tower.enter > 0 || state.tower.toppled) return {};
  const press = { x: state.pouch.x + 40, y: state.pouch.y + 60 };
  if (!state.drag) return { touch: press };
  const want = bestPull(state);
  const now = state.drag.pull;
  if (Math.hypot(now.x - want.x, now.y - want.y) > 2) return { touch: { x: state.drag.from.x + want.x, y: state.drag.from.y + want.y } };
  return {};
}

function bestPull(state: SlingState): Point {
  let best: { pull: Point; score: number } = { pull: clampPull({ x: -MAX_PULL * 0.7, y: MAX_PULL * 0.7 }), score: -1 };
  for (let deg = 5; deg <= 70; deg += 2.5) {
    for (let p = 0.3; p <= 1.001; p += 0.025) {
      const a = (deg * Math.PI) / 180;
      const pull = clampPull({ x: -Math.cos(a) * MAX_PULL * p, y: Math.sin(a) * MAX_PULL * p });
      const hit = shotHits(state, pull);
      if (hit.index < 0) continue;
      // A hit in the air is surer than a rolling stone; the lower the parcel, the more comes down.
      const score = (hit.airborne ? 10 : 0) + 5 - hit.index - deg / 100;
      if (score > best.score) best = { pull, score };
    }
  }
  return best.pull;
}

/** The stone's flight for the aim dots (the first part only: a hint, not the answer). */
export function aimDots(state: SlingState, pull: Point, count: number, seconds: number): Point[] {
  const v = launchVelocity(pull, state.width);
  const from = state.pouch;
  return Array.from({ length: count }, (_, i) => {
    const t = ((i + 1) / count) * seconds;
    return { x: from.x + v.x * t, y: from.y + v.y * t + 0.5 * GRAVITY * t * t };
  }).filter((p) => p.y < state.groundY && p.y > HUD_SAFE_TOP - 40);
}
