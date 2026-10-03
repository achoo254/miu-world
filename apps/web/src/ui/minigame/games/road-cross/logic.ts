// Road cross: a frog crosses a busy road, rests on the grass in the middle, then crosses a river by hopping
// onto floating logs and turtle rafts, to reach the far bank (a point; it starts again from the pavement).
// Tap (or swipe up) hops forward, swipe left or right steps sideways, swipe down steps back. A car sends it
// back to the pavement, the water back to the grass: nothing else is lost. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export type LaneKind = 'safe' | 'road' | 'river';
export type ThingKind = 'car' | 'bus' | 'log' | 'turtles';

export interface Thing {
  kind: ThingKind;
  x: number;
  w: number;
}

export interface Lane {
  kind: LaneKind;
  /** Units per second; negative moves left. */
  speed: number;
  things: Thing[];
}

export interface RoadCrossState {
  /** Rows from the bottom (0: pavement) to the top (the far bank). */
  lanes: Lane[];
  rowH: number;
  /** Bottom edge of row 0. */
  bottomY: number;
  width: number;
  frogRow: number;
  frogX: number;
  /** Seconds into a hop (-1 when sitting) and where from. */
  hop: number;
  hopFromRow: number;
  hopFromX: number;
  /** Seconds since a crossing, a splash or a bump, for the pictures. */
  homeAgo: number;
  splashAgo: number;
  bumpAgo: number;
  score: number;
  time: number;
}

export const HOP_SECONDS = 0.15;
export const STEP_X = 72;
const FROG_HALF = 18;
/** Things wrap around this far beyond each edge. */
const WRAP = 160;
const LAYOUT: readonly LaneKind[] = ['safe', 'road', 'road', 'road', 'safe', 'river', 'river', 'safe'];
const MEDIAN = 4;

export const rowY = (state: RoadCrossState, row: number): number => state.bottomY - (row + 0.5) * state.rowH;

/** A thing's x after `dt` more seconds, wrapped around the lane. */
export function thingX(state: RoadCrossState, lane: Lane, thing: Thing, dt: number): number {
  const period = state.width + WRAP * 2;
  return ((((thing.x + lane.speed * dt + WRAP) % period) + period) % period) - WRAP;
}

function makeLane(kind: LaneKind, index: number, width: number, rng: Rng): Lane {
  const dir = index % 2 === 0 ? 1 : -1;
  if (kind === 'safe') return { kind, speed: 0, things: [] };
  const things: Thing[] = [];
  const period = width + WRAP * 2;
  if (kind === 'road') {
    const speed = dir * rng.range(70, 130);
    let x = rng.range(-WRAP, 0);
    while (x < period - WRAP - 160) {
      const bus = rng.chance(0.25);
      const w = bus ? 150 : 92;
      things.push({ kind: bus ? 'bus' : 'car', x: x + w / 2, w });
      x += w + rng.range(170, 300);
    }
    return { kind, speed, things };
  }
  const speed = dir * rng.range(45, 80);
  let x = rng.range(-WRAP, 0);
  while (x < period - WRAP - 140) {
    const turtles = rng.chance(0.35);
    const w = turtles ? 140 : rng.range(170, 230);
    things.push({ kind: turtles ? 'turtles' : 'log', x: x + w / 2, w });
    x += w + rng.range(90, 150);
  }
  return { kind, speed, things };
}

/** Whether the frog at (row, x) is safe `dt` seconds from now, and stays so for `hold` seconds. */
export function safeAt(state: RoadCrossState, row: number, x: number, dt: number, hold = 0): boolean {
  const lane = state.lanes[row];
  if (!lane) return false;
  if (x < 20 || x > state.width - 20) return false;
  if (lane.kind === 'safe') return true;
  for (let t = dt; t <= dt + hold + 1e-9; t += 0.05) {
    const over = lane.things.some((thing) => Math.abs(thingX(state, lane, thing, t) - (lane.kind === 'river' ? x + lane.speed * (t - dt) : x)) < thing.w / 2 + (lane.kind === 'road' ? FROG_HALF : -8));
    if (lane.kind === 'road' && over) return false;
    if (lane.kind === 'river' && !over) return false;
  }
  return true;
}

export function createRoadCross({ arena, params, rng }: GameSetup): MinigameLogic<RoadCrossState> {
  const factor = typeof params.speed === 'number' ? Math.min(1.5, Math.max(0.6, params.speed)) : 1;
  const events = eventQueue();
  const rowH = Math.min(92, (arena.height - HUD_SAFE_TOP - 20) / LAYOUT.length);
  const band = rowH * LAYOUT.length;
  const lanes = LAYOUT.map((kind, i) => makeLane(kind, i, arena.width, rng));
  for (const lane of lanes) lane.speed *= factor;
  const state: RoadCrossState = {
    lanes,
    rowH,
    bottomY: Math.min(arena.height - 10, HUD_SAFE_TOP + 20 + band + (arena.height - HUD_SAFE_TOP - 30 - band) / 2),
    width: arena.width,
    frogRow: 0,
    frogX: arena.width / 2,
    hop: -1,
    hopFromRow: 0,
    hopFromX: arena.width / 2,
    homeAgo: 9,
    splashAgo: 9,
    bumpAgo: 9,
    score: 0,
    time: 0,
  };
  const top = LAYOUT.length - 1;

  function hop(dRow: number, dx: number): void {
    if (state.hop >= 0) return;
    const row = Math.min(top, Math.max(0, state.frogRow + dRow));
    const x = Math.min(arena.width - 30, Math.max(30, state.frogX + dx));
    if (row === state.frogRow && x === state.frogX) return;
    state.hop = 0;
    state.hopFromRow = state.frogRow;
    state.hopFromX = state.frogX;
    state.frogRow = row;
    state.frogX = x;
    events.push({ type: 'action', x: state.hopFromX, y: rowY(state, state.hopFromRow) });
  }

  function sendBack(row: number): void {
    state.frogRow = row;
    state.hop = -1;
    if (row === 0) state.frogX = arena.width / 2;
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
      state.homeAgo += dt;
      state.splashAgo += dt;
      state.bumpAgo += dt;
      for (const tap of input.taps) if (tap.y > HUD_SAFE_TOP) hop(1, 0);
      for (const swipe of input.swipes) {
        if (swipe.direction === 'up') hop(1, 0);
        else if (swipe.direction === 'down') hop(-1, 0);
        else hop(0, swipe.direction === 'left' ? -STEP_X : STEP_X);
      }
      for (const lane of state.lanes) for (const thing of lane.things) thing.x = thingX(state, lane, thing, dt);
      if (state.hop >= 0) {
        state.hop += dt;
        if (state.hop < HOP_SECONDS) return;
        state.hop = -1;
        if (state.frogRow === top) {
          state.score += 1;
          state.homeAgo = 0;
          events.push({ type: 'score', x: state.frogX, y: rowY(state, top) });
          sendBack(0);
          return;
        }
      }
      const lane = state.lanes[state.frogRow];
      if (!lane) return;
      if (lane.kind === 'river') {
        state.frogX += lane.speed * dt;
        if (!safeAt(state, state.frogRow, state.frogX, 0)) {
          state.splashAgo = 0;
          events.push({ type: 'hit', x: state.frogX, y: rowY(state, state.frogRow) });
          state.frogX = Math.min(arena.width - 30, Math.max(30, state.frogX));
          sendBack(MEDIAN);
        }
      } else if (lane.kind === 'road' && !safeAt(state, state.frogRow, state.frogX, 0)) {
        state.bumpAgo = 0;
        events.push({ type: 'hit', x: state.frogX, y: rowY(state, state.frogRow) });
        sendBack(0);
      }
    },
  };
}

/** Good play: hop forward when the next row is safe on landing; else wait, or step aside if waiting is not safe. */
export function roadCrossBot(state: RoadCrossState, context: BotContext): BotMove {
  if (state.hop >= 0) return {};
  const from = { x: context.arena.width / 2, y: context.arena.height * 0.75 };
  const row = state.frogRow;
  const hold = 0.3;
  const ahead = state.lanes[row + 1];
  const forwardHold = ahead?.kind === 'river' ? 0.25 : hold;
  if (safeAt(state, row + 1, state.frogX, HOP_SECONDS, forwardHold)) return { tap: { x: from.x, y: from.y } };
  const current = state.lanes[row];
  const drift = current?.kind === 'river' ? current.speed * 0.1 : 0;
  if (safeAt(state, row, state.frogX + drift, 0, hold)) {
    // Waiting is fine: on a river row, step toward the middle of the screen so the raft does not carry it off.
    if (current?.kind === 'river' && Math.abs(state.frogX - context.arena.width / 2) > context.arena.width * 0.3) {
      const dx = state.frogX > context.arena.width / 2 ? -STEP_X : STEP_X;
      if (safeAt(state, row, state.frogX + dx, HOP_SECONDS, 0.2)) return { swipe: { from, dx: Math.sign(dx) * 140, dy: 0 } };
    }
    return {};
  }
  for (const [dRow, dx] of [[0, -STEP_X], [0, STEP_X], [-1, 0]] as const) {
    if (safeAt(state, row + dRow, state.frogX + dx, HOP_SECONDS, 0.2)) return { swipe: { from, dx: Math.sign(dx) * 140, dy: dRow === 0 ? 0 : 140 } };
  }
  return {};
}
