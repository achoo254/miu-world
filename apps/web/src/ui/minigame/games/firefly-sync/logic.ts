// Firefly sync: a cloud of fireflies over the forest flashes together on a beat that slowly drifts faster and
// slower; a ring closing in on the swarm shows the next flash coming. The child taps to flash her lantern:
// a flash with the swarm's (a little early or late is fine) brings one firefly over to her. A flash off the beat
// startles the swarm, so the next flash brings nobody (nothing is lost). Tapping all the time is always off the
// beat somewhere, so it brings nobody. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

/** The beat drifts between these periods (seconds). */
const PERIOD_MID = 0.95;
const PERIOD_SWING = 0.17;
const DRIFT_SECONDS = 17;
const FIRST_FLASH = 1.5;

export interface FireflyState {
  /** Phase of the beat (a flash at every whole number). */
  phase: number;
  period: number;
  lastFlash: number;
  nextFlash: number;
  /** The last flash already brought a firefly (or was answered off the beat). */
  lastTaken: boolean;
  nextTaken: boolean;
  /** The swarm is startled until this time: a flash before it brings nobody. */
  calmAt: number;
  /** Seconds since the child's lantern last flashed, and whether that was on the beat. */
  lanternAgo: number;
  lanternOn: boolean;
  swarm: Point;
  lantern: Point;
  window: number;
  flashes: number;
  score: number;
  time: number;
}

export const periodAt = (t: number): number => PERIOD_MID + PERIOD_SWING * Math.sin((t / DRIFT_SECONDS) * Math.PI * 2);

export function createFireflySync({ arena, params }: GameSetup): MinigameLogic<FireflyState> {
  const window = typeof params.window === 'number' ? Math.min(0.25, Math.max(0.08, params.window)) : 0.16;
  const events = eventQueue();
  const state: FireflyState = {
    phase: -FIRST_FLASH / PERIOD_MID,
    period: PERIOD_MID,
    lastFlash: -9,
    nextFlash: FIRST_FLASH,
    lastTaken: true,
    nextTaken: false,
    calmAt: 0,
    lanternAgo: 9,
    lanternOn: false,
    swarm: { x: arena.width / 2, y: HUD_SAFE_TOP + Math.min(170, (arena.height - HUD_SAFE_TOP) * 0.28) },
    lantern: { x: arena.width / 2, y: arena.height - 110 },
    window,
    flashes: 0,
    score: 0,
    time: 0,
  };

  function tap(): void {
    state.lanternAgo = 0;
    const late = state.time - state.lastFlash;
    const early = state.nextFlash - state.time;
    const onLast = late <= window && !state.lastTaken;
    const onNext = early <= window && !state.nextTaken;
    if (onLast || onNext) {
      if (onLast) state.lastTaken = true;
      else state.nextTaken = true;
      state.lanternOn = true;
      if (state.time >= state.calmAt) {
        state.score += 1;
        events.push({ type: 'score', x: state.lantern.x, y: state.lantern.y - 60, note: 84, voice: 'bell' });
      } else {
        events.push({ type: 'action', x: state.lantern.x, y: state.lantern.y - 40, note: 72, voice: 'bell' });
      }
      return;
    }
    // Off the beat: the swarm is startled through its next flash.
    state.lanternOn = false;
    state.calmAt = state.nextFlash + window;
    events.push({ type: 'action', x: state.lantern.x, y: state.lantern.y - 40 });
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
      state.lanternAgo += dt;
      state.period = periodAt(state.time);
      const before = state.phase;
      state.phase += dt / state.period;
      if (Math.floor(state.phase) > Math.floor(before) && state.phase >= 0) {
        state.lastFlash = state.time;
        state.lastTaken = state.nextTaken;
        state.nextTaken = false;
        state.flashes += 1;
        events.push({ type: 'miss', x: state.swarm.x, y: state.swarm.y, note: 79, voice: 'bell' });
      }
      state.nextFlash = state.time + (Math.max(0, Math.ceil(state.phase + 1e-9)) - state.phase) * state.period;
      if (input.taps.length > 0) tap();
    },
  };
}

/** Good play: watches the ring and taps right on the swarm's flash. */
export function fireflySyncBot(state: FireflyState, context: BotContext): BotMove {
  const early = state.nextFlash - state.time;
  const late = state.time - state.lastFlash;
  const at = { x: context.arena.width / 2, y: context.arena.height - 120 };
  if (early <= 0.1 && !state.nextTaken) return { tap: at };
  if (late <= 0.06 && !state.lastTaken) return { tap: at };
  return {};
}
