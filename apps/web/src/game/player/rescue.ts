// Getting a child out of a spot they cannot leave (a stream with high banks, a gap between trees):
// the game remembers where Miu last stood safely, notices when she is stuck, and on request puts her
// back there. The HUD shows its "Quay lại" button only while stuck; the pause menu always offers it.

type Point = readonly [number, number, number];

/** A stuck child gets the button after this long in water, or pushing the stick without getting anywhere. */
export const WATER_STUCK_S = 2.5;
export const PUSH_STUCK_S = 3;
/** Getting this far (blocks) while pushing counts as progress. */
const PROGRESS = 1;
/** Safe spots are sampled this often, kept for the last few seconds, and must be this far apart. */
const SAMPLE_S = 0.5;
const KEEP = 12;
/** Another rescue within this many seconds counts as the same trouble. */
const RESCUE_STREAK_S = 20;
const SPACING = 0.5;

export interface RescueState {
  /** Where Miu stands now. */
  position: Point;
  /** On dry ground (not in water, feet on a block). */
  safe: boolean;
  inWater: boolean;
  /** The child is pushing the stick. */
  pushing: boolean;
}

export class RescueWatch {
  private readonly spots: Point[] = [];
  private sinceSample = SAMPLE_S;
  private wetFor = 0;
  private pushedFor = 0;
  private pushFrom: Point | null = null;
  /** Time since the last rescue (seconds), and how many rescues came in a quick row: each goes further back. */
  private sinceRescue = Infinity;
  private streak = 0;

  /** Feeds one frame; returns whether Miu is stuck. */
  update(dt: number, state: RescueState): boolean {
    const [x, , z] = state.position;
    this.sinceSample += dt;
    this.sinceRescue += dt;
    if (state.safe && this.sinceSample >= SAMPLE_S) {
      this.sinceSample = 0;
      const last = this.spots.at(-1);
      if (!last || Math.hypot(last[0] - x, last[2] - z) >= SPACING) {
        this.spots.push([...state.position]);
        if (this.spots.length > KEEP) this.spots.shift();
      }
    }
    this.wetFor = state.inWater ? this.wetFor + dt : 0;

    if (!state.pushing) {
      this.pushedFor = 0;
      this.pushFrom = null;
    } else if (!this.pushFrom || Math.hypot(this.pushFrom[0] - x, this.pushFrom[2] - z) >= PROGRESS) {
      this.pushFrom = [...state.position];
      this.pushedFor = 0;
    } else {
      this.pushedFor += dt;
    }
    return this.wetFor >= WATER_STUCK_S || this.pushedFor >= PUSH_STUCK_S;
  }

  /**
   * Where to put Miu back: the dry spot from about a second before the last one (the very last is
   * often the edge she slipped off), or null when she never stood anywhere safe.
   */
  spot(): Point | null {
    if (this.spots.length === 0) return null;
    // Rescued again soon after a rescue: that spot did not help (she slipped off again), so go further back.
    this.streak = this.sinceRescue < RESCUE_STREAK_S ? this.streak + 1 : 0;
    this.sinceRescue = 0;
    const back = 3 + this.streak * 3;
    return this.spots.at(Math.max(-this.spots.length, -back)) ?? this.spots[0] ?? null;
  }

  /** After a rescue: start watching afresh from the new spot. */
  reset(): void {
    this.wetFor = 0;
    this.pushedFor = 0;
    this.pushFrom = null;
  }
}
