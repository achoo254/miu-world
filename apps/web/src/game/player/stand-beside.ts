// Where the child starts when the URL says `spawnAt=<target>` (tests, review shots, a "go there" link):
// beside the target, on open ground she can stand on, inside its interaction radius, and on a side where it
// is the nearest thing to tap (a lesson's place may hold a cluster of targets a couple of blocks apart).
// A spot inside a block would be lifted out once play resumes and could leave her out of reach.
import type { SolidAt } from '@miu/voxel/grid-collision';
import type { WorldBounds } from '@miu/voxel/outland';
import { usableSpot, type LiquidAt } from './saved-spot';

type Point = readonly [number, number, number];

interface Placed {
  readonly position: readonly number[];
  readonly radius: number;
}

const SIDES = [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1.4], [-1.4, 0], [1.4, 0], [0, 1.4]] as const;
/** Kept inside the radius by this much, so a small settle on landing does not take the target out of reach. */
const REACH_MARGIN = 0.25;

export function standBeside(target: Placed, others: readonly Placed[], solid: SolidAt, liquid: LiquidAt, bounds: WorldBounds, height: number): Point {
  const [x = 0, y = 0, z = 0] = target.position;
  const flat = (p: readonly number[], px: number, pz: number): number => Math.hypot((p[0] ?? 0) - px, (p[2] ?? 0) - pz);
  const nearestIsTarget = (px: number, pz: number): boolean => others.every((t) => flat(t.position, px, pz) > flat(target.position, px, pz));
  const near = Math.min(1.5, target.radius * 0.5);
  for (const offset of [near, target.radius * 0.7]) {
    for (const [sx, sz] of SIDES) {
      for (const dy of [0, 1, -1]) {
        const spot = usableSpot([x + sx * offset, y + dy, z + sz * offset], solid, liquid, bounds, height);
        if (!spot || !nearestIsTarget(spot[0], spot[2])) continue;
        if (Math.hypot(spot[0] - x, spot[1] - y, spot[2] - z) <= target.radius - REACH_MARGIN) return spot;
      }
    }
  }
  // No open ground beside it: the old placement, the first side where it is the nearest target.
  const [dx, dz] = SIDES.find(([sx, sz]) => nearestIsTarget(x + sx * near, z + sz * near)) ?? SIDES[0];
  return [x + dx * near, y, z + dz * near];
}
