import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { encodeWorld } from '../../packages/voxel/src/chunk-format';
import { RegionCatalog } from '../../packages/schema/src/region';
import { worldEntitiesSchema } from '../../packages/voxel/src/world-entities';
import { REPO_ROOT, readJson } from '../assets/asset-lib';
import { generateWorldOverview, regionHotspots } from './generate-world-overview';

describe('world overview map', async () => {
  const first = await generateWorldOverview();
  const { regions } = await readJson(path.join(REPO_ROOT, 'content/world/regions.json'), RegionCatalog);

  it('is deterministic and valid', async () => {
    const again = await generateWorldOverview();
    expect(Buffer.from(encodeWorld(again.world)).equals(Buffer.from(encodeWorld(first.world)))).toBe(true);
    expect(again.entities).toEqual(first.entities);
    expect(() => worldEntitiesSchema.parse(first.entities)).not.toThrow();
  });

  it('gives every region an island with a landmark for its label', () => {
    expect(first.entities.landmarks.map((l) => l.id).sort()).toEqual(regions.map((r) => r.id).sort());
  });

  it('keeps the labels in content/world/regions.json where the render shows each island', () => {
    const hotspots = regionHotspots(first.entities);
    for (const region of regions) {
      const expected = hotspots[region.id];
      expect(expected, region.id).toBeDefined();
      // `pnpm world:overview` writes them; re-run it when the islands or the camera move.
      expect(region.hotspot, region.id).toEqual(expected);
      expect(region.hotspot.x).toBeGreaterThan(5);
      expect(region.hotspot.x).toBeLessThan(95);
    }
  });

  it('leaves a margin of sky round the map so no island is cut at its edge', () => {
    const [sx, sy, sz] = first.world.size;
    for (let y = 0; y < sy; y++) {
      for (let i = 0; i < sx; i++) {
        for (const [x, z] of [[i, 0], [i, sz - 1], [0, i], [sx - 1, i]] as const) expect(first.world.get(x, y, z), `${x},${y},${z}`).toBe(0);
      }
    }
  });
});
