// Block-built trees: a small template tree and the chapter's ancient tree landmark.
import { put, type WorldWriter } from './world-writer';

export interface TreeBlocks {
  log: number;
  leaves: number;
}

/** Trunk of `height` starting at (x, baseY, z) with a layered canopy; `rng` trims canopy corners. */
export function placeTree(world: WorldWriter, x: number, baseY: number, z: number, height: number, blocks: TreeBlocks, rng: () => number): void {
  const top = baseY + height;
  for (let y = baseY; y < top; y++) put(world, x, y, z, blocks.log);
  for (const [dy, radius] of [[-2, 2], [-1, 2], [0, 1], [1, 1]] as const) {
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        const corner = Math.abs(dx) === radius && Math.abs(dz) === radius;
        if (corner && (radius === 1 ? dy === 1 : rng() < 0.6)) continue;
        put(world, x + dx, top + dy, z + dz, blocks.leaves, true);
      }
    }
  }
}

/** 3x3 trunk with root flares and a wide ellipsoid canopy; returns the canopy centre height. */
export function placeAncientTree(world: WorldWriter, cx: number, baseY: number, cz: number, blocks: TreeBlocks, rng: () => number): number {
  const trunkHeight = 13;
  for (let y = baseY - 1; y < baseY + trunkHeight; y++) {
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) put(world, cx + dx, y, cz + dz, blocks.log);
  }
  for (const [dx, dz] of [[2, 0], [-2, 0], [0, 2], [0, -2], [2, 1], [-2, -1], [1, -2], [-1, 2]] as const) {
    const h = 1 + Math.floor(rng() * 3);
    for (let y = baseY; y < baseY + h; y++) put(world, cx + dx, y, cz + dz, blocks.log);
  }
  // Two thick branches that the canopy swallows, so the crown reads as held up by the trunk.
  for (let i = 0; i < 4; i++) {
    put(world, cx + 2 + i, baseY + 9 + Math.floor(i / 2), cz, blocks.log);
    put(world, cx - 2 - i, baseY + 10 + Math.floor(i / 2), cz + 1, blocks.log);
  }
  const centerY = baseY + trunkHeight + 1;
  const rx = 7.5;
  const ry = 4.5;
  for (let dx = -8; dx <= 8; dx++) {
    for (let dy = -5; dy <= 5; dy++) {
      for (let dz = -8; dz <= 8; dz++) {
        const d = (dx / rx) ** 2 + (dy / ry) ** 2 + (dz / rx) ** 2;
        if (d <= 1 - rng() * 0.18) put(world, cx + dx, centerY + dy, cz + dz, blocks.leaves, true);
      }
    }
  }
  return centerY;
}
