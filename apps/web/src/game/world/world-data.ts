// Loads a map (all via the manifest-guarded registry): its entities, the block atlas and the coarse
// horizon at once, then its blocks region by region (region-format.ts), the ones round the child first.
// Blocks of a region not loaded yet read as air; `regionLoaded` tells the game where it may not walk yet.
import { NearestFilter, LinearMipmapLinearFilter, SRGBColorSpace, TextureLoader, type Texture } from 'three';
import { atlasSchema, type Atlas } from '@miu/voxel/block-table';
import { CHUNK_SIZE, VoxelWorld } from '@miu/voxel/chunk-format';
import { REGION_BLOCKS, decodeHorizon, insertRegion, regionCounts, regionFile, type Horizon } from '@miu/voxel/region-format';
import { worldEntitiesSchema, type WorldEntities } from '@miu/voxel/world-entities';
import type { AssetRegistry } from '../asset-loader';

/** Regions fetched at the same time while the child moves. */
const PARALLEL_FETCHES = 2;

export interface RegionStream {
  /** Regions along x and z. */
  readonly counts: readonly [number, number];
  isLoaded(rx: number, rz: number): boolean;
  /** Whether the region holding a block column is in (outside the map counts as loaded: it is the edge). */
  loadedAt(x: number, z: number): boolean;
  /** Fetches every region within `radius` blocks of (x, z), nearest first; resolves once all are in. */
  loadAround(x: number, z: number, radius: number): Promise<void>;
  /** Called with each region as it arrives (its file bytes, for the mesher worker). */
  onRegion(listener: (rx: number, rz: number, bytes: Uint8Array) => void): void;
}

export interface WorldData {
  world: VoxelWorld;
  entities: WorldEntities;
  atlas: Atlas;
  atlasTexture: Texture;
  horizon: Horizon;
  regions: RegionStream;
  /** Bytes fetched for the world files so far (for the first-area download budget). */
  bytes(): number;
}

async function fetchChecked(registry: AssetRegistry, assetPath: string): Promise<Response> {
  const res = await fetch(registry.url(assetPath));
  if (!res.ok) throw new Error(`${assetPath}: HTTP ${res.status}`);
  return res;
}

export async function loadWorldData(registry: AssetRegistry, mapId: string): Promise<WorldData> {
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
  const entities = worldEntitiesSchema.parse(JSON.parse(entitiesText));
  const loader = new TextureLoader(registry.createLoadingManager());
  const atlasTexture = await loader.loadAsync(registry.url('generated/atlas/atlas.png'));
  atlasTexture.colorSpace = SRGBColorSpace;
  atlasTexture.flipY = false;
  atlasTexture.magFilter = NearestFilter;
  atlasTexture.minFilter = LinearMipmapLinearFilter;
  atlasTexture.anisotropy = 4;

  const [sx, sy, sz] = entities.size;
  const world = new VoxelWorld([sx / CHUNK_SIZE, sy / CHUNK_SIZE, sz / CHUNK_SIZE]);
  let bytes = entitiesText.length + horizonBytes.byteLength + atlasText.length;
  const counts = regionCounts(world.chunks);
  const loaded = new Set<string>();
  const pending = new Map<string, Promise<void>>();
  const listeners: Array<(rx: number, rz: number, bytes: Uint8Array) => void> = [];
  /** Fetches beyond the parallel limit wait here, nearest first (the queue is sorted on every request). */
  const waiting: Array<{ rx: number; rz: number; distance: number; start: () => void }> = [];
  let active = 0;
  const next = (): void => {
    while (active < PARALLEL_FETCHES && waiting.length > 0) {
      waiting.sort((a, b) => a.distance - b.distance);
      waiting.shift()?.start();
    }
  };
  const fetchRegion = (rx: number, rz: number, distance: number): Promise<void> => {
    const key = `${rx},${rz}`;
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
          fetchChecked(registry, `${base}/${regionFile(rx, rz)}`)
            .then((res) => res.arrayBuffer())
            .then((buffer) => {
              const regionBytes = new Uint8Array(buffer);
              insertRegion(world, rx, rz, regionBytes);
              bytes += regionBytes.byteLength;
              loaded.add(key);
              for (const listener of listeners) listener(rx, rz, regionBytes);
              resolve();
            })
            .catch(reject)
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
    counts,
    isLoaded: (rx, rz) => loaded.has(`${rx},${rz}`),
    loadedAt: (x, z) => {
      const rx = Math.floor(x / REGION_BLOCKS);
      const rz = Math.floor(z / REGION_BLOCKS);
      return rx < 0 || rz < 0 || rx >= counts[0] || rz >= counts[1] || loaded.has(`${rx},${rz}`);
    },
    loadAround: async (x, z, radius) => {
      const wanted: Array<Promise<void>> = [];
      for (let rz = 0; rz < counts[1]; rz++) {
        for (let rx = 0; rx < counts[0]; rx++) {
          // Distance from the point to the region's rectangle.
          const dx = Math.max(rx * REGION_BLOCKS - x, 0, x - (rx + 1) * REGION_BLOCKS);
          const dz = Math.max(rz * REGION_BLOCKS - z, 0, z - (rz + 1) * REGION_BLOCKS);
          const distance = Math.hypot(dx, dz);
          if (distance <= radius) wanted.push(fetchRegion(rx, rz, distance));
        }
      }
      await Promise.all(wanted);
    },
    onRegion: (listener) => listeners.push(listener),
  };
  return { world, entities, atlas, atlasTexture, horizon: decodeHorizon(horizonBytes), regions, bytes: () => bytes };
}
