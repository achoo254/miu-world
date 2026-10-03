// Spinning top (đánh quay): the child flicks a wooden top into the chalk ring (a swipe toward it). It spins,
// slows down and starts to wobble; a tap while it wobbles whips it with the string and it spins hard again. A
// tap while it still spins strongly knocks it over, and so does letting it slow to a stop: a top lost, three in
// all. A throw that lands outside the ring just rolls back to the hand. Every second a top spins is a point.
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export type Phase = 'ready' | 'flying' | 'spinning' | 'fallen' | 'missed';

export interface TopState {
  phase: Phase;
  phaseTime: number;
  /** Spin left, 0–100; below WOBBLE the top wobbles and can be whipped. */
  spin: number;
  top: Point;
  from: Point;
  to: Point;
  ring: Point & { r: number };
  hand: Point;
  spinning: number;
  lives: number;
  /** When the top was last whipped (the string flicks). */
  whippedAt: number;
  score: number;
  time: number;
}

export const WOBBLE = 40;
const FLY_SECONDS = 0.45;
const FALLEN_PAUSE = 1.0;
const THROW_SCALE = 1.6;
const LIVES = 3;

export function createSpinningTop({ arena, duration }: GameSetup): MinigameLogic<TopState> {
  const events = eventQueue();
  const ring = { x: arena.width / 2, y: HUD_SAFE_TOP + (arena.height - HUD_SAFE_TOP) * 0.4, r: Math.min(150, arena.width * 0.22) };
  const hand = { x: arena.width / 2, y: arena.height - 70 };
  const state: TopState = { phase: 'ready', phaseTime: 0, spin: 0, top: { ...hand }, from: hand, to: hand, ring, hand, spinning: 0, lives: LIVES, whippedAt: -9, score: 0, time: 0 };

  function setPhase(phase: Phase): void {
    state.phase = phase;
    state.phaseTime = 0;
  }

  function fall(): void {
    state.lives -= 1;
    setPhase('fallen');
    events.push({ type: 'hit', ...state.top });
  }

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.lives <= 0 && state.phase !== 'fallen';
    },
    get lives() {
      return state.lives;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.phaseTime += dt;
      switch (state.phase) {
        case 'ready': {
          const swipe = input.swipes[0];
          if (!swipe) return;
          state.from = { ...hand };
          state.to = { x: hand.x + swipe.dx * THROW_SCALE, y: hand.y + swipe.dy * THROW_SCALE };
          setPhase('flying');
          events.push({ type: 'action', ...hand });
          return;
        }
        case 'flying': {
          const t = Math.min(1, state.phaseTime / FLY_SECONDS);
          state.top = { x: state.from.x + (state.to.x - state.from.x) * t, y: state.from.y + (state.to.y - state.from.y) * t };
          if (t < 1) return;
          if (Math.hypot(state.to.x - ring.x, state.to.y - ring.y) <= ring.r) {
            state.spin = 100;
            setPhase('spinning');
          } else {
            setPhase('missed');
            events.push({ type: 'miss', ...state.top });
          }
          return;
        }
        case 'missed':
          if (state.phaseTime >= 0.6) {
            state.top = { ...hand };
            setPhase('ready');
          }
          return;
        case 'fallen':
          if (state.phaseTime >= FALLEN_PAUSE) {
            state.top = { ...hand };
            setPhase('ready');
          }
          return;
        case 'spinning':
          break;
      }
      // It slows a little faster as the round goes on.
      state.spin -= (10 + 3 * Math.min(1, state.time / duration)) * dt;
      // A short settle after landing: taps are not read yet.
      if (input.taps.length > 0 && state.phaseTime > 0.4) {
        if (state.spin < WOBBLE) {
          state.spin = 100;
          state.whippedAt = state.time;
          events.push({ type: 'action', ...state.top, note: 79, voice: 'clap' });
        } else {
          fall();
          return;
        }
      }
      if (state.spin <= 0) {
        fall();
        return;
      }
      const before = Math.floor(state.spinning);
      state.spinning += dt;
      if (Math.floor(state.spinning) > before) {
        state.score = Math.floor(state.spinning);
        events.push({ type: 'score', x: state.top.x, y: state.top.y - 60 });
      }
    },
  };
}

/** Good play: flicks the top to the ring's middle, whips it once it wobbles. */
export function spinningTopBot(state: TopState, _context: BotContext): BotMove {
  if (state.phase === 'ready' && state.phaseTime > 0.3) {
    return { swipe: { from: state.hand, dx: (state.ring.x - state.hand.x) / THROW_SCALE, dy: (state.ring.y - state.hand.y) / THROW_SCALE } };
  }
  if (state.phase === 'spinning' && state.phaseTime > 0.45 && state.spin < WOBBLE - 6) return { tap: state.top };
  return {};
}
