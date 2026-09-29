// World storage: a dense block-id grid split into 16³ chunks, serialised as per-chunk RLE.
// File layout (little endian):
//   "MIUW" | u8 version | u8 chunkSize | u16 chunksX | u16 chunksY | u16 chunksZ
//   then per chunk (x fastest, then z, then y): u32 byteLength | RLE bytes
// RLE stream: repeated [u8 blockId, varint runLength]; local index = x + 16 * (z + 16 * y).

export const CHUNK_SIZE = 16;
export const CHUNK_VOLUME = CHUNK_SIZE ** 3;
const MAGIC = [0x4d, 0x49, 0x55, 0x57]; // "MIUW"
const VERSION = 1;
const HEADER_BYTES = 12;

export type ChunkCounts = readonly [number, number, number];

/** Splits a world coordinate into [chunk coordinate, local coordinate] (floor semantics for negatives). */
export function worldToChunk(v: number): [number, number] {
  const chunk = Math.floor(v / CHUNK_SIZE);
  return [chunk, v - chunk * CHUNK_SIZE];
}

export function localIndex(x: number, y: number, z: number): number {
  return x + CHUNK_SIZE * (z + CHUNK_SIZE * y);
}

/** Dense world grid; `data` holds chunks back to back so each chunk is a contiguous 4096-byte slice. */
export class VoxelWorld {
  readonly data: Uint8Array;
  readonly size: readonly [number, number, number];

  constructor(readonly chunks: ChunkCounts, data?: Uint8Array) {
    this.size = [chunks[0] * CHUNK_SIZE, chunks[1] * CHUNK_SIZE, chunks[2] * CHUNK_SIZE];
    const volume = chunks[0] * chunks[1] * chunks[2] * CHUNK_VOLUME;
    if (data && data.length !== volume) throw new Error(`world data length ${data.length} != ${volume}`);
    this.data = data ?? new Uint8Array(volume);
  }

  chunkIndex(cx: number, cy: number, cz: number): number {
    return cx + this.chunks[0] * (cz + this.chunks[2] * cy);
  }

  chunkData(cx: number, cy: number, cz: number): Uint8Array {
    const offset = this.chunkIndex(cx, cy, cz) * CHUNK_VOLUME;
    return this.data.subarray(offset, offset + CHUNK_VOLUME);
  }

  private offsetOf(x: number, y: number, z: number): number {
    if (x < 0 || y < 0 || z < 0 || x >= this.size[0] || y >= this.size[1] || z >= this.size[2]) return -1;
    const [cx, lx] = worldToChunk(x);
    const [cy, ly] = worldToChunk(y);
    const [cz, lz] = worldToChunk(z);
    return this.chunkIndex(cx, cy, cz) * CHUNK_VOLUME + localIndex(lx, ly, lz);
  }

  /** Block id, or 0 (air) outside the world. */
  get(x: number, y: number, z: number): number {
    const offset = this.offsetOf(x, y, z);
    return offset < 0 ? 0 : (this.data[offset] ?? 0);
  }

  set(x: number, y: number, z: number, id: number): void {
    const offset = this.offsetOf(x, y, z);
    if (offset < 0) throw new Error(`set outside world: ${x},${y},${z}`);
    this.data[offset] = id;
  }
}

function writeVarint(out: number[], value: number): void {
  let v = value;
  while (v >= 0x80) {
    out.push((v & 0x7f) | 0x80);
    v >>>= 7;
  }
  out.push(v);
}

export function encodeRle(data: Uint8Array): Uint8Array {
  const out: number[] = [];
  let i = 0;
  while (i < data.length) {
    const id = data[i] ?? 0;
    let run = 1;
    while (i + run < data.length && data[i + run] === id) run++;
    out.push(id);
    writeVarint(out, run);
    i += run;
  }
  return Uint8Array.from(out);
}

export function decodeRle(bytes: Uint8Array, length: number, target: Uint8Array = new Uint8Array(length)): Uint8Array {
  let pos = 0;
  let written = 0;
  while (pos < bytes.length) {
    const id = bytes[pos++] ?? 0;
    let run = 0;
    let shift = 0;
    let byte: number;
    do {
      if (shift > 21) throw new Error('RLE run length varint too long');
      byte = bytes[pos++] ?? 0;
      run |= (byte & 0x7f) << shift;
      shift += 7;
    } while (byte & 0x80);
    if (run <= 0 || written + run > length) throw new Error('RLE stream exceeds chunk length');
    target.fill(id, written, written + run);
    written += run;
  }
  if (written !== length) throw new Error(`RLE stream length ${written} != ${length}`);
  return target;
}

export function encodeWorld(world: VoxelWorld): Uint8Array {
  const parts: Uint8Array[] = [];
  const [nx, ny, nz] = world.chunks;
  for (let cy = 0; cy < ny; cy++) {
    for (let cz = 0; cz < nz; cz++) {
      for (let cx = 0; cx < nx; cx++) parts.push(encodeRle(world.chunkData(cx, cy, cz)));
    }
  }
  const total = HEADER_BYTES + parts.reduce((sum, p) => sum + 4 + p.byteLength, 0);
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  out.set(MAGIC, 0);
  view.setUint8(4, VERSION);
  view.setUint8(5, CHUNK_SIZE);
  view.setUint16(6, nx, true);
  view.setUint16(8, ny, true);
  view.setUint16(10, nz, true);
  let pos = HEADER_BYTES;
  for (const part of parts) {
    view.setUint32(pos, part.byteLength, true);
    out.set(part, pos + 4);
    pos += 4 + part.byteLength;
  }
  return out;
}

export function decodeWorld(bytes: Uint8Array): VoxelWorld {
  if (MAGIC.some((b, i) => bytes[i] !== b)) throw new Error('not a Miu world file (bad magic)');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint8(4) !== VERSION) throw new Error(`unsupported world version ${view.getUint8(4)}`);
  if (view.getUint8(5) !== CHUNK_SIZE) throw new Error(`unsupported chunk size ${view.getUint8(5)}`);
  const world = new VoxelWorld([view.getUint16(6, true), view.getUint16(8, true), view.getUint16(10, true)]);
  let pos = HEADER_BYTES;
  const [nx, ny, nz] = world.chunks;
  for (let cy = 0; cy < ny; cy++) {
    for (let cz = 0; cz < nz; cz++) {
      for (let cx = 0; cx < nx; cx++) {
        const length = view.getUint32(pos, true);
        decodeRle(bytes.subarray(pos + 4, pos + 4 + length), CHUNK_VOLUME, world.chunkData(cx, cy, cz));
        pos += 4 + length;
      }
    }
  }
  if (pos !== bytes.length) throw new Error(`world file has ${bytes.length - pos} trailing bytes`);
  return world;
}
