// Meshes one 16³ chunk into an opaque atlas-textured geometry and a water surface geometry, and a patch
// (2 x 2 chunk columns) into one of each. Pure data in/out so it runs identically in the Web Worker and on
// the main thread.
import { blockLookup, type AtlasBlock } from '@miu/voxel/block-table';
import { CHUNK_SIZE } from '@miu/voxel/chunk-format';
import { greedyQuads, mergeQuads, quadsToGeometry, type Quad, type QuadGeometry } from '@miu/voxel/greedy-mesher';

export interface ChunkGeometry {
  key: string;
  origin: [number, number, number];
  opaque: QuadGeometry | null;
  water: QuadGeometry | null;
}

const OPAQUE_MARKER = 255;
const DIMS = [CHUNK_SIZE, CHUNK_SIZE, CHUNK_SIZE] as const;

export type ChunkMesher = (cx: number, cy: number, cz: number) => ChunkGeometry;

/** Where blocks are read from: the regions held round the child (sparse-world.ts), any coordinates. */
export interface BlockReader {
  get(x: number, y: number, z: number): number;
  /** World height in blocks. */
  readonly height: number;
}

export const PURE_GROUND_BLOCK_NAMES = new Set([
  'grass',
  'dirt',
  'stone',
  'path',
  'rock-moss',
  'riverbed',
  'snow',
  'asphalt',
  'grass-forest',
  'grass-village',
  'grass-hamlet',
  'grass-farm',
  'grass-library',
  'grass-castle',
  'grass-market',
  'cobble',
  'cobble-grey',
  'paver',
  'trail',
  'farmland',
]);

export function isPureGround(name: string): boolean {
  return PURE_GROUND_BLOCK_NAMES.has(name) || name.startsWith('grass-') || name.startsWith('cobble-');
}

export function createChunkMesher(world: BlockReader, blocks: readonly AtlasBlock[], atlasSize: number): ChunkMesher {
  const lookup = blockLookup(blocks);
  const isLiquid = (id: number): boolean => lookup(id)?.liquid ?? false;
  const isTransparent = (id: number): boolean => lookup(id)?.transparent ?? false;
  /**
   * 0.0: Ground and walking floors (grass, dirt, roads, paver, plank decks) NEVER fade (owner 02/10/2026: "nền đất ko bao giờ bị mờ cả").
   * 0.5: Solid obstacles (walls, roofs, tree trunks) fade when occluding or near the camera, while what she stands on stays solid.
   * 1.0: Walk-through obstacles (leaves, crops) fade anywhere they hide her.
   */
  const seeThrough = (q: Quad): number[] => {
    const block = lookup(q.id);
    if (!block) return [0];
    const name = block.name;
    if (isPureGround(name)) return [0];
    if ((name === 'planks' || name === 'sand') && q.axis === 1 && q.dir > 0) return [0];
    if (!block.solid && !block.liquid) return [1];
    return [0.5];
  };
  /** Lanterns and lit windows shine at their own colour. */
  const glow = (q: Quad): number[] => [lookup(q.id)?.glow ? 1 : 0];

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
        : quadsToGeometry(quads, { offset: [ox, oy, oz], attributes: { tileRect: { size: 4, value: tileRect }, seeThrough: { size: 1, value: seeThrough }, glow: { size: 1, value: glow } } });
    return { key: `${cx},${cy},${cz}`, origin: [ox, oy, oz], opaque: build(opaqueQuads), water: build(waterQuads) };
  };
}

/** Chunk columns per side of a patch: the unit the game meshes, draws (one call per material) and drops. */
export const PATCH_CHUNKS = 2;
export const PATCH_BLOCKS = PATCH_CHUNKS * CHUNK_SIZE;

export interface PatchGeometry {
  px: number;
  pz: number;
  opaque: QuadGeometry | null;
  water: QuadGeometry | null;
}

export type PatchMesher = (px: number, pz: number) => PatchGeometry;

/** Meshes every chunk of a patch (2 x 2 chunk columns, the whole height) into one opaque and one water geometry. */
export function createPatchMesher(world: BlockReader, blocks: readonly AtlasBlock[], atlasSize: number): PatchMesher {
  const meshChunk = createChunkMesher(world, blocks, atlasSize);
  const ny = world.height / CHUNK_SIZE;
  return (px, pz) => {
    const opaque: QuadGeometry[] = [];
    const water: QuadGeometry[] = [];
    for (let cx = px * PATCH_CHUNKS; cx < (px + 1) * PATCH_CHUNKS; cx++) {
      for (let cz = pz * PATCH_CHUNKS; cz < (pz + 1) * PATCH_CHUNKS; cz++) {
        for (let cy = 0; cy < ny; cy++) {
          const chunk = meshChunk(cx, cy, cz);
          if (chunk.opaque) opaque.push(chunk.opaque);
          if (chunk.water) water.push(chunk.water);
        }
      }
    }
    return { px, pz, opaque: mergeQuads(opaque), water: mergeQuads(water) };
  };
}
