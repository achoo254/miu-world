// Pick-up sticks (Mikado): a pile of long coloured sticks lies crossed on the table. Tapping a stick with
// nothing lying on it lifts it out (a point); tapping one that another stick lies across shakes the pile
// and costs one of three hearts (the sticks on it blink). An empty table gets a new pile. Where sticks
// cross, a tap takes the one on top. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface Stick {
  x: number;
  y: number;
  angle: number;
  length: number;
  colour: number;
  /** Seconds since it was lifted out (-1 while on the table). */
  lifted: number;
}

export interface PickSticksState {
  /** Bottom first: a stick lies on every stick before it in the list that it crosses. */
  sticks: Stick[];
  /** Seconds since the pile was shaken, and the sticks that lay on the one tapped. */
  shakeAgo: number;
  blocking: number[];
  /** Seconds until a new pile when the table is empty (-1 while sticks remain). */
  refillIn: number;
  piles: number;
  lives: number;
  score: number;
  time: number;
}

const LIVES = 3;
const PILE = 12;
export const THICKNESS = 18;
/** A tap this close to a stick touches it (wider than the stick: little fingers). */
const REACH = Math.max(TOUCH_RADIUS, 34);

export const ends = (s: Stick): [Point, Point] => {
  const dx = (Math.cos(s.angle) * s.length) / 2;
  const dy = (Math.sin(s.angle) * s.length) / 2;
  return [
    { x: s.x - dx, y: s.y - dy },
    { x: s.x + dx, y: s.y + dy },
  ];
};

function pointToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

const cross = (o: Point, a: Point, b: Point): number => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

/** True when two sticks touch (their centre lines cross, or come closer than a stick's thickness). */
export function touching(s: Stick, t: Stick): boolean {
  const [a, b] = ends(s);
  const [c, d] = ends(t);
  const d1 = cross(c, d, a);
  const d2 = cross(c, d, b);
  const d3 = cross(a, b, c);
  const d4 = cross(a, b, d);
  if (d1 * d2 < 0 && d3 * d4 < 0) return true;
  return Math.min(pointToSegment(a, c, d), pointToSegment(b, c, d), pointToSegment(c, a, b), pointToSegment(d, a, b)) < THICKNESS;
}

/** Indices of the sticks still on the table that lie on stick i. */
export function lyingOn(sticks: readonly Stick[], i: number): number[] {
  const s = sticks[i];
  if (!s) return [];
  const out: number[] = [];
  for (let j = i + 1; j < sticks.length; j += 1) {
    const t = sticks[j];
    if (t && t.lifted < 0 && touching(s, t)) out.push(j);
  }
  return out;
}

export const distanceToStick = (p: Point, s: Stick): number => {
  const [a, b] = ends(s);
  return pointToSegment(p, a, b);
};

export function createPickSticks({ arena, rng }: GameSetup): MinigameLogic<PickSticksState> {
  const events = eventQueue();
  const state: PickSticksState = { sticks: [], shakeAgo: 9, blocking: [], refillIn: -1, piles: 0, lives: LIVES, score: 0, time: 0 };
  const top = HUD_SAFE_TOP + 30;
  const cx = arena.width / 2;
  const cy = top + (arena.height - top - 30) / 2;
  const room = Math.min(arena.width - 60, arena.height - top - 60);

  function pile(): void {
    state.sticks = [];
    for (let k = 0; k < PILE; k += 1) {
      const length = room * rng.range(0.62, 0.85);
      const spread = (room - length) / 2;
      state.sticks.push({ x: cx + rng.range(-spread, spread) * 0.9, y: cy + rng.range(-spread, spread) * 0.9, angle: rng.range(0, Math.PI), length, colour: rng.int(0, 3), lifted: -1 });
    }
    state.piles += 1;
  }
  pile();

  function tap(p: Point): void {
    let top = -1;
    state.sticks.forEach((s, i) => {
      if (s.lifted < 0 && distanceToStick(p, s) <= REACH) top = i;
    });
    const stick = state.sticks[top];
    if (!stick) return;
    const above = lyingOn(state.sticks, top);
    if (above.length > 0) {
      state.lives -= 1;
      state.shakeAgo = 0;
      state.blocking = above;
      events.push({ type: 'hit', ...p });
      return;
    }
    stick.lifted = 0;
    state.score += 1;
    events.push({ type: 'score', ...p });
    if (state.sticks.every((s) => s.lifted >= 0)) state.refillIn = 0.9;
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
      state.shakeAgo += dt;
      for (const s of state.sticks) if (s.lifted >= 0) s.lifted += dt;
      if (state.refillIn >= 0) {
        state.refillIn -= dt;
        if (state.refillIn < 0) pile();
        return;
      }
      for (const p of input.taps) tap(p);
    },
  };
}

/** Good play: a stick with nothing on it, tapped where no other stick is near; a short look between picks. */
export function pickSticksBot(state: PickSticksState, _context: BotContext): BotMove {
  if (state.refillIn >= 0 || Math.round(state.time * 10) % 8 !== 0) return {};
  const live = state.sticks.map((s, i) => ({ s, i })).filter(({ s }) => s.lifted < 0);
  for (const { s, i } of [...live].reverse()) {
    if (lyingOn(state.sticks, i).length > 0) continue;
    const [a, b] = ends(s);
    let best: Point | null = null;
    let room = -1;
    for (let k = 1; k < 10; k += 1) {
      const p = { x: a.x + ((b.x - a.x) * k) / 10, y: a.y + ((b.y - a.y) * k) / 10 };
      const near = Math.min(...live.filter((o) => o.i > i).map((o) => distanceToStick(p, o.s)), Infinity);
      if (near > room) {
        room = near;
        best = p;
      }
    }
    if (best && room > REACH) return { tap: best };
  }
  return {};
}
