// Where a child can walk on a generated map: a search over standing spots (feet in an empty block with an
// empty block above, on a solid block), moving to a neighbouring column one block up (the controller's
// step-up), two up (its automatic climb), level, or down a drop of up to three. Map tests use it to prove
// every place is reachable, and that what should stay out of reach (a 3-block wall or bank) does.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { blockTableSchema } from '../../packages/voxel/src/block-table';
import { REPO_ROOT } from '../assets/asset-lib';

/** Which block ids the child collides with, from content/blocks.json (water and leaves let her through). */
export async function walkSolid(): Promise<(id: number) => boolean> {
  const table = blockTableSchema.parse(JSON.parse(await readFile(path.join(REPO_ROOT, 'content/blocks.json'), 'utf8')));
  const solid = new Set(table.blocks.filter((b) => b.solid).map((b) => b.id));
  return (id) => solid.has(id);
}

export interface WalkGrid {
  readonly size: readonly [number, number, number];
  get(x: number, y: number, z: number): number;
}

const MAX_DROP = 3;
/** The controller's automatic climb (player-controller.ts CLIMB_HEIGHT). */
const MAX_CLIMB = 2;

/** Every standing spot reachable from `from` (feet position, block coordinates), as "x,y,z" keys. */
export function reachable(world: WalkGrid, from: readonly [number, number, number], isSolid: (id: number) => boolean, maxClimb = MAX_CLIMB): Set<string> {
  const [sx, sy, sz] = world.size;
  const free = (x: number, y: number, z: number) => x >= 0 && z >= 0 && x < sx && z < sz && y >= 0 && y < sy - 1 && !isSolid(world.get(x, y, z)) && !isSolid(world.get(x, y + 1, z));
  const stands = (x: number, y: number, z: number) => free(x, y, z) && y > 0 && isSolid(world.get(x, y - 1, z));
  const start: [number, number, number] = [Math.floor(from[0]), Math.floor(from[1]), Math.floor(from[2])];
  const seen = new Set<string>();
  if (!stands(...start)) return seen;
  const queue: Array<[number, number, number]> = [start];
  seen.add(start.join(','));
  while (queue.length > 0) {
    const [x, y, z] = queue.shift() as [number, number, number];
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx;
      const nz = z + dz;
      // Going up needs headroom over the current spot for the rise; down drops through empty columns.
      const candidates = [...Array.from({ length: maxClimb }, (_, i) => y + maxClimb - i), y, ...Array.from({ length: MAX_DROP }, (_, i) => y - 1 - i)];
      for (const ny of candidates) {
        if (ny > y && (!stands(nx, ny, nz) || Array.from({ length: ny - y }, (_, i) => y + 2 + i).some((hy) => isSolid(world.get(x, hy, z))))) continue;
        if (!stands(nx, ny, nz)) continue;
        if (ny < y && !free(nx, y, nz)) break;
        const key = `${nx},${ny},${nz}`;
        if (!seen.has(key)) {
          seen.add(key);
          queue.push([nx, ny, nz]);
        }
        break;
      }
    }
  }
  return seen;
}
