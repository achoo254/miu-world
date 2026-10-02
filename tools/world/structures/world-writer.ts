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

/** Which way a structure's front looks in the world (its own frame builds the front toward -z). */
export type Facing = 'north' | 'south' | 'east' | 'west';

/** The world column of a structure's own (u, v), its frame turned to `facing` about the world cell `origin`. */
export function turnCell(origin: readonly [number, number], facing: Facing, u: number, v: number): [number, number] {
  const [ox, oz] = origin;
  if (facing === 'south') return [ox - u, oz - v];
  if (facing === 'east') return [ox - v, oz + u];
  if (facing === 'west') return [ox + v, oz - u];
  return [ox + u, oz + v];
}

/** The facing nearest a direction in the world (x, z). */
export function facingOf(dx: number, dz: number): Facing {
  if (Math.abs(dx) > Math.abs(dz)) return dx > 0 ? 'east' : 'west';
  return dz > 0 ? 'south' : 'north';
}

/**
 * Where a structure's own frame starts: it builds from (FRAME, FRAME) so its eaves and the garden before its
 * front stay at positive coordinates (`put` writes nothing below 0).
 */
export const FRAME = 64;

/** The world column of a cell of a structure's own frame (FRAME-based), turned as `facingWriter` turns it. */
export const frameCell = (origin: readonly [number, number], facing: Facing, u: number, v: number): [number, number] => turnCell(origin, facing, u - FRAME, v - FRAME);

/**
 * A writer for building a structure in its own frame (from (FRAME, FRAME), front toward -z) that lands turned
 * to `facing` with that corner at the world cell `origin`: houses on both sides of a street both face it.
 */
export function facingWriter(world: WorldWriter, origin: readonly [number, number], facing: Facing): WorldWriter {
  return {
    size: [FRAME * 4, world.size[1], FRAME * 4],
    get: (u, y, v) => {
      const [x, z] = frameCell(origin, facing, u, v);
      return inBounds(world, x, y, z) ? world.get(x, y, z) : 0;
    },
    set: (u, y, v, id) => {
      const [x, z] = frameCell(origin, facing, u, v);
      if (inBounds(world, x, y, z)) world.set(x, y, z, id);
    },
  };
}
