// Generates "Núi tuyết" (the snow mountain) from a fixed seed, 800 x 800 blocks after the owner's detail mock
// (designs/nui-tuyet/d-01 … d-15, b-11, c-14, 02/10/2026): a valley under rocky mountains in snow, thick
// snowy pines, a castle on the range far to the north whose cliff pours frozen falls onto a great frozen lake
// with ice floes, a stone viaduct of many arches over the frozen river, and a village of timber chalets
// under deep snow roofs. Five districts, one per chapter:
// - the village (chapter 1, "Làng núi tuyết"), south: the gate of timber and stone with its snowflake banners
//   and guards, the paved square with the clock tower, the warm-clothes shop and the quest station (both
//   walked into), the snowman field, the children's sledding slope, a home with its fireplace.
// - the ski area (chapter 2), west: the long white slope with its slalom flags up to the ridge, the lodge
//   (walked into: reception, chandeliers, fireplace), the cable car's base station and its towers.
// - the frozen lake (chapter 3), north of the village: ice to walk on, the falls down the cliff, the open
//   pool and its floes; west of it the gorge of frozen falls with the plank bridge over it.
// - the ice cave and the research station (chapter 4), east over the viaduct: timber huts, the satellite
//   dish, the red flag, crates; the cave in the rock behind, its hall of glowing crystal.
// - the summit and the observatory (chapter 5), north-west across the gorge: the dome on its rock, the rail
//   along the drop, the ledge where the sun sets over the peaks.
// The cable car links every district (rides from a station in each). Output:
// assets/generated/world/nui-tuyet/{regions/, horizon.bin, entities.json}
import type { VoxelWorld } from '../../packages/voxel/src/chunk-format';
import type { WorldEntities } from '../../packages/voxel/src/world-entities';
import { PACK, runIfMain, smoothstep } from './map-kit';
import { fbm, hashSeed } from './noise';
import { STREET_LANTERN } from './scenery';
import { placeTower } from './structures/landmarks';
import { fillBox } from './structures/lau-dai-castle';
import {
  frameAt,
  frameFor,
  placeChalet,
  placeClockTower,
  placeObservatory,
  placePlankBridge,
  placePlankBridgeX,
  placeSnowWall,
  placeStationShelter,
  placeViaduct,
  placeVillageGate,
  type ChaletBlocks,
  type Rect,
} from './structures/nui-tuyet-buildings';
import { carveIceHall, placeFall, placeFloe, placeSnowPine } from './structures/nui-tuyet-nature';
import { distanceToPath, type Point } from './structures/path';
import { facingOf, facingWriter, FRAME, frameCell, put, turnCell, type Facing } from './structures/world-writer';
import { animal, crowd, person, type Resident } from './village-life';
import { generateZoneMap, type Zone, type ZoneMapContext } from './zone-map';

export const MAP_ID = 'nui-tuyet';
const SIZE = 800;
/** The valley floor every district stands on; feet stand one block over it. */
const LEVEL = 16;
const TOP = LEVEL + 1;
const SEED = hashSeed('miu-nui-tuyet-land');
const SPAWN = { x: 400, z: 726 };

export const ZONES: readonly Zone[] = [
  { chapter: 1, id: 'lang-nui-tuyet', name: 'Làng núi tuyết', x: 400, z: 610, hx: 56, hz: 42 },
  { chapter: 2, id: 'khu-truot-tuyet', name: 'Khu trượt tuyết', x: 170, z: 482, hx: 52, hz: 38 },
  { chapter: 3, id: 'ho-bang', name: 'Hồ băng', x: 400, z: 420, hx: 60, hz: 36 },
  { chapter: 4, id: 'hang-bang-tram-tham-hiem', name: 'Hang băng và trạm thám hiểm', x: 650, z: 524, hx: 54, hz: 40 },
  { chapter: 5, id: 'dinh-nui', name: 'Đỉnh núi và đài quan sát', x: 180, z: 196, hx: 48, hz: 32 },
];

/** The frozen lake (an ellipse), the open pool at the foot of the running fall, the cliff's last row. */
const LAKE = { x: 400, z: 330, rx: 88, rz: 64 };
/** The lake's north part, under the falls, is open water; the rest is ice to walk on. */
const OPEN_WATER_Z = 300;
const CLIFF_Z = 261;
/** The gorge under the ski mountain's north face, and the frozen river from the lake's east end. */
const GORGE: Point[] = [[0, 272], [150, 268], [240, 271], [300, 277], [342, 292]];
const RIVER: Point[] = [[486, 332], [528, 338], [560, 362], [560, 799]];
const RIVER_X = 560;
/** The rock east of the river the ice cave is cut into: its hall and the tunnel from its south face. */
const MASSIF = { x0: 648, z0: 296, x1: 799, z1: 474 };
const CAVE: Rect = { x0: 668, z0: 398, x1: 716, z1: 452 };
const CAVE_X = 690;
/** The cable car's line from the ski area up over the ridge, down across the gorge to the summit. */
const CABLE_X = 140;
const CABLE_TOWERS = [410, 382, 354, 326, 300, 270, 250];

/** The village's places (chapter 1): the gate, the square, the shop, the quest station, the clock tower. */
const GATE_Z = 650;
const SQUARE = { x: 400, z: 626, r: 12 };
const SHOP: Rect = { x0: 417, z0: 616, x1: 431, z1: 632 };
const STATION: Rect = { x0: 369, z0: 616, x1: 383, z1: 632 };
const HOME: Rect = { x0: 352, z0: 572, x1: 364, z1: 582 };
const CLOCK = { x: 412, z: 604 };
const SLED_SLOPE: Rect = { x0: 354, z0: 634, x1: 371, z1: 648 };
const SNOWMEN: Rect = { x0: 416, z0: 634, x1: 442, z1: 648 };
/** The lodge by the ski area (its door on the west side), the summit's rock, the research huts. */
const LODGE: Rect = { x0: 174, z0: 394, x1: 194, z1: 410 };
const SUMMIT_ROCK: Rect = { x0: 164, z0: 136, x1: 196, z1: 162 };
const OBSERVATORY = { x: 180, z: 147, r: 5 };
const HUT: Rect = { x0: 636, z0: 494, x1: 658, z1: 508 };
const HUT_B: Rect = { x0: 664, z0: 498, x1: 678, z1: 508 };

/** The cable car's stations, one per district: a shelter of 29 x 9 from `x0` along row `z`. */
const STATIONS: ReadonlyArray<{ chapter: number; x0: number; z: number }> = [
  { chapter: 1, x0: 356, z: 694 },
  { chapter: 2, x0: 126, z: 434 },
  { chapter: 3, x0: 468, z: 416 },
  { chapter: 4, x0: 606, z: 574 },
  { chapter: 5, x0: 126, z: 236 },
];
const CABIN_SLOTS = [3, 9, 19, 25];
const stationRect = (s: { x0: number; z: number }): Rect => ({ x0: s.x0, z0: s.z - 4, x1: s.x0 + 28, z1: s.z + 4 });
/** Ground made level (stations with the ground before them, the lodge with its forecourt). */
const LEVEL_PADS: readonly Rect[] = [...STATIONS.map((s) => ({ ...stationRect(s), z1: s.z + 10 })), { x0: LODGE.x0 - 6, z0: LODGE.z0, x1: LODGE.x1, z1: LODGE.z1 }];

// The ways: the main road from the spawn through the gate, the square and on to the lake; the lanes west to
// the ski area and east over the river to the research station; the lake road over the viaduct; the trail
// round the lake's west end over the gorge to the summit.
const MAIN_ROAD: Point[] = [[SPAWN.x, SPAWN.z], [400, 396]];
const WEST_LANE: Point[] = [[400, 588], [240, 588], [206, 522]];
const EAST_LANE: Point[] = [[400, 588], [640, 588], [640, 566]];
const SKI_ROAD: Point[] = [[222, 470], [340, 428]];
const LAKE_ROAD: Point[] = [[460, 430], [600, 430], [620, 486]];
const SHORE_WALK: Point[] = [[340, 402], [460, 402]];
const SUMMIT_TRAIL: Point[] = [[340, 414], [308, 398], [308, 252], [262, 230], [226, 214]];
const CAVE_WALK: Point[] = [[620, 486], [652, 522], [CAVE_X, 500], [CAVE_X, 480]];
const ROUTES: Point[][] = [MAIN_ROAD, WEST_LANE, EAST_LANE, SKI_ROAD, LAKE_ROAD, SHORE_WALK, SUMMIT_TRAIL, CAVE_WALK];

const N = PACK.nature;
const BX = PACK.box;
const P = PACK.props;
const M = {
  cabin: `${BX}/ntu-cable-cabin.glb`,
  cable: `${BX}/ntu-cable-bit.glb`,
  banner: `${BX}/ntu-snowflake-banner.glb`,
  bannerPole: `${BX}/ntu-banner-pole.glb`,
  slalom: `${BX}/ntu-red-flag.glb`,
  snowman: `${BX}/ntu-snowman.glb`,
  snowboard: `${BX}/ntu-snowboard.glb`,
  skiRack: `${BX}/ntu-ski-rack.glb`,
  sled: `${BX}/ntu-sled.glb`,
  wallLantern: `${BX}/ntu-wall-lantern.glb`,
  clock: `${BX}/ntu-clock-face.glb`,
  telescope: `${BX}/ntu-dome-telescope.glb`,
  dish: `${BX}/ntu-radar-dish.glb`,
  crate: `${BX}/ntu-snow-crate.glb`,
  fire: `${BX}/ntu-hearth-fire.glb`,
  armchair: `${BX}/ntu-armchair.glb`,
  jackets: `${BX}/ntu-jacket-rail.glb`,
  knits: `${BX}/ntu-knit-shelf.glb`,
  boots: `${BX}/ntu-boots.glb`,
  innSign: `${BX}/ntu-inn-sign.glb`,
  mapPoster: `${BX}/ntu-map-poster.glb`,
  shield: `${BX}/ntu-snowflake-shield.glb`,
  emblem: `${BX}/ntu-gate-emblem.glb`,
  icicles: `${BX}/ntu-icicles.glb`,
  crystal: `${BX}/ntu-crystal.glb`,
  mound: `${BX}/ntu-snow-mound.glb`,
  youngPine: `${BX}/ntu-snow-pine.glb`,
  wheel: `${BX}/ntu-bull-wheel.glb`,
  explorerSign: `${BX}/ntu-explorer-sign.glb`,
  redFlag: `${BX}/ntu-red-flagpole.glb`,
  skiPoles: `${BX}/ntu-ski-poles.glb`,
  chandelier: `${BX}/ld-chandelier.glb`,
  mapTable: `${BX}/ld-map-table.glb`,
  folded: `${BX}/cp-folded-clothes.glb`,
  hat: `${BX}/cp-hat-blue.glb`,
  jarShelf: `${BX}/kr-jar-shelf.glb`,
  logBench: `${BX}/kr-log-bench.glb`,
  rug: `${BX}/xma-rug.glb`,
  diningTable: `${BX}/xma-dining-table.glb`,
  smallClock: `${P}/alarm-clock.glb`,
  bench: `${BX}/park-bench.glb`,
  flag: `${PACK.castle}/flag.glb`,
  table: `${PACK.furniture}/table.glb`,
  plant: `${PACK.furniture}/pottedPlant.glb`,
  barrel: `${PACK.survival}/barrel.glb`,
  bucket: `${PACK.survival}/bucket.glb`,
  box: `${PACK.survival}/box-large.glb`,
  chest: `${PACK.survival}/chest.glb`,
  tent: `${PACK.survival}/tent.glb`,
  campfire: `${PACK.survival}/campfire-pit.glb`,
  workbench: `${PACK.survival}/workbench.glb`,
  logs: `${N}/log_stack.glb`,
  rock: `${N}/rock_smallA.glb`,
  rockLarge: `${N}/rock_largeA.glb`,
  stump: `${N}/stump_round.glb`,
  fence: `${N}/fence_simple.glb`,
  book: `${P}/open-book.glb`,
  books: `${P}/books.glb`,
  globe: `${P}/globe.glb`,
  soup: `${PACK.food}/bowl-soup.glb`,
  bread: `${PACK.food}/bread.glb`,
  stew: `${PACK.food}/pot-stew.glb`,
};
const HELD = {
  poles: M.skiPoles,
  book: M.book,
  basket: `${P}/basket.glb`,
  bucket: `${PACK.survival}/bucket.glb`,
  crate: `${PACK.survival}/box.glb`,
  log: `${PACK.survival}/tree-log.glb`,
  axe: `${PACK.survival}/tool-axe.glb`,
  balloon: `${P}/balloon.glb`,
  spoon: `${PACK.food}/cooking-spoon.glb`,
  paddle: `${N}/canoe_paddle.glb`,
};
/** Animals of the cube pets pack the village-life helper has no name for. */
const pet = (kind: 'penguin' | 'polar' | 'fox' | 'bunny' | 'deer'): string => `${PACK.pets}/animal-${kind}.glb`;

const inRect = (x: number, z: number, r: Rect, pad = 0): boolean => x >= r.x0 - pad && x <= r.x1 + pad && z >= r.z0 - pad && z <= r.z1 + pad;
const lakeE = (x: number, z: number): number => Math.hypot((x - LAKE.x) / LAKE.rx, (z - LAKE.z) / LAKE.rz);
const inLake = (x: number, z: number): boolean => lakeE(x, z) <= 1;
const inOpenWater = (x: number, z: number): boolean => lakeE(x, z) <= 1 && z < OPEN_WATER_Z + Math.round(4 * Math.sin(x / 11));
const gorgeFloor = (x: number): number => LEVEL - 6 + Math.round(5 * smoothstep(318, 338, x));
const riverFloor = (x: number, z: number): number => LEVEL - 7 + (z < 346 ? Math.round(6 * smoothstep(530, 488, x)) : 0);

/**
 * The land: the valley floor round the districts; the ski mountain west of the lake, rising in a long white
 * slope from the ski area to a ridge whose north face drops into the gorge; the range north of the lake, a
 * cliff over its north shore; the land falling away north and west of the summit (its view); the frozen
 * lake one block down; the river's valley; the rock east of it the cave is cut into.
 */
function shapeLand(x: number, z: number, h: number): number {
  let out = h;
  const skiW = smoothstep(24, 64, x) * smoothstep(300, 265, x);
  if (skiW > 0 && z > 250 && z < 444) {
    const rise = smoothstep(436, 350, z);
    const face = smoothstep(282, 284, z);
    out = Math.max(out, LEVEL + Math.round(16 * rise * face * skiW));
  }
  if (z <= CLIFF_Z) {
    const east = smoothstep(310, 320, x);
    const top = LEVEL + 14 + Math.round(2 * smoothstep(232, 196, z)) + Math.floor(fbm(SEED, x / 23, z / 19) * 2.5);
    out = out * (1 - east) + top * east;
  }
  // North and west of the summit the ground falls away: the observatory looks out over it.
  const view = Math.max(smoothstep(131, 124, z) * smoothstep(312, 280, x), smoothstep(118, 110, x) * (z < 262 ? 1 : 0));
  out -= 12 * view;
  const g = distanceToPath(GORGE, x, z);
  if (g < 11) {
    const wall = smoothstep(5, 10, g);
    out = gorgeFloor(x) * (1 - wall) + out * wall;
  }
  const e = lakeE(x, z);
  if (e <= 1) out = LEVEL - 1;
  else if ((e - 1) * 64 < 3) out = Math.min(out, LEVEL);
  const r = distanceToPath(RIVER, x, z);
  if (r < 14) {
    const wall = smoothstep(4, 14, r);
    out = riverFloor(x, z) * (1 - wall) + Math.min(out, LEVEL) * wall;
  }
  const mx = Math.max(0, MASSIF.x0 - x);
  const mn = Math.max(0, MASSIF.z0 - z);
  const ms = Math.max(0, z - MASSIF.z1);
  const mass = (1 - smoothstep(0, 12, mx)) * (1 - smoothstep(0, 12, mn)) * (1 - smoothstep(0, 2.5, ms));
  if (mass > 0) out = Math.max(out, out * (1 - mass) + (LEVEL + 16) * mass);
  // Level ground under the cable car's stations and the lodge.
  for (const r of LEVEL_PADS) {
    const d = Math.hypot(Math.max(0, r.x0 - x, x - r.x1), Math.max(0, r.z0 - z, z - r.z1));
    if (d < 6) {
      const k = smoothstep(2, 6, d);
      out = out * k + LEVEL * (1 - k);
    }
  }
  return out;
}

/** Ground that is no place for a house or a tree: the lake, the pool, the river's valley, the gorge. */
const wet = (x: number, z: number): boolean => lakeE(x, z) < 1.06 || distanceToPath(RIVER, x, z) < 15 || distanceToPath(GORGE, x, z) < 12;

/** The quest cast's animals are placed as villagers are; their own routines name their places otherwise. */
const SPOT_NAMES: Readonly<Record<string, readonly string[]>> = { fox: ['den', 'lookout'], deer: ['graze-b'], bunny: ['bush-b'] };

export async function generateNuiTuyet(): Promise<{ world: VoxelWorld; entities: WorldEntities }> {
  const zoneById = new Map(ZONES.map((zn) => [zn.chapter, zn]));
  const zoneName = (chapter: number): string => zoneById.get(chapter)?.name ?? '';
  const map = await generateZoneMap({
    mapId: MAP_ID,
    region: 'nui-tuyet',
    seedText: 'miu-nui-tuyet',
    // The castle theme's land is the hilliest, rock showing high on it: the mountains carry on past the edge.
    outland: 'castle',
    soil: { grass: 'grass-snow', path: 'cobble-grey' },
    ground: { ground: LEVEL, roll: 3 },
    zones: ZONES,
    spawn: { x: SPAWN.x, z: SPAWN.z, yaw: 180 },
    shape: shapeLand,
    water: { level: LEVEL - 1, covers: inOpenWater },
    pathsFromSpawn: false,
    routes: ROUTES,
    // The cable car links every district: from each station a cabin to each other one.
    rides: {
      vehicle: { name: 'Cáp treo', label: 'Lên cáp treo', model: M.cabin },
      stops: STATIONS.flatMap((from) =>
        STATIONS.filter((to) => to !== from).map((to, i) => ({
          name: to.chapter === 1 ? `Cáp treo về ${zoneName(1)}` : `Cáp treo tới ${zoneName(to.chapter)}`,
          at: [from.x0 + (CABIN_SLOTS[i] ?? 3), from.z] as const,
          to: [to.x0 + 12, to.z + 6] as const,
        })),
      ),
    },
    trees: { skip: 1, blocks: (_roll, block) => ({ log: block('tree-log'), leaves: block('leaves') }) },
    dressing: { models: [M.youngPine, M.mound, M.rock, M.mound, M.stump, M.youngPine], spacing: 9 },
    sizes: { [M.telescope]: 5, [M.chandelier]: 3.2, [M.dish]: 8, [M.jackets]: 2.6, [M.knits]: 3, [M.mapPoster]: 2, [M.crystal]: 3.6 },
    life: ({ landmark }) => cast(landmark),
    build: (ctx) => buildSnowMountain(ctx),
  });
  // Foxes, deer and bunnies go to their own routines' places.
  const ambients = map.entities.ambients?.map((a) => {
    const names = SPOT_NAMES[a.routine];
    if (!names) return a;
    const work = [a.spots['work-a'], a.spots['work-b']];
    const spots = Object.fromEntries(names.flatMap((name, i) => (work[i] ? [[name, work[i]]] : [])));
    return { ...a, spots };
  });
  // Inside the ice cave the light dims, so its crystals glow as in d-09.
  const moods = [{ mood: 'cave' as const, ...CAVE }];
  return { world: map.world, entities: { ...map.entities, ...(ambients ? { ambients } : {}), moods } };
}

function cast(landmark: (id: string) => readonly [number, number]): Resident[] {
  const at = (id: string, dx = 0, dz = 0): readonly [number, number] => {
    const [x, z] = landmark(id);
    return [x + dx, z + dz] as const;
  };
  return [
    // The village gate: a guard each side in warm coats, a dog.
    { routine: 'sentry', name: 'Chú lính gác cổng làng', model: person('d'), at: [394, GATE_Z + 5] as const, visits: [[393, GATE_Z + 6], [394, GATE_Z + 5]] as const },
    { routine: 'sentry', name: 'Cô lính gác cổng làng', model: person('g'), at: [406, GATE_Z + 5] as const, visits: [[407, GATE_Z + 6], [406, GATE_Z + 5]] as const },
    ...crowd('dog', ['Cún trông cổng'], [animal('dog')], at('cong-vao', 0, 8), 4, 1),
    // The square: people in winter coats out for the morning, the clock tower's keeper, children.
    ...crowd('shopper', ['Bà đi mua khăn len', 'Chú dạo quảng trường', 'Cô ngắm tháp đồng hồ', 'Bác đi chợ sớm'], [person('l'), person('k'), person('i'), person('m')], at('quang-truong-lang'), 9, 4, [HELD.basket]),
    ...crowd('pupil', ['Bạn nhỏ chơi quanh đài băng', 'Bạn nhỏ nặn tuyết'], [person('n'), person('q'), person('f')], at('quang-truong-lang', 0, -6), 8, 3),
    ...crowd('sweeper', ['Chú xúc tuyết trên phố', 'Cô quét tuyết trước cửa'], [person('b'), person('e')], at('pho-lang'), 10, 2),
    ...crowd('porter', ['Bác vác củi sưởi', 'Chú chở củi về nhà'], [person('j'), person('a')], at('pho-lang', 0, 14), 12, 2, [HELD.log]),
    ...crowd('cat', ['Mèo sưởi nắng hiên nhà', 'Mèo nằm trên bậu cửa'], [animal('cat')], at('pho-lang'), 14, 3),
    ...crowd('dog', ['Cún chạy trong tuyết'], [animal('dog')], at('quang-truong-lang'), 16, 2),
    // The shop, the quest station and the home.
    { routine: 'vendor', name: 'Cô bán đồ ấm', model: person('e'), at: at('trong-cua-hang', 5, 0), facing: at('trong-cua-hang', -2, 0), visits: [at('trong-cua-hang', 5, -3), at('trong-cua-hang', 5, 3)] },
    ...crowd('shopper', ['Bạn thử áo khoác', 'Mẹ mua mũ len cho bé'], [person('o'), person('h')], at('trong-cua-hang', -1, 0), 2, 2, [HELD.basket]),
    { routine: 'reader', name: 'Bác kiểm lâm trạm nhiệm vụ', model: person('c'), held: [HELD.book], at: at('trong-tram-nhiem-vu', -3, 0), visits: [at('trong-tram-nhiem-vu', -3, -3), at('trong-tram-nhiem-vu', -3, 3)] },
    { routine: 'home-cook', name: 'Bà nấu súp nóng', model: person('h'), held: [HELD.spoon], at: at('trong-nha-dan', 2, 0), visits: [at('trong-nha-dan', 2, -2), at('trong-nha-dan', -2, 1)] },
    ...crowd('cat', ['Mèo cuộn tròn bên lò sưởi'], [animal('cat')], at('trong-nha-dan', 0, -2), 1, 1),
    // The snowman field and the sledding slope.
    ...crowd('pupil', ['Bạn lăn quả cầu tuyết', 'Bạn đắp người tuyết', 'Bạn ném bóng tuyết'], [person('r'), person('p'), person('q')], at('nguoi-tuyet'), 7, 3),
    ...crowd('pupil', ['Bạn kéo xe trượt', 'Bạn trượt dốc nhỏ', 'Bạn đợi lượt trượt'], [person('f'), person('o'), person('n')], at('doc-truot-nho'), 6, 3),
    // Between the village and the lake: houses along the road.
    ...crowd('shopper', ['Cô đi dạo ven hồ', 'Ông dắt cháu ra hồ'], [person('i'), person('m')], [400, 520], 10, 2),
    ...crowd('sweeper', ['Chú dọn tuyết lối đi'], [person('b')], [400, 480], 8, 1),
    ...crowd('dog', ['Chó săn tuyết'], [animal('dog')], [400, 540], 12, 2),
    // The cable car: a station keeper at each.
    ...STATIONS.map((s): Resident => ({ routine: 'sentry', name: 'Chú trực ga cáp treo', model: person(['c', 'k', 'd', 'j', 'g'][s.chapter - 1] ?? 'c'), at: [s.x0 + 14, s.z + 7] as const })),

    // The ski area: the instructor and the children on skis and boards, the lodge's people.
    ...crowd('teacher', ['Thầy dạy trượt tuyết'], [person('a')], at('doc-truot-tuyet'), 4, 1, [HELD.poles]),
    ...crowd('pupil', ['Bạn tập trượt tuyết', 'Bạn trượt ván', 'Bạn đeo kính trượt tuyết'], [person('f'), person('n'), person('o'), person('p'), person('q'), person('r')], at('doc-truot-tuyet', 0, 10), 12, 6, [HELD.poles]),
    ...crowd('pupil', ['Bạn trượt ván trên dốc'], [person('r'), person('f')], at('dinh-doc', 0, 24), 10, 2, [HELD.poles]),
    { routine: 'vendor', name: 'Cô lễ tân nhà nghỉ', model: person('l'), at: at('trong-nha-nghi', 10, 0), facing: at('trong-nha-nghi', 6, 0), visits: [at('trong-nha-nghi', 10, -4), at('trong-nha-nghi', 10, 4)] },
    ...crowd('shopper', ['Khách nghỉ chân sưởi ấm', 'Khách đặt phòng'], [person('k'), person('i')], at('trong-nha-nghi', -2, -2), 3, 2),
    ...crowd('porter', ['Chú cho thuê ván trượt', 'Anh mang ván trượt'], [person('j'), person('b')], at('truoc-nha-nghi'), 6, 2, [M.snowboard]),
    ...crowd('dog', ['Chó cứu hộ'], [animal('dog')], at('doc-truot-tuyet'), 14, 2),
    ...crowd('bunny', ['Thỏ tuyết'], [pet('bunny')], at('doc-truot-tuyet', -40, 20), 10, 3),

    // The frozen lake: ice fishers, skaters, penguins on the ice, walkers on the shore.
    ...crowd('fisher', ['Ông câu cá trên băng', 'Bác câu cá lỗ băng'], [person('m'), person('a')], at('giua-ho-bang', 0, 30), 10, 3, [HELD.paddle]),
    ...crowd('pupil', ['Bạn trượt băng', 'Bạn tập trượt băng'], [person('f'), person('q'), person('o'), person('r')], at('giua-ho-bang', 0, 40), 12, 4),
    ...crowd('penguin', ['Chim cánh cụt', 'Chim cánh cụt con'], [pet('penguin')], at('giua-ho-bang', 0, 44), 14, 12),
    ...crowd('penguin', ['Chim cánh cụt bên thác'], [pet('penguin')], at('chan-thac-bang', 10, 8), 8, 5),
    ...crowd('shopper', ['Cô dạo bờ hồ', 'Chú ngắm thác băng'], [person('i'), person('k')], at('bo-ho-bang'), 10, 2),
    ...crowd('sweeper', ['Chú quét tuyết bờ hồ'], [person('b')], at('bo-ho-bang', 20, 0), 6, 1),
    ...crowd('deer', ['Nai tuyết bên vực'], [pet('deer')], at('vuc-thac-bang', -10, -14), 10, 3),

    // The research station and the ice cave: explorers, scientists, sled dogs; polar bears and foxes about.
    ...crowd('porter', ['Nhà thám hiểm khuân thùng', 'Cô thám hiểm kéo xe trượt'], [person('j'), person('g'), person('k')], at('tram-tham-hiem'), 8, 3, [HELD.crate]),
    ...crowd('reader', ['Nhà khoa học đọc bản đồ', 'Cô nghiên cứu băng'], [person('c'), person('e')], at('tram-tham-hiem', 10, 4), 5, 2, [HELD.book]),
    ...crowd('teacher', ['Bác trưởng trạm thám hiểm'], [person('a')], at('tram-tham-hiem', -6, 6), 3, 1, [HELD.book]),
    ...crowd('sentry', ['Chú dẫn đường vào hang'], [person('d')], at('cua-hang-bang'), 3, 1),
    ...crowd('dog', ['Chó kéo xe trượt'], [animal('dog')], at('tram-tham-hiem', -18, 10), 6, 4),
    ...crowd('polar-bear', ['Gấu trắng', 'Gấu trắng con'], [pet('polar')], at('cua-hang-bang', 26, 20), 10, 4),
    ...crowd('fox', ['Cáo tuyết'], [pet('fox')], at('tram-tham-hiem', 34, 26), 12, 3),
    ...crowd('penguin', ['Chim cánh cụt lạc đàn'], [pet('penguin')], at('tram-tham-hiem', 20, 30), 6, 3),

    // The summit: the astronomer, children at the rail, deer and foxes on the plateau.
    ...crowd('reader', ['Nhà thiên văn'], [person('c')], at('dai-quan-sat'), 3, 1, [HELD.book]),
    ...crowd('pupil', ['Bạn ngắm núi xa', 'Bạn chụp ảnh tuyết'], [person('n'), person('p'), person('q')], at('san-dinh-nui'), 10, 3),
    ...crowd('teacher', ['Cô hướng dẫn leo núi'], [person('e')], at('san-dinh-nui', 6, 6), 4, 1, [HELD.poles]),
    ...crowd('deer', ['Nai núi'], [pet('deer')], at('san-dinh-nui', -30, 10), 12, 3),
    ...crowd('fox', ['Cáo tuyết đỉnh núi'], [pet('fox')], at('san-dinh-nui', 30, 18), 10, 2),
    ...crowd('bunny', ['Thỏ trắng'], [pet('bunny')], at('san-dinh-nui', 20, -10), 8, 3),
  ];
}

function buildSnowMountain(ctx: ZoneMapContext): void {
  const { world, block, rng } = ctx;
  const B = {
    snow: block('snow'), ice: block('ice'), crystal: block('crystal'), stone: block('stone'), cobble: block('cobble-grey'), brick: block('brick-grey'),
    planks: block('planks'), log: block('log'), woodRed: block('wood-red'), lantern: block('lantern'), iron: block('iron'), water: block('water'),
    glass: block('glass'), leaves: block('leaves'), trunk: block('tree-log'), sand: block('sand'), red: block('brick-red'), blue: block('roof-blue'),
    grass: ctx.soil.grass, path: ctx.soil.path, paver: block('paver'), needles: block('board'),
  };
  const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, id: number): void => fillBox(world, x0, y0, z0, x1, y1, z1, id);
  /** Blue-grey rock of the cliffs (d-07, d-08): grey stone, dressed stone, dark stone. */
  const rock = (x: number, y: number, z: number): number => {
    const r = (x * 7 + y * 13 + z * 11) % 17;
    return r < 2 ? B.iron : r < 7 ? B.brick : B.cobble;
  };
  const surface = ctx.surface;
  /** Places nothing else may take (stations, slopes, fields): houses and pines keep out, quests may stand. */
  const reserved: Rect[] = [];
  const reservedAt = (x: number, z: number, pad = 0): boolean => reserved.some((r) => inRect(x, z, r, pad));
  const keep = (r: Rect, pad = 0): void => ctx.keepOut(r.x0 - pad, r.z0 - pad, r.x1 + pad, r.z1 + pad);
  const lamp = (x: number, z: number): void => ctx.prop(STREET_LANTERN, x, z, 0);
  /** A lantern on a wall: `back` is the way to the wall from the lantern. */
  const wallLantern = (x: number, y: number, z: number, back: 'x-' | 'x+' | 'z-' | 'z+'): void => {
    const yaw = { 'x-': 90, 'x+': 270, 'z-': 0, 'z+': 180 }[back];
    ctx.propAt(M.wallLantern, [x, y, z], yaw);
  };
  const chaletBlocks = (n: number, window = B.lantern): ChaletBlocks => ({
    stone: B.cobble,
    timber: n % 3 === 2 ? B.woodRed : B.planks,
    post: B.log,
    roof: B.snow,
    eave: B.log,
    window,
    floor: B.planks,
    chimney: B.brick,
  });
  /** A chalet over the rectangle, its door toward `facing`; returns the world cells of its front. */
  const chalet = (r: Rect, facing: Facing, wall: number, b: ChaletBlocks, stoneCourses = 1) => {
    const { origin, w, d } = frameFor(r, facing);
    const c = placeChalet(facingWriter(world, origin, facing), FRAME, FRAME, w, d, wall, TOP, b, stoneCourses);
    const toWorld = ([u, v]: readonly [number, number]): [number, number] => frameCell(origin, facing, u, v);
    keep(r, 1);
    return { door: toWorld(c.door), doorCells: c.doorCells.map(toWorld), lamps: c.lamps.map(toWorld), eaves: c.eaves, ridge: c.ridge, origin, w, d };
  };

  // ---------------------------------------------------------------------------------------------------
  // The village's places first (the welcome quest stands round them; the review page shows the first ones).
  ctx.landmark('cong-vao', 'Cổng vào núi tuyết', 400, GATE_Z - 4);
  ctx.landmark('quang-truong-lang', 'Quảng trường làng tuyết', 400, SQUARE.z + 7);
  ctx.landmark('tram-nhiem-vu', 'Trạm nhiệm vụ', STATION.x1 + 3, 624);
  ctx.landmark('truoc-cua-hang-do-am', 'Trước cửa hàng đồ ấm', SHOP.x0 - 3, 624);
  ctx.landmark('nguoi-tuyet', 'Bãi người tuyết', 425, 641);
  ctx.landmark('doc-truot-nho', 'Dốc trượt nhỏ đầu làng', 377, 641);

  // ---------------------------------------------------------------------------------------------------
  // The ground: rock where it is steep, ice on the lake, the river and the gorge's floor, snow on the banks.
  for (let x = 0; x < SIZE; x++) {
    for (let z = 0; z < SIZE; z++) {
      const y = surface(x, z);
      if (ctx.inWater(x, z)) continue;
      const steep = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx = 0, dz = 0]) => Math.abs(surface(x + dx, z + dz) - y) >= 2);
      if (inLake(x, z) || (distanceToPath(RIVER, x, z) < 4.5 && y <= LEVEL - 1) || (distanceToPath(GORGE, x, z) < 5.5 && y <= LEVEL - 1)) {
        put(world, x, y, z, B.ice);
        continue;
      }
      if (world.get(x, y, z) === block('sand')) put(world, x, y, z, B.snow);
      if (ctx.onPath(x, z)) continue;
      const lower = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx = 0, dz = 0]) => surface(x + dx, z + dz) < y);
      if (steep) {
        const foot = Math.min(...[[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx = 0, dz = 0]) => surface(x + dx, z + dz)));
        for (let yy = Math.min(foot, y - 2); yy <= y; yy++) put(world, x, yy, z, rock(x, yy, z));
        // Snow lies on the ledges of the rock.
        if ((x * 3 + z * 5) % 3 === 0) put(world, x, y, z, B.snow);
      } else if (lower || y >= LEVEL + 2) put(world, x, y, z, B.snow);
    }
  }

  // ---------------------------------------------------------------------------------------------------
  // The village gate (d-03): stone pillars, a timber beam under a snow roof with the snowflake over the way,
  // blue snowflake banners and lanterns on the pillars, low stone walls under snow either side.
  const gate = placeVillageGate(world, 400, GATE_Z, TOP, { stone: B.cobble, post: B.log, roof: B.snow, eave: B.log }, 1);
  ctx.propAt(M.emblem, gate.emblem, 0);
  for (const [px, pz] of gate.pillars) {
    ctx.propAt(M.banner, [px + 0.5, TOP + 2.2, pz + 0.15], 0);
    wallLantern(px + (px < 400 ? 1.9 : -0.9), TOP + 2.6, pz + 0.45, 'z-');
  }
  placeSnowWall(world, 352, gate.edges[0] - 1, GATE_Z + 1, surface, 3, { stone: B.cobble, snow: B.snow });
  placeSnowWall(world, gate.edges[1] + 1, 448, GATE_Z + 1, surface, 3, { stone: B.cobble, snow: B.snow });
  ctx.keepOut(352, GATE_Z, 448, GATE_Z + 2);
  ctx.keepOut(372, GATE_Z + 3, 428, GATE_Z + 16);
  for (const x of [380, 420]) ctx.propAt(M.banner, [x + 0.5, TOP + 0.3, GATE_Z + 2.15], 0);
  for (const x of [388, 412]) lamp(x, GATE_Z + 4);

  // The square (d-02): paved in grey stone, the frozen basin with the ice snowflake in its middle, benches,
  // lamps and snowflake banners on poles round it; the clock tower over it.
  for (let x = STATION.x1 + 1; x < SHOP.x0; x++) for (let z = 612; z <= GATE_Z - 1; z++) put(world, x, LEVEL, z, (x * 5 + z * 3) % 11 === 0 ? B.paver : B.cobble);
  for (let dx = -SQUARE.r; dx <= SQUARE.r; dx++) {
    for (let dz = -SQUARE.r; dz <= SQUARE.r; dz++) {
      const d = Math.hypot(dx, dz);
      if (d <= SQUARE.r && Math.abs(d - SQUARE.r + 1) < 0.6) put(world, SQUARE.x + dx, LEVEL, SQUARE.z + dz, B.paver);
    }
  }
  for (let dx = -3; dx <= 3; dx++) {
    for (let dz = -3; dz <= 3; dz++) {
      const d = Math.hypot(dx, dz);
      if (d > 3.3) continue;
      if (d > 2.4) put(world, SQUARE.x + dx, TOP, SQUARE.z + dz, B.cobble);
      else put(world, SQUARE.x + dx, TOP, SQUARE.z + dz, B.ice);
    }
  }
  box(SQUARE.x, TOP + 1, SQUARE.z, SQUARE.x, TOP + 3, SQUARE.z, B.ice);
  for (const [dx, dy] of [[-1, 2], [1, 2], [0, 4], [-1, 3], [1, 3]] as const) put(world, SQUARE.x + dx, TOP + dy, SQUARE.z, B.ice);
  for (const [dz, dy] of [[-1, 2], [1, 2]] as const) put(world, SQUARE.x, TOP + dy, SQUARE.z + dz, B.ice);
  ctx.keepOut(SQUARE.x - 3, SQUARE.z - 3, SQUARE.x + 3, SQUARE.z + 3);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const [x, z] = [Math.round(SQUARE.x + Math.cos(a) * (SQUARE.r - 1)), Math.round(SQUARE.z + Math.sin(a) * (SQUARE.r - 1))];
    if (Math.abs(x - SQUARE.x) < 3) continue;
    if (i % 2 === 0) lamp(x, z);
    else ctx.prop(M.bannerPole, x, z, 90);
  }
  for (const [x, z, yaw] of [[392, 618, 45], [408, 618, 315], [392, 636, 135]] as const) ctx.prop(M.bench, x, z, yaw);
  const tower = placeClockTower(world, CLOCK.x, CLOCK.z, TOP, { stone: B.cobble, timber: B.planks, post: B.log, roof: B.iron, snow: B.snow, window: B.lantern, floor: B.cobble });
  for (const [x, y, z, yaw] of tower.faces) ctx.propAt(M.clock, [x, y, z], yaw);
  ctx.propAt(M.flag, [CLOCK.x + 0.5, tower.tip, CLOCK.z + 0.5], 0);
  ctx.keepOut(CLOCK.x - 4, CLOCK.z - 4, CLOCK.x + 4, CLOCK.z + 4);
  ctx.landmark('thap-dong-ho', 'Tháp đồng hồ', CLOCK.x, CLOCK.z + 6);
  // Pines hung with lights at the square's corners (d-02).
  for (const [x, z] of [[388, 640], [413, 640], [389, 613]] as const) {
    placeSnowPine(world, x, TOP, z, 7, { trunk: B.trunk, leaves: B.needles, snow: B.snow });
    for (const [dx, dy, dz] of [[1, 3, 0], [-1, 4, 1], [0, 5, -1], [2, 2, 1], [-2, 2, -1], [1, 6, 0], [-1, 3, -1]] as const) put(world, x + dx, TOP + dy, z + dz, B.lantern);
    ctx.keepOut(x - 2, z - 2, x + 2, z + 2);
  }
  // Snow heaped along the streets' edges, crates and barrels before the houses.
  for (let z = 570; z <= 720; z += 5) {
    if (Math.abs(z - SQUARE.z) < SQUARE.r + 2 || Math.abs(z - GATE_Z - 1) < 3) continue;
    for (const x of [396, 404]) if (!ctx.keptOut(x, z)) ctx.prop(M.mound, x, z, z * 13);
  }

  // The warm-clothes shop (d-12), its door on the square: rails of winter jackets along the back, shelves of
  // knitted hats and sweaters on the side walls, the counter with folded clothes, boots, lanterns.
  chalet(SHOP, 'west', 6, chaletBlocks(0, B.lantern), 2);
  wallLantern(SHOP.x0 - 0.45, TOP + 2.4, 621.5, 'x+');
  wallLantern(SHOP.x0 - 0.45, TOP + 2.4, 627.5, 'x+');
  ctx.propAt(M.banner, [SHOP.x0 - 0.2, TOP + 3.5, 624.5], 90);
  for (const z of [619.5, 624.5, 629.5]) ctx.propAt(M.jackets, [SHOP.x1 - 1.4, TOP, z], 90);
  for (const x of [428.5]) for (const z of [SHOP.z0 + 1.3, SHOP.z1 - 1.3]) ctx.propAt(M.knits, [x, TOP, z], z < 624 ? 180 : 0);
  for (const [x, z] of [[421, 621], [421, 628]] as const) {
    ctx.prop(M.crate, x, z, 0);
    ctx.propAt(M.folded, [x + 0.5, TOP + 1.05, z + 0.5], 30);
  }
  for (const x of [420.5, 424.5]) {
    ctx.propAt(M.knits, [x, TOP, SHOP.z0 + 1.3], 180);
    ctx.propAt(M.knits, [x, TOP, SHOP.z1 - 1.3], 0);
  }
  box(426, TOP, 620, 426, TOP, 628, B.planks);
  box(426, TOP, 620, 426, TOP, 620, B.log);
  for (const [z, m] of [[621, M.folded], [622.5, M.hat], [624, M.boots], [625.5, M.folded], [627, M.hat]] as const) ctx.propAt(m, [426.5, TOP + 1, z + 0.5], 90);
  for (const [x, z] of [[419, 618], [419, 630], [422, 619]] as const) ctx.prop(M.boots, x, z, 20);
  ctx.centred(M.plant, 419, 621, 0);
  ctx.propAt(M.rug, [422.5, TOP, 624.5], 90);
  for (const z of [618.5, 630.5]) wallLantern(SHOP.x1 - 0.55, TOP + 3.2, z, 'x+');
  ctx.landmark('trong-cua-hang', 'Trong cửa hàng đồ ấm', 421, 624);

  // The quest station (d-14), its door on the square: the board on the back wall with three maps under the
  // blue snowflake shield, lanterns either side, the table of maps before it, crates and barrels with snow.
  chalet(STATION, 'east', 6, chaletBlocks(1, B.lantern), 2);
  wallLantern(STATION.x1 + 1.45, TOP + 2.4, 620.5, 'x-');
  wallLantern(STATION.x1 + 1.45, TOP + 2.4, 627.5, 'x-');
  ctx.propAt(M.shield, [STATION.x1 + 1.2, TOP + 3.6, 624], 90);
  box(STATION.x0 + 1, TOP, 619, STATION.x0 + 1, TOP + 4, 629, B.planks);
  for (const z of [619, 629]) box(STATION.x0 + 1, TOP, z, STATION.x0 + 1, TOP + 4, z, B.log);
  box(STATION.x0 + 1, TOP + 4, 619, STATION.x0 + 1, TOP + 4, 629, B.log);
  for (const z of [620.5, 624.5, 628.5]) ctx.propAt(M.mapPoster, [STATION.x0 + 2.15, TOP + 1.3, z], 90);
  ctx.propAt(M.shield, [STATION.x0 + 2.2, TOP + 3.3, 624.5], 90);
  for (const z of [618.5, 630.5]) wallLantern(STATION.x0 + 1.55, TOP + 2.6, z, 'x-');
  box(STATION.x0 + 4, TOP, 621, STATION.x0 + 4, TOP, 628, B.planks);
  for (const [z, m] of [[622, M.book], [624.5, M.mapTable], [627, M.books]] as const) ctx.propAt(m, [STATION.x0 + 4.5, TOP + 1, z + 0.5], 90);
  for (const [x, z, m] of [[371, 618, M.crate], [372, 618, M.barrel], [371, 630, M.crate], [380, 618, M.barrel], [380, 630, M.crate], [381, 629, M.crate]] as const) ctx.prop(m, x, z, x * 17);
  ctx.centred(M.plant, 381, 621, 0);
  for (const z of [619, 629]) ctx.centred(M.plant, STATION.x0 + 3, z, 0);
  for (const [x, z] of [[STATION.x0 + 4, 619], [STATION.x0 + 4, 629]] as const) ctx.prop(M.barrel, x, z, x * 5);
  ctx.landmark('trong-tram-nhiem-vu', 'Trong trạm nhiệm vụ', 378, 624);

  // The snowman field before the wall: snowmen of every size, snowballs, a sled.
  reserved.push(SNOWMEN);
  for (const [x, z, yaw] of [[419, 636, 200], [432, 636, 160], [438, 643, 250], [431, 646, 30], [419, 646, 120]] as const) ctx.prop(M.snowman, x, z, yaw);
  for (const [x, z] of [[423, 637], [435, 640], [428, 647], [440, 637]] as const) ctx.prop(M.mound, x, z, x * 31);
  ctx.prop(M.sled, 436, 647, 70);
  // The sledding slope at the head of the village: a ramp of snow up to the west, sleds at its foot.
  reserved.push(SLED_SLOPE);
  for (let x = SLED_SLOPE.x0; x <= SLED_SLOPE.x1; x++) {
    const h = Math.round((SLED_SLOPE.x1 - x) / 4);
    for (let z = SLED_SLOPE.z0 + 2; z <= SLED_SLOPE.z1 - 2; z++) for (let y = TOP; y < TOP + h; y++) put(world, x, y, z, B.snow);
  }
  for (const z of [SLED_SLOPE.z0, SLED_SLOPE.z1]) for (let x = SLED_SLOPE.x0; x <= SLED_SLOPE.x1; x += 2) ctx.prop(M.fence, x, z, 0);
  for (const [x, z, yaw] of [[373, 638, 90], [374, 644, 100], [365, 641, 80]] as const) ctx.prop(M.sled, x, z, yaw);
  ctx.prop(M.slalom, SLED_SLOPE.x0 + 1, SLED_SLOPE.z0 + 2, 0);
  ctx.keepOut(SLED_SLOPE.x0, SLED_SLOPE.z0 + 1, SLED_SLOPE.x1 - 1, SLED_SLOPE.z1 - 1);

  // A home of the village walked into (d-11): the stone fireplace with its fire, the mantel, a table laid
  // with soup and bread, armchairs, shelves of jars, the window on the mountains between red curtains.
  chalet(HOME, 'south', 6, chaletBlocks(0, B.glass), 1);
  {
    const hz = HOME.z0 + 1;
    box(356, TOP, hz, 360, TOP + 4, hz, B.cobble);
    box(357, TOP, hz, 359, TOP + 1, hz, 0);
    box(356, TOP + 2, hz + 1, 360, TOP + 2, hz + 1, B.planks);
    box(357, TOP + 5, hz, 359, TOP + 7, hz, B.brick);
    ctx.propAt(M.fire, [358.1, TOP, hz + 0.6], 0);
    ctx.propAt(M.fire, [358.9, TOP, hz + 0.5], 60);
    ctx.propAt(M.books, [356.6, TOP + 3, hz + 1.5], 0);
    ctx.propAt(M.smallClock, [359.5, TOP + 3.05, hz + 1.5], 0);
    for (const x of [354, 362]) for (let y = TOP; y <= TOP + 4; y++) put(world, x, y, HOME.z0, y >= TOP + 1 && y <= TOP + 3 ? B.glass : B.planks);
    for (const x of [353, 355, 361, 363]) box(x, TOP + 1, HOME.z0 + 1, x, TOP + 4, HOME.z0 + 1, B.woodRed);
    ctx.propAt(M.diningTable, [361.5, TOP, 577], 0);
    for (const [dx, m] of [[-0.5, M.soup], [0.5, M.bread], [0, M.stew]] as const) ctx.propAt(m, [361.5 + dx, TOP + 1.09, 577], 0);
    ctx.propAt(M.armchair, [356.5, TOP, 576.5], 180);
    ctx.propAt(M.armchair, [354.5, TOP, 578.5], 225);
    ctx.propAt(M.jarShelf, [HOME.x1 - 0.6, TOP, 575.5], 90);
    ctx.propAt(M.rug, [357.5, TOP, 577.5], 0);
    wallLantern(HOME.x1 - 0.55, TOP + 2.6, 579.5, 'x+');
    wallLantern(HOME.x0 + 1.45, TOP + 2.6, 579.5, 'x-');
    ctx.landmark('trong-nha-dan', 'Trong nhà dân', 358, 579);
  }
  ctx.landmark('pho-lang', 'Phố làng', 400, 588);

  // ---------------------------------------------------------------------------------------------------
  // The cable car's stations: a shelter, the bull wheel, a lamp at each end, the cabins (rides) inside.
  for (const s of STATIONS) {
    const r = stationRect(s);
    reserved.push({ x0: r.x0 - 2, z0: r.z0 - 2, x1: r.x1 + 2, z1: r.z1 + 9 });
    placeStationShelter(world, r, TOP, { post: B.log, roof: B.snow, eave: B.planks, floor: B.planks });
    ctx.propAt(M.wheel, [s.x0 + 14.5, TOP, s.z + 0.5], 90);
    for (const x of [r.x0 - 1, r.x1 + 1]) lamp(x, s.z + 5);
    ctx.propAt(M.banner, [s.x0 + 14.5, TOP + 3.2, r.z1 + 0.6], 0);
  }
  ctx.landmark('ga-cap-treo-lang', 'Ga cáp treo làng', STATIONS[0]?.x0 ?? 356, (STATIONS[0]?.z ?? 694) + 8);

  // ---------------------------------------------------------------------------------------------------
  // The ski area (d-04): the slope up to the ridge with two lines of slalom flags, fences of red down its
  // sides, the lodge on its east side, racks of skis and boards, the cable car up the middle.
  const zone2 = ctx.zone(2);
  ctx.landmark('doc-truot-tuyet', 'Dốc trượt tuyết', 170, zone2.z - zone2.hz + 4);
  ctx.landmark('dinh-doc', 'Đỉnh dốc trượt', CABLE_X + 6, 330, surface(CABLE_X + 6, 330) + 1);
  ctx.landmark('vach-cap-treo', 'Vách núi dưới cáp treo', CABLE_X - 6, 288, surface(CABLE_X - 6, 288) + 1);
  ctx.landmark('chan-doc', 'Chân dốc cáp treo', CABLE_X + 10, 426, surface(CABLE_X + 10, 426) + 1);
  for (let z = 300; z <= 440; z += 2) for (const x of [96, 246]) if (!ctx.onPath(x, z)) ctx.prop(M.fence, x, z, 90);
  const lodge = chalet(LODGE, 'west', 7, chaletBlocks(0, B.glass), 2);
  for (let z = 428; z > 300; z -= 9) {
    for (const [x0, flip] of [[158, 0], [214, 1]] as const) {
      const x = x0 + ((Math.floor(z / 9) + flip) % 2) * 8;
      if (!ctx.keptOut(x, z, 1)) ctx.prop(M.slalom, x, z, 0);
    }
  }
  ctx.propAt(M.innSign, [LODGE.x0 - 0.3, TOP + 4.3, lodge.door[1] + 0.5], 90);
  for (const z of [lodge.door[1] - 2, lodge.door[1] + 3]) wallLantern(LODGE.x0 - 0.45, TOP + 2.5, z + 0.5, 'x+');
  for (const [dx, dz, m, yaw] of [[-3, 1, M.skiRack, 90], [-3, 14, M.skiRack, 90], [-5, 5, M.snowboard, 30], [-6, 11, M.snowboard, 160], [-2, 18, M.barrel, 0], [-2, -1, M.logs, 90]] as const) ctx.prop(m, LODGE.x0 + dx, LODGE.z0 + dz, yaw);
  // Inside the lodge (d-13): a red carpet from the door to the reception, chandeliers, the fireplace with
  // armchairs before it, the blue banner with the bed over the counter, plants, barrels, curtained windows.
  {
    const mid = lodge.door[1];
    for (let x = LODGE.x0 + 1; x <= LODGE.x1 - 6; x++) for (let z = mid - 2; z <= mid + 3; z++) put(world, x, LEVEL, z, Math.abs(z - mid - 0.5) > 2 ? B.sand : B.woodRed);
    box(LODGE.x1 - 4, TOP, mid - 6, LODGE.x1 - 4, TOP, mid + 6, B.planks);
    box(LODGE.x1 - 4, TOP + 1, mid - 6, LODGE.x1 - 4, TOP + 1, mid + 6, B.log);
    ctx.propAt(M.book, [LODGE.x1 - 3.5, TOP + 2, mid - 1.5], 90);
    ctx.propAt(M.innSign, [LODGE.x1 - 1.4, TOP + 3, mid + 0.5], 90);
    for (const z of [mid - 7, mid + 8]) wallLantern(LODGE.x1 - 0.55, TOP + 3, z + 0.5, 'x+');
    const fz = LODGE.z0 + 1;
    const fx = LODGE.x0 + 12;
    box(fx - 3, TOP, fz, fx + 3, TOP + 5, fz, B.cobble);
    box(fx - 1, TOP, fz, fx + 1, TOP + 1, fz, 0);
    box(fx - 3, TOP + 2, fz + 1, fx + 3, TOP + 2, fz + 1, B.planks);
    ctx.propAt(M.fire, [fx + 0.5, TOP, fz + 0.6], 0);
    for (const [dx, dz, yaw] of [[-3, 4, 315], [0, 5, 0], [3, 4, 45]] as const) ctx.propAt(M.armchair, [fx + dx + 0.5, TOP, fz + dz + 0.5], yaw);
    for (const x of [fx - 5, fx + 5]) for (const z of [LODGE.z1 - 1, LODGE.z0 + 1]) ctx.centred(M.plant, x, z, 0);
    for (const [x, z] of [[LODGE.x1 - 2, LODGE.z0 + 1], [LODGE.x1 - 2, LODGE.z0 + 2], [LODGE.x1 - 3, LODGE.z0 + 1]] as const) ctx.prop(M.barrel, x, z, x * 13);
    for (const x of [LODGE.x0 + 6, LODGE.x0 + 13]) ctx.propAt(M.chandelier, [x + 0.5, TOP + 7 - 3.4, mid + 0.5], 0);
    for (let x = LODGE.x0 + 4; x < LODGE.x1 - 2; x += 8) {
      for (let y = TOP + 1; y <= TOP + 3; y++) for (const dx of [0, 1]) put(world, x + dx, y, LODGE.z1, B.glass);
      for (const dx of [-1, 2]) box(x + dx, TOP + 1, LODGE.z1 - 1, x + dx, TOP + 4, LODGE.z1 - 1, B.woodRed);
    }
    ctx.landmark('trong-nha-nghi', 'Trong nhà nghỉ', LODGE.x0 + 8, mid);
    ctx.landmark('truoc-nha-nghi', 'Trước nhà nghỉ', LODGE.x0 - 4, mid);
  }

  // The cable car (d-04, d-05): two hauling lines of cable from the ski station up over the ridge and down
  // across the gorge to the summit station, iron towers with their cross-arms, red cabins on both lines.
  {
    const ends = STATIONS.filter((s) => s.chapter === 2 || s.chapter === 5).map((s) => s.z);
    const [zSki = 434, zTop = 236] = ends;
    const cableTop = TOP + 4;
    const points: Array<[number, number]> = [[zSki, cableTop]];
    for (const tz of CABLE_TOWERS) {
      const ground = surface(CABLE_X, tz);
      const topY = tz === 270 ? LEVEL + 18 : ground + 11;
      points.push([tz, topY]);
      box(CABLE_X - 1, ground, tz - 1, CABLE_X + 1, ground, tz + 1, B.cobble);
      box(CABLE_X, ground + 1, tz, CABLE_X, topY - 1, tz, B.iron);
      box(CABLE_X - 4, topY - 1, tz, CABLE_X + 4, topY - 1, tz, B.iron);
      for (const dx of [-3, 3]) put(world, CABLE_X + dx, topY - 2, tz, B.iron);
      ctx.keepOut(CABLE_X - 2, tz - 2, CABLE_X + 2, tz + 2);
    }
    points.push([zTop, cableTop]);
    const cableY = (z: number): number => {
      for (let i = 0; i + 1 < points.length; i++) {
        const [za = 0, ya = 0] = points[i] ?? [];
        const [zb = 0, yb = 0] = points[i + 1] ?? [];
        if (z <= za && z >= zb) {
          const t = (za - z) / Math.max(1, za - zb);
          return ya + (yb - ya) * t - 1.2 * Math.sin(Math.PI * t);
        }
      }
      return cableTop;
    };
    for (const x of [CABLE_X - 2, CABLE_X + 2]) {
      for (let z = zTop + 4; z <= zSki - 4; z += 0.5) {
        const steep = Math.abs(cableY(z + 0.5) - cableY(z)) > 0.12;
        if (!steep && z % 1 !== 0) continue;
        ctx.propAt(M.cable, [x + 0.5, cableY(z), z + 0.5], 0);
      }
    }
    for (const [x, start] of [[CABLE_X - 2, zSki - 14], [CABLE_X + 2, zSki - 26]] as const) {
      for (let z = start; z > zTop + 8; z -= 24) {
        if (CABLE_TOWERS.some((tz) => Math.abs(tz - z) < 4)) continue;
        const y = cableY(z) - 3.4;
        let ground = 0;
        for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) ground = Math.max(ground, surface(x + dx, z + dz));
        if (y < ground + 1.5) continue;
        ctx.propAt(M.cabin, [x + 0.5, y, z + 0.5], 90);
      }
    }
    reserved.push({ x0: CABLE_X - 12, z0: zTop, x1: CABLE_X + 12, z1: zSki });
  }

  // ---------------------------------------------------------------------------------------------------
  // The frozen lake (d-01, d-07): the falls down the cliff over its north shore, frozen but the middle one,
  // which runs into the open pool among floes; ice to walk on, holes of the ice fishers, the shore walk.
  ctx.landmark('bo-ho-bang', 'Bờ hồ băng', 400, 400);
  ctx.landmark('giua-ho-bang', 'Giữa hồ băng', 400, 330, LEVEL);
  // The cliff over the north shore rises higher than the range behind it: a crown of rock along its edge.
  const crownTop = new Map<number, number>();
  for (let x = 316; x <= 492; x++) {
    const peakY = 36 + Math.round(fbm(SEED + 11, x / 9, 3) * 5);
    for (let z = CLIFF_Z - 12; z <= CLIFF_Z; z++) {
      const s = surface(x, z);
      if (s < LEVEL + 10) continue;
      const top = Math.min(46, peakY - Math.round((CLIFF_Z - z) * 0.35));
      for (let y = s + 1; y <= top; y++) put(world, x, y, z, y === top && (x + z) % 3 !== 0 ? B.snow : rock(x, y, z));
      if (z === CLIFF_Z) crownTop.set(x, top);
    }
  }
  // Pines along the crown (d-07: the cliff's top is a fringe of pines in snow).
  for (let x = 320; x <= 488; x += 5) {
    const z = CLIFF_Z - 6 - (x % 3);
    let y = 47;
    while (y > LEVEL && world.get(x, y, z) === 0) y--;
    if (y < 44 - 6 && (x * 7) % 3 !== 0) placeSnowPine(world, x, y + 1, z, 4 + (x % 3), { trunk: B.trunk, leaves: B.needles, snow: B.snow });
  }
  // Buttresses of rock jut from the face between the falls, so the cliff reads as columns (d-07).
  const FALLS = [[338, 5, false], [364, 7, false], [390, 9, true], [414, 7, true], [440, 9, false], [466, 5, false]] as const;
  for (let x = 318; x <= 490; x++) {
    if (FALLS.some(([fx, w]) => Math.abs(x - fx) <= Math.floor(w / 2) + 1)) continue;
    const out = Math.floor(fbm(SEED + 17, x / 5, 7) * 6) - 1;
    const top = crownTop.get(x) ?? surface(x, CLIFF_Z);
    for (let k = 1; k <= out; k++) {
      const z = CLIFF_Z + k;
      if (inOpenWater(x, z) || inLake(x, z)) break;
      const h = top - k * 2 - ((x * 5) % 4);
      for (let y = surface(x, z) + 1; y <= h; y++) put(world, x, y, z, y === h ? B.snow : rock(x, y, z));
    }
  }
  for (const [fx, width, running] of FALLS) {
    const top = crownTop.get(fx) ?? surface(fx, CLIFF_Z);
    placeFall(world, fx, CLIFF_Z + 1, 1, width, top, surface(fx, CLIFF_Z + 1) + 1, running, { ice: B.ice, snow: B.snow, water: B.water });
    ctx.keepOut(fx - 5, CLIFF_Z - 14, fx + 5, CLIFF_Z + 5);
  }
  ctx.landmark('chan-thac-bang', 'Chân thác băng', 336, 272);
  // Floes on the open water under the falls; drifts on the ice.
  for (let i = 0; i < 40; i++) {
    const x = 330 + ((i * 37) % 140);
    const z = 268 + ((i * 53) % 34);
    if (!inOpenWater(x, z) || !inOpenWater(x + 3, z + 2)) continue;
    placeFloe(world, x, z, 2 + (i % 3), 2 + ((i >> 1) % 2), LEVEL - 1, { ice: B.ice, snow: B.snow });
  }
  for (const [x, z, w, d] of [[350, 312, 4, 3], [452, 316, 3, 3], [330, 336, 3, 2], [470, 346, 4, 2], [372, 322, 3, 2], [430, 340, 3, 3]] as const) {
    for (let dx = 0; dx < w; dx++) for (let dz = 0; dz < d; dz++) if ((dx + dz) % 3 !== 2) put(world, x + dx, LEVEL, z + dz, B.snow);
  }
  for (const [x, z] of [[384, 360], [410, 368], [396, 376], [424, 352]] as const) {
    put(world, x, LEVEL - 1, z, B.water);
    ctx.prop(M.bucket, x + 1, z, x * 7);
  }
  for (let x = 344; x <= 456; x += 14) {
    lamp(x, 405);
    if (x % 28 === 8) ctx.prop(M.bench, x + 4, 405, 0);
  }
  for (const x of [352, 448]) ctx.prop(M.bannerPole, x, 398, 90);

  // The gorge west of the lake (d-08, b-11, c-14): falls frozen down the ski mountain's north face, the plank
  // bridge of the summit trail high over its floor of ice.
  for (const [fx, width] of [[150, 5], [196, 7], [232, 9], [262, 7]] as const) {
    // The face: the first row (going south from the gorge) under a rise of three or more.
    let faceZ = 266;
    while (faceZ < 296 && surface(fx, faceZ + 1) - surface(fx, faceZ) < 3) faceZ++;
    let top = surface(fx, faceZ);
    for (let k = 1; k <= 6; k++) top = Math.max(top, surface(fx, faceZ + k));
    if (faceZ >= 296 || top - surface(fx, faceZ) < 4) continue;
    placeFall(world, fx, faceZ, -1, width, top, gorgeFloor(fx) + 1, false, { ice: B.ice, snow: B.snow, water: B.water });
  }
  {
    const bx = 308;
    let z0 = 266;
    while (z0 > 240 && surface(bx, z0) < LEVEL) z0--;
    let z1 = 290;
    while (z1 < 320 && surface(bx, z1) < LEVEL) z1++;
    placePlankBridge(world, bx, z0, z1, LEVEL, surface, { planks: B.planks, log: B.log });
    ctx.landmark('cau-go-qua-vuc', 'Cầu gỗ qua vực', bx, Math.round((z0 + z1) / 2), LEVEL + 1);
    for (const z of [z0 - 1, z1 + 1]) for (const dx of [-3, 3]) lamp(bx + dx, z);
  }
  ctx.landmark('vuc-thac-bang', 'Vực thác băng', 236, 256);
  ctx.landmark('day-vuc', 'Đáy vực băng', 246, 270, surface(246, 270) + 1);

  // ---------------------------------------------------------------------------------------------------
  // The frozen river east of the lake: the viaduct of five arches carrying the lake road (d-01), a plank
  // bridge for the village's east lane.
  const viaduct = placeViaduct(world, RIVER_X - 22, RIVER_X + 22, 430, LEVEL, 7, 11, surface, { stone: B.cobble, rail: B.stone, deck: B.path });
  for (const at of viaduct.lamps) ctx.propAt(STREET_LANTERN, at, 0);
  ctx.landmark('cau-vom', 'Cầu đá vòm', RIVER_X, 430, LEVEL + 1);
  placePlankBridgeX(world, 588, RIVER_X - 16, RIVER_X + 16, LEVEL, surface, { planks: B.planks, log: B.log });

  // ---------------------------------------------------------------------------------------------------
  // The research station (d-10): two timber huts under snow, the satellite dish on the big one's roof, the
  // red snowflake flag, crates and barrels with snow, a sled, tents, the map table outside.
  const hut = chalet(HUT, 'south', 7, chaletBlocks(4, B.lantern), 2);
  chalet(HUT_B, 'south', 5, chaletBlocks(5, B.lantern), 1);
  ctx.propAt(M.dish, [HUT.x1 - 4.5, hut.ridge + 1, (HUT.z0 + HUT.z1) / 2 + 0.5], 200);
  ctx.prop(M.explorerSign, hut.door[0] + 3, hut.door[1] + 1, 0);
  ctx.prop(M.redFlag, HUT.x0 - 4, HUT.z1 + 4, 0);
  for (const [x, z, m] of [[630, 512, M.crate], [631, 514, M.crate], [629, 515, M.barrel], [660, 512, M.crate], [662, 511, M.barrel], [674, 512, M.crate], [676, 513, M.crate], [684, 504, M.box]] as const) ctx.prop(m, x, z, x * 11);
  for (const [x, z] of [[618, 500], [622, 512]] as const) ctx.prop(M.tent, x, z, x * 3);
  ctx.prop(M.sled, 642, 518, 40);
  ctx.prop(M.mapTable, 656, 516, 0);
  ctx.prop(M.workbench, 668, 514, 180);
  ctx.prop(M.campfire, 682, 528, 0);
  for (const [x, z, yaw] of [[679, 528, 90], [685, 528, 90], [682, 531, 0]] as const) ctx.prop(M.logBench, x, z, yaw);
  ctx.landmark('tram-tham-hiem', 'Trạm thám hiểm', 650, 522);

  // The ice cave (d-09): the tunnel from the rock's south face, a timber frame and lanterns at its mouth;
  // inside, the hall of ice and stone with crystal veins aglow, clusters of crystal, icicles, the chasm with
  // its plank bridge, lanterns on posts.
  {
    carveIceHall(world, CAVE.x0, CAVE.z0, CAVE.x1, CAVE.z1, TOP, 12, SEED, { ice: B.ice, stone: B.blue, crystal: B.crystal, floor: B.blue });
    const mouthZ = MASSIF.z1 + 3;
    for (let z = CAVE.z1 - 2; z <= mouthZ; z++) {
      for (let dx = -4; dx <= 4; dx++) {
        const x = CAVE_X + dx;
        const height = Math.abs(dx) <= 2 ? 6 : Math.abs(dx) === 3 ? 5 : 0;
        if (height === 0) {
          for (let y = TOP; y <= TOP + 6; y++) if (world.get(x, y, z) !== 0) put(world, x, y, z, (y + z) % 4 === 0 ? B.crystal : B.ice);
          continue;
        }
        put(world, x, LEVEL, z, B.cobble);
        for (let y = TOP; y < TOP + height; y++) put(world, x, y, z, 0);
        if (world.get(x, TOP + height, z) !== 0) put(world, x, TOP + height, z, B.ice);
      }
    }
    for (const dx of [-4, 4]) box(CAVE_X + dx, TOP, mouthZ, CAVE_X + dx, TOP + 6, mouthZ, B.log);
    box(CAVE_X - 4, TOP + 7, mouthZ, CAVE_X + 4, TOP + 7, mouthZ, B.log);
    for (const dx of [-5, 5]) put(world, CAVE_X + dx, TOP + 4, mouthZ, B.lantern);
    ctx.keepOut(CAVE_X - 6, mouthZ - 2, CAVE_X + 6, mouthZ + 1);
    ctx.landmark('cua-hang-bang', 'Cửa hang băng', CAVE_X, mouthZ + 3);
    // The chasm across the hall, water deep in it, and the plank bridge over it.
    const chasm = { z0: 414, z1: 424 };
    for (let x = CAVE.x0; x <= CAVE.x1; x++) {
      for (let z = chasm.z0; z <= chasm.z1; z++) {
        if (world.get(x, TOP, z) !== 0 || world.get(x, LEVEL, z) === 0) continue;
        for (let y = LEVEL - 5; y <= LEVEL; y++) put(world, x, y, z, y <= LEVEL - 4 ? B.water : 0);
        put(world, x, LEVEL - 6, z, B.stone);
      }
    }
    placePlankBridge(world, CAVE_X, chasm.z0 - 2, chasm.z1 + 2, LEVEL, () => LEVEL - 6, { planks: B.planks, log: B.log }, 4);
    const caveAt = (x: number, z: number): [number, number, number] => [x + 0.5, TOP, z + 0.5];
    for (const [x, z] of [[674, 410], [680, 404], [706, 406], [712, 412], [672, 436], [710, 440], [700, 402], [676, 446], [704, 448], [714, 428], [681, 431], [699, 438], [694, 444], [684, 426], [702, 428], [688, 408], [671, 426], [710, 432]] as const) {
      if (world.get(x, TOP, z) === 0 && world.get(x, LEVEL, z) !== 0) ctx.propAt(M.crystal, caveAt(x, z), x * 23);
    }
    for (const [x, z] of [[686, 411], [694, 411], [686, 427], [694, 427], [680, 440], [700, 440], [700, 406]] as const) ctx.propAt(STREET_LANTERN, caveAt(x, z), 0);
    for (const [x, z] of [[690, 426], [682, 428], [698, 416], [692, 404], [686, 444]] as const) {
      let y = TOP + 6;
      while (y < TOP + 16 && world.get(x, y, z) === 0) y++;
      if (y < TOP + 16) ctx.propAt(M.icicles, [x + 0.5, y - 1.2, z + 0.5], x * 7);
    }
    ctx.landmark('hang-bang', 'Hang động băng', CAVE_X, 432, TOP);
  }

  // ---------------------------------------------------------------------------------------------------
  // The summit (d-06, d-15): the rock with stone steps up from the plateau, the observatory's dome on it, a
  // rail of posts round its edge, the snowflake flag; the ledge out over the drop where the sun goes down.
  {
    const rockTop = LEVEL + 4;
    for (let x = SUMMIT_ROCK.x0; x <= SUMMIT_ROCK.x1; x++) {
      for (let z = SUMMIT_ROCK.z0; z <= SUMMIT_ROCK.z1; z++) {
        const corner = Math.min(x - SUMMIT_ROCK.x0, SUMMIT_ROCK.x1 - x) + Math.min(z - SUMMIT_ROCK.z0, SUMMIT_ROCK.z1 - z) < 3;
        if (corner) continue;
        for (let y = surface(x, z) + 1; y < rockTop; y++) put(world, x, y, z, (x + y * 2 + z) % 7 === 0 ? B.brick : B.stone);
        put(world, x, rockTop, z, B.snow);
      }
    }
    for (let k = 0; k < 4; k++) box(177, LEVEL + 1, SUMMIT_ROCK.z1 + 4 - k, 183, LEVEL + 1 + k, SUMMIT_ROCK.z1 + 4 - k, B.cobble);
    ctx.keepOut(SUMMIT_ROCK.x0, SUMMIT_ROCK.z0, SUMMIT_ROCK.x1, SUMMIT_ROCK.z1 + 5);
    const obs = placeObservatory(world, OBSERVATORY.x, OBSERVATORY.z, rockTop + 1, OBSERVATORY.r, { wall: B.brick, trim: B.log, dome: B.snow, rib: B.iron, window: B.lantern, floor: B.planks });
    ctx.propAt(M.telescope, [obs.telescope[0], obs.telescope[1] + 2.2, obs.telescope[2]], 270);
    for (let x = SUMMIT_ROCK.x0 + 1; x <= SUMMIT_ROCK.x1 - 1; x += 2) {
      for (const z of [SUMMIT_ROCK.z0 + 1, SUMMIT_ROCK.z1 - 1]) {
        if (z === SUMMIT_ROCK.z1 - 1 && x >= 176 && x <= 184) continue;
        ctx.propAt(M.fence, [x + 0.5, rockTop + 1, z + 0.5], 0);
      }
    }
    for (let z = SUMMIT_ROCK.z0 + 3; z <= SUMMIT_ROCK.z1 - 3; z += 2) for (const x of [SUMMIT_ROCK.x0 + 1, SUMMIT_ROCK.x1 - 1]) ctx.propAt(M.fence, [x + 0.5, rockTop + 1, z + 0.5], 90);
    ctx.propAt(M.bannerPole, [171.5, rockTop + 1, 156.5], 90);
    ctx.propAt(M.bench, [189.5, rockTop + 1, 156.5], 0);
    ctx.landmark('dai-quan-sat', 'Đài quan sát', 180, SUMMIT_ROCK.z1 + 7);
    ctx.landmark('tren-dai-quan-sat', 'Trên đài quan sát', 186, 156, rockTop + 1);
    // The ledge: a tongue of rock under snow out over the drop to the north-west.
    for (let x = 140; x <= 158; x++) {
      for (let z = 128; z <= 142; z++) {
        if (Math.hypot((x - 150) / 9, (z - 136) / 7) > 1) continue;
        for (let y = surface(x, z) + 1; y <= LEVEL + 2; y++) put(world, x, y, z, y >= LEVEL + 1 ? B.snow : B.stone);
      }
    }
    for (let z = 143; z <= 150; z++) for (let x = 152; x <= 160; x++) for (let y = surface(x, z) + 1; y <= LEVEL + 1; y++) put(world, x, y, z, y === LEVEL + 1 ? B.snow : B.stone);
    ctx.keepOut(136, 124, 166, 150);
    ctx.landmark('mom-da', 'Mỏm đá ngắm hoàng hôn', 144, 132, LEVEL + 3);
    ctx.landmark('san-dinh-nui', 'Sân đỉnh núi', 186, 200);
  }

  // ---------------------------------------------------------------------------------------------------
  // The castle on the range far to the north (d-01, d-05): cream walls and towers under red pointed roofs.
  {
    const cx = 400;
    const cz = 168;
    const base = 33;
    const walls: Rect = { x0: cx - 16, z0: cz - 10, x1: cx + 16, z1: cz + 10 };
    for (let x = walls.x0 - 2; x <= walls.x1 + 2; x++) for (let z = walls.z0 - 2; z <= walls.z1 + 2; z++) for (let y = surface(x, z) + 1; y < base; y++) put(world, x, y, z, B.stone);
    for (let x = walls.x0; x <= walls.x1; x++) {
      for (let z = walls.z0; z <= walls.z1; z++) {
        const edge = x === walls.x0 || x === walls.x1 || z === walls.z0 || z === walls.z1;
        if (!edge) continue;
        for (let y = base; y < base + 5; y++) put(world, x, y, z, B.sand);
        if ((x + z) % 2 === 0) put(world, x, base + 5, z, B.sand);
      }
    }
    const towerBlocks = { wall: B.sand, trim: B.cobble, roof: B.red, glass: B.lantern };
    for (const [tx, tz] of [[walls.x0, walls.z0], [walls.x1, walls.z0], [walls.x0, walls.z1], [walls.x1, walls.z1], [cx, walls.z1]] as const) placeTower(world, tx, tz, base, 2, 5, towerBlocks, false);
    box(cx - 6, base, cz - 6, cx + 6, base + 7, cz + 2, B.sand);
    for (let x = cx - 5; x <= cx + 5; x += 2) put(world, x, base + 4, cz + 2, B.lantern);
    for (let k = 0; k <= 6; k++) box(cx - 7 + k, base + 8 + k, cz - 7 + k, cx + 7 - k, base + 8 + k, cz + 3 - k, B.red);
    placeTower(world, cx - 9, cz - 4, base, 2, 8, towerBlocks, false);
    placeTower(world, cx + 9, cz - 4, base, 2, 8, towerBlocks, false);
    for (const [x, z] of [[cx, cz - 2], [cx - 9, cz - 4], [cx + 9, cz - 4]] as const) {
      let y = 47;
      while (y > base && world.get(x, y, z) === 0) y--;
      ctx.propAt(M.flag, [x + 0.5, y + 1, z + 0.5], 0);
    }
    ctx.keepOut(walls.x0 - 3, walls.z0 - 3, walls.x1 + 3, walls.z1 + 3);
    ctx.landmark('lau-dai-tuyet', 'Lâu đài trên núi tuyết', cx, walls.z1 + 4, surface(cx, walls.z1 + 4) + 1);
  }
  // Peaks under snow round the valley, grey rock on their steep sides.
  const peak = (cx: number, cz: number, r: number, topY: number): void => {
    const base = surface(cx, cz);
    for (let x = cx - r; x <= cx + r; x++) {
      for (let z = cz - r; z <= cz + r; z++) {
        if (x < 0 || z < 0 || x >= SIZE || z >= SIZE) continue;
        const t = Math.hypot(x - cx, z - cz) / r;
        if (t > 1 || ctx.keptOut(x, z, 2)) continue;
        const s = surface(x, z);
        const ridge = 1 - Math.abs(fbm(SEED + 9, x / 11, z / 11) * 2 - 1);
        const h = Math.min(47, Math.round(s + Math.max(0, topY - base) * (1 - t) ** 1.3 * (0.75 + 0.35 * ridge) + (fbm(SEED + 13, x / 5, z / 5) - 0.5) * 3));
        for (let y = s + 1; y <= h; y++) put(world, x, y, z, y >= h - 1 || y >= 41 ? B.snow : B.stone);
      }
    }
    ctx.keepOut(cx - Math.round(r * 0.6), cz - Math.round(r * 0.6), cx + Math.round(r * 0.6), cz + Math.round(r * 0.6));
  };
  for (const [x, z, r, top] of [[300, 64, 62, 46], [512, 64, 66, 47], [400, 72, 50, 46], [664, 70, 58, 46], [770, 180, 56, 45], [744, 380, 50, 46], [56, 64, 52, 40], [30, 210, 40, 34], [48, 380, 44, 42]] as const) peak(x, z, r, top);

  // ---------------------------------------------------------------------------------------------------
  // The chalets of the village and the valley: rows along the roads, doors on the road, a cobbled walk to
  // each door, a lantern by every other one, firewood, crates and young pines in the snow before them.
  let houses = 0;
  const chaletStreet = (route: readonly Point[], options: { setback?: number; sides?: ReadonlyArray<1 | -1>; zone?: number } = {}): void => {
    const setback = options.setback ?? 7;
    for (let i = 0; i + 1 < route.length; i++) {
      const [ax = 0, az = 0] = route[i] ?? [];
      const [bx = 0, bz = 0] = route[i + 1] ?? [];
      const len = Math.hypot(bx - ax, bz - az);
      if (len < 16) continue;
      const [ux, uz] = [(bx - ax) / len, (bz - az) / len];
      for (const side of options.sides ?? [-1, 1]) {
        const [nx, nz] = [-uz * side, ux * side];
        const facing = facingOf(-nx, -nz);
        let d = 8;
        while (d < len - 8) {
          const n = houses;
          const w = 9 + (n % 3) * 2;
          const depth = 8 + (n % 2) * 2;
          const [px, pz] = [Math.round(ax + ux * d), Math.round(az + uz * d)];
          const [rx, rz] = turnCell([0, 0], facing, Math.floor(w / 2), -setback);
          const origin: [number, number] = [px - rx, pz - rz];
          const cell = (u: number, v: number): [number, number] => frameAt(origin, facing, u, v);
          const lot: Array<[number, number]> = [];
          for (let u = -2; u <= w + 1; u++) for (let v = -3; v <= depth + 1; v++) lot.push(cell(u, v));
          const heights = lot.map(([x, z]) => surface(x, z));
          const clear = lot.every(([x, z]) => {
            const zn = ctx.inZone(x, z, 1);
            return x > 8 && z > 8 && x < SIZE - 8 && z < SIZE - 8 && !ctx.onPath(x, z) && !ctx.keptOut(x, z) && !reservedAt(x, z) && !wet(x, z) && (zn === undefined || zn.chapter === options.zone);
          }) && Math.max(...heights) - Math.min(...heights) <= 2;
          if (!clear) {
            d += 4;
            continue;
          }
          houses++;
          const baseY = Math.max(...heights) + 1;
          for (let u = 0; u < w; u++) for (let v = 0; v < depth; v++) {
            const [x, z] = cell(u, v);
            for (let y = surface(x, z) + 1; y < baseY; y++) put(world, x, y, z, B.cobble);
          }
          const tall = n % 3 !== 1;
          const c = placeChalet(facingWriter(world, origin, facing), FRAME, FRAME, w, depth, tall ? 8 : 5, baseY, chaletBlocks(n), tall ? 2 : 1);
          const door = Math.floor(w / 2);
          for (let v = -setback + 2; v <= -1; v++) for (const u of [door - 1, door]) {
            const [x, z] = cell(u, v);
            put(world, x, surface(x, z), z, B.path);
          }
          for (const [u, v] of [[door - 2, -1], [door + 1, -1]] as const) {
            const [x, z] = cell(u, v);
            put(world, x, baseY + 2, z, 0);
            const [wx, wz] = cell(u, 0);
            put(world, wx, baseY + 2, wz, B.lantern);
          }
          const yawFront = { north: 0, south: 180, east: 90, west: 270 }[facing];
          const [ex, ez] = cell(Math.floor(w / 2) - 3, -1);
          ctx.propAt(M.icicles, [ex + 0.5, c.eaves - 1.2, ez + 0.5], yawFront);
          if (n % 2 === 0) {
            const [lx, lz] = cell(-2, -3);
            lamp(lx, lz);
          }
          const [fx, fz] = cell(w, Math.floor(depth / 2));
          ctx.prop(n % 3 === 0 ? M.logs : n % 3 === 1 ? M.crate : M.barrel, fx, fz, yawFront + 90);
          const [gx, gz] = cell(1, -2);
          ctx.prop(M.youngPine, gx, gz, n * 37);
          if (n % 4 === 2) {
            const [sx, sz] = cell(w - 2, -2);
            ctx.prop(M.snowman, sx, sz, yawFront + 180);
          }
          const xs = lot.map(([x]) => x);
          const zs = lot.map(([, z]) => z);
          ctx.keepOut(Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs));
          d += w + 3;
        }
      }
    }
  };
  ctx.keepOut(SPAWN.x - 10, SPAWN.z - 8, SPAWN.x + 12, SPAWN.z + 10);
  chaletStreet([[400, 664], [400, 724]]);
  chaletStreet([[400, 566], [400, 610]], { zone: 1 });
  chaletStreet([[400, 458], [400, 566]]);
  chaletStreet([[392, 588], [236, 588]], { zone: 1 });
  chaletStreet([[408, 588], [544, 588]], { zone: 1 });
  chaletStreet([[226, 470], [336, 430]]);
  chaletStreet([[470, 430], [536, 430]]);
  chaletStreet([[580, 430], [600, 430], [618, 482]]);
  chaletStreet([[576, 588], [636, 588]]);

  // ---------------------------------------------------------------------------------------------------
  // Pines in snow everywhere the valley leaves room: thick woods, thinning toward the districts; none on
  // the ski run, under the cable car or on the lake.
  const pineAt = (x: number, z: number): boolean => {
    if (x < 6 || z < 6 || x > SIZE - 7 || z > SIZE - 7) return false;
    if (ctx.inZone(x, z, 3) || ctx.nearPath(x, z, 4) || ctx.keptOut(x, z, 2) || reservedAt(x, z, 2) || wet(x, z) || ctx.inWater(x, z)) return false;
    if (x > 100 && x < 240 && z > 296 && z < 444) return false;
    const y = surface(x, z);
    if (world.get(x, y + 1, z) !== 0 || world.get(x, y, z) === B.ice) return false;
    return [[2, 0], [-2, 0], [0, 2], [0, -2]].every(([dx = 0, dz = 0]) => Math.abs(surface(x + dx, z + dz) - y) <= 2);
  };
  for (let gx = 4; gx < SIZE - 4; gx += 5) {
    for (let gz = 4; gz < SIZE - 4; gz += 5) {
      const x = Math.round(gx + (rng() - 0.5) * 4);
      const z = Math.round(gz + (rng() - 0.5) * 4);
      const density = (x < 300 && z < 130) || x < 110 ? 0.85 : 0.18 + 0.75 * fbm(SEED + 5, x / 70, z / 70);
      if (rng() > density || !pineAt(x, z)) continue;
      placeSnowPine(world, x, surface(x, z) + 1, z, 6 + Math.floor(rng() * 6), { trunk: B.trunk, leaves: B.needles, snow: B.snow });
      ctx.keepOut(x, z, x, z);
    }
  }
  ctx.landmark('rung-thong-tuyet', 'Rừng thông tuyết', 300, 700);
}

await runIfMain(import.meta.url, generateNuiTuyet);
