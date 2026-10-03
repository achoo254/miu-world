// A round's rules shared by the screen and the bot harness: fixed steps, the clock, when it ends, whether it
// is won (`score >= goal`, as the server grades it) and the stars on the result card.
import { MAX_MINIGAME_SCORE, type MinigameParams } from '@miu/schema/content';
import type { MinigameSpec } from '@miu/schema/minigame';
import type { MinigameModule, RunningGame } from './define-minigame';
import { createRng } from './rng';
import { ARENA_SHORT_SIDE, type Arena, type GameEvent, type GameInput } from './types';

/** Every game steps at 60 Hz, whatever the screen's refresh rate. */
export const STEP_SECONDS = 1 / 60;
/** A frame longer than this (a hitch, a tab coming back) is cut short instead of fast-forwarding the round. */
const MAX_FRAME_SECONDS = 0.25;

export interface RoundSetup {
  arena: Arena;
  goal: number;
  duration: number;
  params: MinigameParams;
  seed: number;
}

/** The arena for a play area of this many CSS pixels, and how many CSS pixels one arena unit is. */
export function arenaFor(cssWidth: number, cssHeight: number): { arena: Arena; pxPerUnit: number } {
  const pxPerUnit = Math.max(1, Math.min(cssWidth, cssHeight)) / ARENA_SHORT_SIDE;
  return { arena: { width: Math.max(1, cssWidth) / pxPerUnit, height: Math.max(1, cssHeight) / pxPerUnit }, pxPerUnit };
}

/** The screens every game is tested and reviewed on: iPad both ways and a phone. */
export const REFERENCE_SCREENS = [
  { name: 'ipad-landscape', width: 1180, height: 820 },
  { name: 'ipad-portrait', width: 820, height: 1180 },
  { name: 'phone', width: 390, height: 844 },
] as const;

/** The game file's defaults with the quest step's own values on top. */
export const roundParams = (spec: MinigameSpec, step: MinigameParams = {}): MinigameParams => ({ ...spec.params, ...step });

/** Stars for a score: one at the goal, two at 1.4×, three at 1.8× (none short of the goal). */
export function starsFor(score: number, goal: number): 0 | 1 | 2 | 3 {
  if (score < goal) return 0;
  if (score >= Math.ceil(goal * 1.8)) return 3;
  if (score >= Math.ceil(goal * 1.4)) return 2;
  return 1;
}

export class MinigameRound {
  readonly game: RunningGame;
  readonly goal: number;
  readonly duration: number;
  /** Fixed steps played (counted, not summed, so the clock never drifts). */
  private steps = 0;
  private readonly totalSteps: number;

  constructor(module: MinigameModule, setup: RoundSetup) {
    this.goal = setup.goal;
    this.duration = setup.duration;
    this.totalSteps = Math.round(setup.duration / STEP_SECONDS);
    this.game = module.start({ arena: setup.arena, goal: setup.goal, duration: setup.duration, params: setup.params, rng: createRng(setup.seed) });
  }

  /** The score as sent: a whole number in the server's range, whatever the game counts. */
  get score(): number {
    return Math.min(MAX_MINIGAME_SCORE, Math.max(0, Math.floor(this.game.score)));
  }

  /** Seconds played. */
  get elapsed(): number {
    return this.steps * STEP_SECONDS;
  }

  get finished(): boolean {
    return this.game.done || this.steps >= this.totalSteps;
  }

  get won(): boolean {
    return this.score >= this.goal;
  }

  get timeLeft(): number {
    return Math.max(0, this.duration - this.elapsed);
  }

  /** One fixed step; returns what happened in it. Nothing moves once the round is over. */
  step(input: GameInput): GameEvent[] {
    if (this.finished) return [];
    this.game.step(STEP_SECONDS, input);
    this.steps += 1;
    return this.game.drainEvents();
  }
}

/** Fixed steps due for a frame of `frameSeconds` with `carry` seconds left over from the last one. */
export function stepsForFrame(carry: number, frameSeconds: number): { steps: number; carry: number } {
  const total = carry + Math.min(Math.max(frameSeconds, 0), MAX_FRAME_SECONDS);
  const steps = Math.floor(total / STEP_SECONDS + 1e-9);
  return { steps, carry: total - steps * STEP_SECONDS };
}
