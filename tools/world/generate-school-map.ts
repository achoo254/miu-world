// Generates "Trường học" (the Toán region) from a fixed seed: a school gate, the paved schoolyard with
// its flagpole and football pitch, and six more zones around it, one per Toán topic, joined by stone
// paths with no gates between them (children roam freely). Each zone has its own floor and a signpost
// with its name. Quest characters stand in their zone, tagged with the topic (chapter) whose quests
// use them. Output: assets/generated/world/truong-hoc/{chunks.bin, entities.json}
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { blockTableSchema } from '../../packages/voxel/src/block-table';
import { VoxelWorld, encodeWorld } from '../../packages/voxel/src/chunk-format';
import type { WorldEntities } from '../../packages/voxel/src/world-entities';
import { ASSETS_DIR, REPO_ROOT, readJson } from '../assets/asset-lib';
import { modelScales } from './model-scales';
import { createRng, fbm, hashSeed } from './noise';
import { distanceToPath, pathColumns, type Point } from './structures/path';
import { placeTree } from './structures/tree';

export const MAP_ID = 'truong-hoc';
export const SEED_TEXT = 'miu-truong-hoc';
const CHUNKS = [6, 2, 6] as const; // 96 x 32 x 96 blocks, like the forest
const GROUND = 12;
const OUT_DIR = path.join(ASSETS_DIR, 'generated/world', MAP_ID);

const PACK = {
  pets: 'packs/kenney-cube-pets/2.0',
  survival: 'packs/kenney-survival-kit/2.0',
  nature: 'packs/kenney-nature-kit/2.1',
};
const MODEL_HEIGHT: Record<string, number> = {
  [`${PACK.survival}/signpost.glb`]: 1.6,
  [`${PACK.survival}/workbench.glb`]: 0.9,
  [`${PACK.survival}/barrel.glb`]: 1.0,
  [`${PACK.survival}/box-large.glb`]: 0.9,
  [`${PACK.survival}/box.glb`]: 0.6,
  [`${PACK.nature}/flower_redA.glb`]: 0.5,
  [`${PACK.nature}/flower_yellowB.glb`]: 0.5,
  [`${PACK.nature}/flower_purpleA.glb`]: 0.5,
  [`${PACK.nature}/plant_bush.glb`]: 1.0,
  [`${PACK.pets}/animal-lion.glb`]: 1.3,
  [`${PACK.pets}/animal-monkey.glb`]: 1.1,
};
const MODEL_ANIMATION: Record<string, string> = {
  [`${PACK.pets}/animal-lion.glb`]: 'idle',
  [`${PACK.pets}/animal-monkey.glb`]: 'idle',
};

type Floor = 'path' | 'planks' | 'sand' | 'grass' | 'stone';
/** One zone per Toán topic (story-map.md): centre, half size, floor. */
export const ZONES: ReadonlyArray<{ id: string; name: string; topic: number; x: number; z: number; half: number; floor: Floor }> = [
  { id: 'san-truong', name: 'Sân trường', topic: 1, x: 48, z: 46, half: 13, floor: 'path' },
  { id: 'vuon-truong', name: 'Vườn trường', topic: 2, x: 20, z: 24, half: 8, floor: 'grass' },
  { id: 'cang-tin', name: 'Căng tin', topic: 3, x: 76, z: 24, half: 7, floor: 'planks' },
  { id: 'xuong-do-choi', name: 'Xưởng đồ chơi', topic: 4, x: 80, z: 52, half: 7, floor: 'planks' },
  { id: 'phong-mi-thuat', name: 'Phòng mĩ thuật', topic: 5, x: 74, z: 78, half: 7, floor: 'sand' },
  { id: 'thap-dong-ho', name: 'Tháp đồng hồ', topic: 6, x: 20, z: 72, half: 7, floor: 'stone' },
  { id: 'hoi-truong', name: 'Hội trường', topic: 7, x: 46, z: 82, half: 8, floor: 'planks' },
];
const GATE = { x: 48, z: 12 };

export async function generateSchool(): Promise<{ world: VoxelWorld; entities: WorldEntities }> {
  const table = await readJson(path.join(REPO_ROOT, 'content/blocks.json'), blockTableSchema);
  const id = (name: string): number => {
    const block = table.blocks.find((b) => b.name === name);
    if (!block) throw new Error(`block ${name} missing from content/blocks.json`);
    return block.id;
  };
  const B = { grass: id('grass'), dirt: id('dirt'), stone: id('stone'), sand: id('sand'), log: id('log'), leaves: id('leaves'), planks: id('planks'), path: id('path'), rock: id('rock-moss'), autumn: id('leaves-autumn'), birch: id('birch-log') };
  const scales = await modelScales(MODEL_HEIGHT, MODEL_ANIMATION);
  const scaleOf = (model: string): number => scales.get(model) ?? 1;

  const seed = hashSeed(SEED_TEXT);
  const rng = createRng(seed);
  const world = new VoxelWorld(CHUNKS);
  const [sx, sy, sz] = world.size;
  const yard = ZONES[0];
  if (!yard) throw new Error('no schoolyard');
  const inZone = (x: number, z: number, pad = 0) => ZONES.find((zn) => Math.abs(x - zn.x) <= zn.half + pad && Math.abs(z - zn.z) <= zn.half + pad);
  // Paths: gate → yard, yard → every other zone.
  const routes: Point[][] = [[[GATE.x, GATE.z], [yard.x, yard.z]], ...ZONES.slice(1).map((zn): Point[] => [[yard.x, yard.z], [zn.x, zn.z]])];
  const pathCells = new Set(routes.flatMap((r) => [...pathColumns(r, 1.3)]));
  const nearPath = (x: number, z: number) => routes.some((r) => distanceToPath(r, x, z) < 3);

  // 1. Terrain: level ground in the zones and along the paths, gentle rolls elsewhere, rim hills.
  const heights: number[][] = [];
  for (let x = 0; x < sx; x++) {
    heights[x] = [];
    for (let z = 0; z < sz; z++) {
      let h = GROUND + fbm(seed, x / 22, z / 22) * 2;
      const edge = Math.min(x, z, sx - 1 - x, sz - 1 - z);
      if (edge < 8) h += (8 - edge) * 1.2;
      if (inZone(x, z, 2) || nearPath(x, z)) h = GROUND;
      (heights[x] as number[])[z] = Math.round(Math.min(h, sy - 12));
    }
  }
  const surface = (x: number, z: number): number => heights[x]?.[z] ?? GROUND;
  for (let x = 0; x < sx; x++) {
    for (let z = 0; z < sz; z++) {
      const h = surface(x, z);
      const zone = inZone(x, z);
      const top = pathCells.has(`${x},${z}`) ? B.path : zone ? B[zone.floor] : B.grass;
      for (let y = 0; y <= h; y++) world.set(x, y, z, y < h - 3 ? B.stone : y < h ? B.dirt : top);
    }
  }

  // 2. Landmarks built from blocks: the flagpole, the clock tower, the hall's stage, the pitch lines.
  const flag = { x: yard.x, z: yard.z };
  for (let y = GROUND + 1; y <= GROUND + 8; y++) world.set(flag.x, y, flag.z, B.birch);
  for (let dz = 1; dz <= 3; dz++) for (let y = GROUND + 6; y <= GROUND + 8; y++) world.set(flag.x, y, flag.z + dz, B.autumn);
  const pitch = { x: yard.x - 8, z: yard.z };
  for (let dx = -4; dx <= 4; dx++) for (let dz = -6; dz <= 6; dz++) if (Math.abs(dx) === 4 || Math.abs(dz) === 6 || dz === 0) world.set(pitch.x + dx, GROUND, pitch.z + dz, B.sand);
  const tower = ZONES.find((zn) => zn.id === 'thap-dong-ho');
  if (tower) {
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) for (let y = GROUND + 1; y <= GROUND + 12; y++) {
      if (Math.abs(dx) === 2 || Math.abs(dz) === 2) world.set(tower.x + dx, y, tower.z - 2 + dz, y >= GROUND + 9 && dz === 2 && Math.abs(dx) < 2 ? B.planks : B.stone);
    }
  }
  const hall = ZONES.find((zn) => zn.id === 'hoi-truong');
  if (hall) for (let dx = -6; dx <= 6; dx++) for (let dz = 2; dz <= 6; dz++) world.set(hall.x + dx, GROUND + 1, hall.z + dz, B.planks);

  // 3. Trees outside the zones and paths (jittered grid); the garden gets its own ring of trees.
  for (let gx = 4; gx < sx - 4; gx += 8) {
    for (let gz = 4; gz < sz - 4; gz += 8) {
      const x = Math.round(gx + (rng() - 0.5) * 5);
      const z = Math.round(gz + (rng() - 0.5) * 5);
      if (x < 3 || z < 3 || x >= sx - 3 || z >= sz - 3 || inZone(x, z, 3) || nearPath(x, z) || Math.hypot(x - GATE.x, z - GATE.z) < 6) continue;
      if (rng() < 0.25) continue;
      placeTree(world, x, surface(x, z) + 1, z, 4 + Math.floor(rng() * 3), { log: B.log, leaves: rng() < 0.3 ? B.autumn : B.leaves }, rng);
    }
  }
  const garden = ZONES.find((zn) => zn.id === 'vuon-truong');
  if (garden) for (const [dx, dz] of [[-6, -6], [6, -6], [-6, 6], [6, 6]] as const) placeTree(world, garden.x + dx, GROUND + 1, garden.z + dz, 5, { log: B.log, leaves: B.leaves }, rng);

  // 4. Entities.
  const standY = (x: number, z: number): number => {
    let y = surface(x, z) + 1;
    while (y < sy && world.get(x, y, z) !== 0) y++;
    return y;
  };
  const place = (x: number, z: number): [number, number, number] => [x + 0.5, standY(x, z), z + 0.5];
  const props: WorldEntities['props'] = [];
  const addProp = (model: string, x: number, z: number, yaw = 0): void => {
    props.push({ model, position: place(x, z), yaw, scale: scaleOf(model) });
  };
  for (const zn of ZONES) addProp(`${PACK.survival}/signpost.glb`, zn.x - zn.half + 1, zn.z - zn.half + 1, 45);
  const canteen = ZONES.find((zn) => zn.id === 'cang-tin');
  if (canteen) for (let i = 0; i < 3; i++) addProp(`${PACK.survival}/workbench.glb`, canteen.x - 3 + i * 3, canteen.z + 2, 0);
  const workshop = ZONES.find((zn) => zn.id === 'xuong-do-choi');
  if (workshop) {
    addProp(`${PACK.survival}/box-large.glb`, workshop.x - 2, workshop.z + 2, 20);
    addProp(`${PACK.survival}/box.glb`, workshop.x + 2, workshop.z + 3, 40);
    addProp(`${PACK.survival}/barrel.glb`, workshop.x + 3, workshop.z - 2, 0);
  }
  if (garden) {
    const flowers = [`${PACK.nature}/flower_redA.glb`, `${PACK.nature}/flower_yellowB.glb`, `${PACK.nature}/flower_purpleA.glb`];
    for (let i = 0; i < 9; i++) addProp(flowers[i % 3] ?? '', garden.x - 3 + (i % 3) * 3, garden.z - 3 + Math.floor(i / 3) * 3, i * 40);
    addProp(`${PACK.nature}/plant_bush.glb`, garden.x + 4, garden.z, 0);
  }

  const animated = (model: string) => ({ model, scale: scaleOf(model), animation: MODEL_ANIMATION[model] ?? 'idle' });
  // Topic 1 characters (toan2-cd1-*): Sư Tử Vàng by the flagpole, Khỉ Lanh on the pitch.
  const interactables: WorldEntities['interactables'] = [
    { id: 'su-tu-vang', kind: 'npc', name: 'Sư Tử Vàng', label: 'Nói chuyện', position: place(flag.x + 2, flag.z - 2), yaw: 200, radius: 3, ...animated(`${PACK.pets}/animal-lion.glb`), chapter: 1 },
    { id: 'khi-lanh', kind: 'npc', name: 'Khỉ Lanh', label: 'Nói chuyện', position: place(pitch.x, pitch.z - 3), yaw: 90, radius: 3, ...animated(`${PACK.pets}/animal-monkey.glb`), chapter: 1 },
  ];

  const entities: WorldEntities = {
    version: 2,
    id: MAP_ID,
    seed,
    size: [sx, sy, sz],
    waterLevel: 0,
    spawn: { position: place(GATE.x, GATE.z + 2), yaw: 0 },
    interactables,
    props,
    landmarks: [
      ...ZONES.map((zn) => ({ id: zn.id, name: zn.name, position: [zn.x + 0.5, GROUND + 1, zn.z + 0.5] as [number, number, number] })),
      { id: 'cot-co', name: 'Cột cờ', position: [flag.x + 0.5, GROUND + 1, flag.z + 0.5] },
      { id: 'san-bong', name: 'Sân bóng', position: [pitch.x + 0.5, GROUND + 1, pitch.z + 0.5] },
    ],
  };
  return { world, entities };
}

async function main(): Promise<void> {
  const { world, entities } = await generateSchool();
  const bin = encodeWorld(world);
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(path.join(OUT_DIR, 'chunks.bin'), bin);
  await writeFile(path.join(OUT_DIR, 'entities.json'), `${JSON.stringify(entities, null, 2)}\n`);
  console.log(`${MAP_ID}: ${world.size.join('x')} blocks, chunks.bin ${bin.byteLength} bytes, ${entities.props.length} props, ${entities.interactables.length} interactables`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
