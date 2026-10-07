import { describe, expect, it } from 'vitest';
import type { WalkPlace } from '@miu/voxel/walk-cells';
import { LINK_POINTS, MAX_LINKS, MAX_PLACES, MAX_POINTS, MemoryGraph, pointsOf, simplify, walksStraight } from './memory-graph';
import { drawnMap, openMap } from './walk-fixtures';
import type { Spot } from './walk-store';

const place = (id: string, x: number, z: number, kind: WalkPlace['kind'] = 'landmark'): WalkPlace => ({ id, kind, at: [x + 0.5, 1, z + 0.5] });

/** Columns from (x0, z) to (x1, z) along a row, then down to z1. */
function walk(x0: number, x1: number, z: number, z1 = z, y = 1): Spot[] {
  const out: Spot[] = [];
  const sx = Math.sign(x1 - x0) || 1;
  for (let x = x0; x !== x1 + sx; x += sx) out.push({ x, y, z });
  const sz = Math.sign(z1 - z) || 1;
  for (let zz = z + sz; z1 !== z && zz !== z1 + sz; zz += sz) out.push({ x: x1, y, z: zz });
  return out;
}

describe("a bot's own map of places", () => {
  it('adds a place the first time it sees it, and never one it saw already', () => {
    const graph = new MemoryGraph({ sx: 64, sz: 64 });
    expect(graph.see(place('a', 1, 1), 10)).toBe(true);
    expect(graph.see(place('a', 1, 1), 20)).toBe(false);
    expect(graph.places.get('a')).toMatchObject({ id: 'a', firstSeenAt: 10, visits: 0, q: 0 });
  });

  it('remembers the squares it set foot in', () => {
    const graph = new MemoryGraph({ sx: 800, sz: 800 });
    expect(graph.areaSide).toEqual([50, 50]);
    expect(graph.visitArea(5, 5)).toBe(true);
    expect(graph.visitArea(15, 3)).toBe(false);
    expect(graph.visitArea(16, 3)).toBe(true);
    expect(graph.areasVisited).toBe(2);
    expect(graph.visited(graph.areaOf(17, 0))).toBe(true);
    expect(graph.areaOf(-1, 0)).toBe(-1);
  });

  it('keeps a way walked in one go as a few points, each straight piece one the child could walk', () => {
    const map = openMap(64);
    const graph = new MemoryGraph(map);
    graph.see(place('a', 2, 2), 0);
    graph.see(place('b', 40, 30), 0);
    expect(graph.recordWalk(map, 'a', 'b', walk(2, 40, 2, 30), 20)).toBe('new');
    const link = graph.link('a', 'b');
    if (!link) throw new Error('no way kept');
    const points = pointsOf(link.points);
    expect(points[0]).toEqual({ x: 2, y: 1, z: 2 });
    expect(points.at(-1)).toEqual({ x: 40, y: 1, z: 30 });
    expect(points.length).toBeLessThan(12);
    for (let i = 1; i < points.length; i++) expect(walksStraight(map, points[i - 1] as Spot, points[i] as Spot)).toBe(true);
    expect(link).toMatchObject({ cost: 20, walks: 1, found: 'walked', firstS: 20, thirdS: null });
    // Straight pieces cut the walk's corner: no longer than the walk, no shorter than the straight line.
    expect(link.length).toBeLessThanOrEqual(38 + 28);
    expect(link.length).toBeGreaterThanOrEqual(Math.hypot(38, 28));
  });

  it('only keeps ways it could walk: a jump or a wall in the way is not a way', () => {
    const map = drawnMap(['1111', '1#11', '1111', '1171']);
    const graph = new MemoryGraph(map);
    graph.see(place('a', 0, 0), 0);
    graph.see(place('b', 3, 0), 0);
    // Through the wall's column, and skipping a column.
    expect(graph.recordWalk(map, 'a', 'b', [{ x: 0, y: 1, z: 0 }, { x: 1, y: 1, z: 1 }, { x: 2, y: 1, z: 1 }], 3)).toBe('rejected');
    expect(graph.recordWalk(map, 'a', 'b', [{ x: 0, y: 1, z: 0 }, { x: 2, y: 1, z: 0 }], 3)).toBe('rejected');
    // A piece across a block it cannot climb is never straight.
    expect(walksStraight(map, { x: 1, y: 1, z: 3 }, { x: 3, y: 1, z: 3 })).toBe(false);
    expect(walksStraight(map, { x: 0, y: 1, z: 0 }, { x: 3, y: 1, z: 0 })).toBe(true);
    expect(graph.links.size).toBe(0);
  });

  it('averages the time of a way it walks again, and takes a clearly shorter walk as a shortcut', () => {
    const map = openMap(64);
    const graph = new MemoryGraph(map);
    graph.see(place('a', 2, 2), 0);
    graph.see(place('b', 30, 2), 0);
    // First the long way round, through row 20.
    const around = [...walk(2, 2, 2, 20).slice(0, -1), ...walk(2, 30, 20, 2)];
    graph.recordWalk(map, 'a', 'b', around, 40);
    expect(graph.recordWalk(map, 'a', 'b', around, 30)).toBe('walked');
    expect(graph.link('a', 'b')?.cost).toBeCloseTo(40 + 0.3 * (30 - 40));
    // Then straight along row 2: far shorter.
    expect(graph.recordWalk(map, 'a', 'b', walk(2, 30, 2), 10)).toBe('shortcut');
    const link = graph.link('a', 'b');
    expect(link).toMatchObject({ found: 'shortcut', walks: 3, firstS: 40, thirdS: 10 });
    expect(link?.length).toBeCloseTo(28, 0);
    expect(graph.shortcuts).toBe(1);
    expect(graph.seenWays).toBe(0);
  });

  it('makes a direct way to a place it sees from another, its time a guess from its pace', () => {
    const map = openMap(64);
    const graph = new MemoryGraph(map);
    graph.see(place('a', 2, 2), 0);
    graph.see(place('b', 12, 2), 0);
    expect(graph.recordSeenWay(map, 'a', 'b', walk(2, 12, 2), 2.5)).toBe(true);
    expect(graph.link('a', 'b')).toMatchObject({ walks: 0, found: 'shortcut', cost: 4 });
    expect(graph.seenWays).toBe(1);
    expect(graph.shortcuts).toBe(0);
    // Not again over a way it knows.
    expect(graph.recordSeenWay(map, 'a', 'b', walk(2, 12, 2), 2.5)).toBe(false);
    // Walked for real: its first walk.
    graph.recordWalk(map, 'a', 'b', walk(2, 12, 2), 5);
    expect(graph.link('a', 'b')).toMatchObject({ walks: 1, cost: 5, firstS: 5 });
  });

  it('finds the cheapest chain of known ways (Dijkstra), and the ways along it', () => {
    const map = openMap(64);
    const graph = new MemoryGraph(map);
    for (const [id, x, z] of [['a', 2, 2], ['b', 20, 2], ['c', 40, 2], ['d', 20, 20]] as const) graph.see(place(id, x, z), 0);
    graph.recordWalk(map, 'a', 'b', walk(2, 20, 2), 6);
    graph.recordWalk(map, 'b', 'c', walk(20, 40, 2), 7);
    graph.recordWalk(map, 'a', 'd', walk(2, 20, 2, 20), 5);
    graph.recordWalk(map, 'd', 'c', walk(20, 40, 20, 2), 30);
    const reached = graph.reach([{ id: 'a', cost: 1 }]);
    expect(reached.get('c')?.cost).toBe(14);
    expect(graph.route(reached, 'c').map((l) => `${l.a}>${l.b}`)).toEqual(['a>b', 'b>c']);
    expect(graph.route(reached, 'a')).toEqual([]);
    // Ways go one way: nothing leads back to a.
    expect(graph.reach([{ id: 'c', cost: 0 }]).has('a')).toBe(false);
  });

  it('stays within its bounds: full, notes only a place that matters, forgetting the least visited (never one it keeps); thins long ways; ≤ 64 KB', () => {
    const map = openMap(800);
    const keep = new Set(['p0']);
    const graph = new MemoryGraph(map, (id) => keep.has(id));
    for (let i = 0; i < MAX_PLACES; i++) graph.see(place(`p${i}`, (i % 20) * 30 + 5, Math.floor(i / 20) * 30 + 5), 0);
    for (const p of graph.places.values()) p.visits = p.id === 'p0' ? 0 : 1;
    const p1 = graph.places.get('p1');
    if (p1) p1.visits = 0;
    // Full: a place seen in passing is not noted (no forgetting and finding again in turn)…
    expect(graph.see(place('passing', 710, 710), 1)).toBe(false);
    // …one that matters now is, in place of the least visited.
    expect(graph.see(place('new', 700, 700), 1, true)).toBe(true);
    expect(graph.places.size).toBe(MAX_PLACES);
    expect(graph.places.has('p0')).toBe(true);
    expect(graph.places.has('p1')).toBe(false);
    // Ways zigzagging all over: each one at most LINK_POINTS points, all of them at most MAX_POINTS.
    const ids = [...graph.places.keys()];
    const zigzag = (n: number): Spot[] => Array.from({ length: n }, (_, k) => ({ x: 400 + (k >> 1), y: 1, z: 400 + ((k + 1) >> 1) }));
    for (let i = 0; i < MAX_LINKS + 20; i++) {
      const a = ids[i % ids.length] ?? '';
      const b = ids[(i * 7 + 1) % ids.length] ?? '';
      if (a !== b) graph.recordWalk(map, a, b, zigzag(200), 60);
    }
    expect(graph.links.size).toBeLessThanOrEqual(MAX_LINKS);
    expect(graph.points).toBeLessThanOrEqual(MAX_POINTS);
    for (const link of graph.links.values()) expect(link.points.length / 3).toBeLessThanOrEqual(LINK_POINTS);
    expect(graph.bytes).toBeLessThanOrEqual(64 * 1024);
    // A plain copy as it would be written out.
    const data = graph.data();
    expect(data.places).toHaveLength(MAX_PLACES);
    expect(JSON.stringify(data).length).toBeGreaterThan(0);
  });

  it('simplifies a walk to at most LINK_POINTS points, its first and last kept', () => {
    const map = openMap(800);
    const stairs = Array.from({ length: 600 }, (_, k) => ({ x: 10 + (k >> 1), y: 1, z: 10 + ((k + 1) >> 1) }));
    const points = pointsOf(simplify(map, stairs));
    expect(points.length).toBeLessThanOrEqual(LINK_POINTS);
    expect(points[0]).toEqual(stairs[0]);
    expect(points.at(-1)).toEqual(stairs.at(-1));
  });
});
