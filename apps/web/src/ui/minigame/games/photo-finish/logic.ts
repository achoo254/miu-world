// Photo finish: animals race in lanes to a finish line; it is close. Then the camera's photo of the moment the
// winner crossed comes up, and the child is asked who came in a place ("thứ 2"): nearer the line is earlier.
// Tapping the right lane is a point and the next race starts; a wrong one plays the finish again slowly (the
// photo comes back, nothing lost). More runners and later places as the round goes on. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import type { SpriteName } from '../../sprites';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export const RUNNERS: readonly SpriteName[] = ['rabbit', 'turtle', 'snail', 'cat', 'duck', 'chicken'];

export type Phase = 'race' | 'photo' | 'replay' | 'right';

export interface Runner {
  sprite: SpriteName;
  lane: number;
  /** Seconds from the start to the line. */
  finish: number;
  /** A little wobble in its pace (overtakes along the way), the same every replay. */
  wobble: number;
}

export interface PhotoState {
  phase: Phase;
  /** Race clock (seconds since the start of this race); runs slowly in a replay. */
  raceTime: number;
  inPhase: number;
  runners: Runner[];
  /** The place asked for (1 = first). */
  ask: number;
  startX: number;
  finishX: number;
  laneTop: number;
  laneHeight: number;
  /** The lane tapped wrongly last (a shake), or -1. */
  wrongLane: number;
  races: number;
  score: number;
  time: number;
}

/** Seconds of the finish replayed slowly after a wrong answer, and how slowly. */
const REPLAY_FROM = 0.7;
const REPLAY_PAST = 0.2;
const REPLAY_SPEED = 0.4;
const RIGHT_SECONDS = 0.7;
const AFTER_FINISH = 0.35;

/** Where a runner is at race time `t`: on the line at its finish time, wobbling a little on the way. */
export function runnerX(state: PhotoState, runner: Runner, t: number): number {
  const u = t / runner.finish;
  const f = u + runner.wobble * Math.sin(u * Math.PI * 2) * Math.max(0, 1 - u);
  return state.startX + (state.finishX - state.startX) * Math.max(0, f);
}

/** The moment the photo shows: the winner on the line. */
export const photoTime = (state: PhotoState): number => Math.min(...state.runners.map((r) => r.finish));

/** Runners from first to last. */
export const placings = (state: PhotoState): Runner[] => [...state.runners].sort((a, b) => a.finish - b.finish);

function shuffle<T>(items: T[], rng: Rng): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = rng.int(0, i);
    const a = items[i];
    const b = items[j];
    if (a !== undefined && b !== undefined) {
      items[i] = b;
      items[j] = a;
    }
  }
  return items;
}

export function createPhotoFinish({ arena, params, rng }: GameSetup): MinigameLogic<PhotoState> {
  const most = typeof params.runners === 'number' ? Math.round(Math.min(RUNNERS.length, Math.max(3, params.runners))) : 5;
  const events = eventQueue();
  const laneTop = HUD_SAFE_TOP + 70;
  const state: PhotoState = {
    phase: 'race',
    raceTime: 0,
    inPhase: 0,
    runners: [],
    ask: 1,
    startX: 70,
    finishX: arena.width - 110,
    laneTop,
    laneHeight: 90,
    wrongLane: -1,
    races: 0,
    score: 0,
    time: 0,
  };

  function newRace(): void {
    // As many lanes as fit at a comfortable tap height.
    const fit = Math.max(3, Math.floor((arena.height - laneTop - 40) / 84));
    const count = Math.min(most, fit, 3 + Math.floor(state.races / 3) + (state.races > 0 ? 1 : 0));
    const sprites = shuffle([...RUNNERS], rng).slice(0, count);
    // Close finishes, never a tie.
    const times: number[] = [];
    let t = rng.range(1.9, 2.3);
    for (let i = 0; i < count; i += 1) {
      times.push(t);
      t += rng.range(0.09, 0.22);
    }
    shuffle(times, rng);
    state.runners = sprites.map((sprite, lane) => ({ sprite, lane, finish: times[lane] ?? 2, wobble: rng.range(-0.03, 0.03) }));
    state.laneHeight = Math.min(120, (arena.height - laneTop - 40) / count);
    // First and second at first; any place later on.
    const top = Math.min(count, state.races < 2 ? 2 : state.races < 5 ? 3 : count);
    state.ask = rng.int(1, top);
    state.phase = 'race';
    state.raceTime = 0;
    state.inPhase = 0;
    state.wrongLane = -1;
    state.races += 1;
  }

  const laneAt = (y: number): number => {
    const lane = Math.floor((y - state.laneTop) / state.laneHeight);
    return lane >= 0 && lane < state.runners.length ? lane : -1;
  };

  newRace();

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
      state.inPhase += dt;
      const last = Math.max(...state.runners.map((r) => r.finish));
      switch (state.phase) {
        case 'race': {
          const before = state.raceTime;
          state.raceTime += dt;
          for (const r of state.runners) {
            if (before < r.finish && state.raceTime >= r.finish) events.push({ type: 'action', x: state.finishX, y: state.laneTop + (r.lane + 0.5) * state.laneHeight });
          }
          if (state.raceTime >= last + AFTER_FINISH) {
            state.phase = 'photo';
            state.inPhase = 0;
          }
          return;
        }
        case 'replay':
          state.raceTime += dt * REPLAY_SPEED;
          if (state.raceTime >= photoTime(state) + REPLAY_PAST) {
            state.phase = 'photo';
            state.inPhase = 0;
          }
          return;
        case 'right':
          if (state.inPhase >= RIGHT_SECONDS) newRace();
          return;
        case 'photo':
          for (const tap of input.taps) {
            const lane = laneAt(tap.y);
            if (lane < 0) continue;
            const y = state.laneTop + (lane + 0.5) * state.laneHeight;
            const wanted = placings(state)[state.ask - 1];
            if (wanted?.lane === lane) {
              state.score += 1;
              state.phase = 'right';
              state.inPhase = 0;
              events.push({ type: 'score', x: state.finishX, y });
            } else {
              state.wrongLane = lane;
              state.phase = 'replay';
              state.inPhase = 0;
              state.raceTime = photoTime(state) - REPLAY_FROM;
              events.push({ type: 'miss', x: state.finishX, y });
            }
            return;
          }
      }
    },
  };
}

/** Good play: reads the photo and taps the lane of the runner in the asked place. */
export function photoFinishBot(state: PhotoState, context: BotContext): BotMove {
  if (state.phase !== 'photo' || state.inPhase < 0.4) return {};
  const wanted = placings(state)[state.ask - 1];
  if (!wanted) return {};
  return { tap: { x: context.arena.width / 2, y: state.laneTop + (wanted.lane + 0.5) * state.laneHeight } };
}
