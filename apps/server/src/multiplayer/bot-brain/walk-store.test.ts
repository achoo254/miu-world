import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { deflateRawSync } from 'node:zlib';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { encodeWalkCells, WALK_GROUND, WALK_LEVELS } from '@miu/voxel/walk-cells';
import { BOT_MAP_CONFIGS, HOME_SNAP } from '../bot-profiles';
import { drawnMap } from './walk-fixtures';
import { clearOf, edgeOf, feetOf, groundOf, readWalkMap, WalkStore } from './walk-store';

/** Memory one map's spots may take once read. */
const MAX_MAP_BYTES = 2.5 * 1024 * 1024;

const dirs: string[] = [];
afterAll(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
});

/** A content directory with one map's grid written as the tool writes it. */
function contentWith(mapId: string, files: { json?: string; bin?: Uint8Array }): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'walk-store-'));
  dirs.push(dir);
  const walk = path.join(dir, 'world', 'walk');
  mkdirSync(walk, { recursive: true });
  if (files.json !== undefined) writeFileSync(path.join(walk, `${mapId}.json`), files.json);
  if (files.bin) writeFileSync(path.join(walk, `${mapId}.bin`), files.bin);
  return dir;
}

const SPOTS = [
  [{ feet: 3, clear: 7, ground: WALK_GROUND.road, edge: false }],
  [
    { feet: 2, clear: 3, ground: WALK_GROUND.plain, edge: true },
    { feet: 9, clear: 5, ground: WALK_GROUND.plain, edge: false },
  ],
  [],
  [{ feet: 1, clear: 7, ground: WALK_GROUND.water, edge: false }],
];
const tiny = { size: [2, 2] as [number, number], spotsAt: (x: number, z: number) => SPOTS[x + 2 * z] ?? [] };
const tinyJson = (map = 'tiny'): string =>
  JSON.stringify({ version: 1, map, size: [2, 2], height: 16, levels: WALK_LEVELS, sources: 'a'.repeat(64), places: [{ id: 'npc-a', kind: 'npc', at: [0.5, 3, 0.5] }] });

describe("the bots' walk grids", () => {
  it('reads a map as the tool wrote it: every spot, floors above, ground, edges and places', () => {
    const dir = contentWith('tiny', { json: tinyJson(), bin: deflateRawSync(encodeWalkCells(tiny)) });
    const map = readWalkMap(dir, 'tiny');
    for (let z = 0; z < 2; z++) {
      for (let x = 0; x < 2; x++) {
        const read = Array.from({ length: WALK_LEVELS }, (_, level) => map.spot(x, z, level))
          .filter((spot) => spot !== 0)
          .map((spot) => ({ feet: feetOf(spot), clear: clearOf(spot), ground: groundOf(spot), edge: edgeOf(spot) }));
        expect(read).toEqual(tiny.spotsAt(x, z));
      }
    }
    expect(map.levelAt(1, 9, 0)).toBe(1);
    expect(map.standAt(1, 4, 0)).toBe(0);
    expect(map.spot(-1, 0, 0)).toBe(0);
    expect(map.places.map((p) => p.id)).toEqual(['npc-a']);
  });

  it('finds the places within a radius, and the standing spot nearest a point (dry ground first)', () => {
    const places = [
      { id: 'near', kind: 'npc' as const, at: [10.5, 1, 10.5] as [number, number, number] },
      { id: 'far', kind: 'landmark' as const, at: [40.5, 1, 40.5] as [number, number, number] },
    ];
    const map = drawnMap(['1111w', '1111w', '1#11w'], { places });
    expect(map.placesNear(12, 12, 5).map((p) => p.id)).toEqual(['near']);
    expect(map.placesNear(25, 25, 30).map((p) => p.id).sort()).toEqual(['far', 'near']);
    expect(map.snap({ x: 1.5, y: 1, z: 2.5 }, 3)).toEqual({ x: 1, y: 1, z: 1 });
    expect(map.snap({ x: 4.5, y: 1, z: 0.5 }, 3)).toEqual({ x: 3, y: 1, z: 0 });
    expect(drawnMap(['#']).snap({ x: 0, y: 1, z: 0 }, 3)).toBeNull();
  });

  it('gives no grid for a map without one, one with broken files, or a bad map id, and says so once', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const store = new WalkStore(contentWith('tiny', { json: tinyJson(), bin: new Uint8Array([1, 2, 3]) }));
      expect(store.get('tiny')).toBeNull();
      expect(store.get('tiny')).toBeNull();
      expect(store.get('nowhere')).toBeNull();
      expect(store.get('../secrets')).toBeNull();
      expect(warn).toHaveBeenCalledTimes(3);
      expect(new WalkStore(contentWith('tiny', { json: tinyJson('other'), bin: deflateRawSync(encodeWalkCells(tiny)) })).get('tiny')).toBeNull();
      expect(new WalkStore(contentWith('tiny', { json: '{"version":1}', bin: deflateRawSync(encodeWalkCells(tiny)) })).get('tiny')).toBeNull();
    } finally {
      warn.mockRestore();
    }
  });

  it("reads the repository's content by default (the release ships content/ beside the server), quickly and compactly", () => {
    const store = new WalkStore();
    const started = performance.now();
    const map = store.get('truong-hoc');
    const ms = performance.now() - started;
    expect(map?.sx).toBe(800);
    expect(ms).toBeLessThan(500);
    expect(map?.byteLength ?? Infinity).toBeLessThanOrEqual(MAX_MAP_BYTES);
    expect(store.get('truong-hoc')).toBe(map);
  });

  it('has a grid for every map with bots, and a standing spot near every home', () => {
    const store = new WalkStore();
    for (const [mapId, profiles] of Object.entries(BOT_MAP_CONFIGS)) {
      const map = store.get(mapId);
      expect(map, mapId).not.toBeNull();
      expect(map?.byteLength ?? Infinity, mapId).toBeLessThanOrEqual(MAX_MAP_BYTES);
      for (const p of profiles) expect(map?.snap(p.home, HOME_SNAP), p.id).not.toBeNull();
    }
  });
});
