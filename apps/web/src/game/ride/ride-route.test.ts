import { describe, expect, it } from 'vitest';
import type { Horizon } from '@miu/voxel/region-format';
import { findCells, groundClasses, planRoute, smooth } from './ride-route';

const BLOCKS = [
  { id: 1, name: 'grass' },
  { id: 8, name: 'path' },
  { id: 9, name: 'water', liquid: true },
  { id: 6, name: 'leaves' },
  { id: 19, name: 'roof-blue' },
  { id: 40, name: 'grass-snow' },
];
const classOf = groundClasses(BLOCKS);

/** A 20 x 20 cell map (cell 4) drawn from rows of characters: . grass, = path, ~ water, # roof. */
function grid(rows: readonly string[]): Horizon {
  const w = rows[0]?.length ?? 0;
  const d = rows.length;
  const tops = new Uint8Array(w * d);
  const heights = new Uint8Array(w * d);
  rows.forEach((row, z) =>
    [...row].forEach((ch, x) => {
      tops[z * w + x] = ch === '=' ? 8 : ch === '~' ? 9 : ch === '#' ? 19 : 1;
      heights[z * w + x] = ch === '#' ? 22 : ch === '~' ? 12 : 13;
    }),
  );
  return { cell: 4, cells: [w, d], tops, heights };
}

describe('groundClasses', () => {
  it('sorts the top blocks into ways, open land, water and the rest', () => {
    expect(classOf(8)).toBe('way');
    expect(classOf(1)).toBe('land');
    expect(classOf(40)).toBe('land');
    expect(classOf(9)).toBe('water');
    expect(classOf(6)).toBe('blocked');
    expect(classOf(19)).toBe('blocked');
    expect(classOf(0)).toBe('blocked');
  });
});

describe('findCells', () => {
  // A row of houses with one lane through it.
  const town = grid([
    '..........',
    '..........',
    '####=#####',
    '....=.....',
    '..........',
  ]);

  it('takes a bus through the lane between the houses, never over a roof', () => {
    const cells = findCells(town, classOf, 'ground', [2, 2], [38, 18]);
    expect(cells[0]).toBe(0);
    expect(cells.at(-1)).toBe(4 * 10 + 9);
    expect(cells.some((i) => town.tops[i] === 19)).toBe(false);
    expect(cells).toContain(2 * 10 + 4);
  });

  it('keeps a boat on the water while the water joins the two stops', () => {
    const lake = grid([
      '~~~~~~~~~~',
      '~........~',
      '~........~',
      '~........~',
      '~~~~~~~~~~',
    ]);
    const cells = findCells(lake, classOf, 'water', [2, 2], [38, 18]);
    expect(cells.every((i) => lake.tops[i] === 9)).toBe(true);
    // A bus goes straight across the land instead.
    expect(findCells(lake, classOf, 'ground', [2, 2], [38, 18]).some((i) => lake.tops[i] === 1)).toBe(true);
  });
});

describe('planRoute', () => {
  it('starts and ends exactly at the stops, at the ground height in between', () => {
    const open = grid(['..........', '..........', '..........']);
    const line = planRoute(open, classOf, 'ground', [3, 13, 3], [37.5, 13, 9.5]);
    expect(line[0]).toEqual([3, 13, 3]);
    expect(line.at(-1)).toEqual([37.5, 13, 9.5]);
    for (const p of line) expect(p[1]).toBeCloseTo(13);
  });

  it('a cell under a roof takes the height of the ground before it', () => {
    const roofed = grid(['..........', '##########', '..........']);
    const line = planRoute(roofed, classOf, 'ground', [2, 13, 2], [2, 13, 10]);
    for (const p of line) expect(p[1]).toBeLessThan(14);
  });
});

describe('smooth', () => {
  it('rounds the corners and keeps the ends', () => {
    const line = smooth(
      [
        [0, 0, 0],
        [10, 0, 0],
        [10, 0, 10],
      ],
      2,
    );
    expect(line[0]).toEqual([0, 0, 0]);
    expect(line.at(-1)).toEqual([10, 0, 10]);
    expect(line.some((p) => p[0] === 10 && p[2] === 0)).toBe(false);
  });
});
