// Goalkeeper: the child keeps goal. A friend runs up and shoots ten times; the ball flies toward the goal
// (later shots bend). Tapping anywhere sends the keeper there (a swipe throws her toward that side); a ball
// that reaches the line within her reach is saved (a point). After ten shots the round is over. Pure: no
// DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export type ShotPhase = 'runup' | 'flight' | 'result';

export interface Shot {
  fromX: number;
  fromY: number;
  toX: number;
  /** Sideways bend at mid-flight (units). */
  bend: number;
  flight: number;
  t: number;
  x: number;
  y: number;
  saved: boolean;
}

export interface GoalkeeperState {
  goalX: number;
  goalHalf: number;
  goalLine: number;
  kickerX: number;
  kickerY: number;
  keeperX: number;
  /** Where the keeper is going (null: standing). */
  keeperTo: number | null;
  shot: Shot;
  phase: ShotPhase;
  phaseAgo: number;
  shots: number;
  score: number;
  time: number;
}

export const SHOTS = 10;
/** Half the width the keeper covers with her gloves. */
export const REACH = 72;
const KEEPER_SPEED = 950;
const RUNUP_SECONDS = 1.0;
const RESULT_SECONDS = 1.0;

/** A shot's x at progress p (0–1): a straight line, bent sideways in the middle. */
export const shotX = (shot: Shot, p: number): number => shot.fromX + (shot.toX - shot.fromX) * p + shot.bend * Math.sin(Math.PI * p);

export function createGoalkeeper({ arena, params, rng }: GameSetup): MinigameLogic<GoalkeeperState> {
  const factor = typeof params.speed === 'number' ? Math.min(1.5, Math.max(0.6, params.speed)) : 1;
  const events = eventQueue();
  const goalHalf = Math.min(arena.width * 0.4, 290);
  const goalLine = arena.height - 110;
  const kickerY = HUD_SAFE_TOP + Math.min(130, (goalLine - HUD_SAFE_TOP) * 0.25);
  const state: GoalkeeperState = {
    goalX: arena.width / 2,
    goalHalf,
    goalLine,
    kickerX: arena.width / 2,
    kickerY,
    keeperX: arena.width / 2,
    keeperTo: null,
    shot: { fromX: 0, fromY: 0, toX: 0, bend: 0, flight: 1, t: 0, x: arena.width / 2, y: kickerY, saved: false },
    phase: 'runup',
    phaseAgo: 0,
    shots: 0,
    score: 0,
    time: 0,
  };

  function aim(): void {
    const n = state.shots;
    // Mostly toward a side; now and then the middle, where standing still would save it.
    const side = rng.chance(0.5) ? -1 : 1;
    const toX = rng.chance(0.15) ? state.goalX + rng.range(-40, 40) : state.goalX + side * rng.range(goalHalf * 0.4, goalHalf - 30);
    state.kickerX = state.goalX + rng.range(-goalHalf * 0.3, goalHalf * 0.3);
    state.shot = {
      fromX: state.kickerX,
      fromY: kickerY + 40,
      toX,
      bend: n >= 4 ? rng.range(-90, 90) : 0,
      flight: Math.max(0.75, 1.05 - n * 0.03) / factor,
      t: 0,
      x: state.kickerX,
      y: kickerY + 40,
      saved: false,
    };
  }
  aim();

  const clampX = (x: number): number => Math.min(state.goalX + goalHalf - 30, Math.max(state.goalX - goalHalf + 30, x));

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.shots >= SHOTS && state.phase === 'result' && state.phaseAgo >= RESULT_SECONDS * 0.8;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.phaseAgo += dt;
      // The keeper goes where she is told: a tap there, a swipe that way.
      const tap = input.taps.at(-1);
      if (tap) state.keeperTo = clampX(tap.x);
      for (const s of input.swipes) if (s.direction === 'left' || s.direction === 'right') state.keeperTo = clampX(s.from.x + s.dx * 1.6);
      if (state.keeperTo !== null) {
        const gap = state.keeperTo - state.keeperX;
        state.keeperX += Math.sign(gap) * Math.min(Math.abs(gap), KEEPER_SPEED * dt);
        if (Math.abs(gap) < 1) state.keeperTo = null;
      }

      const shot = state.shot;
      switch (state.phase) {
        case 'runup':
          if (state.phaseAgo >= RUNUP_SECONDS) {
            state.phase = 'flight';
            state.phaseAgo = 0;
            events.push({ type: 'action', x: shot.fromX, y: shot.fromY });
          }
          break;
        case 'flight': {
          shot.t = Math.min(shot.flight, shot.t + dt);
          const p = shot.t / shot.flight;
          shot.x = shotX(shot, p);
          shot.y = shot.fromY + (state.goalLine - shot.fromY) * p;
          if (p >= 1) {
            shot.saved = Math.abs(shot.x - state.keeperX) <= REACH + 20;
            state.shots += 1;
            state.phase = 'result';
            state.phaseAgo = 0;
            if (shot.saved) {
              state.score += 1;
              events.push({ type: 'score', x: shot.x, y: state.goalLine - 40 });
            } else events.push({ type: 'miss', x: shot.x, y: state.goalLine });
          }
          break;
        }
        case 'result':
          if (state.phaseAgo >= RESULT_SECONDS && state.shots < SHOTS) {
            state.phase = 'runup';
            state.phaseAgo = 0;
            aim();
          }
          break;
      }
    },
  };
}

/** Good play: once the ball has flown a moment, tap where its flight so far says it will cross the line. */
export function goalkeeperBot(state: GoalkeeperState, _context: BotContext): BotMove {
  const shot = state.shot;
  if (state.phase !== 'flight' || shot.t < 0.12) return {};
  // Seen so far: where it is and how fast it moves sideways; carried on to the line.
  const p = shot.t / shot.flight;
  const step = 0.02;
  const vx = (shotX(shot, Math.min(1, p + step)) - shot.x) / step;
  const guess = shot.x + vx * (1 - p);
  return { tap: { x: guess, y: state.goalLine } };
}
