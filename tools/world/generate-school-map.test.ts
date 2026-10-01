import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { worldEntitiesSchema } from '../../packages/voxel/src/world-entities';
import { ASSETS_DIR } from '../assets/asset-lib';
import { CAMPUS, MAIN_BUILDING, ZONES, generateSchool } from './generate-school-map';
import { expectCommittedOutput, expectStandsOnGround, expectTargetsReachable, walkFromSpawn } from './map-checks';

// The hub is generated once for its checks (some 10 s for 800 x 800 blocks, the walk search a few more).
describe('school hub map generator', () => {
  let map: Awaited<ReturnType<typeof generateSchool>>;
  beforeAll(async () => {
    map = await generateSchool();
  }, 120_000);

  it('matches the committed output (run `pnpm world:school` after changing it)', async () => {
    await expectCommittedOutput(map);
  }, 30_000);

  it("is 800 x 800 with the campus in the middle, a zone per chapter and the first lesson's targets in chapter 1", async () => {
    const parsed = worldEntitiesSchema.parse(map.entities);
    expect(parsed.size).toEqual([800, 48, 800]);
    expect(CAMPUS.x0).toBeGreaterThan(250);
    expect(ZONES.map((z) => z.chapter)).toEqual([1, 2, 3, 4]);
    expect(parsed.landmarks.map((l) => l.name)).toEqual(expect.arrayContaining([...ZONES.map((z) => z.name), 'Cột cờ', 'Sân bóng', 'Cổng trường', 'Bến tàu', 'Hải đăng']));
    const quest = JSON.parse(await readFile(path.join(ASSETS_DIR, '../content/quests/toan2-cd1-b01.json'), 'utf8')) as { steps: Array<{ target?: string }> };
    for (const target of new Set(quest.steps.flatMap((s) => (s.target ? [s.target] : [])))) {
      const t = parsed.interactables.find((i) => i.id === target);
      expect(t?.chapter === 1 || t?.chapters?.includes(1), target).toBe(true);
    }
    expectStandsOnGround(map.world, map.entities);
  });

  it('has a gate into each of the seven theme maps', () => {
    const gates = map.entities.interactables.filter((t) => t.kind === 'gate').map((t) => t.travel).sort();
    expect(gates).toEqual(['cho-phien', 'khu-rung-bi-mat', 'lang-ven-song', 'lau-dai', 'nong-trai', 'thu-vien', 'xom-mai-am']);
  });

  it('can be walked from the school gate to every quest target and gate, into the classroom and up to the one upstairs', async () => {
    const { world, entities } = map;
    const { spots, reaches: at } = await walkFromSpawn(world, entities);
    await expectTargetsReachable(world, entities);
    for (const zone of ZONES) expect(at(zone.x, zone.z), zone.name).toBe(true);
    const lop = entities.landmarks.find((l) => l.id === 'lop-hoc');
    const [lx = 0, ly = 0, lz = 0] = lop?.position ?? [];
    expect(at(Math.floor(lx), Math.floor(lz), ly), 'the classroom downstairs').toBe(true);
    // Upstairs: the same classroom one storey (four blocks) higher.
    expect(at(Math.floor(lx), Math.floor(lz), ly + 4), 'the classroom upstairs').toBe(true);
    expect(MAIN_BUILDING.x1 - MAIN_BUILDING.x0).toBeGreaterThan(60);
    // Trees do not snag her: she walks through trunks (and canopies) as through air.
    const blocks = JSON.parse(await readFile(path.join(ASSETS_DIR, '../content/blocks.json'), 'utf8')) as { blocks: Array<{ id: number; name: string }> };
    const trunk = blocks.blocks.find((b) => b.name === 'tree-log')?.id;
    expect([...spots].some((key) => world.get(...(key.split(',').map(Number) as [number, number, number])) === trunk)).toBe(true);
  }, 120_000);
});
