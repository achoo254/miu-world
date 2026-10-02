// Blocks of one 128 x 128 region of the outer land (outland-plan.ts lays it out), generated in the game's
// worker as the child walks: every column outside the core from the plan's column function (stone, soil, the
// top block, water to the water level, bridge decks and railings), then the buildings and the trees whose
// blocks fall in the region. Everything is drawn from global functions of a column, a building or a tree
// cell, in a fixed order, so a region's blocks never depend on which regions were generated before it.
import { CHUNK_SIZE, CHUNK_VOLUME, type VoxelWorld } from './chunk-format';
import { inCore, type OutlandBlockName, type OutlandBlocks } from './outland';
import { drawStructure, drawTree, forEachTree, RAIL, ROAD, sampleColumn, SHORE, surfaceBlock, WATER, type ColumnSample, type OutlandPlan } from './outland-plan';
import { REGION_BLOCKS, REGION_CHUNKS } from './region-format';

/**
 * Fills region (rx, rz) into `out` (a world of [REGION_CHUNKS, height / 16, REGION_CHUNKS] chunks, local
 * coordinates x - rx * 128, z - rz * 128): every column outside the core. Columns inside the core are left
 * untouched for the caller to overlay the core's own file; a region wholly outside the bounds is air.
 */
export function fillOutlandRegion(plan: OutlandPlan, blocks: OutlandBlocks, rx: number, rz: number, out: VoxelWorld): void {
  const [ncx, ncy, ncz] = out.chunks;
  if (ncx !== REGION_CHUNKS || ncz !== REGION_CHUNKS || ncy * CHUNK_SIZE !== plan.height) {
    throw new Error(`outland region needs ${REGION_CHUNKS}x${plan.height / CHUNK_SIZE}x${REGION_CHUNKS} chunks, got ${out.chunks.join('x')}`);
  }
  const ox = rx * REGION_BLOCKS;
  const oz = rz * REGION_BLOCKS;
  const b = plan.bounds;
  const [sx, , sz] = plan.size;
  const data = out.data;
  if (ox >= b.x1 || oz >= b.z1 || ox + REGION_BLOCKS <= b.x0 || oz + REGION_BLOCKS <= b.z0) {
    data.fill(0);
    return;
  }
  const coreX0 = Math.max(0, ox);
  const coreX1 = Math.min(sx, ox + REGION_BLOCKS);
  const coreZ0 = Math.max(0, oz);
  const coreZ1 = Math.min(sz, oz + REGION_BLOCKS);
  const touchesCore = coreX0 < coreX1 && coreZ0 < coreZ1;
  if (touchesCore && coreX0 === ox && coreZ0 === oz && coreX1 === ox + REGION_BLOCKS && coreZ1 === oz + REGION_BLOCKS) return;

  const height = plan.height;
  /** Offset of a block in `data` (local coordinates; the caller keeps them inside the region). */
  const at = (lx: number, y: number, lz: number): number =>
    ((lx >> 4) + REGION_CHUNKS * ((lz >> 4) + REGION_CHUNKS * (y >> 4))) * CHUNK_VOLUME + (lx & 15) + CHUNK_SIZE * ((lz & 15) + CHUNK_SIZE * (y & 15));
  const outland = (x: number, z: number): boolean => x >= b.x0 && z >= b.z0 && x < b.x1 && z < b.z1 && !inCore(plan.size, x, z);

  // 1. Columns: cleared, then soil and water. Their samples are kept for the trees standing in the region.
  const n = REGION_BLOCKS;
  const grounds = new Int16Array(n * n);
  const flags = new Uint8Array(n * n);
  const decks = new Int16Array(n * n);
  const sample: ColumnSample = { ground: 0, deck: -1, flags: 0 };
  const id = (name: OutlandBlockName): number => blocks[name];
  const wl = plan.waterLevel;
  if (!touchesCore) data.fill(0);
  for (let lz = 0; lz < n; lz++) {
    for (let lx = 0; lx < n; lx++) {
      const x = ox + lx;
      const z = oz + lz;
      if (!outland(x, z)) continue;
      if (touchesCore) for (let y = 0; y < height; y++) data[at(lx, y, lz)] = 0;
      const s = sampleColumn(plan, x, z, sample);
      const k = lx + lz * n;
      grounds[k] = s.ground;
      flags[k] = s.flags;
      decks[k] = s.deck;
      const g = Math.min(s.ground, height - 1);
      const wet = (s.flags & WATER) !== 0;
      const top = wet ? id('riverbed') : id(surfaceBlock(plan, x, z, s));
      const under = (s.flags & SHORE) !== 0 ? id('sand') : id('dirt');
      const stone = id('stone');
      for (let y = 0; y < g - 2; y++) data[at(lx, y, lz)] = stone;
      for (let y = Math.max(0, g - 2); y < g; y++) data[at(lx, y, lz)] = under;
      if (g >= 0) data[at(lx, g, lz)] = top;
      if (!wet) continue;
      for (let y = g + 1; y <= Math.min(wl, height - 1); y++) data[at(lx, y, lz)] = id('water');
      if (s.deck >= 0 && s.deck < height - 1) {
        if (s.flags & ROAD) data[at(lx, s.deck, lz)] = id('planks');
        else if (s.flags & RAIL) {
          data[at(lx, s.deck, lz)] = id('log');
          data[at(lx, s.deck + 1, lz)] = id('log');
        }
      }
    }
  }

  // 2. Buildings, clipped to the region.
  const x1 = ox + n - 1;
  const z1 = oz + n - 1;
  const put = (x: number, y: number, z: number, name: OutlandBlockName): void => {
    if (y < 0 || y >= height || !outland(x, z)) return;
    data[at(x - ox, y, z - oz)] = id(name);
  };
  for (const index of plan.grid.structures.within(ox, oz, x1, z1)) {
    const s = plan.structures[index];
    if (s) drawStructure(s, put, ox, oz, x1, z1);
  }

  // 3. Trees: trunks replace what is there, leaves fill only air (the first tree in the fixed order wins).
  const cached: ColumnSample = { ground: 0, deck: -1, flags: 0 };
  const cache = (x: number, z: number): ColumnSample | undefined => {
    const lx = x - ox;
    const lz = z - oz;
    if (lx < 0 || lz < 0 || lx >= n || lz >= n || !outland(x, z)) return undefined;
    const k = lx + lz * n;
    cached.ground = grounds[k] ?? 0;
    cached.flags = flags[k] ?? 0;
    cached.deck = decks[k] ?? -1;
    return cached;
  };
  forEachTree(plan, ox, oz, x1, z1, (t) => {
    drawTree(plan, t, (x, y, z, name, leaf) => {
      if (y < 0 || y >= height || !outland(x, z)) return;
      const k = at(x - ox, y, z - oz);
      if (leaf && data[k] !== 0) return;
      data[k] = id(name);
    }, ox, oz, x1, z1);
  }, cache);
}
