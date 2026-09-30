import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { encodeWorld } from '../../packages/voxel/src/chunk-format';
import { worldEntitiesSchema } from '../../packages/voxel/src/world-entities';
import { ASSETS_DIR } from '../assets/asset-lib';
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
});
