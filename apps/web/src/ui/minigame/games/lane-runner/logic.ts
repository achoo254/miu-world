// Lane runner: the child runs on her own down a three-lane path that rolls toward her from the horizon.
// Swipe left or right (or tap that side) to change lane, swipe up to jump. Stars score; a log lying across
// a lane can be jumped, a crate or a rock must be stepped around. Three bumps end the run early (the stars
// stay). There is always a lane without a crate or rock. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export type ItemKind = 'star' | 'log' | 'crate' | 'rock';

export interface LaneItem {
  kind: ItemKind;
  lane: number;
  /** Distance ahead: 1 at the horizon, 0 at the child's feet. */
  z: number;
  /** Seconds since picked up or bumped (-1 while on the path). */
  hit: number;
}

export interface LaneRunnerState {
  horizonY: number;
  feetY: number;
  /** Half the path's width at the child's feet. */
  halfWidth: number;
  centreX: number;
  lane: number;
  /** Drawn lane position (eases toward `lane`). */
  laneX: number;
  /** Seconds into the current jump (-1 on the ground). */
  jump: number;
  invulnerable: number;
  items: LaneItem[];
  /** Path distance run, for the rolling stripes. */
  travelled: number;
  speed: number;
  lives: number;
  score: number;
  time: number;
}

export const LANES = 3;
export const JUMP_SECONDS = 0.55;
/** A jump asked for just before landing happens on landing: an early swipe is never lost. */
const JUMP_BUFFER = 0.2;
/** An item meets the child when it is this close. */
const MEET = 0.035;
const SPEED_START = 0.42;
const SPEED_END = 0.62;
const ROW_GAP = 0.3;
const INVULNERABLE = 1.2;
const LIVES = 3;
/** How strongly the path narrows toward the horizon. */
export const DEPTH = 3.2;

/** Screen scale of something at distance z (1 at the feet). */
export const scaleAt = (z: number): number => 1 / (1 + DEPTH * z);

export function screenY(state: LaneRunnerState, z: number): number {
  const far = scaleAt(1);
  return state.horizonY + (state.feetY - state.horizonY) * ((scaleAt(z) - far) / (1 - far));
}

export function laneOffset(state: LaneRunnerState, lane: number): number {
  return ((lane - 1) * state.halfWidth * 2) / LANES;
}

function layRow(state: LaneRunnerState, rng: Rng, progress: number): void {
  const roll = rng.next();
  const free = rng.int(0, LANES - 1);
  if (roll < 0.3) {
    // A line of stars in one lane.
    for (let i = 0; i < 3; i += 1) state.items.push({ kind: 'star', lane: free, z: 1 + i * 0.08, hit: -1 });
    return;
  }
  if (roll < 0.55) {
    // A log across one or two lanes, stars over it for a jump.
    const lane = rng.int(0, LANES - 1);
    state.items.push({ kind: 'log', lane, z: 1, hit: -1 });
    if (progress > 0.3 && rng.chance(0.5)) state.items.push({ kind: 'log', lane: (lane + 1) % LANES, z: 1, hit: -1 });
    state.items.push({ kind: 'star', lane, z: 1.05, hit: -1 });
    return;
  }
  // Crates and rocks in every lane but the free one, where stars wait.
  const blocked = progress > 0.4 && rng.chance(0.5) ? 2 : 1;
  const lanes = [0, 1, 2].filter((l) => l !== free);
  for (let i = 0; i < blocked; i += 1) {
    const lane = lanes.splice(rng.int(0, lanes.length - 1), 1)[0];
    if (lane !== undefined) state.items.push({ kind: rng.chance(0.5) ? 'crate' : 'rock', lane, z: 1, hit: -1 });
  }
  state.items.push({ kind: 'star', lane: free, z: 1, hit: -1 }, { kind: 'star', lane: free, z: 1.08, hit: -1 });
}

export function createLaneRunner({ arena, duration, params, rng }: GameSetup): MinigameLogic<LaneRunnerState> {
  const factor = typeof params.speed === 'number' ? Math.min(1.5, Math.max(0.6, params.speed)) : 1;
  const events = eventQueue();
  const state: LaneRunnerState = {
    horizonY: HUD_SAFE_TOP + 40,
    feetY: arena.height - 100,
    halfWidth: Math.min(arena.width * 0.42, 300),
    centreX: arena.width / 2,
    lane: 1,
    laneX: 1,
    jump: -1,
    invulnerable: 0,
    items: [],
    travelled: 0,
    speed: SPEED_START * factor,
    lives: LIVES,
    score: 0,
    time: 0,
  };
  let nextRow = 0.35;

  const move = (dir: number): void => {
    const lane = Math.min(LANES - 1, Math.max(0, state.lane + dir));
    if (lane !== state.lane) {
      state.lane = lane;
      events.push({ type: 'action', x: state.centreX + laneOffset(state, lane), y: state.feetY });
    }
  };
  let jumpBuffered = -1;
  const jump = (): void => {
    if (state.jump >= 0) {
      jumpBuffered = JUMP_BUFFER;
      return;
    }
    state.jump = 0;
    events.push({ type: 'action', x: state.centreX + laneOffset(state, state.lane), y: state.feetY });
  };

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
      const progress = Math.min(1, state.time / duration);
      state.speed = (SPEED_START + (SPEED_END - SPEED_START) * progress) * factor;
      for (const swipe of input.swipes) {
        if (swipe.direction === 'left') move(-1);
        else if (swipe.direction === 'right') move(1);
        else if (swipe.direction === 'up') jump();
      }
      for (const tap of input.taps) if (tap.y > HUD_SAFE_TOP) move(tap.x < state.centreX ? -1 : 1);

      state.laneX += (state.lane - state.laneX) * Math.min(1, dt * 14);
      if (state.jump >= 0) {
        state.jump += dt;
        if (state.jump >= JUMP_SECONDS) {
          state.jump = -1;
          if (jumpBuffered > 0) jump();
        }
      }
      jumpBuffered -= dt;
      state.invulnerable = Math.max(0, state.invulnerable - dt);

      const dz = state.speed * dt;
      state.travelled += dz;
      nextRow -= dz;
      if (nextRow <= 0) {
        layRow(state, rng, progress);
        nextRow += ROW_GAP;
      }
      const x = state.centreX + laneOffset(state, state.lane);
      for (const item of state.items) {
        if (item.hit >= 0) {
          item.hit += dt;
          continue;
        }
        item.z -= dz;
        if (item.z > MEET || item.z < -MEET || item.lane !== state.lane) continue;
        if (item.kind === 'star') {
          item.hit = 0;
          state.score += 1;
          events.push({ type: 'score', x, y: state.feetY - 60 });
        } else if (state.invulnerable <= 0 && !(item.kind === 'log' && state.jump >= 0)) {
          item.hit = 0;
          state.lives -= 1;
          state.invulnerable = INVULNERABLE;
          events.push({ type: 'hit', x, y: state.feetY - 30 });
        }
      }
      state.items = state.items.filter((i) => i.z > -0.15 && i.hit < 0.4);
    },
  };
}

/** Good play: keep to a lane with no crate or rock coming, prefer stars, jump logs. */
export function laneRunnerBot(state: LaneRunnerState, context: BotContext): BotMove {
  const ahead = (lane: number, kinds: readonly ItemKind[], within: number): boolean =>
    state.items.some((i) => i.hit < 0 && i.lane === lane && kinds.includes(i.kind) && i.z > -0.045 && i.z < within);
  const centre = { x: context.arena.width / 2, y: context.arena.height * 0.7 };
  const danger = (lane: number): boolean => ahead(lane, ['crate', 'rock'], 0.45);
  const stars = (lane: number): number => state.items.filter((i) => i.hit < 0 && i.lane === lane && i.kind === 'star' && i.z > 0 && i.z < 0.5).length;
  // A log right ahead: jump first.
  if (ahead(state.lane, ['log'], 0.1) && (state.jump < 0 || state.jump > JUMP_SECONDS - 0.15)) return { swipe: { from: centre, dx: 0, dy: -150 } };
  // Which lane to be in: safe first, then the most stars, then the nearest. Crossing the middle lane needs it
  // clear for a moment.
  const reachable = (lane: number): boolean => Math.abs(lane - state.lane) <= 1 || !ahead(1, ['crate', 'rock'], 0.15);
  const best = [0, 1, 2]
    .filter((l) => !danger(l) && reachable(l))
    .sort((a, b) => stars(b) - stars(a) || Math.abs(a - state.lane) - Math.abs(b - state.lane))[0];
  if (best !== undefined && best !== state.lane) return { swipe: { from: centre, dx: best < state.lane ? -150 : 150, dy: 0 } };
  return {};
}
