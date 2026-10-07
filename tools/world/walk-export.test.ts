// The companion bots' standing spots (content/world/walk) against the maps as committed, without exporting again:
// each playable map has both files, they parse and fit their size, they match the map's files in
// assets/manifest.json, they stay within their byte budget, the spawn and the active quests' targets have a spot
// beside them, and a sample of columns of one map stands exactly where the map tools' walk rules say.
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { inflateRawSync } from 'node:zlib';
import { beforeAll, describe, expect, it } from 'vitest';
import { decodeWalkCells, WALK_GROUND, WALK_LEVELS, walkInfoSchema, type WalkCells, type WalkInfo } from '../../packages/voxel/src/walk-cells';
import { Ground } from '../../apps/web/src/game/nav/walk-grid';
import { SPOT_REACH } from '../../apps/web/src/game/nav/walk-goal';
import { loadMapGrid } from './reach-audit';
import { walkBlocking, walkSolid } from './walkable';
import { activeQuestTargets, playableMaps, WALK_DIR, walkSources } from './walk-export';

/** Bytes a map's .bin may take, and the whole folder. */
const MAX_BIN = 300 * 1024;
const MAX_FOLDER = 4 * 1024 * 1024;
/** A spot "beside" a place: within SPOT_REACH across and this many blocks up or down (the auto-walk's goal). */
const PLACE_RISE = 3;
const SAMPLE_COLUMNS = 200;
const SAMPLE_MAP = 'truong-hoc';

const maps = await playableMaps();
let targetsByMap: Map<string, Set<string>>;

beforeAll(async () => {
  targetsByMap = await activeQuestTargets();
});

async function walkOf(map: string): Promise<{ info: WalkInfo; cells: WalkCells; binBytes: number }> {
  const missing = (): never => {
    throw new Error(`content/world/walk/${map}.{json,bin} is missing: run pnpm world:walk ${map}`);
  };
  const info = walkInfoSchema.parse(JSON.parse(await readFile(path.join(WALK_DIR, `${map}.json`), 'utf8').catch(missing)));
  const bin = await readFile(path.join(WALK_DIR, `${map}.bin`)).catch(missing);
  return { info, cells: decodeWalkCells(new Uint8Array(inflateRawSync(bin)), info.size), binBytes: bin.length };
}

/** Whether a column within SPOT_REACH of `at` has a spot within PLACE_RISE of its height. */
function spotBeside(cells: WalkCells, at: readonly number[]): boolean {
  const [px = 0, py = 0, pz = 0] = at;
  for (let z = Math.floor(pz - SPOT_REACH); z <= Math.floor(pz + SPOT_REACH); z++) {
    for (let x = Math.floor(px - SPOT_REACH); x <= Math.floor(px + SPOT_REACH); x++) {
      if (Math.hypot(x + 0.5 - px, z + 0.5 - pz) > SPOT_REACH) continue;
      if (cells.spotsAt(x, z).some((s) => Math.abs(s.feet - py) <= PLACE_RISE)) return true;
    }
  }
  return false;
}

it('counts ground the way the auto-walk does', () => {
  expect(WALK_GROUND).toEqual(Ground);
});

it('stays within its byte budget', async () => {
  let total = 0;
  for (const map of maps) {
    for (const ext of ['bin', 'json']) total += (await stat(path.join(WALK_DIR, `${map}.${ext}`))).size;
  }
  expect(total).toBeLessThanOrEqual(MAX_FOLDER);
});

describe.each(maps)('walk grid of %s', (map) => {
  it('parses, fits its size and is up to date with the map', async () => {
    const { info, binBytes } = await walkOf(map);
    expect(info.map).toBe(map);
    expect(binBytes).toBeLessThanOrEqual(MAX_BIN);
    expect(info.sources, `the map, its blocks, models or events changed since its walk grid was made: run pnpm world:walk ${map}`).toBe(await walkSources(map));
  });

  it('has a spot beside the spawn and each active quest target', async () => {
    const { info, cells } = await walkOf(map);
    const byId = new Map(info.places.map((p) => [p.id, p]));
    const spawn = byId.get('spawn');
    expect(spawn && spotBeside(cells, spawn.at), 'no spot beside the spawn').toBe(true);
    const targets = [...(targetsByMap.get(map) ?? [])].sort();
    const notPlaced = targets.filter((id) => !byId.has(id));
    expect(notPlaced, 'quest targets missing from the places').toEqual([]);
    const without = targets.filter((id) => {
      const place = byId.get(id);
      return place !== undefined && !spotBeside(cells, place.at);
    });
    expect(without, 'quest targets with no spot beside them').toEqual([]);
  });
});

describe(`walk grid of ${SAMPLE_MAP} against the map's blocks`, () => {
  // Reading the map's 49 regions and its props takes a few seconds; on a busy CI machine longer.
  it(
    'stands on the lowest spots of a sample of columns exactly where the walk rules say',
    async () => {
      const { info, cells } = await walkOf(SAMPLE_MAP);
      const { grid } = await loadMapGrid(SAMPLE_MAP);
      const [solidBlock, blockingBlock] = [await walkSolid(), await walkBlocking()];
      // Props: -1 is something to step onto, -2 something never stood on (reach-audit.ts).
      const solid = (id: number): boolean => id < 0 || solidBlock(id);
      const blocking = (id: number): boolean => id === -2 || blockingBlock(id);
      const [sx, sz] = info.size;
      const height = info.height;
      // Columns at a fixed seed (mulberry32): half anywhere on the core, half where the grid has a floor over the ground.
      let seed = 0x5eed;
      const random = (): number => {
        seed = (seed + 0x6d2b79f5) | 0;
        let t = seed;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      const layered: Array<[number, number]> = [];
      for (let z = 0; z < sz; z++) for (let x = 0; x < sx; x++) if (cells.spotsAt(x, z).length > 1) layered.push([x, z]);
      expect(layered.length, 'no column with a floor over the ground').toBeGreaterThan(0);
      const sample: Array<[number, number]> = [];
      for (let n = 0; n < SAMPLE_COLUMNS / 2; n++) {
        sample.push([Math.floor(random() * sx), Math.floor(random() * sz)]);
        sample.push(layered[Math.floor(random() * layered.length)] ?? [0, 0]);
      }
      const mismatched: string[] = [];
      for (const [x, z] of sample) {
        const expected: number[] = [];
        for (let y = 1; y < height - 1 && expected.length < WALK_LEVELS; y++) {
          const under = grid.get(x, y - 1, z);
          if (solid(under) && !blocking(under) && !solid(grid.get(x, y, z)) && !solid(grid.get(x, y + 1, z))) expected.push(y);
        }
        const actual = cells.spotsAt(x, z).map((s) => s.feet);
        if (actual.join(',') !== expected.join(',')) mismatched.push(`(${x}, ${z}): grid ${actual.join(',') || '-'}, blocks ${expected.join(',') || '-'}`);
      }
      expect(mismatched).toEqual([]);
    },
    60_000,
  );
});
