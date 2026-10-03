// A round's rules shared by the screen and the bot harness: fixed steps, the clock, when it ends, whether it
// is won (`score >= goal`, as the server grades it) and the stars on the result card. The shop's boosters work
// here, the same for every game: more seconds are a longer `duration`; extra hearts (`extraLives`) let a game
// with hearts begin again once it runs out, the score so far kept, until those hearts are gone too.
import { MAX_MINIGAME_SCORE, type MinigameParams } from '@miu/schema/content';
import type { MinigameSpec } from '@miu/schema/minigame';
import type { MinigameModule, RunningGame } from './define-minigame';
import { createRng } from './rng';
import { ARENA_SHORT_SIDE, type Arena, type BotContext, type BotMove, type DrawView, type GameEvent, type GameInput } from './types';

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
  /** Hearts bought for this round ("Thêm một tim"); a game without hearts ignores them. */
  extraLives?: number;
}

/**
 * A game with hearts plus hearts from the shop. The HUD counts the extra ones from the start; when the game's
 * own run out it is started afresh (`revive`) with the score so far banked, shows only the extra hearts, and
 * is done once they are lost too.
 */
class ExtraLives implements RunningGame {
  private banked = 0;
  /** The revived game's own hearts when it began; null until then. */
  private base: number | null = null;
  private carried: GameEvent[] = [];

  constructor(
    private current: RunningGame,
    private readonly spare: number,
  ) {}

  get score(): number {
    return this.banked + this.current.score;
  }

  get lives(): number | null {
    const own = this.current.lives;
    if (own === null) return null;
    return this.base === null ? own + this.spare : Math.max(0, own - (this.base - this.extra));
  }

  get done(): boolean {
    return this.current.done || (this.base !== null && (this.current.lives ?? 0) <= this.base - this.extra);
  }

  /** The extra hearts in play after a revival: never more than the revived game has of its own. */
  private get extra(): number {
    return Math.min(this.spare, this.base ?? this.spare);
  }

  /** Out of its own hearts, with the extra ones still to use. */
  get needsRevival(): boolean {
    return this.base === null && this.spare > 0 && this.current.done && this.current.lives === 0;
  }

  revive(next: RunningGame, cheer: GameEvent): void {
    this.carried.push(...this.current.drainEvents(), cheer);
    this.banked += this.current.score;
    this.current = next;
    this.base = next.lives ?? 0;
  }

  step(dt: number, input: GameInput): void {
    this.current.step(dt, input);
  }

  drainEvents(): GameEvent[] {
    const out = [...this.carried, ...this.current.drainEvents()];
    this.carried = [];
    return out;
  }

  draw(ctx: CanvasRenderingContext2D, view: DrawView): void {
    this.current.draw(ctx, view);
  }

  bot(context: BotContext): BotMove {
    return this.current.bot(context);
  }
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

  /** Starts the game afresh for the seconds left (a revival with the shop's extra hearts). */
  private readonly restart: (seconds: number) => RunningGame;
  private readonly boosted: ExtraLives | null;
  private readonly arena: Arena;

  constructor(module: MinigameModule, setup: RoundSetup) {
    this.goal = setup.goal;
    this.duration = setup.duration;
    this.arena = setup.arena;
    this.totalSteps = Math.round(setup.duration / STEP_SECONDS);
    const start = (duration: number, seed: number): RunningGame => module.start({ arena: setup.arena, goal: setup.goal, duration, params: setup.params, rng: createRng(seed) });
    this.restart = (seconds) => start(seconds, setup.seed + 1);
    const first = start(setup.duration, setup.seed);
    this.boosted = setup.extraLives && first.lives !== null ? new ExtraLives(first, setup.extraLives) : null;
    this.game = this.boosted ?? first;
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
    if (this.boosted?.needsRevival && this.steps < this.totalSteps) {
      // A heart given back: a burst in the middle, then the game goes on from a fresh start.
      this.boosted.revive(this.restart(this.timeLeft), { type: 'score', x: this.arena.width / 2, y: this.arena.height / 2, points: 1 });
    }
    return this.game.drainEvents();
  }
}

/** Fixed steps due for a frame of `frameSeconds` with `carry` seconds left over from the last one. */
export function stepsForFrame(carry: number, frameSeconds: number): { steps: number; carry: number } {
  const total = carry + Math.min(Math.max(frameSeconds, 0), MAX_FRAME_SECONDS);
  const steps = Math.floor(total / STEP_SECONDS + 1e-9);
  return { steps, carry: total - steps * STEP_SECONDS };
}
