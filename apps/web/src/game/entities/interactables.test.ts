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
