import { beforeAll, describe, expect, it } from 'vitest';
import { worldEntitiesSchema } from '../../packages/voxel/src/world-entities';
import { generateChoPhien } from './generate-cho-phien-map';
import { generateLangVenSong } from './generate-lang-ven-song-map';
import { generateLauDai } from './generate-lau-dai-map';
import { generateNongTrai } from './generate-nong-trai-map';
import { generateThuVien } from './generate-thu-vien-map';
import { generateXomMaiAm } from './generate-xom-mai-am-map';
import { expectCommittedOutput, expectStandsOnGround, expectTargetsReachable } from './map-checks';

/** The maps built zone by zone (zone-map.ts), each with its generator and its side in blocks. */
const MAPS = [
  ['lang-ven-song', generateLangVenSong, 800],
  ['xom-mai-am', generateXomMaiAm, 800],
  ['cho-phien', generateChoPhien, 800],
  ['nong-trai', generateNongTrai, 800],
  ['thu-vien', generateThuVien, 800],
  ['lau-dai', generateLauDai, 800],
] as const;

// Each map is generated once for its checks: an 800-block map takes some 15 s to build, and the walk
// search over it a few more (budget: docs/code-standards.md).
describe.each(MAPS)('%s map', (id, generate, side) => {
  let map: Awaited<ReturnType<typeof generate>>;
  beforeAll(async () => {
    map = await generate();
  }, 120_000);

  it(`matches the committed output (run tools/world/generate-${id}-map.ts after changing it)`, async () => {
    await expectCommittedOutput(map);
  }, 30_000);

  it(`is ${side} × ${side}, and stands every quest target on the ground`, () => {
    const parsed = worldEntitiesSchema.parse(map.entities);
    expect(parsed.size).toEqual([side, 48, side]);
    expect(parsed.interactables.length).toBeGreaterThan(20);
    expectStandsOnGround(map.world, map.entities);
  });

  it('can be walked from the spawn to every quest target', async () => {
    await expectTargetsReachable(map.world, map.entities);
  }, 120_000);
});
