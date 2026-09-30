// Web Worker: meshes every chunk off the main thread and streams geometry back (transferable).
import '../../zod-config';
import type { AtlasBlock } from '@miu/voxel/block-table';
import { VoxelWorld, type ChunkCounts } from '@miu/voxel/chunk-format';
import { createChunkMesher, type ChunkGeometry } from './chunk-mesher';

export interface MesherRequest {
  chunks: ChunkCounts;
  data: Uint8Array;
  blocks: AtlasBlock[];
  atlasSize: number;
}

export type MesherMessage = { type: 'chunk'; chunk: ChunkGeometry } | { type: 'done'; ms: number };

function transferables(chunk: ChunkGeometry): ArrayBuffer[] {
  const out: ArrayBuffer[] = [];
  for (const geo of [chunk.opaque, chunk.water]) {
    if (!geo) continue;
    out.push(geo.positions.buffer as ArrayBuffer, geo.normals.buffer as ArrayBuffer, geo.uvs.buffer as ArrayBuffer, geo.indices.buffer as ArrayBuffer);
    for (const extra of Object.values(geo.extra)) out.push(extra.buffer as ArrayBuffer);
  }
  return out;
}

declare const self: DedicatedWorkerGlobalScope;

self.onmessage = (event: MessageEvent<MesherRequest>) => {
  const start = performance.now();
  const { chunks, data, blocks, atlasSize } = event.data;
  const world = new VoxelWorld(chunks, data);
  const mesh = createChunkMesher(world, blocks, atlasSize);
  for (let cy = 0; cy < chunks[1]; cy++) {
    for (let cz = 0; cz < chunks[2]; cz++) {
      for (let cx = 0; cx < chunks[0]; cx++) {
        const chunk = mesh(cx, cy, cz);
        const message: MesherMessage = { type: 'chunk', chunk };
        self.postMessage(message, transferables(chunk));
      }
    }
  }
  const done: MesherMessage = { type: 'done', ms: performance.now() - start };
  self.postMessage(done);
};
