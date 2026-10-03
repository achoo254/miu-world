// Flappy fly: a little bird flies on through a bamboo grove; gravity pulls it down and every tap is a flap
// up. Each gap between two bamboo stems it gets through is a point. Bumping a stem (or the ground) costs
// one of three hearts and puts the bird back in the middle of the gap, blinking, so it can go on. The gaps
// are wide and drift gently up and down. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export interface Stem {
  /** Left edge of the pair. */
  x: number;
  /** Centre of the gap. */
  gapY: number;
  passed: boolean;
}

export interface FlappyState {
  birdX: number;
  birdY: number;
  vy: number;
  /** Top of the play band (under the HUD) and the ground. */
  top: number;
  groundY: number;
  gap: number;
  stems: Stem[];
  speed: number;
  /** Seconds of blinking left after a bump, and since the last flap. */
  invulnerable: number;
  flapAgo: number;
  distance: number;
  lives: number;
  score: number;
  time: number;
}

const GRAVITY = 1500;
export const FLAP_SPEED = 520;
export const STEM_WIDTH = 86;
/** The bird's hit circle is smaller than its picture: only a clear bump counts. */
export const BIRD_RADIUS = 24;
const SPACING = 390;
const SPEED_START = 200;
const SPEED_END = 245;
const DRIFT = 170;
const INVULNERABLE = 1.5;
const LIVES = 3;

function nextGapY(rng: Rng, from: number, top: number, bottom: number, gap: number): number {
  const lo = top + gap / 2 + 20;
  const hi = bottom - gap / 2 - 20;
  return Math.min(hi, Math.max(lo, from + rng.range(-DRIFT, DRIFT)));
}

export function createFlappyFly({ arena, duration, params, rng }: GameSetup): MinigameLogic<FlappyState> {
  const factor = typeof params.speed === 'number' ? Math.min(1.4, Math.max(0.7, params.speed)) : 1;
  const gap = typeof params.gap === 'number' ? Math.min(320, Math.max(200, params.gap)) : 250;
  const events = eventQueue();
  const top = HUD_SAFE_TOP;
  const groundY = arena.height - 70;
  const middle = (top + groundY) / 2;
  const state: FlappyState = {
    birdX: Math.max(150, arena.width * 0.28),
    birdY: middle,
    vy: 0,
    top,
    groundY,
    gap,
    stems: [],
    speed: SPEED_START * factor,
    invulnerable: 1.2,
    flapAgo: 9,
    distance: 0,
    lives: LIVES,
    score: 0,
    time: 0,
  };
  let lastGap = middle;
  let nextX = state.birdX + 420;
  const lay = (): void => {
    lastGap = nextGapY(rng, lastGap, top, groundY, gap);
    state.stems.push({ x: nextX, gapY: lastGap, passed: false });
    nextX += SPACING;
  };
  while (nextX < arena.width + SPACING) lay();

  /** The stem pair the bird is at or heading for. */
  const current = (): Stem | undefined => state.stems.find((s) => s.x + STEM_WIDTH > state.birdX - BIRD_RADIUS);

  function bump(): void {
    state.lives -= 1;
    state.invulnerable = INVULNERABLE;
    state.birdY = current()?.gapY ?? middle;
    state.vy = -FLAP_SPEED * 0.4;
    events.push({ type: 'hit', x: state.birdX, y: state.birdY });
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
      state.flapAgo += dt;
      state.invulnerable = Math.max(0, state.invulnerable - dt);
      state.speed = (SPEED_START + (SPEED_END - SPEED_START) * Math.min(1, state.time / duration)) * factor;
      // The flap comes as the finger touches down, not when it lifts: no lag.
      if (input.pressed) {
        state.vy = -FLAP_SPEED;
        state.flapAgo = 0;
        events.push({ type: 'action', x: state.birdX - 20, y: state.birdY + 20 });
      }
      state.vy += GRAVITY * dt;
      state.birdY += state.vy * dt;
      if (state.birdY < top + BIRD_RADIUS) {
        state.birdY = top + BIRD_RADIUS;
        state.vy = Math.max(0, state.vy);
      }

      const move = state.speed * dt;
      state.distance += move;
      nextX -= move;
      for (const stem of state.stems) {
        stem.x -= move;
        if (!stem.passed && stem.x + STEM_WIDTH < state.birdX - BIRD_RADIUS) {
          stem.passed = true;
          state.score += 1;
          events.push({ type: 'score', x: stem.x + STEM_WIDTH / 2, y: stem.gapY });
        }
      }
      state.stems = state.stems.filter((s) => s.x + STEM_WIDTH > -40);
      while (nextX < arena.width + SPACING) lay();

      if (state.invulnerable > 0) return;
      if (state.birdY + BIRD_RADIUS >= groundY) {
        bump();
        return;
      }
      const stem = current();
      if (stem && state.birdX + BIRD_RADIUS > stem.x && state.birdX - BIRD_RADIUS < stem.x + STEM_WIDTH) {
        if (state.birdY - BIRD_RADIUS < stem.gapY - gap / 2 || state.birdY + BIRD_RADIUS > stem.gapY + gap / 2) bump();
      }
    },
  };
}

/**
 * Good play: flap whenever the bird is about to sink below a point a little under the middle of the next
 * gap; a flap lifts it about 90 units, so it bobs around the middle.
 */
export function flappyBot(state: FlappyState, context: BotContext): BotMove {
  const stem = state.stems.find((s) => s.x + STEM_WIDTH > state.birdX - BIRD_RADIUS);
  const aim = (stem ? stem.gapY : (state.top + state.groundY) / 2) + 45;
  // Where it will be by the next decision if it does not flap.
  const soon = state.birdY + state.vy * 0.1 + 0.5 * 1500 * 0.01;
  return soon > aim && state.vy > -FLAP_SPEED * 0.3 ? { tap: { x: context.arena.width / 2, y: context.arena.height / 2 } } : {};
}
