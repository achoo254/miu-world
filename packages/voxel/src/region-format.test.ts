import { describe, expect, it } from 'vitest';
import { VoxelWorld } from './chunk-format';
import { REGION_BLOCKS, buildHorizon, decodeHorizon, encodeHorizon, encodeRegions, insertRegion, regionCounts, regionFile, regionOf } from './region-format';

/** A world that is not a whole number of regions wide, with a pattern that differs in every chunk. */
function sample(): VoxelWorld {
  const world = new VoxelWorld([10, 2, 9]);
  const [sx, sy, sz] = world.size;
  for (let x = 0; x < sx; x++) for (let z = 0; z < sz; z++) for (let y = 0; y < (x * 7 + z * 3) % sy; y++) world.set(x, y, z, 1 + ((x + y + z) % 5));
  return world;
}

describe('region format', () => {
  it('splits a world into 8 x 8 chunk regions and puts it back together exactly', () => {
    const world = sample();
    const regions = encodeRegions(world);
    expect(regionCounts(world.chunks)).toEqual([2, 2]);
    expect(regions.map((r) => regionFile(r.rx, r.rz))).toEqual(['regions/r0-0.bin', 'regions/r1-0.bin', 'regions/r0-1.bin', 'regions/r1-1.bin']);
    const rebuilt = new VoxelWorld(world.chunks);
    for (const r of regions) insertRegion(rebuilt, r.rx, r.rz, r.bytes);
    expect(Buffer.from(rebuilt.data).equals(Buffer.from(world.data))).toBe(true);
    expect(() => insertRegion(new VoxelWorld([20, 2, 20]), 1, 1, regions[3]?.bytes ?? new Uint8Array())).toThrow(/expected/);
  });

  it('finds the region of a column', () => {
    expect(regionOf(0, 0)).toEqual([0, 0]);
    expect(regionOf(REGION_BLOCKS - 1, REGION_BLOCKS)).toEqual([0, 1]);
  });

  it('keeps the top block of every 4 x 4 cell for the far horizon, round trip', () => {
    const world = sample();
    const horizon = buildHorizon(world);
    expect(horizon.cells).toEqual([40, 36]);
    const back = decodeHorizon(encodeHorizon(horizon));
    expect(back).toEqual(horizon);
    // The first cell's highest block: column (3, 3) reaches (3 * 7 + 3 * 3) % 32 = 30 blocks.
    expect(back.heights[0]).toBe(30);
  });
});
