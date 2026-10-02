// Finds routes on one map: builds the regions a route may pass through (the core's region files, the
// outer land from the map's seed, as region-builder.ts does for the game), keeps only their standing spots,
// and searches the rectangle round the child and the target. The spots of the regions read stay cached, so a
// second route on the same map needs no fetching. Pure data in and out: it runs in the route worker, or on
// the main thread when module workers fail.
import { REGION_BLOCKS } from '@miu/voxel/region-format';
import type { WorldBounds } from '@miu/voxel/outland';
import { createRegionBuilder, type RegionBuilderInit } from '../world/region-builder';
import { buildWalkGrid, findRoute, type RouteQuery, type RouteResult } from './route-search';
import { cellKey } from '@miu/voxel/prop-collision';
import { blockKinds, PROP_BLOCKING_ID, PROP_STEP_ID, walkRegion, type RegionWalk } from './walk-grid';

/** Land round the child and the target that a route may swing out through (blocks). */
const MARGIN = 48;
/** Regions a single search may read: a route across the whole core and some of the land round it. */
const MAX_REGIONS = 100;
/** Regions whose spots stay cached (about 200 KB each). */
const CACHE_REGIONS = 64;

export interface RouteServiceInit {
  builder: RegionBuilderInit;
  /** The world's rectangle (the outer land included when the map has one). */
  bounds: WorldBounds;
  /** Absolute URL of each core region file, keyed "rx,rz". */
  regionUrls: Readonly<Record<string, string>>;
  /** Block ids with what walking needs from the block table. */
  blocks: ReadonlyArray<{ id: number; name: string; solid?: boolean; liquid?: boolean; traversal?: string }>;
  /** Cells the map's solid props fill (`cellKey`, world coordinates) with their traversal: a route goes round them. */
  propCells?: ReadonlyArray<readonly [string, 'auto-step' | 'blocking']>;
}

export type RouteServiceResult = RouteResult | { ok: false; reason: 'too-far' | 'load-failed' };

export function createRouteService(init: RouteServiceInit, fetchBytes: (url: string) => Promise<Uint8Array> = defaultFetch): {
  find(query: RouteQuery): Promise<RouteServiceResult>;
} {
  const { build } = createRegionBuilder(init.builder);
  const kinds = blockKinds(init.blocks);
  const height = init.builder.size[1];
  const cache = new Map<string, RegionWalk>();
  const { bounds } = init;
  const props = new Map(init.propCells ?? []);

  const regionWalk = async (rx: number, rz: number): Promise<RegionWalk> => {
    const key = `${rx},${rz}`;
    const known = cache.get(key);
    if (known) {
      // Most recently used last: the first key is the one to drop.
      cache.delete(key);
      cache.set(key, known);
      return known;
    }
    const url = init.regionUrls[key];
    const region = build(rx, rz, url ? await fetchBytes(url) : null);
    const [ox, oz] = [rx * REGION_BLOCKS, rz * REGION_BLOCKS];
    const walk = walkRegion(
      (x, y, z) => {
        const prop = props.size > 0 ? props.get(cellKey(ox + x, y, oz + z)) : undefined;
        return prop === 'blocking' ? PROP_BLOCKING_ID : prop ? PROP_STEP_ID : region.get(x, y, z);
      },
      height,
      kinds,
    );
    cache.set(key, walk);
    while (cache.size > CACHE_REGIONS) {
      const oldest = cache.keys().next().value;
      if (oldest === undefined) break;
      cache.delete(oldest);
    }
    return walk;
  };

  return {
    async find(query) {
      const x0 = Math.max(bounds.x0, Math.floor(Math.min(query.from[0], query.to[0]) - MARGIN));
      const z0 = Math.max(bounds.z0, Math.floor(Math.min(query.from[2], query.to[2]) - MARGIN));
      const x1 = Math.min(bounds.x1, Math.ceil(Math.max(query.from[0], query.to[0]) + MARGIN));
      const z1 = Math.min(bounds.z1, Math.ceil(Math.max(query.from[2], query.to[2]) + MARGIN));
      const [rx0, rz0] = [Math.floor(x0 / REGION_BLOCKS), Math.floor(z0 / REGION_BLOCKS)];
      const [rx1, rz1] = [Math.floor((x1 - 1) / REGION_BLOCKS), Math.floor((z1 - 1) / REGION_BLOCKS)];
      if ((rx1 - rx0 + 1) * (rz1 - rz0 + 1) > MAX_REGIONS) return { ok: false, reason: 'too-far' };
      const walks = new Map<string, RegionWalk>();
      try {
        for (let rz = rz0; rz <= rz1; rz++) for (let rx = rx0; rx <= rx1; rx++) walks.set(`${rx},${rz}`, await regionWalk(rx, rz));
      } catch {
        return { ok: false, reason: 'load-failed' };
      }
      const grid = buildWalkGrid(x0, z0, x1, z1, (rx, rz) => walks.get(`${rx},${rz}`) ?? null);
      return findRoute(grid, query);
    },
  };
}

async function defaultFetch(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}
