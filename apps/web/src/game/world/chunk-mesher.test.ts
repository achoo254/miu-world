import { describe, expect, it } from 'vitest';
import type { AtlasBlock } from '@miu/voxel/block-table';
import { VoxelWorld } from '@miu/voxel/chunk-format';
import { PATCH_BLOCKS, createChunkMesher, createPatchMesher } from './chunk-mesher';

const rect: [number, number, number, number] = [0, 0, 16, 16];
/** The mesher reads any block source: a dense test world here. */
const reader = (world: VoxelWorld) => ({ get: (x: number, y: number, z: number) => world.get(x, y, z), height: world.size[1] });
const block = (id: number, name: string, solid: boolean, glow = false): AtlasBlock => ({ id, name, top: rect, side: rect, bottom: rect, solid, transparent: false, liquid: false, glow });

describe('chunk mesher', () => {
  it('marks the faces of what the child walks through (a leaf), so trees in the way can fade, and nothing else', () => {
    const world = new VoxelWorld([16, 16, 16]);
    world.set(2, 0, 2, 1); // grass
    world.set(8, 0, 8, 6); // leaves
    const geo = createChunkMesher(reader(world), [block(1, 'grass', true), block(6, 'leaves', false)], 256)(0, 0, 0).opaque;
    const flags = [...(geo?.extra.seeThrough ?? [])];
    // Two cubes, six faces of four vertices each: one cube flagged 1 (leaves), grass flagged 0.
    expect(flags).toHaveLength(48);
    expect(flags.filter((f) => f === 1)).toHaveLength(24);
    expect(flags.filter((f) => f === 0)).toHaveLength(24);
  });

  it('marks ground terrain and plank floors as 0 (never fades), solid obstacles as 0.5, and leaves as 1', () => {
    const world = new VoxelWorld([16, 16, 16]);
    world.set(1, 0, 1, 8); // path (ground)
    world.set(3, 0, 3, 15); // brick-red (solid obstacle)
    world.set(5, 0, 5, 7); // planks
    const blocks = [
      block(8, 'path', true),
      block(15, 'brick-red', true),
      block(7, 'planks', true),
    ];
    const geo = createChunkMesher(reader(world), blocks, 256)(0, 0, 0).opaque;
    expect(geo).not.toBeNull();
    const flags = [...(geo?.extra.seeThrough ?? [])];
    // 3 cubes * 6 faces * 4 vertices = 72 vertices
    expect(flags).toHaveLength(72);
    // path: all 6 faces (24 verts) are 0
    // planks: top face (4 verts) is 0 (floor), 5 other faces (20 verts) are 0.5
    // brick-red: all 6 faces (24 verts) are 0.5
    // Total 0: 24 (path) + 4 (plank floor) = 28
    // Total 0.5: 24 (brick-red) + 20 (plank sides/bottom) = 44
    expect(flags.filter((f) => f === 0)).toHaveLength(28);
    expect(flags.filter((f) => f === 0.5)).toHaveLength(44);
  });

  it('marks the faces of a glowing block (a lantern) and nothing else', () => {
    const world = new VoxelWorld([16, 16, 16]);
    world.set(2, 0, 2, 1); // grass
    world.set(8, 0, 8, 38); // lantern
    const geo = createChunkMesher(reader(world), [block(1, 'grass', true), block(38, 'lantern', true, true)], 256)(0, 0, 0).opaque;
    const flags = [...(geo?.extra.glow ?? [])];
    expect(flags).toHaveLength(48);
    expect(flags.filter((f) => f === 1)).toHaveLength(24);
  });

  it('meshes a patch of 2 x 2 chunk columns, the whole height, into one geometry, and only that patch', () => {
    const world = new VoxelWorld([4, 2, 4]);
    world.set(1, 0, 1, 1); // patch 0,0, bottom chunk
    world.set(20, 20, 20, 1); // patch 0,0, chunk 1,1,1
    world.set(PATCH_BLOCKS + 3, 0, 3, 1); // patch 1,0
    const mesh = createPatchMesher(reader(world), [block(1, 'grass', true)], 256);
    // Two separate cubes in patch 0,0: twelve faces of four vertices; one cube in patch 1,0.
    expect((mesh(0, 0).opaque?.positions.length ?? 0) / 3).toBe(48);
    expect((mesh(1, 0).opaque?.positions.length ?? 0) / 3).toBe(24);
    expect(mesh(1, 1).opaque).toBeNull();
  });
});
