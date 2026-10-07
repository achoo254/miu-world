// A companion bot's walking life on one map: it asks its chooser what to do whenever it stands free, walks there on
// its own feet (stepper.ts), plans its way through the server's plan queue, and stays a while where it arrives. A way
// it knows (`via`) is walked point by point: it aims at the furthest next point it can see, so it never stops at one.
// Its chooser is told every tick what it walked. Greeting a player, visiting a friend and everything social stay
// with the runner, which pauses or steers the body.
import type { WalkPlace } from '@miu/voxel/walk-cells';
import type { LocalPlanner, PathGoal } from './local-path';
import { Stepper, type StepEvent } from './stepper';
import type { BotView, Choice, GoalChooser, Outcome } from './wander';
import type { Spot, WalkMap } from './walk-store';

export type BodyMode = 'walk' | 'work' | 'rest' | 'ride';

/** A point of a known way counts as passed this close (blocks). */
const VIA_REACH = 1.5;
/** A point of a known way it aims at lies this far inside the edge of what it sees, at most. */
const VIA_MARGIN = 2;

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
  /** The points of the known way it walks, then its goal; `aim`: the one it heads for now. */
  private way: PathGoal[] = [];
  private aim = 0;
  /** The columns it walked over the last tick, in order. */
  walkedNow: readonly Spot[] = [];

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
    this.way = [goal];
    this.aim = 0;
    this.modeNow = 'walk';
    this.stepper.go(goal, this.options.now());
  }

  /** Lives on for `dt` seconds. */
  tick(dt: number): void {
    // Staying a while, it still finishes the step it was taking.
    const event = this.stepper.step(dt);
    this.walkedNow = this.stepper.takeTrace();
    if (this.modeNow === 'work' || this.modeNow === 'rest') {
      this.waitS -= dt;
      if (this.waitS <= 0) this.decide({ kind: 'rested' });
    } else {
      this.after(event);
    }
    const { chooser, requestPlan, planner, now } = this.options;
    if (chooser.sense?.(this.view, this.walkedNow, dt, this.modeNow === 'walk')) this.decide({ kind: 'enough' });
    if (this.modeNow === 'walk') this.aimFurther();
    if (this.stepper.wantsPlan(now())) requestPlan(() => this.stepper.plan(planner, now()));
  }

  /** Its feet's stuck time told to its chooser so far (ms). */
  private stuckMsSeen = 0;

  private after(event: StepEvent): void {
    if (event === 'arrived') {
      // A point of its way: on to the next one.
      if (this.modeNow === 'walk' && this.aim < this.way.length - 1) {
        this.aim += 1;
        const next = this.way[this.aim];
        if (next) this.stepper.go(next, this.options.now());
        return;
      }
      this.decide({ kind: 'arrived', place: this.target });
    } else if (event === 'stuck') {
      const seen = this.stuckMsSeen;
      this.stuckMsSeen = this.stepper.stats.stuckMs;
      this.decide({ kind: 'stuck', seconds: (this.stuckMsSeen - seen) / 1000 });
    } else if (event === 'rode' && this.stop) this.decide({ kind: 'rode', stop: this.stop });
  }

  /** Heads for the furthest next point of its way that it sees, as soon as it sees it. */
  private aimFurther(): void {
    const { x, z } = this.stepper.spot;
    const sees = this.options.pace.sight - VIA_MARGIN;
    let aim = this.aim;
    for (let i = this.aim + 1; i < this.way.length; i++) {
      const point = this.way[i];
      if (!point || Math.max(Math.abs(Math.floor(point.x) - x), Math.abs(Math.floor(point.z) - z)) > sees) break;
      aim = i;
    }
    // Points it already walked past are passed too.
    const current = this.way[aim];
    if (current && aim < this.way.length - 1 && Math.hypot(current.x - (x + 0.5), current.z - (z + 0.5)) <= VIA_REACH) aim += 1;
    if (aim === this.aim) return;
    this.aim = aim;
    const goal = this.way[aim];
    if (goal) this.stepper.retarget(goal, this.options.now());
  }

  private decide(last: Outcome): void {
    this.apply(this.options.chooser.next(this.view, last));
  }

  private apply(choice: Choice): void {
    this.target = null;
    this.way = [];
    this.aim = 0;
    if (choice.kind === 'go') {
      this.target = choice.place;
      this.modeNow = 'walk';
      this.way = [...(choice.via ?? []).map((p) => ({ x: p.x + 0.5, y: p.y, z: p.z + 0.5, reach: VIA_REACH })), choice.goal];
      const first = this.way[0] ?? choice.goal;
      this.stepper.go(first, this.options.now());
      this.aimFurther();
      return;
    }
    if (choice.kind === 'ride') {
      this.stop = choice.stop;
      this.modeNow = 'ride';
      this.stepper.rideTo(choice.to);
      if (!this.stepper.riding) this.decide({ kind: 'rested' });
      return;
    }
    if (choice.kind === 'reset') {
      this.stepper.reset(choice.to);
      this.decide({ kind: 'rested' });
      return;
    }
    this.modeNow = choice.kind;
    this.waitS = Math.max(0, choice.seconds);
    this.stepper.halt();
  }
}
