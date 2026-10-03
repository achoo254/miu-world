// Rock climb: the child clings to a hold on a cliff. Holds within reach glow; tapping one climbs to it. Each
// row of holds higher is a metre, and the score is the highest metre reached (a slip never takes points
// away). Brown cracked holds crumble two seconds after she grabs them: still on one then, she slips down a
// hold. Now and then a rock tumbles down a column of the cliff (a "!" warns first); in its way, she slips too.
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export interface Hold {
  id: number;
  x: number;
  /** Height on the cliff (units, up is more) and its row (metres). */
  h: number;
  row: number;
  cracked: boolean;
  /** Seconds left before a grabbed cracked hold falls (-1 untouched); fallen holds are gone. */
  crumble: number;
  fallen: boolean;
}

export interface Rock {
  x: number;
  /** Seconds of warning left before it falls, then its height on the cliff while falling. */
  warn: number;
  h: number;
}

export interface ClimbState {
  holds: Hold[];
  /** The hold she is on, and the one she is moving from (tween). */
  on: number;
  from: number;
  move: number;
  /** Her height for the camera (follows her smoothly). */
  camera: number;
  /** Where on screen her hold is drawn. */
  anchorY: number;
  rocks: Rock[];
  /** Seconds since she last slipped (a shake). */
  slipAgo: number;
  best: number;
  score: number;
  time: number;
}

export const ROW = 115;
/** Holds within this distance (and not lower than half a row below) can be grabbed. */
export const REACH = 265;
export const HOLD_HIT = 50;
const MOVE_SECONDS = 0.22;
export const CRUMBLE_SECONDS = 2;
const ROCK_SPEED = 720;
const WARN_SECONDS = 1.1;
const ROCK_HALF = 52;

export function createRockClimb({ arena, rng }: GameSetup): MinigameLogic<ClimbState> {
  const events = eventQueue();
  const margin = 60;
  const holds: Hold[] = [];
  let nextId = 0;
  let topRow = -1;
  /** A chain of sound holds runs all the way up; the others sit beside it in the same row. */
  let chainX = arena.width / 2;
  const addRow = (r: Rng): void => {
    topRow += 1;
    const h = topRow * ROW;
    if (topRow > 0) chainX = Math.min(arena.width - margin, Math.max(margin, chainX + r.range(-170, 170)));
    const xs: number[] = [chainX];
    const extra = topRow === 0 ? 0 : r.int(1, 2);
    for (let k = 0; k < extra * 6 && xs.length < 1 + extra; k += 1) {
      const x = chainX + (r.chance(0.5) ? -1 : 1) * r.range(140, 240);
      if (x > margin && x < arena.width - margin && xs.every((o) => Math.abs(o - x) > 130)) xs.push(x);
    }
    xs.forEach((x, i) => {
      holds.push({ id: nextId, x, h, row: topRow, cracked: i > 0 && topRow > 1 && r.chance(0.4), crumble: -1, fallen: false });
      nextId += 1;
    });
  };
  for (let i = 0; i < 8; i += 1) addRow(rng);
  const anchorY = arena.height * 0.68;
  const state: ClimbState = { holds, on: 0, from: 0, move: 1, camera: 0, anchorY, rocks: [], slipAgo: 9, best: 0, score: 0, time: 0 };
  let nextRock = 4;

  const hold = (id: number): Hold | undefined => state.holds.find((x) => x.id === id);

  const slip = (): void => {
    const current = hold(state.on);
    if (!current) return;
    // Down to the nearest hold below that is still there.
    const below = state.holds.filter((x) => !x.fallen && x.h < current.h).sort((a, b) => Math.abs(a.x - current.x) + (current.h - a.h) * 2 - (Math.abs(b.x - current.x) + (current.h - b.h) * 2))[0];
    state.slipAgo = 0;
    events.push({ type: 'hit', x: current.x, y: anchorY });
    if (!below) return;
    state.from = state.on;
    state.on = below.id;
    state.move = 0;
  };

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
      state.slipAgo += dt;
      state.move = Math.min(1, state.move + dt / MOVE_SECONDS);
      const current = hold(state.on);
      if (!current) return;
      state.camera += (current.h - state.camera) * Math.min(1, dt * 6);

      const press = input.pressed ? (input.pointer ?? input.taps[0] ?? null) : null;
      if (press && state.move >= 1) {
        const target = state.holds.find((x) => !x.fallen && x.id !== current.id && Math.hypot(x.x - press.x, screenY(state, x) - press.y) <= HOLD_HIT && reachable(current, x));
        if (target) {
          state.from = current.id;
          state.on = target.id;
          state.move = 0;
          if (target.cracked && target.crumble < 0) target.crumble = CRUMBLE_SECONDS;
          events.push({ type: 'action', x: target.x, y: screenY(state, target) });
          if (target.row > state.best) {
            state.best = target.row;
            state.score = target.row;
            events.push({ type: 'score', x: target.x, y: screenY(state, target) - 50 });
          }
        }
      }
      while (topRow < state.best + 8) addRow(rng);

      // Cracked holds crumble.
      for (const x of state.holds) {
        if (x.crumble < 0 || x.fallen) continue;
        x.crumble -= dt;
        if (x.crumble <= 0) {
          x.fallen = true;
          if (x.id === state.on) slip();
        }
      }

      // Rocks: a warning over a column near her, then the rock tumbles down it.
      nextRock -= dt;
      if (nextRock <= 0) {
        const here = hold(state.on);
        state.rocks.push({ x: Math.min(arena.width - margin, Math.max(margin, (here?.x ?? arena.width / 2) + rng.range(-90, 90))), warn: WARN_SECONDS, h: 0 });
        nextRock = rng.range(3.5, 6);
      }
      for (const rock of state.rocks) {
        if (rock.warn > 0) {
          rock.warn -= dt;
          // Starts falling from above the top of the screen.
          if (rock.warn <= 0) rock.h = state.camera + (anchorY - HUD_SAFE_TOP) + 100;
          continue;
        }
        const before = rock.h;
        rock.h -= ROCK_SPEED * dt;
        const me = hold(state.on);
        if (me && state.move >= 0.5 && before > me.h && rock.h <= me.h + 40 && Math.abs(rock.x - me.x) < ROCK_HALF) {
          rock.h = -1e6;
          slip();
        }
      }
      state.rocks = state.rocks.filter((r) => r.warn > 0 || r.h > state.camera - anchorY - 200);
      // Holds far below are forgotten (in place: new rows are added to the same list).
      const keep = state.holds.filter((x) => x.h > state.camera - arena.height * 1.5 || x.id === state.on || x.id === state.from);
      if (keep.length < state.holds.length) state.holds.splice(0, state.holds.length, ...keep);
    },
  };
}

/** Where a hold is drawn on screen. */
export function screenY(state: ClimbState, x: { h: number }): number {
  return state.anchorY - (x.h - state.camera);
}

export const reachable = (from: Hold, to: Hold): boolean => !to.fallen && to.h >= from.h - ROW * 0.5 && Math.hypot(to.x - from.x, to.h - from.h) <= REACH;

/** Good play: the reachable hold that leads highest within two moves, out of any falling rock's way. */
export function rockClimbBot(state: ClimbState, _context: BotContext): BotMove {
  if (state.move < 1) return {};
  const current = state.holds.find((x) => x.id === state.on);
  if (!current) return {};
  const danger = (x: Hold): boolean => state.rocks.some((r) => Math.abs(r.x - x.x) < 80);
  const usable = state.holds.filter((x) => !x.fallen && !danger(x));
  const worth = (x: Hold): number => {
    const ahead = Math.max(x.h, ...usable.filter((y) => y.id !== x.id && reachable(x, y)).map((y) => y.h - (y.cracked ? 20 : 0)));
    return ahead + x.h * 0.01 - (x.cracked ? 30 : 0);
  };
  const options = usable.filter((x) => x.id !== current.id && reachable(current, x)).sort((a, b) => worth(b) - worth(a));
  const best = options[0];
  const mustMove = danger(current) || (current.cracked && current.crumble >= 0 && current.crumble < 0.8);
  if (!best || (!mustMove && worth(best) <= worth(current))) return {};
  return { tap: { x: best.x, y: screenY(state, best) } };
}
