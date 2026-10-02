// Generates "Trường học", the hub of the world, 800 x 800 blocks from a fixed seed, after the owner's mocks
// (designs/the-gioi/a-01- and b-01-toan-canh-khu-vuc-256.png: the school in the middle, the village, the
// forest, the lake, the market and the farm round it; designs/truong-hoc/ for the campus itself). In the
// middle, the campus exactly as the approved mock (docs/design-truong-hoc.md): the main street with its
// crosswalk and the school bus, the wall and gate, the yard with its flower beds, flagpole and pitch, the
// two-storey main building with the clock tower (a furnished classroom on each floor and the stairs between),
// the canteen, the playground by the toy workshop, the courtyard, the science garden with its greenhouse,
// the art yard, the sports hall with its court. Behind the school, over a canal, the central square of the
// town (designs/trung-tam/d-*, Jev 02/10/2026: the square stands in the hub): the big fountain under the
// white cat, the glowing stone portals to the seven maps round it, each under its name, the shop, the
// traders' stalls, the quest board, the team gazebo, the event stage, banners, lanterns and a balloon. Round
// it all, small districts of the town (the bus goes to each): the village and its paddies (west), the hamlet
// (north-west), the library and the castle on its hill (north), the forest with its waterfall cliff
// (north-east), the lake with the harbour and the lighthouse (east), the market and the farm with its
// windmill (south). After the detail mocks (designs/truong-hoc/c-*): the gate between stone pillars with
// lanterns and blossom trees, the white cat on the yard's fountain, the corridor of windows along the
// building's front, the school library and the music and art room upstairs, the playhouse with its slide,
// the street lined with lanterns and houses. The school's four chapters are zones of the campus.
// Output: assets/generated/world/truong-hoc/{regions/, horizon.bin, entities.json}
import { PACK, runIfMain } from './map-kit';
import { bambooHedge, fieldPlot, flowerBed, jetty, laneVerge, STREET_LANTERN, streetHouses } from './scenery';
import { placeHouse } from './structures/buildings';
import { placeCatStatue, placeFountain, placeLighthouse, placeStall, placeWindmill } from './structures/countryside';
import { placeArchBridge, placeBanner, placePlaza, placeTower } from './structures/landmarks';
import type { Point } from './structures/path';
import { fill, placeBed, placeCampusWall, placeCourt, placeGreenhouse, placeMainBuilding, placeSportsHall, placeStreet, type FurnitureKind, type SchoolPalette } from './structures/school';
import { placeTree, treeHeight } from './structures/tree';
import { placeGazebo, placeGrandFountain, placePlayhouse, placePortal, placeShop, placeStage } from './structures/truong-hoc-plaza';
import { facingWriter, FRAME, frameCell, turnCell, type Facing } from './structures/world-writer';
import { animal, crowd, person } from './village-life';
import { generateZoneMap, HUB_REGION, type Zone } from './zone-map';

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
/** The back gate, between the art yard and the sports area, on the way to the square. */
const BACK_GATE: readonly [number, number] = [O.x + 111, O.x + 115];
const STREET = { z0: O.z + 3, z1: O.z + 12 };
/** The main building: front gallery from zFront, body back wall at zBack (school.ts). */
export const MAIN_BUILDING = { x0: O.x + 52, x1: O.x + 140, zFront: O.z + 66, zBack: O.z + 82, floorY: GROUND + 1 } as const;
const MID = Math.floor((MAIN_BUILDING.x0 + MAIN_BUILDING.x1) / 2);

/** The central square behind the school, on its axis, and the canal between them with its three bridges. */
export const PLAZA = { x: MID, z: 520, r: 34 } as const;
const CANAL = { x0: 322, x1: 488, z0: 470, z1: 478 } as const;
const BRIDGES: ReadonlyArray<{ x: number; width: number }> = [
  { x: MID, width: 7 },
  { x: MID - 40, width: 4 },
  { x: MID + 40, width: 4 },
];
/** The avenue along the square's front, between the canal and the paving. */
const AVENUE_Z = CANAL.z1 + 4;

/** The lake east of the town with the harbour, the stream from it along the campus's east side. */
const LAKE = { x: 690, z: 400, rx: 80, rz: 110 };
const STREAM_X = O.x + 184;
/** Districts of the town round the campus, the bus going to each. */
const DISTRICT = {
  village: { x: 170, z: 380 },
  hamlet: { x: 170, z: 650 },
  library: { x: 400, z: 600 },
  castle: { x: 400, z: 720 },
  forest: { x: 650, z: 660 },
  harbour: { x: 610, z: 400 },
  market: { x: 400, z: 180 },
  farm: { x: 640, z: 150 },
} as const;
const CASTLE_HILL = { x: DISTRICT.castle.x, z: DISTRICT.castle.z + 20, r: 60, rise: 7 };
const MOUNTAIN = { x: 40, z: 790, r: 170, rise: 22 };
const CLIFF = { x: 720, z: 740, r: 70, rise: 14 };
/** The paddies' bund the lane into them runs along (the paddy is cut in plots twelve wide from x 40). */
const PADDY_BUND = 148;

/**
 * The portals to the seven maps round the square (d-01, d-06): four on its west side facing east, three on
 * its east side facing west, each on the arc 27 blocks from the fountain, its colour after its map's.
 */
const PORTALS: ReadonlyArray<{ to: string; colour: string; dir: 1 | -1; dz: number }> = [
  { to: 'xom-mai-am', colour: 'pink', dir: 1, dz: -15 },
  { to: 'lang-ven-song', colour: 'orange', dir: 1, dz: -5 },
  { to: 'khu-rung-bi-mat', colour: 'green', dir: 1, dz: 5 },
  { to: 'lau-dai', colour: 'red', dir: 1, dz: 15 },
  { to: 'cho-phien', colour: 'violet', dir: -1, dz: -10 },
  { to: 'nong-trai', colour: 'yellow', dir: -1, dz: 0 },
  { to: 'thu-vien', colour: 'blue', dir: -1, dz: 10 },
];
const portalAt = (p: (typeof PORTALS)[number]): [number, number] => [PLAZA.x - p.dir * Math.round(Math.sqrt(27 * 27 - p.dz * p.dz)), PLAZA.z + p.dz];

/** The square's shop (d-02): its frame's corner and the way its front faces; the stalls of the traders (d-03). */
const SHOP = { origin: [PLAZA.x - 24, PLAZA.z - 36] as const, facing: 'east' as Facing, width: 14, size: { depth: 9, wallHeight: 7, walkIn: true, ceiling: true } };
const STALLS = [0, 1].map((i) => ({ x0: PLAZA.x - 20 + i * 7, z0: PLAZA.z + 21 }));

/** The way from the school's back gate over the central bridge into the square. */
const TO_SQUARE: Point[] = [
  [O.x + 106, O.z + 96],
  [O.x + 113, O.z + 110],
  [O.x + 113, CAMPUS.z1 + 6],
  [MID, CANAL.z0 - 6],
  [MID, PLAZA.z - PLAZA.r + 4],
];
const CAMPUS_ROUTES: Point[][] = [
  // Inside the campus: gate to the building, through its hall to the courtyard, on to every area.
  [[MID, CAMPUS.z0], [MID, MAIN_BUILDING.zFront - 3]],
  // Out of the hall's back door and round the courtyard's signpost (zone-map.ts sets it on the axis).
  [[MID, MAIN_BUILDING.zBack + 3], [MID + 6, MAIN_BUILDING.zBack + 5], [MID + 6, area('thap-dong-ho').z - 4], [area('thap-dong-ho').x, area('thap-dong-ho').z]],
  // Into the garden between its beds, down the lane between the first two columns to the greenhouse door.
  [[area('thap-dong-ho').x - 10, area('thap-dong-ho').z], [area('vuon-truong').x + 10, area('vuon-truong').z - 15], [area('vuon-truong').x - 7, area('vuon-truong').z - 15], [area('vuon-truong').x - 7, area('vuon-truong').z + 11]],
  [[area('thap-dong-ho').x + 10, area('thap-dong-ho').z], [area('hoi-truong').x, area('hoi-truong').z - 18]],
  // On to the doors of the art room, the canteen and the toy workshop (their houses stand in generateSchool).
  [[area('thap-dong-ho').x, area('thap-dong-ho').z], [area('phong-mi-thuat').x, area('phong-mi-thuat').z - 6], [area('phong-mi-thuat').x, area('phong-mi-thuat').z + 4]],
  [[area('san-truong').x + 18, area('san-truong').z], [area('cang-tin').x, area('cang-tin').z], [area('cang-tin').x - 2, area('cang-tin').z + 4]],
  [[area('san-truong').x - 18, area('san-truong').z], [area('xuong-do-choi').x, area('xuong-do-choi').z], [area('xuong-do-choi').x + 12, area('xuong-do-choi').z + 7]],
];
/**
 * The bus's stops in the town's districts, as it names them: where it lets the child off (`at`), and `from`, the
 * point of the district's way that a short lane leads from, past the stop, to the stop back to school.
 */
const DISTRICT_STOPS: ReadonlyArray<{ name: string; at: readonly [number, number]; from: Point; back?: Point }> = [
  { name: 'làng ven sông', at: [DISTRICT.village.x + 6, DISTRICT.village.z + 6], from: [DISTRICT.village.x, DISTRICT.village.z] },
  { name: 'xóm mái ấm', at: [DISTRICT.hamlet.x + 6, DISTRICT.hamlet.z + 6], from: [DISTRICT.hamlet.x, DISTRICT.hamlet.z] },
  { name: 'thư viện', at: [DISTRICT.library.x + 26, DISTRICT.library.z - 20], from: [PLAZA.x + 24, DISTRICT.library.z - 20] },
  // The castle's stop back waits on the level ground at the hill's foot, by the way's end.
  { name: 'lâu đài', at: [DISTRICT.castle.x + 6, DISTRICT.castle.z - 26], from: [DISTRICT.castle.x, DISTRICT.castle.z - 30], back: [DISTRICT.castle.x - 6, DISTRICT.castle.z - 30] },
  { name: 'bìa rừng', at: [DISTRICT.forest.x + 6, DISTRICT.forest.z + 6], from: [DISTRICT.forest.x, DISTRICT.forest.z] },
  { name: 'chợ', at: [DISTRICT.market.x + 6, DISTRICT.market.z + 10], from: [DISTRICT.market.x, DISTRICT.market.z + 6] },
  { name: 'nông trại', at: [DISTRICT.farm.x + 6, DISTRICT.farm.z + 6], from: [DISTRICT.farm.x, DISTRICT.farm.z] },
];
/** Where the bus back to school waits in a district, a little off where it lets the child off. */
const returnStop = (d: (typeof DISTRICT_STOPS)[number]): Point => d.back ?? [d.at[0] - 6, d.at[1] + 4];

const MAIN_STREET: Point[] = [[14, STREET.z1 + 2], [786, STREET.z1 + 2]];
const TOWN_ROUTES: Point[][] = [
  // The town: the avenues round the campus and along the square's front, the ways to every district.
  TO_SQUARE,
  [[DISTRICT.market.x, 20], [DISTRICT.market.x, STREET.z0]],
  [[CAMPUS.x0 - 12, STREET.z1 + 2], [CAMPUS.x0 - 12, 640]],
  [[CAMPUS.x1 + 18, STREET.z1 + 2], [CAMPUS.x1 + 18, 560]],
  [[CAMPUS.x0 - 12, AVENUE_Z], [CAMPUS.x1 + 18, AVENUE_Z]],
  [[PLAZA.x + 10, PLAZA.z + PLAZA.r - 6], [PLAZA.x + 10, PLAZA.z + PLAZA.r + 8], [PLAZA.x + 24, PLAZA.z + PLAZA.r + 16], [PLAZA.x + 24, DISTRICT.library.z + 20], [DISTRICT.castle.x, DISTRICT.castle.z - 30]],
  [[CAMPUS.x0 - 12, 380], [DISTRICT.village.x, DISTRICT.village.z]],
  [[CAMPUS.x0 - 12, 640], [DISTRICT.hamlet.x, DISTRICT.hamlet.z]],
  [[CAMPUS.x1 + 18, 560], [DISTRICT.forest.x, DISTRICT.forest.z]],
  [[CAMPUS.x1 + 18, 400], [DISTRICT.harbour.x, DISTRICT.harbour.z]],
  [[DISTRICT.market.x + 60, STREET.z0], [DISTRICT.farm.x, DISTRICT.farm.z]],
  // Lanes to every bus stop and on to the stop back; to the library's door; along a bund into the paddies;
  // up to the waterfall's foot; across the street to the lighthouse.
  ...DISTRICT_STOPS.map((d): Point[] => [d.from, [d.at[0], d.at[1]], returnStop(d)]),
  [[DISTRICT.library.x, DISTRICT.library.z - 8], [DISTRICT.library.x, DISTRICT.library.z - 16], [PLAZA.x + 24, DISTRICT.library.z - 16]],
  [[DISTRICT.village.x, DISTRICT.village.z], [PADDY_BUND, DISTRICT.village.z + 60], [PADDY_BUND, DISTRICT.village.z + 150]],
  [[DISTRICT.forest.x, DISTRICT.forest.z], [CLIFF.x - 26, CLIFF.z - 30]],
  [[LAKE.x - 44, STREET.z1 + 2], [LAKE.x - 44, LAKE.z - LAKE.rz - 3]],
  // From the farm's way to its barn's door.
  [[DISTRICT.farm.x, DISTRICT.farm.z], [DISTRICT.farm.x - 43, DISTRICT.farm.z + 7]],
];
/**
 * The town's cottage quarters, each a few lanes lined with houses on both sides (`streetHouses`: a front
 * garden, a walk from the door to the lane, a stone foot and steps where the land swells), the lanes forty
 * apart so the houses stand back to back, joined to the town's roads where they do not start on one.
 */
const TOWN_LANES: Point[][] = [
  // The village (west), either side of its road; the hamlet (north-west), either side of its road.
  ...[344, 412].map((z): Point[] => [[30, z], [250, z]]),
  ...[610, 670].map((z): Point[] => [[30, z], [250, z]]),
  // East of the school and by the lake, off the east avenue.
  ...[352, 446, 530].map((z): Point[] => [[CAMPUS.x1 + 18, z], [z < 500 ? LAKE.x - LAKE.rx - 10 : 560, z]]),
  // Beyond the street, north-east (short of the farm's fields) and north-west.
  ...[40, 100].flatMap((z): Point[][] => [[[480, z], [DISTRICT.farm.x - 84, z]], [[60, z], [300, z]]]),
  // Along the west avenue, off it.
  ...[350, 420, 460, 500, 540, 580, 620].map((z): Point[] => [[CAMPUS.x0 - 58, z], [CAMPUS.x0 - 12, z]]),
];
/** Ways joining the quarters' lanes to the roads: down the village and the hamlet to their roads, the two beyond the street to it. */
const TOWN_SPINES: Point[][] = [
  [[DISTRICT.village.x, 344], [DISTRICT.village.x, 412]],
  [[DISTRICT.hamlet.x, 610], [DISTRICT.hamlet.x, 670]],
  [[520, 40], [520, STREET.z0]],
  [[180, 40], [180, STREET.z0]],
];

const ROUTES: Point[][] = [...CAMPUS_ROUTES, MAIN_STREET, ...TOWN_ROUTES, ...TOWN_LANES, ...TOWN_SPINES];

/**
 * Gates: the square's portals into the theme maps, and one inside the school gate back to the hub, Trung tâm
 * (owner, 02/10/2026: a map of its own where the children meet), like every other map's.
 */
const GATES: ReadonlyArray<{ to: string; at: readonly [number, number] }> = [
  ...PORTALS.map((p) => ({ to: p.to, at: portalAt(p) })),
  { to: HUB_REGION, at: [MID - 8, CAMPUS.z0 + 3] },
];


const N = PACK.nature;
const BOX = PACK.box;
/** Classroom furniture (Furniture Kit): the model of each kind; wooden chairs as the mock's (c-15). */
const FURNITURE: Record<FurnitureKind, string> = {
  desk: `${PACK.furniture}/desk.glb`,
  chair: `${PACK.furniture}/chair.glb`,
  'teacher-desk': `${PACK.furniture}/tableCloth.glb`,
  'teacher-chair': `${PACK.furniture}/chairDesk.glb`,
  bookcase: `${PACK.furniture}/bookcaseOpen.glb`,
  lamp: `${PACK.furniture}/lampSquareCeiling.glb`,
  plant: `${PACK.furniture}/pottedPlant.glb`,
  bin: `${PACK.furniture}/trashcan.glb`,
  globe: 'generated/props/globe.glb',
};
/** The hub's own props (content/world/box-props/truong-hoc.json). */
const TH = {
  portal: (colour: string) => `${BOX}/th-portal-${colour}.glb`,
  sign: (map: string) => `${BOX}/th-sign-${map}.glb`,
  shopSign: `${BOX}/th-sign-shop.glb`,
  questBoard: `${BOX}/th-quest-board.glb`,
  signpostWest: `${BOX}/th-signpost-west.glb`,
  signpostEast: `${BOX}/th-signpost-east.glb`,
  banner: `${BOX}/th-banner.glb`,
  planter: `${BOX}/th-planter.glb`,
  screen: `${BOX}/th-stage-screen.glb`,
  bunting: `${BOX}/th-bunting.glb`,
  balloon: `${BOX}/th-balloon.glb`,
  crate: `${BOX}/th-goods-crate.glb`,
  shelf: `${BOX}/th-goods-shelf.glb`,
  sportsSign: `${BOX}/th-sign-sports.glb`,
  ball: `${BOX}/th-basketball.glb`,
  posters: [`${BOX}/th-poster-letters.glb`, `${BOX}/th-poster-map.glb`, `${BOX}/th-poster-numbers.glb`],
  artBoard: `${BOX}/th-art-board.glb`,
  easel: `${BOX}/th-easel.glb`,
  piano: `${BOX}/th-piano.glb`,
  pianoBench: `${BOX}/th-piano-bench.glb`,
  guitar: `${BOX}/th-guitar.glb`,
  notice: `${BOX}/th-notice.glb`,
  bookcase: `${BOX}/th-bookcase.glb`,
  desk: `${BOX}/th-desk.glb`,
  chair: `${BOX}/th-chair.glb`,
  table: `${BOX}/th-table.glb`,
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
  balloon: `${PACK.props}/balloon.glb`,
};
const FLOWERS = [`${N}/flower_redA.glb`, `${N}/flower_yellowB.glb`, `${N}/flower_purpleA.glb`];

const hill = (h: { x: number; z: number; r: number; rise: number }, x: number, z: number): number => {
  const d = Math.hypot(x - h.x, z - h.z) / h.r;
  return d >= 1 ? 0 : h.rise * (1 - d * d);
};
const inCampus = (x: number, z: number): boolean => x >= CAMPUS.x0 && x <= CAMPUS.x1 && z >= CAMPUS.z0 && z <= CAMPUS.z1;
/** The level ground behind the campus: the canal's banks and the square. */
const inSquareGround = (x: number, z: number): boolean => x >= CAMPUS.x0 - 14 && x <= CAMPUS.x1 + 14 && z > CAMPUS.z1 && z <= PLAZA.z + PLAZA.r + 10;
const inWater = (x: number, z: number): boolean =>
  ((x - LAKE.x) / LAKE.rx) ** 2 + ((z - LAKE.z) / LAKE.rz) ** 2 < 1 ||
  (Math.abs(x - STREAM_X) < 4 && z > STREET.z1 + 6 && z < CAMPUS.z1 + 40) ||
  (z > CAMPUS.z1 + 36 && z < CAMPUS.z1 + 44 && x > STREAM_X - 4 && x < LAKE.x) ||
  (z >= CANAL.z0 && z <= CANAL.z1 && x >= CANAL.x0 && x <= CANAL.x1);

/** A point of a structure's own frame (fractional) in the world, the frame turned as `facingWriter` turns it. */
const framePoint = (origin: readonly [number, number], facing: Facing, u: number, v: number): [number, number] => {
  const [cx, cz] = frameCell(origin, facing, Math.floor(u), Math.floor(v));
  const [dx, dz] = turnCell([0, 0], facing, u - Math.floor(u) - 0.5, v - Math.floor(v) - 0.5);
  return [cx + 0.5 + dx, cz + 0.5 + dz];
};
const shopAt = (u: number, v: number): [number, number] => framePoint(SHOP.origin, SHOP.facing, u, v);
/** Behind the shop's two counters (placeShop: each half of the front, three blocks in). */
const SHOP_KEEPERS = [FRAME + 3, FRAME + 9].map((u): readonly [number, number] => {
  const [x, z] = shopAt(u + 0.5, FRAME + 3.5);
  return [Math.floor(x), Math.floor(z)];
});

/**
 * Keeps trees out of a rectangle except where `skip` says (the zones and their margins): the rectangle's
 * free cells merged into as few rectangles as rows allow.
 */
function keepOutExcept(ctx: { keepOut: (x0: number, z0: number, x1: number, z1: number) => void }, x0: number, z0: number, x1: number, z1: number, skip: (x: number, z: number) => boolean): void {
  const open = new Map<string, number>();
  for (let z = z0; z <= z1 + 1; z++) {
    const runs = new Set<string>();
    if (z <= z1) {
      let start: number | null = null;
      for (let x = x0; x <= x1 + 1; x++) {
        const on = x <= x1 && !skip(x, z);
        if (on && start === null) start = x;
        if (!on && start !== null) {
          runs.add(`${start},${x - 1}`);
          start = null;
        }
      }
    }
    for (const [key, from] of open) {
      if (runs.has(key)) continue;
      const [a = 0, b = 0] = key.split(',').map(Number);
      ctx.keepOut(a, from, b, z - 1);
      open.delete(key);
    }
    for (const key of runs) if (!open.has(key)) open.set(key, z);
  }
}

/** What the hills add to the land at (x, z): the castle's, the mountain's and the waterfall cliff's. */
const rise = (x: number, z: number): number => hill(CASTLE_HILL, x, z) + hill(MOUNTAIN, x, z) + hill(CLIFF, x, z);

export async function generateSchool() {
  return generateZoneMap({
    mapId: MAP_ID,
    region: 'truong-hoc',
    seedText: 'miu-truong-hoc',
    outland: 'school',
    soil: { grass: 'grass', path: 'cobble' },
    size: SIZE,
    ground: { ground: GROUND, roll: 2.5 },
    zones: ZONES,
    spawn: { x: MID, z: CAMPUS.z0 + 3, yaw: 0 },
    water: { level: WATER_LEVEL, covers: inWater },
    // The campus, the street and the square are level; the castle on its hill, the mountain and the waterfall cliff rise.
    shape: (x, z, h) => {
      if (inCampus(x, z) || inSquareGround(x, z) || (z >= STREET.z0 - 1 && z <= STREET.z1 + 4)) return GROUND;
      return h + rise(x, z);
    },
    pathsFromSpawn: false,
    routes: ROUTES,
    gates: GATES,
    // The town bus: from the street to the square and back; from the street to every district and back.
    rides: {
      stops: [
        { name: 'Xe buýt tới quảng trường', at: [MID - 26, STREET.z1 + 2], to: [PLAZA.x - 10, AVENUE_Z] },
        { name: 'Xe buýt về cổng trường', at: [PLAZA.x - 14, AVENUE_Z + 2], to: [MID, CAMPUS.z0 - 4] },
        ...DISTRICT_STOPS.map((d, i) => ({ name: `Xe buýt tới ${d.name}`, at: [MID - 32 - (i % 4) * 5, STREET.z1 + 2 + Math.floor(i / 4) * 4] as const, to: d.at })),
        ...DISTRICT_STOPS.map((d) => ({ name: 'Xe buýt về trường', at: returnStop(d), to: [MID, CAMPUS.z0 - 4] as const })),
      ],
    },
    trees: { skip: 0.5, blocks: (roll, block) => ({ log: block('tree-log'), leaves: block(roll < 0.25 ? 'leaves-pink' : roll < 0.38 ? 'leaves-autumn' : 'leaves') }) },
    dressing: { models: [`${N}/flower_redA.glb`, `${N}/flower_yellowB.glb`, `${N}/plant_bush.glb`, `${PACK.props}/potted-plant.glb`], spacing: 9 },
    life: ({ landmark }) => [
      // 0. Street, bus terminals, and front school gate (x: MID=400, z: STREET.z1 ~ 315-325).
      ...crowd('school-guard', ['Bác bảo vệ cổng trường'], [person('d')], [MID + 8, CAMPUS.z0 + 6], 2, 1),
      { routine: 'teacher', name: 'Cô giáo đón học sinh', model: person('e'), held: [HELD.book], at: [MID + 4, CAMPUS.z0 + 4] as const },
      { routine: 'vendor', name: 'Bác tài xế xe buýt', model: person('m'), at: [MID - 20, STREET.z1 + 2] as const },
      { routine: 'pupil', name: 'Bạn nhỏ đợi xe buýt', model: person('f'), held: [HELD.balloon], at: [MID - 28, STREET.z1 + 2] as const },
      { routine: 'dog', name: 'Cún gác cổng trường', model: animal('dog'), at: [MID + 10, CAMPUS.z0 + 4] as const },
      ...crowd('shopper', ['Mẹ đón con', 'Bố đưa con đi học', 'Bà đón cháu'], [person('l'), person('c'), person('i')], [MID - 14, STREET.z1 + 3], 6, 3, [HELD.basket]),

      // 1. Chapter 1: Sân trường (sân bóng, lễ chào cờ, cột cờ).
      ...crowd('sweeper', ['Cô lao công', 'Chú lao công'], [person('e'), person('j')], landmark('cot-co'), 10, 2, [HELD.shovel, HELD.basket]),
      ...crowd('teacher', ['Thầy giáo', 'Cô giáo', 'Thầy tổng phụ trách'], [person('a'), person('e'), person('m')], [MID, MAIN_BUILDING.zFront - 7], 8, 3, [HELD.book]),
      ...crowd('pupil', ['Bạn cùng trường', 'Bạn tập thể dục giữa giờ'], [person('f'), person('n'), person('o'), person('p'), person('q'), person('r')], landmark('san-bong'), 10, 8, [HELD.book]),
      ...crowd('pupil', ['Đội nghi thức chào cờ', 'Bạn nhỏ kéo cờ'], [person('f'), person('o'), person('n')], landmark('cot-co'), 6, 3, [HELD.book]),

      // 2. Chapter 2: Sân sau dãy lớp & Tháp đồng hồ.
      ...crowd('reader', ['Bạn đọc sách', 'Học sinh ôn bài'], [person('n'), person('p'), person('r')], [area('phong-mi-thuat').x, area('phong-mi-thuat').z], 10, 4, [HELD.book]),
      ...crowd('pupil', ['Bạn nhỏ ngắm tháp đồng hồ', 'Học sinh đếm tiếng chuông'], [person('f'), person('q')], [area('thap-dong-ho').x, area('thap-dong-ho').z], 8, 3, [HELD.book]),
      ...crowd('teacher', ['Thầy phụ trách phòng thí nghiệm'], [person('a')], [area('thap-dong-ho').x - 8, area('thap-dong-ho').z], 4, 1, [HELD.book]),

      // 3. Chapter 3: Vườn trường & Khu thực nghiệm sinh học.
      ...crowd('waterer', ['Thầy làm vườn', 'Bạn trồng cây', 'Bác tỉa cây cảnh'], [person('m'), person('q'), person('a')], [area('vuon-truong').x, area('vuon-truong').z - 10], 8, 3, [HELD.bucket]),
      ...crowd('teacher', ['Cô giáo dạy môn sinh học'], [person('e')], [area('vuon-truong').x + 6, area('vuon-truong').z - 5], 4, 1, [HELD.book]),
      ...crowd('pupil', ['Bạn nhỏ chăm sóc luống hoa', 'Bạn nhỏ tưới rau mầm', 'Bạn quan sát bướm'], [person('f'), person('o'), person('r')], [area('vuon-truong').x - 4, area('vuon-truong').z - 12], 8, 4, [HELD.bucket]),

      // 4. Chapter 4: Sân chơi & Xưởng đồ chơi.
      ...crowd('pupil', ['Bạn ở sân chơi', 'Bé chơi cầu trượt', 'Bạn leo xà đơn'], [person('f'), person('o'), person('q'), person('n')], [area('xuong-do-choi').x, area('xuong-do-choi').z], 14, 6, [HELD.balloon]),
      ...crowd('pupil', ['Bạn chơi bóng rổ'], [person('n'), person('p'), person('r'), person('o')], landmark('san-bong-ro'), 6, 4, [TH.ball]),
      ...crowd('porter', ['Bác thợ mộc xưởng đồ chơi'], [person('b')], [area('xuong-do-choi').x - 8, area('xuong-do-choi').z + 6], 4, 1, [HELD.crate]),
      ...crowd('home-cook', ['Cô nấu bếp'], [person('l')], [area('cang-tin').x, area('cang-tin').z], 8, 2, [HELD.basket]),
      // The square: the shopkeepers, the traders, the children by the quest board, at the gazebo and the stage.
      ...crowd('vendor', ['Cô bán hàng', 'Chú bán đồ chơi'], [person('h'), person('k')], landmark('cua-hang'), 3, 2, [HELD.basket]).map((r, i) => ({ ...r, visits: [SHOP_KEEPERS[i % 2] ?? r.at, SHOP_KEEPERS[(i + 1) % 2] ?? r.at, r.at] })),
      ...crowd('vendor', ['Bác đổi đồ', 'Chị bán quà'], [person('b'), person('e')], landmark('cho-giao-dich'), 4, 2, [HELD.crate]).map((r, i) => {
        const stall = STALLS[i % STALLS.length] ?? { x0: r.at[0], z0: r.at[1] };
        return { ...r, visits: [[stall.x0 + 2, stall.z0 + 1], [stall.x0 + 1, stall.z0 + 1], [stall.x0 + 3, stall.z0 + 1]] as const };
      }),
      ...crowd('shopper', ['Bạn đi đổi đồ', 'Bạn xem hàng'], [person('f'), person('o'), person('q')], landmark('cho-giao-dich'), 9, 4, [HELD.basket]),
      ...crowd('reader', ['Bạn xem bảng nhiệm vụ'], [person('n'), person('r')], landmark('bang-nhiem-vu'), 4, 2, [HELD.book]),
      ...crowd('pupil', ['Bạn chờ tổ đội'], [person('f'), person('n'), person('o'), person('p'), person('q')], landmark('cho-to-doi'), 6, 5),
      ...crowd('trumpeter', ['Chú thổi kèn sân khấu'], [person('c')], landmark('san-khau'), 3, 1, [HELD.flute]),
      ...crowd('pupil', ['Bạn xem biểu diễn'], [person('o'), person('p'), person('r')], landmark('san-khau'), 10, 4, [HELD.balloon]),
      ...crowd('sweeper', ['Cô quét quảng trường'], [person('e')], landmark('quang-truong'), 14, 1),
      ...crowd('pupil', ['Bạn dạo quảng trường'], [person('f'), person('n'), person('o'), person('q')], landmark('quang-truong'), 9, 6, [HELD.balloon]),
      ...crowd('shopper', ['Cô dạo quảng trường', 'Bác dạo quảng trường'], [person('l'), person('g')], landmark('quang-truong'), 16, 2, [HELD.basket]),
      ...crowd('sentry', ['Chú gác cổng dịch chuyển'], [person('d'), person('g')], landmark('cong-dich-chuyen'), 8, 2),
      ...crowd('cat', ['Mèo quảng trường'], [animal('cat')], landmark('quang-truong'), 20, 3),
      // The town: market, farm, village, hamlet, harbour, the library and the castle on its hill.
      ...crowd('vendor', ['Bác bán rau', 'Cô bán hoa', 'Chú bán quả'], [person('b'), person('h'), person('k')], [DISTRICT.market.x, DISTRICT.market.z], 22, 6, [HELD.apple, HELD.basket]),
      ...crowd('shopper', ['Cô đi chợ', 'Bác đi chợ'], [person('c'), person('g'), person('l')], [DISTRICT.market.x, DISTRICT.market.z], 34, 6, [HELD.basket]),
      ...crowd('porter', ['Chú khuân hàng'], [person('j')], [DISTRICT.market.x + 30, DISTRICT.market.z - 20], 8, 2, [HELD.crate]),
      ...crowd('ploughman', ['Chú nông dân'], [person('m'), person('a')], [DISTRICT.farm.x, DISTRICT.farm.z], 30, 3, [HELD.hoe, HELD.apple]),
      ...crowd('milker', ['Cô vắt sữa'], [person('e')], [DISTRICT.farm.x - 40, DISTRICT.farm.z + 30], 6, 1, [HELD.bucket, HELD.bucket]),
      ...crowd('cow', ['Bò sữa'], [animal('cow')], [DISTRICT.farm.x - 40, DISTRICT.farm.z + 30], 16, 6),
      ...crowd('pig', ['Lợn con'], [animal('pig')], [DISTRICT.farm.x + 30, DISTRICT.farm.z + 40], 10, 4),
      ...crowd('chick', ['Gà con'], [animal('chick')], [DISTRICT.farm.x + 40, DISTRICT.farm.z - 20], 6, 10),
      ...crowd('rice-planter', ['Cô cấy lúa'], [person('h'), person('e')], [DISTRICT.village.x - 40, DISTRICT.village.z + 110], 26, 4, [HELD.basket]),
      ...crowd('laundry', ['Mẹ phơi đồ'], [person('l'), person('e')], [DISTRICT.village.x, DISTRICT.village.z - 40], 20, 3, [HELD.basket]),
      ...crowd('home-cook', ['Bà nấu cơm'], [person('i')], [DISTRICT.hamlet.x, DISTRICT.hamlet.z - 30], 20, 3, [HELD.basket]),
      ...crowd('waterer', ['Ông tưới cây'], [person('a')], [DISTRICT.hamlet.x + 40, DISTRICT.hamlet.z + 20], 14, 2, [HELD.bucket]),
      ...crowd('kite-flyer', ['Bạn thả diều'], [person('f'), person('o'), person('q')], [DISTRICT.hamlet.x + 60, DISTRICT.hamlet.z - 60], 20, 4, [`${PACK.props}/kite.glb`]),
      ...crowd('ferryman', ['Bác ngư dân', 'Chú chèo thuyền'], [person('m'), person('k')], landmark('ben-tau'), 12, 4, [HELD.paddle]),
      ...crowd('librarian', ['Cô thủ thư'], [person('e')], [DISTRICT.library.x, DISTRICT.library.z + 14], 6, 1, [HELD.book]),
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
        cobble: block('cobble'), cobbleGrey: block('cobble-grey'), paver: block('paver'), lantern: block('lantern'), log: block('log'), water: block('water'), brickRed: block('brick-red'),
        roofBlue: block('roof-blue'), woodRed: block('wood-red'), brickGrey: block('brick-grey'),
      };
      const palette: SchoolPalette = {
        wall: block('sand'), trim: block('birch-log'), roof: block('brick-red'), floor: block('planks'), glass: block('glass'), board: block('board'), light: block('snow'),
        stone: B.cobbleGrey, brick: block('brick-grey'), asphalt: block('asphalt'), line: block('snow'), court: block('wood-red'), roofBlue: block('roof-blue'),
        log: block('log'), door: block('wood-red'), grass: block('grass'), dirt: block('dirt'), sand: block('sand'), lantern: B.lantern,
        railing: { bar: block('iron'), pane: block('glass') },
        loft: B.log,
        ceiling: block('sand'),
        dash: B.paver,
      };
      // Raised beds rimmed in red boards; the plain boards stay the floors' (a rim is no way to walk along).
      const beds = { ...palette, floor: B.woodRed };
      const yard = area('san-truong');
      const garden = area('vuon-truong');
      const canteen = area('cang-tin');
      const playground = area('xuong-do-choi');
      const art = area('phong-mi-thuat');
      const courtyard = area('thap-dong-ho');
      const sports = area('hoi-truong');
      const mb = MAIN_BUILDING;
      const lit = (cells: ReadonlyArray<readonly [number, number]>): void => {
        for (const [x, z] of cells) ctx.prop(STREET_LANTERN, x, z, 0);
      };
      const tree = (x: number, z: number, leaves: number): void => placeTree(world, x, ground + 1, z, treeHeight(rng), { log: B.treeLog, leaves }, rng);
      /** A tree planted in paving stands in a pit of grass three across, flush with the stones round it. */
      const pitTree = (x: number, z: number, leaves: number): void => {
        for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) world.set(x + dx, ground, z + dz, block('grass'));
        tree(x, z, leaves);
      };
      /** Nothing built within a crown's reach of (x, z), from the ground up to a tree's top. */
      const roomForTree = (x: number, z: number): boolean => {
        for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) for (let y = ground + 1; y <= ground + 9; y++) if (world.get(x + dx, y, z + dz) !== 0) return false;
        return true;
      };

      // The campus is built, not wild (owner 02/10/2026: paved, no lawn but the garden's): paving between its
      // areas, and no tree outside the zones but those planted below.
      for (let x = CAMPUS.x0 + 1; x < CAMPUS.x1; x++) for (let z = CAMPUS.z0 + 1; z < CAMPUS.z1; z++) if (!ctx.inZone(x, z) && !ctx.onPath(x, z)) world.set(x, ground, z, B.paver);
      keepOutExcept(ctx, CAMPUS.x0, CAMPUS.z0, CAMPUS.x1, CAMPUS.z1, (x, z) => ctx.inZone(x, z, 2) !== undefined);
      // The campus floors of the areas the lessons do not play in (the four zones floor themselves).
      for (const a of CAMPUS_AREAS.filter((c) => !c.chapter)) {
        for (let x = a.x - a.hx; x <= a.x + a.hx; x++) for (let z = a.z - a.hz; z <= a.z + a.hz; z++) if (!ctx.onPath(x, z)) world.set(x, ground, z, block(a.floor));
        ctx.landmark(a.id, a.name, a.x, a.z);
      }
      // The yard paved in light stone (c-03).
      for (let x = yard.x - yard.hx; x <= yard.x + yard.hx; x++) for (let z = yard.z - yard.hz; z <= yard.z + yard.hz; z++) world.set(x, ground, z, (x + z) % 7 === 0 ? B.cobble : B.paver);

      // 1. The street (c-13): its lanterns on both pavements, the wall and the gate between stone pillars.
      placeStreet(world, 12, SIZE - 13, STREET.z0, STREET.z1, ground, [GATE[0] - 1, GATE[1] + 1], palette);
      for (let x = 12; x < SIZE - 12; x++) {
        for (const z of [STREET.z1 + 1, STREET.z1 + 2, STREET.z1 + 3, STREET.z1 + 4, STREET.z0 - 1, STREET.z0 - 2, STREET.z0 - 3, STREET.z0 - 4]) if (!ctx.inWater(x, z)) world.set(x, ctx.surface(x, z), z, B.paver);
      }
      for (let x = 20; x < SIZE - 20; x += 13) {
        if (Math.abs(x - MID) < 9) continue;
        for (const z of [STREET.z1 + 3, STREET.z0 - 2]) if (!ctx.inWater(x, z)) ctx.prop(STREET_LANTERN, x, z, 0);
      }
      // The street and its pavements are no place for the wild trees (the street's own stand in pits, last).
      ctx.keepOut(12, STREET.z0 - 4, SIZE - 13, STREET.z1 + 4);
      // Nor along the outside of the campus wall: a crown there would hang over its pillars.
      ctx.keepOut(CAMPUS.x0 - 4, CAMPUS.z0, CAMPUS.x0 - 1, CAMPUS.z1);
      ctx.keepOut(CAMPUS.x1 + 1, CAMPUS.z0, CAMPUS.x1 + 4, CAMPUS.z1);
      placeCampusWall(world, CAMPUS.x0, CAMPUS.x1, CAMPUS.z0, CAMPUS.z1, () => ground + 1, GATE, palette, BACK_GATE);
      ctx.keepOut(CAMPUS.x0, CAMPUS.z0, CAMPUS.x1, CAMPUS.z0 + 1);
      ctx.keepOut(CAMPUS.x0, CAMPUS.z1 - 1, CAMPUS.x1, CAMPUS.z1);
      ctx.keepOut(CAMPUS.x0, CAMPUS.z0, CAMPUS.x0 + 1, CAMPUS.z1);
      ctx.keepOut(CAMPUS.x1 - 1, CAMPUS.z0, CAMPUS.x1, CAMPUS.z1);
      ctx.landmark('cong-truong', 'Cổng trường', MID, CAMPUS.z0);
      ctx.landmark('duong-chinh', 'Đường chính', CAMPUS.x0 - 40, Math.round((STREET.z0 + STREET.z1) / 2));
      // Blossom trees and flower beds behind the wall either side of the gate (c-02).
      for (const side of [-1, 1]) {
        pitTree(MID + side * 13, CAMPUS.z0 + 4, B.pink);
        for (let k = 0; k < 9; k++) ctx.prop(FLOWERS[k % 3] ?? '', MID + side * (17 + k * 2), CAMPUS.z0 + 2, k * 40);
        ctx.prop(STREET_LANTERN, MID + side * 8, CAMPUS.z0 - 2, 0);
      }

      // 2. The main building with its clock tower, the corridor of windows, furnished classrooms, the library
      // and the music and art room, the staircase.
      const main = placeMainBuilding(
        world,
        {
          ...mb,
          corridor: true,
          extraRooms: [
            { side: 'east', index: 1, upper: false },
            { side: 'east', index: 1, upper: true },
          ],
        },
        palette,
      );
      ctx.keepOut(mb.x0 - 3, mb.zFront - 4, mb.x1 + 3, mb.zBack + 3);
      // The classrooms' furniture; their bookcases full of books (c-15) on the back wall.
      const wooden: Partial<Record<FurnitureKind, string>> = { desk: TH.desk, chair: TH.chair };
      for (const piece of main.furniture.filter((f) => f.kind !== 'bookcase')) {
        const own = wooden[piece.kind];
        if (own) ctx.propAt(own, piece.at, (piece.yaw + 180) % 360);
        else ctx.centredAt(FURNITURE[piece.kind], piece.at, piece.yaw);
      }
      for (const piece of main.furniture.filter((f) => f.kind === 'bookcase')) ctx.propAt(TH.bookcase, [piece.at[0] + 0.3, piece.at[1], piece.at[2]], 90);
      ctx.propAt(`${PACK.props}/potted-plant.glb`, main.plant);
      ctx.propAt(`${PACK.props}/clock-face.glb`, main.clock, 180);
      // The classrooms' posters on the back wall and a plant by the board (c-15).
      for (const room of main.classrooms) {
        TH.posters.forEach((poster, i) => ctx.propAt(poster, [room.x1 + 0.93, room.standY + 2.15, room.z0 + 2.5 + i * 2.6], 90));
        ctx.centredAt(FURNITURE.plant, [room.x0 + 0.5, room.standY, room.z0 + 0.5], 0);
      }
      const showcase = main.classrooms[0];
      if (showcase) {
        const { x0, x1, z0, z1, standY: y } = showcase;
        ctx.landmark('lop-hoc', 'Lớp học', (x0 + x1) / 2, (z0 + z1) / 2, y);
        // The places the school's quests name in and by the classroom (quest `places`): their targets are
        // set round the landmark of the same name.
        ctx.landmark('lop-2a', 'Lớp 2A', (x0 + x1) / 2, (z0 + z1) / 2, y);
        ctx.landmark('ban-co-giao', 'Bàn cô giáo', x0 + 1, Math.floor((z0 + z1) / 2), y);
        ctx.landmark('goc-ke-chuyen', 'Góc kể chuyện trong lớp', x1 - 1, z1 - 1, y);
        ctx.landmark('cua-lop-2a', 'Cửa lớp 2A', Math.floor((x0 + x1) / 2), mb.zFront + 1, y);
        ctx.landmark('cua-so-lop-2a', 'Cửa sổ lớp 2A', Math.floor((x0 + x1) / 2), mb.zFront - 4);
      }
      const [library, music] = main.extraRooms;
      if (library) {
        // The school library (c-16): bookcases round the walls (the front one free for the door), reading tables
        // with chairs down the middle two blocks apart, a globe, plants.
        const { x0, x1, z0, z1, standY: y } = library;
        for (let x = x0 + 0.5; x <= x1 + 0.5; x += 1) ctx.propAt(TH.bookcase, [x, y, z1 + 0.75], 0);
        for (let z = z0 + 1.5; z <= z1 - 0.5; z += 1) ctx.propAt(TH.bookcase, [x1 + 0.75, y, z], 90);
        for (let z = z0 + 3.5; z <= z1 - 1.5; z += 1) ctx.propAt(TH.bookcase, [x0 + 0.25, y, z], 270);
        const midZ = (z0 + z1 + 1) / 2;
        for (let tx = x0 + 4; tx <= x1 - 3; tx += 5) {
          ctx.propAt(TH.table, [tx, y, midZ], 90);
          for (const dz of [-0.9, 0.9]) for (const dx of [-0.4, 0.4]) ctx.propAt(TH.chair, [tx + dx, y, midZ + dz * 1.15], dz < 0 ? 180 : 0);
          ctx.propAt(HELD.book, [tx, y + 0.8, midZ], 30);
        }
        ctx.propAt('generated/props/globe.glb', [x0 + 4, y + 0.8, midZ - 0.3], 0);
        ctx.centredAt(FURNITURE.plant, [x0 + 0.5, y, z0 + 0.5], 0);
        ctx.centredAt(FURNITURE.plant, [x1 + 0.5, y, z0 + 0.5], 0);
        ctx.landmark('thu-vien-truong', 'Thư viện trường', (x0 + x1) / 2, (z0 + z1) / 2, y);
      }
      if (music) {
        // The music and art room upstairs (c-19): the board of drawings, easels, the piano, a guitar, tables.
        const { x0, x1, z0, z1, standY: y } = music;
        ctx.propAt(TH.artBoard, [(x0 + x1 + 1) / 2, y + 0.9, z1 + 0.93], 0);
        ctx.propAt(TH.piano, [x1 + 0.6, y, z1 - 2], 90);
        ctx.propAt(TH.pianoBench, [x1 - 0.4, y, z1 - 2], 90);
        ctx.propAt(TH.guitar, [x1 + 0.5, y, z0 + 2.5], 90);
        for (const ez of [z0 + 4.5, z0 + 7, z0 + 9.5]) ctx.propAt(TH.easel, [x0 + 1, y, ez], 270);
        ctx.propAt(TH.table, [x0 + 4, y, z0 + 3], 0);
        for (const dx of [-0.6, 0.6]) for (const dz of [-0.85, 0.85]) ctx.propAt(TH.chair, [x0 + 4 + dx, y, z0 + 3 + dz], dz < 0 ? 180 : 0);
        TH.posters.forEach((poster, i) => ctx.propAt(poster, [x0 + 0.07, y + 1.6, z0 + 1.5 + i * 2.6], 270));
        ctx.propAt(`${PACK.props}/artist-palette.glb`, [x0 + 4, y + 0.8, z0 + 3], 0);
        ctx.centredAt(FURNITURE.plant, [x0 + 0.5, y, z1 + 0.5], 0);
        ctx.landmark('phong-chuc-nang', 'Phòng âm nhạc và mĩ thuật', (x0 + x1) / 2, (z0 + z1) / 2, y);
      }
      // The staircase (c-18): a notice board and a plant at its foot; the corridor (c-17): plants and benches.
      const st = main.stairs;
      ctx.propAt(TH.notice, [st.x1 + 0.93, st.standY + 1.2, st.z0 + 1], 90);
      ctx.centredAt(FURNITURE.plant, [st.x1 + 0.5, st.standY, st.z0 + 0.5], 0);
      ctx.landmark('cau-thang', 'Cầu thang', (st.x0 + st.x1) / 2, (st.z0 + st.z1) / 2, st.standY);
      for (let x = mb.x0 + 2; x < mb.x1 - 1; x += 9) {
        if (Math.abs(x - MID) < 6) continue;
        for (const y of [mb.floorY + 1, mb.floorY + 5]) {
          ctx.propAt(`${PACK.props}/potted-plant.glb`, [x + 0.5, y, mb.zFront - 0.6], 0);
          ctx.propAt(TH.notice, [x + 3.5, y + 1.1, mb.zFront + 2 - 0.07], 0);
        }
      }
      ctx.landmark('hanh-lang', 'Hành lang', Math.round((mb.x0 + MID) / 2), mb.zFront, mb.floorY + 1);
      ctx.landmark('dau-hanh-lang', 'Đầu hành lang', mb.x0, mb.zFront, mb.floorY + 1);
      ctx.landmark('chan-cau-thang', 'Chân cầu thang', st.x0 + 1, st.z0 + 1, st.standY);
      ctx.landmark('bon-nhai', 'Bồn nhài ngoài hành lang', MID - 12, mb.zFront - 4);
      // Flower beds and bushes along the front, either side of the steps.
      for (let x = mb.x0 - 1; x <= mb.x1 + 1; x++) {
        if (Math.abs(x - MID) < 6) continue;
        world.set(x, ground + 1, mb.zFront - 4, (x % 4 === 0 ? B.pink : B.leaves));
        if (x % 3 === 1) ctx.propAt(FLOWERS[x % 3] ?? '', [x + 0.5, ground + 2, mb.zFront - 3.5], x * 7);
      }

      // 3. The yard (c-03): beds of bushes and flowers along the walk, lamps, the flagpole, the pitch, the
      // fountain under the white cat, trees round it.
      const soil: Array<[number, number]> = [];
      for (const [x0, x1] of [[MID - 12, MID - 6], [MID + 6, MID + 12]] as const) {
        for (const z0 of [yard.z - 16, yard.z - 4, yard.z + 8]) soil.push(...placeBed(world, x0, x1, z0, z0 + 4, ground + 1, beds));
      }
      soil.forEach(([x, z], i) => {
        if (i % 3 === 0) world.set(x, ground + 1, z, i % 2 === 0 ? B.leaves : B.pink);
        else ctx.prop(FLOWERS[i % 3] ?? '', x, z, i * 37);
      });
      for (let z = yard.z - 18; z <= yard.z + 18; z += 9) for (const x of [MID - 4, MID + 4]) ctx.prop(STREET_LANTERN, x, z, 0);
      const flag = { x: yard.x - 14, z: yard.z + 15 };
      ctx.prop(`${BOX}/flagpole.glb`, flag.x, flag.z, 270);
      ctx.keepOut(flag.x - 1, flag.z - 1, flag.x + 1, flag.z + 1);
      ctx.landmark('cot-co', 'Cột cờ', flag.x, flag.z);
      const pitch = { x: yard.x - 19, z: yard.z - 6 };
      // A grass pitch with white lines, set in the paving.
      for (let dx = -5; dx <= 5; dx++) for (let dz = -10; dz <= 10; dz++) world.set(pitch.x + dx, ground, pitch.z + dz, Math.abs(dx) === 5 || Math.abs(dz) === 10 || dz === 0 ? B.snow : block('grass'));
      ctx.landmark('san-bong', 'Sân bóng', pitch.x, pitch.z);
      const fountain = placeFountain(world, yard.x + 16, yard.z + 12, ground + 1, { stone: block('stone'), water: B.water });
      placeCatStatue(world, yard.x + 16, fountain.plinth[1], yard.z + 12, { stone: B.snow, eye: block('iron') });
      ctx.keepOut(yard.x + 11, yard.z + 7, yard.x + 21, yard.z + 17);
      ctx.landmark('dai-phun-nuoc', 'Đài phun nước', yard.x + 16, yard.z + 12);
      ctx.landmark('ghe-da', 'Ghế đá sân trường', MID - 9, yard.z + 16);
      ctx.landmark('bot-bao-ve', 'Bốt bảo vệ', MID + 8, CAMPUS.z0 + 5);
      for (const [x, z] of [[yard.x + 9, yard.z + 6], [yard.x + 23, yard.z + 6], [yard.x + 9, yard.z + 18]] as const) ctx.prop(TH.planter, x, z, 0);
      for (let z = yard.z - 16; z <= yard.z + 16; z += 11) for (const x of [yard.x - yard.hx - 4, yard.x + yard.hx + 4]) pitTree(x, z, z % 2 === 0 ? B.pink : B.leaves);

      // 4. The other areas' buildings and equipment. Every house of the campus is many times the child's size
      // (owner 02/10/2026): walls seven high, a doorway three wide and three high, room to move inside.
      const finish = { glass: block('glass'), lantern: B.lantern, floor: B.planks };
      // The canteen: a dining hall of tables with their benches, the street side its front.
      const hall = { x0: canteen.x - 14, z0: canteen.z + 4, w: 25, d: 14 };
      placeHouse(world, hall.x0, hall.z0, hall.w, hall.d, 7, ground + 1, { wall: B.planks, roof: B.woodRed, trim: B.log, ...finish });
      ctx.keepOut(hall.x0 - 1, hall.z0 - 3, hall.x0 + hall.w, hall.z0 + hall.d);
      for (const tx of [hall.x0 + 4.5, hall.x0 + 8.5, hall.x0 + 16.5, hall.x0 + 20.5]) {
        for (const tz of [hall.z0 + 5.5, hall.z0 + 9.5]) {
          ctx.propAt(TH.table, [tx, ground + 1, tz], 0);
          for (const dz of [-0.95, 0.95]) for (const dx of [-0.5, 0.5]) ctx.propAt(TH.chair, [tx + dx, ground + 1, tz + dz], dz < 0 ? 0 : 180);
        }
      }
      for (let i = 0; i < 3; i++) ctx.propAt(`${PACK.survival}/workbench.glb`, [hall.x0 + 6.5 + i * 6, ground + 1, hall.z0 + hall.d - 2.5], 180);
      for (let i = 0; i < 3; i++) ctx.prop(`${PACK.survival}/workbench.glb`, canteen.x - 10 + i * 6, canteen.z - 4, 0);
      // The playground (c-06): the toy workshop, the wooden playhouse with its slide, swings, a fence round it.
      const workshop = { x0: playground.x + 6, z0: playground.z + 7, w: 13, d: 11 };
      placeHouse(world, workshop.x0, workshop.z0, workshop.w, workshop.d, 7, ground + 1, { wall: B.sand, roof: B.roofBlue, trim: block('birch-log'), ...finish });
      ctx.keepOut(workshop.x0 - 1, workshop.z0 - 3, workshop.x0 + workshop.w, workshop.z0 + workshop.d);
      // Inside: the carpenter's bench on the back wall, crates of toys, a teddy bear waiting to be finished.
      ctx.propAt(`${PACK.survival}/workbench.glb`, [workshop.x0 + 6.5, ground + 1, workshop.z0 + workshop.d - 2.5], 180);
      for (const dx of [2.5, 10.5]) ctx.propAt(`${PACK.survival}/box.glb`, [workshop.x0 + dx, ground + 1, workshop.z0 + workshop.d - 2.5], dx * 20);
      ctx.propAt(`${PACK.props}/teddy-bear.glb`, [workshop.x0 + 2.5, ground + 1, workshop.z0 + 3.5], 90);
      const playhouse = placePlayhouse(world, playground.x - 12, playground.z + 3, ground + 1, { post: B.log, deck: block('birch-log'), roof: B.woodRed, rail: B.log });
      ctx.keepOut(playground.x - 13, playground.z + 1, playground.x - 7, playground.z + 10);
      ctx.propAt(`${PACK.props}/playground-slide.glb`, playhouse.slide, 180);
      ctx.landmark('quanh-cau-truot', 'Quanh cầu trượt', Math.floor(playhouse.slide[0]), Math.floor(playhouse.slide[2]) - 2);
      ctx.landmark('goc-tro-choi', 'Góc trò chơi', playground.x - 6, playground.z - 8);
      ctx.landmark('hang-rao-go', 'Hàng rào gỗ', playground.x, playground.z + playground.hz);
      for (const [x, z] of [[playground.x - 14, playground.z - 12], [playground.x - 4, playground.z - 14]] as const) {
        ctx.prop(`${BOX}/swing-set.glb`, x, z, 0);
        ctx.keepOut(x - 2, z - 1, x + 2, z + 1);
      }
      ctx.prop(`${PACK.props}/playground-slide.glb`, playground.x + 4, playground.z - 6, 200);
      ctx.prop(`${PACK.props}/teddy-bear.glb`, playground.x + 10, playground.z + 4, 180);
      for (let x = playground.x - playground.hx; x <= playground.x + playground.hx; x += 2) if (Math.abs(x - playground.x - 2) > 3) ctx.prop(`${N}/fence_simple.glb`, x, playground.z + playground.hz + 1, 0);
      for (let z = playground.z - playground.hz; z <= playground.z + playground.hz; z += 2) if (Math.abs(z - playground.z) > 3) ctx.prop(`${N}/fence_simple.glb`, playground.x + playground.hx + 1, z, 90);
      for (const [x, z] of [[playground.x - 6, playground.z - 16], [canteen.x - 4, canteen.z - 16], [courtyard.x - 16, courtyard.z + 6], [courtyard.x + 13, courtyard.z + 6], [MID - 9, yard.z + 17], [MID + 9, yard.z + 17]] as const) ctx.prop(`${BOX}/park-bench.glb`, x, z, 180);
      // The science garden (c-05): the greenhouse, raised beds in fenced rows.
      placeGreenhouse(world, garden.x - 17, garden.x + 1, garden.z + 12, garden.z + 26, ground + 1, palette).forEach(([x, z], k) => {
        if (k % 3 === 0) ctx.prop(FLOWERS[k % FLOWERS.length] ?? '', x, z, k * 41);
      });
      ctx.keepOut(garden.x - 18, garden.z + 11, garden.x + 2, garden.z + 27);
      for (let i = 0; i < 6; i++) {
        const x0 = garden.x - 18 + (i % 3) * 13;
        const z0 = garden.z - 22 + Math.floor(i / 3) * 12;
        placeBed(world, x0, x0 + 9, z0, z0 + 4, ground + 1, beds).forEach(([x, z], k) => {
          if (k % 2 === 0) ctx.prop([`${N}/crop_carrot.glb`, `${N}/crop_pumpkin.glb`, `${N}/crops_cornStageD.glb`][i % 3] ?? '', x, z, k * 53);
        });
        for (let x = x0; x <= x0 + 9; x += 2) ctx.prop(`${N}/fence_simple.glb`, x, z0 - 1, 0);
        ctx.keepOut(x0, z0 - 1, x0 + 9, z0 + 4);
      }
      // The sports area (c-04): the red court with its hoops and a fence round it, the blue-roofed hall.
      const court = { x0: sports.x - 17, x1: sports.x + 17, z0: sports.z - 26, z1: sports.z - 2 };
      for (const hoop of placeCourt(world, court.x0, court.x1, court.z0, court.z1, ground, palette)) ctx.prop(`${BOX}/basketball-hoop.glb`, hoop.at[0] - 0.5, hoop.at[2] - 0.5, hoop.yaw);
      for (let z = court.z0; z <= court.z1; z += 2) for (const x of [court.x0 - 2, court.x1 + 2]) if (Math.abs(z - (court.z0 + court.z1) / 2) > 2) ctx.prop(`${N}/fence_simple.glb`, x, z, 90);
      ctx.landmark('san-bong-ro', 'Sân bóng rổ', sports.x, Math.round((court.z0 + court.z1) / 2));
      placeSportsHall(world, sports.x - 15, sports.x + 17, sports.z + 6, sports.z + 28, ground + 1, { ...palette, stone: B.sand });
      ctx.propAt(TH.sportsSign, [sports.x + 1.5, ground + 4.1, sports.z + 6 - 0.12], 0);
      for (const dx of [-8, 10]) ctx.prop(TH.planter, sports.x + dx, sports.z + 4, 0);
      ctx.keepOut(sports.x - 16, sports.z + 5, sports.x + 18, sports.z + 29);
      ctx.landmark('nha-da-nang', 'Nhà đa năng', sports.x, sports.z + 17);
      // The art room: easels along its walls, worktables down the middle, the board of drawings at the back.
      const studio = { x0: art.x - 13, z0: art.z + 5, w: 27, d: 13 };
      placeHouse(world, studio.x0, studio.z0, studio.w, studio.d, 7, ground + 1, { wall: B.brickGrey, roof: B.woodRed, trim: block('birch-log'), ...finish });
      ctx.keepOut(studio.x0 - 1, studio.z0 - 3, studio.x0 + studio.w, studio.z0 + studio.d);
      ctx.propAt(TH.artBoard, [art.x + 0.5, ground + 1.9, studio.z0 + studio.d - 1.07], 0);
      for (let k = 0; k < 4; k++) {
        ctx.propAt(TH.easel, [studio.x0 + 1.5, ground + 1, studio.z0 + 3.5 + k * 2], 270);
        ctx.propAt(TH.easel, [studio.x0 + studio.w - 1.5, ground + 1, studio.z0 + 3.5 + k * 2], 90);
      }
      for (const dx of [-7, 8]) {
        ctx.propAt(TH.table, [art.x + dx, ground + 1, studio.z0 + 6.5], 0);
        for (const dz of [-0.95, 0.95]) ctx.propAt(TH.chair, [art.x + dx, ground + 1, studio.z0 + 6.5 + dz], dz < 0 ? 0 : 180);
        ctx.propAt(`${PACK.props}/artist-palette.glb`, [art.x + dx, ground + 1.8, studio.z0 + 6.5], dx * 10);
      }
      ctx.landmark('cua-so-phong-mi-thuat', 'Cửa sổ phòng mĩ thuật', art.x, studio.z0 - 1);
      ctx.landmark('vach-cang-tin', 'Vách căng tin', hall.x0 + 5, hall.z0 - 2);
      for (let i = 0; i < 4; i++) {
        ctx.prop(`${N}/sign.glb`, art.x - 15 + i * 9, art.z - 8, 180);
        ctx.prop(`${PACK.props}/artist-palette.glb`, art.x - 13 + i * 9, art.z - 6, 180);
      }
      // The school bus at the kerb, metal gate leaves, bushes by the gate, cars and a second bus along the street.
      ctx.propAt(`${PACK.props}/school-bus.glb`, [MID + 28.5, ground + 1, (STREET.z0 + STREET.z1) / 2 + 2], 90);
      ctx.propAt(`${PACK.props}/school-bus.glb`, [CAMPUS.x0 - 26.5, ground + 1, (STREET.z0 + STREET.z1) / 2 - 2], 270);
      for (const side of [-1, 1]) ctx.propAt(`${PACK.castle}/metal-gate.glb`, [side < 0 ? GATE[0] - 0.5 : GATE[1] + 1.5, ground + 1, CAMPUS.z0 + 2.5], side < 0 ? 90 : 270);
      for (const [x, z] of [[MID - 16, CAMPUS.z0 + 4], [MID + 16, CAMPUS.z0 + 4], [MID - 22, yard.z + 18], [MID + 22, yard.z + 18]] as const) ctx.prop(`${N}/plant_bush.glb`, x, z, 0);
      for (let x = 40; x < SIZE - 40; x += 46) if (Math.abs(x - MID) > 40 && Math.abs(x - CAMPUS.x0 + 26) > 12) ctx.propAt(`${PACK.props}/automobile.glb`, [x + 0.5, ground + 1, STREET.z0 + 2.5], 90);

      // Trees planted round the campus inside its wall, wherever nothing stands (c-01), in pits in the paving,
      // their crowns clear of the wall.
      const plant = (x: number, z: number): void => {
        if (ctx.inZone(x, z, 1) || ctx.nearPath(x, z, 3) || !roomForTree(x, z)) return;
        pitTree(x, z, (x + z) % 3 === 0 ? B.pink : B.leaves);
      };
      for (let x = CAMPUS.x0 + 6; x <= CAMPUS.x1 - 6; x += 8) for (const z of [CAMPUS.z0 + 6, CAMPUS.z1 - 6]) plant(x, z);
      for (let z = CAMPUS.z0 + 14; z <= CAMPUS.z1 - 14; z += 8) for (const x of [CAMPUS.x0 + 6, CAMPUS.x1 - 6]) plant(x, z);

      // 5. The central square (designs/trung-tam/d-*): all paved behind the campus, round the big fountain
      // under the white cat, the canal in front with its bridges, the portals on its sides, the shop, the
      // stalls, the quest board, the gazebo, the stage.
      const P = PLAZA;
      for (let x = CAMPUS.x0 - 14; x <= CAMPUS.x1 + 14; x++) for (let z = CAMPUS.z1 + 1; z <= P.z + P.r + 10; z++) if (!ctx.inWater(x, z)) world.set(x, ctx.surface(x, z), z, B.paver);
      placePlaza(world, P.x, P.z, P.r, ground, { paver: B.cobble, border: B.cobbleGrey });
      ctx.keepOut(CAMPUS.x0 - 14, CAMPUS.z1 + 1, CAMPUS.x1 + 14, P.z + P.r + 10);
      ctx.landmark('quang-truong', 'Quảng trường trung tâm', P.x, P.z - 12);
      const big = placeGrandFountain(world, P.x, P.z, ground + 1, { stone: B.brickGrey, rim: B.cobbleGrey, water: B.water });
      placeCatStatue(world, big.statue[0], big.statue[1], big.statue[2], { stone: B.snow, eye: block('iron') });
      // Round the fountain: banners and planters, benches, lanterns on a ring, hedges with gaps for the ways.
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2 + Math.PI / 12;
        const at = (r: number): [number, number] => [Math.round(P.x + Math.cos(a) * r), Math.round(P.z + Math.sin(a) * r)];
        const [px, pz] = at(10);
        ctx.prop(k % 2 === 0 ? TH.banner : TH.planter, px, pz, Math.round((90 - (a * 180) / Math.PI + 720) % 360));
        const [lx, lz] = at(14.5);
        ctx.prop(STREET_LANTERN, lx, lz, 0);
        if (k % 2 === 1) {
          const [bx, bz] = at(12.5);
          ctx.prop(`${BOX}/park-bench.glb`, bx, bz, Math.round((270 - (a * 180) / Math.PI + 720) % 360));
        }
      }
      for (const deg of [230, 250, 290, 310]) {
        const a = (deg * Math.PI) / 180;
        ctx.prop(TH.planter, Math.round(P.x + Math.cos(a) * 23), Math.round(P.z + Math.sin(a) * 23), 0);
      }
      const ways = [...PORTALS.map((p) => (Math.atan2(p.dz, -p.dir * 27) * 180) / Math.PI), 90, -90, 45, 135, -45, -135];
      for (let deg = -180; deg < 180; deg += 2) {
        if (ways.some((w) => Math.abs(((deg - w + 540) % 360) - 180) < 8)) continue;
        const a = (deg * Math.PI) / 180;
        const [x, z] = [Math.round(P.x + Math.cos(a) * 19), Math.round(P.z + Math.sin(a) * 19)];
        world.set(x, ground + 1, z, deg % 8 === 0 ? B.pink : B.leaves);
        if (deg % 6 === 0) ctx.propAt(FLOWERS[Math.abs(deg / 6) % 3] ?? '', [x + 0.5, ground + 2, z + 0.5], deg + 180);
      }
      // The portals (d-06): stone arches with lanterns and moss, a glowing pane in each, its map's name over it.
      for (const p of PORTALS) {
        const [cx, cz] = portalAt(p);
        const portal = placePortal(world, cx, cz, ground + 1, p.dir, { stone: block('stone'), trim: B.brickGrey, moss: B.leaves, lantern: B.lantern });
        ctx.propAt(TH.portal(p.colour), portal.pane, portal.yaw);
        ctx.propAt(TH.sign(p.to), portal.sign, portal.yaw);
      }
      ctx.landmark('cong-dich-chuyen', 'Cổng dịch chuyển', P.x - 26, P.z);
      // The shop (d-02) on the square's south-west, its front to the east.
      const shop = placeShop(facingWriter(world, SHOP.origin, SHOP.facing), FRAME, FRAME, SHOP.width, ground + 1, {
        wall: B.planks, post: B.log, roof: B.brickRed, floor: B.planks, counter: B.log, stripes: [[B.woodRed, B.snow], [B.roofBlue, B.snow]],
      }, SHOP.size);
      const [sx, sz] = shopAt(shop.sign[0], shop.sign[2]);
      ctx.propAt(TH.shopSign, [sx, shop.sign[1], sz], 270);
      shop.counters.forEach(([u, y, v], i) => {
        for (let k = -1; k <= 1; k++) {
          const [x, z] = shopAt(u + k * 1.6, v);
          ctx.propAt(k === 0 ? TH.crate : [`${PACK.food}/apple.glb`, `${PACK.food}/cupcake.glb`, `${PACK.food}/pear.glb`, `${PACK.food}/bread.glb`][(i * 2 + k + 1) % 4] ?? '', [x, y, z], k * 40);
        }
      });
      for (const [u, y, v] of shop.shelves) {
        const [x, z] = shopAt(u, v);
        ctx.propAt(TH.shelf, [x, y, z], 270);
      }
      for (let k = 0; k < 3; k++) {
        const [x, z] = shopAt(FRAME + 2 + k * 4, FRAME - 3.5);
        ctx.propAt(TH.crate, [x, ground + 1, z], k * 30);
      }
      const [kx, kz] = shopAt(FRAME + 7, FRAME - 4);
      ctx.landmark('cua-hang', 'Cửa hàng', Math.floor(kx), Math.floor(kz));
      // The traders' stalls (d-03) on the north-west, their fronts to the square, their goods in crates beside.
      const awnings = [[B.woodRed, B.snow], [block('wheat'), B.snow]];
      STALLS.forEach((st, i) => {
        const stall = placeStall(world, st.x0, st.z0, 5, 3, ground + 1, { log: B.log, planks: B.planks, stripes: awnings[i] ?? [] });
        for (let k = -1; k <= 1; k++) ctx.propAt(k === 0 ? TH.crate : [`${PACK.food}/apple.glb`, `${PACK.food}/carrot.glb`, `${PACK.food}/watermelon.glb`][(i + k + 1) % 3] ?? '', [stall.counter[0] + k * 1.3, stall.counter[1], stall.counter[2]], k * 50);
        for (const [x, y, z] of stall.crates) ctx.propAt(TH.crate, [x, y - 1, z - 1.2], i * 40);
      });
      ctx.landmark('cho-giao-dich', 'Chợ đổi đồ', P.x - 14, P.z + 15);
      // The quest board (d-04) on the south-east, facing the fountain, a lantern beside it.
      const board = { x: P.x + 22, z: P.z - 18 };
      ctx.prop(TH.questBoard, board.x, board.z, 90);
      ctx.prop(STREET_LANTERN, board.x, board.z - 3, 0);
      for (const dz of [-2, 2]) ctx.prop(`${PACK.survival}/barrel.glb`, board.x + 1, board.z + dz * 1.5, 0);
      ctx.landmark('bang-nhiem-vu', 'Bảng nhiệm vụ', board.x - 3, board.z);
      // The team gazebo (d-05) on the north-east.
      const gz = { x: P.x + 18, z: P.z + 20 };
      const gazebo = placeGazebo(world, gz.x, gz.z, ground + 1, { post: B.log, floor: B.planks, rail: B.log, roof: B.roofBlue, lantern: B.lantern });
      for (const [x, y, z] of gazebo.benches) ctx.propAt(`${BOX}/park-bench.glb`, [x, y, z], 0);
      ctx.centredAt(`${PACK.furniture}/table.glb`, [gz.x + 0.5, ground + 1, gz.z + 0.5], 0);
      for (const dx of [-5, 5]) ctx.prop(STREET_LANTERN, gz.x + dx, gz.z - 4, 0);
      ctx.landmark('cho-to-doi', 'Chòi chờ tổ đội', gz.x, gz.z);
      // The event stage (d-08) on the north side: the screen, bunting, blossom trees, lanterns, banners.
      const stage = placeStage(world, P.x, P.z + 30, ground + 1, 15, { deck: B.planks, edge: B.log, step: B.cobbleGrey });
      ctx.propAt(TH.screen, stage.screen, 0);
      ctx.propAt(TH.bunting, [P.x + 0.5, ground + 6.4, P.z + 30.2], 0);
      for (const side of [-1, 1]) {
        ctx.propAt(TH.bunting, [P.x + side * 8.5, ground + 5.8, P.z + 26], side * 30);
        pitTree(P.x + side * 13, P.z + 36, B.pink);
        pitTree(P.x + side * 20, P.z + 32, B.pink);
        ctx.prop(STREET_LANTERN, P.x + side * 9, P.z + 27, 0);
        ctx.prop(TH.banner, P.x + side * 9, P.z + 37, 0);
      }
      ctx.landmark('san-khau', 'Sân khấu sự kiện', P.x, P.z + 22);
      ctx.propAt(TH.balloon, [P.x + 24.5, ground + 24, P.z + 38.5], 20);
      // Trees in the square's corners, outside the paving's ring.
      for (const [dx, dz] of [[-36, -26], [36, -26], [-34, 30], [34, 30], [-44, 0], [44, 0]] as const) if (roomForTree(P.x + dx, P.z + dz)) pitTree(P.x + dx, P.z + dz, (dx + dz) % 3 === 0 ? B.pink : B.leaves);
      // The central bridge (d-07) and the two beside it, lanterns and banners along, signposts at its foot.
      for (const br of BRIDGES) {
        const bridge = placeArchBridge(world, [br.x, CANAL.z0 - 2], [br.x, CANAL.z1 + 2], WATER_LEVEL + 1, WATER_LEVEL, { stone: B.brickGrey, rail: B.cobbleGrey }, br.width, 2);
        lit(bridge.lamps);
      }
      for (const side of [-1, 1]) {
        ctx.prop(TH.banner, MID + side * 5, CANAL.z1 + 7, 0);
        ctx.prop(TH.banner, MID + side * 5, CANAL.z0 - 8, 0);
        for (let x = CANAL.x0; x <= CANAL.x1; x += 7) if (BRIDGES.every((b) => Math.abs(x - b.x) > b.width)) ctx.prop(TH.planter, x, side < 0 ? CANAL.z0 - 3 : CANAL.z1 + 1, 0);
      }
      ctx.prop(TH.signpostWest, MID - 6, CANAL.z0 - 3, 0);
      ctx.prop(TH.signpostEast, MID + 6, CANAL.z0 - 3, 0);
      ctx.landmark('cau-trung-tam', 'Cầu trung tâm', MID, Math.round((CANAL.z0 + CANAL.z1) / 2), WATER_LEVEL + 3);

      // 6. The town: its cottage quarters, lanes lined with houses; the paddy south of the village.
      for (const lane of TOWN_LANES) streetHouses(ctx, lane);
      for (let x = 40; x <= 250; x++) {
        for (let z = DISTRICT.village.z + 70; z <= DISTRICT.village.z + 150; z++) {
          if ((x - 40) % 12 === 0 || (z - DISTRICT.village.z - 70) % 9 === 0 || ctx.onPath(x, z)) continue;
          world.set(x, ctx.surface(x, z), z, B.water);
          if ((x - 40) % 4 === 2 && (z - DISTRICT.village.z) % 3 === 1) ctx.prop(`${N}/crops_wheatStageB.glb`, x, z, (x * 13) % 360);
        }
      }
      ctx.keepOut(40, DISTRICT.village.z + 70, 250, DISTRICT.village.z + 150);
      ctx.landmark('ruong-lua', 'Ruộng lúa', 145, DISTRICT.village.z + 110);
      bambooHedge(ctx, [[20, STREET.z1 + 6], [20, DISTRICT.hamlet.z + 60]]);

      // The library (north, behind the square): a reading hall; the castle on its hill beyond.
      const lib = DISTRICT.library;
      const reading = { x0: lib.x - 17, z0: lib.z - 7, w: 34, d: 18 };
      placeHouse(world, reading.x0, reading.z0, reading.w, reading.d, 8, ground + 1, { wall: B.sand, roof: B.roofBlue, trim: block('birch-log'), ...finish });
      ctx.keepOut(reading.x0 - 1, reading.z0 - 3, reading.x0 + reading.w, reading.z0 + reading.d);
      // The reading hall: bookcases along its back wall, reading tables with chairs in two rows.
      for (let x = reading.x0 + 1.5; x <= reading.x0 + reading.w - 1.5; x += 1) ctx.propAt(TH.bookcase, [x, ground + 1, reading.z0 + reading.d - 1.25], 0);
      for (let tx = reading.x0 + 5; tx <= reading.x0 + reading.w - 5; tx += 6) {
        if (Math.abs(tx - lib.x) < 3) continue; // the way in from the door
        for (const tz of [reading.z0 + 6, reading.z0 + 11]) {
          ctx.propAt(TH.table, [tx, ground + 1, tz], 0);
          for (const dz of [-0.95, 0.95]) ctx.propAt(TH.chair, [tx, ground + 1, tz + dz], dz < 0 ? 0 : 180);
        }
      }
      for (const x0 of [lib.x - 14, lib.x + 3]) flowerBed(ctx, x0, lib.z - 12, 12, 3);
      ctx.landmark('thu-vien-pho', 'Thư viện', lib.x, lib.z - 8);
      // The castle (d-01's backdrop): a curtain wall, round towers under blue cones with flags, a keep, banners.
      const castle = DISTRICT.castle;
      const castleY = ctx.surface(castle.x, castle.z) + 1;
      for (let x = castle.x - 24; x <= castle.x + 24; x++) {
        for (let z = castle.z - 18; z <= castle.z + 18; z++) {
          const edge = x === castle.x - 24 || x === castle.x + 24 || z === castle.z - 18 || z === castle.z + 18;
          if (!edge || (z === castle.z - 18 && Math.abs(x - castle.x) <= 3)) continue;
          for (let y = castleY; y <= castleY + 6; y++) world.set(x, y, z, block('stone'));
          if ((x + z) % 2 === 0) world.set(x, castleY + 7, z, block('stone'));
        }
      }
      const towerBlocks = { wall: B.cobbleGrey, trim: B.brickGrey, roof: B.roofBlue, glass: block('glass'), flag: B.woodRed, pole: B.log };
      // The corner towers have no door: solid inside (no shut hollow). The keep's door is three wide and high.
      for (const [tx, tz] of [[castle.x - 24, castle.z - 18], [castle.x + 24, castle.z - 18], [castle.x - 24, castle.z + 18], [castle.x + 24, castle.z + 18]] as const) {
        placeTower(world, tx, tz, castleY, 3, 12, towerBlocks, false);
        for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) if (Math.hypot(dx, dz) <= 2.1) fill(world, tx + dx, castleY, tz + dz, tx + dx, castleY + 11, tz + dz, B.cobbleGrey);
      }
      placeTower(world, castle.x, castle.z + 4, castleY, 5, 18, towerBlocks);
      fill(world, castle.x - 1, castleY, castle.z + 4 - 6, castle.x + 1, castleY + 2, castle.z + 4 - 4, 0);
      for (const dx of [-8, 6]) placeBanner(world, castle.x + dx, castleY + 6, castle.z - 19, 'x', { cloth: B.woodRed, emblem: block('wheat') });
      ctx.keepOut(castle.x - 27, castle.z - 21, castle.x + 27, castle.z + 21);
      ctx.landmark('lau-dai-pho', 'Lâu đài', castle.x, castle.z - 18, castleY);

      // The forest (north-east): a dense wood under the waterfall cliff.
      for (let i = 0; i < 260; i++) {
        const x = Math.round(DISTRICT.forest.x - 80 + rng() * 170);
        const z = Math.round(DISTRICT.forest.z - 70 + rng() * 150);
        if (x > SIZE - 14 || z > SIZE - 14 || ctx.inWater(x, z) || ctx.nearPath(x, z, 3) || world.get(x, ctx.surface(x, z) + 1, z) !== 0) continue;
        if (Math.hypot(x - DISTRICT.forest.x - 6, z - DISTRICT.forest.z - 6) < 8) continue; // the bus stop's clearing
        placeTree(world, x, ctx.surface(x, z) + 1, z, treeHeight(rng), { log: B.treeLog, leaves: rng() < 0.3 ? B.pink : B.leaves }, rng);
      }
      const fall = { x: CLIFF.x - 20, z: CLIFF.z - 20 };
      for (let y = ctx.surface(fall.x, fall.z) + 1; y > WATER_LEVEL - 1; y--) for (const dx of [0, 1, 2]) world.set(fall.x + dx, y, fall.z, B.water);
      ctx.keepOut(fall.x - 1, fall.z - 1, fall.x + 3, fall.z + 1);
      ctx.landmark('thac-nuoc', 'Thác nước', fall.x, fall.z);

      // The lake (east): the harbour's piers with boats and sailboats, the lighthouse on its point.
      for (const [i, z] of [360, 400, 440].entries()) jetty(ctx, LAKE.x - LAKE.rx + 4 + i * 2, z, 16, 1, WATER_LEVEL, true);
      // A landing stage from the end of the harbour's way out to the middle pier.
      fill(world, DISTRICT.harbour.x + 1, WATER_LEVEL + 1, DISTRICT.harbour.z - 1, LAKE.x - LAKE.rx + 6, WATER_LEVEL + 1, DISTRICT.harbour.z + 1, B.planks);
      ctx.landmark('ben-tau', 'Bến tàu', LAKE.x - LAKE.rx + 6, 400);
      const point = { x: LAKE.x - 40, z: LAKE.z - LAKE.rz - 8 };
      const lightY = ctx.surface(point.x, point.z) + 1;
      placeLighthouse(world, point.x, point.z, lightY, { red: B.woodRed, white: B.snow, glass: block('glass'), cap: B.roofBlue });
      // Its shaft is too narrow to be a room: solid, the door shut (a landmark seen across the lake).
      for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) for (let y = lightY; y < lightY + 14; y++) if (Math.hypot(dx, dz) <= 2 && world.get(point.x + dx, y, point.z + dz) === 0) world.set(point.x + dx, y, point.z + dz, y < lightY + 3 ? B.woodRed : B.snow);
      ctx.keepOut(point.x - 4, point.z - 4, point.x + 4, point.z + 4);
      ctx.landmark('hai-dang', 'Hải đăng', point.x, point.z);
      for (let i = 0; i < 8; i++) ctx.propAt(`${N}/lily_large.glb`, [LAKE.x + 30 + Math.cos(i) * 20 + 0.5, WATER_LEVEL + 1.02, LAKE.z + Math.sin(i) * 30 + 0.5], i * 45);

      // The market (south of the street): rows of striped stalls piled with produce.
      const stripes = [[B.woodRed, B.snow], [B.roofBlue, B.snow], [B.sand, B.snow]];
      const goods = [`${PACK.food}/apple.glb`, `${PACK.food}/cabbage.glb`, `${PACK.food}/pumpkin.glb`, `${PACK.food}/banana.glb`];
      let s = 0;
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 6; col++) {
          const x0 = DISTRICT.market.x - 64 + col * 22;
          const z0 = DISTRICT.market.z - 40 + row * 22;
          const { counter } = placeStall(world, x0, z0, 6, 4, ground + 1, { log: B.log, planks: B.planks, stripes: stripes[s++ % 3] ?? [] });
          ctx.keepOut(x0 - 1, z0 - 2, x0 + 6, z0 + 4);
          for (let k = 0; k < 4; k++) ctx.propAt(goods[(k + s) % goods.length] ?? '', [counter[0] - 1.5 + k, counter[1], counter[2]], k * 53);
        }
      }
      ctx.landmark('cho-pho', 'Chợ', DISTRICT.market.x, DISTRICT.market.z);
      // The farm (south-east): fenced plots, the windmill, the red barn.
      fieldPlot(ctx, DISTRICT.farm.x - 80, DISTRICT.farm.z - 60, DISTRICT.farm.x - 40, DISTRICT.farm.z - 20, `${N}/crops_cornStageD.glb`);
      fieldPlot(ctx, DISTRICT.farm.x - 30, DISTRICT.farm.z - 60, DISTRICT.farm.x + 10, DISTRICT.farm.z - 20, `${N}/crop_pumpkin.glb`);
      fieldPlot(ctx, DISTRICT.farm.x + 20, DISTRICT.farm.z - 60, DISTRICT.farm.x + 70, DISTRICT.farm.z - 30, `${N}/crop_carrot.glb`);
      const mill = { x: DISTRICT.farm.x + 40, z: DISTRICT.farm.z + 10 };
      const millY = ctx.surface(mill.x, mill.z) + 1;
      placeWindmill(world, mill.x, mill.z, millY, { planks: B.planks, log: B.log, roof: B.brickRed, sail: B.snow });
      fill(world, mill.x - 1, millY, mill.z - 5, mill.x + 1, millY + 2, mill.z - 2, 0); // its door three wide
      ctx.keepOut(DISTRICT.farm.x + 35, DISTRICT.farm.z + 1, DISTRICT.farm.x + 45, DISTRICT.farm.z + 14);
      const barn = { x0: DISTRICT.farm.x - 52, z0: DISTRICT.farm.z + 9, w: 19, d: 13 };
      placeHouse(world, barn.x0, barn.z0, barn.w, barn.d, 7, ground + 1, { wall: B.woodRed, roof: B.brickGrey, trim: B.snow, floor: B.planks });
      ctx.keepOut(barn.x0 - 1, barn.z0 - 3, barn.x0 + barn.w, barn.z0 + barn.d);
      for (const dx of [2.5, 4, barn.w - 3.5]) ctx.propAt(`${PACK.survival}/barrel.glb`, [barn.x0 + dx, ground + 1, barn.z0 + barn.d - 2.5], dx * 30);
      ctx.landmark('nong-trai-pho', 'Nông trại', DISTRICT.farm.x, DISTRICT.farm.z);

      // Last, the main street's houses on both pavements outside the campus (c-13), then the verges of
      // every town way: lanterns, bushes and flowers clear of all the above.
      streetHouses(ctx, [[24, STREET.z0 - 3], [SIZE - 24, STREET.z0 - 3]], { sides: [-1], setback: 5 });
      streetHouses(ctx, [[24, STREET.z1 + 4], [CAMPUS.x0 - 16, STREET.z1 + 4]], { sides: [1], setback: 5 });
      streetHouses(ctx, [[CAMPUS.x1 + 24, STREET.z1 + 4], [SIZE - 24, STREET.z1 + 4]], { sides: [1], setback: 5 });
      for (const route of TOWN_ROUTES) laneVerge(ctx, route);
      // Trees along both pavements between the lanterns, in pits, where no house or garden is within reach.
      for (let x = 27; x < SIZE - 27; x += 26) {
        for (const z of [STREET.z0 - 3, STREET.z1 + 4]) {
          if ((z > STREET.z1 && x >= CAMPUS.x0 - 3 && x <= CAMPUS.x1 + 3) || ctx.inWater(x, z) || ctx.onPath(x, z) || !roomForTree(x, z)) continue;
          pitTree(x, z, Math.floor(x / 26) % 3 === 0 ? B.pink : B.leaves);
        }
      }
    },
  });
}

await runIfMain(import.meta.url, generateSchool);
