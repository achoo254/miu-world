import { describe, expect, it } from 'vitest';
import { entitiesForChapter, worldEntitiesSchema } from './world-entities';

const base = {
  version: 2,
  id: 'test-map',
  seed: 1,
  size: [16, 16, 16],
  waterLevel: 4,
  spawn: { position: [1, 5, 1], yaw: 0 },
  props: [{ model: 'packs/p/fence.glb', position: [2, 5, 2], yaw: 0, scale: 1 }],
  landmarks: [{ id: 'tree', name: 'Cây', position: [8, 5, 8] }],
};
const parrot = {
  id: 'parrot-guide',
  kind: 'npc',
  name: 'Vẹt',
  label: 'Nói chuyện',
  position: [3, 5, 3],
  yaw: 0,
  radius: 3,
  model: 'packs/p/parrot.glb',
  scale: 0.5,
  animation: 'idle',
};

describe('world entities (version 2)', () => {
  it('reads interactables with a model, a built shape, or neither (terrain-drawn)', () => {
    const parsed = worldEntitiesSchema.parse({
      ...base,
      interactables: [
        parrot,
        { id: 'clue-letter', kind: 'object', name: 'Lá thư', label: 'Đọc thư', position: [4, 5, 4], yaw: 0, radius: 2, shape: 'letter' },
        { id: 'ancient-tree', kind: 'riddle', name: 'Cây cổ thụ', label: 'Giải đố', position: [8, 5, 8], yaw: 0, radius: 5, board: '8 + 5 = ?' },
      ],
    });
    expect(parsed.interactables.map((t) => t.id)).toEqual(['parrot-guide', 'clue-letter', 'ancient-tree']);
  });

  it('refuses version 1 files (npcs list, no interactables)', () => {
    expect(worldEntitiesSchema.safeParse({ ...base, version: 1, npcs: [] }).success).toBe(false);
  });

  it.each([
    ['duplicate ids', [parrot, { ...parrot }]],
    ['a model without a scale', [{ ...parrot, scale: undefined }]],
    ['a model and a built shape', [{ ...parrot, shape: 'letter' }]],
    ['an animation without a model', [{ ...parrot, model: undefined, scale: undefined }]],
    ['an unknown kind', [{ ...parrot, kind: 'door' }]],
    ['an id that is not kebab-case', [{ ...parrot, id: 'Parrot Guide' }]],
  ])('refuses %s', (_, interactables) => {
    expect(worldEntitiesSchema.safeParse({ ...base, interactables }).success).toBe(false);
  });
});

describe('entities for the chapter being played', () => {
  const base = { version: 2, id: 'm', seed: 1, size: [16, 16, 16], waterLevel: 4, spawn: { position: [1, 5, 1], yaw: 0 }, landmarks: [] };
  const target = (id: string, chapter?: number) => ({ id, kind: 'npc', name: id, label: 'Nói chuyện', position: [2, 5, 2], yaw: 0, radius: 2, ...(chapter ? { chapter } : {}) });
  const prop = (model: string, chapter?: number) => ({ model, position: [3, 5, 3], yaw: 0, scale: 1, ...(chapter ? { chapter } : {}) });
  const entities = worldEntitiesSchema.parse({
    ...base,
    interactables: [target('parrot'), target('caterpillar', 2), target('bee', 3)],
    props: [prop('bush.glb'), prop('oak.glb', 2)],
  });

  it('keeps the map\'s own entities and adds only those tagged with the chapter played', () => {
    expect(entitiesForChapter(entities, 1).interactables.map((t) => t.id)).toEqual(['parrot']);
    expect(entitiesForChapter(entities, 1).props.map((p) => p.model)).toEqual(['bush.glb']);
    expect(entitiesForChapter(entities, 2).interactables.map((t) => t.id)).toEqual(['parrot', 'caterpillar']);
    expect(entitiesForChapter(entities, 2).props.map((p) => p.model)).toEqual(['bush.glb', 'oak.glb']);
  });
});
