// Swim race: four swimmers race one length of the pool. The child swims by tapping in rhythm: a ring
// shrinks onto a goal ring once a beat, and a tap as they meet is a strong stroke that pushes her on. A
// tap between beats tires her for a moment (strokes do nothing then), so tapping wildly is slow; a steady
// rhythm wins. Points by place: first 5, second 3, third 2, fourth 1, and one more for a race without a
// single off-beat tap. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export interface Swimmer {
  /** 0 at the start wall, 1 at the finish. */
  progress: number;
  /** Lengths per second. */
  speed: number;
  /** Place on arrival (1–4), or 0 while still swimming. */
  place: number;
}

export interface SwimState {
  /** Layout: the pool's lanes and the rhythm rings. */
  poolLeft: number;
  poolRight: number;
  laneTop: number;
  laneH: number;
  ringX: number;
  ringY: number;
  child: Swimmer;
  rivals: Swimmer[];
  /** Seconds per beat and the time of the first one. */
  beat: number;
  firstBeat: number;
  /** Seconds of tiredness left, seconds since the last good stroke, and the last tap's verdict. */
  tired: number;
  strokeAgo: number;
  verdict: 'good' | 'off' | null;
  verdictAgo: number;
  offBeats: number;
  finishers: number;
  score: number;
  time: number;
}

/** Seconds early or late a stroke may be and still be on the beat. */
export const TOLERANCE = 0.14;
const TIRED_SECONDS = 0.8;
/** Distance a good stroke carries her (lengths), spread over the stroke by the water's drag. */
export const STROKE_LENGTH = 0.025;
const DRAG = 2.2;
/** Rivals' times for the length (s): the fastest is beaten only by a steady swimmer. */
const RIVAL_SECONDS = [26, 34, 40] as const;
export const PLACE_POINTS = [5, 3, 2, 1] as const;

/** Seconds from now to the nearest beat (negative: the beat just passed). */
export function toNearestBeat(state: SwimState): number {
  const since = state.time - state.firstBeat;
  if (since < -state.beat / 2) return -since;
  const k = Math.round(since / state.beat);
  return state.firstBeat + k * state.beat - state.time;
}

export function createSwimRace({ arena, params, rng }: GameSetup): MinigameLogic<SwimState> {
  const tempo = typeof params.tempo === 'number' ? Math.min(1.3, Math.max(0.7, params.tempo)) : 1;
  const events = eventQueue();
  const ringY = arena.height - 120;
  const laneTop = HUD_SAFE_TOP + 30;
  const laneH = Math.min(110, (ringY - 130 - laneTop) / 4);
  const swimmer = (seconds: number): Swimmer => ({ progress: 0, speed: 1 / (seconds * rng.range(0.97, 1.03)), place: 0 });
  const state: SwimState = {
    poolLeft: 70,
    poolRight: arena.width - 60,
    laneTop,
    laneH,
    ringX: arena.width / 2,
    ringY,
    child: { progress: 0, speed: 0, place: 0 },
    rivals: RIVAL_SECONDS.map(swimmer),
    beat: 0.6 / tempo,
    firstBeat: 1,
    tired: 0,
    strokeAgo: 9,
    verdict: null,
    verdictAgo: 9,
    offBeats: 0,
    finishers: 0,
    score: 0,
    time: 0,
  };
  const { child } = state;
  let lastStrokeBeat = -1;

  function arrive(s: Swimmer): void {
    state.finishers += 1;
    s.place = state.finishers;
    s.progress = 1;
    if (s === child) {
      state.score = (PLACE_POINTS[s.place - 1] ?? 1) + (state.offBeats === 0 ? 1 : 0);
      events.push({ type: 'score', x: state.poolRight - 40, y: state.laneTop + state.laneH * 0.5, points: state.score });
    }
  }

  function stroke(): void {
    const off = toNearestBeat(state);
    const beatIndex = Math.round((state.time + off - state.firstBeat) / state.beat);
    const onBeat = Math.abs(off) <= TOLERANCE && beatIndex !== lastStrokeBeat;
    if (onBeat && state.tired <= 0) {
      lastStrokeBeat = beatIndex;
      // A push that the water slows down, carrying her STROKE_LENGTH in all.
      child.speed += STROKE_LENGTH * DRAG;
      state.strokeAgo = 0;
      state.verdict = 'good';
      state.verdictAgo = 0;
      events.push({ type: 'action', x: state.ringX, y: state.ringY });
    } else if (!onBeat) {
      state.tired = TIRED_SECONDS;
      state.offBeats += 1;
      state.verdict = 'off';
      state.verdictAgo = 0;
      events.push({ type: 'miss', x: state.ringX, y: state.ringY });
    }
  }

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return child.place > 0;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.tired = Math.max(0, state.tired - dt);
      state.strokeAgo += dt;
      state.verdictAgo += dt;
      if (input.taps.length > 0 && child.place === 0) stroke();
      if (child.place === 0) {
        child.progress += child.speed * dt;
        child.speed *= Math.exp(-DRAG * dt);
        if (child.progress >= 1) arrive(child);
      }
      for (const r of state.rivals) {
        if (r.place > 0 || state.time < state.firstBeat) continue;
        r.progress += r.speed * dt;
        if (r.progress >= 1) arrive(r);
      }
    },
  };
}

/** Good play: a stroke on every beat (to the tenth of a second it decides on). */
export function swimRaceBot(state: SwimState, context: BotContext): BotMove {
  return Math.abs(toNearestBeat(state)) <= 0.06 && state.tired <= 0 ? { tap: { x: context.arena.width / 2, y: state.ringY } } : {};
}
