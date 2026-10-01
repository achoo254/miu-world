// Web Worker: keeps its own copy of the map's blocks (regions arrive as they load) and meshes the patches
// the game asks for, off the main thread, sending the geometry back as transferables.
import '../../zod-config';
import type { AtlasBlock } from '@miu/voxel/block-table';
import { VoxelWorld, type ChunkCounts } from '@miu/voxel/chunk-format';
import { insertRegion } from '@miu/voxel/region-format';
import { createPatchMesher, type PatchGeometry } from './chunk-mesher';

export type MesherRequest =
  | { type: 'init'; chunks: ChunkCounts; blocks: AtlasBlock[]; atlasSize: number }
  | { type: 'region'; rx: number; rz: number; bytes: Uint8Array }
  | { type: 'patch'; px: number; pz: number };

export type MesherMessage = { type: 'patch'; patch: PatchGeometry };

export function patchTransferables(patch: PatchGeometry): ArrayBuffer[] {
  const out: ArrayBuffer[] = [];
  for (const geo of [patch.opaque, patch.water]) {
    if (!geo) continue;
    out.push(geo.positions.buffer as ArrayBuffer, geo.normals.buffer as ArrayBuffer, geo.uvs.buffer as ArrayBuffer, geo.indices.buffer as ArrayBuffer);
    for (const extra of Object.values(geo.extra)) out.push(extra.buffer as ArrayBuffer);
  }
  return out;
}

declare const self: DedicatedWorkerGlobalScope;

let world: VoxelWorld | null = null;
let meshPatch: ((px: number, pz: number) => PatchGeometry) | null = null;

self.onmessage = (event: MessageEvent<MesherRequest>) => {
  const request = event.data;
  if (request.type === 'init') {
    world = new VoxelWorld(request.chunks);
    meshPatch = createPatchMesher(world, request.blocks, request.atlasSize);
  } else if (request.type === 'region') {
    if (world) insertRegion(world, request.rx, request.rz, request.bytes);
  } else if (meshPatch) {
    const patch = meshPatch(request.px, request.pz);
    const message: MesherMessage = { type: 'patch', patch };
    self.postMessage(message, patchTransferables(patch));
  }
};
