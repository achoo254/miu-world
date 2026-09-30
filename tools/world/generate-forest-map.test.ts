import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { encodeWorld } from '../../packages/voxel/src/chunk-format';
import { worldEntitiesSchema } from '../../packages/voxel/src/world-entities';
import { ROUTINES, spotsUsed } from '../../apps/web/src/game/ambient/ambient-routines';
import { ASSETS_DIR } from '../assets/asset-lib';
import { QUEST_CLEARANCE } from './forest-life';
import { MAP_ID, generateForest } from './generate-forest-map';

const OUT = path.join(ASSETS_DIR, 'generated/world', MAP_ID);

describe('forest chapter 1 generator', () => {
  it('is deterministic and matches the committed output (run `pnpm world:forest` after changing it)', async () => {
    const first = await generateForest();
    const second = await generateForest();
    const bytes = encodeWorld(first.world);
    expect(Buffer.from(encodeWorld(second.world)).equals(Buffer.from(bytes))).toBe(true);
    expect(second.entities).toEqual(first.entities);

    expect(Buffer.from(bytes).equals(await readFile(path.join(OUT, 'chunks.bin')))).toBe(true);
    expect(JSON.parse(await readFile(path.join(OUT, 'entities.json'), 'utf8'))).toEqual(first.entities);
  }, 60_000);

  it('places every chapter 1 quest target once, with a valid version 2 schema', async () => {
    const { world, entities } = await generateForest();
    const parsed = worldEntitiesSchema.parse(entities);
    expect(parsed.interactables.map((t) => t.id).sort()).toEqual(
      [
        'ancient-tree', 'animal-beaver', 'chest', 'clue-box', 'clue-letter', 'clue-mushroom', 'gate-ch2', 'parrot-guide', 'stream-stones',
        // Stand-ins for the first two Tiếng Việt quests until their chapter map exists.
        'sau-xanh', 'bang-go-lop-hai', 'goc-cay-lich-la', 'voi-bao', 'tv2-t01-to-lich-bui-hong', 'tv2-t01-to-lich-ruong-lua',
        'tv2-t01-to-lich-ban-hoc', 'tv2-t01-bang-chu-cai', 'tv2-t01-hoc-cay',
      ].sort(),
    );
    // The stand-ins belong to chapter 2 only; chapter 1's own targets carry no chapter.
    const ch1 = new Set(['ancient-tree', 'animal-beaver', 'chest', 'clue-box', 'clue-letter', 'clue-mushroom', 'gate-ch2', 'parrot-guide', 'stream-stones']);
    for (const t of parsed.interactables) expect(t.chapter, t.id).toBe(ch1.has(t.id) ? undefined : 2);
    // Targets stand on the surface: never inside a solid block.
    for (const t of parsed.interactables) {
      const [x, y, z] = t.position.map(Math.floor) as [number, number, number];
      expect(world.get(x, y, z), `${t.id} is buried`).toBe(0);
    }
  }, 60_000);

  it('gives the forest villagers and animals every place their chores need, clear of quests', async () => {
    const { world, entities } = await generateForest();
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
