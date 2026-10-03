// Penalty kick: a keeper walks to and fro in front of the goal. The child swipes upward (anywhere on the
// lower half: no need to start on the ball) and the ball flies the way of the swipe; past the keeper and
// inside the posts is a goal. The keeper reacts to a shot a moment late and walks faster as the round goes
// on. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Swipe } from '../../types';

export type ShotResult = 'goal' | 'saved' | 'wide';

export interface Ball {
  x: number;
  y: number;
  /** Where it set off from and where it crosses the goal line. */
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  /** Seconds in flight so far, and the whole flight. */
  t: number;
  flight: number;
  result: ShotResult | null;
  /** Seconds since it reached the goal line (-1 before); the next ball comes after RESET_SECONDS. */
  after: number;
}

export interface PenaltyState {
  goalX: number;
  goalTop: number;
  goalLine: number;
  /** Half the goal's width (between the posts). */
  goalHalf: number;
  spotX: number;
  spotY: number;
  keeperX: number;
  keeperDir: number;
  /** Where the keeper is heading after a shot, and how long until it moves (its reaction). */
  keeperDive: number | null;
  keeperReact: number;
  /** The ball in flight, or null while it waits on the spot. */
  ball: Ball | null;
  score: number;
  shots: number;
  time: number;
  /** Seconds since the last shot's result, for the "VÀO!" banner. */
  resultAgo: number;
  lastResult: ShotResult | null;
}

/** Half the width the keeper covers, the ball's radius: a ball touching the keeper is saved. */
export const KEEPER_HALF = 58;
const BALL_RADIUS = 22;
const KEEPER_SPEED = 230;
const KEEPER_RAMP = 0.6;
const REACT_SECONDS = 0.22;
/** A keeper going for the ball moves this much faster than its walk. */
const DIVE_FACTOR = 2.2;
const RESET_SECONDS = 0.85;
/** A shot needs this much upward swipe (arena units) to count. */
const MIN_SHOT = 40;

function flightFor(swipe: Swipe): number {
  return Math.min(0.7, Math.max(0.42, 0.78 - swipe.speed / 5000));
}

export function createPenaltyKick({ arena, duration, params, rng }: GameSetup): MinigameLogic<PenaltyState> {
  const factor = typeof params.keeperSpeed === 'number' ? Math.min(1.8, Math.max(0.5, params.keeperSpeed)) : 1;
  const events = eventQueue();
  const goalHalf = Math.min(arena.width * 0.36, 300);
  const goalTop = HUD_SAFE_TOP + 40;
  const goalLine = goalTop + Math.min(210, arena.height * 0.3);
  const state: PenaltyState = {
    goalX: arena.width / 2,
    goalTop,
    goalLine,
    goalHalf,
    spotX: arena.width / 2,
    spotY: arena.height - 120,
    keeperX: arena.width / 2 + rng.range(-goalHalf * 0.5, goalHalf * 0.5),
    keeperDir: rng.chance(0.5) ? 1 : -1,
    keeperDive: null,
    keeperReact: 0,
    ball: null,
    score: 0,
    shots: 0,
    time: 0,
    resultAgo: 9,
    lastResult: null,
  };

  const keeperSpeed = (): number => KEEPER_SPEED * factor * (1 + KEEPER_RAMP * Math.min(1, state.time / duration));

  function shoot(swipe: Swipe): void {
    const rise = state.spotY - state.goalLine;
    // The swipe's direction, carried from the spot to the goal line.
    const toX = state.spotX + (swipe.dx / -swipe.dy) * rise;
    const flight = flightFor(swipe);
    state.ball = { x: state.spotX, y: state.spotY, fromX: state.spotX, fromY: state.spotY, toX, toY: state.goalLine - 30, t: 0, flight, result: null, after: -1 };
    state.shots += 1;
    // The keeper sees it coming, a moment late, and goes for where it is headed (as far as its post).
    state.keeperDive = Math.min(state.goalX + goalHalf - KEEPER_HALF, Math.max(state.goalX - goalHalf + KEEPER_HALF, toX));
    state.keeperReact = REACT_SECONDS;
    events.push({ type: 'action', x: state.spotX, y: state.spotY });
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
      state.resultAgo += dt;

      // The keeper: walks post to post, or goes for the ball after its reaction time.
      const speed = keeperSpeed();
      if (state.keeperDive !== null) {
        state.keeperReact -= dt;
        if (state.keeperReact <= 0) {
          const gap = state.keeperDive - state.keeperX;
          state.keeperX += Math.sign(gap) * Math.min(Math.abs(gap), speed * DIVE_FACTOR * dt);
        }
      } else {
        state.keeperX += state.keeperDir * speed * dt;
        const left = state.goalX - goalHalf + KEEPER_HALF;
        const right = state.goalX + goalHalf - KEEPER_HALF;
        if (state.keeperX < left || state.keeperX > right) {
          state.keeperDir *= -1;
          state.keeperX = Math.min(right, Math.max(left, state.keeperX));
        }
        // Now and then it turns early, so its walk is not a metronome.
        if (rng.chance(dt * 0.5)) state.keeperDir *= -1;
      }

      const ball = state.ball;
      if (!ball) {
        const swipe = input.swipes.find((s) => s.dy < -MIN_SHOT && s.from.y > arena.height * 0.45);
        if (swipe) shoot(swipe);
        return;
      }
      if (ball.result === null) {
        ball.t = Math.min(ball.flight, ball.t + dt);
        const p = ball.t / ball.flight;
        ball.x = ball.fromX + (ball.toX - ball.fromX) * p;
        ball.y = ball.fromY + (ball.toY - ball.fromY) * p;
        if (ball.t >= ball.flight) {
          if (Math.abs(ball.toX - state.goalX) > goalHalf - BALL_RADIUS) ball.result = 'wide';
          else if (Math.abs(ball.toX - state.keeperX) < KEEPER_HALF + BALL_RADIUS) ball.result = 'saved';
          else ball.result = 'goal';
          ball.after = 0;
          state.lastResult = ball.result;
          state.resultAgo = 0;
          if (ball.result === 'goal') {
            state.score += 1;
            events.push({ type: 'score', x: ball.x, y: ball.y });
          } else events.push({ type: ball.result === 'saved' ? 'hit' : 'miss', x: ball.x, y: ball.y });
        }
        return;
      }
      ball.after += dt;
      if (ball.after >= RESET_SECONDS) {
        state.ball = null;
        state.keeperDive = null;
      }
    },
  };
}

/** Good play: once the ball is on the spot, shoot at the side of the goal the keeper will be furthest from. */
export function penaltyBot(state: PenaltyState, _context: BotContext): BotMove {
  if (state.ball) return {};
  // Where the keeper will be when the ball arrives: its walk plus its late dive toward wherever she aims.
  const inside = state.goalHalf - 60;
  const aims = [state.goalX - inside, state.goalX, state.goalX + inside];
  const best = aims.reduce((a, b) => (Math.abs(b - state.keeperX) > Math.abs(a - state.keeperX) ? b : a));
  const rise = state.spotY - state.goalLine;
  const dy = -220;
  const dx = ((best - state.spotX) / rise) * -dy;
  return { swipe: { from: { x: state.spotX, y: state.spotY }, dx, dy } };
}
