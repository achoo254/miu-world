import { describe, expect, it } from 'vitest';
import type { AtlasBlock } from '@miu/voxel/block-table';
import { VoxelWorld } from '@miu/voxel/chunk-format';
import { createChunkMesher } from './chunk-mesher';

const rect: [number, number, number, number] = [0, 0, 16, 16];
const block = (id: number, name: string, solid: boolean): AtlasBlock => ({ id, name, top: rect, side: rect, bottom: rect, solid, transparent: false, liquid: false });

describe('chunk mesher', () => {
  it('marks the faces of what the child walks through (a leaf), so trees in the way can fade, and nothing else', () => {
    const world = new VoxelWorld([16, 16, 16]);
    world.set(2, 0, 2, 1); // grass
    world.set(8, 0, 8, 6); // leaves
    const geo = createChunkMesher(world, [block(1, 'grass', true), block(6, 'leaves', false)], 256)(0, 0, 0).opaque;
    const flags = [...(geo?.extra.seeThrough ?? [])];
    // Two cubes, six faces of four vertices each: one cube flagged, one not.
    expect(flags).toHaveLength(48);
    expect(flags.filter((f) => f === 1)).toHaveLength(24);
  });
});
