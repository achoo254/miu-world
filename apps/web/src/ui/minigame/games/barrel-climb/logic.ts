// Barrel climb (leo kho thóc): wooden floors zigzag up the rice barn with a ladder at alternate ends. The
// child runs along each floor by herself and waits at the foot of the ladder; a flick up climbs it. From the
// top floor the monkey rolls rice sacks down: they roll along each floor, drop off its end to the floor
// below and come rolling at her. A tap jumps over a sack; a sack that hits her sits her down for a second
// (nothing else lost). Each ladder climbed is a point and reaching the top three more; then she starts again
// at the bottom. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

/** Floors the child runs on (the monkey's floor is one more above). */
export const FLOORS = 4;

export interface Sack {
  id: number;
  floor: number;
  x: number;
  dir: number;
  /** Seconds left of a drop to the floor below (0 when rolling). */
  dropping: number;
  /** It already rolled past (or over) the child. */
  passed: boolean;
}

export interface BarrelState {
  floorY: number[];
  /** The ladder from each floor to the next. */
  ladderX: number[];
  edgeL: number;
  edgeR: number;
  child: { floor: number; x: number; jump: number; climb: number; stunned: number };
  sacks: Sack[];
  monkeyX: number;
  /** Units per second the child runs and the sacks roll. */
  runSpeed: number;
  sackSpeed: number;
  /** Seconds since the top was reached (a cheer), large otherwise. */
  toppedAgo: number;
  tops: number;
  score: number;
  time: number;
}

export const JUMP_SECONDS = 0.6;
const JUMP_HEIGHT = 70;
const CLIMB_SECONDS = 0.8;
const STUN_SECONDS = 1;
const DROP_SECONDS = 0.35;
const HIT_REACH = 34;
const TOP_BONUS = 3;

/** Way the child runs on a floor (toward its ladder): right on even floors, left on odd ones. */
export const runDir = (floor: number): number => (floor % 2 === 0 ? 1 : -1);

export const jumpHeight = (jump: number): number => (jump > 0 ? Math.sin((1 - jump / JUMP_SECONDS) * Math.PI) * JUMP_HEIGHT : 0);

export function createBarrelClimb({ arena, duration, rng }: GameSetup): MinigameLogic<BarrelState> {
  const events = eventQueue();
  const groundY = arena.height - 40;
  const topY = HUD_SAFE_TOP + 90;
  const gap = (groundY - topY) / FLOORS;
  const edgeL = 40;
  const edgeR = arena.width - 40;
  // A floor takes about the same time to run on every screen.
  const runSpeed = Math.max(120, arena.width * 0.2);
  const sackSpeed = runSpeed * 1.2;
  const state: BarrelState = {
    runSpeed,
    sackSpeed,
    floorY: Array.from({ length: FLOORS + 1 }, (_, i) => groundY - i * gap),
    ladderX: Array.from({ length: FLOORS }, (_, i) => (runDir(i) > 0 ? edgeR - 90 : edgeL + 90)),
    edgeL,
    edgeR,
    child: { floor: 0, x: edgeL + 40, jump: 0, climb: 0, stunned: 0 },
    sacks: [],
    monkeyX: edgeL + 70,
    toppedAgo: 9,
    tops: 0,
    score: 0,
    time: 0,
  };
  let nextId = 0;
  let rollIn = 1.5;

  function roll(): void {
    // From the top floor's end, down onto the highest floor the child runs on.
    const floor = FLOORS - 1;
    const dir = -runDir(floor);
    state.sacks.push({ id: (nextId += 1), floor, x: dir > 0 ? edgeL : edgeR, dir, dropping: DROP_SECONDS, passed: false });
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
      state.toppedAgo += dt;
      const c = state.child;
      rollIn -= dt;
      if (rollIn <= 0) {
        roll();
        rollIn = (2.4 - Math.min(1, state.time / duration) * 0.8) * rng.range(0.8, 1.2);
      }
      const ladder = state.ladderX[c.floor] ?? edgeR;
      const atLadder = c.climb === 0 && Math.abs(c.x - ladder) < 2;
      if (c.climb > 0) {
        c.climb -= dt;
        if (c.climb <= 0) {
          c.climb = 0;
          c.floor += 1;
          state.score += 1;
          events.push({ type: 'score', x: c.x, y: state.floorY[c.floor] ?? 0 });
          if (c.floor >= FLOORS) {
            state.score += TOP_BONUS;
            state.tops += 1;
            state.toppedAgo = 0;
            events.push({ type: 'score', x: c.x, y: (state.floorY[FLOORS] ?? 0) - 40, points: TOP_BONUS, note: 84, voice: 'bell' });
            c.floor = 0;
            c.x = edgeL + 40;
          }
        }
      } else if (c.stunned > 0) {
        c.stunned -= dt;
      } else {
        if (input.swipes.some((s) => s.dy < 0 && Math.abs(s.dy) > Math.abs(s.dx)) && atLadder && c.jump === 0) {
          c.climb = CLIMB_SECONDS;
          events.push({ type: 'action', x: c.x, y: state.floorY[c.floor] ?? 0 });
        } else if (input.taps.length > 0 && c.jump === 0) {
          c.jump = JUMP_SECONDS;
          events.push({ type: 'action', x: c.x, y: state.floorY[c.floor] ?? 0 });
        }
        // Run toward the ladder and wait there.
        const step = runSpeed * dt;
        c.x += Math.max(-step, Math.min(step, ladder - c.x));
      }
      if (c.jump > 0) c.jump = Math.max(0, c.jump - dt);

      for (const s of state.sacks) {
        if (s.dropping > 0) {
          s.dropping -= dt;
          continue;
        }
        s.x += s.dir * sackSpeed * dt;
        if (s.x < edgeL - 10 || s.x > edgeR + 10) {
          // Off the end: down to the floor below.
          s.floor -= 1;
          s.dir = -s.dir;
          s.dropping = DROP_SECONDS;
          s.passed = false;
          continue;
        }
        if (!s.passed && s.floor === c.floor && c.climb === 0 && Math.abs(s.x - c.x) < HIT_REACH) {
          s.passed = true;
          if (jumpHeight(c.jump) < 36) {
            c.stunned = STUN_SECONDS;
            c.jump = 0;
            events.push({ type: 'hit', x: c.x, y: state.floorY[c.floor] ?? 0 });
          }
        }
      }
      state.sacks = state.sacks.filter((s) => s.floor >= 0);
      state.monkeyX = edgeL + 70 + Math.sin(state.time * 1.5) * 20;
    },
  };
}

/** Good play: jumps a sack about to reach her, and climbs when no sack is near the ladder. */
export function barrelClimbBot(state: BarrelState, _context: BotContext): BotMove {
  const c = state.child;
  if (c.climb > 0 || c.stunned > 0) return {};
  const coming = state.sacks.filter((s) => s.floor === c.floor && s.dropping <= 0 && !s.passed);
  // Time until each sack meets her (both may be moving).
  const meet = coming.map((s) => {
    const gap = (c.x - s.x) * s.dir;
    return gap < 0 ? Infinity : gap / (state.sackSpeed + state.runSpeed * 0.5);
  });
  const soonest = Math.min(Infinity, ...meet);
  if (soonest < 0.3 && c.jump === 0) return { tap: { x: c.x, y: state.floorY[c.floor] ?? 0 } };
  const ladder = state.ladderX[c.floor] ?? 0;
  const dropping = state.sacks.some((s) => s.floor === c.floor && s.dropping > 0);
  if (Math.abs(c.x - ladder) < 2 && soonest > 1 && !dropping && c.jump === 0) return { swipe: { from: { x: c.x, y: 400 }, dx: 0, dy: -120 } };
  return {};
}
