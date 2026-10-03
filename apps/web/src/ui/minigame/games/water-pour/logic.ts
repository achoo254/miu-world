// Water pour: a teapot hangs over a glass cup with a green band marked on it. Holding the finger down tips the
// pot and tea pours; letting go tips it back (a last drop still falls). When the pot is upright the cup is
// looked at: tea inside the band is a point and the next cup comes; too little waits for more; too much (but
// not over the brim) goes away without a point; over the brim spills and costs one of three hearts. Each cup
// gets a pot that pours slow, medium or fast (a snail, a turtle, a rabbit on its side). Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export type PotSpeed = 'slow' | 'medium' | 'fast';
export type CupResult = 'right' | 'over' | 'spill';

export interface WaterPourState {
  potSpeed: PotSpeed;
  /** Share of the cup filled per second of full pouring. */
  rate: number;
  /** 0 upright, 1 fully tipped. */
  tilt: number;
  /** Tea in the cup, 0 empty to 1 at the brim. */
  level: number;
  /** The band to fill to. */
  low: number;
  high: number;
  /** Seconds the pot has been upright with tea in the cup (the cup is judged after SETTLE). */
  settle: number;
  /** How the last cup went, and seconds since (the cup slides away, a new one comes). */
  result: CupResult | null;
  resultAgo: number;
  /** A cup judged too low: a hint to pour a little more. */
  short: boolean;
  cupX: number;
  cupBottom: number;
  cupHeight: number;
  potX: number;
  potY: number;
  lives: number;
  cups: number;
  score: number;
  time: number;
}

const FILL_SECONDS: Record<PotSpeed, number> = { slow: 3.4, medium: 2.3, fast: 1.6 };
const TILT_SPEED = 6;
/** Tea flows once the pot is tipped past this. */
const FLOW_FROM = 0.4;
const SETTLE = 0.6;
const NEXT_SECONDS = 0.9;
const BAND = 0.13;
const LIVES = 3;

/** How much of the pot's full flow comes out at this tilt. */
export const flowAt = (tilt: number): number => Math.max(0, (tilt - FLOW_FROM) / (1 - FLOW_FROM));

/** Tea still to come out after letting go at this tilt (the pot tips back at TILT_SPEED). */
export const afterPour = (tilt: number, rate: number): number => (rate * flowAt(tilt) * ((tilt - FLOW_FROM) / TILT_SPEED)) / 2;

function nextCup(rng: Rng, state: WaterPourState, factor: number): void {
  state.potSpeed = rng.pick(['slow', 'medium', 'fast'] as const);
  state.rate = factor / FILL_SECONDS[state.potSpeed];
  state.low = rng.range(0.5, 0.74);
  state.high = state.low + BAND;
  Object.assign(state, { level: 0, settle: 0, result: null, short: false });
}

export function createWaterPour({ arena, params, rng }: GameSetup): MinigameLogic<WaterPourState> {
  const factor = typeof params.speed === 'number' ? Math.min(1.4, Math.max(0.6, params.speed)) : 1;
  const events = eventQueue();
  const cupHeight = Math.min(220, (arena.height - HUD_SAFE_TOP) * 0.36);
  const cupBottom = arena.height - Math.max(90, (arena.height - HUD_SAFE_TOP) * 0.18);
  const state: WaterPourState = {
    potSpeed: 'medium',
    rate: 1 / 2.3,
    tilt: 0,
    level: 0,
    low: 0.6,
    high: 0.73,
    settle: 0,
    result: null,
    resultAgo: 9,
    short: false,
    cupX: arena.width / 2 + 40,
    cupBottom,
    cupHeight,
    potX: arena.width / 2 - 70,
    potY: Math.max(HUD_SAFE_TOP + 90, cupBottom - cupHeight - 170),
    lives: LIVES,
    cups: 0,
    score: 0,
    time: 0,
  };
  nextCup(rng, state, factor);

  const finish = (result: CupResult): void => {
    state.result = result;
    state.resultAgo = 0;
    state.cups += 1;
    const y = state.cupBottom - state.cupHeight * state.level;
    if (result === 'right') {
      state.score += 1;
      events.push({ type: 'score', x: state.cupX, y });
    } else if (result === 'spill') {
      state.lives -= 1;
      events.push({ type: 'hit', x: state.cupX, y: state.cupBottom - state.cupHeight });
    } else events.push({ type: 'miss', x: state.cupX, y });
  };

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
      if (state.result) {
        state.resultAgo += dt;
        state.tilt = Math.max(0, state.tilt - TILT_SPEED * dt);
        if (state.resultAgo >= NEXT_SECONDS) nextCup(rng, state, factor);
        return;
      }
      const holding = input.pointer !== null;
      state.tilt = Math.min(1, Math.max(0, state.tilt + (holding ? TILT_SPEED : -TILT_SPEED) * dt));
      const pour = flowAt(state.tilt) * state.rate * dt;
      if (pour > 0) {
        state.level += pour;
        state.settle = 0;
        state.short = false;
        if (state.level > 1) {
          state.level = 1;
          finish('spill');
          return;
        }
      }
      if (state.tilt === 0 && state.level > 0) {
        state.settle += dt;
        if (state.settle >= SETTLE && !state.short) {
          if (state.level > state.high) finish('over');
          else if (state.level >= state.low) finish('right');
          else state.short = true;
        }
      }
    },
  };
}

/** Good play: pour until the tea (with what still falls after letting go) reaches the middle of the band. */
export function waterPourBot(state: WaterPourState, context: BotContext): BotMove {
  if (state.result) return {};
  const aim = (state.low + state.high) / 2;
  // What another tenth of a second of pouring would add, half of it: let go on the closer side of the aim.
  const coming = state.level + afterPour(state.tilt, state.rate) + state.rate * flowAt(state.tilt) * 0.05;
  return coming >= aim ? {} : { touch: { x: context.arena.width / 2, y: context.arena.height - 60 } };
}
