// Generates chapter 1 "Khu rừng bí mật" from a fixed seed: rolling terrain with rim hills, a stream,
// a wooden bridge, a stone path, scattered trees, the ancient tree, plus NPC/prop placements.
// Output: assets/generated/world/forest-ch1/{chunks.bin, entities.json}
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { NodeIO, getBounds } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { blockTableSchema } from '../../packages/voxel/src/block-table';
import { VoxelWorld, encodeWorld } from '../../packages/voxel/src/chunk-format';
import type { WorldEntities } from '../../packages/voxel/src/world-entities';
import { ASSETS_DIR, MANIFEST_NAME, REPO_ROOT, manifestSchema, readJson } from '../assets/asset-lib';
import { createRng, fbm, hashSeed } from './noise';
import { placeBridge } from './structures/bridge';
import { distanceToPath, pathColumns, type Point } from './structures/path';
import { placeAncientTree, placeTree } from './structures/tree';

export const MAP_ID = 'forest-ch1';
export const SEED_TEXT = 'miu-forest-ch1';
const CHUNKS = [6, 2, 6] as const; // 96 x 32 x 96 blocks
const WATER_LEVEL = 9;
const OUT_DIR = path.join(ASSETS_DIR, 'generated/world', MAP_ID);

const PACK = {
  pets: 'packs/kenney-cube-pets/2.0',
  survival: 'packs/kenney-survival-kit/2.0',
  nature: 'packs/kenney-nature-kit/2.1',
  food: 'packs/kenney-food-kit/2.0',
  castle: 'packs/kenney-castle-kit/2.0',
};

/** Prop models and the height (in blocks) each should stand at; scale is derived from its bounds. */
const PROP_HEIGHT: Record<string, number> = {
  [`${PACK.survival}/chest.glb`]: 0.8,
  [`${PACK.survival}/signpost.glb`]: 1.6,
  [`${PACK.survival}/campfire-pit.glb`]: 0.5,
  [`${PACK.survival}/barrel.glb`]: 1.0,
  [`${PACK.survival}/box-large.glb`]: 0.9,
  [`${PACK.survival}/fence.glb`]: 1.0,
  [`${PACK.nature}/mushroom_redGroup.glb`]: 0.6,
  [`${PACK.nature}/mushroom_tanGroup.glb`]: 0.6,
  [`${PACK.nature}/flower_redA.glb`]: 0.5,
  [`${PACK.nature}/flower_yellowB.glb`]: 0.5,
  [`${PACK.nature}/flower_purpleA.glb`]: 0.5,
  [`${PACK.nature}/log_stack.glb`]: 0.9,
  [`${PACK.nature}/lily_large.glb`]: 0.1,
  [`${PACK.food}/apple.glb`]: 0.35,
  [`${PACK.castle}/gate.glb`]: 5,
};
const PARROT_MODEL = `${PACK.pets}/animal-parrot.glb`;

export function riverCenter(x: number): number {
  return 50 + 6 * Math.sin(x / 14) + 2.5 * Math.sin(x / 6.3 + 1.3);
}

export function riverHalfWidth(x: number): number {
  return 2.3 + 0.8 * Math.sin(x / 9);
}

interface Clearing {
  x: number;
  z: number;
  radius: number;
}

const smoothstep = (e0: number, e1: number, v: number): number => {
  const t = Math.max(0, Math.min(1, (v - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

async function modelScales(listed: Set<string>): Promise<Map<string, number>> {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const scales = new Map<string, number>();
  for (const [model, height] of Object.entries({ ...PROP_HEIGHT, [PARROT_MODEL]: 1.1 })) {
    if (!listed.has(model)) throw new Error(`prop ${model} is not in the asset manifest`);
    const doc = await io.read(path.join(ASSETS_DIR, model));
    const scene = doc.getRoot().getDefaultScene() ?? doc.getRoot().listScenes()[0];
    if (!scene) throw new Error(`${model} has no scene`);
    const bounds = getBounds(scene);
    const modelHeight = bounds.max[1] - bounds.min[1];
    scales.set(model, +(height / Math.max(modelHeight, 1e-3)).toFixed(4));
  }
  return scales;
}

export async function generateForest(): Promise<{ world: VoxelWorld; entities: WorldEntities }> {
  const table = await readJson(path.join(REPO_ROOT, 'content/blocks.json'), blockTableSchema);
  const id = (name: string): number => {
    const block = table.blocks.find((b) => b.name === name);
    if (!block) throw new Error(`block ${name} missing from content/blocks.json`);
    return block.id;
  };
  const B = {
    grass: id('grass'), dirt: id('dirt'), stone: id('stone'), sand: id('sand'), log: id('log'), leaves: id('leaves'),
    planks: id('planks'), path: id('path'), water: id('water'), rock: id('rock-moss'), birch: id('birch-log'),
    autumn: id('leaves-autumn'), bed: id('riverbed'),
  };
  const manifest = await readJson(path.join(ASSETS_DIR, MANIFEST_NAME), manifestSchema);
  const scales = await modelScales(new Set(manifest.files.map((f) => f.path)));
  const scaleOf = (model: string): number => scales.get(model) ?? 1;

  const seed = hashSeed(SEED_TEXT);
  const rng = createRng(seed);
  const world = new VoxelWorld(CHUNKS);
  const [sx, sy, sz] = world.size;

  // Landmarks and the bridge crossing (river runs along x, so the bridge deck runs along z).
  const bridgeX = 45;
  const bridgeZ0 = Math.floor(riverCenter(bridgeX) - riverHalfWidth(bridgeX) - 2);
  const bridgeZ1 = Math.ceil(riverCenter(bridgeX) + riverHalfWidth(bridgeX) + 2);
  const deckY = WATER_LEVEL + 2;
  const spawn = { x: 16, z: 16 };
  const ancient = { x: 74, z: 80 };
  const parrot = { x: bridgeX + 6, z: bridgeZ1 + 5 };
  const clearings: Clearing[] = [
    { x: spawn.x, z: spawn.z, radius: 7 },
    { x: parrot.x, z: parrot.z, radius: 5 },
    { x: ancient.x, z: ancient.z, radius: 10 },
  ];
  const route: Point[] = [
    [spawn.x, spawn.z],
    [26, 26],
    [36, bridgeZ0 - 6],
    [bridgeX, bridgeZ0 - 2],
    [bridgeX, bridgeZ1 + 2],
    [parrot.x - 2, parrot.z],
    [62, 70],
    [ancient.x - 6, ancient.z - 6],
  ];

  // 1. Height field.
  const heights: number[][] = [];
  for (let x = 0; x < sx; x++) {
    heights[x] = [];
    for (let z = 0; z < sz; z++) {
      let h = 12 + fbm(seed, x / 26, z / 26) * 3.5;
      const edge = Math.min(x, z, sx - 1 - x, sz - 1 - z);
      if (edge < 9) h += (9 - edge) * 1.1; // rim hills keep the player inside the chapter
      for (const c of clearings) {
        const k = smoothstep(c.radius, c.radius + 5, Math.hypot(x - c.x, z - c.z));
        h = 12 * (1 - k) + h * k;
      }
      const pathDist = distanceToPath(route, x, z);
      h = h * smoothstep(1, 5, pathDist) + Math.min(h, 13) * (1 - smoothstep(1, 5, pathDist));
      const dr = Math.abs(z - riverCenter(x));
      const hw = riverHalfWidth(x);
      if (dr < hw + 4) h = WATER_LEVEL + 1 + (h - WATER_LEVEL - 1) * smoothstep(hw + 1, hw + 4, dr);
      if (x >= bridgeX - 1 && x <= bridgeX + 1 && dr >= hw && dr < hw + 6) h = Math.max(h, deckY - 1);
      (heights[x] as number[])[z] = Math.round(Math.min(h, sy - 12));
    }
  }
  const surface = (x: number, z: number): number => heights[x]?.[z] ?? 0;

  // 2. Terrain columns + stream.
  for (let x = 0; x < sx; x++) {
    for (let z = 0; z < sz; z++) {
      const dr = Math.abs(z - riverCenter(x));
      const hw = riverHalfWidth(x);
      if (dr < hw) {
        const bed = WATER_LEVEL - (dr < hw - 1 ? 2 : 1);
        for (let y = 0; y <= bed; y++) world.set(x, y, z, y === bed ? B.bed : B.stone);
        for (let y = bed + 1; y <= WATER_LEVEL; y++) world.set(x, y, z, B.water);
        continue;
      }
      const h = surface(x, z);
      const beach = dr < hw + 2 && h <= WATER_LEVEL + 1;
      for (let y = 0; y <= h; y++) {
        const idHere = y < h - 3 ? B.stone : y < h ? (beach ? B.sand : B.dirt) : beach ? B.sand : B.grass;
        world.set(x, y, z, idHere);
      }
    }
  }

  // 3. Stone path on the surface (bridge deck replaces it over the water).
  const pathCells = pathColumns(route, 1.3);
  for (const cell of pathCells) {
    const [x = 0, z = 0] = cell.split(',').map(Number);
    if (x < 0 || z < 0 || x >= sx || z >= sz) continue;
    const top = world.get(x, surface(x, z), z);
    if (top === B.grass || top === B.dirt || top === B.sand) world.set(x, surface(x, z), z, B.path);
  }

  // 4. Bridge.
  placeBridge(world, { x0: bridgeX - 1, x1: bridgeX + 1, z0: bridgeZ0, z1: bridgeZ1, deckY }, B);

  // 5. Ancient tree landmark.
  const ancientBase = surface(ancient.x, ancient.z) + 1;
  placeAncientTree(world, ancient.x, ancientBase, ancient.z, { log: B.log, leaves: B.leaves }, rng);

  // 6. Scattered trees (jittered grid, rejecting path, stream, clearings and rim).
  const occupied: Array<[number, number]> = [];
  for (let gx = 4; gx < sx - 4; gx += 7) {
    for (let gz = 4; gz < sz - 4; gz += 7) {
      const x = Math.round(gx + (rng() - 0.5) * 5);
      const z = Math.round(gz + (rng() - 0.5) * 5);
      if (x < 3 || z < 3 || x >= sx - 3 || z >= sz - 3) continue;
      if (distanceToPath(route, x, z) < 3.5) continue;
      if (Math.abs(z - riverCenter(x)) < riverHalfWidth(x) + 3) continue;
      if (clearings.some((c) => Math.hypot(x - c.x, z - c.z) < c.radius + 1)) continue;
      if (rng() < 0.18) continue;
      const roll = rng();
      const blocks = roll < 0.15 ? { log: B.birch, leaves: B.leaves } : roll < 0.3 ? { log: B.log, leaves: B.autumn } : { log: B.log, leaves: B.leaves };
      placeTree(world, x, surface(x, z) + 1, z, 4 + Math.floor(rng() * 3), blocks, rng);
      occupied.push([x, z]);
    }
  }

  // 7. Mossy boulders.
  for (let i = 0; i < 14; i++) {
    const x = 6 + Math.floor(rng() * (sx - 12));
    const z = 6 + Math.floor(rng() * (sz - 12));
    if (distanceToPath(route, x, z) < 3 || Math.abs(z - riverCenter(x)) < riverHalfWidth(x) + 1) continue;
    const y = surface(x, z) + 1;
    world.set(x, y, z, B.rock);
    if (rng() < 0.5 && x + 1 < sx) world.set(x + 1, surface(x + 1, z) + 1, z, B.rock);
    if (rng() < 0.3) world.set(x, y + 1, z, B.rock);
  }

  // 8. Entities.
  // First air cell above the terrain surface (not the tree-top: canopies overhang the ground).
  const standY = (x: number, z: number): number => {
    const bx = Math.floor(x);
    const bz = Math.floor(z);
    let y = surface(bx, bz) + 1;
    while (y < sy && world.get(bx, y, bz) !== 0) y++;
    return y;
  };
  const props: WorldEntities['props'] = [];
  const addProp = (model: string, x: number, z: number, yaw = 0): void => {
    props.push({ model, position: [x + 0.5, standY(x, z), z + 0.5], yaw, scale: scaleOf(model) });
  };
  addProp(`${PACK.survival}/signpost.glb`, spawn.x + 3, spawn.z + 3, 225);
  addProp(`${PACK.survival}/campfire-pit.glb`, spawn.x - 3, spawn.z + 1);
  addProp(`${PACK.survival}/barrel.glb`, spawn.x - 5, spawn.z - 3, 20);
  addProp(`${PACK.survival}/box-large.glb`, spawn.x - 4, spawn.z - 4, 40);
  for (let i = 0; i < 4; i++) addProp(`${PACK.survival}/fence.glb`, spawn.x - 6 + i, spawn.z - 6, 0);
  addProp(`${PACK.nature}/log_stack.glb`, bridgeX - 4, bridgeZ0 - 3, 90);
  for (let i = 0; i < 3; i++) addProp(`${PACK.food}/apple.glb`, parrot.x + 1 + i, parrot.z + 2, i * 40);
  addProp(`${PACK.survival}/chest.glb`, ancient.x - 5, ancient.z - 5, 45);
  addProp(`${PACK.castle}/gate.glb`, ancient.x + 4, ancient.z + 11, 0);
  const flowers = [`${PACK.nature}/flower_redA.glb`, `${PACK.nature}/flower_yellowB.glb`, `${PACK.nature}/flower_purpleA.glb`];
  const mushrooms = [`${PACK.nature}/mushroom_redGroup.glb`, `${PACK.nature}/mushroom_tanGroup.glb`];
  for (let i = 0; i < 18; i++) {
    const c = clearings[i % clearings.length] ?? clearings[0];
    if (!c) break;
    const a = rng() * Math.PI * 2;
    const r = c.radius * (0.5 + rng() * 0.6);
    const x = Math.round(c.x + Math.cos(a) * r);
    const z = Math.round(c.z + Math.sin(a) * r);
    if (!pathCells.has(`${x},${z}`)) addProp(flowers[i % flowers.length] ?? '', x, z, Math.floor(rng() * 360));
  }
  for (const [i, [x, z]] of occupied.entries()) {
    if (i % 4 === 0) addProp(mushrooms[i % 2] ?? '', x + 1, z + 1, Math.floor(rng() * 360));
  }
  for (let i = 0; i < 4; i++) {
    const x = 20 + i * 17;
    const z = Math.round(riverCenter(x));
    props.push({ model: `${PACK.nature}/lily_large.glb`, position: [x + 0.5, WATER_LEVEL + 1.02, z + 0.5], yaw: i * 70, scale: scaleOf(`${PACK.nature}/lily_large.glb`) });
  }

  const entities: WorldEntities = {
    version: 1,
    id: MAP_ID,
    seed,
    size: [sx, sy, sz],
    waterLevel: WATER_LEVEL,
    spawn: { position: [spawn.x + 0.5, standY(spawn.x, spawn.z), spawn.z + 0.5], yaw: 45 },
    npcs: [
      {
        id: 'parrot-guide',
        name: 'Vẹt',
        model: PARROT_MODEL,
        animation: 'idle',
        position: [parrot.x + 0.5, standY(parrot.x, parrot.z), parrot.z + 0.5],
        yaw: 200,
        scale: scaleOf(PARROT_MODEL),
        interactRadius: 3,
        label: 'Nói chuyện với Vẹt',
      },
    ],
    props,
    landmarks: [
      { id: 'ancient-tree', name: 'Cây cổ thụ', position: [ancient.x + 0.5, ancientBase, ancient.z + 0.5] },
      { id: 'bridge', name: 'Cầu gỗ', position: [bridgeX + 0.5, deckY + 1, (bridgeZ0 + bridgeZ1) / 2] },
      { id: 'chest', name: 'Rương', position: [ancient.x - 4.5, standY(ancient.x - 5, ancient.z - 5), ancient.z - 4.5] },
    ],
  };
  return { world, entities };
}

async function main(): Promise<void> {
  const { world, entities } = await generateForest();
  const bin = encodeWorld(world);
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(path.join(OUT_DIR, 'chunks.bin'), bin);
  await writeFile(path.join(OUT_DIR, 'entities.json'), `${JSON.stringify(entities, null, 2)}\n`);
  const solid = world.data.reduce((n, id) => n + (id === 0 ? 0 : 1), 0);
  console.log(
    `${MAP_ID}: ${world.size.join('x')} blocks, ${solid} non-air, chunks.bin ${bin.byteLength} bytes, ` +
      `${entities.props.length} props, ${entities.npcs.length} npc`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
