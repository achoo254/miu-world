// The outer land round a map (owner, 02/10/2026: maps fifty times larger). A map's own generator builds
// its core (0..size along x and z: lessons, gates, rides, life) as region files; the land round it, out to
// OUTLAND_BOUNDS, is generated from the map's seed while the child plays (the game's worker, with the same
// functions the tools test), so no file of it is stored. `entities.json` carries what that needs (`outland`).
import { z } from 'zod';
import { REGION_BLOCKS } from './region-format';

/** The whole world of every map, in blocks (the core sits at 0..size inside): 45 x 45 regions of 128. */
export const OUTLAND_BOUNDS = { x0: -19 * REGION_BLOCKS, z0: -19 * REGION_BLOCKS, x1: 26 * REGION_BLOCKS, z1: 26 * REGION_BLOCKS } as const;
export type WorldBounds = { readonly x0: number; readonly z0: number; readonly x1: number; readonly z1: number };

/** What the outer land of a map looks like most (its villages' trades and the land between them). */
export const OUTLAND_THEMES = ['river', 'forest', 'school', 'hamlet', 'market', 'farm', 'library', 'castle'] as const;
export type OutlandTheme = (typeof OUTLAND_THEMES)[number];

export const outlandSpecSchema = z.object({
  seed: z.number().int(),
  theme: z.enum(OUTLAND_THEMES),
  /** The ground the outer land rolls about (the core's own ground height). */
  ground: z.number().int(),
  /**
   * Ground height (the y of the top solid block that is not a tree) of each column along the core's four
   * edges: `north` z = 0 and `south` z = size - 1 for x = 0..size-1, `west` x = 0 and `east` x = size - 1
   * for z = 0..size-1. A column below the water level is water there; the outer land meets these heights.
   */
  edge: z.object({ north: z.array(z.number().int()), south: z.array(z.number().int()), west: z.array(z.number().int()), east: z.array(z.number().int()) }),
  /** Scale of each model the outer land may place (manifest path → scale), measured by the tools. */
  models: z.record(z.string(), z.number().positive()),
  /** The core's own grass and lane blocks (block names), so the land round a map wears its colours; default grass and path. */
  soil: z.object({ grass: z.string(), path: z.string() }).optional(),
});
export type OutlandSpec = z.infer<typeof outlandSpecSchema>;

/** Block ids the outer land is built from (looked up by name in the block table). */
export const OUTLAND_BLOCK_NAMES = [
  'grass', 'dirt', 'stone', 'sand', 'water', 'riverbed', 'path', 'planks', 'log', 'birch-log', 'tree-log', 'tree-birch-log', 'leaves', 'leaves-autumn', 'leaves-pink',
  'brick-red', 'brick-grey', 'wood-red', 'roof-blue', 'glass', 'rock-moss', 'snow',
] as const;
export type OutlandBlockName = (typeof OUTLAND_BLOCK_NAMES)[number];
export type OutlandBlocks = Readonly<Record<OutlandBlockName, number>>;

/** The block the outer land lays for one of its names: the map's own grass and lanes (`soil`), else the name itself. */
export function soilBlockName(soil: OutlandSpec['soil'], name: string): string {
  if (name === 'grass') return soil?.grass ?? name;
  if (name === 'path') return soil?.path ?? name;
  return name;
}

/** The ids of `OUTLAND_BLOCK_NAMES` in a block table (anything with `id` and `name`), grass and path as the map's `soil`. */
export function outlandBlocks(table: ReadonlyArray<{ id: number; name: string }>, soil?: OutlandSpec['soil']): OutlandBlocks {
  const out: Partial<Record<OutlandBlockName, number>> = {};
  for (const name of OUTLAND_BLOCK_NAMES) {
    const block = table.find((b) => b.name === soilBlockName(soil, name));
    if (!block) throw new Error(`block ${name} missing from the block table`);
    out[name] = block.id;
  }
  return out as OutlandBlocks;
}

/** Whether a column belongs to the core (its own map) rather than the outer land. */
export function inCore(size: readonly [number, number, number], x: number, z: number): boolean {
  return x >= 0 && z >= 0 && x < size[0] && z < size[2];
}

const PEOPLE = 'packs/kenney-blocky-characters/2.0';
const PETS = 'packs/kenney-cube-pets/2.0';
const NATURE = 'packs/kenney-nature-kit/2.1';
const SURVIVAL = 'packs/kenney-survival-kit/2.0';
const PROPS = 'generated/props';

/**
 * Every model the outer land may place. Their heights are in content/world/models.json with every other
 * model's; the tools measure each one's scale from there into `spec.models`, so the game needs no model bounds.
 */
export const OUTLAND_MODELS: readonly string[] = [
  ...'abcdefghijklmnopqr'.split('').map((k) => `${PEOPLE}/character-${k}.glb`),
  `${PETS}/animal-cow.glb`,
  `${PETS}/animal-pig.glb`,
  `${PETS}/animal-dog.glb`,
  `${PETS}/animal-cat.glb`,
  `${PETS}/animal-chick.glb`,
  `${PROPS}/automobile.glb`,
  `${PROPS}/basket.glb`,
  `${PROPS}/open-book.glb`,
  `${PROPS}/sailboat.glb`,
  `${SURVIVAL}/signpost.glb`,
  `${SURVIVAL}/bucket.glb`,
  `${SURVIVAL}/barrel.glb`,
  `${SURVIVAL}/tool-hoe.glb`,
  `${SURVIVAL}/tool-axe.glb`,
  `${SURVIVAL}/campfire-pit.glb`,
  `${SURVIVAL}/tent.glb`,
  `${NATURE}/canoe.glb`,
  `${NATURE}/canoe_paddle.glb`,
  `${NATURE}/fence_simple.glb`,
  `${NATURE}/flower_redA.glb`,
  `${NATURE}/flower_yellowB.glb`,
  `${NATURE}/flower_purpleA.glb`,
  `${NATURE}/plant_bushLarge.glb`,
  `${NATURE}/crops_bambooStageB.glb`,
  `${NATURE}/log_stack.glb`,
];
