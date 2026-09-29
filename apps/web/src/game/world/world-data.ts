// Loads the generated chapter data (all via the manifest-guarded registry).
import { NearestFilter, LinearMipmapLinearFilter, SRGBColorSpace, TextureLoader, type Texture } from 'three';
import { atlasSchema, type Atlas } from '@miu/voxel/block-table';
import { decodeWorld, type VoxelWorld } from '@miu/voxel/chunk-format';
import { worldEntitiesSchema, type WorldEntities } from '@miu/voxel/world-entities';
import type { AssetRegistry } from '../asset-loader';

export interface WorldData {
  world: VoxelWorld;
  entities: WorldEntities;
  atlas: Atlas;
  atlasTexture: Texture;
  /** Bytes fetched for the world files (for the first-area download budget). */
  bytes: number;
}

async function fetchChecked(registry: AssetRegistry, assetPath: string): Promise<Response> {
  const res = await fetch(registry.url(assetPath));
  if (!res.ok) throw new Error(`${assetPath}: HTTP ${res.status}`);
  return res;
}

export async function loadWorldData(registry: AssetRegistry, mapId: string): Promise<WorldData> {
  const base = `generated/world/${mapId}`;
  const [chunksRes, entitiesRes, atlasRes] = await Promise.all([
    fetchChecked(registry, `${base}/chunks.bin`),
    fetchChecked(registry, `${base}/entities.json`),
    fetchChecked(registry, 'generated/atlas/atlas.json'),
  ]);
  const chunkBytes = new Uint8Array(await chunksRes.arrayBuffer());
  const entitiesText = await entitiesRes.text();
  const atlasText = await atlasRes.text();
  const atlas = atlasSchema.parse(JSON.parse(atlasText));
  const loader = new TextureLoader(registry.createLoadingManager());
  const atlasTexture = await loader.loadAsync(registry.url('generated/atlas/atlas.png'));
  atlasTexture.colorSpace = SRGBColorSpace;
  atlasTexture.flipY = false;
  atlasTexture.magFilter = NearestFilter;
  atlasTexture.minFilter = LinearMipmapLinearFilter;
  atlasTexture.anisotropy = 4;
  return {
    world: decodeWorld(chunkBytes),
    entities: worldEntitiesSchema.parse(JSON.parse(entitiesText)),
    atlas,
    atlasTexture,
    bytes: chunkBytes.byteLength + entitiesText.length + atlasText.length,
  };
}
