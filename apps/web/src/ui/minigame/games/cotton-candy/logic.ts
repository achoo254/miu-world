// Cotton candy: a stick stands in the spinning bowl; the child draws circles around it with her finger and
// each turn winds more sugar on, until the candy is big and fluffy (a point) and a new stick comes. Circling
// too fast flings the candy off the stick: that stick starts over. A gauge shows the speed: keep it green.
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface CottonState {
  cx: number;
  cy: number;
  /** The finger counts while it circles between these distances from the stick. */
  inner: number;
  outer: number;
  /** Candy size now, at the start and when it is done. */
  radius: number;
  /** Smoothed turning speed (turns per second). */
  speed: number;
  /** Seconds since the candy flew off (-1: it did not), and since the last one was finished. */
  fellAgo: number;
  doneAgo: number;
  /** Total angle wound, for the swirl drawn on the candy. */
  wound: number;
  score: number;
  time: number;
}

export const START_RADIUS = 22;
export const DONE_RADIUS = 130;
/** Turns that make a whole candy. */
export const TURNS_PER_CANDY = 6;
/** Turns per second above which the candy is flung off; the gauge warns from WARN_SPEED. */
export const FLING_SPEED = 2.6;
export const WARN_SPEED = 2.0;
const SMOOTHING = 0.35;
const NEW_STICK_SECONDS = 0.6;
/** A finger that jumps further than this between two steps (radians) lifted and came down elsewhere. */
const JUMP = 2.5;

export function createCottonCandy({ arena, params }: GameSetup): MinigameLogic<CottonState> {
  const factor = typeof params.speed === 'number' ? Math.min(1.4, Math.max(0.7, params.speed)) : 1;
  const events = eventQueue();
  const cy = Math.max(HUD_SAFE_TOP + 190, Math.min(arena.height * 0.45, arena.height - 300));
  const state: CottonState = {
    cx: arena.width / 2,
    cy,
    inner: 60,
    outer: Math.min(330, arena.width / 2 - 10),
    radius: START_RADIUS,
    speed: 0,
    fellAgo: -1,
    doneAgo: 9,
    wound: 0,
    score: 0,
    time: 0,
  };
  let lastAngle: number | null = null;
  const growPerRadian = (DONE_RADIUS - START_RADIUS) / (TURNS_PER_CANDY * Math.PI * 2);
  const fling = FLING_SPEED / factor;

  const angleOf = (p: Point): number | null => {
    const d = Math.hypot(p.x - state.cx, p.y - state.cy);
    return d >= state.inner && d <= state.outer ? Math.atan2(p.y - state.cy, p.x - state.cx) : null;
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
      state.doneAgo += dt;
      const waiting = state.fellAgo >= 0 || state.doneAgo < NEW_STICK_SECONDS;
      if (state.fellAgo >= 0) {
        state.fellAgo += dt;
        if (state.fellAgo >= NEW_STICK_SECONDS * 1.5) state.fellAgo = -1;
      }
      const angle = input.pointer ? angleOf(input.pointer) : null;
      let turned = 0;
      if (angle !== null && lastAngle !== null) {
        let delta = angle - lastAngle;
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        if (Math.abs(delta) < JUMP) turned = Math.abs(delta);
      }
      lastAngle = angle;
      // Turns per second, smoothed so a jerky finger reads as its average pace.
      const k = Math.min(1, dt / SMOOTHING);
      state.speed += (turned / (Math.PI * 2) / dt - state.speed) * k;
      if (waiting) return;
      if (state.speed > fling) {
        state.fellAgo = 0;
        state.radius = START_RADIUS;
        state.speed = 0;
        events.push({ type: 'hit', x: state.cx, y: state.cy });
        return;
      }
      state.radius += turned * growPerRadian;
      state.wound += turned;
      if (state.radius >= DONE_RADIUS) {
        state.score += 1;
        state.doneAgo = 0;
        state.radius = START_RADIUS;
        events.push({ type: 'score', x: state.cx, y: state.cy - 60 });
      }
    },
  };
}

/** Good play: circle steadily at one and a half turns a second, a comfortable distance from the stick. */
export function cottonCandyBot(state: CottonState, context: BotContext): BotMove {
  const angle = context.time * 1.5 * Math.PI * 2;
  const r = (state.inner + state.outer) / 2;
  return { touch: { x: state.cx + Math.cos(angle) * r, y: state.cy + Math.sin(angle) * r } };
}
