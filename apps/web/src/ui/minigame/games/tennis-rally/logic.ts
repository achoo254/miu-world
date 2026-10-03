// Table tennis rally against Khỉ. The child's character runs to the ball by itself; the child taps while the
// ball is inside the ring around her bat to hit it back. Where she taps across the table is where the ball
// goes (a swipe sends it that way too): far from Khỉ, it may not reach it. A hit right in the middle of the
// ring is a smash (faster). Every point she wins is a point of the round's score; a game is first to five,
// and after a game Khỉ wins, Khỉ moves slower. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

/** Along the table: 0 the child's end, 1 Khỉ's end. Across: -1 to 1. */
export interface Ball {
  d: number;
  l: number;
  fromD: number;
  fromL: number;
  toD: number;
  toL: number;
  /** Seconds in flight and the whole flight. */
  t: number;
  flight: number;
  /** Who hit it last: it is heading to the other. */
  toward: 'child' | 'khi';
}

export type RallyPhase = 'serve' | 'play' | 'point';

export interface TennisRallyState {
  ball: Ball;
  phase: RallyPhase;
  phaseAgo: number;
  childL: number;
  khiL: number;
  /** Khỉ's sideways speed (across-units per second); lower after each game it wins. */
  khiSpeed: number;
  /** Points in this game. */
  mine: number;
  theirs: number;
  /** Seconds since the child swung (and whether it hit, and whether it was a smash). */
  swingAgo: number;
  swingHit: boolean;
  smash: boolean;
  /** Who won the last point. */
  lastPoint: 'child' | 'khi' | null;
  rally: number;
  games: number;
  /** Screen layout: wide screens have the table across (child on the left). */
  wide: boolean;
  table: { x: number; y: number; w: number; h: number };
  score: number;
  time: number;
}

export const GAME_POINTS = 5;
/** The ring around the bat: the ball can be hit while this close along the table. */
export const RING = 0.13;
const SMASH = 0.045;
const KHI_REACH = 0.28;
const KHI_REACT = 0.22;
const SERVE_SECONDS = 1.0;
const POINT_SECONDS = 1.1;

/** Screen point of a table position (d along, l across). */
export function toScreen(s: Pick<TennisRallyState, 'wide' | 'table'>, d: number, l: number): Point {
  const { x, y, w, h } = s.table;
  return s.wide ? { x: x + d * w, y: y + h / 2 + (l * h) / 2 } : { x: x + w / 2 + (l * w) / 2, y: y + h - d * h };
}

/** The across position (−1…1) a screen point is level with. */
export function lateralOf(s: Pick<TennisRallyState, 'wide' | 'table'>, p: Point): number {
  const { x, y, w, h } = s.table;
  const l = s.wide ? ((p.y - y) / h) * 2 - 1 : ((p.x - x) / w) * 2 - 1;
  return Math.max(-0.9, Math.min(0.9, l));
}

export function createTennisRally({ arena, params, rng }: GameSetup): MinigameLogic<TennisRallyState> {
  const factor = typeof params.speed === 'number' ? Math.min(1.5, Math.max(0.6, params.speed)) : 1;
  const events = eventQueue();
  const wide = arena.width >= arena.height;
  const top = HUD_SAFE_TOP + 30;
  const table = wide
    ? (() => {
        const h = Math.min(330, arena.height - top - 90);
        const w = Math.min(arena.width - 300, h * 1.9);
        return { x: (arena.width - w) / 2, y: top + (arena.height - top - 30 - h) / 2, w, h };
      })()
    : (() => {
        const w = Math.min(arena.width - 160, 420);
        const h = Math.min(arena.height - top - 260, w * 1.9);
        return { x: (arena.width - w) / 2, y: top + 90 + (arena.height - top - 200 - h) / 2, w, h };
      })();
  const state: TennisRallyState = {
    ball: { d: 1, l: 0, fromD: 1, fromL: 0, toD: -0.1, toL: 0, t: 0, flight: 1, toward: 'child' },
    phase: 'serve',
    phaseAgo: 0,
    childL: 0,
    khiL: 0,
    khiSpeed: 1.25 * factor,
    mine: 0,
    theirs: 0,
    swingAgo: 9,
    swingHit: false,
    smash: false,
    lastPoint: null,
    rally: 0,
    games: 0,
    wide,
    table,
    score: 0,
    time: 0,
  };
  const at = (d: number, l: number): Point => toScreen(state, d, l);

  function send(fromD: number, fromL: number, toD: number, toL: number, flight: number, toward: Ball['toward']): void {
    state.ball = { d: fromD, l: fromL, fromD, fromL, toD, toL, t: 0, flight, toward };
  }
  function serve(): void {
    state.rally = 0;
    send(1.05, state.khiL, -0.15, rng.range(-0.7, 0.7), 1.25 / factor, 'child');
  }
  function point(winner: 'child' | 'khi'): void {
    state.phase = 'point';
    state.phaseAgo = 0;
    state.lastPoint = winner;
    const where = at(state.ball.d, state.ball.l);
    if (winner === 'child') {
      state.mine += 1;
      state.score += 1;
      events.push({ type: 'score', ...where });
    } else {
      state.theirs += 1;
      events.push({ type: 'miss', ...where });
    }
  }

  function swing(aim: number): void {
    const b = state.ball;
    if (b.toward !== 'child' || state.swingAgo < 0.35) return;
    state.swingAgo = 0;
    state.swingHit = false;
    if (Math.abs(b.d) > RING) return;
    state.swingHit = true;
    state.smash = Math.abs(b.d) <= SMASH;
    state.rally += 1;
    const flight = (state.smash ? 0.7 : 0.95) / factor / (1 + Math.min(0.3, state.rally * 0.03));
    send(b.d, b.l, 1.15, aim, flight, 'khi');
    events.push({ type: 'action', ...at(b.d, b.l) });
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
      state.phaseAgo += dt;
      state.swingAgo += dt;
      const b = state.ball;

      if (state.phase === 'serve') {
        if (state.phaseAgo >= SERVE_SECONDS) {
          state.phase = 'play';
          state.phaseAgo = 0;
          serve();
        }
        return;
      }
      if (state.phase === 'point') {
        if (state.phaseAgo >= POINT_SECONDS) {
          if (state.mine >= GAME_POINTS || state.theirs >= GAME_POINTS) {
            if (state.theirs >= GAME_POINTS) state.khiSpeed *= 0.8;
            state.mine = 0;
            state.theirs = 0;
            state.games += 1;
          }
          state.phase = 'serve';
          state.phaseAgo = 0;
        }
        return;
      }

      // The child's character runs to where the ball will cross her end.
      const target = b.toward === 'child' ? b.toL : 0;
      state.childL += Math.sign(target - state.childL) * Math.min(Math.abs(target - state.childL), 3 * dt);
      // Khỉ goes for a ball coming its way, a moment late.
      if (b.toward === 'khi' && b.t > KHI_REACT) state.khiL += Math.sign(b.toL - state.khiL) * Math.min(Math.abs(b.toL - state.khiL), state.khiSpeed * dt);

      const tap = input.taps.at(-1);
      const flick = input.swipes.find((s) => (state.wide ? s.direction === 'up' || s.direction === 'down' : s.direction === 'left' || s.direction === 'right'));
      if (flick) swing(Math.max(-0.85, Math.min(0.85, b.l + Math.sign(state.wide ? flick.dy : flick.dx) * 0.9)));
      else if (tap) swing(lateralOf(state, tap));

      const ball = state.ball;
      ball.t = Math.min(ball.flight, ball.t + dt);
      const p = ball.t / ball.flight;
      ball.d = ball.fromD + (ball.toD - ball.fromD) * p;
      ball.l = ball.fromL + (ball.toL - ball.fromL) * p;
      if (ball.toward === 'child' && ball.d < -RING - 0.01) point('khi');
      if (ball.toward === 'khi' && ball.d >= 1.02) {
        if (Math.abs(state.khiL - ball.l) <= KHI_REACH) {
          // Khỉ returns it, somewhere on the child's side.
          send(ball.d, ball.l, -0.15, rng.range(-0.75, 0.75), Math.max(0.85, 1.15 - state.rally * 0.03) / factor, 'child');
        } else point('child');
      }
    },
  };
}

/** Good play: tap in the middle of the ring, aiming at the side away from Khỉ. */
export function tennisRallyBot(state: TennisRallyState, _context: BotContext): BotMove {
  const b = state.ball;
  if (state.phase !== 'play' || b.toward !== 'child' || b.d > 0.075 || b.d < -RING + 0.02) return {};
  const aim = state.khiL > 0 ? -0.85 : 0.85;
  return { tap: toScreen(state, 0, aim) };
}
