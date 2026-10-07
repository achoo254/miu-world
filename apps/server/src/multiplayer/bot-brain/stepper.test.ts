import { describe, expect, it } from 'vitest';
import { LocalPlanner, type PathGoal } from './local-path';
import { MIN_PLAN_GAP_MS, RIDE_MS, STUCK_BAN_MS, STUCK_PLANS, Stepper, walksAlong, type StepEvent } from './stepper';
import { drawnMap, openMap } from './walk-fixtures';
import type { Spot, WalkMap } from './walk-store';

const planner = new LocalPlanner();
const TICK = 0.1;

/** Walks `stepper` to `goal` tick by tick (planning whenever it asks), checking where it stands each tick. */
function walk(map: WalkMap, stepper: Stepper, goal: PathGoal, seconds: number, start = 0): { events: StepEvent[]; spots: Spot[]; plans: number } {
  let now = start;
  stepper.go(goal, now);
  const events: StepEvent[] = [];
  const spots: Spot[] = [stepper.spot];
  let plans = 0;
  for (let t = 0; t < seconds / TICK; t++) {
    now += TICK * 1000;
    if (stepper.wantsPlan(now)) {
      stepper.plan(planner, now);
      plans += 1;
    }
    const event = stepper.step(TICK);
    if (event !== 'none') events.push(event);
    // It stands on a spot of the column under its body, at that spot's height.
    expect(map.standAt(Math.floor(stepper.x), stepper.y, Math.floor(stepper.z))).not.toBe(0);
    const last = spots.at(-1);
    if (last?.x !== stepper.spot.x || last.z !== stepper.spot.z) spots.push(stepper.spot);
    if (event === 'arrived' || event === 'stuck') break;
  }
  return { events, spots, plans };
}

describe("a bot's feet", () => {
  it('follows its plan up and down steps, column by column, each a step from the one before', () => {
    const map = drawnMap(['1234321', '1234321', '1234321']);
    const stepper = new Stepper(map, { x: 0, y: 1, z: 1 }, { speed: 3, sight: 8 });
    const { events, spots } = walk(map, stepper, { x: 6.5, y: 1, z: 1.5, reach: 0.5 }, 10);
    expect(events).toEqual(['arrived']);
    expect(stepper.spot).toEqual({ x: 6, y: 1, z: 1 });
    expect(spots.map((s) => s.y)).toEqual([1, 2, 3, 4, 3, 2, 1]);
    expect(walksAlong(map, spots)).toBe(true);
  });

  it('keeps what it walked for its memory, every column of it', () => {
    const map = openMap(20);
    const stepper = new Stepper(map, { x: 2, y: 1, z: 2 }, { speed: 3.6, sight: 16 });
    walk(map, stepper, { x: 14.5, y: 1, z: 9.5, reach: 0.5 }, 10);
    const trace = stepper.takeTrace();
    expect(trace.at(-1)).toEqual({ x: 14, y: 1, z: 9 });
    expect(walksAlong(map, [{ x: 2, y: 1, z: 2 }, ...trace])).toBe(true);
    expect(stepper.takeTrace()).toEqual([]);
  });

  it('plans no more often than its fair share, and again as it nears the edge of what it saw', () => {
    const map = openMap(200);
    const stepper = new Stepper(map, { x: 10, y: 1, z: 100 }, { speed: 3, sight: 16 });
    const { plans } = walk(map, stepper, { x: 190, y: null, z: 100, reach: 3 }, 20);
    // Twenty seconds of walking towards a goal far beyond its sight: a plan every two seconds or so, never more.
    expect(plans).toBeGreaterThanOrEqual(5);
    expect(plans).toBeLessThanOrEqual(20_000 / MIN_PLAN_GAP_MS + 1);
    expect(stepper.spot.x).toBeGreaterThan(60);
  });

  it('knows it is stuck after three plans without headway, and keeps off that column for a while', () => {
    // A ledge four blocks up ends the way: the goal on top is never reachable.
    const map = drawnMap(['11115555']);
    const stepper = new Stepper(map, { x: 1, y: 1, z: 0 }, { speed: 3, sight: 8 });
    const { events, plans } = walk(map, stepper, { x: 6.5, y: 5, z: 0.5, reach: 0.5 }, 30);
    expect(events).toEqual(['stuck']);
    expect(plans).toBe(STUCK_PLANS + 1);
    expect(stepper.stats.stuck).toBe(1);
    expect(stepper.stats.stuckMs).toBeGreaterThan(0);
    expect(stepper.hasGoal).toBe(false);
    expect(stepper.spot).toEqual({ x: 3, y: 1, z: 0 });
    // Taken back along the way, it does not walk onto the column it gave up on until a minute has passed.
    stepper.rideTo({ x: 0, y: 1, z: 0 });
    for (let t = 0; t < RIDE_MS / 100 + 1; t++) stepper.step(TICK);
    const banned = walk(map, stepper, { x: 3.5, y: 1, z: 0.5, reach: 0.5 }, 10, 10_000);
    expect(banned.spots.some((s) => s.x === 3)).toBe(false);
    expect(banned.events).not.toContain('arrived');
    const later = walk(map, stepper, { x: 3.5, y: 1, z: 0.5, reach: 0.5 }, 10, 20_000 + STUCK_BAN_MS);
    expect(later.events).toEqual(['arrived']);
  });

  it('rides from a stop and gets off at its arrival', () => {
    const map = openMap(40);
    const stepper = new Stepper(map, { x: 2, y: 1, z: 2 }, { speed: 3, sight: 8 });
    stepper.rideTo({ x: 30, y: 1, z: 30 });
    expect(stepper.riding).toBe(true);
    const events: StepEvent[] = [];
    for (let t = 0; t < RIDE_MS / 100 + 1; t++) events.push(stepper.step(TICK));
    expect(events.filter((e) => e !== 'none')).toEqual(['rode']);
    expect(stepper.riding).toBe(false);
    expect(stepper.spot).toEqual({ x: 30, y: 1, z: 30 });
    // Nowhere to stand at the far end: it stays.
    stepper.rideTo({ x: 30, y: 9, z: 30 });
    expect(stepper.riding).toBe(false);
  });

  it('cannot be put where nobody stands', () => {
    expect(() => new Stepper(drawnMap(['1#']), { x: 1, y: 1, z: 0 }, { speed: 3, sight: 8 })).toThrow(/no standing spot/);
  });
});
