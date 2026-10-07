// A map's standing spots in a compact form for the companion bots (content/world/walk/<map>.bin, written by
// tools/world/walk-export.ts): per column of the map's core, up to WALK_LEVELS spots lowest first, each with its
// feet height, the open blocks over it, what it stands on and whether a wall or a ledge is beside it. No routes:
// the bots find their own way over these spots with `canStep` (traversal.ts). The bytes here are uncompressed;
// the tool and the server deflate and inflate them (`node:zlib`, raw deflate).
//
// Layout (little endian), N = size[0] × size[1] columns, x fastest:
// - level 0, dense: `feet` u8[N] (0 = nowhere to stand) then `meta` u8[N];
// - levels 1 and 2, sparse, each: `count` u32, then the columns that have a spot on that level as `count` gaps
//   (LEB128 varints; a column is the one before it plus 1 plus its gap, the first one counted from -1), then
//   `feet` u8[count] and `meta` u8[count]. Gaps rather than column numbers: they deflate to a fiftieth.
// `meta` = clear (3 bits, capped at WALK_CLEAR_CAP) | ground << 3 (2 bits) | edge << 5.
import { z } from 'zod';

export const WALK_FORMAT_VERSION = 1;
/** Spots kept per column: the ground and a floor or two over it (a roof above those is left out). */
export const WALK_LEVELS = 3;
/** Open blocks over a spot are counted up to this many (what 3 bits hold; a climb needs 4, a drop 5). */
export const WALK_CLEAR_CAP = 7;
/** What a spot stands on, as the auto-walk counts it (apps/web/src/game/nav/walk-grid.ts `Ground`). */
export const WALK_GROUND = { road: 1, plain: 2, water: 3 } as const;

export interface WalkSpot {
  /** Block y of the feet (≥ 1). */
  readonly feet: number;
  /** Open blocks from the feet up, 0..WALK_CLEAR_CAP. */
  readonly clear: number;
  /** One of WALK_GROUND. */
  readonly ground: number;
  /** A wall or a ledge on some side. */
  readonly edge: boolean;
}

/** Spots by column: what `encodeWalkCells` reads. */
export interface WalkCellSource {
  /** Columns along x and along z; the core starts at (0, 0). */
  readonly size: readonly [number, number];
  /** The column's spots, lowest first, at most WALK_LEVELS; none outside the core. */
  spotsAt(x: number, z: number): readonly WalkSpot[];
}

export interface WalkCells extends WalkCellSource {
  /** The spot of column (x, z) with its feet exactly at y, if there is one. */
  standAt(x: number, y: number, z: number): WalkSpot | undefined;
}

const MAP_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const vec3 = z.tuple([z.number(), z.number(), z.number()]);

export const WALK_PLACE_KINDS = ['npc', 'object', 'gate', 'landmark', 'spawn', 'chapter', 'stop', 'arrival'] as const;
export type WalkPlaceKind = (typeof WALK_PLACE_KINDS)[number];

/**
 * content/world/walk/<map>.json: what the grid is for and the places a bot recognises when it comes near.
 * `id` is the interactable's or the landmark's own id; `spawn`, `chapter-<n>` and `arrival-<stop id>` name
 * the rest. `sources` is the sha256 of the files the grid was read from (stale when the map changes).
 */
export const walkInfoSchema = z
  .object({
    version: z.literal(WALK_FORMAT_VERSION),
    map: z.string().regex(MAP_ID),
    size: z.tuple([z.number().int().positive(), z.number().int().positive()]),
    /** Blocks the map stands up (feet heights are below it; one byte holds them). */
    height: z.number().int().min(3).max(255),
    levels: z.literal(WALK_LEVELS),
    sources: z.string().regex(/^[0-9a-f]{64}$/),
    places: z.array(
      z
        .object({
          id: z.string().min(1),
          kind: z.enum(WALK_PLACE_KINDS),
          at: vec3,
          /** A ride stop's arrival on the same map. */
          ride: vec3.optional(),
        })
        .strict(),
    ),
  })
  .strict()
  .superRefine((info, ctx) => {
    const seen = new Set<string>();
    for (const [i, place] of info.places.entries()) {
      if (seen.has(place.id)) ctx.addIssue({ code: 'custom', path: ['places', i, 'id'], message: `duplicate place id ${place.id}` });
      seen.add(place.id);
    }
  });
export type WalkInfo = z.infer<typeof walkInfoSchema>;
export type WalkPlace = WalkInfo['places'][number];

function packMeta(spot: WalkSpot, where: string): number {
  const { feet, clear, ground } = spot;
  if (!Number.isInteger(feet) || feet < 1 || feet > 255) throw new Error(`${where}: feet ${feet} is not 1..255`);
  if (!Number.isInteger(clear) || clear < 0 || clear > WALK_CLEAR_CAP) throw new Error(`${where}: clear ${clear} is not 0..${WALK_CLEAR_CAP}`);
  if (ground !== WALK_GROUND.road && ground !== WALK_GROUND.plain && ground !== WALK_GROUND.water) throw new Error(`${where}: ground ${ground} is not a WALK_GROUND`);
  return clear | (ground << 3) | (spot.edge ? 1 << 5 : 0);
}

function unpack(feet: number, meta: number): WalkSpot {
  return { feet, clear: meta & 7, ground: (meta >> 3) & 3, edge: (meta & 32) !== 0 };
}

function checkSize(size: readonly [number, number]): number {
  const [sx, sz] = size;
  if (!Number.isInteger(sx) || !Number.isInteger(sz) || sx <= 0 || sz <= 0) throw new Error(`walk cells: bad size ${sx} × ${sz}`);
  return sx * sz;
}

/** The uncompressed bytes of a grid's spots; throws on a column with more than WALK_LEVELS spots or out of order. */
export function encodeWalkCells(source: WalkCellSource): Uint8Array {
  const [sx, sz] = source.size;
  const n = checkSize(source.size);
  const feet0 = new Uint8Array(n);
  const meta0 = new Uint8Array(n);
  const upper = Array.from({ length: WALK_LEVELS - 1 }, () => ({ columns: [] as number[], feet: [] as number[], meta: [] as number[] }));
  for (let z = 0; z < sz; z++) {
    for (let x = 0; x < sx; x++) {
      const spots = source.spotsAt(x, z);
      const where = `walk cells (${x}, ${z})`;
      if (spots.length > WALK_LEVELS) throw new Error(`${where}: ${spots.length} spots, at most ${WALK_LEVELS}`);
      const column = x + z * sx;
      for (const [level, spot] of spots.entries()) {
        const meta = packMeta(spot, where);
        if (level > 0 && spot.feet <= (spots[level - 1]?.feet ?? 0)) throw new Error(`${where}: spots not lowest first`);
        if (level === 0) {
          feet0[column] = spot.feet;
          meta0[column] = meta;
          continue;
        }
        const tier = upper[level - 1];
        if (!tier) continue;
        tier.columns.push(column);
        tier.feet.push(spot.feet);
        tier.meta.push(meta);
      }
    }
  }
  const gaps = upper.map((tier) => {
    const out: number[] = [];
    let previous = -1;
    for (const column of tier.columns) {
      let gap = column - previous - 1;
      previous = column;
      while (gap >= 0x80) {
        out.push((gap & 0x7f) | 0x80);
        gap >>>= 7;
      }
      out.push(gap);
    }
    return out;
  });
  const length = 2 * n + upper.reduce((sum, t, i) => sum + 4 + (gaps[i]?.length ?? 0) + 2 * t.columns.length, 0);
  const bytes = new Uint8Array(length);
  const view = new DataView(bytes.buffer);
  bytes.set(feet0, 0);
  bytes.set(meta0, n);
  let at = 2 * n;
  for (const [i, tier] of upper.entries()) {
    view.setUint32(at, tier.columns.length, true);
    at += 4;
    const tierGaps = gaps[i] ?? [];
    bytes.set(tierGaps, at);
    at += tierGaps.length;
    bytes.set(tier.feet, at);
    at += tier.feet.length;
    bytes.set(tier.meta, at);
    at += tier.meta.length;
  }
  return bytes;
}

interface SparseLevel {
  columns: Uint32Array;
  feet: Uint8Array;
  meta: Uint8Array;
}

/** Index of `column` in an ascending list, or -1. */
function find(columns: Uint32Array, column: number): number {
  let lo = 0;
  let hi = columns.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const c = columns[mid] ?? 0;
    if (c === column) return mid;
    if (c < column) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}

/** Reads the bytes `encodeWalkCells` wrote for a grid of `size`; throws when they do not fit it. */
export function decodeWalkCells(bytes: Uint8Array, size: readonly [number, number]): WalkCells {
  const [sx, sz] = size;
  const n = checkSize(size);
  if (bytes.length < 2 * n) throw new Error(`walk cells: ${bytes.length} bytes, too few for ${sx} × ${sz} columns`);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const feet0 = bytes.slice(0, n);
  const meta0 = bytes.slice(n, 2 * n);
  const upper: SparseLevel[] = [];
  let at = 2 * n;
  for (let level = 1; level < WALK_LEVELS; level++) {
    if (at + 4 > bytes.length) throw new Error(`walk cells: level ${level} is cut short`);
    const count = view.getUint32(at, true);
    at += 4;
    if (at + 3 * count > bytes.length) throw new Error(`walk cells: level ${level} is cut short`);
    const columns = new Uint32Array(count);
    const below = upper.at(-1);
    let previous = -1;
    for (let i = 0; i < count; i++) {
      let gap = 0;
      for (let shift = 0; ; shift += 7) {
        if (at >= bytes.length || shift > 28) throw new Error(`walk cells: level ${level} has a bad column gap`);
        const byte = bytes[at++] ?? 0;
        gap += (byte & 0x7f) * 2 ** shift;
        if (byte < 0x80) break;
      }
      const column = previous + 1 + gap;
      if (column >= n) throw new Error(`walk cells: level ${level} column ${column} is past the grid`);
      if (below ? find(below.columns, column) < 0 : feet0[column] === 0) throw new Error(`walk cells: level ${level} spot at column ${column} has none under it`);
      columns[i] = column;
      previous = column;
    }
    if (at + 2 * count > bytes.length) throw new Error(`walk cells: level ${level} is cut short`);
    const feet = bytes.slice(at, at + count);
    at += count;
    const meta = bytes.slice(at, at + count);
    at += count;
    upper.push({ columns, feet, meta });
  }
  if (at !== bytes.length) throw new Error(`walk cells: ${bytes.length - at} bytes left over`);

  const spotsAt = (x: number, z: number): WalkSpot[] => {
    if (!Number.isInteger(x) || !Number.isInteger(z) || x < 0 || z < 0 || x >= sx || z >= sz) return [];
    const column = x + z * sx;
    const feet = feet0[column] ?? 0;
    if (feet === 0) return [];
    const spots = [unpack(feet, meta0[column] ?? 0)];
    for (const level of upper) {
      const i = find(level.columns, column);
      if (i < 0) break;
      spots.push(unpack(level.feet[i] ?? 0, level.meta[i] ?? 0));
    }
    return spots;
  };
  return {
    size: [sx, sz],
    spotsAt,
    standAt: (x, y, z) => spotsAt(x, z).find((spot) => spot.feet === y),
  };
}
