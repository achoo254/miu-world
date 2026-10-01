// Builds chunk meshes (Web Worker, main-thread fallback) and hides chunks beyond the view distance.
import { BufferAttribute, BufferGeometry, Group, Mesh, Vector3, type Camera, type Material } from 'three';
import { CHUNK_SIZE } from '@miu/voxel/chunk-format';
import { mergeQuads, type QuadGeometry } from '@miu/voxel/greedy-mesher';
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
  /** `focus`: the child's body, kept in view by fading the trees in front of it; none in review shots. */
  update(camera: Camera, focus?: Vector3): void;
}

function toGeometry(geo: QuadGeometry): BufferGeometry {
  const out = new BufferGeometry();
  out.setAttribute('position', new BufferAttribute(geo.positions, 3));
  out.setAttribute('normal', new BufferAttribute(geo.normals, 3));
  out.setAttribute('uv', new BufferAttribute(geo.uvs, 2));
  out.setAttribute('tileRect', new BufferAttribute(geo.extra.tileRect ?? new Float32Array(0), 4));
  out.setAttribute('seeThrough', new BufferAttribute(geo.extra.seeThrough ?? new Float32Array(geo.positions.length / 3), 1));
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
  const { material: blockMaterial, seeThrough } = createBlockMaterial(data.atlasTexture, data.atlas.size, data.atlas.safeMipLevel);
  const water = createWaterMaterial(data.atlasTexture, data.atlas.size, data.atlas.safeMipLevel);
  // One mesh per chunk column and material (the chunks stacked at one x, z): a column is one draw call,
  // so a big map's view distance costs draw calls per column, not per chunk.
  const columnMeshes: Array<{ mesh: Mesh; center: Vector3 }> = [];
  const columns = new Map<string, { origin: [number, number]; opaque: QuadGeometry[]; water: QuadGeometry[] }>();
  const onChunk = (chunk: ChunkGeometry): void => {
    const key = `${chunk.origin[0]},${chunk.origin[2]}`;
    const column = columns.get(key) ?? { origin: [chunk.origin[0], chunk.origin[2]], opaque: [], water: [] };
    if (chunk.opaque) column.opaque.push(chunk.opaque);
    if (chunk.water) column.water.push(chunk.water);
    columns.set(key, column);
  };
  const buildColumns = (): void => {
    const half = CHUNK_SIZE / 2;
    for (const [key, column] of columns) {
      for (const [parts, material, suffix] of [[column.opaque, blockMaterial, 'opaque'], [column.water, water.material, 'water']] as const) {
        const geo = mergeQuads(parts);
        if (!geo) continue;
        const mesh = new Mesh(toGeometry(geo), material as Material);
        mesh.name = `column:${key}:${suffix}`;
        mesh.matrixAutoUpdate = false;
        if (suffix === 'water') mesh.renderOrder = 1;
        group.add(mesh);
        columnMeshes.push({ mesh, center: new Vector3(column.origin[0] + half, 0, column.origin[1] + half) });
      }
    }
  };

  let usedWorker = true;
  let meshMs: number;
  try {
    meshMs = await meshInWorker(data, onChunk);
  } catch (err) {
    console.warn('mesher worker unavailable, meshing on main thread', err);
    usedWorker = false;
    columns.clear();
    meshMs = meshOnMainThread(data, onChunk);
  }
  buildColumns();

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
    update(camera, focus) {
      camera.getWorldPosition(camPos);
      seeThrough.uSeeOn.value = focus ? 1 : 0;
      if (focus) {
        seeThrough.uSeeFrom.value.copy(camPos);
        seeThrough.uSeeTo.value.copy(focus);
      }
      // Column distance on the ground minus its half-diagonal, so partly-visible columns stay drawn.
      const pad = CHUNK_SIZE * 0.71;
      for (const { mesh, center } of columnMeshes) mesh.visible = Math.hypot(center.x - camPos.x, center.z - camPos.z) - pad < viewDistance;
    },
  };
}
