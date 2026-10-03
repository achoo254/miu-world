import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { worldEntitiesSchema } from '../../packages/voxel/src/world-entities';
import { generateChoPhien } from './generate-cho-phien-map';
import { generateDaoBiAn } from './generate-dao-bi-an-map';
import { generateLangVenSong } from './generate-lang-ven-song-map';
import { generateLauDai } from './generate-lau-dai-map';
import { generateNhaCuaBe } from './generate-nha-cua-be-map';
import { generateNongTrai } from './generate-nong-trai-map';
import { generateNuiTuyet } from './generate-nui-tuyet-map';
import { generateThuVien } from './generate-thu-vien-map';
import { generateTrungTam } from './generate-trung-tam-map';
import { generateXomMaiAm } from './generate-xom-mai-am-map';
import { expectCommittedOutput, expectLively, expectStandsOnGround, expectTargetsReachable } from './map-checks';
import { RegionCatalog } from '../../packages/schema/src/region';
import { REPO_ROOT } from '../assets/asset-lib';
import { sideQuestTableOf } from '../content/side-quest-table';

const regionOfMap = new Map(RegionCatalog.parse(JSON.parse(readFileSync(path.join(REPO_ROOT, 'content/world/regions.json'), 'utf8'))).regions.map((r) => [r.map, r.id]));

/** What a wide theme map holds at least: interactables (lessons, gates, rides), people at work and animals. */
const WIDE = { targets: 21, people: 8, animals: 30 } as const;
/**
 * The maps built zone by zone (zone-map.ts), each with its generator, its side in blocks and what it holds at
 * least. The child's home is a house and its grounds: one welcome lesson, the gate, the name board and the
 * timetable and uniform calendar on its walls; its family, neighbours and farmyard.
 */
const MAPS = [
  ['lang-ven-song', generateLangVenSong, 800, WIDE],
  ['xom-mai-am', generateXomMaiAm, 800, WIDE],
  ['cho-phien', generateChoPhien, 800, WIDE],
  ['nong-trai', generateNongTrai, 800, WIDE],
  ['thu-vien', generateThuVien, 800, WIDE],
  ['lau-dai', generateLauDai, 800, WIDE],
  ['trung-tam', generateTrungTam, 800, WIDE],
  ['dao-bi-an', generateDaoBiAn, 800, WIDE],
  ['nui-tuyet', generateNuiTuyet, 800, WIDE],
  ['nha-cua-be', generateNhaCuaBe, 160, { targets: 10, people: 6, animals: 15 }],
] as const;

// Each map is generated once for its checks: an 800-block map takes some 15 s to build, and the walk
// search over it a few more (budget: docs/code-standards.md).
describe.each(MAPS)('%s map', (id, generate, side, least) => {
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
    expect(parsed.interactables.length).toBeGreaterThanOrEqual(least.targets);
    expectStandsOnGround(map.world, map.entities);
  });

  it('is lively: people at their everyday work and animals about', () => {
    expectLively(map.entities, least);
  });

  it('places every character who offers minigames, in the world whichever lesson is played, with its company', () => {
    const table = sideQuestTableOf(regionOfMap.get(id) ?? id);
    expect(table.givers.length).toBeGreaterThanOrEqual(3);
    const byId = new Map(map.entities.interactables.map((t) => [t.id, t]));
    for (const giver of table.givers) {
      const t = byId.get(giver.id);
      expect(t, giver.id).toBeDefined();
      expect([t?.chapter, t?.chapters, t?.quest], giver.id).toEqual([undefined, undefined, undefined]);
    }
    const folk = (map.entities.ambients ?? []).filter((a) => a.id.startsWith('folk-'));
    expect(folk.length).toBe(table.givers.reduce((n, g) => n + g.company.length, 0) + table.residents.length);
  });

  it('can be walked from the spawn to every quest target', async () => {
    await expectTargetsReachable(map.world, map.entities);
  }, 120_000);
});
