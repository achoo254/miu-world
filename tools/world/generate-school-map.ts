// Generates "Trường học" (the Toán region) from a fixed seed, after the owner's campus mocks
// (designs/truong-hoc/, docs/design-truong-hoc.md): a street with a crosswalk and the school bus along the
// south edge, the campus wall with its gate and lamps, the entrance yard with flower beds, the flagpole and
// a pitch, the two-storey main building with its clock tower (a furnished classroom on each floor and the
// staircase between them), and around it one zone per Toán topic: the canteen, the playground by the toy
// workshop, the courtyard under the clock tower, the science garden with its greenhouse, the art yard, the
// sports hall with the basketball court. Houses and a river lie outside the wall. Quest characters stand in
// their topic's zone. Output: assets/generated/world/truong-hoc/{regions/, horizon.bin, entities.json}
import { VoxelWorld } from '../../packages/voxel/src/chunk-format';
import type { WorldEntities } from '../../packages/voxel/src/world-entities';
import { columnsOf, fillColumn, heightField, loadBlocks, MAP_CHUNKS, mapModels, PACK, placeRegionTargets, rollingHeight, runIfMain, scatterTrees, standHeight } from './map-kit';
import { createRng, hashSeed } from './noise';
import { distanceToPath, pathColumns, type Point } from './structures/path';
import { cellsIn } from './chapters/place-quest-targets';
import { placeHouse } from './structures/buildings';
import { placeBed, placeCampusWall, placeCourt, placeGreenhouse, placeMainBuilding, placeSportsHall, placeStreet, type FurnitureKind, type SchoolPalette } from './structures/school';

export const MAP_ID = 'truong-hoc';
export const SEED_TEXT = 'miu-truong-hoc';
const GROUND = 12;
/** Houses of the neighbourhood around the school (City Kit Suburban), each its own design. */
const HOUSES = 'abcdefghijklmnopqrstu'.split('').map((k) => `${PACK.suburb}/building-type-${k}.glb`);
/** Classroom furniture (Furniture Kit): the model of each kind. */
const FURNITURE: Record<FurnitureKind, string> = {
  desk: `${PACK.furniture}/desk.glb`,
  chair: `${PACK.furniture}/chairDesk.glb`,
  'teacher-desk': `${PACK.furniture}/tableCloth.glb`,
  'teacher-chair': `${PACK.furniture}/chair.glb`,
  bookcase: `${PACK.furniture}/bookcaseOpen.glb`,
  lamp: `${PACK.furniture}/lampSquareCeiling.glb`,
  plant: `${PACK.furniture}/pottedPlant.glb`,
  bin: `${PACK.furniture}/trashcan.glb`,
  globe: 'generated/props/globe.glb',
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
  [`${PACK.furniture}/desk.glb`]: 0.78,
  [`${PACK.furniture}/chairDesk.glb`]: 1.2,
  [`${PACK.furniture}/tableCloth.glb`]: 0.8,
  [`${PACK.furniture}/chair.glb`]: 1.0,
  [`${PACK.furniture}/bookcaseOpen.glb`]: 2.0,
  [`${PACK.furniture}/lampSquareCeiling.glb`]: 0.45,
  [`${PACK.furniture}/pottedPlant.glb`]: 1.3,
  [`${PACK.furniture}/trashcan.glb`]: 0.8,
  [`${PACK.roads}/light-curved.glb`]: 4.8,
  [`${PACK.roads}/light-square.glb`]: 3.6,
  [`${PACK.box}/swing-set.glb`]: 3.06,
  [`${PACK.box}/basketball-hoop.glb`]: 3.85,
  [`${PACK.box}/flagpole.glb`]: 9.2,
  [`${PACK.box}/park-bench.glb`]: 0.96,
  ...Object.fromEntries(HOUSES.map((m, i) => [m, 7 + (i % 3)])),
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
/**
 * The zone each chapter's places go in (by its topic number): chapter 1 is Toán topic 1 in the yard; the
 * Tiếng Việt weeks 5–7 (chapters 2–4) play behind the classrooms, in the garden and on the playground.
 */
const CHAPTER_ZONE: Readonly<Record<number, number>> = { 1: 1, 2: 6, 3: 2, 4: 4 };
/** Campus wall (inclusive) and the gate's opening on its south side. */
export const CAMPUS = { x0: 16, x1: 175, z0: 17, z1: 152 };
const GATE: readonly [number, number] = [91, 101];
const STREET = { z0: 3, z1: 12 };
const RIVER = { x0: 180, x1: 187 };
/** The main building: front gallery from zFront, body back wall at zBack (school.ts). */
export const MAIN_BUILDING = { x0: 52, x1: 140, zFront: 66, zBack: 79, floorY: GROUND + 1 } as const;

export async function generateSchool(): Promise<{ world: VoxelWorld; entities: WorldEntities }> {
  const id = await loadBlocks();
  const B = {
    grass: id('grass'), dirt: id('dirt'), stone: id('stone'), sand: id('sand'), log: id('log'), leaves: id('leaves'), planks: id('planks'), path: id('path'),
    autumn: id('leaves-autumn'), pink: id('leaves-pink'), birch: id('birch-log'), treeLog: id('tree-log'), brickRed: id('brick-red'), brickGrey: id('brick-grey'), woodRed: id('wood-red'),
    water: id('water'), riverbed: id('riverbed'), glass: id('glass'), roofBlue: id('roof-blue'), asphalt: id('asphalt'), board: id('board'), snow: id('snow'),
  };
  const palette: SchoolPalette = {
    wall: B.sand, trim: B.birch, roof: B.brickRed, floor: B.planks, glass: B.glass, board: B.board, light: B.snow, stone: B.brickGrey, brick: B.brickGrey,
    asphalt: B.asphalt, line: B.snow, court: B.woodRed, roofBlue: B.roofBlue, log: B.log, door: B.woodRed, grass: B.grass, dirt: B.dirt, sand: B.sand,
  };
  /** Props placed while the blocks go down, added once the ground is final: model, x, z, yaw (or a fixed y). */
  const queued: Array<{ model: string; x: number; z: number; yaw: number; y?: number }> = [];

  const seed = hashSeed(SEED_TEXT);
  const rng = createRng(seed);
  const world = new VoxelWorld(MAP_CHUNKS);
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
  const surface = heightField(world, (x, z) => {
    let h = rollingHeight(seed, x, z, world.size, { ground: GROUND, roll: 2.5, rim: 10 });
    // Behind the wall the neighbourhood stands on a bank three blocks up, level with the wall's top: seen
    // from the school, out of reach (the child climbs two blocks at most). South of the street the verge
    // stays low.
    if (!inCampus(x, z) && !onStreet(z) && z > STREET.z1) h = Math.max(h, GROUND + 3);
    if (z < STREET.z0) h = GROUND + 1;
    if (inCampus(x, z) || x === CAMPUS.x0 || x === CAMPUS.x1 || z === CAMPUS.z0 || z === CAMPUS.z1 || onStreet(z)) h = GROUND;
    if (inRiver(x) && z > STREET.z1 + 4) h = GROUND - 3;
    return Math.round(Math.min(h, sy - 20));
  }, GROUND);
  for (let x = 0; x < sx; x++) {
    for (let z = 0; z < sz; z++) {
      const h = surface(x, z);
      const zn = inZone(x, z);
      const top = pathCells.has(`${x},${z}`) ? B.path : zn ? B[zn.floor] : inRiver(x) && h < GROUND ? B.riverbed : B.grass;
      fillColumn(world, x, z, h, { stone: B.stone, under: B.dirt, top });
      if (inRiver(x) && h < GROUND) for (let y = h + 1; y < GROUND; y++) world.set(x, y, z, B.water);
    }
  }

  // 2. The street, the sidewalk with lamps, the campus wall and gate.
  placeStreet(world, 0, sx - 1, STREET.z0, STREET.z1, GROUND, [GATE[0] - 1, GATE[1] + 1], palette);
  for (let x = 0; x < sx; x++) for (let z = STREET.z1 + 1; z <= STREET.z1 + 3; z++) world.set(x, GROUND, z, B.path);
  for (let x = 8; x < sx; x += 16) queued.push({ model: `${PACK.roads}/light-curved.glb`, x, z: STREET.z1 + 2, yaw: 0 });
  placeCampusWall(world, CAMPUS.x0, CAMPUS.x1, CAMPUS.z0, CAMPUS.z1, () => GROUND + 1, GATE, palette);

  // 3. The main building with its clock tower, furnished classrooms and staircase.
  const main = placeMainBuilding(world, mb, palette);

  // 4. The yard: flower beds along the walk, lamps, the flagpole with its red flag, the pitch.
  const flowers: Array<[number, number]> = [];
  for (const [x0, x1] of [[mid - 12, mid - 6], [mid + 6, mid + 12]] as const) {
    for (const z0 of [yard.z - 16, yard.z - 4, yard.z + 8]) flowers.push(...placeBed(world, x0, x1, z0, z0 + 4, GROUND + 1, palette));
  }
  for (let z = yard.z - 18; z <= yard.z + 18; z += 9) for (const [x, yaw] of [[mid - 4, 270], [mid + 4, 90]] as const) queued.push({ model: `${PACK.roads}/light-square.glb`, x, z, yaw });
  const flag = { x: yard.x - 14, z: yard.z + 15 };
  queued.push({ model: `${PACK.box}/flagpole.glb`, x: flag.x, z: flag.z, yaw: 270 });
  const pitch = { x: yard.x - 19, z: yard.z - 6 };
  for (let dx = -5; dx <= 5; dx++) for (let dz = -10; dz <= 10; dz++) if (Math.abs(dx) === 5 || Math.abs(dz) === 10 || dz === 0) world.set(pitch.x + dx, GROUND, pitch.z + dz, B.snow);

  // 5. The other zones' buildings and equipment.
  placeHouse(world, canteen.x - 16, canteen.z + 8, 14, 10, 4, GROUND + 1, { wall: B.planks, roof: B.woodRed, trim: B.log });
  placeHouse(world, playground.x + 6, playground.z + 8, 13, 10, 4, GROUND + 1, { wall: B.sand, roof: B.roofBlue, trim: B.birch });
  for (const [x, z] of [[playground.x - 14, playground.z - 12], [playground.x - 14, playground.z - 4]] as const) queued.push({ model: `${PACK.box}/swing-set.glb`, x, z, yaw: 0 });
  for (const [x, z] of [[playground.x - 6, playground.z - 16], [canteen.x - 4, canteen.z - 16], [courtyard.x - 16, courtyard.z + 6], [courtyard.x + 13, courtyard.z + 6], [mid - 9, yard.z + 17], [mid + 9, yard.z + 17]] as const) queued.push({ model: `${PACK.box}/park-bench.glb`, x, z, yaw: 180 });
  placeGreenhouse(world, garden.x - 17, garden.x + 1, garden.z + 12, garden.z + 26, GROUND + 1, palette);
  const crops: Array<[number, number]> = [];
  for (let i = 0; i < 6; i++) {
    const x0 = garden.x - 18 + (i % 3) * 13;
    const z0 = garden.z - 22 + Math.floor(i / 3) * 12;
    crops.push(...placeBed(world, x0, x0 + 9, z0, z0 + 4, GROUND + 1, palette));
  }
  for (const hoop of placeCourt(world, sports.x - 17, sports.x + 17, sports.z - 26, sports.z - 2, GROUND, palette)) queued.push({ model: `${PACK.box}/basketball-hoop.glb`, x: hoop.at[0] - 0.5, z: hoop.at[2] - 0.5, yaw: hoop.yaw });
  placeSportsHall(world, sports.x - 15, sports.x + 17, sports.z + 6, sports.z + 28, GROUND + 1, palette);
  placeHouse(world, art.x - 12, art.z + 6, 24, 10, 5, GROUND + 1, { wall: B.brickGrey, roof: B.woodRed, trim: B.birch });

  // 6. Outside the wall: the neighbourhood's houses on their bank, facing the school; trees (some in pink
  // blossom) wherever nothing stands.
  const houses: Array<[number, number]> = [];
  let houseKind = 0;
  const addHouse = (x: number, z: number, yaw: number): void => {
    houses.push([x, z]);
    queued.push({ model: HOUSES[houseKind++ % HOUSES.length] ?? '', x, z, yaw });
  };
  for (let x = 24; x < RIVER.x0 - 8; x += 16) addHouse(x, CAMPUS.z1 + 12, 180);
  for (let x = 32; x < RIVER.x0 - 8; x += 20) addHouse(x, CAMPUS.z1 + 30, 180);
  for (let z = CAMPUS.z0 + 16; z < CAMPUS.z1; z += 18) addHouse(7, z, 90);
  const nearHouse = (x: number, z: number) => houses.some(([hx, hz]) => Math.abs(x - hx) < 8 && Math.abs(z - hz) < 8);
  scatterTrees({
    world,
    rng,
    surface,
    rejects: (x, z) => {
      const wall = Math.abs(x - CAMPUS.x0) < 3 || Math.abs(x - CAMPUS.x1) < 3 || Math.abs(z - CAMPUS.z0) < 3 || Math.abs(z - CAMPUS.z1) < 3;
      if (inZone(x, z, 3) || nearPath(x, z) || inBuilding(x, z, 3) || onStreet(z) || inRiver(x) || Math.abs(x - RIVER.x0) < 3 || Math.abs(x - RIVER.x1) < 3 || wall || nearHouse(x, z)) return true;
      return inCampus(x, z) && z < CAMPUS.z0 + 4;
    },
    skip: 0.3,
    blocks: (kind) => ({ log: B.treeLog, leaves: kind < 0.25 ? B.pink : kind < 0.4 ? B.autumn : B.leaves }),
  });

  // 7. Entities.
  const { props, place, addProp, addPropAt, addCentred, animated } = await mapModels({
    heights: MODEL_HEIGHT,
    clips: MODEL_ANIMATION,
    standY: standHeight(world, surface),
    // Pack models whose pivot is a corner stand by their middle (furniture, houses).
    centred: [...Object.values(FURNITURE).filter((m) => m.startsWith('packs/')), ...HOUSES],
  });
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
  for (const piece of main.furniture) addCentred(FURNITURE[piece.kind], piece.at, piece.yaw);
  for (const piece of main.furniture.filter((f) => f.kind === 'bookcase')) addPropAt(`${PACK.props}/books.glb`, [piece.at[0], piece.at[1] + 2, piece.at[2]]);
  addPropAt(`${PACK.props}/potted-plant.glb`, main.plant);
  for (const q of queued) {
    if (q.model.startsWith(PACK.suburb)) addCentred(q.model, place(q.x, q.z), q.yaw);
    else addProp(q.model, q.x, q.z, q.yaw);
  }
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

  // Topic 1 characters (toan2-cd1-*): Sư Tử Vàng by the flagpole, Khỉ Lanh on the pitch.
  const interactables: WorldEntities['interactables'] = [
    { id: 'su-tu-vang', kind: 'npc', name: 'Sư Tử Vàng', label: 'Nói chuyện', position: place(flag.x + 3, flag.z - 2), yaw: 200, radius: 3, ...animated(`${PACK.pets}/animal-lion.glb`), chapter: 1 },
    { id: 'khi-lanh', kind: 'npc', name: 'Khỉ Lanh', label: 'Nói chuyện', position: place(pitch.x, pitch.z - 4), yaw: 90, radius: 3, ...animated(`${PACK.pets}/animal-monkey.glb`), chapter: 1 },
  ];

  // Every Toán topic's targets in its own zone; characters who come back in several topics live in any
  // zone. Placed from the catalogues on open floor, off the paths and clear of props, beds and buildings.
  const propCells = columnsOf(props);
  const canStand = (x: number, z: number): boolean => {
    if (pathCells.has(`${x},${z}`) || !inZone(x, z)) return false;
    const y = surface(x, z) + 1;
    if (y > GROUND + 2 || world.get(x, y, z) !== 0 || world.get(x, y + 1, z) !== 0) return false; // walls, beds, trees
    return !propCells.some(([px, pz]) => Math.hypot(px - x, pz - z) < 1.5);
  };
  const zoneCells = (chapter: number) => {
    const zn = zone(CHAPTER_ZONE[chapter] ?? chapter);
    return cellsIn(zn.x - zn.hx + 1, zn.z - zn.hz + 1, zn.x + zn.hx - 1, zn.z + zn.hz - 1);
  };
  const spawnAt: [number, number] = [mid, CAMPUS.z0 + 3];
  const allInteractables = await placeRegionTargets({
    mapId: MAP_ID,
    region: 'truong-hoc',
    map: { canStand, stand: place, chapterCells: zoneCells, residentCells: Object.keys(CHAPTER_ZONE).flatMap((chapter) => zoneCells(Number(chapter))), keepClear: [spawnAt, ...columnsOf(interactables)] },
    interactables,
    seed: seed + 7,
  });

  const showcase = main.classrooms[0];
  const entities: WorldEntities = {
    version: 2,
    id: MAP_ID,
    seed,
    size: [sx, sy, sz],
    waterLevel: GROUND - 1,
    spawn: { position: place(spawnAt[0], spawnAt[1]), yaw: 0 },
    interactables: allInteractables,
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

await runIfMain(import.meta.url, generateSchool);
