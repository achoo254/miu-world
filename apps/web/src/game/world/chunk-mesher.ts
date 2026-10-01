// Meshes one 16³ chunk into an opaque atlas-textured geometry and a water surface geometry.
// Pure data in/out so it runs identically in the Web Worker and on the main thread.
import { blockLookup, type AtlasBlock } from '@miu/voxel/block-table';
import { CHUNK_SIZE, VoxelWorld } from '@miu/voxel/chunk-format';
import { greedyQuads, quadsToGeometry, type Quad, type QuadGeometry } from '@miu/voxel/greedy-mesher';

export interface ChunkGeometry {
  key: string;
  origin: [number, number, number];
  opaque: QuadGeometry | null;
  water: QuadGeometry | null;
}

const OPAQUE_MARKER = 255;
const DIMS = [CHUNK_SIZE, CHUNK_SIZE, CHUNK_SIZE] as const;

export type ChunkMesher = (cx: number, cy: number, cz: number) => ChunkGeometry;

export function createChunkMesher(world: VoxelWorld, blocks: readonly AtlasBlock[], atlasSize: number): ChunkMesher {
  const lookup = blockLookup(blocks);
  const isLiquid = (id: number): boolean => lookup(id)?.liquid ?? false;
  const isTransparent = (id: number): boolean => lookup(id)?.transparent ?? false;
  /** What the child walks through (leaves, tree wood) also fades when it hides her from the camera. */
  const seeThrough = (q: Quad): number[] => {
    const block = lookup(q.id);
    return [block && !block.solid && !block.liquid ? 1 : 0];
  };

  /** Tile rect (normalised x, y, w, h) for the face a quad represents. */
  const tileRect = (q: Quad): number[] => {
    const block = lookup(q.id);
    if (!block) return [0, 0, 0, 0];
    const rect = q.axis === 1 ? (q.dir > 0 ? block.top : block.bottom) : block.side;
    return rect.map((v) => v / atlasSize);
  };

  return function meshChunk(cx: number, cy: number, cz: number): ChunkGeometry {
    const ox = cx * CHUNK_SIZE;
    const oy = cy * CHUNK_SIZE;
    const oz = cz * CHUNK_SIZE;
    // Opaque pass: liquids count as air so the river bed stays visible under the water.
    const opaqueQuads = greedyQuads(
      DIMS,
      (x, y, z) => {
        const id = world.get(ox + x, oy + y, oz + z);
        return isLiquid(id) ? 0 : id;
      },
      (id) => id !== 0 && !isTransparent(id),
    );
    // Water pass: every non-liquid block is an opaque wall, so only surfaces facing air remain.
    const waterQuads = greedyQuads(
      DIMS,
      (x, y, z) => {
        const id = world.get(ox + x, oy + y, oz + z);
        return id === 0 ? 0 : isLiquid(id) ? id : OPAQUE_MARKER;
      },
      (id) => id === OPAQUE_MARKER,
    ).filter((q) => q.id !== OPAQUE_MARKER);

    const build = (quads: Quad[]): QuadGeometry | null =>
      quads.length === 0
        ? null
        : quadsToGeometry(quads, { offset: [ox, oy, oz], attributes: { tileRect: { size: 4, value: tileRect }, seeThrough: { size: 1, value: seeThrough } } });
    return { key: `${cx},${cy},${cz}`, origin: [ox, oy, oz], opaque: build(opaqueQuads), water: build(waterQuads) };
  };
}
