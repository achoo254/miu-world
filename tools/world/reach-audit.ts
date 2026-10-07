// `pnpm exec tsx tools/world/reach-audit.ts <map>…`: on a generated map's committed files, the quest targets,
// gates and stops the child cannot walk to from the spawn (blocks, solid props and `blocking` things counted,
// as in the game), and the spawn, chapter starts and ride arrivals that a solid prop covers. Fast (no map
// generation): run it after `pnpm world:<map>` instead of the map's whole test file.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { VoxelWorld } from '../../packages/voxel/src/chunk-format';
import { cellKey } from '../../packages/voxel/src/prop-collision';
import { insertRegion } from '../../packages/voxel/src/region-format';
import type { WorldEntities } from '../../packages/voxel/src/world-entities';
import { ASSETS_DIR } from '../assets/asset-lib';
import { propCells } from './prop-cells';
import { reachable, walkBlocking, walkSolid } from './walkable';
import { everyDecorProp } from '../../packages/voxel/src/home-decor';
import { withEventLayers } from '../../packages/voxel/src/event-layer';
import { eventLayersOf } from './event-layers';

export async function auditReach(map: string): Promise<{ stranded: string[]; covered: string[] }> {
  const dir = path.join(ASSETS_DIR, 'generated/world', map);
  // With the scenes of its limited-time events on it, as the game draws it while one is open.
  const e = withEventLayers(JSON.parse(await readFile(path.join(dir, 'entities.json'), 'utf8')) as WorldEntities, await eventLayersOf(map));
  const world = new VoxelWorld([e.size[0] / 16, e.size[1] / 16, e.size[2] / 16]);
  for (const f of await readdir(path.join(dir, 'regions'))) {
    const m = /^r(-?\d+)-(-?\d+)\.bin$/.exec(f);
    if (m) insertRegion(world, Number(m[1]), Number(m[2]), new Uint8Array(await readFile(path.join(dir, 'regions', f))));
  }
  // The child's home with every style she may pick standing at once: no pick may wall a target off.
  const cells = await propCells(everyDecorProp(e));
  const [solid, blocking] = [await walkSolid(), await walkBlocking()];
  const grid = {
    size: world.size,
    get: (x: number, y: number, z: number): number => {
      const p = cells.get(cellKey(x, y, z));
      return p === 'blocking' ? -2 : p ? -1 : world.get(x, y, z);
    },
  };
  const spots = reachable(grid, e.spawn.position, (id) => id < 0 || solid(id), undefined, (id) => id === -2 || blocking(id));
  const columns = new Set([...spots].map((k) => {
    const [x, , z] = k.split(',');
    return `${x},${z}`;
  }));
  const near = (x: number, z: number): boolean => {
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) if (columns.has(`${x + dx},${z + dz}`)) return true;
    return false;
  };
  const stranded = e.interactables.filter((t) => !near(Math.floor(t.position[0]), Math.floor(t.position[2]))).map((t) => t.id);
  const places: Array<[string, readonly number[]]> = [
    ['spawn', e.spawn.position],
    ...Object.entries(e.chapterSpawns ?? {}).map(([c, s]) => [`chapter ${c} start`, s.position] as [string, readonly number[]]),
    ...e.interactables.flatMap((t) => (t.ride ? [[`ride ${t.id} arrival`, t.ride] as [string, readonly number[]]] : [])),
  ];
  const covered = places.filter(([, p]) => [0, 1].some((dy) => cells.has(cellKey(Math.floor(p[0] ?? 0), Math.floor(p[1] ?? 0) + dy, Math.floor(p[2] ?? 0))))).map(([n]) => n);
  return { stranded, covered };
}

async function main(): Promise<void> {
  for (const map of process.argv.slice(2)) {
    const { stranded, covered } = await auditReach(map);
    console.log(`${map}: ${stranded.length === 0 ? 'every target reached' : `out of reach: ${stranded.join(', ')}`}; ${covered.length === 0 ? 'starts clear' : `covered by a prop: ${covered.join(', ')}`}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
