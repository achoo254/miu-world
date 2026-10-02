// Loads a map (all via the manifest-guarded registry): its entities, the block atlas and the coarse
// horizon at once, then its blocks region by region, the ones round the child first. A region is the
// outer land generated from the map's seed with the core's own region file laid over it (region-builder.ts,
// built in a worker); only the regions round the child are held, far ones are dropped again (owner,
// 02/10/2026: maps fifty times larger). Blocks of a region not held read as air; `loadedAt` tells the game
// where it may not walk yet.
import { NearestFilter, LinearMipmapLinearFilter, SRGBColorSpace, TextureLoader, type Texture } from 'three';
import { atlasSchema, type Atlas } from '@miu/voxel/block-table';
import { VoxelWorld } from '@miu/voxel/chunk-format';
import { OUTLAND_BOUNDS, type WorldBounds } from '@miu/voxel/outland';
import { outlandEntities } from '@miu/voxel/outland-life';
import { planOutland, type OutlandPlan } from '@miu/voxel/outland-plan';
import { REGION_BLOCKS, REGION_CHUNKS, decodeHorizon, regionFile, type Horizon } from '@miu/voxel/region-format';
import { SparseWorld } from '@miu/voxel/sparse-world';
import { worldEntitiesSchema, type WorldEntities } from '@miu/voxel/world-entities';
import type { AssetRegistry } from '../asset-loader';
import type { RouteServiceInit } from '../nav/route-service';
import { createRegionBuilder, type RegionBuilderInit } from './region-builder';
import type { RegionReply, RegionRequest } from './region.worker';

/** Regions fetched and built at the same time while the child moves. */
const PARALLEL_BUILDS = 2;

export interface RegionStream {
  /** Whether the region holding a block column is in (outside the world counts as in: it is the edge). */
  loadedAt(x: number, z: number): boolean;
  /**
   * Loads every region within `radius` blocks of (x, z), nearest first; resolves once all are in. An
   * infinite radius means the core's regions only (still pictures of the whole core).
   */
  loadAround(x: number, z: number, radius: number): Promise<void>;
  /** Drops the regions further than `radius` from (x, z) (nothing while their load is pending). */
  dropBeyond(x: number, z: number, radius: number): void;
  /** Called with each region as it arrives. */
  onRegion(listener: (rx: number, rz: number, region: VoxelWorld) => void): void;
  /** Called with each region as it is dropped. */
  onDrop(listener: (rx: number, rz: number) => void): void;
  /** Regions held now. */
  heldCount(): number;
  dispose(): void;
}

export interface WorldData {
  world: SparseWorld;
  /** The core's rectangle (0..size) and the whole world's (the outer land round it, when the map has one). */
  core: WorldBounds;
  bounds: WorldBounds;
  /** The map's entities, the outer land's own (villages, rides, life) added when it is loaded. */
  entities: WorldEntities;
  /** The outer land's layout (ground heights, skyline), null when the map ends at its edge. */
  outland: OutlandPlan | null;
  atlas: Atlas;
  atlasTexture: Texture;
  horizon: Horizon;
  regions: RegionStream;
  /** What the route finder needs to read the map's regions on its own (nav/route-service.ts). */
  route: RouteServiceInit;
  /** Bytes fetched for the world files so far (for the first-area download budget). */
  bytes(): number;
}

async function fetchChecked(registry: AssetRegistry, assetPath: string): Promise<Response> {
  const res = await fetch(registry.url(assetPath));
  if (!res.ok) throw new Error(`${assetPath}: HTTP ${res.status}`);
  return res;
}

/** Builds regions in a module worker, or on the main thread when module workers are not available. */
function regionSource(init: RegionBuilderInit): { build(rx: number, rz: number, core: Uint8Array | null): Promise<VoxelWorld>; dispose(): void } {
  const shape = [REGION_CHUNKS, init.size[1] / 16, REGION_CHUNKS] as const;
  const worker = ((): Worker | null => {
    try {
      return new Worker(new URL('./region.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      return null;
    }
  })();
  if (!worker) {
    const { build } = createRegionBuilder(init);
    return { build: async (rx, rz, core) => build(rx, rz, core), dispose: () => undefined };
  }
  const live = worker;
  const waiting = new Map<string, { resolve: (region: VoxelWorld) => void; reject: (err: Error) => void }>();
  live.onmessage = (event: MessageEvent<RegionReply>) => {
    const reply = event.data;
    const key = `${reply.rx},${reply.rz}`;
    const pending = waiting.get(key);
    waiting.delete(key);
    if (reply.type === 'built') pending?.resolve(new VoxelWorld(shape, reply.data));
    else pending?.reject(new Error(`region ${key}: ${reply.message}`));
  };
  live.onerror = (event) => {
    for (const pending of waiting.values()) pending.reject(new Error(event.message || 'region worker failed'));
    waiting.clear();
  };
  const post = (request: RegionRequest, transfer: Transferable[] = []): void => live.postMessage(request, transfer);
  post({ type: 'init', init });
  return {
    build: (rx, rz, core) =>
      new Promise<VoxelWorld>((resolve, reject) => {
        waiting.set(`${rx},${rz}`, { resolve, reject });
        post({ type: 'build', rx, rz, core }, core ? [core.buffer as ArrayBuffer] : []);
      }),
    dispose: () => live.terminate(),
  };
}

/** Distance from a point to a region's square. */
function regionDistance(rx: number, rz: number, x: number, z: number): number {
  const dx = Math.max(rx * REGION_BLOCKS - x, 0, x - (rx + 1) * REGION_BLOCKS);
  const dz = Math.max(rz * REGION_BLOCKS - z, 0, z - (rz + 1) * REGION_BLOCKS);
  return Math.hypot(dx, dz);
}

/**
 * `withOutland` false: only the core is loaded, even on a map with outer land (still pictures of the whole
 * core, which have no child walking away from it).
 */
export async function loadWorldData(registry: AssetRegistry, mapId: string, options: { withOutland?: boolean } = {}): Promise<WorldData> {
  const base = `generated/world/${mapId}`;
  const [entitiesRes, horizonRes, atlasRes] = await Promise.all([
    fetchChecked(registry, `${base}/entities.json`),
    fetchChecked(registry, `${base}/horizon.bin`),
    fetchChecked(registry, 'generated/atlas/atlas.json'),
  ]);
  const entitiesText = await entitiesRes.text();
  const horizonBytes = new Uint8Array(await horizonRes.arrayBuffer());
  const atlasText = await atlasRes.text();
  const atlas = atlasSchema.parse(JSON.parse(atlasText));
  const parsed = worldEntitiesSchema.parse(JSON.parse(entitiesText));
  const loader = new TextureLoader(registry.createLoadingManager());
  const atlasTexture = await loader.loadAsync(registry.url('generated/atlas/atlas.png'));
  atlasTexture.colorSpace = SRGBColorSpace;
  atlasTexture.flipY = false;
  atlasTexture.magFilter = NearestFilter;
  atlasTexture.minFilter = LinearMipmapLinearFilter;
  atlasTexture.anisotropy = 4;

  const [sx, sy, sz] = parsed.size;
  const spec = options.withOutland === false ? null : (parsed.outland ?? null);
  const core: WorldBounds = { x0: 0, z0: 0, x1: sx, z1: sz };
  const bounds: WorldBounds = spec ? OUTLAND_BOUNDS : core;
  const init: RegionBuilderInit = { size: [sx, sy, sz], waterLevel: parsed.waterLevel, outland: spec, blocks: atlas.blocks };
  // The layout (cheap) on the main thread too: the outer land's villages, rides and life are entities, and
  // its ground shapes the horizon; the blocks themselves are built in the worker.
  const outland = spec ? planOutland(spec, [sx, sy, sz], parsed.waterLevel) : null;
  const entities: WorldEntities = outland
    ? (() => {
        const extra = outlandEntities(outland);
        return {
          ...parsed,
          props: [...parsed.props, ...extra.props],
          ambients: [...(parsed.ambients ?? []), ...extra.ambients],
          interactables: [...parsed.interactables, ...extra.interactables],
          landmarks: [...parsed.landmarks, ...extra.landmarks],
        };
      })()
    : parsed;

  const world = new SparseWorld(bounds, sy);
  const source = regionSource(init);
  let bytes = entitiesText.length + horizonBytes.byteLength + atlasText.length;
  const [coreRx, coreRz] = [Math.ceil(sx / REGION_BLOCKS), Math.ceil(sz / REGION_BLOCKS)];
  const inCoreRegions = (rx: number, rz: number): boolean => rx >= 0 && rz >= 0 && rx < coreRx && rz < coreRz;
  const [rx0, rz0, rx1, rz1] = [bounds.x0 / REGION_BLOCKS, bounds.z0 / REGION_BLOCKS, Math.ceil(bounds.x1 / REGION_BLOCKS), Math.ceil(bounds.z1 / REGION_BLOCKS)].map(Math.floor) as [number, number, number, number];

  const pending = new Map<string, Promise<void>>();
  const listeners: Array<(rx: number, rz: number, region: VoxelWorld) => void> = [];
  const dropListeners: Array<(rx: number, rz: number) => void> = [];
  /** Loads beyond the parallel limit wait here, nearest first (the queue is sorted on every request). */
  const waiting: Array<{ rx: number; rz: number; distance: number; start: () => void }> = [];
  let active = 0;
  let disposed = false;
  const next = (): void => {
    while (active < PARALLEL_BUILDS && waiting.length > 0) {
      waiting.sort((a, b) => a.distance - b.distance);
      waiting.shift()?.start();
    }
  };
  const loadRegion = (rx: number, rz: number, distance: number): Promise<void> => {
    const key = `${rx},${rz}`;
    if (world.hasRegion(rx, rz)) return Promise.resolve();
    const known = pending.get(key);
    if (known) {
      const queued = waiting.find((w) => w.rx === rx && w.rz === rz);
      if (queued) queued.distance = Math.min(queued.distance, distance);
      return known;
    }
    const promise = new Promise<void>((resolve, reject) => {
      waiting.push({
        rx,
        rz,
        distance,
        start: () => {
          active++;
          const file = inCoreRegions(rx, rz)
            ? fetchChecked(registry, `${base}/${regionFile(rx, rz)}`)
                .then((res) => res.arrayBuffer())
                .then((buffer) => {
                  bytes += buffer.byteLength;
                  return new Uint8Array(buffer);
                })
            : Promise.resolve(null);
          file
            .then((coreBytes) => source.build(rx, rz, coreBytes))
            .then((region) => {
              pending.delete(key);
              if (disposed) return resolve();
              world.setRegion(rx, rz, region);
              for (const listener of listeners) listener(rx, rz, region);
              resolve();
            })
            .catch((err: unknown) => {
              pending.delete(key);
              reject(err instanceof Error ? err : new Error(String(err)));
            })
            .finally(() => {
              active--;
              next();
            });
        },
      });
      next();
    });
    pending.set(key, promise);
    return promise;
  };

  const regions: RegionStream = {
    loadedAt: (x, z) => {
      if (!world.contains(x, z)) return true;
      return world.hasRegion(Math.floor(x / REGION_BLOCKS), Math.floor(z / REGION_BLOCKS));
    },
    loadAround: async (x, z, radius) => {
      const wanted: Array<Promise<void>> = [];
      const whole = !Number.isFinite(radius);
      // Only the regions that can be within reach are visited: the world has some two thousand.
      const span = whole ? 0 : Math.ceil(radius / REGION_BLOCKS) + 1;
      const [cx, cz] = [Math.floor(x / REGION_BLOCKS), Math.floor(z / REGION_BLOCKS)];
      const [ax, az, bx, bz] = whole ? [0, 0, coreRx - 1, coreRz - 1] : [Math.max(rx0, cx - span), Math.max(rz0, cz - span), Math.min(rx1 - 1, cx + span), Math.min(rz1 - 1, cz + span)];
      for (let rz = az; rz <= bz; rz++) {
        for (let rx = ax; rx <= bx; rx++) {
          const distance = regionDistance(rx, rz, x, z);
          if (whole || distance <= radius) wanted.push(loadRegion(rx, rz, distance));
        }
      }
      await Promise.all(wanted);
    },
    dropBeyond: (x, z, radius) => {
      for (const [rx, rz] of world.regionList()) {
        if (regionDistance(rx, rz, x, z) <= radius) continue;
        world.deleteRegion(rx, rz);
        for (const listener of dropListeners) listener(rx, rz);
      }
    },
    onRegion: (listener) => listeners.push(listener),
    onDrop: (listener) => dropListeners.push(listener),
    heldCount: () => world.regionList().length,
    dispose: () => {
      disposed = true;
      source.dispose();
    },
  };
  // The core's region files by manifest URL (absolute: the route worker resolves URLs against its own script).
  const regionUrls: Record<string, string> = {};
  for (let rz = 0; rz < coreRz; rz++) {
    for (let rx = 0; rx < coreRx; rx++) regionUrls[`${rx},${rz}`] = new URL(registry.url(`${base}/${regionFile(rx, rz)}`), location.href).href;
  }
  const route: RouteServiceInit = { builder: init, bounds, regionUrls, blocks: atlas.blocks };
  return { world, core, bounds, entities, outland, atlas, atlasTexture, horizon: decodeHorizon(horizonBytes), regions, route, bytes: () => bytes };
}
