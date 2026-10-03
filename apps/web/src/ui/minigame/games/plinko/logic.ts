// Plinko: a board of pegs over a row of bins worth 5, 10, 20, 10, 5. The child taps where to drop a coin; it
// bounces down through the pegs (real circle bounces, only a whisper of chance, so where she drops it mostly
// decides where it lands) into a bin. A gift box glides to and fro just above the bins (+25 when the coin
// touches it) and a star floats across the middle (+5). Eight coins a round. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface Bin {
  x0: number;
  x1: number;
  value: number;
  /** Seconds since a coin landed in it (a flash). */
  hitAgo: number;
}

export interface Board {
  left: number;
  right: number;
  dropY: number;
  binsTop: number;
  bottom: number;
  pegs: Point[];
  bins: Bin[];
  giftY: number;
  giftSpan: number;
  starY: number;
  starSpan: number;
}

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Bonuses already taken by this coin. */
  gift: boolean;
  star: boolean;
  /** Seconds since it settled in a bin (-1 while falling). */
  settled: number;
  bin: number;
}

export interface PlinkoState {
  board: Board;
  ball: Ball | null;
  /** Coins resting in bins (drawn there). */
  landed: Ball[];
  ballsLeft: number;
  /** Seconds the gift and the star stay away after being taken. */
  giftAway: number;
  starAway: number;
  /** Seconds since the last coin settled (the next one is ready after a beat). */
  restAgo: number;
  score: number;
  time: number;
}

export const BALLS = 8;
export const BALL_RADIUS = 18;
export const PEG_RADIUS = 10;
export const GIFT_RADIUS = 36;
export const STAR_RADIUS = 34;
export const GIFT_POINTS = 25;
export const STAR_POINTS = 5;
const BIN_VALUES = [2, 5, 15, 5, 2] as const;
const GRAVITY = 900;
const BOUNCE = 0.45;
const REST_SECONDS = 0.5;

/** Where the gift and the star are at time `t` (pure functions of time, so a coin's path can be foreseen). */
export const giftAt = (b: Board, t: number): Point => ({ x: (b.left + b.right) / 2 + b.giftSpan * Math.sin(t * 0.8), y: b.giftY });
export const starAt = (b: Board, t: number): Point => ({ x: (b.left + b.right) / 2 + b.starSpan * Math.sin(t * 1.25 + 1.3), y: b.starY + 18 * Math.sin(t * 2.1) });

export function buildBoard(width: number, height: number): Board {
  const left = 28;
  const right = width - 28;
  const bottom = height - 24;
  // A tall phone gets the same board as an iPad, low on the screen: longer falls would make it a lottery.
  const dropY = Math.max(HUD_SAFE_TOP + 40, bottom - 720);
  const binsTop = bottom - 110;
  const top = dropY + 70;
  const giftY = binsTop - 52;
  const rowsSpace = giftY - 60 - top;
  const rows = Math.max(4, Math.min(6, Math.round(rowsSpace / 78)));
  const rowGap = rowsSpace / Math.max(1, rows - 1);
  const cols = Math.max(5, Math.round((right - left) / 92));
  const colGap = (right - left) / cols;
  const pegs: Point[] = [];
  for (let r = 0; r < rows; r += 1) {
    const offset = r % 2 === 0 ? colGap / 2 : 0;
    for (let c = 0; c <= cols; c += 1) {
      const x = left + offset + c * colGap;
      if (x > left + 12 && x < right - 12) pegs.push({ x, y: top + r * rowGap });
    }
  }
  const binW = (right - left) / BIN_VALUES.length;
  const bins = BIN_VALUES.map((value, i) => ({ x0: left + i * binW, x1: left + (i + 1) * binW, value, hitAgo: 9 }));
  return { left, right, dropY, binsTop, bottom, pegs, bins, giftY, giftSpan: (right - left) / 2 - GIFT_RADIUS - 10, starY: top + rowsSpace * 0.45, starSpan: (right - left) / 2 - STAR_RADIUS - 20 };
}

export interface BallEvents {
  gift: boolean;
  star: boolean;
  /** Bin index once the coin drops below the bins' top. */
  bin: number;
}

/**
 * One step of a falling coin: gravity, bounces off pegs and the side walls, the bonuses it touches. `jitter` is
 * a tiny sideways nudge on each peg bounce (the game passes a random one, the bot's forecast passes 0).
 */
export function stepBall(ball: Ball, b: Board, dt: number, t: number, bonus: { gift: boolean; star: boolean }, jitter: () => number): BallEvents {
  const out: BallEvents = { gift: false, star: false, bin: -1 };
  ball.vy += GRAVITY * dt;
  ball.vx *= 1 - 0.6 * dt;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
  for (const p of b.pegs) {
    // A coin landing dead on top of a peg rolls off to one side instead of balancing there.
    const dx = Math.abs(ball.x - p.x) < 1 ? (p.x < (b.left + b.right) / 2 ? -1 : 1) : ball.x - p.x;
    const dy = ball.y - p.y;
    const min = BALL_RADIUS + PEG_RADIUS;
    const d2 = dx * dx + dy * dy;
    if (d2 >= min * min || d2 === 0) continue;
    const d = Math.sqrt(d2);
    const nx = dx / d;
    const ny = dy / d;
    ball.x = p.x + nx * min;
    ball.y = p.y + ny * min;
    const vn = ball.vx * nx + ball.vy * ny;
    if (vn < 0) {
      ball.vx -= (1 + BOUNCE) * vn * nx;
      ball.vy -= (1 + BOUNCE) * vn * ny;
      ball.vx += jitter();
    }
  }
  if (ball.x < b.left + BALL_RADIUS) {
    ball.x = b.left + BALL_RADIUS;
    ball.vx = Math.abs(ball.vx) * BOUNCE;
  }
  if (ball.x > b.right - BALL_RADIUS) {
    ball.x = b.right - BALL_RADIUS;
    ball.vx = -Math.abs(ball.vx) * BOUNCE;
  }
  if (bonus.gift && !ball.gift) {
    const g = giftAt(b, t);
    if (Math.hypot(ball.x - g.x, ball.y - g.y) < GIFT_RADIUS + BALL_RADIUS) out.gift = true;
  }
  if (bonus.star && !ball.star) {
    const s = starAt(b, t);
    if (Math.hypot(ball.x - s.x, ball.y - s.y) < STAR_RADIUS + BALL_RADIUS) out.star = true;
  }
  if (ball.y >= b.binsTop) out.bin = Math.max(0, Math.min(b.bins.length - 1, b.bins.findIndex((bin) => ball.x < bin.x1)));
  return out;
}

export const newBall = (b: Board, x: number): Ball => ({
  x: Math.min(b.right - BALL_RADIUS - 4, Math.max(b.left + BALL_RADIUS + 4, x)),
  y: b.dropY,
  vx: 0,
  vy: 0,
  gift: false,
  star: false,
  settled: -1,
  bin: -1,
});

export function createPlinko({ arena, rng }: GameSetup): MinigameLogic<PlinkoState> {
  const events = eventQueue();
  const board = buildBoard(arena.width, arena.height);
  const state: PlinkoState = { board, ball: null, landed: [], ballsLeft: BALLS, giftAway: 0, starAway: 0, restAgo: 9, score: 0, time: 0 };
  const jitter = (): number => rng.range(-4, 4);

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.ballsLeft <= 0 && state.ball === null && state.restAgo > 0.8;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.restAgo += dt;
      state.giftAway = Math.max(0, state.giftAway - dt);
      state.starAway = Math.max(0, state.starAway - dt);
      for (const bin of board.bins) bin.hitAgo += dt;
      for (const b of state.landed) b.settled += dt;

      const tap = input.taps[0];
      if (tap && !state.ball && state.ballsLeft > 0 && state.restAgo >= REST_SECONDS) {
        state.ball = newBall(board, tap.x);
        state.ballsLeft -= 1;
        events.push({ type: 'action', x: state.ball.x, y: board.dropY });
      }

      const ball = state.ball;
      if (!ball) return;
      const hit = stepBall(ball, board, dt, state.time, { gift: state.giftAway <= 0, star: state.starAway <= 0 }, jitter);
      if (hit.gift) {
        ball.gift = true;
        state.giftAway = 2.5;
        state.score += GIFT_POINTS;
        const g = giftAt(board, state.time);
        events.push({ type: 'score', x: g.x, y: g.y, points: GIFT_POINTS, note: 84, voice: 'bell' });
      }
      if (hit.star) {
        ball.star = true;
        state.starAway = 2.5;
        state.score += STAR_POINTS;
        events.push({ type: 'score', x: ball.x, y: ball.y, points: STAR_POINTS, note: 79, voice: 'bell' });
      }
      const bin = board.bins[hit.bin];
      if (bin) {
        ball.bin = hit.bin;
        ball.settled = 0;
        ball.x = Math.min(bin.x1 - BALL_RADIUS - 4, Math.max(bin.x0 + BALL_RADIUS + 4, ball.x));
        bin.hitAgo = 0;
        state.score += bin.value;
        state.landed.push(ball);
        state.ball = null;
        state.restAgo = 0;
        events.push({ type: 'score', x: (bin.x0 + bin.x1) / 2, y: board.binsTop + 30, points: bin.value, note: 60 + bin.value / 2 + 2, voice: 'bell' });
      }
    },
  };
}

/** Points a coin dropped at `x` now would bring, foreseen without the bounces' tiny chance. */
export function forecast(state: PlinkoState, x: number): number {
  const b = state.board;
  const ball = newBall(b, x);
  let points = 0;
  const bonus = { gift: state.giftAway <= 0, star: state.starAway <= 0 };
  const dt = 1 / 60;
  // The coin starts on the step after the tap.
  for (let t = state.time + dt, n = 0; n < 60 * 6; n += 1, t += dt) {
    const hit = stepBall(ball, b, dt, t, bonus, () => 0);
    if (hit.gift && bonus.gift) {
      points += GIFT_POINTS;
      ball.gift = true;
    }
    if (hit.star && bonus.star) {
      points += STAR_POINTS;
      ball.star = true;
    }
    const bin = b.bins[hit.bin];
    if (bin) return points + bin.value;
  }
  return points;
}

/**
 * Good play: after a short look, drop where the forecast pays most, counting its neighbours too (a spot where a
 * small slip still pays is better than a lucky pin-point); ties go to the middle.
 */
export function plinkoBot(state: PlinkoState, _context: BotContext): BotMove {
  if (state.ball || state.ballsLeft <= 0 || state.restAgo < 0.8) return {};
  const b = state.board;
  let best = { x: (b.left + b.right) / 2, points: -1 };
  const xs: number[] = [];
  for (let x = b.left + 24; x <= b.right - 24; x += 8) xs.push(x);
  const raw = xs.map((x) => forecast(state, x));
  xs.forEach((x, i) => {
    const points = ((raw[i - 1] ?? 0) + 2 * (raw[i] ?? 0) + (raw[i + 1] ?? 0)) / 4 - Math.abs(x - (b.left + b.right) / 2) * 0.001;
    if (points > best.points) best = { x, points };
  });
  return { tap: { x: best.x, y: b.dropY } };
}
