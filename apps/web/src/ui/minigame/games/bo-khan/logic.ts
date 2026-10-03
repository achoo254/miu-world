// Bỏ khăn (drop the handkerchief): friends sit in a ring and now and then look over their shoulder. The child
// holds a finger down to run round the outside of the ring with the handkerchief, and taps to drop it behind
// the friend she is passing. Dropped behind a friend who is looking, she is seen at once; behind one who is not,
// that friend notices after a moment and gives chase: get back to her own spot in the ring first (a point).
// Dropping it far from home gives the chaser time to catch up. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const FRIENDS = 6;
/** Seconds for a full lap while the finger is down. */
export const LAP_SECONDS = 4.2;
const RUN = (Math.PI * 2) / LAP_SECONDS;
/** The chaser is this much quicker. */
export const CHASE_FACTOR = 1.6;
/** A drop counts for the friend within this angle of the child. */
export const DROP_REACH = 0.32;
const NOTICE = [0.8, 1.2] as const;
const RESULT_SECONDS = 1.1;

export interface Friend {
  /** Progress round the ring from the child's spot (radians, 0–2π). */
  at: number;
  looking: boolean;
  /** Seconds left in this look or rest. */
  timer: number;
}

export type KhanPhase = 'run' | 'chased' | 'safe' | 'caught';

export interface BoKhanState {
  centre: Point;
  ring: number;
  track: number;
  friends: Friend[];
  /** The child's progress round from her spot (0 … 2π). */
  progress: number;
  /** The friend the handkerchief was dropped behind, and the chase. */
  dropped: number;
  noticeIn: number;
  chaser: number;
  phase: KhanPhase;
  phaseAgo: number;
  running: boolean;
  turns: number;
  score: number;
  time: number;
}

/** Screen point at `progress` round the ring at radius `r` (the child's spot is at the bottom). */
export const ringPoint = (state: Pick<BoKhanState, 'centre'>, progress: number, r: number): Point => ({
  x: state.centre.x + Math.cos(Math.PI / 2 + progress) * r,
  y: state.centre.y + Math.sin(Math.PI / 2 + progress) * r,
});

const friendAt = (k: number): number => ((k + 1) * Math.PI * 2) / (FRIENDS + 1);

export function createBoKhan({ arena, rng }: GameSetup): MinigameLogic<BoKhanState> {
  const events = eventQueue();
  const free = arena.height - HUD_SAFE_TOP;
  const ring = Math.min(arena.width, free) * 0.3;
  const state: BoKhanState = {
    centre: { x: arena.width / 2, y: HUD_SAFE_TOP + free * 0.5 },
    ring,
    track: ring + Math.min(80, ring * 0.45),
    friends: Array.from({ length: FRIENDS }, (_, k) => ({ at: friendAt(k), looking: false, timer: 0.5 + k * 0.3 })),
    progress: 0,
    dropped: -1,
    noticeIn: 0,
    chaser: 0,
    phase: 'run',
    phaseAgo: 0,
    running: false,
    turns: 0,
    score: 0,
    time: 0,
  };

  const restLength = (r: Rng): number => r.range(1.2, 2.8) / (1 + state.turns * 0.05);
  const lookLength = (r: Rng): number => r.range(0.7, 1.3);

  const endTurn = (phase: 'safe' | 'caught'): void => {
    state.phase = phase;
    state.phaseAgo = 0;
    const at = ringPoint(state, state.progress, state.track);
    if (phase === 'safe') {
      state.score += 1;
      events.push({ type: 'score', x: at.x, y: at.y });
    } else events.push({ type: 'hit', x: at.x, y: at.y });
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
      state.phaseAgo += dt;
      for (const f of state.friends) {
        f.timer -= dt;
        if (f.timer <= 0) {
          f.looking = !f.looking;
          f.timer = f.looking ? lookLength(rng) : restLength(rng);
        }
      }
      if (state.phase === 'safe' || state.phase === 'caught') {
        state.running = false;
        if (state.phaseAgo >= RESULT_SECONDS) {
          state.turns += 1;
          state.phase = 'run';
          state.phaseAgo = 0;
          state.progress = 0;
          state.dropped = -1;
        }
        return;
      }
      state.running = input.pointer !== null && input.holdTime > 0.05;
      if (state.running) state.progress += RUN * dt;

      if (state.phase === 'run') {
        if (state.progress >= Math.PI * 2) state.progress -= Math.PI * 2;
        if (input.taps.length > 0) {
          const k = state.friends.findIndex((f) => Math.abs(f.at - state.progress) <= DROP_REACH);
          const friend = state.friends[k];
          if (friend) {
            state.dropped = k;
            const at = ringPoint(state, friend.at, (state.ring + state.track) / 2);
            events.push({ type: 'action', x: at.x, y: at.y });
            if (friend.looking) endTurn('caught');
            else {
              state.phase = 'chased';
              state.phaseAgo = 0;
              state.noticeIn = rng.range(NOTICE[0], NOTICE[1]);
              state.chaser = friend.at;
            }
          }
        }
        return;
      }
      // Chased: the friend notices, then runs after her; home first is a point.
      if (state.noticeIn > 0) state.noticeIn -= dt;
      else state.chaser += RUN * CHASE_FACTOR * dt;
      if (state.progress >= Math.PI * 2) {
        state.progress = Math.PI * 2;
        endTurn('safe');
      } else if (state.noticeIn <= 0 && state.chaser >= state.progress - 0.05) endTurn('caught');
    },
  };
}

/** Good play: runs to the last two friends before home and drops behind one who is not looking (waiting if need be). */
export function boKhanBot(state: BoKhanState, _context: BotContext): BotMove {
  const finger = { x: state.centre.x, y: state.centre.y };
  if (state.phase === 'chased') return { touch: finger };
  if (state.phase !== 'run') return {};
  const targets = state.friends.slice(-2);
  const near = targets.find((f) => Math.abs(f.at - state.progress) <= DROP_REACH * 0.7);
  if (near && !near.looking) return { tap: finger };
  const last = targets[targets.length - 1];
  // At the last friend while it looks: wait (finger up) for it to turn back.
  if (last && Math.abs(last.at - state.progress) <= DROP_REACH * 0.7) return {};
  return { touch: finger };
}
