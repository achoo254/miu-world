// Quick draw: the child and the cat face each other under an unlit lantern. After a wait that is never the
// same twice, the lantern lights up red (a whistle): the first to tap wins the round. The cat answers a little
// faster every round. Tapping before the light is a foul and the round goes to the cat, and now and then a
// light bulb glints or a butterfly flits past first, to tempt an early tap. Eight rounds; the score is the
// rounds won. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export const ROUNDS = 8;
/** Seconds of waiting before the light, shortest and longest. */
const WAIT_MIN = 1.5;
const WAIT_MAX = 4;
/** The cat's reaction (seconds after the light) in the first and the last round. */
const CAT_FIRST = 0.75;
const CAT_LAST = 0.5;
/** Seconds the result stays on screen before the next round. */
const RESULT_SECONDS = 1.5;
/** Seconds a decoy shows. */
const DECOY_SECONDS = 0.7;

export type Phase = 'wait' | 'lit' | 'result';
export type RoundResult = 'win' | 'lose' | 'foul';
export type DecoyKind = 'bulb' | 'butterfly';

export interface Decoy {
  kind: DecoyKind;
  /** Seconds into the wait it appears. */
  at: number;
}

export interface QuickDrawState {
  phase: Phase;
  /** Rounds started so far (1 … ROUNDS) and how each finished one went. */
  round: number;
  results: RoundResult[];
  /** Seconds since the phase began. */
  phaseTime: number;
  /** This round's wait before the light, and the cat's reaction. */
  wait: number;
  catReact: number;
  decoy: Decoy | null;
  /** The child's reaction in the round just played (seconds), or null after a foul or a loss. */
  reaction: number | null;
  /** Layout. */
  lanternX: number;
  lanternY: number;
  childX: number;
  catX: number;
  groundY: number;
  finished: boolean;
  score: number;
  time: number;
}

export function createQuickDraw({ arena, params, rng }: GameSetup): MinigameLogic<QuickDrawState> {
  const catFactor = typeof params.catSpeed === 'number' ? Math.min(1.5, Math.max(0.6, params.catSpeed)) : 1;
  const events = eventQueue();
  const tall = arena.height > arena.width * 1.2;
  const state: QuickDrawState = {
    phase: 'wait',
    round: 0,
    results: [],
    phaseTime: 0,
    wait: 0,
    catReact: 0,
    decoy: null,
    reaction: null,
    lanternX: arena.width / 2,
    lanternY: tall ? Math.max(HUD_SAFE_TOP + 110, arena.height * 0.72 - 400) : HUD_SAFE_TOP + 110,
    childX: arena.width * (tall ? 0.24 : 0.22),
    catX: arena.width * (tall ? 0.76 : 0.78),
    groundY: tall ? arena.height * 0.72 : arena.height - 110,
    finished: false,
    score: 0,
    time: 0,
  };

  function startRound(): void {
    state.round += 1;
    state.phase = 'wait';
    state.phaseTime = 0;
    state.reaction = null;
    state.wait = rng.range(WAIT_MIN, WAIT_MAX);
    const progress = (state.round - 1) / (ROUNDS - 1);
    state.catReact = (CAT_FIRST + (CAT_LAST - CAT_FIRST) * progress + rng.range(-0.04, 0.04)) / catFactor;
    // From the second round on, a decoy now and then, well before the real light.
    state.decoy = state.round > 1 && state.wait > 2.2 && rng.chance(0.55) ? { kind: rng.chance(0.5) ? 'bulb' : 'butterfly', at: rng.range(0.6, state.wait - 1.2) } : null;
  }

  function finish(result: RoundResult): void {
    state.results.push(result);
    state.phase = 'result';
    state.phaseTime = 0;
    const mid = (state.childX + state.catX) / 2;
    if (result === 'win') {
      state.score += 1;
      events.push({ type: 'score', x: state.childX, y: state.groundY - 120, note: 79, voice: 'bell' });
    } else events.push({ type: 'miss', x: result === 'foul' ? state.childX : mid, y: state.groundY - 80 });
  }

  startRound();

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.finished;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.phaseTime += dt;
      const tapped = input.taps.length > 0;
      switch (state.phase) {
        case 'wait':
          if (tapped) finish('foul');
          else if (state.phaseTime >= state.wait) {
            state.phase = 'lit';
            state.phaseTime = 0;
            events.push({ type: 'action', x: state.lanternX, y: state.lanternY, note: 84, voice: 'whistle' });
          }
          break;
        case 'lit':
          if (tapped) {
            state.reaction = state.phaseTime;
            finish('win');
          } else if (state.phaseTime >= state.catReact) finish('lose');
          break;
        case 'result':
          if (state.phaseTime >= RESULT_SECONDS) {
            if (state.round >= ROUNDS) state.finished = true;
            else startRound();
          }
          break;
      }
    },
  };
}

/** Is the decoy showing right now? */
export function decoyShowing(state: QuickDrawState): boolean {
  const d = state.decoy;
  return state.phase === 'wait' && d !== null && state.phaseTime >= d.at && state.phaseTime < d.at + DECOY_SECONDS;
}

/** Good play: never before the light, then a quick tap (a fast child, about a quarter of a second). */
export function quickDrawBot(state: QuickDrawState, context: BotContext): BotMove {
  if (state.phase === 'lit' && state.phaseTime >= 0.15) return { tap: { x: context.arena.width / 2, y: context.arena.height * 0.7 } };
  return {};
}
