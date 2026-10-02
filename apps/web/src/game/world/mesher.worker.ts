// Web Worker: keeps its own copy of the regions round the child (they arrive as they are built, and are
// dropped with the main thread's) and meshes the patches the game asks for, off the main thread, sending
// the geometry back as transferables.
import '../../zod-config';
import type { AtlasBlock } from '@miu/voxel/block-table';
import { VoxelWorld } from '@miu/voxel/chunk-format';
import type { WorldBounds } from '@miu/voxel/outland';
import { SparseWorld } from '@miu/voxel/sparse-world';
import { createPatchMesher, type PatchGeometry } from './chunk-mesher';

export type MesherRequest =
  | { type: 'init'; bounds: WorldBounds; height: number; blocks: AtlasBlock[]; atlasSize: number }
  | { type: 'region'; rx: number; rz: number; data: Uint8Array }
  | { type: 'drop'; rx: number; rz: number }
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

let world: SparseWorld | null = null;
let meshPatch: ((px: number, pz: number) => PatchGeometry) | null = null;

self.onmessage = (event: MessageEvent<MesherRequest>) => {
  const request = event.data;
  if (request.type === 'init') {
    world = new SparseWorld(request.bounds, request.height);
    meshPatch = createPatchMesher(world, request.blocks, request.atlasSize);
  } else if (request.type === 'region') {
    if (world) world.setRegion(request.rx, request.rz, new VoxelWorld(world.regionChunks, request.data));
  } else if (request.type === 'drop') {
    world?.deleteRegion(request.rx, request.rz);
  } else if (meshPatch) {
    const patch = meshPatch(request.px, request.pz);
    const message: MesherMessage = { type: 'patch', patch };
    self.postMessage(message, patchTransferables(patch));
  }
};
