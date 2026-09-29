// Minimal block access used by structure builders (VoxelWorld satisfies it).
export interface WorldWriter {
  readonly size: readonly [number, number, number];
  get(x: number, y: number, z: number): number;
  set(x: number, y: number, z: number, id: number): void;
}

export function inBounds(world: WorldWriter, x: number, y: number, z: number): boolean {
  return x >= 0 && y >= 0 && z >= 0 && x < world.size[0] && y < world.size[1] && z < world.size[2];
}

/** Writes only inside the world; `onlyAir` keeps existing blocks (e.g. leaves never replace a trunk). */
export function put(world: WorldWriter, x: number, y: number, z: number, id: number, onlyAir = false): void {
  if (!inBounds(world, x, y, z)) return;
  if (onlyAir && world.get(x, y, z) !== 0) return;
  world.set(x, y, z, id);
}
