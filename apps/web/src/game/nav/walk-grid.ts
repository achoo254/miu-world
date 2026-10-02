// Where the child can stand, column by column, for finding a route to a quest target: every spot with
// feet in an open block, an open block above and solid ground under it (the rules of tools/world/walkable.ts),
// with how much room there is over it and what it stands on (a road, plain ground, or water). One region at
// a time, so the blocks themselves can be dropped once read.
import { REGION_BLOCKS } from '@miu/voxel/region-format';

/** Standing spots kept per column, lowest first: the ground, a floor or two, a roof. */
export const MAX_LEVELS = 4;
/** Open blocks over a spot are counted up to this many (a climb needs at most 4, a drop 5). */
export const CLEAR_CAP = 7;

/** What a spot stands on, which sets what walking there costs. */
export const Ground = { road: 1, plain: 2, water: 3 } as const;
export type GroundKind = (typeof Ground)[keyof typeof Ground];

/** Block ids by how walking treats them (from the block table: `solid`, `liquid`, `traversal`, and the road surfaces). */
export interface BlockKinds {
  solid(id: number): boolean;
  liquid(id: number): boolean;
  road(id: number): boolean;
  /** Never stood on by walking (traversal.ts `blocking`: fences, doors, railings, panes). */
  blocking(id: number): boolean;
}

/**
 * Stand-in ids for the cells solid props fill (prop-collision.ts), set over a region's blocks before its spots
 * are read: a crate or a bench is solid ground to step onto, a fence or a door is never stood on.
 */
export const PROP_STEP_ID = 254;
export const PROP_BLOCKING_ID = 255;

/**
 * Surfaces laid as ways through a map: the generators' paths (`soil.path`), village lanes and squares,
 * and the plank decks and bridges where a way crosses water.
 */
export const ROAD_BLOCKS: readonly string[] = ['path', 'trail', 'cobble', 'cobble-grey', 'paver', 'asphalt', 'planks'];

export function blockKinds(blocks: ReadonlyArray<{ id: number; name: string; solid?: boolean; liquid?: boolean; traversal?: string }>): BlockKinds {
  const solid = new Set<number>([PROP_STEP_ID, PROP_BLOCKING_ID]);
  const liquid = new Set<number>();
  const road = new Set<number>();
  const blocking = new Set<number>([PROP_BLOCKING_ID]);
  for (const b of blocks) {
    if (b.solid !== false) solid.add(b.id);
    if (b.liquid) liquid.add(b.id);
    if (ROAD_BLOCKS.includes(b.name)) road.add(b.id);
    if (b.traversal === 'blocking') blocking.add(b.id);
  }
  return { solid: (id) => solid.has(id), liquid: (id) => liquid.has(id), road: (id) => road.has(id), blocking: (id) => blocking.has(id) };
}

export interface RegionWalk {
  /** Per column (x fastest), MAX_LEVELS slots: the feet's block y of each spot, lowest first; 0 = no spot. */
  feet: Uint8Array;
  /** Open blocks from the feet up, capped at CLEAR_CAP. */
  clear: Uint8Array;
  /** GroundKind of each spot. */
  ground: Uint8Array;
}

/** Slot of a column's first spot in a RegionWalk (local column coordinates 0..REGION_BLOCKS). */
export function slotOf(lx: number, lz: number): number {
  return (lx + lz * REGION_BLOCKS) * MAX_LEVELS;
}

/** Reads one region's standing spots; `get` takes the region's own block coordinates. */
export function walkRegion(get: (x: number, y: number, z: number) => number, height: number, kinds: BlockKinds): RegionWalk {
  const columns = REGION_BLOCKS * REGION_BLOCKS;
  const feet = new Uint8Array(columns * MAX_LEVELS);
  const clear = new Uint8Array(columns * MAX_LEVELS);
  const ground = new Uint8Array(columns * MAX_LEVELS);
  const solid = new Uint8Array(height);
  const ids = new Uint8Array(height);
  for (let lz = 0; lz < REGION_BLOCKS; lz++) {
    for (let lx = 0; lx < REGION_BLOCKS; lx++) {
      for (let y = 0; y < height; y++) {
        const id = get(lx, y, lz);
        ids[y] = id;
        solid[y] = kinds.solid(id) ? 1 : 0;
      }
      const slot = slotOf(lx, lz);
      let level = 0;
      for (let y = 1; y < height - 1 && level < MAX_LEVELS; y++) {
        if (!solid[y - 1] || solid[y] || solid[y + 1] || kinds.blocking(ids[y - 1] ?? 0)) continue;
        let room = 0;
        while (y + room < height && !solid[y + room] && room < CLEAR_CAP) room++;
        const wet = kinds.liquid(ids[y] ?? 0) || kinds.liquid(ids[y + 1] ?? 0);
        feet[slot + level] = y;
        clear[slot + level] = room;
        ground[slot + level] = wet ? Ground.water : kinds.road(ids[y - 1] ?? 0) ? Ground.road : Ground.plain;
        level++;
      }
    }
  }
  return { feet, clear, ground };
}
