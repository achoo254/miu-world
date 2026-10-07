// The companion bots' sense of a map: where one can stand, column by column, and the places they recognise
// when they come near (content/world/walk/<map>.{json,bin}, written by tools/world/walk-export.ts). Read once
// per map when its first bot needs it; a map without the files (or with broken ones) gets null, and its bots
// rest at their homes. The release ships `content/` next to the server bundle, and CONTENT_DIR finds it both in
// the repo and in a release directory.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { inflateRawSync } from 'node:zlib';
import { canStep } from '@miu/voxel/traversal';
import { decodeWalkCells, WALK_GROUND, WALK_LEVELS, walkInfoSchema, type WalkPlace } from '@miu/voxel/walk-cells';
import { CONTENT_DIR } from '../../content/content-dir';

/** A standing spot: column (x, z) and the feet's block y. */
export interface Spot {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** A spot's packed form in a map: feet << 8 | meta (`meta` as in walk-cells.ts); 0 = none. */
export type PackedSpot = number;

export const feetOf = (spot: PackedSpot): number => spot >> 8;
export const clearOf = (spot: PackedSpot): number => spot & 7;
export const groundOf = (spot: PackedSpot): number => (spot >> 3) & 3;
export const edgeOf = (spot: PackedSpot): boolean => (spot & 32) !== 0;

/** Side of the coarse squares places are filed under, for "which places are within r of here". */
const PLACE_CELL = 16;
const MAP_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** One map's standing spots in a compact form (level 0 dense, the floors above it sparse) and its places. */
export class WalkMap {
  readonly mapId: string;
  readonly sx: number;
  readonly sz: number;
  readonly places: readonly WalkPlace[];
  /** The hash of what the grid was made from (its `sources`): a bot's memory of ways holds only on the same grid. */
  readonly sources: string;
  private readonly ground: Uint16Array;
  /** One bit per column: whether it has spots above its lowest. */
  private readonly hasUpper: Uint8Array;
  /** The upper levels: ascending columns and their packed spots, one pair of arrays per level. */
  private readonly upperColumns: Uint32Array[];
  private readonly upperSpots: Uint16Array[];
  private readonly placeCells = new Map<number, WalkPlace[]>();

  constructor(
    mapId: string,
    size: readonly [number, number],
    spotsAt: (x: number, z: number) => ReadonlyArray<{ feet: number; clear: number; ground: number; edge: boolean }>,
    places: readonly WalkPlace[],
    sources = '',
  ) {
    this.mapId = mapId;
    this.sources = sources;
    [this.sx, this.sz] = size;
    const n = this.sx * this.sz;
    this.ground = new Uint16Array(n);
    this.hasUpper = new Uint8Array(Math.ceil(n / 8));
    const upperColumns: number[][] = Array.from({ length: WALK_LEVELS - 1 }, () => []);
    const upperSpots: number[][] = Array.from({ length: WALK_LEVELS - 1 }, () => []);
    for (let z = 0; z < this.sz; z++) {
      for (let x = 0; x < this.sx; x++) {
        const column = x + z * this.sx;
        for (const [level, spot] of spotsAt(x, z).entries()) {
          const packed = (spot.feet << 8) | spot.clear | (spot.ground << 3) | (spot.edge ? 32 : 0);
          if (level === 0) {
            this.ground[column] = packed;
            continue;
          }
          this.hasUpper[column >> 3] = (this.hasUpper[column >> 3] ?? 0) | (1 << (column & 7));
          upperColumns[level - 1]?.push(column);
          upperSpots[level - 1]?.push(packed);
        }
      }
    }
    this.upperColumns = upperColumns.map((list) => Uint32Array.from(list));
    this.upperSpots = upperSpots.map((list) => Uint16Array.from(list));
    this.places = places;
    for (const place of places) {
      const key = this.placeKey(Math.floor(place.at[0] / PLACE_CELL), Math.floor(place.at[2] / PLACE_CELL));
      const list = this.placeCells.get(key);
      if (list) list.push(place);
      else this.placeCells.set(key, [place]);
    }
  }

  /** Bytes its spots take in memory (the places aside). */
  get byteLength(): number {
    const upper = [...this.upperColumns, ...this.upperSpots].reduce((sum, a) => sum + a.byteLength, 0);
    return this.ground.byteLength + this.hasUpper.byteLength + upper;
  }

  private placeKey(cx: number, cz: number): number {
    return cx + cz * 65_536;
  }

  /** Whether (x, z) is a column of the map's core. */
  inside(x: number, z: number): boolean {
    return x >= 0 && z >= 0 && x < this.sx && z < this.sz;
  }

  /** The packed spot of column (x, z) on `level` (0 lowest), or 0. */
  spot(x: number, z: number, level: number): PackedSpot {
    if (!this.inside(x, z)) return 0;
    const column = x + z * this.sx;
    if (level === 0) return this.ground[column] ?? 0;
    if (((this.hasUpper[column >> 3] ?? 0) & (1 << (column & 7))) === 0) return 0;
    const columns = this.upperColumns[level - 1];
    const spots = this.upperSpots[level - 1];
    if (!columns || !spots) return 0;
    let lo = 0;
    let hi = columns.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const c = columns[mid] ?? 0;
      if (c === column) return spots[mid] ?? 0;
      if (c < column) lo = mid + 1;
      else hi = mid - 1;
    }
    return 0;
  }

  /** The level of column (x, z) whose feet are at y, or -1. */
  levelAt(x: number, y: number, z: number): number {
    for (let level = 0; level < WALK_LEVELS; level++) {
      const spot = this.spot(x, z, level);
      if (spot === 0) return -1;
      if (feetOf(spot) === y) return level;
    }
    return -1;
  }

  /** The packed spot of column (x, z) with its feet at y, or 0. */
  standAt(x: number, y: number, z: number): PackedSpot {
    const level = this.levelAt(x, y, z);
    return level < 0 ? 0 : this.spot(x, z, level);
  }

  /** Whether a walk goes from spot `a` to spot `b` of a neighbouring column (traversal.ts `canStep`). */
  steps(a: Spot, b: Spot): boolean {
    const from = this.standAt(a.x, a.y, a.z);
    const to = this.standAt(b.x, b.y, b.z);
    return from !== 0 && to !== 0 && Math.abs(a.x - b.x) <= 1 && Math.abs(a.z - b.z) <= 1 && canStep(feetOf(from), clearOf(from), feetOf(to), clearOf(to));
  }

  /**
   * The standing spot nearest to `at` within `radius` columns (dry ground before water, then the feet closest to
   * its height), or null: where a bot is put down when the place it was told is not one to stand on.
   */
  snap(at: { x: number; y: number; z: number }, radius: number): Spot | null {
    const cx = Math.floor(at.x);
    const cz = Math.floor(at.z);
    let best: Spot | null = null;
    let bestScore = Infinity;
    for (let dz = -radius; dz <= radius; dz++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const away = Math.hypot(dx, dz);
        if (away > radius) continue;
        for (let level = 0; level < WALK_LEVELS; level++) {
          const spot = this.spot(cx + dx, cz + dz, level);
          if (spot === 0) break;
          if (clearOf(spot) < 2) continue;
          const score = away + Math.abs(feetOf(spot) - at.y) + (groundOf(spot) === WALK_GROUND.water ? 50 : 0);
          if (score < bestScore) {
            bestScore = score;
            best = { x: cx + dx, y: feetOf(spot), z: cz + dz };
          }
        }
      }
    }
    return best;
  }

  /** The places within `radius` blocks (horizontally) of (x, z). */
  placesNear(x: number, z: number, radius: number): WalkPlace[] {
    const out: WalkPlace[] = [];
    const x0 = Math.floor((x - radius) / PLACE_CELL);
    const x1 = Math.floor((x + radius) / PLACE_CELL);
    const z0 = Math.floor((z - radius) / PLACE_CELL);
    const z1 = Math.floor((z + radius) / PLACE_CELL);
    for (let cz = z0; cz <= z1; cz++) {
      for (let cx = x0; cx <= x1; cx++) {
        for (const place of this.placeCells.get(this.placeKey(cx, cz)) ?? []) {
          if (Math.hypot(place.at[0] - x, place.at[2] - z) <= radius) out.push(place);
        }
      }
    }
    return out;
  }
}

/** Reads one map's grid; throws on files that are missing, malformed or do not fit each other. */
export function readWalkMap(dir: string, mapId: string): WalkMap {
  if (!MAP_ID.test(mapId)) throw new Error(`walk grid: bad map id ${JSON.stringify(mapId)}`);
  const base = path.join(dir, 'world', 'walk', mapId);
  const info = walkInfoSchema.parse(JSON.parse(readFileSync(`${base}.json`, 'utf8')));
  if (info.map !== mapId) throw new Error(`walk grid: ${mapId}.json is for ${info.map}`);
  const cells = decodeWalkCells(new Uint8Array(inflateRawSync(readFileSync(`${base}.bin`))), info.size);
  return new WalkMap(mapId, info.size, cells.spotsAt, info.places, info.sources);
}

/** Every map's grid, read when first asked for and kept; a map whose grid cannot be read is null (logged once). */
export class WalkStore {
  private readonly dir: string;
  private readonly maps = new Map<string, WalkMap | null>();

  constructor(contentDir: string = CONTENT_DIR) {
    this.dir = contentDir;
  }

  get(mapId: string): WalkMap | null {
    const known = this.maps.get(mapId);
    if (known !== undefined) return known;
    let map: WalkMap | null = null;
    try {
      map = readWalkMap(this.dir, mapId);
    } catch (err) {
      const missing = err instanceof Error && 'code' in err && err.code === 'ENOENT';
      console.warn(`walk grid for ${mapId} ${missing ? 'not found' : 'unreadable'}: its companion bots stay at home`, missing ? '' : err instanceof Error ? err.message : typeof err);
    }
    this.maps.set(mapId, map);
    return map;
  }
}
