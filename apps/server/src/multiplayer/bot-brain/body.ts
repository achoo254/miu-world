// A companion bot's walking life on one map: it asks its chooser what to do whenever it stands free, walks there on
// its own feet (stepper.ts), plans its way through the server's plan queue, and stays a while where it arrives.
// Greeting a player, visiting a friend and everything social stay with the runner, which pauses or steers the body.
import type { WalkPlace } from '@miu/voxel/walk-cells';
import type { LocalPlanner, PathGoal } from './local-path';
import { Stepper, type StepEvent } from './stepper';
import type { BotView, Choice, GoalChooser, Outcome } from './wander';
import type { Spot, WalkMap } from './walk-store';

export type BodyMode = 'walk' | 'work' | 'rest' | 'ride';

export interface BodyOptions {
  map: WalkMap;
  /** Where it starts: a standing spot of `map`. */
  home: Spot;
  pace: { speed: number; sight: number };
  chooser: GoalChooser;
  planner: LocalPlanner;
  /** Queues a plan (the runner's queue; at most one waits per bot). */
  requestPlan(run: () => void): void;
  /** Milliseconds. */
  now(): number;
}

export class BotBody {
  readonly stepper: Stepper;
  private readonly options: BodyOptions;
  private modeNow: BodyMode = 'rest';
  private waitS = 0;
  /** The place it is walking to (null: a direction, or a friend). */
  private target: WalkPlace | null = null;
  private stop: WalkPlace | null = null;

  constructor(options: BodyOptions) {
    this.options = options;
    this.stepper = new Stepper(options.map, options.home, options.pace);
    this.decide({ kind: 'start' });
  }

  get mode(): BodyMode {
    return this.modeNow;
  }

  /** What its chooser may know: where it is, its home and how far it sees. */
  get view(): BotView {
    const { map, home, pace } = this.options;
    return { map, at: this.stepper.spot, home, sight: pace.sight };
  }

  /** Walks to `goal` now (a friend it visits), whatever it was doing. */
  goTo(goal: PathGoal): void {
    this.target = null;
    this.modeNow = 'walk';
    this.stepper.go(goal, this.options.now());
  }

  /** Lives on for `dt` seconds. */
  tick(dt: number): void {
    // Staying a while, it still finishes the step it was taking.
    const event = this.stepper.step(dt);
    if (this.modeNow === 'work' || this.modeNow === 'rest') {
      this.waitS -= dt;
      if (this.waitS <= 0) this.decide({ kind: 'rested' });
    } else {
      this.after(event);
    }
    const { requestPlan, planner, now } = this.options;
    if (this.stepper.wantsPlan(now())) requestPlan(() => this.stepper.plan(planner, now()));
  }

  private after(event: StepEvent): void {
    if (event === 'arrived') this.decide({ kind: 'arrived', place: this.target });
    else if (event === 'stuck') this.decide({ kind: 'stuck' });
    else if (event === 'rode' && this.stop) this.decide({ kind: 'rode', stop: this.stop });
  }

  private decide(last: Outcome): void {
    this.apply(this.options.chooser.next(this.view, last));
  }

  private apply(choice: Choice): void {
    this.target = null;
    if (choice.kind === 'go') {
      this.target = choice.place;
      this.modeNow = 'walk';
      this.stepper.go(choice.goal, this.options.now());
      return;
    }
    if (choice.kind === 'ride') {
      this.stop = choice.stop;
      this.modeNow = 'ride';
      this.stepper.rideTo(choice.to);
      if (!this.stepper.riding) this.decide({ kind: 'rested' });
      return;
    }
    this.modeNow = choice.kind;
    this.waitS = Math.max(0, choice.seconds);
    this.stepper.halt();
  }
}
