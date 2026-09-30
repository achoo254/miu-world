import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { encodeWorld } from '../../packages/voxel/src/chunk-format';
import { worldEntitiesSchema } from '../../packages/voxel/src/world-entities';
import { ASSETS_DIR } from '../assets/asset-lib';
import { MAP_ID, ZONES, generateSchool } from './generate-school-map';

const OUT = path.join(ASSETS_DIR, 'generated/world', MAP_ID);

describe('school map generator', () => {
  it('is deterministic and matches the committed output', async () => {
    const first = await generateSchool();
    const second = await generateSchool();
    const bytes = encodeWorld(first.world);
    expect(Buffer.from(encodeWorld(second.world)).equals(Buffer.from(bytes))).toBe(true);
    expect(Buffer.from(bytes).equals(await readFile(path.join(OUT, 'chunks.bin')))).toBe(true);
    expect(JSON.parse(await readFile(path.join(OUT, 'entities.json'), 'utf8'))).toEqual(first.entities);
  }, 60_000);

  it('names a zone for each of the seven Toán topics, and places the first topic\'s characters in theirs', async () => {
    const { world, entities } = await generateSchool();
    const parsed = worldEntitiesSchema.parse(entities);
    expect(ZONES.map((z) => z.topic)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(parsed.landmarks.map((l) => l.name)).toEqual(expect.arrayContaining([...ZONES.map((z) => z.name), 'Cột cờ', 'Sân bóng']));
    // Every target of the first Toán quest stands here, tagged with its topic.
    const quest = JSON.parse(await readFile(path.join(ASSETS_DIR, '../content/quests/toan2-cd1-b01.json'), 'utf8')) as { steps: Array<{ target?: string }> };
    const targets = new Set(quest.steps.flatMap((s) => (s.target ? [s.target] : [])));
    for (const target of targets) expect(parsed.interactables.find((t) => t.id === target)?.chapter, target).toBe(1);
    for (const t of parsed.interactables) {
      const [x, y, z] = t.position.map(Math.floor) as [number, number, number];
      expect(world.get(x, y, z), `${t.id} is buried`).toBe(0);
      expect(world.get(x, y - 1, z), `${t.id} floats`).not.toBe(0);
    }
    // The spawn stands on the ground at the gate, free to walk.
    const [sx, sy, sz] = parsed.spawn.position.map(Math.floor) as [number, number, number];
    expect(world.get(sx, sy, sz)).toBe(0);
  }, 60_000);
});
