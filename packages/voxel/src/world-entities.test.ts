import { describe, expect, it } from 'vitest';
import { castHidden, entitiesForChapter, worldEntitiesSchema, type Interactable } from './world-entities';

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

  it('shows a recurring character in each of its chapters, and a quest\'s own things only during that quest', () => {
    const more = worldEntitiesSchema.parse({
      ...base,
      interactables: [{ ...target('tho-ti'), chapters: [3, 6] }, { ...target('hu-sanh', 3), quest: 'tv2-t02-b03' }, { ...target('cay-but', 3), quest: 'tv2-t02-b04' }],
      props: [],
    });
    const ids = (chapter: number, quest?: string) => entitiesForChapter(more, chapter, quest).interactables.map((t) => t.id);
    expect(ids(3, 'tv2-t02-b03')).toEqual(['tho-ti', 'hu-sanh']);
    expect(ids(3, 'tv2-t02-b04')).toEqual(['tho-ti', 'cay-but']);
    expect(ids(6)).toEqual(['tho-ti']);
    expect(ids(4)).toEqual([]);
    expect(worldEntitiesSchema.safeParse({ ...base, interactables: [{ ...target('x', 2), chapters: [2] }], props: [] }).success).toBe(false);
  });
});

describe('one character in one place at a time', () => {
  const npc = (id: string, extra: Partial<Interactable> = {}): Interactable => ({ ...parrot, kind: 'npc', id, name: 'Hải Ly Cần', ...extra }) as Interactable;
  // A resident beaver, and two places of one lesson where the same beaver meets the child.
  const cast = [npc('hai-ly-can', { chapters: [2, 5] }), npc('hai-ly-lan-go', { chapter: 2, quest: 'toan2-cd2-b10', character: 'hai-ly-can' }), npc('hai-ly-bai-co', { chapter: 2, quest: 'toan2-cd2-b10', character: 'hai-ly-can' })];

  it('shows the entry the current step points at, and keeps the last one pointed at in between', () => {
    expect([...castHidden(cast, ['hai-ly-lan-go'])].sort()).toEqual(['hai-ly-bai-co', 'hai-ly-can']);
    expect([...castHidden(cast, ['hai-ly-lan-go', 'hai-ly-can'])].sort()).toEqual(['hai-ly-bai-co', 'hai-ly-lan-go']);
    expect([...castHidden(cast, ['hai-ly-lan-go', 'toan2-cd2-da-cuoi-tron'])].sort()).toEqual(['hai-ly-bai-co', 'hai-ly-can']);
  });

  it('before any step points at it: the lesson\'s own place first, else the character\'s own entry', () => {
    expect([...castHidden(cast, [])].sort()).toEqual(['hai-ly-can', 'hai-ly-lan-go']);
    expect([...castHidden([cast[0] as Interactable, npc('vet', { character: 'hai-ly-can' })], [])]).toEqual(['vet']);
  });

  it('leaves alone characters met once and things that are not characters', () => {
    const letter = { ...npc('thu', { character: 'hai-ly-can' }), kind: 'object' } as Interactable;
    expect(castHidden([cast[0] as Interactable, letter, npc('tho-ti')], []).size).toBe(0);
  });
});
