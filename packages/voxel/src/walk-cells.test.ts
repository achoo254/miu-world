import { describe, expect, it } from 'vitest';
import { decodeWalkCells, encodeWalkCells, WALK_GROUND, WALK_LEVELS, walkInfoSchema, type WalkCellSource, type WalkSpot } from './walk-cells';

const spot = (feet: number, clear = 4, ground: number = WALK_GROUND.plain, edge = false): WalkSpot => ({ feet, clear, ground, edge });

/** A 5 × 4 grid: open ground, a road, a pond, a column with no spot, a house with a floor, a tower with two. */
function sample(): WalkCellSource {
  const columns = new Map<string, WalkSpot[]>();
  for (let z = 0; z < 4; z++) for (let x = 0; x < 5; x++) columns.set(`${x},${z}`, [spot(10)]);
  columns.set('1,0', [spot(10, 7, WALK_GROUND.road)]);
  columns.set('2,1', [spot(9, 7, WALK_GROUND.water, true)]);
  columns.set('3,1', []);
  columns.set('0,3', [spot(10, 3, WALK_GROUND.plain, true), spot(14, 5, WALK_GROUND.road)]);
  columns.set('4,3', [spot(10, 2), spot(13, 2, WALK_GROUND.plain, true), spot(16, 7)]);
  return { size: [5, 4], spotsAt: (x, z) => columns.get(`${x},${z}`) ?? [] };
}

describe('walk cells', () => {
  it('decode gives back every spot of every column as encoded', () => {
    const source = sample();
    const cells = decodeWalkCells(encodeWalkCells(source), source.size);
    for (let z = 0; z < 4; z++) for (let x = 0; x < 5; x++) expect(cells.spotsAt(x, z), `${x},${z}`).toEqual(source.spotsAt(x, z));
    expect(cells.size).toEqual([5, 4]);
  });

  it('keeps the upper levels sparse: only the columns that have them cost bytes', () => {
    const bytes = encodeWalkCells(sample());
    // Level 0 dense (2 × 20); level 1: count, gaps 15 and 3 (a byte each), 2 × feet and meta; level 2: one spot.
    expect(bytes.length).toBe(2 * 20 + (4 + 2 + 2 * 2) + (4 + 1 + 2));
  });

  it('writes long gaps between floored columns in several bytes and reads them back', () => {
    const floored = new Set([0, 130, 20_000, 20_001, 99_999]);
    const source: WalkCellSource = { size: [1000, 100], spotsAt: (x, z) => (floored.has(x + z * 1000) ? [spot(5), spot(9, 7)] : [spot(5)]) };
    const cells = decodeWalkCells(encodeWalkCells(source), source.size);
    for (const column of floored) expect(cells.spotsAt(column % 1000, Math.floor(column / 1000))).toEqual([spot(5), spot(9, 7)]);
    expect(cells.spotsAt(1, 0)).toEqual([spot(5)]);
    expect(cells.spotsAt(999, 99)).toEqual([spot(5), spot(9, 7)]);
  });

  it('finds a spot by its feet height and nothing outside the grid', () => {
    const cells = decodeWalkCells(encodeWalkCells(sample()), [5, 4]);
    expect(cells.standAt(4, 13, 3)).toEqual(spot(13, 2, WALK_GROUND.plain, true));
    expect(cells.standAt(4, 12, 3)).toBeUndefined();
    expect(cells.standAt(3, 10, 1)).toBeUndefined();
    expect(cells.spotsAt(-1, 0)).toEqual([]);
    expect(cells.spotsAt(5, 0)).toEqual([]);
    expect(cells.spotsAt(0.5, 0)).toEqual([]);
  });

  it('refuses spots it cannot hold', () => {
    const one = (spots: WalkSpot[]): WalkCellSource => ({ size: [1, 1], spotsAt: () => spots });
    expect(() => encodeWalkCells(one(Array.from({ length: WALK_LEVELS + 1 }, (_, i) => spot(5 + 3 * i))))).toThrow(/at most/);
    expect(() => encodeWalkCells(one([spot(8), spot(5)]))).toThrow(/lowest first/);
    expect(() => encodeWalkCells(one([spot(0)]))).toThrow(/feet/);
    expect(() => encodeWalkCells(one([spot(5, 8)]))).toThrow(/clear/);
    expect(() => encodeWalkCells(one([spot(5, 4, 0)]))).toThrow(/ground/);
  });

  it('refuses bytes that do not fit the size', () => {
    const bytes = encodeWalkCells(sample());
    expect(() => decodeWalkCells(bytes, [5, 5])).toThrow();
    expect(() => decodeWalkCells(bytes.slice(0, bytes.length - 1), [5, 4])).toThrow(/cut short|left over/);
    expect(() => decodeWalkCells(new Uint8Array([...bytes, 0]), [5, 4])).toThrow(/left over/);
  });
});

describe('walk info', () => {
  const info = {
    version: 1,
    map: 'truong-hoc',
    size: [800, 800],
    height: 48,
    levels: 3,
    sources: 'a'.repeat(64),
    places: [
      { id: 'spawn', kind: 'spawn', at: [10.5, 6, 20.5] },
      { id: 'xe-buyt', kind: 'stop', at: [30.5, 6, 20.5], ride: [300.5, 6, 20.5] },
    ],
  };

  it('parses a valid file', () => {
    expect(walkInfoSchema.parse(info).places).toHaveLength(2);
  });

  it('refuses a repeated place id and an unknown kind', () => {
    expect(walkInfoSchema.safeParse({ ...info, places: [...info.places, info.places[0]] }).success).toBe(false);
    expect(walkInfoSchema.safeParse({ ...info, places: [{ id: 'x', kind: 'route', at: [0, 0, 0] }] }).success).toBe(false);
  });
});
