import { describe, expect, it } from 'vitest';
import {
  CHUNK_SIZE,
  VoxelWorld,
  decodeRle,
  decodeWorld,
  encodeRle,
  encodeWorld,
  localIndex,
  worldToChunk,
} from './chunk-format';

describe('RLE', () => {
  it('round-trips arbitrary data, including runs longer than 127 (multi-byte varint)', () => {
    const data = new Uint8Array(CHUNK_SIZE ** 3);
    data.fill(3, 0, 1000);
    data.fill(7, 1000, 1001);
    for (let i = 2000; i < 2100; i++) data[i] = i % 5;
    const encoded = encodeRle(data);
    expect(encoded.byteLength).toBeLessThan(data.byteLength);
    expect(Array.from(decodeRle(encoded, data.length))).toEqual(Array.from(data));
  });

  it('rejects a stream that does not fill the chunk exactly', () => {
    const encoded = encodeRle(new Uint8Array(10).fill(1));
    expect(() => decodeRle(encoded, 11)).toThrow(/length/);
  });
});

describe('chunk indexing', () => {
  it('maps world coordinates to chunk + local, including chunk borders', () => {
    expect(worldToChunk(0)).toEqual([0, 0]);
    expect(worldToChunk(15)).toEqual([0, 15]);
    expect(worldToChunk(16)).toEqual([1, 0]);
    expect(worldToChunk(31)).toEqual([1, 15]);
    expect(worldToChunk(-1)).toEqual([-1, 15]);
  });

  it('uses a y-major layout so horizontal layers form long runs', () => {
    expect(localIndex(0, 0, 0)).toBe(0);
    expect(localIndex(1, 0, 0)).toBe(1);
    expect(localIndex(0, 0, 1)).toBe(16);
    expect(localIndex(0, 1, 0)).toBe(256);
    expect(localIndex(15, 15, 15)).toBe(4095);
  });
});

describe('VoxelWorld', () => {
  it('reads and writes across chunk borders and treats out-of-range as air', () => {
    const world = new VoxelWorld([2, 1, 2]);
    world.set(15, 3, 16, 5);
    world.set(16, 3, 15, 6);
    expect(world.get(15, 3, 16)).toBe(5);
    expect(world.get(16, 3, 15)).toBe(6);
    expect(world.get(-1, 0, 0)).toBe(0);
    expect(world.get(32, 0, 0)).toBe(0);
    expect(() => world.set(32, 0, 0, 1)).toThrow(/outside/);
  });

  it('round-trips a whole world through the binary format', () => {
    const world = new VoxelWorld([2, 2, 1]);
    for (let x = 0; x < 32; x++) for (let z = 0; z < 16; z++) for (let y = 0; y <= (x % 7) + 3; y++) world.set(x, y, z, y === 0 ? 1 : 2);
    const bin = encodeWorld(world);
    const back = decodeWorld(bin);
    expect(back.chunks).toEqual(world.chunks);
    expect(Array.from(back.data)).toEqual(Array.from(world.data));
  });

  it('rejects a file with the wrong magic', () => {
    const bin = encodeWorld(new VoxelWorld([1, 1, 1]));
    bin[0] = 0;
    expect(() => decodeWorld(bin)).toThrow(/magic/);
  });
});
