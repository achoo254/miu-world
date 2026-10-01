// Checks every region map's test runs (map-kit.ts builds the maps): the generator is deterministic and its
// committed output is current, every quest target stands on the ground, and the child can walk from the
// spawn to every target.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { expect } from 'vitest';
import type { VoxelWorld } from '../../packages/voxel/src/chunk-format';
import { worldEntitiesSchema, type WorldEntities } from '../../packages/voxel/src/world-entities';
import { mapDir, mapFiles } from './map-kit';
import { reachable, walkSolid } from './walkable';

type Generated = { world: VoxelWorld; entities: WorldEntities };

/**
 * The map's files are the committed ones (else rerun the generator): an earlier run wrote them, so this also
 * proves the generator gives the same map every time.
 */
export async function expectCommittedOutput(first: Generated): Promise<void> {
  const dir = mapDir(first.entities.id);
  const files = mapFiles(first.world, first.entities);
  expect((await readdir(path.join(dir, 'regions'))).sort(), 'the committed regions are this map\'s').toEqual(files.filter((f) => f.file.startsWith('regions/')).map((f) => f.file.slice(8)).sort());
  for (const f of files) {
    const committed = await readFile(path.join(dir, f.file));
    const message = `${f.file}: run the ${first.entities.id} generator after changing it`;
    if (typeof f.bytes === 'string') expect(JSON.parse(committed.toString('utf8')), message).toEqual(first.entities);
    else expect(committed.equals(Buffer.from(f.bytes)), message).toBe(true);
  }
}

/** The entities parse as version 2; every target and the spawn stand in air on a solid block. */
export function expectStandsOnGround(world: VoxelWorld, entities: WorldEntities): void {
  const parsed = worldEntitiesSchema.parse(entities);
  for (const t of parsed.interactables) {
    const [x, y, z] = t.position.map(Math.floor) as [number, number, number];
    expect(world.get(x, y, z), `${t.id} is buried`).toBe(0);
    expect(world.get(x, y - 1, z), `${t.id} floats`).not.toBe(0);
  }
  const [x, y, z] = parsed.spawn.position.map(Math.floor) as [number, number, number];
  expect(world.get(x, y, z), 'the spawn is buried').toBe(0);
}

/** Standing spots reachable on foot from the spawn, and whether one is within a block of a column (at a height, if given). */
export async function walkFromSpawn(world: VoxelWorld, entities: WorldEntities): Promise<{ spots: Set<string>; reaches: (x: number, z: number, y?: number) => boolean }> {
  const spots = reachable(world, entities.spawn.position as [number, number, number], await walkSolid());
  const columns = [...spots].map((key) => key.split(',').map(Number) as [number, number, number]);
  const reaches = (x: number, z: number, y?: number): boolean => columns.some(([kx, ky, kz]) => Math.abs(kx - x) <= 1 && Math.abs(kz - z) <= 1 && (y === undefined || ky === y));
  return { spots, reaches };
}

/** The child can walk from the spawn to every quest target of the map. */
export async function expectTargetsReachable(world: VoxelWorld, entities: WorldEntities): Promise<void> {
  const { reaches } = await walkFromSpawn(world, entities);
  const stranded = entities.interactables.filter((t) => !reaches(Math.floor(t.position[0] ?? 0), Math.floor(t.position[2] ?? 0))).map((t) => t.id);
  expect(stranded, 'targets out of reach from the spawn').toEqual([]);
}
