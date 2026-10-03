import { describe, expect, it } from 'vitest';
import { columnsAlong, nearestOnPath } from './path';

describe('columnsAlong', () => {
  it('gives the column under the middle line every block along it', () => {
    expect(columnsAlong([[0, 0], [3, 0], [3, 2]])).toEqual([[0, 0], [1, 0], [2, 0], [3, 0], [3, 1], [3, 2]]);
    expect(columnsAlong([[0, 0], [2.5, 0]])).toEqual([[0, 0], [1, 0], [2, 0]]);
  });
});

describe('nearestOnPath', () => {
  it('finds the nearest point of the polyline, its distance and how far along it lies', () => {
    expect(nearestOnPath([[0, 0], [10, 0]], 4, 3)).toEqual({ x: 4, z: 0, d: 3, along: 4 });
    expect(nearestOnPath([[0, 0], [10, 0], [10, 10]], 12, 6)).toEqual({ x: 10, z: 6, d: 2, along: 16 });
    expect(nearestOnPath([[0, 0]], 4, 3).d).toBe(Infinity);
  });
});
