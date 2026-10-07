import { describe, expect, it } from 'vitest';
import type { Interactable } from '@miu/voxel/world-entities';
import type { GuardedGltfLoader } from '../asset-loader';
import { loadInteractables, namedForPlayer, pickNearest, spinsInPlace } from './interactables';

const target = (id: string, position: [number, number, number], radius: number, available = true) => ({
  available,
  def: { id, position, radius },
});

describe('pickNearest', () => {
  const parrot = target('parrot-guide', [10, 0, 10], 3);
  const box = target('clue-box', [12, 0, 10], 2);

  it('returns nothing when the player is outside every radius', () => {
    expect(pickNearest([parrot, box], { x: 0, y: 0, z: 0 })).toBeNull();
  });

  it('picks the closest target among those in range', () => {
    expect(pickNearest([parrot, box], { x: 11.6, y: 0, z: 10 })?.def.id).toBe('clue-box');
    expect(pickNearest([parrot, box], { x: 10.4, y: 0, z: 10 })?.def.id).toBe('parrot-guide');
  });

  it('skips hidden targets even when they are closer', () => {
    const hiddenBox = target('clue-box', [12, 0, 10], 2, false);
    expect(pickNearest([parrot, hiddenBox], { x: 11.6, y: 0, z: 10 })?.def.id).toBe('parrot-guide');
  });

  it('gives the prompt to the quest step\'s own target whenever she is within its radius', () => {
    expect(pickNearest([parrot, box], { x: 11.6, y: 0, z: 10 }, 'parrot-guide')?.def.id).toBe('parrot-guide');
    expect(pickNearest([parrot, box], { x: 13.5, y: 0, z: 10 }, 'parrot-guide')?.def.id).toBe('clue-box');
    expect(pickNearest([parrot, target('clue-box', [12, 0, 10], 2, false)], { x: 11.9, y: 0, z: 10 }, 'clue-box')?.def.id).toBe('parrot-guide');
  });

  it("gives the prompt to the step's other clues over a character standing beside them", () => {
    const clue = target('second-clue', [20, 0, 10], 2.5);
    const dog = target('dog', [21, 0, 10], 3);
    // Nearer the dog, by the second clue of the search: the clue the step still takes wins.
    expect(pickNearest([parrot, clue, dog], { x: 20.8, y: 0, z: 10 }, 'first-clue', ['first-clue', 'second-clue'])?.def.id).toBe('second-clue');
    // The arrow's own target still comes first; outside every step target's radius the nearest wins.
    expect(pickNearest([clue, dog, target('first-clue', [21.5, 0, 10], 2)], { x: 21, y: 0, z: 10 }, 'first-clue', ['first-clue', 'second-clue'])?.def.id).toBe('first-clue');
    expect(pickNearest([clue, dog], { x: 23.5, y: 0, z: 10 }, null, ['second-clue'])?.def.id).toBe('dog');
  });

  it('counts height, so a target on a ledge above is out of reach', () => {
    expect(pickNearest([box], { x: 12, y: 3, z: 10 })).toBeNull();
  });
});

describe('namedForPlayer', () => {
  const board: Interactable = { id: 'nha-bien-ten', kind: 'object', name: 'Nhà của {name}', label: 'Đọc biển tên', position: [86.5, 13, 27.5], yaw: 180, radius: 2.5, board: 'Nhà của {name}' };
  const tree: Interactable = { id: 'ancient-tree', kind: 'riddle', name: 'Cây cổ thụ', label: 'Giải câu đố', position: [0, 0, 0], yaw: 0, radius: 3, board: '8 + 5 = ?' };

  it("fills the child's name into a target's name and its painted board", () => {
    const [named] = namedForPlayer([board], 'Mochi');
    expect(named?.name).toBe('Nhà của Mochi');
    expect(named?.board).toBe('Nhà của Mochi');
    expect(named?.label).toBe('Đọc biển tên');
  });

  it('leaves targets without the placeholder as they are, and adds no board where there is none', () => {
    const [same] = namedForPlayer([tree], 'Mochi');
    expect(same).toEqual(tree);
    const [plain] = namedForPlayer([{ ...board, board: undefined }], 'Mochi');
    expect(plain && 'board' in plain && plain.board !== undefined).toBe(false);
  });
});

describe('spinsInPlace', () => {
  it('spins the block-model props and nothing else', () => {
    expect(spinsInPlace({ model: 'generated/props/automobile.glb' })).toBe(true);
    expect(spinsInPlace({ model: 'packs/kenney-cube-pets/animal-cat.glb' })).toBe(false);
    expect(spinsInPlace({})).toBe(false);
  });
});

describe('drawing a target only near the child', () => {
  it('stops drawing a far target yet keeps it available, and a hidden one stays hidden when drawn again', async () => {
    // A terrain-drawn target (no model, no shape) needs no model loader.
    const def = { id: 'far-host', kind: 'object', name: 'Bảng', label: 'Xem', position: [5, 5, 5], yaw: 0, radius: 2 } as Interactable;
    const entities = { interactables: [def] } as unknown as Parameters<typeof loadInteractables>[1];
    const [target] = await loadInteractables({} as GuardedGltfLoader, entities, false);
    if (!target) throw new Error('no target');
    target.setDrawn(false);
    expect(target.root.visible).toBe(false);
    expect(target.available).toBe(true);
    target.setDrawn(true);
    expect(target.root.visible).toBe(true);
    target.setState('hidden');
    target.setDrawn(false);
    target.setDrawn(true);
    expect(target.root.visible).toBe(false);
    expect(target.available).toBe(false);
  });
});

describe('a boss in a fight', () => {
  it('turns to face the child and plays its pose, then goes back to its own ways', async () => {
    const def = { id: 'trum-thu', kind: 'npc', name: 'Trùm', label: 'Thách đấu', position: [0, 5, 0], yaw: 0, radius: 2 } as Interactable;
    const entities = { interactables: [def] } as unknown as Parameters<typeof loadInteractables>[1];
    const [boss] = await loadInteractables({} as GuardedGltfLoader, entities, false);
    if (!boss) throw new Error('no boss');
    const model = boss.root.children[0];
    if (!model) throw new Error('no model');
    // The child stands to its east (+x): facing her is a quarter turn.
    boss.duelPose('hit');
    for (let i = 0; i < 12; i++) boss.update(1 / 60, { x: 4, z: 0 });
    expect(boss.root.rotation.y).toBeGreaterThan(0.3);
    // Staggered by the blow: leaning back and lifted a little.
    expect(model.rotation.x).toBeLessThan(0);
    expect(model.position.y).toBeGreaterThan(0);
    for (let i = 0; i < 180; i++) boss.update(1 / 60, { x: 4, z: 0 });
    expect(boss.root.rotation.y).toBeCloseTo(Math.PI / 2, 2);
    boss.duelPose(null);
    expect(model.rotation.x).toBe(0);
    expect(model.position.y).toBe(0);
    expect(boss.height).toBeGreaterThan(0);
  });
});
