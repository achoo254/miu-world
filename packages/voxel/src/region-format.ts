// A map on disk as regions: the world split into columns of 8 x 8 chunks (128 x 128 blocks, the whole
// height), each its own file in the world file format (chunk-format.ts), so the game fetches and meshes the
// part round the child first and the rest as the child moves. A coarse horizon (the top block of every
// 4 x 4 column cell) lets the far scenery be drawn before its regions arrive.
// Files of a map: generated/world/<map>/regions/r<rx>-<rz>.bin and generated/world/<map>/horizon.bin
// Horizon layout (little endian): "MIUH" | u8 version | u8 cell | u16 cellsX | u16 cellsZ | u32 heightsLength
// | RLE heights (one byte per cell: the top block's y + 1, 0 for none) | RLE top block ids.
import { CHUNK_SIZE, VoxelWorld, decodeRle, decodeWorld, encodeRle, encodeWorld, type ChunkCounts } from './chunk-format';

export const REGION_CHUNKS = 8;
export const REGION_BLOCKS = REGION_CHUNKS * CHUNK_SIZE;
export const HORIZON_CELL = 4;
const HORIZON_MAGIC = [0x4d, 0x49, 0x55, 0x48]; // "MIUH"
const HORIZON_VERSION = 1;
const HORIZON_HEADER = 14;

/** Regions along x and z for a world of `chunks`. */
export function regionCounts(chunks: ChunkCounts): [number, number] {
  return [Math.ceil(chunks[0] / REGION_CHUNKS), Math.ceil(chunks[2] / REGION_CHUNKS)];
}

/** Region file of a map, relative to its folder. */
export function regionFile(rx: number, rz: number): string {
  return `regions/r${rx}-${rz}.bin`;
}

/** The region a block column lies in. */
export function regionOf(x: number, z: number): [number, number] {
  return [Math.floor(x / REGION_BLOCKS), Math.floor(z / REGION_BLOCKS)];
}

/** Chunk counts of one region (the last ones along an axis may be narrower). */
function regionChunks(chunks: ChunkCounts, rx: number, rz: number): ChunkCounts {
  return [Math.min(REGION_CHUNKS, chunks[0] - rx * REGION_CHUNKS), chunks[1], Math.min(REGION_CHUNKS, chunks[2] - rz * REGION_CHUNKS)];
}

/** Every region of a world as a world file, x fastest. */
export function encodeRegions(world: VoxelWorld): Array<{ rx: number; rz: number; bytes: Uint8Array }> {
  const [nrx, nrz] = regionCounts(world.chunks);
  const out: Array<{ rx: number; rz: number; bytes: Uint8Array }> = [];
  for (let rz = 0; rz < nrz; rz++) {
    for (let rx = 0; rx < nrx; rx++) {
      const part = new VoxelWorld(regionChunks(world.chunks, rx, rz));
      for (let cy = 0; cy < part.chunks[1]; cy++) {
        for (let cz = 0; cz < part.chunks[2]; cz++) {
          for (let cx = 0; cx < part.chunks[0]; cx++) part.chunkData(cx, cy, cz).set(world.chunkData(rx * REGION_CHUNKS + cx, cy, rz * REGION_CHUNKS + cz));
        }
      }
      out.push({ rx, rz, bytes: encodeWorld(part) });
    }
  }
  return out;
}

/** Copies a region file's blocks into the whole world at its place. */
export function insertRegion(world: VoxelWorld, rx: number, rz: number, bytes: Uint8Array): void {
  const part = decodeWorld(bytes);
  const expected = regionChunks(world.chunks, rx, rz);
  if (part.chunks.some((n, i) => n !== expected[i])) throw new Error(`region ${rx},${rz} has ${part.chunks.join('x')} chunks, expected ${expected.join('x')}`);
  for (let cy = 0; cy < part.chunks[1]; cy++) {
    for (let cz = 0; cz < part.chunks[2]; cz++) {
      for (let cx = 0; cx < part.chunks[0]; cx++) world.chunkData(rx * REGION_CHUNKS + cx, cy, rz * REGION_CHUNKS + cz).set(part.chunkData(cx, cy, cz));
    }
  }
}

export interface Horizon {
  cell: number;
  cells: [number, number];
  /** Per cell (x fastest): the top block's y + 1, 0 where the cell is empty. */
  heights: Uint8Array;
  /** Per cell: the id of that top block. */
  tops: Uint8Array;
}

/** The highest block of each 4 x 4 cell of columns (trees and roofs count: they shape the skyline). */
export function buildHorizon(world: VoxelWorld): Horizon {
  const [sx, sy, sz] = world.size;
  const cells: [number, number] = [Math.ceil(sx / HORIZON_CELL), Math.ceil(sz / HORIZON_CELL)];
  const heights = new Uint8Array(cells[0] * cells[1]);
  const tops = new Uint8Array(cells[0] * cells[1]);
  for (let cz = 0; cz < cells[1]; cz++) {
    for (let cx = 0; cx < cells[0]; cx++) {
      let best = 0;
      let id = 0;
      for (let x = cx * HORIZON_CELL; x < Math.min(sx, (cx + 1) * HORIZON_CELL); x++) {
        for (let z = cz * HORIZON_CELL; z < Math.min(sz, (cz + 1) * HORIZON_CELL); z++) {
          for (let y = sy - 1; y >= best; y--) {
            const here = world.get(x, y, z);
            if (here === 0) continue;
            if (y + 1 > best) {
              best = y + 1;
              id = here;
            }
            break;
          }
        }
      }
      heights[cx + cells[0] * cz] = best;
      tops[cx + cells[0] * cz] = id;
    }
  }
  return { cell: HORIZON_CELL, cells, heights, tops };
}

export function encodeHorizon(horizon: Horizon): Uint8Array {
  const heights = encodeRle(horizon.heights);
  const tops = encodeRle(horizon.tops);
  const out = new Uint8Array(HORIZON_HEADER + heights.byteLength + tops.byteLength);
  const view = new DataView(out.buffer);
  out.set(HORIZON_MAGIC, 0);
  view.setUint8(4, HORIZON_VERSION);
  view.setUint8(5, horizon.cell);
  view.setUint16(6, horizon.cells[0], true);
  view.setUint16(8, horizon.cells[1], true);
  view.setUint32(10, heights.byteLength, true);
  out.set(heights, HORIZON_HEADER);
  out.set(tops, HORIZON_HEADER + heights.byteLength);
  return out;
}

export function decodeHorizon(bytes: Uint8Array): Horizon {
  if (HORIZON_MAGIC.some((b, i) => bytes[i] !== b)) throw new Error('not a Miu horizon file (bad magic)');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint8(4) !== HORIZON_VERSION) throw new Error(`unsupported horizon version ${view.getUint8(4)}`);
  const cell = view.getUint8(5);
  const cells: [number, number] = [view.getUint16(6, true), view.getUint16(8, true)];
  const heightsLength = view.getUint32(10, true);
  const count = cells[0] * cells[1];
  const heights = decodeRle(bytes.subarray(HORIZON_HEADER, HORIZON_HEADER + heightsLength), count);
  const tops = decodeRle(bytes.subarray(HORIZON_HEADER + heightsLength), count);
  return { cell, cells, heights, tops };
}
