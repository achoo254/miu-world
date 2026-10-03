// Chopsticks: beans lie on a plate and a bowl waits on the table. The chopsticks follow the child's finger
// (their tips just above it, so the finger does not hide them). Putting a finger down on a bean, or resting the
// tips on one for a moment, picks it up; carrying it into the bowl and letting go is a point. Moving too fast
// shakes the bean loose: it rolls back onto the plate. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface Bean extends Point {
  /** Seconds since it rolled back to the plate after a slip (a little bounce); large = long ago. */
  backAgo: number;
  spin: number;
}

export interface ChopsticksState {
  plate: Point & { r: number };
  bowl: Point & { r: number };
  beans: Bean[];
  /** Where the chopstick tips are (null with no finger down). */
  tip: Point | null;
  /** The bean between the tips, if any. */
  held: Bean | null;
  /** Tip speed, units per second, over the last quarter second. */
  speed: number;
  /** Seconds the tips have rested on a bean without holding it. */
  resting: number;
  /** A slipped bean on its way back to the plate, and in the bowl. */
  slipping: Array<{ from: Point; to: Bean; ago: number }>;
  dropped: Array<{ x: number; y: number; ago: number }>;
  /** Seconds since the last slip (the "Chậm thôi" word). */
  slipAgo: number;
  score: number;
  time: number;
}

/** Tips sit this far above the finger. */
export const TIP_OFFSET = 46;
/** Tips this close to a bean can pick it up. */
export const GRIP_RADIUS = 46;
/** Faster than this (units/s) and the bean slips. */
export const SLIP_SPEED = 650;
const REST_TO_GRIP = 0.18;
const ON_PLATE = 8;
const HISTORY = 15;

export function createChopsticks({ arena, rng }: GameSetup): MinigameLogic<ChopsticksState> {
  const events = eventQueue();
  const wide = arena.width > arena.height;
  const plate = wide ? { x: arena.width * 0.27, y: arena.height * 0.6, r: 125 } : { x: arena.width / 2, y: arena.height * 0.72, r: 125 };
  const bowl = wide ? { x: arena.width * 0.74, y: arena.height * 0.56, r: 95 } : { x: arena.width / 2, y: Math.max(HUD_SAFE_TOP + 150, arena.height * 0.34), r: 95 };
  const state: ChopsticksState = { plate, bowl, beans: [], tip: null, held: null, speed: 0, resting: 0, slipping: [], dropped: [], slipAgo: 9, score: 0, time: 0 };
  const history: Point[] = [];

  const spotOnPlate = (): Bean => {
    const a = rng.range(0, Math.PI * 2);
    const d = Math.sqrt(rng.next()) * (plate.r - 40);
    return { x: plate.x + Math.cos(a) * d, y: plate.y + Math.sin(a) * d * 0.8, backAgo: 9, spin: rng.range(-0.6, 0.6) };
  };
  for (let i = 0; i < ON_PLATE; i += 1) state.beans.push(spotOnPlate());

  const nearestBean = (p: Point): Bean | null => {
    let best: Bean | null = null;
    let bestD = GRIP_RADIUS;
    for (const b of state.beans) {
      const d = Math.hypot(b.x - p.x, b.y - p.y);
      if (d <= bestD) {
        best = b;
        bestD = d;
      }
    }
    return best;
  };

  function grip(bean: Bean): void {
    state.beans = state.beans.filter((b) => b !== bean);
    state.held = bean;
    state.resting = 0;
    events.push({ type: 'action', x: bean.x, y: bean.y });
  }

  function slip(): void {
    const bean = state.held;
    if (!bean || !state.tip) return;
    const back = spotOnPlate();
    state.slipping.push({ from: { ...state.tip }, to: back, ago: 0 });
    state.held = null;
    state.slipAgo = 0;
    events.push({ type: 'miss', x: state.tip.x, y: state.tip.y });
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
      state.slipAgo += dt;
      const p = input.pointer;
      const tip = p ? { x: p.x, y: p.y - TIP_OFFSET } : null;
      if (tip) {
        history.push(tip);
        if (history.length > HISTORY) history.shift();
        const oldest = history[0] ?? tip;
        state.speed = history.length > 1 ? Math.hypot(tip.x - oldest.x, tip.y - oldest.y) / ((history.length - 1) * dt) : 0;
      } else {
        history.length = 0;
        state.speed = 0;
      }

      if (tip && !state.held) {
        const bean = nearestBean(tip);
        if (bean && input.pressed) grip(bean);
        else if (bean && state.speed < 120) {
          state.resting += dt;
          if (state.resting >= REST_TO_GRIP) grip(bean);
        } else state.resting = 0;
      }
      if (tip && state.held) {
        state.held.x = tip.x;
        state.held.y = tip.y;
        if (state.speed > SLIP_SPEED) slip();
      }
      if (!tip && state.held) {
        // Let go: into the bowl, or back onto the plate.
        const bean = state.held;
        state.held = null;
        if (Math.hypot(bean.x - bowl.x, bean.y - bowl.y) <= bowl.r) {
          state.score += 1;
          state.dropped.push({ x: bowl.x + rng.range(-40, 40), y: bowl.y - 10 + rng.range(-12, 12), ago: 0 });
          events.push({ type: 'score', x: bowl.x, y: bowl.y - 60 });
        } else {
          state.slipping.push({ from: { x: bean.x, y: bean.y }, to: spotOnPlate(), ago: 0 });
        }
      }
      state.tip = tip;

      for (const s of state.slipping) s.ago += dt;
      for (const s of state.slipping.filter((s) => s.ago >= 0.5)) {
        s.to.backAgo = 0;
        state.beans.push(s.to);
      }
      state.slipping = state.slipping.filter((s) => s.ago < 0.5);
      for (const b of state.beans) b.backAgo += dt;
      for (const d of state.dropped) d.ago += dt;
      state.dropped = state.dropped.slice(-14);
      // The plate is always topped up.
      while (state.beans.length + state.slipping.length + (state.held ? 1 : 0) < ON_PLATE) state.beans.push({ ...spotOnPlate(), backAgo: 0 });
    },
  };
}

/** Good play: picks the bean nearest the bowl and carries it over steadily, then lets go in the bowl. */
export function chopsticksBot(state: ChopsticksState, _context: BotContext): BotMove {
  const finger = (p: Point): Point => ({ x: p.x, y: p.y + TIP_OFFSET });
  if (!state.held) {
    if (state.tip) return {};
    const bean = [...state.beans].sort((a, b) => Math.hypot(a.x - state.bowl.x, a.y - state.bowl.y) - Math.hypot(b.x - state.bowl.x, b.y - state.bowl.y))[0];
    return bean ? { touch: finger(bean) } : {};
  }
  const tip = state.tip ?? state.held;
  const dx = state.bowl.x - tip.x;
  const dy = state.bowl.y - tip.y;
  const d = Math.hypot(dx, dy);
  if (d < state.bowl.r * 0.5) return {};
  const step = Math.min(d, 34);
  return { touch: finger({ x: tip.x + (dx / d) * step, y: tip.y + (dy / d) * step }) };
}
