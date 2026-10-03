// Đánh khăng (tip-cat): a short stick lies across two bricks. The first tap flicks it up, spinning; the second
// tap swings the long stick at it. Hitting it right at the top of its flight sends it furthest (up to 30 m);
// the further from the top, the shorter; too early, too late or after it lands is a miss. Six turns; the score
// is the metres added up. Each flick goes a little higher or lower, so the top comes at a different moment
// every time. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export type Phase = 'ready' | 'air' | 'flight' | 'over';

export interface Hit {
  metres: number;
  /** 0 (missed) … 1 (right at the top). */
  quality: number;
}

export interface KhangState {
  phase: Phase;
  inPhase: number;
  /** The flick: upward speed and the moment of the top (seconds after the flick). */
  flick: number;
  apex: number;
  /** Height of the short stick above its bricks (units) while in the air. */
  height: number;
  hits: Hit[];
  turns: number;
  /** Where the stick rests and where the yard's 0 m line is (arena units), and units per metre. */
  base: { x: number; y: number };
  perMetre: number;
  score: number;
  time: number;
}

const GRAVITY = 1300;
/** Seconds either side of the top within which a hit still goes somewhere. */
export const HIT_WINDOW = 0.34;
export const MAX_METRES = 30;
const MIN_METRES = 6;
export const FLIGHT_SECONDS = 1.6;

/** Metres for a swing `error` seconds from the top (0 = a miss). */
export const metresFor = (error: number): number => {
  const q = Math.max(0, 1 - Math.abs(error) / HIT_WINDOW);
  return q > 0 ? Math.round(MIN_METRES + (MAX_METRES - MIN_METRES) * q) : 0;
};

export function createDanhKhang({ arena, params, rng }: GameSetup): MinigameLogic<KhangState> {
  const turns = typeof params.turns === 'number' ? Math.round(Math.min(10, Math.max(3, params.turns))) : 6;
  const events = eventQueue();
  const groundY = arena.height - 110;
  const state: KhangState = {
    phase: 'ready',
    inPhase: 0,
    flick: 0,
    apex: 0,
    height: 0,
    hits: [],
    turns,
    base: { x: Math.min(170, arena.width * 0.22), y: groundY },
    perMetre: (arena.width - Math.min(170, arena.width * 0.22) - 50) / MAX_METRES,
    score: 0,
    time: 0,
  };

  function swing(): void {
    const t = state.inPhase;
    const metres = t <= state.apex * 2 ? metresFor(t - state.apex) : 0;
    const quality = metres > 0 ? Math.max(0, 1 - Math.abs(t - state.apex) / HIT_WINDOW) : 0;
    state.hits.push({ metres, quality });
    state.score += metres;
    state.phase = 'flight';
    state.inPhase = 0;
    const at = { x: state.base.x, y: state.base.y - state.height };
    events.push(metres > 0 ? { type: 'score', x: at.x, y: at.y - 30, points: metres, note: 64 + Math.round(quality * 12), voice: 'drum' } : { type: 'miss', x: at.x, y: at.y });
  }

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.phase === 'over';
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.inPhase += dt;
      const tapped = input.taps.length > 0;
      switch (state.phase) {
        case 'ready':
          if (tapped) {
            state.flick = rng.range(560, 760);
            state.apex = state.flick / GRAVITY;
            state.phase = 'air';
            state.inPhase = 0;
            events.push({ type: 'action', x: state.base.x, y: state.base.y, note: 72, voice: 'clap' });
          }
          return;
        case 'air': {
          const t = state.inPhase;
          state.height = Math.max(0, state.flick * t - (GRAVITY * t * t) / 2);
          if (tapped) swing();
          else if (t > state.apex * 2 + 0.25) {
            // It came down without a swing: a miss.
            state.hits.push({ metres: 0, quality: 0 });
            state.phase = 'flight';
            state.inPhase = 0;
            events.push({ type: 'miss', x: state.base.x, y: state.base.y });
          }
          return;
        }
        case 'flight':
          if (state.inPhase >= FLIGHT_SECONDS) {
            state.height = 0;
            state.phase = state.hits.length >= state.turns ? 'over' : 'ready';
            state.inPhase = 0;
          }
          return;
        case 'over':
          return;
      }
    },
  };
}

/** Good play: flicks straight away, then swings at the top (it sees the stick slow down, like a child). */
export function danhKhangBot(state: KhangState, context: BotContext): BotMove {
  const at = { x: context.arena.width / 2, y: Math.max(HUD_SAFE_TOP + 100, context.arena.height / 2) };
  if (state.phase === 'ready' && state.inPhase > 0.4) return { tap: at };
  if (state.phase === 'air' && state.inPhase >= state.apex - 0.05) return { tap: at };
  return {};
}
