import { beforeAll, describe, expect, it } from 'vitest';
import { worldEntitiesSchema } from '../../packages/voxel/src/world-entities';
import { ROUTINES, spotsUsed } from '../../apps/web/src/game/ambient/ambient-routines';
import { QUEST_CLEARANCE } from './forest-life';
import { generateForest } from './generate-forest-map';
import { expectCommittedOutput, expectStandsOnGround, expectTargetsReachable } from './map-checks';

// The 800-block forest is generated once for its checks (some 20 s, the walk search more).
describe('forest generator', () => {
  let map: Awaited<ReturnType<typeof generateForest>>;
  beforeAll(async () => {
    map = await generateForest();
  }, 120_000);

  it('matches the committed output (run `pnpm world:forest` after changing it)', async () => {
    await expectCommittedOutput(map);
  }, 30_000);

  it('places every chapter 1 quest target once, with a valid version 2 schema', async () => {
    const { world, entities } = map;
    const parsed = worldEntitiesSchema.parse(entities);
    // Chapter 1's own targets carry no chapter; every other target (the Tiếng Việt quests' places, placed
    // from content/world/targets.json) is tagged with the chapters or the quest it belongs to.
    const ch1 = ['ancient-tree', 'animal-beaver', 'chest', 'clue-box', 'clue-letter', 'clue-mushroom', 'cong-truong-hoc', 'gate-ch2', 'parrot-guide', 'stream-stones'];
    // The forest train's stops (rides to the glades and back) stand in every chapter too.
    const untagged = parsed.interactables.filter((t) => t.chapter === undefined && t.chapters === undefined && !t.ride);
    expect(untagged.map((t) => t.id).sort()).toEqual(ch1.sort());
    expect(parsed.interactables.filter((t) => t.ride)).toHaveLength(8);
    for (const t of parsed.interactables.filter((t) => !ch1.includes(t.id) && !t.ride)) expect(t.chapter ?? t.chapters?.[0], t.id).toBeGreaterThanOrEqual(2);
    expectStandsOnGround(world, entities);
  }, 60_000);

  it('can be walked from the spawn to every quest target', async () => {
    const { world, entities } = map;
    await expectTargetsReachable(world, entities);
  }, 120_000);

  it('gives the forest villagers and animals every place their chores need, clear of quests', async () => {
    const { world, entities } = map;
    const ambients = worldEntitiesSchema.parse(entities).ambients ?? [];
    const routines = new Set(ambients.map((a) => a.routine));
    for (const r of ['woodcutter', 'fisher', 'gardener', 'cook', 'firewood-carrier', 'parrot', 'bee', 'deer', 'fish'] as const) expect(routines).toContain(r);
    expect(ambients.filter((a) => ROUTINES[a.routine].kind === 'person')).toHaveLength(5);
    const quest = entities.interactables.map((t) => [t.position[0] ?? 0, t.position[2] ?? 0] as const);
    for (const a of ambients) {
      expect(Object.keys(a.spots).sort(), a.id).toEqual(expect.arrayContaining(spotsUsed(ROUTINES[a.routine])));
      // Walkers stand on the ground, never inside a block; flyers and fish have their own heights.
      if (ROUTINES[a.routine].kind === 'person' || ROUTINES[a.routine].kind === 'animal') {
        for (const [x, y, z] of [a.position, ...Object.values(a.spots).filter((s) => s !== a.spots.trunk && s !== a.spots.pot)]) {
          expect(world.get(Math.floor(x), Math.floor(y), Math.floor(z)), `${a.id} spot at ${x},${y},${z} is buried`).toBe(0);
          for (const [qx, qz] of quest) expect(Math.hypot(qx - x, qz - z), `${a.id} crowds a quest target`).toBeGreaterThanOrEqual(QUEST_CLEARANCE);
        }
      }
    }
  }, 60_000);
});
