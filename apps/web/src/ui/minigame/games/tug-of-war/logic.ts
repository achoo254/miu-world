// Tug of war: the child's team holds the left end of a rope, a team of animal friends the right end. Every tap
// pulls; a tap right on the shout ("DÔ!" … "TA!", with a drum beat) pulls twice as hard. The other team pulls
// steadily, with a heave now and then. The red ribbon reaching the child's line wins the bout (a point); the
// other line loses it. A bout lasts at most fifteen seconds (then whoever is ahead wins). After each bout won,
// a stronger team steps up. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { BotContext, BotMove, GameInput, GameSetup, MinigameLogic } from '../../types';

export interface TugState {
  /** Where the ribbon is: -1 on the child's line (she wins), +1 on the other line. */
  ribbon: number;
  speed: number;
  /** The other team's pull now, and seconds left of a heave. */
  pull: number;
  heave: number;
  nextHeave: number;
  /** Seconds since the bout started, and since the last shout. */
  boutTime: number;
  beat: number;
  /** Shouts so far this round ("DÔ" on even, "TA" on odd). */
  shouts: number;
  /** Seconds since the child's last tap, and whether it was on the shout. */
  tapAgo: number;
  onBeat: boolean;
  /** The last bout: won or lost, and seconds since (-1 while pulling). */
  result: 'won' | 'lost' | null;
  resultAgo: number;
  level: number;
  bouts: number;
  score: number;
  time: number;
}

export const BEAT = 0.75;
/** A tap this close to a shout is on the beat. */
export const BEAT_WINDOW = 0.15;
export const TAP_PULL = 0.16;
const DAMPING = 2.2;
const BASE_PULL = 0.52;
const LEVEL_STEP = 1.15;
const HEAVE = 0.5;
const BOUT_SECONDS = 15;
const REST_SECONDS = 1.6;

/** How far the nearest shout is from `time` (seconds). */
export const offBeat = (time: number): number => {
  const phase = time % BEAT;
  return Math.min(phase, BEAT - phase);
};

export function createTugOfWar({ params, rng }: GameSetup): MinigameLogic<TugState> {
  const factor = typeof params.strength === 'number' ? Math.min(1.5, Math.max(0.6, params.strength)) : 1;
  const events = eventQueue();
  const state: TugState = {
    ribbon: 0,
    speed: 0,
    pull: BASE_PULL * factor,
    heave: 0,
    nextHeave: 2.5,
    boutTime: 0,
    beat: 0,
    shouts: 0,
    tapAgo: 9,
    onBeat: false,
    result: null,
    resultAgo: 0,
    level: 0,
    bouts: 0,
    score: 0,
    time: 0,
  };

  const finish = (won: boolean): void => {
    state.result = won ? 'won' : 'lost';
    state.resultAgo = 0;
    state.bouts += 1;
    if (won) {
      state.score += 1;
      state.level += 1;
      events.push({ type: 'score', x: 120, y: 300 });
    } else events.push({ type: 'miss', x: 600, y: 300 });
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
      state.tapAgo += dt;
      // The shouts keep their rhythm through rests too, so the child can find the beat.
      state.beat = state.time % BEAT;
      if (Math.floor(state.time / BEAT) > Math.floor((state.time - dt) / BEAT)) {
        state.shouts += 1;
        events.push({ type: 'action', x: -300, y: -300, note: state.shouts % 2 === 1 ? 45 : 52, voice: 'drum' });
      }
      if (state.result) {
        state.resultAgo += dt;
        if (state.resultAgo >= REST_SECONDS) {
          Object.assign(state, { result: null, ribbon: 0, speed: 0, boutTime: 0, heave: 0, nextHeave: rng.range(1.8, 3.2) });
          state.pull = BASE_PULL * factor * LEVEL_STEP ** state.level;
        }
        return;
      }
      state.boutTime += dt;
      // Every finger down is one pull.
      if (input.pressed) {
        state.onBeat = offBeat(state.time) <= BEAT_WINDOW;
        state.tapAgo = 0;
        state.speed -= TAP_PULL * (state.onBeat ? 2 : 1);
      }
      state.nextHeave -= dt;
      if (state.nextHeave <= 0) {
        state.heave = 0.6;
        state.nextHeave = rng.range(2, 3.4);
      }
      state.heave = Math.max(0, state.heave - dt);
      state.speed += state.pull * (state.heave > 0 ? 1 + HEAVE : 1) * dt;
      state.speed *= Math.exp(-DAMPING * dt);
      state.ribbon += state.speed * dt;
      if (state.ribbon <= -1) finish(true);
      else if (state.ribbon >= 1) finish(false);
      else if (state.boutTime >= BOUT_SECONDS) finish(state.ribbon < 0);
    },
  };
}

/** Good play: a tap on every decision, which catches most shouts too (like a child tapping fast). */
export function tugOfWarBot(state: TugState, context: BotContext): BotMove {
  if (state.result) return {};
  return { tap: { x: context.arena.width / 2, y: context.arena.height - 120 } };
}
