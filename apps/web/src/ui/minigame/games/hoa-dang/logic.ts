// Hoa đăng (floating lanterns): the child kneels on the near bank of an evening river and taps along the bank
// to set a lantern on the water there. The current carries it straight up the river, across lanes where boats
// and clumps of water hyacinth drift sideways. A lantern that slips through the gaps to the far bend is a point;
// one that bumps into something goes out gently (nothing is lost). A new lantern is ready a moment after each
// release. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export interface Drifter {
  /** Centre along its lane (wraps around). */
  x: number;
  w: number;
  kind: 'boat' | 'hyacinth';
}

export interface Lane {
  y: number;
  speed: number;
  drifters: Drifter[];
}

export interface Lantern {
  x: number;
  y: number;
  /** Seconds since it went out, or -1 while lit; seconds since it arrived, or -1. */
  out: number;
  arrived: number;
}

export interface HoaDangState {
  lanes: Lane[];
  lanterns: Lantern[];
  bankY: number;
  bendY: number;
  /** Seconds before the next lantern is ready. */
  ready: number;
  wrap: number;
  score: number;
  time: number;
}

export const LANTERN_SPEED = 160;
export const LANTERN_R = 24;
const LANE_HALF = 32;
const READY_SECONDS = 1.0;

/** Where a drifter's centre is after `t` more seconds (lanes wrap). */
export function driftX(d: Drifter, lane: Lane, t: number, wrap: number): number {
  return ((((d.x + lane.speed * t + 150) % wrap) + wrap) % wrap) - 150;
}

/** Whether a lantern set on the water at `x` now would pass every lane. */
export function clearPath(state: HoaDangState, x: number): boolean {
  for (const lane of state.lanes) {
    const t = (state.bankY - lane.y) / LANTERN_SPEED;
    // It spends LANE_HALF*2 of its path in the lane; check the entry, middle and exit.
    for (const dt of [-0.2, 0, 0.2]) {
      for (const d of lane.drifters) {
        if (Math.abs(driftX(d, lane, t + dt, state.wrap) - x) < d.w / 2 + LANTERN_R) return false;
      }
    }
  }
  return true;
}

export function createHoaDang({ arena, params, rng }: GameSetup): MinigameLogic<HoaDangState> {
  const pace = typeof params.speed === 'number' ? Math.min(1.4, Math.max(0.6, params.speed)) : 1;
  const events = eventQueue();
  const bankY = arena.height - 80;
  const bendY = HUD_SAFE_TOP + 40;
  const wrap = arena.width + 300;
  const laneCount = 3;
  const lanes: Lane[] = Array.from({ length: laneCount }, (_, i) => {
    const y = bendY + 70 + ((bankY - bendY - 140) * (i + 0.5)) / laneCount;
    const speed = (i % 2 === 0 ? 1 : -1) * rng.range(55, 95) * pace;
    const drifters: Drifter[] = [];
    let x = rng.range(0, 120);
    while (x < wrap - 200) {
      const kind = rng.chance(0.5) ? 'boat' : 'hyacinth';
      const w = kind === 'boat' ? 150 : 100;
      drifters.push({ x: x + w / 2, w, kind });
      x += w + rng.range(150, 260);
    }
    return { y, speed, drifters };
  });
  const state: HoaDangState = { lanes, lanterns: [], bankY, bendY, ready: 0.5, wrap, score: 0, time: 0 };

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
      state.ready = Math.max(0, state.ready - dt);
      for (const lane of state.lanes) for (const d of lane.drifters) d.x = driftX(d, lane, dt, wrap);
      for (const l of state.lanterns) {
        if (l.out >= 0) {
          l.out += dt;
          continue;
        }
        if (l.arrived >= 0) {
          l.arrived += dt;
          continue;
        }
        l.y -= LANTERN_SPEED * dt;
        for (const lane of state.lanes) {
          if (Math.abs(l.y - lane.y) > LANE_HALF) continue;
          if (lane.drifters.some((d) => Math.abs(d.x - l.x) < d.w / 2 + LANTERN_R * 0.8)) {
            l.out = 0;
            events.push({ type: 'miss', x: l.x, y: l.y });
          }
        }
        if (l.out < 0 && l.y <= bendY) {
          l.arrived = 0;
          state.score += 1;
          events.push({ type: 'score', x: l.x, y: l.y, note: 72 + (state.score % 5) * 2, voice: 'bell' });
        }
      }
      state.lanterns = state.lanterns.filter((l) => l.out < 1 && l.arrived < 1.2);
      const tap = input.taps.find((t) => t.y > bankY - 140);
      if (tap && state.ready <= 0) {
        state.lanterns.push({ x: Math.min(arena.width - 40, Math.max(40, tap.x)), y: bankY, out: -1, arrived: -1 });
        state.ready = READY_SECONDS;
        events.push({ type: 'action', x: tap.x, y: bankY });
      }
    },
  };
}

/** Good play: looks along the bank for a spot whose path will be clear, nearest the middle. */
export function hoaDangBot(state: HoaDangState, context: BotContext): BotMove {
  if (state.ready > 0) return {};
  const w = context.arena.width;
  const spots: number[] = [];
  for (let x = 50; x <= w - 50; x += 30) spots.push(x);
  spots.sort((a, b) => Math.abs(a - w / 2) - Math.abs(b - w / 2));
  // The tap lands a step later; the lantern starts then.
  const ahead = { ...state, time: state.time };
  const x = spots.find((s) => clearPath(ahead, s));
  return x === undefined ? {} : { tap: { x, y: state.bankY } };
}
