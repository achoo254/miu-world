import { describe, expect, it } from 'vitest';
import { lineColumns, LocalPlanner, MAX_EXPANSIONS, PathQueue } from './local-path';
import { walksAlong } from './stepper';
import { drawnMap, openMap } from './walk-fixtures';

const planner = new LocalPlanner();

describe('a bot plans its way over what it sees', () => {
  it('walks straight across open road as one leg, every column a step from the one before', () => {
    const map = openMap(30);
    const plan = planner.plan(map, { x: 2, y: 1, z: 2 }, { x: 12.5, y: 1, z: 2.5, reach: 0.5 }, 16);
    expect(plan?.reachesGoal).toBe(true);
    expect(plan?.points).toEqual([{ x: 12.5, y: 1, z: 2.5 }]);
    expect(walksAlong(map, [{ x: 2, y: 1, z: 2 }, ...(plan?.cells ?? [])])).toBe(true);
  });

  it('never climbs three blocks at once: it goes round by the stairs', () => {
    // A ledge three blocks up along x = 5, with a stair of single steps at z = 8.
    const rows = Array.from({ length: 10 }, (_, z) => (z === 8 ? '1111123444' : '1111144444'));
    const map = drawnMap(rows);
    const from = { x: 1, y: 1, z: 1 };
    const plan = planner.plan(map, from, { x: 8.5, y: 4, z: 1.5, reach: 0.5 }, 9);
    expect(plan?.reachesGoal).toBe(true);
    const cells = [from, ...(plan?.cells ?? [])];
    expect(walksAlong(map, cells)).toBe(true);
    expect(cells.some((c) => c.z === 8 && c.x === 5 && c.y === 2)).toBe(true);
  });

  it('never goes through a fence: it finds the gate', () => {
    const rows = Array.from({ length: 12 }, (_, z) => (z === 9 ? '1111111111' : '11111#1111'));
    const map = drawnMap(rows);
    const plan = planner.plan(map, { x: 2, y: 1, z: 2 }, { x: 8.5, y: 1, z: 2.5, reach: 0.5 }, 11);
    expect(plan?.reachesGoal).toBe(true);
    expect(plan?.cells.filter((c) => c.x === 5).map((c) => c.z)).toEqual([9]);
    // Every leg of the merged way keeps off the fence too.
    for (const p of plan?.points ?? []) expect(map.standAt(Math.floor(p.x), p.y, Math.floor(p.z))).not.toBe(0);
  });

  it('does not climb two blocks under a low roof, nor drop four', () => {
    // Up two from x = 1 to x = 2: only with four open blocks over the first spot.
    const low = drawnMap(['1133'], { clear: (x) => (x === 1 ? 3 : 7) });
    expect(planner.plan(low, { x: 0, y: 1, z: 0 }, { x: 3.5, y: 3, z: 0.5, reach: 0.5 }, 4)?.reachesGoal ?? false).toBe(false);
    const roomy = drawnMap(['1133']);
    expect(planner.plan(roomy, { x: 0, y: 1, z: 0 }, { x: 3.5, y: 3, z: 0.5, reach: 0.5 }, 4)?.reachesGoal).toBe(true);
    const cliff = drawnMap(['5511']);
    expect(planner.plan(cliff, { x: 0, y: 5, z: 0 }, { x: 3.5, y: 1, z: 0.5, reach: 0.5 }, 4)?.reachesGoal ?? false).toBe(false);
  });

  it('heads for the edge of its sight on the side of a goal beyond it', () => {
    const map = openMap(120);
    const from = { x: 20, y: 1, z: 60 };
    const plan = planner.plan(map, from, { x: 110, y: null, z: 64, reach: 3 }, 16);
    expect(plan?.reachesGoal).toBe(false);
    const end = plan?.cells.at(-1);
    expect(end?.x).toBe(from.x + 16);
    expect(Math.abs((end?.z ?? 0) - 61)).toBeLessThanOrEqual(2);
  });

  it('gives up within its search budget when the goal is walled off', () => {
    const rows = Array.from({ length: 57 }, (_, z) => Array.from({ length: 57 }, (_, x) => (Math.max(Math.abs(x - 50), Math.abs(z - 50)) === 2 ? '#' : '1')).join(''));
    const map = drawnMap(rows);
    const from = { x: 28, y: 1, z: 28 };
    const plan = planner.plan(map, from, { x: 50.5, y: 1, z: 50.5, reach: 0.5 }, 28);
    // It gets as near as the wall lets it, never inside, and within budget.
    expect(plan?.reachesGoal ?? false).toBe(false);
    expect(plan?.expansions ?? 0).toBeLessThanOrEqual(MAX_EXPANSIONS);
    for (const c of plan?.cells ?? []) expect(Math.max(Math.abs(c.x - 50), Math.abs(c.z - 50))).toBeGreaterThan(2);
  });

  it('has no plan from nowhere, nor when nothing gets it any nearer', () => {
    const map = drawnMap(['1#1']);
    expect(planner.plan(map, { x: 1, y: 1, z: 0 }, { x: 2.5, y: 1, z: 0.5, reach: 0.5 }, 4)).toBeNull();
    expect(planner.plan(map, { x: 0, y: 1, z: 0 }, { x: 2.5, y: 1, z: 0.5, reach: 0.5 }, 4)).toBeNull();
  });

  it('keeps off columns it is told to avoid', () => {
    const map = openMap(9);
    const plan = planner.plan(map, { x: 0, y: 1, z: 4 }, { x: 8.5, y: 1, z: 4.5, reach: 0.5 }, 8, (x, z) => x === 4 && z === 4);
    expect(plan?.reachesGoal).toBe(true);
    expect(plan?.cells.some((c) => c.x === 4 && c.z === 4)).toBe(false);
  });
});

describe('the columns a straight line crosses', () => {
  it('include both sides of a corner it passes through', () => {
    expect(lineColumns(0.5, 0.5, 2.5, 2.5)).toEqual([
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
      [2, 1],
      [1, 2],
      [2, 2],
    ]);
    // Through the corner at (2, 1) on the way.
    expect(lineColumns(0.5, 0.5, 3.5, 1.5)).toEqual([
      [0, 0],
      [1, 0],
      [2, 0],
      [1, 1],
      [2, 1],
      [3, 1],
    ]);
    expect(lineColumns(0.5, 0.5, 3.5, 1.2)).toEqual([
      [0, 0],
      [1, 0],
      [2, 0],
      [2, 1],
      [3, 1],
    ]);
  });
});

describe('the plan queue', () => {
  it('works through plans in order until the tick budget is spent, one waiting plan per bot', () => {
    let clock = 0;
    const queue = new PathQueue(4, () => clock);
    const ran: string[] = [];
    for (const id of ['a', 'b', 'c', 'd', 'a']) {
      queue.request(id, () => {
        ran.push(id);
        clock += 1.5;
      });
    }
    expect(queue.size).toBe(4);
    queue.drain();
    expect(ran).toEqual(['a', 'b', 'c']);
    queue.cancel('d');
    queue.request('e', () => ran.push('e'));
    queue.drain();
    expect(ran).toEqual(['a', 'b', 'c', 'e']);
    expect(queue.size).toBe(0);
  });

  it('always runs at least one plan, however slow', () => {
    let clock = 0;
    const queue = new PathQueue(4, () => clock);
    queue.request('slow', () => {
      clock += 50;
    });
    queue.request('next', () => {});
    queue.drain();
    expect(queue.size).toBe(1);
  });
});
