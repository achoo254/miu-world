// Generates "Nhà của bé", the child's own home (owner, 03/10/2026: "thêm màn nhà của bé nữa. trong nhà phải
// thiết kế như mock"; "phải đẹp như mock, cầu thang lên tầng2 quá xấu"; plan 261003, mock panels 1–13), from a
// fixed seed: 160 x 160 blocks of home grounds, the land round them generated while playing. The child
// arrives at the front gate off the country lane: the wooden name board with its cat's head and the cat
// mailbox beside the roofed gate, the stone walk between two beds thick with flowers up to the two-storey
// cottage (nha-cua-be-house.ts: stone below, cream plaster in a timber frame above, red tiles, chimney and
// dormers, the arched door between its lanterns, climbing roses and window boxes), lanterns along the walk,
// a bench, the swing, the scarecrow and the cat flag in the front yard. Inside, warm with lamplight, furnished
// as the mock's rooms: the living room round its rug (the cream sofa, the television, armchairs, the reading
// nook under the gallery); the wooden staircase with its balusters, handrail, newel lanterns and runner up
// to the gallery; the kitchen (fridge, counters, plate rack) and the dining table laid with cake and fruit;
// the storeroom of shelves, sacks and garden tools, and the bathroom at its end behind a double door (the
// toilet, the washbasin and the mirror, the shower the child steps into, the washing machine, the bath mat);
// upstairs the study (the desk under the timetable, tall
// bookcases, drawings pinned up), the bedroom (the pink polka-dot bed with its bunny pillow, the night lamp,
// the cat rug, the wardrobe with the uniform calendar beside it, the dressing table, pink curtains) and the
// toy corner. East of the house the fenced vegetable garden (carrot and cabbage beds, sunflowers, the little
// shed, the watering can); behind it the animal pen (the hen house, hens, the cows, the trough, hay); west
// the pond fed by a stream, its wooden dock with a boat. Two things on the walls open the child's own
// timetable and uniform days in the game: `nha-thoi-khoa-bieu` and `nha-lich-dong-phuc`; the notebook on
// the living room's sideboard opens her decorating (`nha-trang-tri`, mock panels 11 and 12): every piece she
// may restyle is a slot of content/home/decor.json, written here in all its styles (her pet's bed among them).
// Output: assets/generated/world/nha-cua-be/{regions/, horizon.bin, entities.json}
import path from 'node:path';
import { HomeDecorCatalog } from '../../packages/schema/src/home-decor';
import { REPO_ROOT, readJson } from '../assets/asset-lib';
import { PACK, runIfMain } from './map-kit';
import { placeWindmill } from './structures/countryside';
import { placeHomeCottage, HOME_SIZE, type HomeLayout } from './structures/nha-cua-be-house';
import { distanceToPath, type Point } from './structures/path';
import { placeTree } from './structures/tree';
import { put } from './structures/world-writer';
import { animal, crowd, person, type Resident } from './village-life';
import { generateZoneMap, type Zone, type ZoneMapContext } from './zone-map';

export const MAP_ID = 'nha-cua-be';
const SIZE = 160;
const GROUND = 12;
const WATER_LEVEL = 11;
/** Standing height on the ground (and on the house's ground floor). */
const STAND = GROUND + 1;

/** The child arrives on the lane before the front gate, looking down the walk at the house. */
const SPAWN = { x: 80, z: 24 } as const;
/** The cottage's corner (its front, the door in the middle of it, faces the gate to the north). */
const HOME = { x0: 64, z0: 56 } as const;
const HOME_X1 = HOME.x0 + HOME_SIZE.w - 1;
const HOME_Z1 = HOME.z0 + HOME_SIZE.d - 1;
/** The front yard's picket fence (its gate at the walk), the vegetable garden east of the house, the pen behind it. */
const YARD = { x0: 50, z0: 29, x1: 108, z1: 55 } as const;
const GATE = { x0: 77, x1: 83, z: YARD.z0 } as const;
const GARDEN = { x0: 112, z0: 34, x1: 146, z1: 86 } as const;
const PEN = { x0: 52, z0: 92, x1: 100, z1: 124 } as const;
/** The pond west of the house and the stream running from it off the map's north-west. */
const POND = { x: 26, z: 76, rx: 15, rz: 21 } as const;
const STREAM: Point[] = [[20, 57], [14, 44], [8, 34], [-2, 27]];
/** The hen house's corner (five by four, a hatch on its south side). */
const HEN_HOUSE = { x0: 56, z0: 96 } as const;
/** The garden shed's corner (five by five, its door on the west toward the garden's path). */
const SHED = { x0: 137, z0: 75 } as const;
/** The windmill on the lawn past the garden (panel 1's mill on the skyline). */
const MILL = { x: 136, z: 112 } as const;
/** The two flower beds either side of the walk (inclusive columns, rows). */
const BEDS = [[72, 77], [83, 88]] as const;
const BED_ROWS = [32, 44] as const;

export const ZONES: readonly Zone[] = [{ chapter: 1, id: 'nha-va-vuon', name: 'Ngôi nhà và khu vườn', x: 81, z: 80, hx: 67, hz: 57, start: [SPAWN.x, SPAWN.z] }];

// Ways: the country lane along the north, the spur to the gate and the stone walk to the door, the yard's
// cross walk to its side gates, on west to the pond's dock and east to the garden and down its middle, the
// side lane round the east of the house to the back door and into the pen.
const LANE: Point[] = [[0, 18], [SIZE - 1, 18]];
const SPUR: Point[] = [[SPAWN.x, 18], [SPAWN.x, YARD.z0 + 1]];
const WALK: Point[] = [[80, YARD.z0 + 1], [80, HOME.z0 - 1]];
const CROSS: Point[] = [[YARD.x0 + 2, 48], [YARD.x1 - 2, 48]];
const TO_POND: Point[] = [[YARD.x0 + 2, 48], [44, 48], [44, 76], [33, 76]];
const TO_GARDEN: Point[] = [[YARD.x1 - 2, 48], [128, 48], [128, GARDEN.z1 - 2]];
const SIDE_LANE: Point[] = [[110, 48], [110, 88], [75, 88]];
const BACK: Point[] = [[75, HOME_Z1 + 1], [75, 112]];
const TO_SHED: Point[] = [[128, SHED.z0 + 2], [SHED.x0 - 1, SHED.z0 + 2]];
const TO_MILL: Point[] = [[128, GARDEN.z1 - 2], [128, MILL.z - 7], [MILL.x, MILL.z - 7]];
const ROUTES: Point[][] = [LANE, SPUR, WALK, CROSS, TO_POND, TO_GARDEN, SIDE_LANE, BACK, TO_SHED, TO_MILL];

const inEllipse = (e: { x: number; z: number; rx: number; rz: number }, x: number, z: number): boolean => ((x - e.x) / e.rx) ** 2 + ((z - e.z) / e.rz) ** 2 < 1;
const inWater = (x: number, z: number): boolean => inEllipse(POND, x, z) || distanceToPath(STREAM, x, z) < 1.7;

const N = PACK.nature;
const F = PACK.furniture;
const BX = PACK.box;
/** The home's own box props (content/world/box-props/nha-cua-be.json) and the ones it shares with the other maps. */
const H = {
  timetable: `${BX}/ncb-timetable-board.glb`,
  calendar: `${BX}/ncb-uniform-calendar.glb`,
  vanity: `${BX}/ncb-vanity.glb`,
  sofa: `${BX}/ncb-sofa.glb`,
  fridge: `${BX}/ncb-fridge.glb`,
  drawings: `${BX}/ncb-drawings.glb`,
  railing: `${BX}/ncb-railing.glb`,
  doorLeft: `${BX}/ncb-door-left.glb`,
  doorRight: `${BX}/ncb-door-right.glb`,
  bathDoorLeft: `${BX}/ncb-bath-door-left.glb`,
  bathDoorRight: `${BX}/ncb-bath-door-right.glb`,
  mailbox: `${BX}/ncb-cat-mailbox.glb`,
  wateringCan: `${BX}/ncb-watering-can.glb`,
  stairRailRise: `${BX}/ncb-stair-rail-rise.glb`,
  stairRailFlat: `${BX}/ncb-stair-rail-flat.glb`,
  newel: `${BX}/ncb-newel.glb`,
  runnerRise: `${BX}/ncb-runner-rise.glb`,
  runnerFlat: `${BX}/ncb-runner-flat.glb`,
  underStairDoor: `${BX}/ncb-under-stair-door.glb`,
  tallBookcase: `${BX}/ncb-bookcase-tall.glb`,
  roseVine: `${BX}/ncb-rose-vine.glb`,
  flowerBox: `${BX}/ncb-flower-box.glb`,
  plateRack: `${BX}/ncb-plate-rack.glb`,
  fruitBowl: `${BX}/ncb-fruit-bowl.glb`,
  teaTable: `${BX}/ncb-tea-table.glb`,
  wallClock: `${BX}/ncb-wall-clock.glb`,
  // Shared: Xóm Mái Ấm's home and farm, Nông trại's yard, Thư viện's shelves, the forest's tool rack, the market's sacks.
  railFence: `${BX}/xma-rail-fence.glb`,
  diningTable: `${BX}/xma-dining-table.glb`,
  stove: `${BX}/xma-stove.glb`,
  dresser: `${BX}/xma-dresser.glb`,
  hangingLantern: `${BX}/xma-hanging-lantern.glb`,
  coop: `${BX}/xma-coop.glb`,
  trough: `${BX}/xma-trough.glb`,
  hayBale: `${BX}/xma-hay-bale.glb`,
  hayPile: `${BX}/xma-hay-pile.glb`,
  milkCan: `${BX}/xma-milk-can.glb`,
  cabbage: `${BX}/xma-cabbage.glb`,
  pumpkin: `${BX}/xma-pumpkin.glb`,
  scarecrow: `${BX}/nt-scarecrow.glb`,
  sunflower: `${BX}/nt-sunflower.glb`,
  flowerPot: `${BX}/nt-flower-pot.glb`,
  jarShelf: `${BX}/nt-jar-shelf.glb`,
  flourSacks: `${BX}/nt-flour-sacks.glb`,
  smallLantern: `${BX}/nt-hanging-lantern.glb`,
  riceSack: `${BX}/cp-sack-rice.glb`,
  toolRack: `${BX}/kr-tool-rack.glb`,
  readingLamp: `${BX}/tv-reading-lamp.glb`,
  armchair: `${BX}/ntu-armchair.glb`,
  bench: `${BX}/park-bench.glb`,
  rug: `${BX}/xma-rug.glb`,
  wallShelf: `${BX}/xma-wall-shelf.glb`,
  wallLantern: `${BX}/tv-wall-lantern.glb`,
  bookcase: `${BX}/th-bookcase.glb`,
  poufs: `${BX}/tv-poufs.glb`,
  jarShelfSmall: `${BX}/cp-shelf-jars.glb`,
  jarShelfLow: `${BX}/kr-jar-shelf.glb`,
  cornSack: `${BX}/cp-sack-corn.glb`,
  beanSack: `${BX}/cp-sack-beans.glb`,
  appleCrate: `${BX}/nt-apple-crate.glb`,
  swing: `${BX}/swing-set.glb`,
  planter: `${BX}/cp-planter.glb`,
  hangingBucket: `${BX}/xma-hanging-bucket.glb`,
  strawberryPot: `${BX}/nt-strawberry-pot.glb`,
  lanternString: `${BX}/tt-lantern-string.glb`,
  bunting: `${BX}/cp-bunting.glb`,
  buntingB: `${BX}/cp-bunting-b.glb`,
  garlic: `${BX}/cp-string-garlic.glb`,
  chilli: `${BX}/cp-string-chilli.glb`,
  onion: `${BX}/cp-string-onion.glb`,
  easel: `${BX}/th-easel.glb`,
  stool: `${BX}/cp-stool.glb`,
  ladder: `${BX}/nt-ladder.glb`,
  brooms: `${BX}/cp-brooms.glb`,
};
/** Pack furniture, food and garden things. */
const K = {
  books: `${F}/books.glb`,
  tableLamp: `${F}/lampRoundTable.glb`,
  nightstand: `${F}/cabinetBed.glb`,
  tvCabinet: `${F}/cabinetTelevision.glb`,
  tv: `${F}/televisionVintage.glb`,
  coffeeTable: `${F}/tableCoffee.glb`,
  rugRound: `${F}/rugRound.glb`,
  lowShelf: `${F}/bookcaseOpenLow.glb`,
  openBook: `${PACK.props}/open-book.glb`,
  alarmClock: `${PACK.props}/alarm-clock.glb`,
  ball: `${PACK.props}/soccer-ball.glb`,
  plant: `${F}/pottedPlant.glb`,
  smallPlant: `${F}/plantSmall1.glb`,
  stove: `${F}/kitchenStove.glb`,
  balloon: `${PACK.props}/balloon.glb`,
  train: `${PACK.props}/railway-red.glb`,
  kite: `${PACK.props}/kite.glb`,
  gift: `${PACK.props}/gift-red.glb`,
  puzzle: `${PACK.props}/puzzle-red.glb`,
  cabinet: `${F}/kitchenCabinet.glb`,
  sink: `${F}/kitchenSink.glb`,
  toilet: `${F}/toilet.glb`,
  washbasin: `${F}/bathroomSinkSquare.glb`,
  shower: `${F}/shower.glb`,
  mirror: `${F}/bathroomMirror.glb`,
  washer: `${F}/washer.glb`,
  bathMat: `${F}/rugDoormat.glb`,
  cake: `${PACK.food}/cake.glb`,
  apple: `${PACK.food}/apple.glb`,
  banana: `${PACK.food}/banana.glb`,
  grapes: `${PACK.food}/grapes.glb`,
  pan: `${PACK.food}/frying-pan.glb`,
  pot: `${PACK.food}/pot-stew.glb`,
  crate: `${PACK.survival}/box-large.glb`,
  box: `${PACK.survival}/box.glb`,
  barrel: `${PACK.survival}/barrel.glb`,
  bucket: `${PACK.survival}/bucket.glb`,
  shovel: `${PACK.survival}/tool-shovel.glb`,
  hoe: `${PACK.survival}/tool-hoe.glb`,
  globe: `${PACK.props}/globe.glb`,
  picture: `${PACK.props}/framed-picture.glb`,
  pictureYellow: `${PACK.props}/framed-picture-yellow.glb`,
  teddy: `${PACK.props}/teddy-bear.glb`,
  carrot: `${N}/crop_carrot.glb`,
  flowers: [`${N}/flower_redA.glb`, `${N}/flower_yellowA.glb`, `${N}/flower_purpleB.glb`, `${N}/flower_redA.glb`],
  bush: `${N}/plant_bushLarge.glb`,
  smallBush: `${N}/plant_bush.glb`,
  grass: `${N}/grass_large.glb`,
  lily: `${N}/lily_large.glb`,
  lilySmall: `${N}/lily_small.glb`,
  reeds: `${N}/plant_flatTall.glb`,
  rock: `${N}/rock_smallA.glb`,
  canoe: `${N}/canoe.glb`,
  paddle: `${N}/canoe_paddle.glb`,
  logs: `${N}/log_stack.glb`,
  stump: `${N}/stump_round.glb`,
};
/** What the family and the neighbours hold. */
const HELD = {
  hoe: `${PACK.survival}/tool-hoe.glb`,
  bucket: `${PACK.survival}/bucket.glb`,
  basket: `${PACK.props}/basket.glb`,
  envelope: `${PACK.props}/envelope.glb`,
  kite: `${PACK.props}/kite.glb`,
  egg: `${PACK.food}/egg.glb`,
};

/** The home's everyday life: grandparents at the garden and the hens, neighbours passing, the postman, pets and farm animals. */
function homeLife(map: { landmark: (id: string) => readonly [number, number] }): Resident[] {
  const garden = map.landmark('vuon-rau');
  const coop = map.landmark('chuong-ga');
  const yard = map.landmark('san-truoc');
  return [
    { routine: 'gardener', name: 'Ông nội làm vườn', model: person('a'), held: [HELD.hoe], at: [garden[0] + 2, garden[1] - 14] },
    { routine: 'waterer', name: 'Bà nội tưới rau', model: person('i'), held: [HELD.bucket], at: [garden[0] + 18, garden[1] - 10] },
    { routine: 'hen-keeper', name: 'Cô Út cho gà ăn', model: person('e'), held: [HELD.basket, HELD.egg], at: [coop[0] + 6, coop[1] + 2] },
    { routine: 'milker', name: 'Chú hàng xóm vắt sữa', model: person('m'), held: [HELD.bucket], at: [coop[0] + 26, coop[1] + 8] },
    { routine: 'laundry', name: 'Cô hàng xóm phơi áo', model: person('l'), held: [HELD.basket], at: [102, 84] },
    { routine: 'porter', name: 'Chú đưa thư', model: person('j'), held: [HELD.envelope], at: [SPAWN.x - 14, SPAWN.z - 4] },
    { routine: 'kite-flyer', name: 'Anh họ thả diều', model: person('o'), held: [HELD.kite], at: [yard[0] + 20, yard[1] - 6] },
    { routine: 'dog', name: 'Cún Mực giữ nhà', model: animal('dog'), at: [SPAWN.x + 6, SPAWN.z + 8] },
    ...crowd('cat', ['Mèo Mun sưởi nắng', 'Mèo Vàng bắt bướm'], [animal('cat')], [yard[0] - 18, yard[1] + 2], 6, 2),
    ...crowd('chick', ['Gà mái nâu', 'Gà mái trắng', 'Gà con'], [animal('chick')], coop, 6, 12),
    ...crowd('cow', ['Bò Sữa Bông', 'Bò Vàng'], [animal('cow')], [coop[0] + 26, coop[1] + 14], 6, 2),
  ];
}

/** The styles the child picks for her home (panels 11 and 12). */
export async function readDecorCatalog(): Promise<HomeDecorCatalog> {
  return readJson(path.join(REPO_ROOT, 'content/home/decor.json'), HomeDecorCatalog);
}

/** The block the house is built with for a block slot's part: the slot's default style (so a pick paints over exactly these). */
function decorBlock(catalog: HomeDecorCatalog, slotId: string, role: string): string {
  const slot = catalog.slots.find((s) => s.id === slotId);
  const block = slot?.options.find((o) => o.id === slot.default)?.blocks?.[role];
  if (!block) throw new Error(`content/home/decor.json: slot ${slotId} has no default block for ${role}`);
  return block;
}

export async function generateNhaCuaBe() {
  const decor = await readDecorCatalog();
  return generateZoneMap({
    mapId: MAP_ID,
    region: 'nha-cua-be',
    seedText: 'miu-nha-cua-be',
    // The countryside round the home: farms and windmills, hills and woods (the mock's far mountains and mill).
    outland: 'farm',
    size: SIZE,
    soil: { grass: 'grass-home', path: 'path' },
    // Level ground everywhere (owner, 03/10/2026: no bumps on the ways or the yard); only the pond and its stream are dug in.
    ground: { ground: GROUND, roll: 0 },
    zones: ZONES,
    spawn: { x: SPAWN.x, z: SPAWN.z, yaw: 180 },
    water: { level: WATER_LEVEL, covers: inWater },
    routes: ROUTES,
    pathsFromSpawn: false,
    gates: [{ to: 'trung-tam', at: [100, 22] }],
    rides: false,
    trees: { skip: 0.45, blocks: (roll, block) => ({ log: block('tree-log'), leaves: block(roll < 0.3 ? 'leaves-pink' : roll < 0.38 ? 'leaves-autumn' : 'leaves') }) },
    dressing: { models: [...K.flowers, K.grass, K.bush], spacing: 9 },
    life: homeLife,
    decor,
    // Lamplight indoors, a golden afternoon round the house (the mock's warm evening light).
    moods: [
      { mood: 'warm', x0: HOME.x0 + 1, z0: HOME.z0 + 1, x1: HOME_X1 - 1, z1: HOME_Z1 - 1 },
      { mood: 'golden', x0: 0, z0: 0, x1: SIZE - 1, z1: SIZE - 1 },
    ],
    build: (ctx) => buildHome(ctx, decor),
  });
}

function buildHome(ctx: ZoneMapContext, decor: HomeDecorCatalog): void {
  const { world, block } = ctx;
  const look = (slot: string, role: string): number => block(decorBlock(decor, slot, role));
  const B = {
    grass: ctx.soil.grass,
    planks: block('planks'),
    log: block('log'),
    sand: block('sand'),
    stone: block('stone'),
    woodRed: block('wood-red'),
    glass: block('glass'),
    lantern: block('lantern'),
    cobble: look('path', 'way'),
    farmland: block('farmland'),
    leaves: block('leaves'),
    pink: block('leaves-pink'),
    treeLog: block('tree-log'),
    white: block('snow'),
    wallpaper: block('wallpaper-pink'),
    roof: look('house', 'roof'),
    ridge: look('house', 'ridge'),
    upper: look('house', 'upper'),
    lower: look('house', 'lower'),
    gateRoof: look('gate', 'roof'),
    gateRidge: look('gate', 'ridge'),
    gatePost: look('gate', 'post'),
  };
  const set = (x: number, y: number, z: number, id: number): void => put(world, x, y, z, id);
  /** A ground column's feet. */
  const feet = (x: number, z: number): [number, number, number] => [x + 0.5, STAND, z + 0.5];

  // 1. The cottage, and what keeps trees, flowers and quest places off it and its doorsteps.
  const home = placeHomeCottage(world, HOME.x0, HOME.z0, STAND, {
    planks: B.planks,
    log: B.log,
    stoneWall: B.lower,
    plinth: B.stone,
    plaster: B.upper,
    wallpaper: B.wallpaper,
    // Plank treads: the floors and the steps are one way for the child from the door to the gallery.
    stairs: B.planks,
    glass: B.glass,
    roof: B.roof,
    ridge: B.ridge,
    chimney: block('brick-grey'),
    sill: B.woodRed,
    lantern: B.lantern,
  });
  ctx.keepOut(HOME.x0 - 2, HOME.z0 - 3, HOME_X1 + 2, HOME_Z1 + 3);
  // Climbing roses on the walls (panel 1), flat against them beside the windows and the door.
  for (const x of [HOME.x0 + 1, HOME.x0 + 6, HOME.x0 + 11, HOME.x0 + 21, HOME.x0 + 26, HOME.x0 + 31]) ctx.propAt(H.roseVine, [x + 0.5, STAND, HOME.z0], 0);
  for (const z of [HOME.z0 + 3, HOME.z0 + 9, HOME.z0 + 15]) {
    ctx.propAt(H.roseVine, [HOME.x0, STAND, z + 0.5], 90);
    ctx.propAt(H.roseVine, [HOME_X1 + 1, STAND, z + 0.5], 270);
  }
  for (const [x, y, z] of home.sills) ctx.propAt(K.flowers[Math.floor(x) % K.flowers.length] ?? K.bush, [x, y, z], (Math.floor(x) * 37) % 360);
  // Window boxes of flowers under the upper front windows.
  for (const w of home.windows) if (w.face === 'north' && w.at[1] > STAND + 4) ctx.propAt(H.flowerBox, [w.at[0], w.at[1] - 0.42, HOME.z0 - 0.22], 0);
  // The front door: two leaves hung in the arch from its sides, in the middle of the wall; they open inward as the
  // child comes near (or taps them) and close behind her (the game's door effect).
  ctx.propAt(H.doorLeft, [home.door.x0, STAND, HOME.z0 + 0.5], 0);
  ctx.propAt(H.doorRight, [home.door.x0 + home.door.width, STAND, HOME.z0 + 0.5], 0);
  furnish(ctx, home);
  // The house's own colours (panel 12): its roof, ridge, walls up and down, with the hen house's and the shed's roofs.
  const { x0: hx0, z0: hz0 } = HOME;
  const top = home.upperY + 3;
  const hen = [HEN_HOUSE.x0 - 1, STAND + 3, HEN_HOUSE.z0 - 1, HEN_HOUSE.x0 + 5, STAND + 5, HEN_HOUSE.z0 + 4] as const;
  const shed = [SHED.x0 - 1, STAND + 3, SHED.z0 - 1, SHED.x0 + 5, STAND + 6, SHED.z0 + 5] as const;
  const ring = (y0: number, y1: number): Array<readonly [number, number, number, number, number, number]> => [
    [hx0, y0, hz0, HOME_X1, y1, hz0],
    [hx0, y0, HOME_Z1, HOME_X1, y1, HOME_Z1],
    [hx0, y0, hz0, hx0, y1, HOME_Z1],
    [HOME_X1, y0, hz0, HOME_X1, y1, HOME_Z1],
  ];
  const roofBox = [hx0 - 1, top + 1, hz0 - 1, HOME_X1 + 1, home.roofTop, HOME_Z1 + 1] as const;
  ctx.decorBlocks('house', {
    roof: [roofBox, hen, shed],
    ridge: [roofBox, hen, shed],
    upper: [...ring(home.upperY - 1, home.roofTop), [hx0 + 5, top + 3, hz0, HOME_X1 - 4, home.roofTop, hz0 + 1]],
    lower: ring(STAND, home.upperY - 2),
  });

  // 2. The front yard (panel 8): the stone walk and cross walk, the roofed gate in the picket fence, beds of
  // flowers either side of the walk, a strip of flowers along the house, lanterns, the bench, the swing, the
  // scarecrow, the cat flag, flower pots by the door.
  for (let x = 79; x <= 81; x++) for (let z = YARD.z0; z < HOME.z0; z++) set(x, GROUND, z, B.cobble);
  for (let x = YARD.x0 + 1; x < YARD.x1; x++) for (let z = 47; z <= 49; z++) if (ctx.onPath(x, z)) set(x, GROUND, z, B.cobble);
  ctx.decorBlocks('path', { way: [[YARD.x0, GROUND, YARD.z0, YARD.x1, GROUND, HOME.z0]] });
  // The gate: posts, a beam, a little tiled roof with a ridge; a lantern hung under each side of its beam.
  for (const x of [GATE.x0, GATE.x1]) for (let y = STAND; y <= STAND + 3; y++) set(x, y, GATE.z, B.gatePost);
  for (let x = GATE.x0; x <= GATE.x1; x++) set(x, STAND + 4, GATE.z, B.gatePost);
  for (let x = GATE.x0 - 1; x <= GATE.x1 + 1; x++) {
    for (const z of [GATE.z - 1, GATE.z + 1]) set(x, STAND + 5, z, B.gateRoof);
    set(x, STAND + 6, GATE.z, B.gateRidge);
    set(x, STAND + 5, GATE.z, B.gateRoof);
  }
  ctx.decorBlocks('gate', { roof: [[GATE.x0 - 1, STAND, GATE.z - 1, GATE.x1 + 1, STAND + 6, GATE.z + 1]], ridge: [[GATE.x0 - 1, STAND, GATE.z - 1, GATE.x1 + 1, STAND + 6, GATE.z + 1]], post: [[GATE.x0, STAND, GATE.z, GATE.x1, STAND + 4, GATE.z]] });
  for (const x of [GATE.x0 + 1.5, GATE.x1 - 0.5]) ctx.propAt(H.smallLantern, [x, STAND + 4 - 0.75, GATE.z + 0.5], 0);
  ctx.keepOut(GATE.x0 - 1, GATE.z - 2, GATE.x1 + 1, GATE.z + 2);
  const picket = (x: number, z: number, along: 'x' | 'z'): void => ctx.decorSpot('fence', along === 'x' ? [x + 1, STAND, z + 0.5] : [x + 0.5, STAND, z + 1], along === 'x' ? 0 : 90);
  fenceRun(ctx, picket, YARD.x0, YARD.z0, 'x', YARD.x1 - YARD.x0 + 1, [GATE.x0, GATE.x1]);
  fenceRun(ctx, picket, YARD.x0, YARD.z0 + 1, 'z', YARD.z1 - YARD.z0);
  fenceRun(ctx, picket, YARD.x1, YARD.z0 + 1, 'z', YARD.z1 - YARD.z0);
  fenceRun(ctx, picket, YARD.x0 + 1, YARD.z1, 'x', HOME.x0 - 3 - YARD.x0);
  fenceRun(ctx, picket, HOME_X1 + 3, YARD.z1, 'x', YARD.x1 - HOME_X1 - 3);
  // Flower beds either side of the walk, two blocks off it, edged in logs, two flowers on every cell (the
  // child's garden style), blossom bushes at their corners.
  for (const [bx0, bx1] of BEDS) {
    for (let x = bx0 - 1; x <= bx1 + 1; x++) for (const z of [BED_ROWS[0] - 1, BED_ROWS[1] + 1]) set(x, GROUND, z, B.log);
    for (let z = BED_ROWS[0]; z <= BED_ROWS[1]; z++) for (const x of [bx0 - 1, bx1 + 1]) set(x, GROUND, z, B.log);
    for (let x = bx0; x <= bx1; x++) {
      for (let z = BED_ROWS[0]; z <= BED_ROWS[1]; z++) {
        set(x, GROUND, z, B.grass);
        ctx.decorSpot('garden', [x + 0.28, STAND, z + 0.3], (x * 41 + z * 13) % 360);
        ctx.decorSpot('garden', [x + 0.74, STAND, z + 0.72], (x * 17 + z * 29) % 360);
      }
    }
    for (const z of [BED_ROWS[0] - 2, BED_ROWS[1] + 2]) for (const x of [bx0 - 1, bx1 + 1]) set(x, STAND, z, (x + z) % 2 === 0 ? B.pink : B.leaves);
    ctx.keepOut(bx0 - 1, BED_ROWS[0] - 2, bx1 + 1, BED_ROWS[1] + 2);
  }
  // A strip of flowers and bushes along the house front, clear of the door's step.
  for (let x = HOME.x0 + 1; x < HOME_X1; x++) {
    if (x >= home.door.x0 - 2 && x <= home.door.x0 + home.door.width + 1) continue;
    for (const z of [HOME.z0 - 3, HOME.z0 - 2]) {
      set(x, GROUND, z, B.grass);
      ctx.prop((x + z) % 5 === 0 ? K.smallBush : K.flowers[(x * 7 + z) % K.flowers.length] ?? K.bush, x, z, (x * 53) % 360);
    }
  }
  // Lanterns along the walk and the cross walk (the garden lights the child restyles).
  for (const z of [YARD.z0 + 2, 46, HOME.z0 - 4]) for (const x of [78, 82]) ctx.decorSpot('lights', feet(x, z), 0);
  for (const x of [62, 98]) ctx.decorSpot('lights', feet(x, 46), 0);
  ctx.prop(H.flowerPot, 77, HOME.z0 - 1, 0);
  ctx.prop(H.flowerPot, 83, HOME.z0 - 1, 0);
  ctx.prop(H.bench, 60, 40, 270);
  ctx.prop(H.bench, 100, 40, 90);
  ctx.prop(H.swing, 64, 37, 90);
  ctx.keepOut(61, 34, 67, 40);
  ctx.prop(H.scarecrow, 98, 34, 200);
  ctx.decorSpot('flag', feet(58, 52), 30);
  ctx.keepOut(57, 51, 61, 53);
  ctx.prop(H.planter, 96, 52, 0);
  ctx.prop(H.strawberryPot, 101, 51, 0);
  for (const [x, z] of [[55, 34], [104, 52], [62, 52], [104, 33], [55, 45]] as const) {
    placeTree(world, x, STAND, z, 6, { log: B.treeLog, leaves: (x + z) % 2 === 0 ? B.pink : B.leaves }, ctx.rng);
    ctx.keepOut(x - 2, z - 2, x + 2, z + 2);
  }
  ctx.landmark('cong-truoc', 'Cổng trước nhà', 80, YARD.z0 - 2);
  // Across the lane the meadow stays open, so the house is seen whole from the lane and the gate.
  ctx.keepOut(58, 0, 102, 16);
  ctx.landmark('san-truoc', 'Sân trước nhà', 66, 40);

  // 3. Outside the gate (panel 13): the name board with its crest (a cat's head by default), the cat mailbox,
  // flowers at the board's foot.
  const sign = { x: 86, z: YARD.z0 - 2 };
  ctx.target({ id: 'nha-bien-ten', name: 'Nhà của {name}', label: 'Đọc biển tên', at: [sign.x + 0.5, STAND, sign.z + 0.5], yaw: 180, board: 'Nhà của {name}' });
  // The board's top stands 2.2 blocks over its foot (riddle-board.ts); the crest sits on it.
  ctx.decorSpot('sign', [sign.x + 0.5, STAND + 2.2, sign.z + 0.5], 0);
  ctx.keepOut(sign.x - 1, sign.z - 1, sign.x + 1, sign.z + 1);
  ctx.prop(H.mailbox, 75, YARD.z0 - 2, 0);
  ctx.keepOut(74, YARD.z0 - 3, 76, YARD.z0 - 1);
  for (const x of [88, 89]) ctx.prop(K.flowers[x % K.flowers.length] ?? K.bush, x, sign.z, 0);

  // 4. The vegetable garden (panel 9): a picket fence with its gate on the cross walk's line, the path down its
  // middle, beds of carrots and cabbages, pumpkins, sunflowers along the north fence, a lawn to sit on, the
  // little shed with the watering can at its door.
  const gardenGate: readonly [number, number] = [47, 49];
  fenceRun(ctx, picket, GARDEN.x0, GARDEN.z0, 'x', GARDEN.x1 - GARDEN.x0 + 1);
  fenceRun(ctx, picket, GARDEN.x0, GARDEN.z1, 'x', GARDEN.x1 - GARDEN.x0 + 1);
  fenceRun(ctx, picket, GARDEN.x0, GARDEN.z0 + 1, 'z', GARDEN.z1 - GARDEN.z0 - 1, gardenGate);
  fenceRun(ctx, picket, GARDEN.x1, GARDEN.z0 + 1, 'z', GARDEN.z1 - GARDEN.z0 - 1);
  const bed = (x0: number, z0: number, x1: number, z1: number, crop: string, every = 1): void => {
    for (let x = x0; x <= x1; x++) {
      for (let z = z0; z <= z1; z++) {
        set(x, GROUND, z, B.farmland);
        if ((x - x0) % every === 0) ctx.prop(crop, x, z, ((x * 29 + z * 7) % 4) * 90);
      }
    }
    ctx.keepOut(x0, z0, x1, z1);
  };
  for (const z of [39, 43, 52, 56]) bed(115, z, 125, z + 1, K.carrot);
  for (const z of [39, 43, 47]) bed(131, z, 144, z + 1, H.cabbage, 2);
  for (const z of [52, 56]) bed(131, z, 144, z + 1, H.pumpkin, 3);
  for (let x = GARDEN.x0 + 2; x < GARDEN.x1; x += 3) ctx.prop(H.sunflower, x, GARDEN.z0 + 2, 0);
  // The shed: plank walls three high, a doorway three wide toward the path, a tiled roof with its ridge.
  const [sx0, sz0] = [SHED.x0, SHED.z0];
  for (let x = sx0; x < sx0 + 5; x++) {
    for (let z = sz0; z < sz0 + 5; z++) {
      set(x, GROUND, z, B.planks);
      const edge = x === sx0 || x === sx0 + 4 || z === sz0 || z === sz0 + 4;
      for (let y = STAND; y <= STAND + 2; y++) {
        const door = x === sx0 && z >= sz0 + 1 && z <= sz0 + 3;
        const post = (x === sx0 || x === sx0 + 4) && (z === sz0 || z === sz0 + 4);
        set(x, y, z, edge && !door ? (post || y === STAND + 2 ? B.log : B.planks) : 0);
      }
    }
  }
  for (let z = sz0 - 1; z <= sz0 + 5; z++) {
    for (let k = 0; k <= 2; k++) for (const x of [sx0 - 1 + k, sx0 + 5 - k]) set(x, STAND + 3 + k, z, B.roof);
    set(sx0 + 2, STAND + 6, z, B.ridge);
  }
  for (const z of [sz0, sz0 + 4]) for (let x = sx0 + 1; x <= sx0 + 3; x++) for (let y = STAND + 3; y <= STAND + 4 + (x === sx0 + 2 ? 1 : 0); y++) set(x, y, z, B.planks);
  ctx.keepOut(sx0 - 1, sz0 - 1, sx0 + 5, sz0 + 5);
  ctx.propAt(H.toolRack, [sx0 + 3.5, STAND, sz0 + 3.85], 0);
  ctx.prop(K.barrel, sx0 + 3, sz0 + 1, 0);
  ctx.prop(H.wateringCan, sx0 - 2, sz0 - 1, 60);
  ctx.prop(H.wateringCan, 118, 66, 200);
  ctx.landmark('vuon-rau', 'Vườn rau cạnh nhà', 120, 66);
  ctx.landmark('kho-vuon', 'Nhà kho nhỏ trong vườn', SHED.x0 - 5, SHED.z0 + 2);

  // 5. The animal pen behind the house (panel 10): a rail fence with its gate on the back lane, the hen house
  // of logs under a tiled roof with its hatch, nesting coops, the trough, hay bales and loose hay, a milk can.
  const penGate: readonly [number, number] = [73, 77];
  const rail = (x: number, z: number, along: 'x' | 'z'): void => ctx.propAt(H.railFence, along === 'x' ? [x + 1, STAND, z + 0.5] : [x + 0.5, STAND, z + 1], along === 'x' ? 0 : 90);
  fenceRun(ctx, rail, PEN.x0, PEN.z0, 'x', PEN.x1 - PEN.x0 + 1, penGate);
  fenceRun(ctx, rail, PEN.x0, PEN.z1, 'x', PEN.x1 - PEN.x0 + 1);
  fenceRun(ctx, rail, PEN.x0, PEN.z0 + 1, 'z', PEN.z1 - PEN.z0 - 1);
  fenceRun(ctx, rail, PEN.x1, PEN.z0 + 1, 'z', PEN.z1 - PEN.z0 - 1);
  const [hhx0, hhz0] = [HEN_HOUSE.x0, HEN_HOUSE.z0];
  for (let x = hhx0; x < hhx0 + 5; x++) {
    for (let z = hhz0; z < hhz0 + 4; z++) {
      // A floor of straw; log walls round the hens' room, the hatch low in the south wall.
      set(x, GROUND, z, B.sand);
      const edge = x === hhx0 || x === hhx0 + 4 || z === hhz0 || z === hhz0 + 3;
      for (let y = STAND; y <= STAND + 2; y++) {
        const hatch = z === hhz0 + 3 && x === hhx0 + 2 && y === STAND;
        set(x, y, z, edge && !hatch ? B.log : 0);
      }
    }
  }
  for (let x = hhx0 - 1; x <= hhx0 + 5; x++) {
    for (let z = hhz0 - 1; z <= hhz0 + 4; z++) {
      const step = Math.min(z - (hhz0 - 1), hhz0 + 4 - z);
      set(x, STAND + 3 + Math.min(step, 2), z, step >= 2 ? B.ridge : B.roof);
    }
  }
  ctx.keepOut(hhx0 - 1, hhz0 - 1, hhx0 + 5, hhz0 + 5);
  ctx.prop(H.coop, hhx0 + 8, hhz0 + 1, 0);
  ctx.prop(H.coop, hhx0 + 11, hhz0 + 1, 0);
  ctx.prop(H.hayPile, hhx0 + 2, hhz0 + 6, 0);
  ctx.prop(H.trough, 88, 104, 0);
  ctx.prop(H.trough, 88, 108, 0);
  for (const [x, z] of [[97, 97], [99, 99], [97, 101]] as const) ctx.prop(H.hayBale, x, z, (x * 17) % 180);
  ctx.prop(H.hayPile, 94, 104, 30);
  ctx.prop(H.milkCan, 92, 97, 0);
  ctx.prop(H.milkCan, 93, 98, 40);
  // Two haystacks of straw in the pen's far corner, where the cows graze.
  for (const [cx, cz] of [[94, 118], [89, 120]] as const) {
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) set(cx + dx, STAND, cz + dz, B.sand);
    set(cx, STAND + 1, cz, B.sand);
    ctx.keepOut(cx - 2, cz - 2, cx + 2, cz + 2);
  }
  ctx.keepOut(86, 102, 100, 110);
  ctx.landmark('chuong-ga', 'Chuồng gà sau nhà', 66, 106);

  // 6. The pond (panel 1): lilies and reeds on the water, rocks and bushes on its banks, the dock out into it
  // (the way to the pond runs on as planks over the water) with its posts, a lantern, the boat and a fishing bucket.
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    const k = i % 2 === 0 ? 0.6 : 0.78;
    const [x, z] = [Math.round(POND.x + Math.cos(a) * POND.rx * k), Math.round(POND.z + Math.sin(a) * POND.rz * k)];
    if (z >= 73 && z <= 79 && x >= 30) continue;
    if (ctx.inWater(x, z)) ctx.propAt(i % 4 === 0 ? (K.flowers[0] ?? K.lily) : i % 4 === 2 ? K.lilySmall : K.lily, [x + 0.5, WATER_LEVEL + 1.02, z + 0.5], i * 40);
  }
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2 + 0.15;
    const [x, z] = [Math.round(POND.x + Math.cos(a) * (POND.rx + 2)), Math.round(POND.z + Math.sin(a) * (POND.rz + 2))];
    if (ctx.inWater(x, z) || ctx.onPath(x, z) || ctx.nearPath(x, z, 2.5)) continue;
    ctx.prop(i % 3 === 0 ? K.rock : i % 3 === 1 ? K.reeds : K.smallBush, x, z, i * 47);
  }
  for (const x of [34, 38, 42]) for (const z of [74, 78]) for (let y = WATER_LEVEL - 2; y <= GROUND + 1; y++) set(x, y, z, B.log);
  ctx.propAt(K.canoe, [36.5, WATER_LEVEL + 0.9, 80.5], 90);
  ctx.propAt(K.paddle, [39.5, STAND, 76.9], 90);
  ctx.propAt(K.bucket, [35.5, STAND, 75.5], 0);
  ctx.decorSpot('lights', feet(46, 79), 0);
  ctx.prop(K.stump, 47, 71, 0);
  ctx.landmark('cau-tau', 'Cầu tàu bên ao', 46, 74);
  // Trees by the water and round the yard's west, a log pile.
  for (const [x, z] of [[48, 62], [45, 92], [10, 60], [36, 104]] as const) {
    if (ctx.inWater(x, z) || ctx.onPath(x, z)) continue;
    placeTree(world, x, STAND, z, 7, { log: B.treeLog, leaves: z > 90 ? B.pink : B.leaves }, ctx.rng);
    ctx.keepOut(x - 2, z - 2, x + 2, z + 2);
  }
  ctx.prop(K.logs, 104, 84, 90);

  // 7. The windmill on the lawn east of the pen, its sails to the north; solid inside (no one lives in it).
  placeWindmill(world, MILL.x, MILL.z, STAND, { planks: B.planks, log: B.log, roof: block('brick-red'), sail: B.white, stone: B.stone, glass: B.glass }, 7);
  // The tower's radius at each row (countryside.ts): every open cell inside it, the doorway too, is filled.
  const millRadius = (row: number): number => (row < 2 ? 4 : row < 7 ? 3 : row < 11 ? 2.5 : 2);
  for (let row = 0; row < 13; row++) {
    for (let dx = -4; dx <= 4; dx++) {
      for (let dz = -4; dz <= 4; dz++) {
        if (Math.hypot(dx, dz) <= millRadius(row) + 0.3 && world.get(MILL.x + dx, STAND + row, MILL.z + dz) === 0) set(MILL.x + dx, STAND + row, MILL.z + dz, B.planks);
      }
    }
  }
  ctx.keepOut(MILL.x - 9, MILL.z - 6, MILL.x + 9, MILL.z + 6);
  ctx.landmark('coi-xay-gio', 'Cối xay gió', MILL.x, MILL.z - 7);
  // The bathroom is a place too, named after the grounds' (the review pictures the map's first fourteen).
  ctx.landmark('nha-ve-sinh', 'Nhà vệ sinh', home.bathroom.x0 + 3, home.bathroom.z0 + 2, home.groundY);
}

/**
 * A run of fence pieces (two blocks each, `place` puts one at its first cell) from (x0, z0) along x or z for
 * `length` blocks, leaving the ways, the water and `gap` (inclusive, a gate) open.
 */
function fenceRun(ctx: ZoneMapContext, place: (x: number, z: number, along: 'x' | 'z') => void, x0: number, z0: number, along: 'x' | 'z', length: number, gap?: readonly [number, number]): void {
  for (let i = 0; i + 1 < length; i += 2) {
    const [x, z] = along === 'x' ? [x0 + i, z0] : [x0, z0 + i];
    const t = along === 'x' ? x : z;
    if (gap && t + 1.5 > gap[0] && t - 0.5 < gap[1] + 1) continue;
    const [nx, nz] = along === 'x' ? [x + 1, z] : [x, z + 1];
    if (ctx.onPath(x, z) || ctx.onPath(nx, nz) || ctx.inWater(x, z) || ctx.inWater(nx, nz)) continue;
    place(x, z, along);
  }
}

/** The rooms of the mock (panels 2–7): furniture against the walls and round rugs, the ways between doors left clear. */
function furnish(ctx: ZoneMapContext, home: HomeLayout): void {
  const { living, kitchen, dining, storeroom, bathroom, study, bedroom, toyCorner, wall } = home;
  const g = home.groundY;
  const u = home.upperY;
  /** Faces of the walls each room backs onto (the first open cell's edge). */
  const north = wall.north;
  const south = wall.south + 1;
  const west = wall.west;
  const partX = wall.partitionX;
  const lantern = (x: number, y: number, z: number, yaw: number): void => ctx.propAt(H.wallLantern, [x, y, z], yaw);
  const hanging = (x: number, y: number, z: number): void => ctx.propAt(H.hangingLantern, [x, y, z], 0);

  // Curtains at every window of the rooms (the child's curtain style): on its wall's inside face, over the glass.
  const inside: Record<'north' | 'south' | 'west' | 'east', { yaw: number; at: (w: (typeof home.windows)[number]) => [number, number] }> = {
    north: { yaw: 180, at: (w) => [w.at[0], north + 0.04] },
    south: { yaw: 0, at: (w) => [w.at[0], south - 0.04] },
    west: { yaw: 270, at: (w) => [west + 0.04, w.at[2]] },
    east: { yaw: 90, at: (w) => [wall.east + 0.96, w.at[2]] },
  };
  for (const w of home.windows) {
    if (w.width !== 2) continue; // the landing's long window stays bare: the light on the stairs
    const [x, z] = inside[w.face].at(w);
    const inStore = x >= storeroom.x0 && x <= storeroom.x1 + 1 && z >= storeroom.z0 && z <= storeroom.z1 + 1 && w.at[1] < u;
    if (inStore) continue;
    // Ground-floor windows are three high, upstairs two: the rod sits just under each window's top.
    ctx.decorSpot('curtain', [x, w.at[1] + (w.at[1] < u ? 0.75 : -0.25), z], inside[w.face].yaw);
  }

  // The staircase (panel 2): balusters and a handrail along the stringer, the newel posts with their lanterns,
  // the red runner up the steps, the little cupboard under the stairs (half the height of a door, so it never
  // reads as the house's door), a lantern over the landing.
  for (const piece of home.stairPieces) {
    const model = { 'rail-rise': H.stairRailRise, 'rail-flat': H.stairRailFlat, newel: H.newel, 'runner-rise': H.runnerRise, 'runner-flat': H.runnerFlat }[piece.kind];
    ctx.propAt(model, piece.at, 0);
  }
  ctx.propAt(H.underStairDoor, home.underStair, 270);
  lantern(west, g + 6.2, home.stairs.landing[0] - 0.5, 270);
  ctx.landmark('cau-thang', 'Cầu thang lên tầng hai', home.stairs.x0 + 2, home.stairs.z0 - 1, g);

  // The living room (panel 5), under its open roof: the television on its cabinet facing the cream sofa across
  // the coffee table on the rug, an armchair either side, the floor lamp by the sofa, plants, pictures, a clock,
  // lanterns on the walls and hung from the beams. Under the gallery, the reading nook (poufs, a low shelf, the
  // ornament on it) and the bookcases. The ways from the door to the stairs, the kitchen and the storeroom stay
  // clear: along the front wall, down the stairs' side and along under the gallery.
  const sit = { x: 77.5, z: 64.5 };
  ctx.decorSpot('rug', [sit.x, g, sit.z], 0);
  ctx.centredAt(K.tvCabinet, [sit.x, g, sit.z - 3.4], 0);
  ctx.centredAt(K.tv, [sit.x, g + 0.64, sit.z - 3.4], 0);
  ctx.centredAt(K.coffeeTable, [sit.x, g, sit.z - 0.4], 0);
  ctx.propAt(K.apple, [sit.x - 0.3, g + 0.47, sit.z - 0.4], 0);
  ctx.propAt(H.fruitBowl, [sit.x + 0.3, g + 0.47, sit.z - 0.4], 0);
  ctx.propAt(H.sofa, [sit.x, g, sit.z + 2.3], 0);
  ctx.propAt(H.armchair, [sit.x - 2.9, g, sit.z - 0.4], 270);
  ctx.propAt(H.armchair, [sit.x + 2.9, g, sit.z - 0.4], 90);
  ctx.decorSpot('lamp', [sit.x - 2.4, g, sit.z + 2.6], 0);
  ctx.centredAt(K.plant, [sit.x + 2.4, g, sit.z + 2.6], 0);
  ctx.centredAt(K.plant, [partX - 0.5, g, north + 0.5], 0);
  // The sideboard by the door with the decorating notebook on it: where the child restyles her home.
  ctx.centredAt(K.lowShelf, [partX - 0.5, g, 66.5], 270);
  ctx.target({ id: 'nha-trang-tri', name: 'Sổ trang trí nhà', label: 'Trang trí nhà', at: [partX - 2, g, 66.5], yaw: 270, radius: 2.6 });
  ctx.propAt(K.openBook, [partX - 0.5, g + 1.2, 66.5], 270);
  ctx.propAt(K.picture, [partX - 0.05, g + 2.6, 59.5], 90);
  ctx.propAt(H.wallClock, [partX - 0.02, g + 3.4, 65.5], 90);
  ctx.propAt(K.pictureYellow, [70.5, g + 2.4, north + 0.05], 180);
  ctx.propAt(K.picture, [75.5, g + 2.6, north + 0.05], 180);
  lantern(partX, g + 2.4, 64.5, 90);
  lantern(74.5, g + 2.4, north, 180);
  for (const z of home.beams) for (const x of [71, 76, 81]) hanging(x + 0.5, u + 3 - 1.4, z + 0.5);
  // A string of lanterns across the open room between the beams, bunting on the front wall.
  ctx.propAt(H.lanternString, [76.5, u + 1.2, 62.5], 0);
  ctx.propAt(H.bunting, [71, g + 4.6, north + 0.08], 180);
  ctx.propAt(H.buntingB, [76.5, g + 4.6, north + 0.08], 180);
  // Under the gallery: bookcases on the storeroom's wall beside its doorway, the nook by the west window.
  for (const x of [78.5, 80.5]) ctx.propAt(H.bookcase, [x, g, living.z1 + 0.75], 0);
  ctx.centredAt(K.rugRound, [67.5, g, 69], 0);
  ctx.propAt(H.poufs, [67.5, g, 69], 30);
  ctx.centredAt(K.lowShelf, [66.6, g, 67.6], 270);
  ctx.decorSpot('ornament', [66.6, g + 1.2, 67.6], 270);
  ctx.centredAt(K.smallPlant, [66.5, g, 70.5], 0);
  ctx.centredAt(K.plant, [partX - 0.5, g, living.z1 + 0.4], 0);
  hanging(68.5, home.upperY - 1 - 1.4, 69.5);
  ctx.landmark('phong-khach', 'Phòng khách', 77, 62, g);

  // The kitchen (panel 6): the fridge with its magnets and a run of cupboards and the sink under the plate
  // rack along the east wall, the dresser between the front windows, a lantern hung over the floor. Through the
  // wide way behind it, the dining room: the table on its rug with four chairs, a cake and a bowl of fruit, the
  // lantern over it, the iron stove before the chimney with the pot on it, jars on the walls, a crate of apples.
  const ex = kitchen.x1 + 0.6;
  ctx.propAt(H.fridge, [ex - 0.05, g, north + 1.0], 90);
  for (const [model, z] of [[K.cabinet, 60.5], [K.sink, 61.5], [K.cabinet, 62.5], [K.cabinet, 63.5], [K.cabinet, 64.5]] as const) ctx.centredAt(model, [ex - 0.1, g, z], 270);
  ctx.propAt(K.pan, [ex - 0.3, g + 0.92, 62.5], 0);
  ctx.propAt(K.pot, [ex - 0.35, g + 0.92, 64.5], 0);
  ctx.propAt(K.apple, [ex - 0.3, g + 0.92, 63.5], 0);
  ctx.centredAt(K.stove, [ex - 0.1, g, 65.5], 270);
  ctx.propAt(K.pan, [ex - 0.35, g + 0.92, 65.5], 40);
  ctx.propAt(H.rug, [92.4, g, 62.5], 90);
  // Strings of garlic, chillies and onions from the beam over the counters; a little table with two stools.
  for (const [model, z] of [[H.garlic, 60.2], [H.chilli, 61.6], [H.onion, 63.0], [H.garlic, 64.4]] as const) ctx.propAt(model, [93.3, u - 1 - 1, z], 90);
  ctx.propAt(H.teaTable, [91, g, 59.6], 0);
  for (const dx of [-1, 1]) ctx.propAt(H.stool, [91 + dx * 1.05, g, 59.6], 0);
  ctx.propAt(H.plateRack, [kitchen.x1 + 1, g + 1.9, 63], 90);
  ctx.propAt(H.wallShelf, [kitchen.x1 + 1, g + 1.7, 60.2], 90);
  ctx.propAt(H.dresser, [90, g, north + 0.4], 180);
  ctx.propAt(H.jarShelfSmall, [kitchen.x0 + 0.05, g + 1.5, 65.5], 270);
  ctx.propAt(H.hangingBucket, [kitchen.x0 + 0.4, g + 2.6, 59], 270);
  ctx.propAt(H.wallClock, [kitchen.x0 + 0.02, g + 3.2, 60.5], 270);
  hanging(89.5, u - 1 - 1.4, 62.5);
  lantern(kitchen.x0, g + 2.4, 66.5, 270);
  lantern(90, g + 2.6, north, 180);
  const table = { x: 89.5, z: dining.z0 + 3.5 };
  ctx.propAt(H.rug, [table.x, g, table.z], 0);
  ctx.propAt(H.diningTable, [table.x, g, table.z], 0);
  for (const dx of [-0.8, 0.8]) {
    ctx.decorSpot('chair', [table.x + dx, g, table.z - 1.2], 0);
    ctx.decorSpot('chair', [table.x + dx, g, table.z + 1.2], 180);
  }
  ctx.propAt(K.cake, [table.x, g + 0.86, table.z], 0);
  ctx.propAt(H.fruitBowl, [table.x - 1, g + 0.86, table.z - 0.1], 0);
  ctx.propAt(K.banana, [table.x + 1, g + 0.86, table.z + 0.2], 30);
  ctx.propAt(K.grapes, [table.x + 0.6, g + 0.86, table.z - 0.3], 0);
  hanging(table.x, u - 1 - 1.4, table.z);
  ctx.propAt(H.stove, [90, g, south - 0.5], 0);
  ctx.propAt(K.pot, [90, g + 1.4, south - 0.6], 0);
  ctx.propAt(H.appleCrate, [93.5, g, south - 0.5], 0);
  ctx.propAt(H.jarShelfSmall, [dining.x0 + 0.05, g + 1.5, 74.5], 270);
  ctx.propAt(K.pictureYellow, [dining.x0 + 0.05, g + 2.6, 71.5], 270);
  ctx.centredAt(K.plant, [dining.x1 + 0.5, g, dining.z0 + 0.5], 0);
  lantern(dining.x1 + 1, g + 2.4, 71.5, 90);
  ctx.landmark('bep-an', 'Bếp và bàn ăn', 89, dining.z0 - 1, g);

  // The storeroom (panel 7): shelves of jars on the back wall, crates and sacks, the garden tools on their rack,
  // a barrel, lanterns; the way from the living room through to the back door runs down its west side, past the
  // bathroom's door.
  ctx.propAt(H.jarShelf, [80.5, g, south - 0.3], 0);
  ctx.propAt(H.jarShelfLow, [77.9, g, south - 0.25], 0);
  ctx.propAt(K.crate, [78.5, g, storeroom.z0 + 0.5], 0);
  ctx.propAt(K.box, [78.5, g + 0.9, storeroom.z0 + 0.5], 20);
  ctx.propAt(K.crate, [80.6, g, storeroom.z0 + 0.5], 10);
  ctx.propAt(H.riceSack, [77.45, g, storeroom.z0 + 0.4], 0);
  ctx.propAt(H.cornSack, [79.55, g, storeroom.z0 + 0.4], 0);
  ctx.propAt(H.toolRack, [partX - 0.15, g + 0.5, 74], 90);
  ctx.propAt(K.shovel, [partX - 0.4, g, 75.6], 90);
  ctx.propAt(K.hoe, [partX - 0.4, g, 72.6], 90);
  ctx.propAt(K.barrel, [partX - 0.5, g, south - 0.5], 0);
  ctx.propAt(H.smallLantern, [75.5, u - 1 - 0.75, 74.5], 0);
  ctx.propAt(H.brooms, [partX - 0.4, g, storeroom.z0 + 0.4], 270);
  for (const [model, x] of [[H.onion, 78], [H.garlic, 79.3], [H.chilli, 80.5]] as const) ctx.propAt(model, [x, u - 1 - 1, 73.5], 0);
  ctx.landmark('nha-kho', 'Nhà kho', 75, 74, g);

  // The bathroom behind its double door (the leaves open inward as the child comes near and close behind her):
  // the shower in the far corner, its glass doors toward the room, where she steps in under the water; the
  // toilet against the back wall; the washbasin by the door, for her hands on the way out, the mirror on the
  // wall beside it; the washing machine under the window; the bath mat in the middle of the floor; a plant, a
  // lantern. Each stands apart from the others, so the one she walks up to is the one she uses.
  const bd = home.bathDoor;
  ctx.propAt(H.bathDoorLeft, [bd.x + 0.5, g, bd.z0], 270);
  ctx.propAt(H.bathDoorRight, [bd.x + 0.5, g, bd.z0 + bd.width], 270);
  ctx.centredAt(K.shower, [west + 0.7, g, south - 0.7], 180);
  ctx.centredAt(K.toilet, [69.5, g, south - 0.5], 180);
  ctx.centredAt(K.washbasin, [bathroom.x1 - 1.5, g, bathroom.z0 + 0.25], 0);
  ctx.centredAt(K.mirror, [bathroom.x1 - 0.25, g + 1, bathroom.z0 + 0.15], 0);
  ctx.centredAt(K.washer, [west + 0.45, g, bathroom.z0 + 1.3], 90);
  ctx.centredAt(K.bathMat, [68.6, g, 73.8], 0);
  ctx.centredAt(K.smallPlant, [west + 0.5, g, bathroom.z0 + 0.5], 0);
  ctx.propAt(H.smallLantern, [69.5, u - 1 - 0.75, 74.5], 0);

  // Upstairs, the gallery's study corner (panel 4): the desk under the timetable board on the back wall, its
  // chair, lamp, globe and books; bookcases to the ceiling either side of it and on the west wall; the
  // children's drawings pinned up; a reading nook with an armchair on a round rug; plants; the railing over
  // the living room.
  for (const [x, z, y] of home.railings) ctx.propAt(H.railing, [x, y, z + 0.5], 0);
  const desk = { x: 75.5, z: study.z1 + 0.55 };
  ctx.decorSpot('desk', [desk.x, u, desk.z], 0);
  ctx.decorSpot('chair', [desk.x, u, desk.z - 1.1], 0);
  ctx.propAt(H.readingLamp, [desk.x - 0.45, u + 0.78, desk.z], 0);
  ctx.propAt(K.globe, [desk.x + 0.5, u + 0.78, desk.z + 0.1], 0);
  ctx.centredAt(K.books, [desk.x + 0.1, u + 0.78, desk.z + 0.1], 0);
  // The timetable board on the wall over the desk, and the place before the desk where the child reads it.
  ctx.propAt(H.timetable, [desk.x, u + 1.3, south - 0.05], 0);
  ctx.target({ id: 'nha-thoi-khoa-bieu', name: 'Thời khóa biểu', label: 'Xem thời khóa biểu', at: [desk.x + 2, u, study.z1 - 0.5], yaw: 0, radius: 2.8 });
  for (const x of [72, 79]) ctx.propAt(H.tallBookcase, [x, u, south - 0.33], 0);
  ctx.propAt(H.tallBookcase, [west + 0.33, u, 71.5], 270);
  ctx.propAt(H.drawings, [desk.x - 2.2, u + 1.6, south - 0.03], 180 + 180);
  ctx.centredAt(K.rugRound, [80, u, 72.5], 0);
  ctx.propAt(H.rug, [desk.x, u, desk.z - 1.9], 0);
  ctx.propAt(H.easel, [68.2, u, 74.2], 300);
  ctx.propAt(H.lanternString, [74.5, u + 2.9, 70.5], 0);
  ctx.propAt(H.poufs, [70.5, u, 69.5], 10);
  ctx.propAt(H.armchair, [81.6, u, 73.4], 90);
  ctx.propAt(K.openBook, [81.6, u + 0.55, 73.3], 0);
  ctx.centredAt(K.plant, [study.x0 + 0.5, u, south - 0.5], 0);
  ctx.centredAt(K.plant, [partX - 0.5, u, study.z0 + 1.5], 0);
  lantern(76, u + 2.2, south, 0);
  lantern(west, u + 2.2, 74.5, 270);
  hanging(74.5, u + 3.6, 71.5);
  ctx.landmark('goc-hoc-tap', 'Góc học tập', 76, 72, u);

  // The bedroom (panel 3), papered pink: the bed with its head to the front wall between two night tables, the
  // night lamp and the ornament on them, the cat rug before the bed, the dressing table, the wardrobe on the
  // partition with the uniform calendar beside it, the armchair by the window, a floor lamp, lanterns.
  const bed = { x: 92, z: bedroom.z0 + 1.4 };
  ctx.decorSpot('bed', [bed.x, u, bed.z], 180);
  for (const x of [bedroom.x1 + 0.45, bed.x - 1.5]) ctx.centredAt(K.nightstand, [x, u, bedroom.z0 + 0.5], 180);
  ctx.centredAt(K.tableLamp, [bedroom.x1 + 0.45, u + 0.48, bedroom.z0 + 0.5], 0);
  ctx.decorSpot('ornament', [bed.x - 1.5, u + 0.48, bedroom.z0 + 0.5], 180);
  ctx.decorSpot('rug', [90, u, 63.5], 0);
  ctx.propAt(H.vanity, [bedroom.x1 + 0.66, u, 63.6], 90);
  // The pet's bed (her pick of styles) against the east wall by the foot of her bed, its way in toward the room:
  // where her pet naps when she sends it to sleep at home.
  ctx.decorSpot('pet-bed', [bedroom.x1 - 0.2, u, 60.8], 270);
  ctx.propAt(K.alarmClock, [bedroom.x1 + 0.5, u + 0.78, 63.2], 90);
  ctx.decorSpot('wardrobe', [partX + 1.37, u, 61.5], 270);
  ctx.propAt(H.calendar, [partX + 1.04, u + 0.9, 64.2], 270);
  ctx.target({ id: 'nha-lich-dong-phuc', name: 'Lịch mặc đồng phục', label: 'Xem lịch đồng phục', at: [partX + 2.5, u, 65], yaw: 270, radius: 2.8 });
  ctx.decorSpot('lamp', [bedroom.x0 + 0.5, u, bedroom.z0 + 0.5], 0);
  ctx.propAt(H.armchair, [bedroom.x1 + 0.4, u, 66.4], 90);
  ctx.propAt(K.picture, [bed.x, u + 2.5, north + 0.05], 180);
  // A little tea table with two stools and a teddy, bunting over the wardrobe's wall.
  ctx.propAt(H.teaTable, [87.5, u, 60.2], 0);
  for (const dx of [-1, 1]) ctx.propAt(H.stool, [87.5 + dx * 1.05, u, 60.2], 0);
  ctx.propAt(H.bunting, [partX + 1.08, u + 2.5, 63], 270);
  ctx.centredAt(K.plant, [bedroom.x0 + 0.5, u, bedroom.z1 + 0.3], 0);
  lantern(bedroom.x1 + 1, u + 2.2, 64.5, 90);
  hanging(89.5, u + 3.4, 63.5);
  ctx.landmark('phong-ngu', 'Phòng ngủ', 89, 63, u);

  // Behind the bedroom, the toy corner off the gallery: the armchair with the ornament, a round rug and poufs,
  // low shelves of toys and books, a floor lamp, a plant, lanterns.
  ctx.propAt(H.armchair, [92.6, u, toyCorner.z0 + 2], 90);
  ctx.decorSpot('ornament', [92.6, u + 0.6, toyCorner.z0 + 2], 90);
  ctx.decorSpot('lamp', [93.5, u, toyCorner.z0 + 0.5], 0);
  for (const x of [90.5, 92.5]) ctx.centredAt(K.lowShelf, [x, u, south - 0.3], 0);
  ctx.propAt(K.teddy, [90.5, u + 1.2, south - 0.3], 0);
  ctx.propAt(K.ball, [92.5, u + 1.2, south - 0.3], 0);
  ctx.centredAt(K.lowShelf, [partX + 1.3, u, toyCorner.z0 + 1], 270);
  ctx.centredAt(K.books, [partX + 1.3, u + 1.2, toyCorner.z0 + 1], 0);
  ctx.centredAt(K.rugRound, [89.5, u, 73], 0);
  ctx.propAt(H.poufs, [89.5, u, 73], 60);
  ctx.centredAt(K.plant, [toyCorner.x0 + 0.5, u, south - 0.5], 0);
  ctx.propAt(K.train, [86.8, u, 75.6], 90);
  ctx.propAt(K.balloon, [93.6, u, 75.6], 0);
  ctx.propAt(K.gift, [91.6, u, 72.6], 20);
  ctx.propAt(K.puzzle, [88.2, u, 70.8], 0);
  ctx.propAt(K.kite, [toyCorner.x1 + 0.92, u + 1.6, 71], 90);
  ctx.propAt(H.buntingB, [90.5, u + 2.6, south - 0.08], 0);
  lantern(partX + 1, u + 2.2, 75.5, 270);
  hanging(89.5, u + 3.4, 72.5);
  ctx.landmark('goc-do-choi', 'Góc đồ chơi', 89, 72, u);
}

await runIfMain(import.meta.url, generateNhaCuaBe);
