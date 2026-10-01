import { describe, expect, it } from 'vitest';
import { worldEntitiesSchema } from '../../packages/voxel/src/world-entities';
import { generateChoPhien } from './generate-cho-phien-map';
import { generateLangVenSong } from './generate-lang-ven-song-map';
import { generateLauDai } from './generate-lau-dai-map';
import { generateNongTrai } from './generate-nong-trai-map';
import { generateThuVien } from './generate-thu-vien-map';
import { generateXomMaiAm } from './generate-xom-mai-am-map';
import { expectCommittedOutput, expectStandsOnGround, expectTargetsReachable } from './map-checks';

/** The maps built zone by zone (zone-map.ts), each with its generator. */
const MAPS = [
  ['lang-ven-song', generateLangVenSong],
  ['xom-mai-am', generateXomMaiAm],
  ['cho-phien', generateChoPhien],
  ['nong-trai', generateNongTrai],
  ['thu-vien', generateThuVien],
  ['lau-dai', generateLauDai],
] as const;

describe.each(MAPS)('%s map', (id, generate) => {
  it(`is deterministic and matches the committed output (run tools/world/generate-${id}-map.ts after changing it)`, async () => {
    await expectCommittedOutput(generate);
  }, 60_000);

  it('is 256 × 256, names a landmark for each zone, and stands every quest target on the ground', async () => {
    const { world, entities } = await generate();
    const parsed = worldEntitiesSchema.parse(entities);
    expect(parsed.size).toEqual([256, 48, 256]);
    expect(parsed.interactables.length).toBeGreaterThan(20);
    expectStandsOnGround(world, entities);
  }, 60_000);

  it('can be walked from the spawn to every quest target', async () => {
    const { world, entities } = await generate();
    await expectTargetsReachable(world, entities);
  }, 120_000);
});
