// Generates "Trường học", the hub of the world, 800 x 800 blocks from a fixed seed, after the owner's mocks
// (designs/the-gioi/a-01- and b-01-toan-canh-khu-vuc-256.png: the school in the middle, the village, the
// forest, the lake, the market and the farm round it; designs/truong-hoc/ for the campus itself). In the
// middle, the campus exactly as the approved mock (docs/design-truong-hoc.md): the main street with its
// crosswalk and the school bus, the wall and gate, the yard with its flower beds, flagpole and pitch, the
// two-storey main building with the clock tower (a furnished classroom on each floor and the stairs between),
// the canteen, the playground by the toy workshop, the courtyard, the science garden with its greenhouse,
// the art yard, the sports hall with its court. Round it, small districts of the town with a gate each into
// its own map: the village and its paddies (west), the hamlet (north-west), the library and the castle on
// its hill (north), the forest with its waterfall cliff (north-east), the lake with the harbour and the
// lighthouse (east), the market and the farm with its windmill (south). The school's four chapters are
// zones of the campus. Output: assets/generated/world/truong-hoc/{regions/, horizon.bin, entities.json}
import { PACK, runIfMain } from './map-kit';
import { bambooHedge, cottageRow, fieldPlot, flowerBed, hamlet, jetty, lampRow } from './scenery';
import { placeHouse } from './structures/buildings';
import { placeFountain, placeLighthouse, placeStall, placeWindmill } from './structures/countryside';
import type { Point } from './structures/path';
import { placeBed, placeCampusWall, placeCourt, placeGreenhouse, placeMainBuilding, placeSportsHall, placeStreet, type FurnitureKind, type SchoolPalette } from './structures/school';
import { placeTree, treeHeight } from './structures/tree';
import { animal, crowd, person } from './village-life';
import { generateZoneMap, type Zone } from './zone-map';

export const MAP_ID = 'truong-hoc';
const SIZE = 800;
const GROUND = 12;
const WATER_LEVEL = 10;
/** Where the approved 192-block campus layout sits in the 800-block hub (its old origin). */
export const HUB_OFFSET = { x: 304, z: 300 } as const;
const O = HUB_OFFSET;

/** The campus's areas (the mock's zones), in hub coordinates; `chapter` for the four the lessons play in. */
export const CAMPUS_AREAS: ReadonlyArray<{ id: string; name: string; x: number; z: number; hx: number; hz: number; floor: string; chapter?: number }> = [
  { id: 'san-truong', name: 'Sân trường', x: O.x + 96, z: O.z + 41, hx: 26, hz: 20, floor: 'path', chapter: 1 },
  { id: 'thap-dong-ho', name: 'Sân sau dãy lớp', x: O.x + 96, z: O.z + 96, hx: 24, hz: 10, floor: 'stone', chapter: 2 },
  { id: 'vuon-truong', name: 'Vườn trường', x: O.x + 43, z: O.z + 116, hx: 21, hz: 30, floor: 'grass', chapter: 3 },
  { id: 'xuong-do-choi', name: 'Sân chơi', x: O.x + 42, z: O.z + 41, hx: 20, hz: 20, floor: 'sand', chapter: 4 },
  { id: 'cang-tin', name: 'Căng tin', x: O.x + 150, z: O.z + 41, hx: 20, hz: 20, floor: 'planks' },
  { id: 'phong-mi-thuat', name: 'Phòng mĩ thuật', x: O.x + 96, z: O.z + 129, hx: 24, hz: 17, floor: 'sand' },
  { id: 'hoi-truong', name: 'Hội trường', x: O.x + 149, z: O.z + 116, hx: 21, hz: 30, floor: 'planks' },
];
const area = (id: string) => {
  const found = CAMPUS_AREAS.find((a) => a.id === id);
  if (!found) throw new Error(`no campus area ${id}`);
  return found;
};
export const ZONES: readonly Zone[] = CAMPUS_AREAS.flatMap((a) => (a.chapter ? [{ chapter: a.chapter, id: a.id, name: a.name, x: a.x, z: a.z, hx: a.hx, hz: a.hz, floor: a.floor }] : []));

/** Campus wall (inclusive) and the gate's opening on its south side; the main street in front. */
export const CAMPUS = { x0: O.x + 16, x1: O.x + 175, z0: O.z + 17, z1: O.z + 152 };
const GATE: readonly [number, number] = [O.x + 91, O.x + 101];
const STREET = { z0: O.z + 3, z1: O.z + 12 };
/** The main building: front gallery from zFront, body back wall at zBack (school.ts). */
export const MAIN_BUILDING = { x0: O.x + 52, x1: O.x + 140, zFront: O.z + 66, zBack: O.z + 79, floorY: GROUND + 1 } as const;
const MID = Math.floor((MAIN_BUILDING.x0 + MAIN_BUILDING.x1) / 2);

/** The lake east of the town with the harbour, the stream from it along the campus's east side. */
const LAKE = { x: 690, z: 400, rx: 80, rz: 110 };
const STREAM_X = O.x + 184;
/** Districts of the town round the campus, each with the gate to its own map. */
const DISTRICT = {
  village: { x: 170, z: 380 },
  hamlet: { x: 170, z: 650 },
  library: { x: 400, z: 580 },
  castle: { x: 400, z: 720 },
  forest: { x: 650, z: 660 },
  harbour: { x: 610, z: 400 },
  market: { x: 400, z: 180 },
  farm: { x: 640, z: 150 },
} as const;
const CASTLE_HILL = { x: DISTRICT.castle.x, z: DISTRICT.castle.z + 20, r: 60, rise: 7 };
const MOUNTAIN = { x: 40, z: 790, r: 170, rise: 22 };
const CLIFF = { x: 720, z: 740, r: 70, rise: 14 };

const ROUTES: Point[][] = [
  // Inside the campus: gate to the building, through its hall to the courtyard, on to every area.
  [[MID, CAMPUS.z0], [MID, MAIN_BUILDING.zFront - 2]],
  [[MID, MAIN_BUILDING.zBack + 3], [area('thap-dong-ho').x, area('thap-dong-ho').z]],
  [[area('thap-dong-ho').x - 10, area('thap-dong-ho').z], [area('vuon-truong').x, area('vuon-truong').z - 18]],
  [[area('thap-dong-ho').x + 10, area('thap-dong-ho').z], [area('hoi-truong').x, area('hoi-truong').z - 18]],
  [[area('thap-dong-ho').x, area('thap-dong-ho').z], [area('phong-mi-thuat').x, area('phong-mi-thuat').z - 6]],
  [[area('san-truong').x + 18, area('san-truong').z], [area('cang-tin').x, area('cang-tin').z]],
  [[area('san-truong').x - 18, area('san-truong').z], [area('xuong-do-choi').x, area('xuong-do-choi').z]],
  // The town: the main street east-west in front of the school, the avenues round the campus, the ways to
  // every district's gate.
  [[14, STREET.z1 + 2], [786, STREET.z1 + 2]],
  [[DISTRICT.market.x, 20], [DISTRICT.market.x, STREET.z0]],
  [[CAMPUS.x0 - 12, STREET.z1 + 2], [CAMPUS.x0 - 12, 640]],
  [[CAMPUS.x1 + 18, STREET.z1 + 2], [CAMPUS.x1 + 18, 560]],
  [[CAMPUS.x0 - 12, 520], [CAMPUS.x1 + 18, 520]],
  [[DISTRICT.library.x, 520], [DISTRICT.castle.x, DISTRICT.castle.z - 30]],
  [[CAMPUS.x0 - 12, 380], [DISTRICT.village.x, DISTRICT.village.z]],
  [[CAMPUS.x0 - 12, 640], [DISTRICT.hamlet.x, DISTRICT.hamlet.z]],
  [[CAMPUS.x1 + 18, 560], [DISTRICT.forest.x, DISTRICT.forest.z]],
  [[CAMPUS.x1 + 18, 400], [DISTRICT.harbour.x, DISTRICT.harbour.z]],
  [[DISTRICT.market.x + 60, STREET.z0], [DISTRICT.farm.x, DISTRICT.farm.z]],
];

/** Gates into the theme maps, one per district (near its centre, on its road). */
const GATES: ReadonlyArray<{ to: string; at: readonly [number, number] }> = [
  { to: 'lang-ven-song', at: [DISTRICT.village.x + 6, DISTRICT.village.z + 6] },
  { to: 'xom-mai-am', at: [DISTRICT.hamlet.x + 6, DISTRICT.hamlet.z + 6] },
  { to: 'thu-vien', at: [DISTRICT.library.x + 6, DISTRICT.library.z - 20] },
  { to: 'lau-dai', at: [DISTRICT.castle.x + 6, DISTRICT.castle.z - 26] },
  { to: 'khu-rung-bi-mat', at: [DISTRICT.forest.x + 6, DISTRICT.forest.z + 6] },
  { to: 'cho-phien', at: [DISTRICT.market.x + 6, DISTRICT.market.z + 10] },
  { to: 'nong-trai', at: [DISTRICT.farm.x + 6, DISTRICT.farm.z + 6] },
];

/** The district each gate stands in, as the bus names it. */
const DISTRICT_NAMES: Record<string, string> = {
  'lang-ven-song': 'làng ven sông',
  'xom-mai-am': 'xóm mái ấm',
  'thu-vien': 'thư viện',
  'lau-dai': 'lâu đài',
  'khu-rung-bi-mat': 'bìa rừng',
  'cho-phien': 'chợ phiên',
  'nong-trai': 'nông trại',
};

const N = PACK.nature;
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
  [`${PACK.survival}/workbench.glb`]: 0.9,
  [`${PACK.survival}/box-large.glb`]: 0.9,
  [`${N}/plant_bush.glb`]: 1.0,
  [`${N}/crop_carrot.glb`]: 0.5,
  [`${N}/crop_pumpkin.glb`]: 0.6,
  [`${N}/crops_cornStageD.glb`]: 1.4,
  [`${N}/crops_wheatStageB.glb`]: 1,
  [`${N}/sign.glb`]: 1.4,
  [`${N}/statue_column.glb`]: 3,
  [`${N}/lily_large.glb`]: 0.1,
  [`${PACK.castle}/metal-gate.glb`]: 4,
  [`${PACK.castle}/flag-banner-long.glb`]: 3,
  [`${PACK.props}/clock-face.glb`]: 3.4,
  [`${PACK.props}/school-bus.glb`]: 3.2,
  [`${PACK.props}/playground-slide.glb`]: 2.6,
  [`${PACK.props}/potted-plant.glb`]: 1.0,
  [`${PACK.props}/books.glb`]: 0.6,
  [`${PACK.props}/globe.glb`]: 0.7,
  [`${PACK.props}/teddy-bear.glb`]: 0.8,
  [`${PACK.props}/artist-palette.glb`]: 0.9,
  [`${PACK.props}/automobile.glb`]: 1.6,
  [`${PACK.furniture}/desk.glb`]: 0.78,
  [`${PACK.furniture}/chairDesk.glb`]: 1.2,
  [`${PACK.furniture}/tableCloth.glb`]: 0.8,
  [`${PACK.furniture}/chair.glb`]: 1.0,
  [`${PACK.furniture}/bookcaseOpen.glb`]: 2.0,
  [`${PACK.furniture}/lampSquareCeiling.glb`]: 0.45,
  [`${PACK.furniture}/pottedPlant.glb`]: 1.3,
  [`${PACK.furniture}/trashcan.glb`]: 0.8,
  [`${PACK.roads}/light-square.glb`]: 3.6,
  [`${PACK.box}/swing-set.glb`]: 3.06,
  [`${PACK.box}/basketball-hoop.glb`]: 3.85,
  [`${PACK.box}/flagpole.glb`]: 9.2,
  [`${PACK.food}/apple.glb`]: 0.45,
  [`${PACK.food}/cabbage.glb`]: 0.45,
  [`${PACK.food}/pumpkin.glb`]: 0.45,
  [`${PACK.food}/banana.glb`]: 0.45,
  ...Object.fromEntries(HOUSES.map((m, i) => [m, 7 + (i % 3)])),
};
/** What the town's people hold at their work. */
const HELD = {
  book: `${PACK.props}/open-book.glb`,
  basket: `${PACK.props}/basket.glb`,
  bucket: `${PACK.survival}/bucket.glb`,
  crate: `${PACK.survival}/box.glb`,
  shovel: `${PACK.survival}/tool-shovel.glb`,
  hoe: `${PACK.survival}/tool-hoe.glb`,
  apple: `${PACK.food}/apple.glb`,
  paddle: `${N}/canoe_paddle.glb`,
  flute: `${PACK.props}/flute.glb`,
};

const hill = (h: { x: number; z: number; r: number; rise: number }, x: number, z: number): number => {
  const d = Math.hypot(x - h.x, z - h.z) / h.r;
  return d >= 1 ? 0 : h.rise * (1 - d * d);
};
const inCampus = (x: number, z: number): boolean => x >= CAMPUS.x0 && x <= CAMPUS.x1 && z >= CAMPUS.z0 && z <= CAMPUS.z1;
const inWater = (x: number, z: number): boolean =>
  ((x - LAKE.x) / LAKE.rx) ** 2 + ((z - LAKE.z) / LAKE.rz) ** 2 < 1 ||
  (Math.abs(x - STREAM_X) < 4 && z > STREET.z1 + 6 && z < CAMPUS.z1 + 40) ||
  (z > CAMPUS.z1 + 36 && z < CAMPUS.z1 + 44 && x > STREAM_X - 4 && x < LAKE.x);

export async function generateSchool() {
  return generateZoneMap({
    mapId: MAP_ID,
    region: 'truong-hoc',
    seedText: 'miu-truong-hoc',
    outland: 'school',
    size: SIZE,
    ground: { ground: GROUND, roll: 2.5 },
    zones: ZONES,
    spawn: { x: MID, z: CAMPUS.z0 + 3, yaw: 0 },
    water: { level: WATER_LEVEL, covers: inWater },
    // The campus and the street are level; the castle on its hill, the mountain and the waterfall cliff rise.
    shape: (x, z, h) => {
      if (inCampus(x, z) || (z >= STREET.z0 - 1 && z <= STREET.z1 + 4)) return GROUND;
      return h + hill(CASTLE_HILL, x, z) + hill(MOUNTAIN, x, z) + hill(CLIFF, x, z);
    },
    pathsFromSpawn: false,
    routes: ROUTES,
    gates: GATES,
    // The town bus: from the school gate to every district's gate, and from each district back to school.
    rides: {
      stops: [
        ...GATES.map((g, i) => ({ name: `Xe buýt tới ${DISTRICT_NAMES[g.to] ?? g.to}`, at: [MID - 30 - (i % 4) * 5, STREET.z1 + 2 + Math.floor(i / 4) * 4] as const, to: g.at })),
        ...GATES.map((g) => ({ name: 'Xe buýt về trường', at: [g.at[0] - 6, g.at[1] + 4] as const, to: [MID, CAMPUS.z0 - 4] as const })),
      ],
    },
    trees: { skip: 0.5, blocks: (roll, block) => ({ log: block('tree-log'), leaves: block(roll < 0.25 ? 'leaves-pink' : roll < 0.38 ? 'leaves-autumn' : 'leaves') }) },
    models: { heights: MODEL_HEIGHT, centred: [...Object.values(FURNITURE).filter((m) => m.startsWith('packs/')), ...HOUSES] },
    dressing: { models: [`${N}/flower_redA.glb`, `${N}/flower_yellowB.glb`, `${N}/plant_bush.glb`, `${PACK.props}/potted-plant.glb`], spacing: 9 },
    life: ({ landmark }) => [
      // The school: the guard at the gate, the sweeper in the yard, teachers, pupils at play.
      ...crowd('school-guard', ['Bác bảo vệ'], [person('d')], [MID + 8, CAMPUS.z0 + 6], 2, 1),
      ...crowd('sweeper', ['Cô lao công', 'Chú lao công'], [person('e'), person('j')], landmark('cot-co'), 10, 2, [HELD.shovel, HELD.basket]),
      ...crowd('teacher', ['Thầy giáo', 'Cô giáo'], [person('a'), person('i')], [MID, MAIN_BUILDING.zFront - 6], 8, 3, [HELD.book]),
      ...crowd('pupil', ['Bạn cùng trường'], [person('f'), person('n'), person('o'), person('p'), person('q'), person('r')], landmark('san-bong'), 10, 8, [HELD.book]),
      ...crowd('pupil', ['Bạn ở sân chơi'], [person('f'), person('o'), person('q')], [area('xuong-do-choi').x, area('xuong-do-choi').z], 14, 5, [HELD.book]),
      ...crowd('home-cook', ['Cô nấu bếp'], [person('l')], [area('cang-tin').x, area('cang-tin').z], 8, 2, [HELD.basket]),
      ...crowd('reader', ['Bạn đọc sách'], [person('n'), person('p')], [area('phong-mi-thuat').x, area('phong-mi-thuat').z], 10, 3, [HELD.book]),
      ...crowd('waterer', ['Thầy làm vườn'], [person('m')], [area('vuon-truong').x, area('vuon-truong').z + 20], 6, 1, [HELD.bucket]),
      // The town: market, farm, village, hamlet, harbour, the library and the castle on its hill.
      ...crowd('vendor', ['Bác bán rau', 'Cô bán hoa', 'Chú bán quả'], [person('b'), person('h'), person('k')], [DISTRICT.market.x, DISTRICT.market.z], 22, 6, [HELD.apple, HELD.basket]),
      ...crowd('shopper', ['Cô đi chợ', 'Bác đi chợ'], [person('c'), person('g'), person('l')], [DISTRICT.market.x, DISTRICT.market.z], 34, 6, [HELD.basket]),
      ...crowd('porter', ['Chú khuân hàng'], [person('j')], [DISTRICT.market.x + 30, DISTRICT.market.z - 20], 8, 2, [HELD.crate]),
      ...crowd('ploughman', ['Chú nông dân'], [person('m'), person('a')], [DISTRICT.farm.x, DISTRICT.farm.z], 30, 3, [HELD.hoe, HELD.apple]),
      ...crowd('milker', ['Cô vắt sữa'], [person('e')], [DISTRICT.farm.x - 40, DISTRICT.farm.z + 30], 6, 1, [HELD.bucket, HELD.bucket]),
      ...crowd('cow', ['Bò sữa'], [animal('cow')], [DISTRICT.farm.x - 40, DISTRICT.farm.z + 30], 16, 6),
      ...crowd('pig', ['Lợn con'], [animal('pig')], [DISTRICT.farm.x + 30, DISTRICT.farm.z + 40], 10, 4),
      ...crowd('chick', ['Gà con'], [animal('chick')], [DISTRICT.farm.x + 40, DISTRICT.farm.z - 20], 6, 10),
      ...crowd('rice-planter', ['Cô cấy lúa'], [person('h'), person('i')], [DISTRICT.village.x - 40, DISTRICT.village.z + 110], 26, 4, [HELD.basket]),
      ...crowd('laundry', ['Mẹ phơi đồ'], [person('l'), person('e')], [DISTRICT.village.x, DISTRICT.village.z - 40], 20, 3, [HELD.basket]),
      ...crowd('home-cook', ['Bà nấu cơm'], [person('i')], [DISTRICT.hamlet.x, DISTRICT.hamlet.z - 30], 20, 3, [HELD.basket]),
      ...crowd('waterer', ['Ông tưới cây'], [person('a')], [DISTRICT.hamlet.x + 40, DISTRICT.hamlet.z + 20], 14, 2, [HELD.bucket]),
      ...crowd('kite-flyer', ['Bạn thả diều'], [person('f'), person('o'), person('q')], [DISTRICT.hamlet.x + 60, DISTRICT.hamlet.z - 60], 20, 4, [`${PACK.props}/kite.glb`]),
      ...crowd('ferryman', ['Bác ngư dân', 'Chú chèo thuyền'], [person('m'), person('k')], landmark('ben-tau'), 12, 4, [HELD.paddle]),
      ...crowd('librarian', ['Cô thủ thư'], [person('i')], [DISTRICT.library.x, DISTRICT.library.z + 14], 6, 1, [HELD.book]),
      ...crowd('reader', ['Bạn mượn sách'], [person('n'), person('f')], [DISTRICT.library.x, DISTRICT.library.z - 10], 12, 3, [HELD.book]),
      ...crowd('sentry', ['Chú lính gác'], [person('d'), person('g')], [DISTRICT.castle.x, DISTRICT.castle.z - 10], 12, 2, [`${PACK.survival}/tool-axe.glb`]),
      ...crowd('trumpeter', ['Chú thổi kèn'], [person('c')], [DISTRICT.castle.x + 14, DISTRICT.castle.z - 14], 3, 1, [HELD.flute]),
      ...crowd('dog', ['Cún nhà bên', 'Chó Vàng'], [animal('dog')], [DISTRICT.village.x, DISTRICT.village.z], 30, 5),
      ...crowd('cat', ['Mèo mướp'], [animal('cat')], [DISTRICT.hamlet.x, DISTRICT.hamlet.z], 30, 4),
      ...crowd('chick', ['Gà nhà bác bảo vệ'], [animal('chick')], [DISTRICT.village.x + 20, DISTRICT.village.z - 20], 7, 6),
    ],
    build: (ctx) => {
      const { world, block, rng, ground } = ctx;
      const B = {
        sand: block('sand'), path: block('path'), planks: block('planks'), snow: block('snow'), pink: block('leaves-pink'), leaves: block('leaves'), treeLog: block('tree-log'),
      };
      const palette: SchoolPalette = {
        wall: block('sand'), trim: block('birch-log'), roof: block('brick-red'), floor: block('planks'), glass: block('glass'), board: block('board'), light: block('snow'),
        stone: block('brick-grey'), brick: block('brick-grey'), asphalt: block('asphalt'), line: block('snow'), court: block('wood-red'), roofBlue: block('roof-blue'),
        log: block('log'), door: block('wood-red'), grass: block('grass'), dirt: block('dirt'), sand: block('sand'),
      };
      const yard = area('san-truong');
      const garden = area('vuon-truong');
      const canteen = area('cang-tin');
      const playground = area('xuong-do-choi');
      const art = area('phong-mi-thuat');
      const courtyard = area('thap-dong-ho');
      const sports = area('hoi-truong');
      const mb = MAIN_BUILDING;

      // The campus floors of the areas the lessons do not play in (the four zones floor themselves).
      for (const a of CAMPUS_AREAS.filter((c) => !c.chapter)) {
        for (let x = a.x - a.hx; x <= a.x + a.hx; x++) for (let z = a.z - a.hz; z <= a.z + a.hz; z++) if (!ctx.onPath(x, z)) world.set(x, ground, z, block(a.floor));
        ctx.landmark(a.id, a.name, a.x, a.z);
      }

      // 1. The street, the sidewalk with lamps, the campus wall and gate.
      placeStreet(world, 12, SIZE - 13, STREET.z0, STREET.z1, ground, [GATE[0] - 1, GATE[1] + 1], palette);
      for (let x = 12; x < SIZE - 12; x++) for (let z = STREET.z1 + 1; z <= STREET.z1 + 3; z++) if (!ctx.inWater(x, z)) world.set(x, ground, z, B.path);
      lampRow(ctx, [[14, STREET.z1 + 2], [786, STREET.z1 + 2]], 16);
      placeCampusWall(world, CAMPUS.x0, CAMPUS.x1, CAMPUS.z0, CAMPUS.z1, () => ground + 1, GATE, palette);
      ctx.keepOut(CAMPUS.x0, CAMPUS.z0, CAMPUS.x1, CAMPUS.z0 + 1);
      ctx.keepOut(CAMPUS.x0, CAMPUS.z1 - 1, CAMPUS.x1, CAMPUS.z1);
      ctx.keepOut(CAMPUS.x0, CAMPUS.z0, CAMPUS.x0 + 1, CAMPUS.z1);
      ctx.keepOut(CAMPUS.x1 - 1, CAMPUS.z0, CAMPUS.x1, CAMPUS.z1);
      ctx.landmark('cong-truong', 'Cổng trường', MID, CAMPUS.z0);

      // 2. The main building with its clock tower, furnished classrooms and staircase.
      const main = placeMainBuilding(world, mb, palette);
      ctx.keepOut(mb.x0 - 2, mb.zFront - 2, mb.x1 + 2, mb.zBack + 3);
      for (const piece of main.furniture) ctx.centredAt(FURNITURE[piece.kind], piece.at, piece.yaw);
      for (const piece of main.furniture.filter((f) => f.kind === 'bookcase')) ctx.propAt(`${PACK.props}/books.glb`, [piece.at[0], piece.at[1] + 2, piece.at[2]]);
      ctx.propAt(`${PACK.props}/potted-plant.glb`, main.plant);
      ctx.propAt(`${PACK.props}/clock-face.glb`, main.clock, 180);
      const showcase = main.classrooms[0];
      if (showcase) ctx.landmark('lop-hoc', 'Lớp học', (showcase.x0 + showcase.x1) / 2, (showcase.z0 + showcase.z1) / 2, showcase.standY);

      // 3. The yard: flower beds along the walk, lamps, the flagpole, the pitch, a fountain with a statue.
      const flowers: Array<[number, number]> = [];
      for (const [x0, x1] of [[MID - 12, MID - 6], [MID + 6, MID + 12]] as const) {
        for (const z0 of [yard.z - 16, yard.z - 4, yard.z + 8]) flowers.push(...placeBed(world, x0, x1, z0, z0 + 4, ground + 1, palette));
      }
      flowers.forEach(([x, z], i) => ctx.prop([`${N}/flower_redA.glb`, `${N}/flower_yellowB.glb`, `${N}/flower_purpleA.glb`][i % 3] ?? '', x, z, i * 37));
      for (let z = yard.z - 18; z <= yard.z + 18; z += 9) for (const [x, yaw] of [[MID - 4, 270], [MID + 4, 90]] as const) ctx.prop(`${PACK.roads}/light-square.glb`, x, z, yaw);
      const flag = { x: yard.x - 14, z: yard.z + 15 };
      ctx.prop(`${PACK.box}/flagpole.glb`, flag.x, flag.z, 270);
      ctx.keepOut(flag.x - 1, flag.z - 1, flag.x + 1, flag.z + 1);
      ctx.landmark('cot-co', 'Cột cờ', flag.x, flag.z);
      const pitch = { x: yard.x - 19, z: yard.z - 6 };
      for (let dx = -5; dx <= 5; dx++) for (let dz = -10; dz <= 10; dz++) if (Math.abs(dx) === 5 || Math.abs(dz) === 10 || dz === 0) world.set(pitch.x + dx, ground, pitch.z + dz, B.snow);
      ctx.landmark('san-bong', 'Sân bóng', pitch.x, pitch.z);
      const fountain = placeFountain(world, yard.x + 16, yard.z + 12, ground + 1, { stone: block('brick-grey'), water: block('water') });
      ctx.propAt(`${N}/statue_column.glb`, fountain.plinth, 0);
      ctx.keepOut(yard.x + 11, yard.z + 7, yard.x + 21, yard.z + 17);
      ctx.landmark('dai-phun-nuoc', 'Đài phun nước', yard.x + 16, yard.z + 12);

      // 4. The other areas' buildings and equipment.
      placeHouse(world, canteen.x - 16, canteen.z + 8, 14, 10, 4, ground + 1, { wall: B.planks, roof: block('wood-red'), trim: block('log') });
      ctx.keepOut(canteen.x - 17, canteen.z + 5, canteen.x - 2, canteen.z + 18);
      for (let i = 0; i < 3; i++) ctx.prop(`${PACK.survival}/workbench.glb`, canteen.x - 10 + i * 6, canteen.z - 4, 0);
      placeHouse(world, playground.x + 6, playground.z + 8, 13, 10, 4, ground + 1, { wall: B.sand, roof: block('roof-blue'), trim: block('birch-log') });
      ctx.keepOut(playground.x + 5, playground.z + 5, playground.x + 19, playground.z + 18);
      for (const [x, z] of [[playground.x - 14, playground.z - 12], [playground.x - 14, playground.z - 4]] as const) {
        ctx.prop(`${PACK.box}/swing-set.glb`, x, z, 0);
        ctx.keepOut(x - 2, z - 1, x + 2, z + 1);
      }
      for (const [x, z] of [[playground.x - 4, playground.z - 8], [playground.x + 4, playground.z - 14]] as const) ctx.prop(`${PACK.props}/playground-slide.glb`, x, z, 200);
      ctx.prop(`${PACK.props}/teddy-bear.glb`, playground.x + 10, playground.z + 4, 180);
      for (const [x, z] of [[playground.x - 6, playground.z - 16], [canteen.x - 4, canteen.z - 16], [courtyard.x - 16, courtyard.z + 6], [courtyard.x + 13, courtyard.z + 6], [MID - 9, yard.z + 17], [MID + 9, yard.z + 17]] as const) ctx.prop(`${PACK.box}/park-bench.glb`, x, z, 180);
      placeGreenhouse(world, garden.x - 17, garden.x + 1, garden.z + 12, garden.z + 26, ground + 1, palette);
      ctx.keepOut(garden.x - 18, garden.z + 11, garden.x + 2, garden.z + 27);
      for (let i = 0; i < 6; i++) {
        const x0 = garden.x - 18 + (i % 3) * 13;
        const z0 = garden.z - 22 + Math.floor(i / 3) * 12;
        placeBed(world, x0, x0 + 9, z0, z0 + 4, ground + 1, palette).forEach(([x, z], k) => {
          if (k % 2 === 0) ctx.prop([`${N}/crop_carrot.glb`, `${N}/crop_pumpkin.glb`, `${N}/crops_cornStageD.glb`][i % 3] ?? '', x, z, k * 53);
        });
        ctx.keepOut(x0, z0, x0 + 9, z0 + 4);
      }
      for (const hoop of placeCourt(world, sports.x - 17, sports.x + 17, sports.z - 26, sports.z - 2, ground, palette)) ctx.prop(`${PACK.box}/basketball-hoop.glb`, hoop.at[0] - 0.5, hoop.at[2] - 0.5, hoop.yaw);
      placeSportsHall(world, sports.x - 15, sports.x + 17, sports.z + 6, sports.z + 28, ground + 1, palette);
      ctx.keepOut(sports.x - 16, sports.z + 5, sports.x + 18, sports.z + 29);
      ctx.landmark('nha-da-nang', 'Nhà đa năng', sports.x, sports.z + 17);
      placeHouse(world, art.x - 12, art.z + 6, 24, 10, 5, ground + 1, { wall: block('brick-grey'), roof: block('wood-red'), trim: block('birch-log') });
      ctx.keepOut(art.x - 13, art.z + 3, art.x + 12, art.z + 16);
      for (let i = 0; i < 4; i++) {
        ctx.prop(`${N}/sign.glb`, art.x - 15 + i * 9, art.z - 8, 180);
        ctx.prop(`${PACK.props}/artist-palette.glb`, art.x - 13 + i * 9, art.z - 6, 180);
      }
      // The school bus at the kerb, metal gate leaves, bushes by the gate, cars along the street.
      ctx.propAt(`${PACK.props}/school-bus.glb`, [MID + 28.5, ground + 1, (STREET.z0 + STREET.z1) / 2 + 2], 90);
      for (const side of [-1, 1]) ctx.propAt(`${PACK.castle}/metal-gate.glb`, [side < 0 ? GATE[0] - 0.5 : GATE[1] + 1.5, ground + 1, CAMPUS.z0 + 2.5], side < 0 ? 90 : 270);
      for (const [x, z] of [[MID - 16, CAMPUS.z0 + 4], [MID + 16, CAMPUS.z0 + 4], [MID - 22, yard.z + 18], [MID + 22, yard.z + 18]] as const) ctx.prop(`${N}/plant_bush.glb`, x, z, 0);
      for (let x = 40; x < SIZE - 40; x += 46) if (Math.abs(x - MID) > 40) ctx.propAt(`${PACK.props}/automobile.glb`, [x + 0.5, ground + 1, STREET.z0 + 2.5], 90);

      // 5. The town: suburban houses along the main street's far side, cottages along the west avenue.
      let kind = 0;
      for (let x = 30; x < SIZE - 30; x += 18) {
        if (Math.abs(x - DISTRICT.market.x) < 80 || ctx.inWater(x, STREET.z0 - 12)) continue;
        ctx.centred(HOUSES[kind++ % HOUSES.length] ?? '', x, STREET.z0 - 12, 0);
        ctx.keepOut(x - 6, STREET.z0 - 18, x + 6, STREET.z0 - 6);
      }
      for (let z = STREET.z1 + 24; z < 640; z += 20) cottageRow(ctx, CAMPUS.x0 - 50, z, 2);
      // The village (west): hamlets and a paddy; the hamlet (north-west): cottages round yards.
      hamlet(ctx, 30, DISTRICT.village.z - 70, 250, DISTRICT.village.z + 40);
      for (let x = 40; x <= 250; x++) {
        for (let z = DISTRICT.village.z + 70; z <= DISTRICT.village.z + 150; z++) {
          if ((x - 40) % 12 === 0 || (z - DISTRICT.village.z - 70) % 9 === 0 || ctx.onPath(x, z)) continue;
          world.set(x, ctx.surface(x, z), z, block('water'));
          if ((x - 40) % 4 === 2 && (z - DISTRICT.village.z) % 3 === 1) ctx.prop(`${N}/crops_wheatStageB.glb`, x, z, (x * 13) % 360);
        }
      }
      ctx.keepOut(40, DISTRICT.village.z + 70, 250, DISTRICT.village.z + 150);
      ctx.landmark('ruong-lua', 'Ruộng lúa', 145, DISTRICT.village.z + 110);
      hamlet(ctx, 30, DISTRICT.hamlet.z - 60, 250, DISTRICT.hamlet.z + 50);
      bambooHedge(ctx, [[20, DISTRICT.village.z - 80], [20, DISTRICT.hamlet.z + 60]]);
      // Neighbourhoods east of the school, by the lake, and along the road to the farm.
      hamlet(ctx, CAMPUS.x1 + 26, STREET.z1 + 20, LAKE.x - LAKE.rx - 10, CAMPUS.z1 + 30);
      hamlet(ctx, CAMPUS.x1 + 26, CAMPUS.z1 + 50, 560, 560);
      hamlet(ctx, 480, 20, 560, 120);
      hamlet(ctx, 60, 20, 300, 120);

      // The library (north): a reading hall; the castle on its hill beyond.
      const lib = DISTRICT.library;
      placeHouse(world, lib.x - 16, lib.z - 6, 32, 16, 6, ground + 1, { wall: block('sand'), roof: block('roof-blue'), trim: block('birch-log') });
      ctx.keepOut(lib.x - 17, lib.z - 9, lib.x + 16, lib.z + 10);
      flowerBed(ctx, lib.x - 14, lib.z - 12, 28, 3);
      ctx.landmark('thu-vien-pho', 'Thư viện', lib.x, lib.z - 8);
      const castle = DISTRICT.castle;
      const castleY = ctx.surface(castle.x, castle.z) + 1;
      for (let x = castle.x - 24; x <= castle.x + 24; x++) {
        for (let z = castle.z - 18; z <= castle.z + 18; z++) {
          const edge = x === castle.x - 24 || x === castle.x + 24 || z === castle.z - 18 || z === castle.z + 18;
          if (!edge || (z === castle.z - 18 && Math.abs(x - castle.x) <= 3)) continue;
          for (let y = castleY; y <= castleY + 6; y++) world.set(x, y, z, block('brick-grey'));
          if ((x + z) % 2 === 0) world.set(x, castleY + 7, z, block('brick-grey'));
        }
      }
      for (const [tx, tz] of [[castle.x - 24, castle.z - 18], [castle.x + 24, castle.z - 18], [castle.x - 24, castle.z + 18], [castle.x + 24, castle.z + 18]] as const) {
        for (let y = castleY; y <= castleY + 11; y++) for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) if (Math.max(Math.abs(dx), Math.abs(dz)) === 2) world.set(tx + dx, y, tz + dz, block('brick-grey'));
        for (let k = 0; k <= 3; k++) for (let dx = -3 + k; dx <= 3 - k; dx++) for (let dz = -3 + k; dz <= 3 - k; dz++) world.set(tx + dx, castleY + 12 + k, tz + dz, block('roof-blue'));
        ctx.propAt(`${PACK.castle}/flag-banner-long.glb`, [tx + 0.5, castleY + 16, tz + 0.5], 0);
      }
      ctx.keepOut(castle.x - 27, castle.z - 21, castle.x + 27, castle.z + 21);
      ctx.landmark('lau-dai-pho', 'Lâu đài', castle.x, castle.z - 18, castleY);

      // The forest (north-east): a dense wood under the waterfall cliff.
      for (let i = 0; i < 260; i++) {
        const x = Math.round(DISTRICT.forest.x - 80 + rng() * 170);
        const z = Math.round(DISTRICT.forest.z - 70 + rng() * 150);
        if (x > SIZE - 14 || z > SIZE - 14 || ctx.inWater(x, z) || ctx.nearPath(x, z, 3) || world.get(x, ctx.surface(x, z) + 1, z) !== 0) continue;
        if (Math.hypot(x - DISTRICT.forest.x - 6, z - DISTRICT.forest.z - 6) < 8) continue; // the gate's clearing
        placeTree(world, x, ctx.surface(x, z) + 1, z, treeHeight(rng), { log: B.treeLog, leaves: rng() < 0.3 ? B.pink : B.leaves }, rng);
      }
      const fall = { x: CLIFF.x - 20, z: CLIFF.z - 20 };
      for (let y = ctx.surface(fall.x, fall.z) + 1; y > WATER_LEVEL - 1; y--) for (const dx of [0, 1, 2]) world.set(fall.x + dx, y, fall.z, block('water'));
      ctx.keepOut(fall.x - 1, fall.z - 1, fall.x + 3, fall.z + 1);
      ctx.landmark('thac-nuoc', 'Thác nước', fall.x, fall.z);

      // The lake (east): the harbour's piers with boats and sailboats, the lighthouse on its point.
      for (const [i, z] of [360, 400, 440].entries()) jetty(ctx, LAKE.x - LAKE.rx + 4 + i * 2, z, 16, 1, WATER_LEVEL, true);
      ctx.landmark('ben-tau', 'Bến tàu', LAKE.x - LAKE.rx + 6, 400);
      const point = { x: LAKE.x - 40, z: LAKE.z - LAKE.rz - 8 };
      placeLighthouse(world, point.x, point.z, ctx.surface(point.x, point.z) + 1, { red: block('wood-red'), white: block('snow'), glass: block('glass'), cap: block('roof-blue') });
      ctx.keepOut(point.x - 4, point.z - 4, point.x + 4, point.z + 4);
      ctx.landmark('hai-dang', 'Hải đăng', point.x, point.z);
      for (let i = 0; i < 8; i++) ctx.propAt(`${N}/lily_large.glb`, [LAKE.x + 30 + Math.cos(i) * 20 + 0.5, WATER_LEVEL + 1.02, LAKE.z + Math.sin(i) * 30 + 0.5], i * 45);

      // The market (south of the street): rows of striped stalls piled with produce.
      const stripes = [[block('wood-red'), B.snow], [block('roof-blue'), B.snow], [B.sand, B.snow]];
      const goods = [`${PACK.food}/apple.glb`, `${PACK.food}/cabbage.glb`, `${PACK.food}/pumpkin.glb`, `${PACK.food}/banana.glb`];
      let s = 0;
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 6; col++) {
          const x0 = DISTRICT.market.x - 64 + col * 22;
          const z0 = DISTRICT.market.z - 40 + row * 22;
          const { counter } = placeStall(world, x0, z0, 6, 4, ground + 1, { log: block('log'), planks: B.planks, stripes: stripes[s++ % 3] ?? [] });
          ctx.keepOut(x0 - 1, z0 - 2, x0 + 6, z0 + 4);
          for (let k = 0; k < 4; k++) ctx.propAt(goods[(k + s) % goods.length] ?? '', [counter[0] - 1.5 + k, counter[1], counter[2]], k * 53);
        }
      }
      ctx.landmark('cho-pho', 'Chợ', DISTRICT.market.x, DISTRICT.market.z);
      // The farm (south-east): fenced plots, the windmill, the red barn.
      fieldPlot(ctx, DISTRICT.farm.x - 80, DISTRICT.farm.z - 60, DISTRICT.farm.x - 40, DISTRICT.farm.z - 20, `${N}/crops_cornStageD.glb`);
      fieldPlot(ctx, DISTRICT.farm.x - 30, DISTRICT.farm.z - 60, DISTRICT.farm.x + 10, DISTRICT.farm.z - 20, `${N}/crop_pumpkin.glb`);
      fieldPlot(ctx, DISTRICT.farm.x + 20, DISTRICT.farm.z - 60, DISTRICT.farm.x + 70, DISTRICT.farm.z - 30, `${N}/crop_carrot.glb`);
      placeWindmill(world, DISTRICT.farm.x + 40, DISTRICT.farm.z + 10, ctx.surface(DISTRICT.farm.x + 40, DISTRICT.farm.z + 10) + 1, { planks: B.planks, log: block('log'), roof: block('brick-red'), sail: B.snow });
      ctx.keepOut(DISTRICT.farm.x + 35, DISTRICT.farm.z + 1, DISTRICT.farm.x + 45, DISTRICT.farm.z + 14);
      placeHouse(world, DISTRICT.farm.x - 50, DISTRICT.farm.z + 10, 16, 10, 5, ground + 1, { wall: block('wood-red'), roof: block('brick-grey'), trim: B.snow });
      ctx.keepOut(DISTRICT.farm.x - 51, DISTRICT.farm.z + 7, DISTRICT.farm.x - 34, DISTRICT.farm.z + 20);
      ctx.landmark('nong-trai-pho', 'Nông trại', DISTRICT.farm.x, DISTRICT.farm.z);
    },
  });
}

await runIfMain(import.meta.url, generateSchool);
