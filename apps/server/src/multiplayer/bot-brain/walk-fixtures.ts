// Small walk grids drawn for the bots' tests: one character per column, rows along z. A digit is a spot with its feet
// that high on plain ground ('a'–'i' the same on a road, 'w' water at height 1), '#' a column with nowhere to stand
// (a wall, a fence), '.' nothing at all. Every spot has open sky over it unless `clear` says otherwise.
import { WALK_CLEAR_CAP, WALK_GROUND, type WalkPlace } from '@miu/voxel/walk-cells';
import { WalkMap } from './walk-store';

export interface DrawnSpot {
  feet: number;
  clear: number;
  ground: number;
  edge: boolean;
}

/** A map from rows of columns; `extra` adds spots over a column (a floor above) and `clear` caps the open blocks. */
export function drawnMap(rows: readonly string[], options: { places?: WalkPlace[]; clear?: (x: number, z: number) => number; extra?: (x: number, z: number) => DrawnSpot[] } = {}): WalkMap {
  const sz = rows.length;
  const sx = Math.max(...rows.map((r) => r.length));
  const spotsAt = (x: number, z: number): DrawnSpot[] => {
    const ch = rows[z]?.[x] ?? '.';
    const clear = options.clear?.(x, z) ?? WALK_CLEAR_CAP;
    const extra = options.extra?.(x, z) ?? [];
    if (ch === 'w') return [{ feet: 1, clear, ground: WALK_GROUND.water, edge: false }, ...extra];
    if (/[1-9]/.test(ch)) return [{ feet: Number(ch), clear, ground: WALK_GROUND.plain, edge: false }, ...extra];
    if (/[a-i]/.test(ch)) return [{ feet: ch.charCodeAt(0) - 96, clear, ground: WALK_GROUND.road, edge: false }, ...extra];
    return extra;
  };
  return new WalkMap('drawn', [sx, sz], spotsAt, options.places ?? []);
}

/** An open square of road at height 1. */
export const openMap = (side: number): WalkMap => drawnMap(Array.from({ length: side }, () => 'a'.repeat(side)));
