// What a map's entities.json carries for the land round it (packages/voxel outland.ts): the seed, the
// theme, the ground the core's edge stands on (so the outer land meets it without a step) and the scale of
// every model the outer land may place (measured here, so the game needs no model bounds).
import type { VoxelWorld } from '../../packages/voxel/src/chunk-format';
import { OUTLAND_MODELS, type OutlandSpec, type OutlandTheme } from '../../packages/voxel/src/outland';
import { loadBlocks } from './map-kit';
import { catalogModels } from './model-catalog';
import { modelScales } from './model-scales';

/** What the core's edge stands on: never a tree, a roof or a fence, but water counts (its bed is the height). */
const GROUND = [
  'grass', 'dirt', 'stone', 'sand', 'path', 'riverbed', 'rock-moss', 'snow', 'asphalt',
  'grass-forest', 'grass-village', 'grass-hamlet', 'grass-farm', 'grass-library', 'grass-castle', 'grass-market', 'grass-home',
  'cobble', 'cobble-grey', 'paver', 'trail', 'farmland', 'wheat',
] as const;

/** `soil`: the core's own grass and lane blocks, which the land round it wears too. */
export async function outlandSpecOf(world: VoxelWorld, seed: number, theme: OutlandTheme, ground: number, soil?: OutlandSpec['soil']): Promise<OutlandSpec> {
  const block = await loadBlocks();
  const groundIds = new Set<number>(GROUND.map((name) => block(name)));
  const [sx, sy, sz] = world.size;
  /** The y of the column's top ground block (under any water), or the outer land's own ground when bare. */
  const groundAt = (x: number, z: number): number => {
    for (let y = sy - 1; y >= 0; y--) if (groundIds.has(world.get(x, y, z))) return y;
    return ground;
  };
  const along = (n: number, column: (i: number) => number): number[] => Array.from({ length: n }, (_, i) => column(i));
  const { heights } = await catalogModels();
  const scales = await modelScales(Object.fromEntries(OUTLAND_MODELS.map((model) => [model, heights[model] ?? 1])), {});
  return {
    seed,
    theme,
    ground,
    edge: {
      north: along(sx, (x) => groundAt(x, 0)),
      south: along(sx, (x) => groundAt(x, sz - 1)),
      west: along(sz, (z) => groundAt(0, z)),
      east: along(sz, (z) => groundAt(sx - 1, z)),
    },
    models: Object.fromEntries(scales),
    ...(soil ? { soil } : {}),
  };
}
