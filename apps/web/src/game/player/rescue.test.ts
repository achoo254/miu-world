import { describe, expect, it } from 'vitest';
import { PUSH_STUCK_S, RescueWatch, WATER_STUCK_S } from './rescue';

const frame = 1 / 60;
const run = (watch: RescueWatch, seconds: number, state: Parameters<RescueWatch['update']>[1]): boolean => {
  let stuck = false;
  for (let t = 0; t < seconds; t += frame) stuck = watch.update(frame, state);
  return stuck;
};

describe('rescue watch', () => {
  it('calls Miu stuck after a while in water, and not before', () => {
    const watch = new RescueWatch();
    const wet = { position: [5, 10, 5] as const, safe: false, inWater: true, pushing: false };
    expect(run(watch, WATER_STUCK_S - 0.5, wet)).toBe(false);
    expect(run(watch, 1, wet)).toBe(true);
    watch.reset();
    expect(watch.update(frame, wet)).toBe(false);
  });

  it('calls Miu stuck when the stick is pushed without getting anywhere, not while she walks', () => {
    const watch = new RescueWatch();
    expect(run(watch, PUSH_STUCK_S + 0.5, { position: [5, 10, 5], safe: true, inWater: false, pushing: true })).toBe(true);
    const walking = new RescueWatch();
    let stuck = false;
    for (let i = 0; i < 300; i++) stuck = walking.update(frame, { position: [i * 0.06, 10, 0], safe: true, inWater: false, pushing: true });
    expect(stuck).toBe(false);
  });

  it('brings Miu back to a dry spot from shortly before, or nowhere if she never stood on one', () => {
    const watch = new RescueWatch();
    expect(watch.spot()).toBeNull();
    // Walks along x on dry ground for 3 s, then slips into the water.
    for (let i = 0; i < 180; i++) watch.update(frame, { position: [i * 0.05, 10, 0], safe: true, inWater: false, pushing: true });
    run(watch, 3, { position: [9.5, 8, 0], safe: false, inWater: true, pushing: false });
    const spot = watch.spot();
    expect(spot).not.toBeNull();
    // Dry spots are kept every half second (1.5 blocks at this pace), the last near x = 7.5: the rescue
    // goes to the one about a second earlier, well back from the edge.
    expect(spot?.[0]).toBeGreaterThan(4);
    expect(spot?.[0]).toBeLessThan(6);
    expect(spot?.[1]).toBe(10);
  });
});

describe('rescued again soon', () => {
  it('goes further back each time the last spot did not help', () => {
    const watch = new RescueWatch();
    for (let i = 0; i < 12; i++) watch.update(0.5, { position: [i, 1, 0], safe: true, inWater: false, pushing: false });
    const first = watch.spot();
    const second = watch.spot();
    const third = watch.spot();
    expect(first?.[0]).toBe(9);
    expect(second?.[0]).toBe(6);
    expect(third?.[0]).toBe(3);
  });

  it('starts from the near spot again after a quiet while', () => {
    const watch = new RescueWatch();
    for (let i = 0; i < 12; i++) watch.update(0.5, { position: [i, 1, 0], safe: true, inWater: false, pushing: false });
    watch.spot();
    watch.update(30, { position: [11, 1, 0], safe: true, inWater: false, pushing: false });
    expect(watch.spot()?.[0]).toBe(9);
  });
});
