// Red light ("Một hai ba, đứng im!"): the child walks up a path toward the finish line while her finger is
// down and stands still when it lifts. The teddy bear at the line chants with its back turned, then turns its
// head (a warning) and looks: anyone still walking then is sent back three steps. The score is the steps won
// (net, never below zero); reaching the line is a lap, and the next lap the teddy turns quicker. Two friends
// play on the side lanes too (they only add life). Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

/** Steps from the start to the finish line. */
export const LAP_STEPS = 25;
/** Steps a second while walking. */
const WALK_RATE = 2.6;
export const PENALTY_STEPS = 3;
/** Seconds of looking before walking counts as caught (the child's finger needs a moment to lift). */
const GRACE = 0.15;
/** Seconds standing dazed after being caught (no second catch for the same slip). */
const DAZED = 0.9;
const CELEBRATE = 1.3;
const TURN_SECONDS = 0.45;
const TURN_BACK_SECONDS = 0.3;

export type FriendPhase = 'back' | 'turning' | 'looking' | 'turning-back';

export interface Walker {
  /** Steps from the start (0 … LAP_STEPS). */
  steps: number;
  walking: boolean;
  /** Seconds since last caught (large = long ago). */
  caughtAgo: number;
}

export interface Npc extends Walker {
  /** Seconds this friend is slow to stop when the teddy turns (some get caught). */
  lag: number;
}

export interface RedLightState {
  phase: FriendPhase;
  phaseTime: number;
  /** Length of the current phase. */
  phaseLength: number;
  player: Walker;
  npcs: Npc[];
  lap: number;
  /** Seconds since the last lap was finished (a celebration). */
  lapAgo: number;
  /** Layout: the path's centre x, the finish line's y and the start's y. */
  pathX: number;
  laneGap: number;
  finishY: number;
  startY: number;
  score: number;
  time: number;
}

export function createRedLight({ arena, params, rng }: GameSetup): MinigameLogic<RedLightState> {
  const turnFactor = typeof params.turnSpeed === 'number' ? Math.min(1.6, Math.max(0.6, params.turnSpeed)) : 1;
  const events = eventQueue();
  const state: RedLightState = {
    phase: 'back',
    phaseTime: 0,
    phaseLength: 2.6,
    player: { steps: 0, walking: false, caughtAgo: 99 },
    npcs: [
      { steps: 0, walking: false, caughtAgo: 99, lag: 0.1 },
      { steps: 0, walking: false, caughtAgo: 99, lag: 0.1 },
    ],
    lap: 0,
    lapAgo: 99,
    pathX: arena.width / 2,
    laneGap: Math.min(170, arena.width * 0.28),
    finishY: HUD_SAFE_TOP + 170,
    startY: arena.height - 100,
    score: 0,
    time: 0,
  };

  /** Seconds the teddy keeps its back turned: shorter every lap. */
  const backLength = (r: Rng): number => (r.range(1.8, 3.4) * Math.max(0.6, 1 - 0.15 * state.lap)) / turnFactor;

  const yOf = (steps: number): number => state.startY + (state.finishY - state.startY) * (steps / LAP_STEPS);

  function nextPhase(): void {
    state.phaseTime = 0;
    switch (state.phase) {
      case 'back':
        state.phase = 'turning';
        state.phaseLength = TURN_SECONDS;
        for (const npc of state.npcs) npc.lag = rng.chance(0.3) ? rng.range(0.5, 0.9) : rng.range(0.05, 0.3);
        break;
      case 'turning':
        state.phase = 'looking';
        state.phaseLength = rng.range(1.4, 2.2);
        events.push({ type: 'action', x: state.pathX, y: state.finishY - 70, note: 76, voice: 'whistle' });
        break;
      case 'looking':
        state.phase = 'turning-back';
        state.phaseLength = TURN_BACK_SECONDS;
        break;
      case 'turning-back':
        state.phase = 'back';
        state.phaseLength = backLength(rng);
        break;
    }
  }

  function catchWalker(w: Walker, x: number, isPlayer: boolean): void {
    w.steps = Math.max(0, w.steps - PENALTY_STEPS);
    w.caughtAgo = 0;
    w.walking = false;
    if (isPlayer) events.push({ type: 'hit', x, y: yOf(w.steps) });
  }

  /** Moves a walker; true when it was caught moving while the teddy looked. */
  function walk(w: Walker, wants: boolean, dt: number): boolean {
    w.caughtAgo += dt;
    w.walking = wants && w.caughtAgo >= DAZED;
    if (!w.walking) return false;
    w.steps = Math.min(LAP_STEPS, w.steps + WALK_RATE * dt);
    return state.phase === 'looking' && state.phaseTime >= GRACE;
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
      state.phaseTime += dt;
      state.lapAgo += dt;
      if (state.phaseTime >= state.phaseLength) nextPhase();

      const celebrating = state.lapAgo < CELEBRATE;
      const before = Math.floor(state.player.steps);
      if (!celebrating && walk(state.player, input.pointer !== null, dt)) catchWalker(state.player, state.pathX, true);
      else if (celebrating) state.player.walking = false;
      const after = Math.floor(state.player.steps);
      if (after > before && after % 3 === 0) events.push({ type: 'action', x: state.pathX, y: yOf(state.player.steps) + 50 });

      // The friends walk while the teddy's back is turned and stop a moment after it turns (some too late).
      state.npcs.forEach((npc, i) => {
        const wants = state.phase === 'back' || (state.phase === 'turning' && state.phaseTime < npc.lag) || (state.phase === 'looking' && state.phaseTime < npc.lag - TURN_SECONDS);
        if (walk(npc, wants, dt * (0.85 + 0.1 * i))) catchWalker(npc, 0, false);
        if (npc.steps >= LAP_STEPS) npc.steps = 0;
      });

      if (state.player.steps >= LAP_STEPS) {
        state.lap += 1;
        state.lapAgo = 0;
        state.player.steps = 0;
        events.push({ type: 'score', x: state.pathX, y: state.finishY, points: LAP_STEPS, note: 84, voice: 'bell' });
      }
      state.score = state.lap * LAP_STEPS + Math.floor(state.player.steps);
    },
  };
}

/** Good play: walk while the teddy's back is turned, stand still the moment its head starts to turn. */
export function redLightBot(state: RedLightState, context: BotContext): BotMove {
  const go = state.phase === 'back' && state.phaseLength - state.phaseTime > 0.05;
  return go ? { touch: { x: context.arena.width / 2, y: context.arena.height - 140 } } : {};
}
