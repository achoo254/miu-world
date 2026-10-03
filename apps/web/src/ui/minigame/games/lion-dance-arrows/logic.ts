// Lion dance arrows: big arrows rise up a lane to a ring; when one is in the ring the child swipes its way
// (up, down, left, right) and the lion dances that step to a drum beat. Close to the beat is "perfect", a little
// off is "good" (two points and one). A wrong swipe or an arrow let past is a miss (the dance goes on). A swipe with no
// arrow near the ring is ignored. Forty arrows, a little closer together as the song goes on. Pure: no DOM,
// no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type SwipeDirection } from '../../types';

export const ARROWS = 40;
/** Seconds either side of the beat that count, and the tighter window called perfect. */
export const GOOD_WINDOW = 0.3;
export const PERFECT_WINDOW = 0.18;
/** Seconds an arrow takes from the bottom of the screen to the ring, at the start and at the end. */
const TRAVEL_START = 2.1;
const TRAVEL_END = 1.6;
const FIRST_BEAT = 2.2;
/** Beat length at the start and the end of the song; arrows come every one or two beats. */
const BEAT_START = 0.66;
const BEAT_END = 0.56;

export type Judgement = 'perfect' | 'good' | 'miss';

export interface Arrow {
  dir: SwipeDirection;
  /** When it reaches the ring (seconds into the round). */
  at: number;
  /** Seconds it takes to rise to the ring. */
  travel: number;
  judged: Judgement | null;
  /** When it was judged. */
  judgedAt: number;
}

export interface LionState {
  arrows: Arrow[];
  laneX: number;
  ringY: number;
  /** Where arrows appear (below the screen). */
  spawnY: number;
  lionX: number;
  lionY: number;
  /** The lion's latest step and when it danced it. */
  pose: SwipeDirection | null;
  poseAt: number;
  /** The last judgement shown by the ring, and when. */
  judgement: Judgement | null;
  judgementAt: number;
  combo: number;
  score: number;
  time: number;
}

const DIRS: readonly SwipeDirection[] = ['up', 'down', 'left', 'right'];
/** A drum for each step: low for down, high for up. */
const DRUM_NOTE: Readonly<Record<SwipeDirection, number>> = { down: 41, left: 45, right: 48, up: 52 };

export function createLionDance({ arena, params, rng }: GameSetup): MinigameLogic<LionState> {
  const tempo = typeof params.tempo === 'number' ? Math.min(1.3, Math.max(0.7, params.tempo)) : 1;
  const events = eventQueue();
  const wide = arena.width > arena.height;
  const state: LionState = {
    arrows: [],
    laneX: arena.width * (wide ? 0.34 : 0.3),
    ringY: HUD_SAFE_TOP + 90,
    spawnY: arena.height + 70,
    lionX: arena.width * (wide ? 0.72 : 0.7),
    lionY: wide ? arena.height * 0.58 : arena.height * 0.55,
    pose: null,
    poseAt: -9,
    judgement: null,
    judgementAt: -9,
    combo: 0,
    score: 0,
    time: 0,
  };

  // The song: arrows every one or two beats (two more often early on), never the same way three times running.
  let at = FIRST_BEAT;
  for (let i = 0; i < ARROWS; i += 1) {
    const progress = i / (ARROWS - 1);
    const beat = (BEAT_START + (BEAT_END - BEAT_START) * progress) / tempo;
    const last = state.arrows.at(-1);
    const before = state.arrows.at(-2);
    let dir = rng.pick(['up', 'down', 'left', 'right'] as const);
    if (last && before && last.dir === before.dir && dir === last.dir) dir = DIRS[(DIRS.indexOf(dir) + 1 + rng.int(0, 2)) % 4] ?? 'up';
    state.arrows.push({ dir, at, travel: (TRAVEL_START + (TRAVEL_END - TRAVEL_START) * progress) / tempo, judged: null, judgedAt: 0 });
    at += beat * (rng.chance(progress < 0.4 ? 0.75 : 0.45) ? 2 : 1);
  }

  function judge(arrow: Arrow, result: Judgement): void {
    arrow.judged = result;
    arrow.judgedAt = state.time;
    state.judgement = result;
    state.judgementAt = state.time;
    if (result === 'miss') {
      state.combo = 0;
      events.push({ type: 'miss', x: state.laneX, y: state.ringY });
      return;
    }
    const points = result === 'perfect' ? 2 : 1;
    state.score += points;
    state.combo += 1;
    state.pose = arrow.dir;
    state.poseAt = state.time;
    events.push({ type: 'score', x: state.laneX, y: state.ringY, points, note: DRUM_NOTE[arrow.dir], voice: 'drum' });
    // Every tenth in a row, a clap from the crowd.
    if (state.combo % 10 === 0) events.push({ type: 'action', x: state.lionX, y: state.lionY - 100, note: 60, voice: 'clap' });
  }

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      const last = state.arrows.at(-1);
      return last !== undefined && last.judged !== null && state.time > last.at + 1;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      for (const swipe of input.swipes) {
        const arrow = state.arrows.find((a) => a.judged === null && Math.abs(a.at - state.time) <= GOOD_WINDOW);
        if (!arrow) continue;
        if (swipe.direction !== arrow.dir) judge(arrow, 'miss');
        else judge(arrow, Math.abs(arrow.at - state.time) <= PERFECT_WINDOW ? 'perfect' : 'good');
      }
      for (const arrow of state.arrows) if (arrow.judged === null && state.time > arrow.at + GOOD_WINDOW) judge(arrow, 'miss');
    },
  };
}

/** An arrow's y on screen now (it rises at a steady speed to the ring at its beat, then on past it). */
export function arrowY(state: LionState, arrow: Arrow): number {
  return state.ringY + ((arrow.at - state.time) / arrow.travel) * (state.spawnY - state.ringY);
}

const SWIPE: Readonly<Record<SwipeDirection, { dx: number; dy: number }>> = {
  up: { dx: 0, dy: -120 },
  down: { dx: 0, dy: 120 },
  left: { dx: -120, dy: 0 },
  right: { dx: 120, dy: 0 },
};

/** Good play: swipes an arrow's way at the decision closest to its beat (decisions come ten times a second). */
export function lionDanceBot(state: LionState, context: BotContext): BotMove {
  const next = state.arrows.find((a) => a.judged === null);
  if (!next) return {};
  const lands = state.time + 1 / 60;
  if (Math.abs(next.at - lands) > 0.06) return {};
  const from = { x: context.arena.width / 2, y: context.arena.height * 0.6 };
  return { swipe: { from, ...SWIPE[next.dir] } };
}
