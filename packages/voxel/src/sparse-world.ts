// The blocks the game holds while a map is played: only the regions (128 x 128 columns, the whole height)
// round the child, each a VoxelWorld of its own, keyed by region and dropped again once far (owner,
// 02/10/2026: maps fifty times larger, too big to hold whole). Coordinates are the map's own, negative
// ones included: the outer land (outland.ts) lies on every side of the core at 0..size.
import { CHUNK_SIZE, VoxelWorld, type ChunkCounts } from './chunk-format';
import { REGION_BLOCKS, REGION_CHUNKS } from './region-format';
import type { WorldBounds } from './outland';

/** Region keys stay positive integers for any region of a world within ±1024 regions. */
const KEY_OFFSET = 1024;
const KEY_STRIDE = 4096;

export class SparseWorld {
  /** Chunks of one region: REGION_CHUNKS x height x REGION_CHUNKS. */
  readonly regionChunks: ChunkCounts;
  private readonly regions = new Map<number, VoxelWorld>();
  // The last region read: most reads (meshing a chunk, walking) fall in the same one.
  private lastKey = -1;
  private lastRegion: VoxelWorld | undefined;

  constructor(
    readonly bounds: WorldBounds,
    readonly height: number,
  ) {
    this.regionChunks = [REGION_CHUNKS, height / CHUNK_SIZE, REGION_CHUNKS];
  }

  /** A fresh, empty region of this world's shape (for a generator or a file to fill). */
  createRegion(): VoxelWorld {
    return new VoxelWorld(this.regionChunks);
  }

  private key(rx: number, rz: number): number {
    return (rx + KEY_OFFSET) * KEY_STRIDE + (rz + KEY_OFFSET);
  }

  hasRegion(rx: number, rz: number): boolean {
    return this.regions.has(this.key(rx, rz));
  }

  setRegion(rx: number, rz: number, region: VoxelWorld): void {
    if (region.chunks.some((n, i) => n !== this.regionChunks[i])) throw new Error(`region ${rx},${rz} is ${region.chunks.join('x')} chunks, expected ${this.regionChunks.join('x')}`);
    this.regions.set(this.key(rx, rz), region);
    this.lastKey = -1;
  }

  deleteRegion(rx: number, rz: number): void {
    this.regions.delete(this.key(rx, rz));
    this.lastKey = -1;
  }

  /** Regions held now, as [rx, rz]. */
  regionList(): Array<[number, number]> {
    return [...this.regions.keys()].map((k) => [Math.floor(k / KEY_STRIDE) - KEY_OFFSET, (k % KEY_STRIDE) - KEY_OFFSET]);
  }

  /** Block id, or 0 (air) above or below the world and in a region not held. */
  get(x: number, y: number, z: number): number {
    if (y < 0 || y >= this.height) return 0;
    const rx = Math.floor(x / REGION_BLOCKS);
    const rz = Math.floor(z / REGION_BLOCKS);
    const key = this.key(rx, rz);
    if (key !== this.lastKey) {
      this.lastKey = key;
      this.lastRegion = this.regions.get(key);
    }
    return this.lastRegion ? this.lastRegion.get(x - rx * REGION_BLOCKS, y, z - rz * REGION_BLOCKS) : 0;
  }

  /** Whether a column lies inside the world's bounds. */
  contains(x: number, z: number): boolean {
    return x >= this.bounds.x0 && z >= this.bounds.z0 && x < this.bounds.x1 && z < this.bounds.z1;
  }
}
