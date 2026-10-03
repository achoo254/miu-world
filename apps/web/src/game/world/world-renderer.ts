// Draws the map patch by patch round the camera (owner, 01/10/2026: maps ten times wider, far scenery loaded
// lazily): patches (2 x 2 chunk columns) within the view distance are meshed in a Web Worker as their
// regions arrive, nearest first and a few at a time, and dropped again once well out of view; regions are
// fetched ahead of the camera. Beyond the patches, a coarse horizon mesh (horizon-mesh.ts) keeps the world
// looking wide. An infinite view distance (still review shots) loads and meshes the whole map.
import { BufferAttribute, BufferGeometry, Group, Mesh, Vector3, type Camera, type ColorRepresentation, type Material } from 'three';
import type { VoxelWorld } from '@miu/voxel/chunk-format';
import type { QuadGeometry } from '@miu/voxel/greedy-mesher';
import { REGION_BLOCKS } from '@miu/voxel/region-format';
import { createBlockMaterial, createWaterMaterial, type SeeThroughUniforms, type WaterUniforms } from './block-material';
import { PATCH_BLOCKS, createPatchMesher, type PatchGeometry } from './chunk-mesher';
import { createHorizonMesh, type HorizonMesh } from './horizon-mesh';
import type { MesherMessage, MesherRequest } from './mesher.worker';
import type { WorldData } from './world-data';

/** The child as the fading sees her: her body, the height of her feet, how far she is under a roof (0–1). */
export interface SeeLine {
  focus: Vector3;
  feet: number;
  indoor: number;
}

export interface WorldRenderer {
  group: Group;
  water: WaterUniforms;
  /** The line of sight to the child that see-through surfaces keep clear (props share it). */
  seeThrough: SeeThroughUniforms;
  /** Milliseconds spent meshing so far (worker or main thread). */
  meshMs(): number;
  usedWorker: boolean;
  /** Patches drawn now. */
  patchCount(): number;
  setViewDistance(distance: number): void;
  /** `see`: the child to keep in view by fading what stands in front of her (world-renderer SeeLine); none in review shots. */
  update(camera: Camera, see?: SeeLine): void;
  /** Resolves once every region and patch within the view distance of (x, z) is in (the whole map when infinite). */
  settle(x: number, z: number): Promise<void>;
  dispose(): void;
}

/** Patch meshes asked of the worker at once: enough to keep it busy, few enough to answer the nearest first. */
const IN_FLIGHT = 3;
/** Patches mesh only past the view distance by this much, and are dropped only beyond `DROP_MARGIN`. */
const KEEP_MARGIN = PATCH_BLOCKS * 0.71;
const DROP_MARGIN = 48;
/** Regions are fetched this far ahead of the view distance, so walking never meets an unloaded edge. */
const PREFETCH = REGION_BLOCKS * 0.75;
const WORKER_TIMEOUT_MS = 20_000;

function toGeometry(geo: QuadGeometry): BufferGeometry {
  const out = new BufferGeometry();
  out.setAttribute('position', new BufferAttribute(geo.positions, 3));
  out.setAttribute('normal', new BufferAttribute(geo.normals, 3));
  out.setAttribute('uv', new BufferAttribute(geo.uvs, 2));
  out.setAttribute('tileRect', new BufferAttribute(geo.extra.tileRect ?? new Float32Array(0), 4));
  out.setAttribute('seeThrough', new BufferAttribute(geo.extra.seeThrough ?? new Float32Array(geo.positions.length / 3), 1));
  out.setAttribute('glow', new BufferAttribute(geo.extra.glow ?? new Float32Array(geo.positions.length / 3), 1));
  const vertexCount = geo.positions.length / 3;
  out.setIndex(new BufferAttribute(vertexCount > 65535 ? geo.indices : Uint16Array.from(geo.indices), 1));
  out.computeBoundingSphere();
  return out;
}

interface Patch {
  state: 'meshing' | 'ready';
  meshes: Mesh[];
  center: [number, number];
}

/** Meshes patches in a worker, or on the main thread (one patch per frame) when module workers fail. */
interface PatchSource {
  readonly usedWorker: boolean;
  request(px: number, pz: number): void;
  /** Main-thread fallback: meshes one queued patch now. */
  pump(): void;
  dispose(): void;
}

function workerSource(data: WorldData, onPatch: (patch: PatchGeometry) => void, onFail: (err: unknown) => void): PatchSource {
  const worker = new Worker(new URL('./mesher.worker.ts', import.meta.url), { type: 'module' });
  let answered = false;
  const timer = setTimeout(() => !answered && onFail(new Error('mesher worker timed out')), WORKER_TIMEOUT_MS);
  worker.onerror = (event) => onFail(new Error(event.message || 'mesher worker failed'));
  worker.onmessage = (event: MessageEvent<MesherMessage>) => {
    answered = true;
    clearTimeout(timer);
    onPatch(event.data.patch);
  };
  const post = (request: MesherRequest, transfer: Transferable[] = []): void => worker.postMessage(request, transfer);
  post({ type: 'init', bounds: data.bounds, height: data.world.height, blocks: data.atlas.blocks, atlasSize: data.atlas.size });
  const sendRegion = (rx: number, rz: number, region: VoxelWorld): void => {
    const copy = region.data.slice();
    post({ type: 'region', rx, rz, data: copy }, [copy.buffer]);
  };
  // Regions load only once the renderer exists (it starts the loading), so the worker sees every one.
  data.regions.onRegion(sendRegion);
  data.regions.onDrop((rx, rz) => post({ type: 'drop', rx, rz }));
  return {
    usedWorker: true,
    request: (px, pz) => post({ type: 'patch', px, pz }),
    pump: () => undefined,
    dispose: () => {
      clearTimeout(timer);
      worker.terminate();
    },
  };
}

function mainThreadSource(data: WorldData, onPatch: (patch: PatchGeometry) => void, addMs: (ms: number) => void): PatchSource {
  const mesh = createPatchMesher(data.world, data.atlas.blocks, data.atlas.size);
  const queue: Array<[number, number]> = [];
  return {
    usedWorker: false,
    request: (px, pz) => queue.push([px, pz]),
    pump: () => {
      const next = queue.shift();
      if (!next) return;
      const start = performance.now();
      const patch = mesh(next[0], next[1]);
      addMs(performance.now() - start);
      onPatch(patch);
    },
    dispose: () => undefined,
  };
}

export async function createWorldRenderer(data: WorldData, options: { sky: ColorRepresentation; horizon: boolean }): Promise<WorldRenderer> {
  const group = new Group();
  group.name = 'world';
  const { material: blockMaterial, seeThrough } = createBlockMaterial(data.atlasTexture, data.atlas.size, data.atlas.safeMipLevel);
  const water = createWaterMaterial(data.atlasTexture, data.atlas.size, data.atlas.safeMipLevel);
  const horizon: HorizonMesh | null = options.horizon ? await createHorizonMesh(data, options.sky) : null;
  if (horizon) group.add(horizon.mesh);

  // Patches of the whole world, and of the core alone (an infinite view, still shots, draws only the core).
  const patchRange = (b: { x0: number; z0: number; x1: number; z1: number }): [number, number, number, number] => [
    Math.floor(b.x0 / PATCH_BLOCKS),
    Math.floor(b.z0 / PATCH_BLOCKS),
    Math.ceil(b.x1 / PATCH_BLOCKS) - 1,
    Math.ceil(b.z1 / PATCH_BLOCKS) - 1,
  ];
  const worldPatches = patchRange(data.bounds);
  const corePatches = patchRange(data.core);
  const patches = new Map<string, Patch>();
  const inFlight = new Set<string>();
  const sentAt = new Map<string, number>();
  let meshMs = 0;
  let viewDistance = 64;

  const onPatch = (geo: PatchGeometry): void => {
    const key = `${geo.px},${geo.pz}`;
    inFlight.delete(key);
    const started = sentAt.get(key);
    if (started !== undefined) meshMs += performance.now() - started;
    sentAt.delete(key);
    const patch = patches.get(key);
    if (!patch) return; // dropped while it was meshing
    for (const [part, material, suffix] of [[geo.opaque, blockMaterial, 'opaque'], [geo.water, water.material, 'water']] as const) {
      if (!part) continue;
      const mesh = new Mesh(toGeometry(part), material as Material);
      mesh.name = `patch:${key}:${suffix}`;
      mesh.matrixAutoUpdate = false;
      mesh.receiveShadow = group.userData.receiveShadow === true;
      if (suffix === 'water') mesh.renderOrder = 1;
      group.add(mesh);
      patch.meshes.push(mesh);
    }
    patch.state = 'ready';
  };

  let source: PatchSource;
  const fallBack = (err: unknown): void => {
    if (!source.usedWorker) return;
    console.warn('mesher worker unavailable, meshing on main thread', err);
    source.dispose();
    source = mainThreadSource(data, onPatch, (ms) => (meshMs += ms));
    // Everything asked of the dead worker is asked again.
    for (const key of inFlight) {
      const [px = 0, pz = 0] = key.split(',').map(Number);
      source.request(px, pz);
    }
  };
  try {
    source = workerSource(data, onPatch, (err) => fallBack(err));
  } catch (err) {
    console.warn('mesher worker unavailable, meshing on main thread', err);
    source = mainThreadSource(data, onPatch, (ms) => (meshMs += ms));
  }

  /** A patch can be meshed once the regions under it and round it (for its border faces) are in. */
  const regionsReady = (px: number, pz: number): boolean => {
    const x0 = px * PATCH_BLOCKS - 1;
    const z0 = pz * PATCH_BLOCKS - 1;
    const x1 = (px + 1) * PATCH_BLOCKS;
    const z1 = (pz + 1) * PATCH_BLOCKS;
    return [[x0, z0], [x1, z0], [x0, z1], [x1, z1]].every(([x = 0, z = 0]) => data.regions.loadedAt(x, z));
  };
  const distanceTo = (px: number, pz: number, x: number, z: number): number => Math.hypot((px + 0.5) * PATCH_BLOCKS - x, (pz + 0.5) * PATCH_BLOCKS - z);

  // Places whose land stays drawn and held besides the one `step` is asked about: the camera's, and each ride's
  // stop being fetched while the child still stands at the other end (dropping either would leave her, or
  // her landing, over nothing, and the two would undo each other's work every frame).
  const camPos = new Vector3();
  let cameraAt: [number, number] | null = null;
  const holds: Array<[number, number]> = [];
  const kept = (cx: number, cz: number, x: number, z: number): boolean =>
    [[x, z], ...(cameraAt ? [cameraAt] : []), ...holds].some(([kx = 0, kz = 0]) => Math.hypot(cx - kx, cz - kz) <= viewDistance + DROP_MARGIN);

  /** Asks for the nearest wanted patches and drops the far ones; returns whether everything round (x, z) is in. */
  const step = (x: number, z: number): boolean => {
    const reach = viewDistance + KEEP_MARGIN;
    const wanted: Array<{ px: number; pz: number; d: number }> = [];
    let complete = true;
    const r = Number.isFinite(reach) ? Math.ceil(reach / PATCH_BLOCKS) + 1 : 0;
    const cpx = Math.floor(x / PATCH_BLOCKS);
    const cpz = Math.floor(z / PATCH_BLOCKS);
    const [ax, az, bx, bz] = Number.isFinite(reach)
      ? [Math.max(worldPatches[0], cpx - r), Math.max(worldPatches[1], cpz - r), Math.min(worldPatches[2], cpx + r), Math.min(worldPatches[3], cpz + r)]
      : corePatches;
    for (let pz = az; pz <= bz; pz++) {
      for (let px = ax; px <= bx; px++) {
        const d = distanceTo(px, pz, x, z);
        if (d > reach) continue;
        const patch = patches.get(`${px},${pz}`);
        if (patch?.state === 'ready') continue;
        complete = false;
        if (!patch && regionsReady(px, pz)) wanted.push({ px, pz, d });
      }
    }
    wanted.sort((a, b) => a.d - b.d);
    for (const w of wanted) {
      if (inFlight.size >= IN_FLIGHT) break;
      const key = `${w.px},${w.pz}`;
      patches.set(key, { state: 'meshing', meshes: [], center: [(w.px + 0.5) * PATCH_BLOCKS, (w.pz + 0.5) * PATCH_BLOCKS] });
      inFlight.add(key);
      sentAt.set(key, performance.now());
      source.request(w.px, w.pz);
    }
    source.pump();
    for (const [key, patch] of patches) {
      if (kept(patch.center[0], patch.center[1], x, z)) continue;
      for (const mesh of patch.meshes) {
        group.remove(mesh);
        mesh.geometry.dispose();
      }
      patches.delete(key);
      inFlight.delete(key);
    }
    return complete;
  };

  let lastFetch: [number, number] | null = null;
  const fetchAround = (x: number, z: number): void => {
    if (lastFetch && Math.hypot(lastFetch[0] - x, lastFetch[1] - z) < PATCH_BLOCKS) return;
    lastFetch = [x, z];
    void data.regions.loadAround(x, z, Number.isFinite(viewDistance) ? viewDistance + PREFETCH : Infinity);
    // Regions well behind are dropped (their patches went already): the blocks held stay a few dozen MB. Not
    // while a ride's stop is being fetched: its regions are far from the camera by design.
    if (Number.isFinite(viewDistance) && holds.length === 0) data.regions.dropBeyond(x, z, viewDistance + PREFETCH + REGION_BLOCKS);
  };

  return {
    group,
    water: water.uniforms,
    seeThrough,
    meshMs: () => meshMs,
    get usedWorker() {
      return source.usedWorker;
    },
    patchCount: () => [...patches.values()].filter((p) => p.state === 'ready').length,
    setViewDistance(distance) {
      viewDistance = distance;
      horizon?.setNear(distance);
      lastFetch = null;
    },
    update(camera, see) {
      camera.getWorldPosition(camPos);
      cameraAt = [camPos.x, camPos.z];
      seeThrough.uSeeOn.value = see ? 1 : 0;
      if (see) {
        seeThrough.uSeeFrom.value.copy(camPos);
        seeThrough.uSeeTo.value.copy(see.focus);
        seeThrough.uSeeFeet.value = see.feet;
        seeThrough.uSeeIndoor.value = see.indoor;
      }
      fetchAround(camPos.x, camPos.z);
      step(camPos.x, camPos.z);
      horizon?.update(camPos);
    },
    async settle(x, z) {
      const hold: [number, number] = [x, z];
      holds.push(hold);
      try {
        await data.regions.loadAround(x, z, Number.isFinite(viewDistance) ? viewDistance + PREFETCH : Infinity);
        // Meshing runs a few patches at a time: pump until everything in view is drawn.
        await new Promise<void>((resolve) => {
          const tick = (): void => {
            if (step(x, z)) resolve();
            else setTimeout(tick, 16);
          };
          tick();
        });
      } finally {
        holds.splice(holds.indexOf(hold), 1);
        lastFetch = null; // the next frame fetches (and drops) round wherever the camera is now
      }
    },
    dispose() {
      source.dispose();
      for (const patch of patches.values()) for (const mesh of patch.meshes) mesh.geometry.dispose();
      horizon?.dispose();
    },
  };
}
