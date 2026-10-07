import { describe, expect, it } from 'vitest';
import { Avoidance } from './avoidance';

const MIN = 60_000;

describe('what a bot learnt from getting stuck', () => {
  it('keeps away from a place a while, twice as long each time, and from any way there once stuck on a known one', () => {
    const avoid = new Avoidance([50, 50]);
    avoid.strikePlace('cong-sau', 0);
    expect(avoid.avoidsPlace('cong-sau', 4 * MIN)).toBe(true);
    expect(avoid.avoidsPlace('cong-sau', 4 * MIN, true)).toBe(false);
    expect(avoid.avoidsPlace('cong-sau', 6 * MIN)).toBe(false);
    avoid.strikePlace('cong-sau', 6 * MIN, true);
    // Second time: 10 minutes, by any way.
    expect(avoid.avoidsPlace('cong-sau', 15 * MIN, true)).toBe(true);
    expect(avoid.avoidsPlace('cong-sau', 17 * MIN)).toBe(false);
  });

  it('keeps away from a square it could not get to, and from the squares around it when it got stuck walking there', () => {
    const avoid = new Avoidance([50, 50]);
    avoid.strikeArea(10 + 10 * 50, 0);
    expect(avoid.avoidsArea(10 + 10 * 50, MIN)).toBe(true);
    expect(avoid.avoidsArea(11 + 10 * 50, MIN)).toBe(false);
    avoid.shunAround(20 + 20 * 50, 0);
    expect(avoid.avoidsArea(22 + 22 * 50, MIN)).toBe(true);
    expect(avoid.avoidsArea(23 + 20 * 50, MIN)).toBe(false);
    expect(avoid.areaMiddle(20 + 20 * 50)).toEqual({ x: 328, z: 328 });
  });

  it('remembers a wall where it got stuck: a way heading the same way past it is walled, the way back is not', () => {
    const avoid = new Avoidance([50, 50]);
    // Stuck at (100, 100) heading east.
    avoid.addWall({ x: 100, y: 1, z: 100 }, 200, 100, 0);
    // From further west, heading east past the spot: walled; another place behind the same fence a little aside too.
    expect(avoid.walled({ x: 80, y: 1, z: 100 }, 150, 100, MIN)).toBe(true);
    expect(avoid.walled({ x: 80, y: 1, z: 100 }, 150, 104, MIN)).toBe(true);
    // Heading back west, or far to one side of the spot: open.
    expect(avoid.walled({ x: 100, y: 1, z: 100 }, 40, 100, MIN)).toBe(false);
    expect(avoid.walled({ x: 80, y: 1, z: 140 }, 150, 140, MIN)).toBe(false);
    // Not for ever.
    expect(avoid.walled({ x: 80, y: 1, z: 100 }, 150, 100, 31 * MIN)).toBe(false);
  });
});
