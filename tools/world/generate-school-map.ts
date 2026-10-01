// Generates "Trường học" (the Toán region) from a fixed seed, after the owner's campus mocks
// (designs/truong-hoc/, docs/design-truong-hoc.md): a street with a crosswalk and the school bus along the
// south edge, the campus wall with its gate and lamps, the entrance yard with flower beds, the flagpole and
// a pitch, the two-storey main building with its clock tower (a furnished classroom on each floor and the
// staircase between them), and around it one zone per Toán topic: the canteen, the playground by the toy
// workshop, the courtyard under the clock tower, the science garden with its greenhouse, the art yard, the
// sports hall with the basketball court. Houses and a river lie outside the wall. Quest characters stand in
// their topic's zone. Output: assets/generated/world/truong-hoc/{chunks.bin, entities.json}
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
import { cellsIn, placeQuestTargets, readQuests, targetUses } from './chapters/place-quest-targets';
import { placeHouse } from './structures/buildings';
import { placeBed, placeBench, placeCampusWall, placeCourt, placeGreenhouse, placeLamp, placeMainBuilding, placeSportsHall, placeStreet, placeSwings, type SchoolPalette } from './structures/school';
import { placeTree, treeHeight } from './structures/tree';

export const MAP_ID = 'truong-hoc';
export const SEED_TEXT = 'miu-truong-hoc';
/** 192 x 48 x 192 blocks (Jev, 01/10/2026: the owner found the maps small). */
const CHUNKS = [12, 3, 12] as const;
const GROUND = 12;
const OUT_DIR = path.join(ASSETS_DIR, 'generated/world', MAP_ID);

const PACK = {
  pets: 'packs/kenney-cube-pets/2.0',
  survival: 'packs/kenney-survival-kit/2.0',
  nature: 'packs/kenney-nature-kit/2.1',
  castle: 'packs/kenney-castle-kit/2.0',
  props: 'generated/props',
};
const MODEL_HEIGHT: Record<string, number> = {
  [`${PACK.survival}/signpost.glb`]: 1.6,
  [`${PACK.survival}/workbench.glb`]: 0.9,
  [`${PACK.survival}/barrel.glb`]: 1.0,
  [`${PACK.survival}/box-large.glb`]: 0.9,
  [`${PACK.nature}/flower_redA.glb`]: 0.7,
  [`${PACK.nature}/flower_yellowB.glb`]: 0.7,
  [`${PACK.nature}/flower_purpleA.glb`]: 0.7,
  [`${PACK.nature}/plant_bush.glb`]: 1.0,
  [`${PACK.nature}/plant_bushSmall.glb`]: 0.7,
  [`${PACK.nature}/crop_carrot.glb`]: 0.5,
  [`${PACK.nature}/crop_pumpkin.glb`]: 0.6,
  [`${PACK.nature}/crops_cornStageD.glb`]: 1.4,
  [`${PACK.nature}/sign.glb`]: 1.4,
  [`${PACK.castle}/metal-gate.glb`]: 4,
  [`${PACK.pets}/animal-lion.glb`]: 1.3,
  [`${PACK.pets}/animal-monkey.glb`]: 1.1,
  [`${PACK.props}/clock-face.glb`]: 3.4,
  [`${PACK.props}/school-bus.glb`]: 3.2,
  [`${PACK.props}/playground-slide.glb`]: 2.6,
  [`${PACK.props}/potted-plant.glb`]: 1.0,
  [`${PACK.props}/books.glb`]: 0.6,
  [`${PACK.props}/globe.glb`]: 0.7,
  [`${PACK.props}/abacus.glb`]: 0.6,
  [`${PACK.props}/teddy-bear.glb`]: 0.8,
  [`${PACK.props}/artist-palette.glb`]: 0.9,
};
const MODEL_ANIMATION: Record<string, string> = {
  [`${PACK.pets}/animal-lion.glb`]: 'idle',
  [`${PACK.pets}/animal-monkey.glb`]: 'idle',
};

type Floor = 'path' | 'planks' | 'sand' | 'grass' | 'stone';
/** One zone per Toán topic (story-map.md): a rectangle (centre, half sizes) and its floor. */
export const ZONES: ReadonlyArray<{ id: string; name: string; topic: number; x: number; z: number; hx: number; hz: number; floor: Floor }> = [
  { id: 'san-truong', name: 'Sân trường', topic: 1, x: 96, z: 41, hx: 26, hz: 20, floor: 'path' },
  { id: 'vuon-truong', name: 'Vườn trường', topic: 2, x: 43, z: 116, hx: 21, hz: 30, floor: 'grass' },
  { id: 'cang-tin', name: 'Căng tin', topic: 3, x: 150, z: 41, hx: 20, hz: 20, floor: 'planks' },
  { id: 'xuong-do-choi', name: 'Xưởng đồ chơi', topic: 4, x: 42, z: 41, hx: 20, hz: 20, floor: 'sand' },
  { id: 'phong-mi-thuat', name: 'Phòng mĩ thuật', topic: 5, x: 96, z: 129, hx: 24, hz: 17, floor: 'sand' },
  { id: 'thap-dong-ho', name: 'Tháp đồng hồ', topic: 6, x: 96, z: 96, hx: 24, hz: 10, floor: 'stone' },
  { id: 'hoi-truong', name: 'Hội trường', topic: 7, x: 149, z: 116, hx: 21, hz: 30, floor: 'planks' },
];
/** Campus wall (inclusive) and the gate's opening on its south side. */
const CAMPUS = { x0: 16, x1: 175, z0: 17, z1: 152 };
const GATE: readonly [number, number] = [91, 101];
const STREET = { z0: 3, z1: 12 };
const RIVER = { x0: 180, x1: 187 };
/** The main building: front gallery from zFront, body back wall at zBack (school.ts). */
export const MAIN_BUILDING = { x0: 52, x1: 140, zFront: 66, zBack: 79, floorY: GROUND + 1 } as const;

export async function generateSchool(): Promise<{ world: VoxelWorld; entities: WorldEntities }> {
  const table = await readJson(path.join(REPO_ROOT, 'content/blocks.json'), blockTableSchema);
  const id = (name: string): number => {
    const block = table.blocks.find((b) => b.name === name);
    if (!block) throw new Error(`block ${name} missing from content/blocks.json`);
    return block.id;
  };
  const B = {
    grass: id('grass'), dirt: id('dirt'), stone: id('stone'), sand: id('sand'), log: id('log'), leaves: id('leaves'), planks: id('planks'), path: id('path'),
    autumn: id('leaves-autumn'), pink: id('leaves-pink'), birch: id('birch-log'), brickRed: id('brick-red'), brickGrey: id('brick-grey'), woodRed: id('wood-red'),
    water: id('water'), riverbed: id('riverbed'), glass: id('glass'), roofBlue: id('roof-blue'), asphalt: id('asphalt'), board: id('board'), snow: id('snow'),
  };
  const palette: SchoolPalette = {
    wall: B.sand, trim: B.birch, roof: B.brickRed, floor: B.planks, glass: B.glass, board: B.board, light: B.snow, stone: B.brickGrey, brick: B.brickGrey,
    asphalt: B.asphalt, line: B.snow, court: B.woodRed, roofBlue: B.roofBlue, log: B.log, door: B.woodRed, grass: B.grass, dirt: B.dirt, sand: B.sand,
  };
  const scales = await modelScales(MODEL_HEIGHT, MODEL_ANIMATION);
  const scaleOf = (model: string): number => scales.get(model) ?? 1;

  const seed = hashSeed(SEED_TEXT);
  const rng = createRng(seed);
  const world = new VoxelWorld(CHUNKS);
  const [sx, sy, sz] = world.size;
  const zone = (topic: number) => {
    const zn = ZONES.find((z) => z.topic === topic);
    if (!zn) throw new Error(`no zone for topic ${topic}`);
    return zn;
  };
  const [yard, garden, canteen, playground, art, courtyard, sports] = [1, 2, 3, 4, 5, 6, 7].map(zone) as [ReturnType<typeof zone>, ReturnType<typeof zone>, ReturnType<typeof zone>, ReturnType<typeof zone>, ReturnType<typeof zone>, ReturnType<typeof zone>, ReturnType<typeof zone>];
  const inZone = (x: number, z: number, pad = 0) => ZONES.find((zn) => Math.abs(x - zn.x) <= zn.hx + pad && Math.abs(z - zn.z) <= zn.hz + pad);
  const mb = MAIN_BUILDING;
  const inBuilding = (x: number, z: number, pad = 0) => x >= mb.x0 - 2 - pad && x <= mb.x1 + 2 + pad && z >= mb.zFront - 2 - pad && z <= mb.zBack + 3 + pad;
  for (let x = mb.x0 - 2; x <= mb.x1 + 2; x++) for (let z = mb.zFront - 2; z <= mb.zBack + 3; z++) if (inZone(x, z, 2)) throw new Error(`the main building would stand in a zone at ${x},${z}`);
  const inCampus = (x: number, z: number) => x > CAMPUS.x0 && x < CAMPUS.x1 && z > CAMPUS.z0 && z < CAMPUS.z1;
  const onStreet = (z: number) => z >= STREET.z0 - 1 && z <= STREET.z1 + 4;
  const inRiver = (x: number) => x >= RIVER.x0 && x <= RIVER.x1;

  // Paths: the gate to the building, through its hall to the courtyard, and on to every zone.
  const mid = Math.floor((mb.x0 + mb.x1) / 2);
  const routes: Point[][] = [
    [[mid, CAMPUS.z0], [mid, mb.zFront - 2]],
    [[mid, mb.zBack + 3], [courtyard.x, courtyard.z]],
    [[courtyard.x - 10, courtyard.z], [garden.x, garden.z - 18]],
    [[courtyard.x + 10, courtyard.z], [sports.x, sports.z - 18]],
    [[courtyard.x, courtyard.z], [art.x, art.z - 6]],
    [[yard.x + 18, yard.z], [canteen.x, canteen.z]],
    [[yard.x - 18, yard.z], [playground.x, playground.z]],
  ];
  const pathCells = new Set(routes.flatMap((r) => [...pathColumns(r, 1.6)]));
  const nearPath = (x: number, z: number) => routes.some((r) => distanceToPath(r, x, z) < 3);

  // 1. Terrain: level campus and street, gentle rolls outside, hills at the rim, the river bed.
  const heights: number[][] = [];
  for (let x = 0; x < sx; x++) {
    heights[x] = [];
    for (let z = 0; z < sz; z++) {
      let h = GROUND + fbm(seed, x / 26, z / 26) * 2.5;
      const edge = Math.min(x, z, sx - 1 - x, sz - 1 - z);
      if (edge < 10) h += (10 - edge) * 1.1;
      if (inCampus(x, z) || x === CAMPUS.x0 || x === CAMPUS.x1 || z === CAMPUS.z1 || onStreet(z) || Math.abs(x - RIVER.x0 + 2) < 2 || Math.abs(x - RIVER.x1 - 2) < 2) h = GROUND;
      if (inRiver(x) && z > STREET.z1 + 4) h = GROUND - 3;
      (heights[x] as number[])[z] = Math.round(Math.min(h, sy - 20));
    }
  }
  const surface = (x: number, z: number): number => heights[x]?.[z] ?? GROUND;
  for (let x = 0; x < sx; x++) {
    for (let z = 0; z < sz; z++) {
      const h = surface(x, z);
      const zn = inZone(x, z);
      const top = pathCells.has(`${x},${z}`) ? B.path : zn ? B[zn.floor] : inRiver(x) && h < GROUND ? B.riverbed : B.grass;
      for (let y = 0; y <= h; y++) world.set(x, y, z, y < h - 3 ? B.stone : y < h ? B.dirt : top);
      if (inRiver(x) && h < GROUND) for (let y = h + 1; y < GROUND; y++) world.set(x, y, z, B.water);
    }
  }

  // 2. The street, the sidewalk with lamps, the campus wall and gate.
  placeStreet(world, 0, sx - 1, STREET.z0, STREET.z1, GROUND, [GATE[0] - 1, GATE[1] + 1], palette);
  for (let x = 0; x < sx; x++) for (let z = STREET.z1 + 1; z <= STREET.z1 + 3; z++) world.set(x, GROUND, z, B.path);
  for (let x = 8; x < sx; x += 16) placeLamp(world, x, GROUND + 1, STREET.z1 + 3, palette);
  placeCampusWall(world, CAMPUS.x0, CAMPUS.x1, CAMPUS.z0, CAMPUS.z1, () => GROUND + 1, GATE, palette);

  // 3. The main building with its clock tower, furnished classrooms and staircase.
  const main = placeMainBuilding(world, mb, palette);

  // 4. The yard: flower beds along the walk, lamps, the flagpole with its red flag, the pitch.
  const flowers: Array<[number, number]> = [];
  for (const [x0, x1] of [[mid - 12, mid - 6], [mid + 6, mid + 12]] as const) {
    for (const z0 of [yard.z - 16, yard.z - 4, yard.z + 8]) flowers.push(...placeBed(world, x0, x1, z0, z0 + 4, GROUND + 1, palette));
  }
  for (let z = yard.z - 18; z <= yard.z + 18; z += 9) for (const x of [mid - 4, mid + 4]) placeLamp(world, x, GROUND + 1, z, palette);
  const flag = { x: yard.x - 14, z: yard.z + 15 };
  for (let y = GROUND + 1; y <= GROUND + 12; y++) world.set(flag.x, y, flag.z, B.birch);
  for (let dz = 1; dz <= 4; dz++) for (let y = GROUND + 9; y <= GROUND + 12; y++) world.set(flag.x, y, flag.z + dz, B.woodRed);
  const pitch = { x: yard.x - 19, z: yard.z - 6 };
  for (let dx = -5; dx <= 5; dx++) for (let dz = -10; dz <= 10; dz++) if (Math.abs(dx) === 5 || Math.abs(dz) === 10 || dz === 0) world.set(pitch.x + dx, GROUND, pitch.z + dz, B.snow);

  // 5. The other zones' buildings and equipment.
  placeHouse(world, canteen.x - 16, canteen.z + 8, 14, 10, 4, GROUND + 1, { wall: B.planks, roof: B.woodRed, trim: B.log });
  placeHouse(world, playground.x + 6, playground.z + 8, 13, 10, 4, GROUND + 1, { wall: B.sand, roof: B.roofBlue, trim: B.birch });
  for (const [x, z] of [[playground.x - 16, playground.z - 12], [playground.x - 16, playground.z - 4]] as const) placeSwings(world, x, z, GROUND + 1, palette);
  for (const [x, z] of [[playground.x - 6, playground.z - 16], [canteen.x - 4, canteen.z - 16], [courtyard.x - 16, courtyard.z + 6], [courtyard.x + 13, courtyard.z + 6]] as const) placeBench(world, x, z, GROUND + 1, palette);
  placeGreenhouse(world, garden.x - 17, garden.x + 1, garden.z + 12, garden.z + 26, GROUND + 1, palette);
  const crops: Array<[number, number]> = [];
  for (let i = 0; i < 6; i++) {
    const x0 = garden.x - 18 + (i % 3) * 13;
    const z0 = garden.z - 22 + Math.floor(i / 3) * 12;
    crops.push(...placeBed(world, x0, x0 + 9, z0, z0 + 4, GROUND + 1, palette));
  }
  placeCourt(world, sports.x - 17, sports.x + 17, sports.z - 26, sports.z - 2, GROUND, palette);
  placeSportsHall(world, sports.x - 15, sports.x + 17, sports.z + 6, sports.z + 28, GROUND + 1, palette);
  placeHouse(world, art.x - 12, art.z + 6, 24, 10, 5, GROUND + 1, { wall: B.brickGrey, roof: B.woodRed, trim: B.birch });

  // 6. Outside the wall: houses north and west, trees (some in pink blossom) wherever nothing stands.
  const houseKinds = [
    { wall: B.sand, roof: B.brickRed, trim: B.log },
    { wall: B.planks, roof: B.roofBlue, trim: B.birch },
    { wall: B.brickGrey, roof: B.woodRed, trim: B.log },
  ];
  const houses: Array<[number, number]> = [];
  for (let i = 0, x = 22; x < RIVER.x0 - 16; x += 30, i++) {
    for (const z of [160, 176]) {
      placeHouse(world, x + (z === 176 ? 12 : 0), z, 10, 8, 3, surface(x, z) + 1, houseKinds[(i + (z === 176 ? 1 : 0)) % 3] ?? { wall: B.sand, roof: B.brickRed, trim: B.log });
      houses.push([x + (z === 176 ? 12 : 0), z]);
    }
  }
  const nearHouse = (x: number, z: number) => houses.some(([hx, hz]) => x >= hx - 3 && x <= hx + 13 && z >= hz - 3 && z <= hz + 11);
  for (let gx = 4; gx < sx - 4; gx += 7) {
    for (let gz = 4; gz < sz - 4; gz += 7) {
      const x = Math.round(gx + (rng() - 0.5) * 5);
      const z = Math.round(gz + (rng() - 0.5) * 5);
      const wall = Math.abs(x - CAMPUS.x0) < 3 || Math.abs(x - CAMPUS.x1) < 3 || Math.abs(z - CAMPUS.z0) < 3 || Math.abs(z - CAMPUS.z1) < 3;
      if (x < 3 || z < 3 || x >= sx - 3 || z >= sz - 3 || inZone(x, z, 3) || nearPath(x, z) || inBuilding(x, z, 3) || onStreet(z) || inRiver(x) || Math.abs(x - RIVER.x0) < 3 || Math.abs(x - RIVER.x1) < 3 || wall || nearHouse(x, z)) continue;
      if (inCampus(x, z) && z < CAMPUS.z0 + 4) continue;
      if (rng() < 0.3) continue;
      const kind = rng();
      placeTree(world, x, surface(x, z) + 1, z, treeHeight(rng), { log: B.log, leaves: kind < 0.25 ? B.pink : kind < 0.4 ? B.autumn : B.leaves }, rng);
    }
  }

  // 7. Entities.
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
  const addPropAt = (model: string, at: readonly [number, number, number], yaw = 0): void => {
    props.push({ model, position: [at[0], at[1], at[2]], yaw, scale: scaleOf(model) });
  };
  for (const zn of ZONES) addProp(`${PACK.survival}/signpost.glb`, zn.x - zn.hx + 1, zn.z - zn.hz + 1, 45);
  const flowerModels = [`${PACK.nature}/flower_redA.glb`, `${PACK.nature}/flower_yellowB.glb`, `${PACK.nature}/flower_purpleA.glb`];
  flowers.forEach(([x, z], i) => addProp(flowerModels[i % 3] ?? '', x, z, i * 37));
  const cropModels = [`${PACK.nature}/crop_carrot.glb`, `${PACK.nature}/crop_pumpkin.glb`, `${PACK.nature}/crops_cornStageD.glb`];
  crops.forEach(([x, z], i) => {
    if (i % 2 === 0) addProp(cropModels[Math.floor(i / 16) % 3] ?? '', x, z, i * 53);
  });
  addPropAt(`${PACK.props}/clock-face.glb`, main.clock, 180);
  addPropAt(`${PACK.props}/school-bus.glb`, [mid + 28.5, GROUND + 1, (STREET.z0 + STREET.z1) / 2 + 2], 90);
  for (const side of [-1, 1]) addPropAt(`${PACK.castle}/metal-gate.glb`, [side < 0 ? GATE[0] - 0.5 : GATE[1] + 1.5, GROUND + 1, CAMPUS.z0 + 2.5], side < 0 ? 90 : 270);
  for (const shelf of main.shelves) addPropAt(`${PACK.props}/books.glb`, shelf);
  main.desks.forEach((desk, i) => addPropAt(i === 0 ? `${PACK.props}/globe.glb` : `${PACK.props}/abacus.glb`, desk));
  addPropAt(`${PACK.props}/potted-plant.glb`, main.plant);
  for (let i = 0; i < 3; i++) addProp(`${PACK.survival}/workbench.glb`, canteen.x - 10 + i * 6, canteen.z - 4, 0);
  for (const [x, z] of [[playground.x - 4, playground.z - 8], [playground.x + 4, playground.z - 14]] as const) addProp(`${PACK.props}/playground-slide.glb`, x, z, 200);
  addProp(`${PACK.props}/teddy-bear.glb`, playground.x + 10, playground.z + 4, 180);
  addProp(`${PACK.survival}/box-large.glb`, playground.x + 4, playground.z + 4, 20);
  for (let i = 0; i < 4; i++) {
    addProp(`${PACK.nature}/sign.glb`, art.x - 15 + i * 9, art.z - 8, 180);
    addProp(`${PACK.props}/artist-palette.glb`, art.x - 13 + i * 9, art.z - 6, 180);
  }
  for (const [x, z] of [[courtyard.x - 20, courtyard.z - 6], [courtyard.x + 20, courtyard.z - 6]] as const) addProp(`${PACK.props}/potted-plant.glb`, x, z, 0);
  for (const [x, z] of [[mid - 16, CAMPUS.z0 + 4], [mid + 16, CAMPUS.z0 + 4], [mid - 22, yard.z + 18], [mid + 22, yard.z + 18]] as const) addProp(`${PACK.nature}/plant_bush.glb`, x, z, 0);

  const animated = (model: string) => ({ model, scale: scaleOf(model), animation: MODEL_ANIMATION[model] ?? 'idle' });
  // Topic 1 characters (toan2-cd1-*): Sư Tử Vàng by the flagpole, Khỉ Lanh on the pitch.
  const interactables: WorldEntities['interactables'] = [
    { id: 'su-tu-vang', kind: 'npc', name: 'Sư Tử Vàng', label: 'Nói chuyện', position: place(flag.x + 3, flag.z - 2), yaw: 200, radius: 3, ...animated(`${PACK.pets}/animal-lion.glb`), chapter: 1 },
    { id: 'khi-lanh', kind: 'npc', name: 'Khỉ Lanh', label: 'Nói chuyện', position: place(pitch.x, pitch.z - 4), yaw: 90, radius: 3, ...animated(`${PACK.pets}/animal-monkey.glb`), chapter: 1 },
  ];

  // Every Toán topic's targets in its own zone; characters who come back in several topics live in any
  // zone. Placed from the catalogues on open floor, off the paths and clear of props, beds and buildings.
  const propCells = props.map((p) => [Math.floor(p.position[0] ?? 0), Math.floor(p.position[2] ?? 0)] as const);
  const canStand = (x: number, z: number): boolean => {
    if (pathCells.has(`${x},${z}`) || !inZone(x, z)) return false;
    const y = surface(x, z) + 1;
    if (y > GROUND + 2 || world.get(x, y, z) !== 0 || world.get(x, y + 1, z) !== 0) return false; // walls, beds, trees
    return !propCells.some(([px, pz]) => Math.hypot(px - x, pz - z) < 1.5);
  };
  const zoneCells = (topic: number) => {
    const zn = zone(topic);
    return cellsIn(zn.x - zn.hx + 1, zn.z - zn.hz + 1, zn.x + zn.hx - 1, zn.z + zn.hz - 1);
  };
  const spawnAt: [number, number] = [mid, CAMPUS.z0 + 3];
  const { placed: topicTargets, retagged } = await placeQuestTargets({
    uses: targetUses(await readQuests(), 'truong-hoc'),
    map: { canStand, stand: place, chapterCells: zoneCells, residentCells: ZONES.flatMap((zn) => zoneCells(zn.topic)), keepClear: [spawnAt, ...interactables.map((t) => [Math.floor(t.position[0] ?? 0), Math.floor(t.position[2] ?? 0)] as const)] },
    existing: interactables,
    seed: seed + 7,
  });
  const retaggedById = new Map(retagged.map((t) => [t.id, t]));
  interactables.splice(0, interactables.length, ...interactables.map((t) => retaggedById.get(t.id) ?? t), ...topicTargets);

  const showcase = main.classrooms[0];
  const entities: WorldEntities = {
    version: 2,
    id: MAP_ID,
    seed,
    size: [sx, sy, sz],
    waterLevel: GROUND - 1,
    spawn: { position: place(spawnAt[0], spawnAt[1]), yaw: 0 },
    interactables,
    props,
    landmarks: [
      ...ZONES.map((zn) => ({ id: zn.id, name: zn.name, position: [zn.x + 0.5, GROUND + 1, zn.z + 0.5] as [number, number, number] })),
      { id: 'cong-truong', name: 'Cổng trường', position: [mid + 0.5, GROUND + 1, CAMPUS.z0 + 0.5] },
      { id: 'cot-co', name: 'Cột cờ', position: [flag.x + 0.5, GROUND + 1, flag.z + 0.5] },
      { id: 'san-bong', name: 'Sân bóng', position: [pitch.x + 0.5, GROUND + 1, pitch.z + 0.5] },
      { id: 'lop-hoc', name: 'Lớp học', position: [((showcase?.x0 ?? mid) + (showcase?.x1 ?? mid)) / 2 + 0.5, showcase?.standY ?? GROUND + 2, ((showcase?.z0 ?? 0) + (showcase?.z1 ?? 0)) / 2 + 0.5] },
      { id: 'nha-da-nang', name: 'Nhà đa năng', position: [sports.x + 0.5, GROUND + 1, sports.z + 17.5] },
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
