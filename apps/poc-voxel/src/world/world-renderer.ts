// Builds chunk meshes (Web Worker, main-thread fallback) and hides chunks beyond the view distance.
import { BufferAttribute, BufferGeometry, Group, Mesh, Vector3, type Camera, type Material } from 'three';
import { CHUNK_SIZE } from '@miu/voxel/chunk-format';
import type { QuadGeometry } from '@miu/voxel/greedy-mesher';
import { createBlockMaterial, createWaterMaterial, type WaterUniforms } from './block-material';
import { createChunkMesher, type ChunkGeometry } from './chunk-mesher';
import type { MesherMessage, MesherRequest } from './mesher.worker';
import type { WorldData } from './world-data';

export interface WorldRenderer {
  group: Group;
  water: WaterUniforms;
  meshMs: number;
  usedWorker: boolean;
  setViewDistance(distance: number): void;
  update(camera: Camera): void;
}

function toGeometry(geo: QuadGeometry): BufferGeometry {
  const out = new BufferGeometry();
  out.setAttribute('position', new BufferAttribute(geo.positions, 3));
  out.setAttribute('normal', new BufferAttribute(geo.normals, 3));
  out.setAttribute('uv', new BufferAttribute(geo.uvs, 2));
  out.setAttribute('tileRect', new BufferAttribute(geo.extra.tileRect ?? new Float32Array(0), 4));
  const vertexCount = geo.positions.length / 3;
  out.setIndex(new BufferAttribute(vertexCount > 65535 ? geo.indices : Uint16Array.from(geo.indices), 1));
  out.computeBoundingSphere();
  return out;
}

const WORKER_TIMEOUT_MS = 20_000;

/**
 * Meshes all chunks in a Web Worker. Chunks are buffered and only handed over once the worker
 * finished, so a worker dying halfway can fall back to the main thread without duplicate meshes.
 */
async function meshInWorker(data: WorldData, onChunk: (chunk: ChunkGeometry) => void): Promise<number> {
  const worker = new Worker(new URL('./mesher.worker.ts', import.meta.url), { type: 'module' });
  const received: ChunkGeometry[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const ms = await new Promise<number>((resolve, reject) => {
      timer = setTimeout(() => reject(new Error('mesher worker timed out')), WORKER_TIMEOUT_MS);
      worker.onerror = (event) => reject(new Error(event.message || 'mesher worker failed'));
      worker.onmessage = (event: MessageEvent<MesherMessage>) => {
        if (event.data.type === 'chunk') received.push(event.data.chunk);
        else resolve(event.data.ms);
      };
      const request: MesherRequest = {
        chunks: data.world.chunks,
        data: data.world.data.slice(),
        blocks: data.atlas.blocks,
        atlasSize: data.atlas.size,
      };
      worker.postMessage(request, [request.data.buffer]);
    });
    received.forEach(onChunk);
    return ms;
  } finally {
    clearTimeout(timer);
    worker.terminate();
  }
}

/** Fallback for browsers without module workers: meshes during loading, never inside a frame. */
function meshOnMainThread(data: WorldData, onChunk: (chunk: ChunkGeometry) => void): number {
  const start = performance.now();
  const mesh = createChunkMesher(data.world, data.atlas.blocks, data.atlas.size);
  const [nx, ny, nz] = data.world.chunks;
  for (let cy = 0; cy < ny; cy++) for (let cz = 0; cz < nz; cz++) for (let cx = 0; cx < nx; cx++) onChunk(mesh(cx, cy, cz));
  return performance.now() - start;
}

export async function createWorldRenderer(data: WorldData): Promise<WorldRenderer> {
  const group = new Group();
  group.name = 'world';
  const blockMaterial = createBlockMaterial(data.atlasTexture, data.atlas.size, data.atlas.safeMipLevel);
  const water = createWaterMaterial(data.atlasTexture, data.atlas.size, data.atlas.safeMipLevel);
  const chunkMeshes: Array<{ mesh: Mesh; center: Vector3 }> = [];

  const add = (geo: QuadGeometry | null, material: Material, chunk: ChunkGeometry, suffix: string): void => {
    if (!geo) return;
    const mesh = new Mesh(toGeometry(geo), material);
    mesh.name = `chunk:${chunk.key}:${suffix}`;
    mesh.matrixAutoUpdate = false;
    if (suffix === 'water') mesh.renderOrder = 1;
    group.add(mesh);
    const half = CHUNK_SIZE / 2;
    chunkMeshes.push({ mesh, center: new Vector3(chunk.origin[0] + half, chunk.origin[1] + half, chunk.origin[2] + half) });
  };
  const onChunk = (chunk: ChunkGeometry): void => {
    add(chunk.opaque, blockMaterial, chunk, 'opaque');
    add(chunk.water, water.material, chunk, 'water');
  };

  let usedWorker = true;
  let meshMs: number;
  try {
    meshMs = await meshInWorker(data, onChunk);
  } catch (err) {
    console.warn('mesher worker unavailable, meshing on main thread', err);
    usedWorker = false;
    meshMs = meshOnMainThread(data, onChunk);
  }

  let viewDistance = Infinity;
  const camPos = new Vector3();
  return {
    group,
    water: water.uniforms,
    meshMs,
    usedWorker,
    setViewDistance(distance) {
      viewDistance = distance;
    },
    update(camera) {
      camera.getWorldPosition(camPos);
      // Chunk centre distance minus its half-diagonal, so partly-visible chunks stay drawn.
      const pad = CHUNK_SIZE * 0.87;
      for (const { mesh, center } of chunkMeshes) mesh.visible = center.distanceTo(camPos) - pad < viewDistance;
    },
  };
}
