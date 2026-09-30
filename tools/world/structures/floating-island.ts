// Floating islands for the world overview: a grass (or snow) top whose rim wobbles, a few layers of dirt,
// then a stone underside that tapers to a rough point, so each island hangs in the sky like the mock's.
import { fbm } from '../noise';
import { put, type WorldWriter } from './world-writer';

export interface IslandSpec {
  x: number;
  z: number;
  radius: number;
  /** Height of the top surface. */
  top: number;
  /** How far the underside reaches below the top at the centre. */
  depth: number;
  seed: number;
}

export interface IslandBlocks {
  surface: number;
  dirt: number;
  stone: number;
}

/** Builds the island and returns whether a column belongs to its top (for placing things on it). */
export function placeFloatingIsland(world: WorldWriter, spec: IslandSpec, blocks: IslandBlocks): (x: number, z: number) => boolean {
  const reach = Math.ceil(spec.radius * 1.3);
  const edgeAt = (x: number, z: number): number => spec.radius * (0.85 + 0.35 * fbm(spec.seed, x * 0.12, z * 0.12));
  const inside = (x: number, z: number): boolean => Math.hypot(x - spec.x, z - spec.z) <= edgeAt(x, z);
  for (let x = spec.x - reach; x <= spec.x + reach; x++) {
    for (let z = spec.z - reach; z <= spec.z + reach; z++) {
      if (!inside(x, z)) continue;
      const t = Math.hypot(x - spec.x, z - spec.z) / edgeAt(x, z);
      const hang = Math.round(spec.depth * (1 - t) ** 0.9 + (fbm(spec.seed + 7, x * 0.35, z * 0.35) - 0.5) * 4);
      const bottom = spec.top - Math.max(2, hang);
      for (let y = bottom; y <= spec.top; y++) {
        put(world, x, y, z, y === spec.top ? blocks.surface : y >= spec.top - 2 ? blocks.dirt : blocks.stone);
      }
    }
  }
  return inside;
}
