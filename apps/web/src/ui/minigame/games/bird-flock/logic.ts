// Bird flock: the child drags up and down to lead the first bird; six more follow in a V, each flying where
// the leader was a moment earlier. Cloud rings drift in from the right: flying the leader through one with at
// least five birds still in the flock is a point. Storm clouds sit off the way between rings; a bird that
// touches one gets lost and comes back to the flock three seconds later. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const FOLLOWERS = 6;
export const NEED = 5;
const LAG = 0.12;
const SPACING = 46;
const SCROLL = 170;
const LEAD_SPEED = 620;
const RING_GAP = 430;
export const RING_REACH = 62;
const STORM_RADIUS = 52;
const STORM_CLEAR = 150;
const LOST_SECONDS = 3;

export interface Ring {
  x: number;
  y: number;
  passed: boolean | null;
}

export interface Storm {
  x: number;
  y: number;
}

export interface FlockState {
  leadX: number;
  leadY: number;
  /** Leader's recent heights, newest first, one per step (for the followers). */
  trail: number[];
  /** Seconds each follower is still lost (0 = in the flock). */
  lost: number[];
  rings: Ring[];
  storms: Storm[];
  top: number;
  bottom: number;
  score: number;
  time: number;
}

export function followerPoint(state: FlockState, k: number): Point {
  const back = Math.round(((k + 1) * LAG) / (1 / 60));
  const y = state.trail[Math.min(back, state.trail.length - 1)] ?? state.leadY;
  const side = k % 2 === 0 ? -1 : 1;
  return { x: state.leadX - (k + 1) * SPACING * 0.75, y: y + side * 18 * Math.ceil((k + 1) / 2) };
}

export const flockSize = (state: FlockState): number => 1 + state.lost.filter((l) => l <= 0).length;

export function createBirdFlock({ arena, params, rng }: GameSetup): MinigameLogic<FlockState> {
  const factor = typeof params.speed === 'number' ? Math.min(1.4, Math.max(0.7, params.speed)) : 1;
  const events = eventQueue();
  const top = HUD_SAFE_TOP + 70;
  const bottom = arena.height - 60;
  const leadX = Math.max(260, arena.width * 0.38);
  const state: FlockState = { leadX, leadY: (top + bottom) / 2, trail: [], lost: Array.from({ length: FOLLOWERS }, () => 0), rings: [], storms: [], top, bottom, score: 0, time: 0 };

  function addRing(r: Rng, x: number): void {
    const prev = state.rings[state.rings.length - 1];
    const y = r.range(top + 30, bottom - 30);
    state.rings.push({ x, y, passed: null });
    if (!prev) return;
    // A storm between the two rings, well off the way from one to the other.
    if (r.chance(0.8)) {
      const sx = (prev.x + x) / 2 + r.range(-60, 60);
      const lineY = prev.y + ((sx - prev.x) / (x - prev.x)) * (y - prev.y);
      const above = lineY - STORM_CLEAR - STORM_RADIUS;
      const below = lineY + STORM_CLEAR + STORM_RADIUS;
      const options = [above >= top - 20 ? above - r.range(0, 80) : null, below <= bottom + 20 ? below + r.range(0, 80) : null].filter((v): v is number => v !== null);
      const sy = options[r.int(0, options.length - 1)];
      if (sy !== undefined) state.storms.push({ x: sx, y: sy });
    }
  }

  for (let x = arena.width + 120; x < arena.width + 120 + RING_GAP * 4; x += RING_GAP) addRing(rng, x);

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
      const target = input.pointer?.y;
      if (target !== undefined) {
        const goal = Math.min(bottom, Math.max(top, target));
        const stepMax = LEAD_SPEED * dt;
        state.leadY += Math.max(-stepMax, Math.min(stepMax, goal - state.leadY));
      }
      state.trail.unshift(state.leadY);
      if (state.trail.length > 120) state.trail.length = 120;
      const move = SCROLL * factor * dt;
      for (const r of state.rings) {
        r.x -= move;
        if (r.passed === null && r.x <= leadX) {
          const through = Math.abs(state.leadY - r.y) <= RING_REACH;
          r.passed = through && flockSize(state) >= NEED;
          if (r.passed) {
            state.score += 1;
            events.push({ type: 'score', x: r.x, y: r.y, note: 76, voice: 'whistle' });
          } else events.push({ type: 'miss', x: r.x, y: r.y });
        }
      }
      for (const s of state.storms) s.x -= move;
      state.lost = state.lost.map((l) => Math.max(0, l - dt));
      state.lost.forEach((l, k) => {
        if (l > 0) return;
        const p = followerPoint(state, k);
        if (state.storms.some((s) => Math.hypot(s.x - p.x, s.y - p.y) <= STORM_RADIUS + 14)) {
          state.lost[k] = LOST_SECONDS;
          events.push({ type: 'hit', x: p.x, y: p.y });
        }
      });
      state.rings = state.rings.filter((r) => r.x > -100);
      state.storms = state.storms.filter((s) => s.x > -100);
      const last = state.rings[state.rings.length - 1];
      if (last && last.x < arena.width + 120 + RING_GAP * 2) addRing(rng, last.x + RING_GAP);
    },
  };
}

/** Good play: flies the straight way from ring to ring, which the storms keep clear of. */
export function birdFlockBot(state: FlockState, _context: BotContext): BotMove {
  const next = state.rings.find((r) => r.passed === null && r.x >= state.leadX);
  const prevIndex = next ? state.rings.indexOf(next) - 1 : -1;
  const prev = state.rings[prevIndex];
  if (!next) return { touch: { x: state.leadX, y: state.leadY } };
  if (!prev || prev.x >= state.leadX) return { touch: { x: state.leadX, y: next.y } };
  // Aim a little ahead on the line, as the flock lags behind.
  const x = state.leadX + 25;
  const y = prev.y + ((x - prev.x) / (next.x - prev.x)) * (next.y - prev.y);
  return { touch: { x: state.leadX, y } };
}
