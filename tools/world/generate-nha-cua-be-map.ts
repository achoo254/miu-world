// Generates "Nhà của bé", the child's own home (owner, 03/10/2026: "thêm màn nhà của bé nữa. trong nhà phải
// thiết kế như mock"; plan 261003, mock panels 1–10 and 13), from a fixed seed: 160 x 160 blocks of home
// grounds, the land round them generated while playing. The child arrives at the front gate off the country
// lane: the wooden name board with its cat's head and the cat mailbox beside the roofed gate, the stone walk
// between two flower beds up to the two-storey cottage (nha-cua-be-house.ts: stone below, timber above, red
// tiles, chimney and dormers, the arched door between its lanterns, flowers climbing the walls), a bench, the
// scarecrow and the cat flag in the front yard. Inside, furnished as the mock's rooms: the living room with
// the cream sofa, the television and the rug; the kitchen and dining table laid with cake and fruit; the
// storeroom of shelves, sacks and garden tools; up the stairs the gallery's study corner (the desk with its
// lamp, globe and books, tall bookcases, drawings pinned up, the timetable board on the wall over the desk)
// and the bedroom (the pink polka-dot bed with its bunny pillow, the night lamp, the cat rug, the armchair,
// the wardrobe with the uniform calendar beside it, the dressing table, pink curtains). East of the house the
// fenced vegetable garden (carrot and cabbage beds, sunflowers, the little shed, the watering can); behind it
// the animal pen (the hen house, hens, the cows, the trough, hay); west the pond fed by a stream, its wooden
// dock with a boat. Two things on the walls open the child's own timetable and uniform days in the game:
// `nha-thoi-khoa-bieu` and `nha-lich-dong-phuc`.
// Output: assets/generated/world/nha-cua-be/{regions/, horizon.bin, entities.json}
import { PACK, runIfMain } from './map-kit';
import { STREET_LANTERN } from './scenery';
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
  bed: `${BX}/ncb-bed-pink.glb`,
  catRug: `${BX}/ncb-cat-rug.glb`,
  curtains: `${BX}/ncb-curtains-pink.glb`,
  wardrobe: `${BX}/ncb-wardrobe.glb`,
  vanity: `${BX}/ncb-vanity.glb`,
  sofa: `${BX}/ncb-sofa.glb`,
  fridge: `${BX}/ncb-fridge.glb`,
  drawings: `${BX}/ncb-drawings.glb`,
  railing: `${BX}/ncb-railing.glb`,
  doorLeaf: `${BX}/ncb-door-leaf.glb`,
  mailbox: `${BX}/ncb-cat-mailbox.glb`,
  catFlag: `${BX}/ncb-cat-flag.glb`,
  signCat: `${BX}/ncb-sign-cat.glb`,
  wateringCan: `${BX}/ncb-watering-can.glb`,
  // Shared: Xóm Mái Ấm's home and farm, Nông trại's yard, Thư viện's shelves, the forest's tool rack, the market's sacks.
  picket: `${BX}/xma-picket.glb`,
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
  tallShelf: `${BX}/tv-shelf-tall.glb`,
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
};
/** Pack furniture, food and garden things. */
const K = {
  desk: `${F}/desk.glb`,
  deskChair: `${F}/chairDesk.glb`,
  chair: `${F}/chair.glb`,
  books: `${F}/books.glb`,
  tableLamp: `${F}/lampRoundTable.glb`,
  nightstand: `${F}/cabinetBed.glb`,
  floorLamp: `${F}/lampRoundFloor.glb`,
  tvCabinet: `${F}/cabinetTelevision.glb`,
  tv: `${F}/televisionVintage.glb`,
  coffeeTable: `${F}/tableCoffee.glb`,
  rugRound: `${F}/rugRound.glb`,
  lowShelf: `${F}/bookcaseOpenLow.glb`,
  openBook: `${PACK.props}/open-book.glb`,
  alarmClock: `${PACK.props}/alarm-clock.glb`,
  ball: `${PACK.props}/soccer-ball.glb`,
  plant: `${F}/pottedPlant.glb`,
  cabinet: `${F}/kitchenCabinet.glb`,
  sink: `${F}/kitchenSink.glb`,
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
  dirtRow: `${N}/crops_dirtRow.glb`,
  flowers: [`${N}/flower_redA.glb`, `${N}/flower_yellowA.glb`, `${N}/flower_purpleB.glb`, `${N}/flower_redA.glb`],
  bush: `${N}/plant_bushLarge.glb`,
  grass: `${N}/grass_large.glb`,
  lily: `${N}/lily_large.glb`,
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

export async function generateNhaCuaBe() {
  return generateZoneMap({
    mapId: MAP_ID,
    region: 'nha-cua-be',
    seedText: 'miu-nha-cua-be',
    // The countryside round the home: farms and windmills, hills and woods (the mock's far mountains and mill).
    outland: 'farm',
    size: SIZE,
    soil: { grass: 'grass-home', path: 'path' },
    ground: { ground: GROUND, roll: 3 },
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
    build: (ctx) => buildHome(ctx),
  });
}

function buildHome(ctx: ZoneMapContext): void {
  const { world, block } = ctx;
  const B = {
    grass: ctx.soil.grass,
    planks: block('planks'),
    log: block('log'),
    sand: block('sand'),
    stone: block('stone'),
    brickGrey: block('brick-grey'),
    brickRed: block('brick-red'),
    woodRed: block('wood-red'),
    glass: block('glass'),
    lantern: block('lantern'),
    cobble: block('cobble'),
    cobbleGrey: block('cobble-grey'),
    farmland: block('farmland'),
    leaves: block('leaves'),
    pink: block('leaves-pink'),
    treeLog: block('tree-log'),
    white: block('snow'),
  };
  const set = (x: number, y: number, z: number, id: number): void => put(world, x, y, z, id);

  // 1. The cottage, and what keeps trees, flowers and quest places off it and its doorsteps.
  const home = placeHomeCottage(world, HOME.x0, HOME.z0, STAND, {
    planks: B.planks,
    log: B.log,
    stoneWall: B.brickGrey,
    plinth: B.stone,
    timber: B.planks,
    glass: B.glass,
    roof: B.brickRed,
    ridge: B.woodRed,
    chimney: B.brickGrey,
    sill: B.woodRed,
    lantern: B.lantern,
  });
  ctx.keepOut(HOME.x0 - 2, HOME.z0 - 3, HOME_X1 + 2, HOME_Z1 + 3);
  // Flowers climbing the front wall beside the windows (panel 1), blossom among the leaves.
  for (const x of [HOME.x0 + 1, HOME.x0 + 6, HOME.x0 + 11, HOME.x0 + 21, HOME.x0 + 26, HOME.x0 + 31]) {
    for (let y = STAND; y <= STAND + 9; y++) if ((x + y) % 4 !== 0) set(x, y, HOME.z0 - 1, (x + y) % 3 === 0 ? B.pink : B.leaves);
  }
  for (const [x, y, z] of home.sills) ctx.propAt(K.flowers[Math.floor(x) % K.flowers.length] ?? K.bush, [x, y, z], (Math.floor(x) * 37) % 360);
  // The door's two leaves folded back on the wall either side of the arch.
  ctx.propAt(H.doorLeaf, [home.door.x0 - 1.25, STAND, HOME.z0 - 0.08], 0);
  ctx.propAt(H.doorLeaf, [home.door.x0 + home.door.width + 1.25, STAND, HOME.z0 - 0.08], 0);
  furnish(ctx, home);

  // 2. The front yard (panel 8): the stone walk and cross walk, the roofed gate in the picket fence, flower
  // beds either side of the walk, the bench, the scarecrow, the cat flag, flower pots by the door.
  for (let x = 79; x <= 81; x++) for (let z = YARD.z0; z < HOME.z0; z++) set(x, GROUND, z, B.cobble);
  for (let x = YARD.x0 + 1; x < YARD.x1; x++) for (let z = 47; z <= 49; z++) if (ctx.onPath(x, z)) set(x, GROUND, z, B.cobble);
  // The gate: log posts, a beam, a little tiled roof with a ridge.
  for (const x of [GATE.x0, GATE.x1]) for (let y = STAND; y <= STAND + 3; y++) set(x, y, GATE.z, B.log);
  for (let x = GATE.x0; x <= GATE.x1; x++) set(x, STAND + 4, GATE.z, B.log);
  for (let x = GATE.x0 - 1; x <= GATE.x1 + 1; x++) {
    for (const z of [GATE.z - 1, GATE.z + 1]) set(x, STAND + 5, z, B.brickRed);
    set(x, STAND + 6, GATE.z, B.woodRed);
    set(x, STAND + 5, GATE.z, B.brickRed);
  }
  ctx.keepOut(GATE.x0 - 1, GATE.z - 2, GATE.x1 + 1, GATE.z + 2);
  fenceRun(ctx, H.picket, YARD.x0, YARD.z0, 'x', YARD.x1 - YARD.x0 + 1, [GATE.x0, GATE.x1]);
  fenceRun(ctx, H.picket, YARD.x0, YARD.z0 + 1, 'z', YARD.z1 - YARD.z0);
  fenceRun(ctx, H.picket, YARD.x1, YARD.z0 + 1, 'z', YARD.z1 - YARD.z0);
  fenceRun(ctx, H.picket, YARD.x0 + 1, YARD.z1, 'x', HOME.x0 - 3 - YARD.x0);
  fenceRun(ctx, H.picket, HOME_X1 + 3, YARD.z1, 'x', YARD.x1 - HOME_X1 - 3);
  // Flower beds of dark soil either side of the walk, two blocks off it, flowers in rows, blossom bushes at their ends.
  for (const [bx0, bx1] of [[72, 77], [83, 88]] as const) {
    for (let x = bx0; x <= bx1; x++) {
      for (let z = 32; z <= 44; z++) {
        set(x, GROUND, z, B.farmland);
        if ((x + z) % 2 === 0) ctx.prop(K.flowers[(x * 3 + z) % K.flowers.length] ?? K.bush, x, z, (x * 41 + z * 13) % 360);
      }
    }
    for (const z of [31, 45]) for (const x of [bx0, bx1]) set(x, STAND, z, (x + z) % 2 === 0 ? B.pink : B.leaves);
    ctx.keepOut(bx0, 31, bx1, 45);
  }
  for (const z of [YARD.z0 + 2, 46, HOME.z0 - 4]) for (const x of [78, 82]) ctx.prop(STREET_LANTERN, x, z, 0);
  ctx.prop(H.flowerPot, 77, HOME.z0 - 2, 0);
  ctx.prop(H.flowerPot, 83, HOME.z0 - 2, 0);
  ctx.prop(H.bench, 60, 40, 270);
  ctx.prop(H.bench, 100, 40, 90);
  ctx.prop(H.scarecrow, 98, 34, 200);
  ctx.prop(H.catFlag, 58, 52, 30);
  ctx.keepOut(57, 51, 61, 53);
  for (const [x, z] of [[55, 34], [104, 52], [62, 52]] as const) {
    placeTree(world, x, STAND, z, 6, { log: B.treeLog, leaves: (x + z) % 2 === 0 ? B.pink : B.leaves }, ctx.rng);
    ctx.keepOut(x - 2, z - 2, x + 2, z + 2);
  }
  ctx.landmark('cong-truoc', 'Cổng trước nhà', 80, YARD.z0 - 2);
  // Across the lane the meadow stays open, so the house is seen whole from the lane and the gate.
  ctx.keepOut(58, 0, 102, 16);
  ctx.landmark('san-truoc', 'Sân trước nhà', 66, 40);

  // 3. Outside the gate (panel 13): the name board with its cat's head, the cat mailbox.
  const sign = { x: 86, z: YARD.z0 - 2 };
  ctx.target({ id: 'nha-bien-ten', name: 'Nhà của {name}', label: 'Đọc biển tên', at: [sign.x + 0.5, STAND, sign.z + 0.5], yaw: 180, board: 'Nhà của {name}' });
  // The board's top stands 2.2 blocks over its foot (riddle-board.ts); the cat sits on it.
  ctx.propAt(H.signCat, [sign.x + 0.5, STAND + 2.2, sign.z + 0.5], 0);
  ctx.keepOut(sign.x - 1, sign.z - 1, sign.x + 1, sign.z + 1);
  ctx.prop(H.mailbox, 75, YARD.z0 - 2, 0);
  ctx.keepOut(74, YARD.z0 - 3, 76, YARD.z0 - 1);

  // 4. The vegetable garden (panel 9): a picket fence with its gate on the cross walk's line, the path down its
  // middle, beds of carrots and cabbages, pumpkins, sunflowers along the north fence, a lawn to sit on, the
  // little shed with the watering can at its door.
  const gardenGate: readonly [number, number] = [47, 49];
  fenceRun(ctx, H.picket, GARDEN.x0, GARDEN.z0, 'x', GARDEN.x1 - GARDEN.x0 + 1);
  fenceRun(ctx, H.picket, GARDEN.x0, GARDEN.z1, 'x', GARDEN.x1 - GARDEN.x0 + 1);
  fenceRun(ctx, H.picket, GARDEN.x0, GARDEN.z0 + 1, 'z', GARDEN.z1 - GARDEN.z0 - 1, gardenGate);
  fenceRun(ctx, H.picket, GARDEN.x1, GARDEN.z0 + 1, 'z', GARDEN.z1 - GARDEN.z0 - 1);
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
  // The shed: plank walls three high, a doorway three wide toward the path, a gable of red boards.
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
    for (let k = 0; k <= 2; k++) {
      for (const x of [sx0 - 1 + k, sx0 + 5 - k]) set(x, STAND + 3 + k, z, k === 2 ? B.woodRed : B.woodRed);
    }
    for (const x of [sx0 + 2]) set(x, STAND + 6, z, B.woodRed);
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
  // of planks under a tiled roof with its hatch, nesting coops, the trough, hay bales and loose hay, a milk can.
  const penGate: readonly [number, number] = [73, 77];
  fenceRun(ctx, H.railFence, PEN.x0, PEN.z0, 'x', PEN.x1 - PEN.x0 + 1, penGate);
  fenceRun(ctx, H.railFence, PEN.x0, PEN.z1, 'x', PEN.x1 - PEN.x0 + 1);
  fenceRun(ctx, H.railFence, PEN.x0, PEN.z0 + 1, 'z', PEN.z1 - PEN.z0 - 1);
  fenceRun(ctx, H.railFence, PEN.x1, PEN.z0 + 1, 'z', PEN.z1 - PEN.z0 - 1);
  const [hx0, hz0] = [HEN_HOUSE.x0, HEN_HOUSE.z0];
  for (let x = hx0; x < hx0 + 5; x++) {
    for (let z = hz0; z < hz0 + 4; z++) {
      // A floor of straw; log walls round the hens' room, the hatch low in the south wall.
      set(x, GROUND, z, B.sand);
      const edge = x === hx0 || x === hx0 + 4 || z === hz0 || z === hz0 + 3;
      for (let y = STAND; y <= STAND + 2; y++) {
        const hatch = z === hz0 + 3 && x === hx0 + 2 && y === STAND;
        set(x, y, z, edge && !hatch ? B.log : 0);
      }
    }
  }
  for (let x = hx0 - 1; x <= hx0 + 5; x++) {
    for (let z = hz0 - 1; z <= hz0 + 4; z++) {
      const step = Math.min(z - (hz0 - 1), hz0 + 4 - z);
      set(x, STAND + 3 + Math.min(step, 2), z, step >= 2 ? B.woodRed : B.brickRed);
    }
  }
  ctx.keepOut(hx0 - 1, hz0 - 1, hx0 + 5, hz0 + 5);
  ctx.prop(H.coop, hx0 + 8, hz0 + 1, 0);
  ctx.prop(H.coop, hx0 + 11, hz0 + 1, 0);
  ctx.prop(H.hayPile, hx0 + 2, hz0 + 6, 0);
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

  // 6. The pond (panel 1): lilies, reeds and bushes on its banks, the dock out into it (the way to the pond
  // runs on as planks over the water) with its posts, a lantern, the boat and a fishing bucket.
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const [x, z] = [Math.round(POND.x + Math.cos(a) * POND.rx * 0.6), Math.round(POND.z + Math.sin(a) * POND.rz * 0.6)];
    if (z >= 74 && z <= 78 && x >= 30) continue;
    if (ctx.inWater(x, z)) ctx.propAt(i % 3 === 0 ? K.flowers[0] ?? K.lily : K.lily, [x + 0.5, WATER_LEVEL + 1.02, z + 0.5], i * 40);
  }
  for (const x of [34, 38, 42]) for (const z of [74, 78]) for (let y = WATER_LEVEL - 2; y <= GROUND + 1; y++) set(x, y, z, B.log);
  ctx.propAt(K.canoe, [36.5, WATER_LEVEL + 0.9, 80.5], 90);
  ctx.propAt(K.paddle, [39.5, STAND, 76.9], 90);
  ctx.propAt(K.bucket, [35.5, STAND, 75.5], 0);
  ctx.prop(STREET_LANTERN, 46, 79, 0);
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
  placeWindmill(world, MILL.x, MILL.z, STAND, { planks: B.planks, log: B.log, roof: B.brickRed, sail: B.white, stone: B.stone, glass: B.glass }, 7);
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
}

/**
 * A run of fence props (two blocks each) from (x0, z0) along x or z for `length` blocks, leaving the ways and
 * `gap` (inclusive, a gate) open.
 */
function fenceRun(ctx: ZoneMapContext, model: string, x0: number, z0: number, along: 'x' | 'z', length: number, gap?: readonly [number, number]): void {
  for (let i = 0; i + 1 < length; i += 2) {
    const [x, z] = along === 'x' ? [x0 + i, z0] : [x0, z0 + i];
    const t = along === 'x' ? x : z;
    if (gap && t + 1.5 > gap[0] && t - 0.5 < gap[1] + 1) continue;
    const [nx, nz] = along === 'x' ? [x + 1, z] : [x, z + 1];
    if (ctx.onPath(x, z) || ctx.onPath(nx, nz) || ctx.inWater(x, z) || ctx.inWater(nx, nz)) continue;
    ctx.propAt(model, along === 'x' ? [x + 1, STAND, z + 0.5] : [x + 0.5, STAND, z + 1], along === 'x' ? 0 : 90);
  }
}

/** The rooms of the mock (panels 2–7): furniture against the walls and round rugs, the ways between doors left clear. */
function furnish(ctx: ZoneMapContext, home: HomeLayout): void {
  const { kitchen, dining, storeroom, study, bedroom, toyCorner, wall } = home;
  const g = home.groundY;
  const u = home.upperY;
  /** Faces of the walls each room backs onto (the first open cell's edge). */
  const north = wall.north;
  const south = wall.south + 1;
  const partX = wall.partitionX;
  const lantern = (x: number, y: number, z: number, yaw: number): void => ctx.propAt(H.wallLantern, [x, y, z], yaw);

  // The living room (panel 5): the television on its cabinet under the front windows, the cream sofa facing it
  // across the coffee table on a rug, an armchair either side; behind the sofa the children's corner of
  // bookcases, poufs and the teddy; plants, pictures, lanterns on the walls and hung from the beams. The ways
  // from the door to the stairs, the kitchen and the storeroom stay clear.
  const tv = 74;
  ctx.propAt(H.rug, [tv, g, 61.5], 0);
  ctx.centredAt(K.tvCabinet, [tv, g, north + 0.45], 180);
  ctx.centredAt(K.tv, [tv, g + 0.64, north + 0.45], 180);
  ctx.centredAt(K.coffeeTable, [tv, g, 61.4], 0);
  ctx.propAt(K.apple, [tv - 0.3, g + 0.47, 61.4], 0);
  ctx.propAt(H.sofa, [tv, g, 63.7], 0);
  ctx.propAt(H.armchair, [70.6, g, 61.5], 270);
  ctx.propAt(H.armchair, [77.4, g, 61.5], 90);
  ctx.centredAt(K.floorLamp, [77.5, g, 63.8], 0);
  for (const x of [68.5, 70.5]) ctx.propAt(H.bookcase, [x, g, 70.75], 0);
  ctx.centredAt(K.lowShelf, [79.5, g, 70.6], 0);
  ctx.propAt(K.teddy, [79.2, g + 1.2, 70.6], 0);
  ctx.centredAt(K.rugRound, [79.5, g, 67.5], 0);
  ctx.propAt(H.poufs, [79.5, g, 67.5], 30);
  ctx.centredAt(K.plant, [partX - 0.5, g, north + 0.5], 0);
  ctx.centredAt(K.plant, [71.5, g, 66.5], 0);
  ctx.propAt(K.picture, [partX - 0.05, g + 2.6, 66.5], 90);
  ctx.propAt(K.pictureYellow, [partX - 0.05, g + 2.6, 68.8], 90);
  ctx.propAt(K.picture, [tv - 2.5, g + 2.6, 70.95], 0);
  lantern(70, g + 2.2, north, 180);
  lantern(partX, g + 2.2, 59.5, 90);
  for (const z of home.beams) for (const x of [70, 76, 81]) ctx.propAt(H.hangingLantern, [x + 0.5, u + 3 - 1.4, z + 0.5], 0);
  ctx.landmark('phong-khach', 'Phòng khách', 77, 66, g);

  // The kitchen (panel 6): the fridge with its magnets and a run of cupboards and the sink under shelves of
  // plates along the east wall, the plate dresser between the front windows, a lantern. Through the wide way
  // behind it, the dining room: the table on its rug with four chairs, a cake and fruit, the lantern over it,
  // the iron stove before the chimney with the pot on it, jars on the walls, a crate of apples.
  const ex = kitchen.x1 + 0.6;
  ctx.propAt(H.fridge, [ex - 0.05, g, north + 1.0], 90);
  for (const [model, z] of [[K.cabinet, 60.5], [K.sink, 61.5], [K.cabinet, 62.5], [K.cabinet, 63.5], [K.cabinet, 64.5]] as const) ctx.centredAt(model, [ex - 0.1, g, z], 270);
  ctx.propAt(K.pan, [ex - 0.3, g + 0.92, 62.5], 0);
  ctx.propAt(K.pot, [ex - 0.35, g + 0.92, 64.5], 0);
  for (const z of [61.5, 63.6]) ctx.propAt(H.wallShelf, [kitchen.x1 + 1, g + 1.7, z], 90);
  ctx.propAt(H.dresser, [89.5 + 0.5, g, north + 0.4], 180);
  ctx.propAt(H.jarShelfSmall, [kitchen.x0 + 0.05, g + 1.5, 65.5], 270);
  ctx.propAt(H.hangingLantern, [89.5, u - 1 - 1.4, 62.5], 0);
  lantern(kitchen.x0, g + 2.2, 59.5, 270);
  const table = { x: 89.5, z: dining.z0 + 3.5 };
  ctx.propAt(H.rug, [table.x, g, table.z], 0);
  ctx.propAt(H.diningTable, [table.x, g, table.z], 0);
  for (const dx of [-0.8, 0.8]) {
    ctx.centredAt(K.chair, [table.x + dx, g, table.z - 1.2], 0);
    ctx.centredAt(K.chair, [table.x + dx, g, table.z + 1.2], 180);
  }
  ctx.propAt(K.cake, [table.x, g + 0.86, table.z], 0);
  ctx.propAt(K.apple, [table.x - 1, g + 0.86, table.z - 0.2], 0);
  ctx.propAt(K.banana, [table.x + 1, g + 0.86, table.z + 0.2], 30);
  ctx.propAt(K.grapes, [table.x + 0.6, g + 0.86, table.z - 0.3], 0);
  ctx.propAt(H.hangingLantern, [table.x, u - 1 - 1.4, table.z], 0);
  ctx.propAt(H.stove, [90, g, south - 0.5], 0);
  ctx.propAt(K.pot, [90, g + 1.4, south - 0.6], 0);
  ctx.propAt(H.appleCrate, [93.5, g, south - 0.5], 0);
  ctx.propAt(H.jarShelfSmall, [dining.x0 + 0.05, g + 1.5, 74.5], 270);
  ctx.propAt(K.pictureYellow, [dining.x0 + 0.05, g + 2.6, 71.5], 270);
  lantern(dining.x1 + 1, g + 2.2, 71.5, 90);
  ctx.landmark('bep-an', 'Bếp và bàn ăn', 89, dining.z0 - 1, g);

  // The storeroom (panel 7): shelves of jars on both long walls, crates and sacks, the garden tools on their
  // rack, barrels, a lantern; the way from the living room through to the back door runs down its middle.
  for (const x of [68, 71]) ctx.propAt(H.jarShelf, [x, g, south - 0.3], 0);
  ctx.propAt(H.jarShelf, [80.5, g, south - 0.3], 0);
  for (const x of [69, 71.5]) ctx.propAt(H.jarShelfLow, [x, g, storeroom.z0 + 0.25], 180);
  ctx.propAt(K.crate, [78.5, g, storeroom.z0 + 0.5], 0);
  ctx.propAt(K.box, [78.5, g + 0.9, storeroom.z0 + 0.5], 20);
  ctx.propAt(K.crate, [80.6, g, storeroom.z0 + 0.5], 10);
  for (const [model, z] of [[H.riceSack, 73.5], [H.cornSack, 74.4], [H.beanSack, 75.3]] as const) ctx.propAt(model, [storeroom.x0 + 0.4, g, z], 0);
  ctx.propAt(H.flourSacks, [storeroom.x0 + 1.6, g, south - 0.6], 0);
  ctx.propAt(H.toolRack, [partX - 0.15, g + 0.5, 74], 90);
  ctx.propAt(K.shovel, [partX - 0.4, g, 75.6], 90);
  ctx.propAt(K.hoe, [partX - 0.4, g, 72.6], 90);
  ctx.propAt(K.barrel, [partX - 0.5, g, south - 0.5], 0);
  ctx.propAt(H.smallLantern, [75.5, u - 1 - 0.75, 74.5], 0);
  ctx.landmark('nha-kho', 'Nhà kho', 75, 74, g);

  // Upstairs, the gallery's study corner (panel 4): the desk under the timetable board on the back wall, its
  // chair, lamp, globe and books; tall bookcases on the back and west walls; the children's drawings pinned
  // up; a reading nook with an armchair on a round rug; plants; the railing over the living room.
  for (const [x, z, y] of home.railings) ctx.propAt(H.railing, [x, y, z + 0.5], 0);
  const desk = { x: 75.5, z: study.z1 + 0.55 };
  ctx.centredAt(K.desk, [desk.x, u, desk.z], 180);
  ctx.centredAt(K.deskChair, [desk.x, u, desk.z - 1.1], 0);
  ctx.propAt(H.readingLamp, [desk.x - 0.45, u + 0.78, desk.z], 0);
  ctx.propAt(K.globe, [desk.x + 0.5, u + 0.78, desk.z + 0.1], 0);
  ctx.centredAt(K.books, [desk.x + 0.1, u + 0.78, desk.z + 0.1], 0);
  // The timetable board on the wall over the desk, and the place before the desk where the child reads it.
  ctx.propAt(H.timetable, [desk.x, u + 1.3, south - 0.05], 0);
  ctx.target({ id: 'nha-thoi-khoa-bieu', name: 'Thời khóa biểu', label: 'Xem thời khóa biểu', at: [desk.x + 2, u, study.z1 - 0.5], yaw: 0, radius: 2.8 });
  ctx.propAt(H.tallShelf, [70.5, u, south - 0.4], 0);
  ctx.propAt(H.tallShelf, [study.x0 + 0.62, u, 73.5], 270);
  ctx.propAt(H.drawings, [79.3, u + 1.6, south - 0.03], 0);
  ctx.centredAt(K.rugRound, [80, u, 74.5], 0);
  ctx.propAt(H.armchair, [81.6, u, 75.4], 90);
  ctx.propAt(K.openBook, [81.6, u + 0.55, 75.3], 0);
  ctx.centredAt(K.plant, [study.x0 + 0.5, u, south - 0.5], 0);
  lantern(73, u + 1.6, south, 0);
  ctx.landmark('goc-hoc-tap', 'Góc học tập', 76, 73, u);

  // The bedroom (panel 3): the bed with its head to the front wall between two night tables, the night lamp,
  // pink curtains at every window, the cat rug before the bed, the dressing table, the wardrobe on the
  // partition with the uniform calendar beside it, a floor lamp, a wall lantern.
  const bed = { x: 92, z: bedroom.z0 + 1.4 };
  ctx.propAt(H.bed, [bed.x, u, bed.z], 180);
  for (const x of [bedroom.x1 + 0.45, bed.x - 1.5]) ctx.centredAt(K.nightstand, [x, u, bedroom.z0 + 0.5], 180);
  ctx.centredAt(K.tableLamp, [bedroom.x1 + 0.45, u + 0.48, bedroom.z0 + 0.5], 0);
  ctx.propAt(K.alarmClock, [bed.x - 1.5, u + 0.48, bedroom.z0 + 0.5], 0);
  for (const x of [88, 92]) ctx.propAt(H.curtains, [x, u + 0.55, north + 0.04], 180);
  for (const z of [61, 67]) ctx.propAt(H.curtains, [bedroom.x1 + 0.96, u + 0.55, z], 90);
  ctx.propAt(H.catRug, [90.5, u, 64.5], 0);
  ctx.propAt(H.vanity, [bedroom.x1 + 0.66, u, 63.6], 90);
  ctx.propAt(H.wardrobe, [partX + 1.37, u, 62.5], 270);
  ctx.propAt(H.calendar, [partX + 1.04, u + 0.9, 65.2], 270);
  ctx.target({ id: 'nha-lich-dong-phuc', name: 'Lịch mặc đồng phục', label: 'Xem lịch đồng phục', at: [partX + 2.5, u, 65.5], yaw: 270, radius: 2.8 });
  ctx.centredAt(K.floorLamp, [bedroom.x0 + 0.5, u, bedroom.z0 + 0.5], 0);
  lantern(bedroom.x1 + 1, u + 1.6, 64.5, 90);
  ctx.landmark('phong-ngu', 'Phòng ngủ', 89, 63, u);

  // Behind the bedroom, the toy corner off the gallery: the armchair with the teddy, a round rug and poufs,
  // low shelves of toys and books, pink curtains, a plant, lanterns.
  ctx.propAt(H.armchair, [92.6, u, toyCorner.z0 + 2], 90);
  ctx.propAt(K.teddy, [92.6, u + 0.6, toyCorner.z0 + 2], 0);
  ctx.centredAt(K.floorLamp, [93.5, u, toyCorner.z0 + 0.5], 0);
  for (const x of [90.5, 92.5]) ctx.centredAt(K.lowShelf, [x, u, south - 0.3], 0);
  ctx.propAt(K.teddy, [90.5, u + 1.2, south - 0.3], 0);
  ctx.propAt(K.ball, [92.5, u + 1.2, south - 0.3], 0);
  ctx.centredAt(K.lowShelf, [partX + 1.3, u, toyCorner.z0 + 1], 270);
  ctx.centredAt(K.books, [partX + 1.3, u + 1.2, toyCorner.z0 + 1], 0);
  ctx.centredAt(K.rugRound, [89.5, u, 73], 0);
  ctx.propAt(H.poufs, [89.5, u, 73], 60);
  for (const x of [88, 92]) ctx.propAt(H.curtains, [x, u + 0.55, south - 0.04], 0);
  ctx.propAt(H.curtains, [toyCorner.x1 + 0.96, u + 0.55, 74], 90);
  ctx.centredAt(K.plant, [toyCorner.x0 + 0.5, u, south - 0.5], 0);
  lantern(partX + 1, u + 1.6, 75.5, 270);
  ctx.landmark('goc-do-choi', 'Góc đồ chơi', 89, 72, u);
}

await runIfMain(import.meta.url, generateNhaCuaBe);
