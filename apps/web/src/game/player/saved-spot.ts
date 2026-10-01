// The spot a child last stood on, read back on the next visit. The map may have been regenerated since
// (a wall built there, water dug), so the spot is used only while it still is dry, open ground.
import type { SolidAt } from '@miu/voxel/grid-collision';

type Point = readonly [number, number, number];
export type LiquidAt = (x: number, y: number, z: number) => boolean;

/** Feet on a solid block, feet and head cells open, no water: the spot to stand on, else null. */
export function usableSpot(spot: Point, solid: SolidAt, liquid: LiquidAt, size: Point): Point | null {
  const [x, y, z] = spot;
  const [sx, sy, sz] = size;
  if (![x, y, z].every(Number.isFinite) || x < 0 || z < 0 || x >= sx || z >= sz) return null;
  // Saved while on the ground, so the feet sit on a block top; the tiny lift absorbs float error.
  const feet = Math.floor(y + 0.01);
  if (feet < 1 || feet + 1 >= sy) return null;
  const bx = Math.floor(x);
  const bz = Math.floor(z);
  const open = !solid(bx, feet, bz) && !solid(bx, feet + 1, bz) && !liquid(bx, feet, bz);
  return open && solid(bx, feet - 1, bz) ? [x, feet, z] : null;
}
