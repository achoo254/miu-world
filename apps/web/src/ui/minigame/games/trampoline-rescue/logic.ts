// Trampoline rescue: friends leap from the windows of a building one after another. Each bounces three times
// across the street on the trampoline the firefighters hold, then flies into the fire engine: a friend
// saved. The child drags the trampoline to where the next friend comes down (a shadow on the ground shows
// where). A friend who misses lands on the air cushion and costs one of three hearts. Friends are only sent
// when every landing can be reached in time, so a quick child can always save them all. Pure: no DOM.
import { eventQueue } from '../../define-minigame';
import type { SpriteName } from '../../sprites';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export const JUMPERS: readonly SpriteName[] = ['rabbit', 'cat', 'panda', 'bear', 'fox', 'penguin', 'dog-face', 'turtle'];

export interface Jumper {
  sprite: SpriteName;
  /** Hop number: 0 from the window to the first spot, 3 from the last spot into the truck. */
  hop: number;
  /** Seconds into the current hop, and how long a hop takes for this friend. */
  t: number;
  hopTime: number;
  x: number;
  y: number;
  /** Seconds since it was saved or missed; -1 while in play. */
  ended: number;
  saved: boolean;
}

export interface TrampolineState {
  groundY: number;
  /** Height the trampoline catches at. */
  netY: number;
  netX: number;
  buildingRight: number;
  windowY: number;
  truckX: number;
  truckY: number;
  /** Where the three bounces happen, left to right. */
  spots: [number, number, number];
  jumpers: Jumper[];
  /** Seconds since the trampoline last bounced someone (a dip). */
  bounced: number;
  lives: number;
  score: number;
  time: number;
}

const LIVES = 3;
export const NET_HALF = 80;
/** A landing this close to the edge still bounces: wider than the picture. */
const CATCH_SLACK = 18;
export const NET_SPEED = 1500;
const HOP_START = 1.3;
const HOP_END = 0.95;
const GAP_START = 1.7;
const GAP_END = 1.05;
const HOP_HEIGHT = 230;

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** Where a hop starts and ends. */
function hopEnds(state: TrampolineState, hop: number): { x0: number; y0: number; x1: number; y1: number } {
  const from = hop === 0 ? { x: state.buildingRight - 10, y: state.windowY } : { x: state.spots[hop - 1] ?? 0, y: state.netY };
  const to = hop === 3 ? { x: state.truckX, y: state.truckY } : { x: state.spots[hop] ?? 0, y: state.netY };
  return { x0: from.x, y0: from.y, x1: to.x, y1: to.y };
}

/** The friend's position `t` seconds into hop `hop`: straight across, up and over in an arc. */
export function hopPosition(state: TrampolineState, hop: number, t: number, hopTime: number): { x: number; y: number } {
  const { x0, y0, x1, y1 } = hopEnds(state, hop);
  const u = clamp(t / hopTime, 0, 1);
  const lift = hop === 0 ? HOP_HEIGHT * 0.4 : HOP_HEIGHT;
  return { x: x0 + (x1 - x0) * u, y: y0 + (y1 - y0) * u - lift * 4 * u * (1 - u) };
}

/** When (round time) and where each friend still in the air lands on the trampoline line next. */
export function landings(state: TrampolineState): Array<{ at: number; x: number; jumper: Jumper }> {
  const out: Array<{ at: number; x: number; jumper: Jumper }> = [];
  for (const j of state.jumpers) {
    if (j.ended >= 0) continue;
    for (let hop = j.hop; hop < 3; hop += 1) out.push({ at: state.time + (hop - j.hop + 1) * j.hopTime - j.t, x: state.spots[hop] ?? 0, jumper: j });
  }
  return out.sort((a, b) => a.at - b.at);
}

export function createTrampolineRescue({ arena, duration, params, rng }: GameSetup): MinigameLogic<TrampolineState> {
  const factor = typeof params.speed === 'number' ? clamp(params.speed, 0.6, 1.5) : 1;
  const events = eventQueue();
  const groundY = Math.min(arena.height - 60, Math.max(HUD_SAFE_TOP + 500, arena.height / 2 + 250));
  const buildingRight = clamp(arena.width * 0.16, 90, 150);
  const truckWidth = 150;
  const left = buildingRight + 70;
  const right = arena.width - truckWidth - 60;
  const state: TrampolineState = {
    groundY,
    netY: groundY - 50,
    netX: arena.width / 2,
    buildingRight,
    windowY: groundY - 400,
    truckX: arena.width - truckWidth / 2 - 10,
    truckY: groundY - 70,
    spots: [left, (left + right) / 2, right],
    jumpers: [],
    bounced: 9,
    lives: LIVES,
    score: 0,
    time: 0,
  };
  let nextSpawn = 0.8;

  /** Whether a friend sent now with this hop time could be caught along with everyone already in the air. */
  function fair(hopTime: number): boolean {
    const planned = state.spots.map((x, hop) => ({ at: state.time + (hop + 1) * hopTime, x }));
    const all = [...landings(state), ...planned].sort((a, b) => a.at - b.at);
    for (let i = 1; i < all.length; i += 1) {
      const a = all[i - 1];
      const b = all[i];
      if (!a || !b) continue;
      const travel = Math.max(0, Math.abs(b.x - a.x) - NET_HALF) / NET_SPEED;
      if (b.at - a.at < travel + 0.18) return false;
    }
    return true;
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
      state.bounced += dt;
      const progress = Math.min(1, state.time / duration);

      const aim = input.pointer?.x ?? input.taps.at(-1)?.x;
      if (aim !== undefined) {
        const want = clamp(aim, state.buildingRight + NET_HALF * 0.6, state.truckX - truckWidth / 2);
        const move = NET_SPEED * dt;
        state.netX += clamp(want - state.netX, -move, move);
      }

      nextSpawn -= dt;
      if (nextSpawn <= 0) {
        const hopTime = (HOP_START + (HOP_END - HOP_START) * progress) / factor;
        if (fair(hopTime)) {
          state.jumpers.push({ sprite: rng.pick(JUMPERS as [SpriteName, ...SpriteName[]]), hop: 0, t: 0, hopTime, x: state.buildingRight, y: state.windowY, ended: -1, saved: false });
          nextSpawn = (GAP_START + (GAP_END - GAP_START) * progress) * rng.range(0.85, 1.25) / factor;
        } else nextSpawn = 0.1;
      }

      for (const j of state.jumpers) {
        if (j.ended >= 0) {
          j.ended += dt;
          if (!j.saved) j.y = Math.min(state.groundY - 20, j.y + 400 * dt);
          continue;
        }
        j.t += dt;
        if (j.t >= j.hopTime) {
          if (j.hop === 3) {
            j.ended = 0;
            j.saved = true;
            state.score += 1;
            events.push({ type: 'score', x: state.truckX, y: state.truckY - 40 });
            continue;
          }
          const spot = state.spots[j.hop] ?? 0;
          if (Math.abs(spot - state.netX) <= NET_HALF + CATCH_SLACK) {
            j.hop += 1;
            j.t -= j.hopTime;
            state.bounced = 0;
            events.push({ type: 'action', x: spot, y: state.netY });
          } else {
            j.ended = 0;
            j.x = spot;
            j.y = state.netY;
            state.lives -= 1;
            events.push({ type: 'hit', x: spot, y: state.groundY - 20 });
            continue;
          }
        }
        const p = hopPosition(state, j.hop, j.t, j.hopTime);
        j.x = p.x;
        j.y = p.y;
      }
      state.jumpers = state.jumpers.filter((j) => j.ended < 0.8);
    },
  };
}

/** Good play: be under the next landing. */
export function trampolineBot(state: TrampolineState, _context: BotContext): BotMove {
  const next = landings(state)[0];
  return { touch: { x: next?.x ?? state.netX, y: state.netY } };
}
