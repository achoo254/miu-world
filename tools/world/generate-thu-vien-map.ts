// Generates "Thư viện" (Tiếng Việt weeks 8–9, Toán topic 6) from a fixed seed, 800 x 800 blocks: a small
// town round a big library in a garden, in the shared style of the owner's mocks (designs/the-gioi/, the
// lamp-lit main street of b-10-duong-chinh-toan-canh.png): coloured roofs, flower beds, fences, lamps.
// A lamp-lit avenue runs west to east across the map and over the river on a plank bridge; a ring road and
// side streets lined with cottages fill the four quarters; flower gardens north-west, woods by the river.
// Three districts, one per chapter:
// - Chapter 1, south-west, by the spawn: the library hall (after the mock's reading room,
//   designs/truong-hoc/v2-a-12-thu-vien-trong-truong.png: tall wooden bookcases, reading tables, lamps,
//   big windows) with its book loft and stairs, aisles between the bookcases, the librarian's desk, the
//   return counter, the reading corner with pillows; behind it the terrace steps down to the reading garden:
//   the flat stone, the purple myrtle, the little stream and its sandy beach.
// - Chapter 2, north-east: the golden-leaf festival yard: the leaf stage, the golden-leaf road, the round
//   pool with floating rafts, the golden tree with its stone table, the tree hung with clouds, the leaf-sweet
//   stall and the contest stations.
// - Chapter 3, south-east: the clock tower (spiral stairs to the landing, the clock-face balcony, round
//   windows, the bell loft with its railing and eaves), the clock workshop, the calendar room with its
//   east window, the mailbox and the telescope corner.
// Output: assets/generated/world/thu-vien/{regions/, horizon.bin, entities.json}
import { PACK, runIfMain, smoothstep } from './map-kit';
import { cottageRow, flowerBed } from './scenery';
import { placeHouse } from './structures/buildings';
import { placeFountain, placeStall } from './structures/countryside';
import { pathColumns, type Point } from './structures/path';
import { placeAncientTree, placeTree } from './structures/tree';
import { animal, crowd, person } from './village-life';
import { generateZoneMap, type Zone, type ZoneMapContext } from './zone-map';

export const MAP_ID = 'thu-vien';
const SIZE = 800;
const LEVEL = 12;
const BASE = LEVEL + 1;
const WATER_LEVEL = 10;

/** What the people hold at their work. */
const LIFE_HELD = {
  book: `${PACK.props}/open-book.glb`,
  basket: `${PACK.props}/basket.glb`,
  bucket: `${PACK.survival}/bucket.glb`,
  crate: `${PACK.survival}/box.glb`,
  axe: `${PACK.survival}/tool-axe.glb`,
  flute: `${PACK.props}/flute.glb`,
  apple: `${PACK.food}/apple.glb`,
  hoe: `${PACK.survival}/tool-hoe.glb`,
  palette: `${PACK.props}/artist-palette.glb`,
  balloon: `${PACK.props}/balloon.glb`,
};

export const ZONES: readonly Zone[] = [
  { chapter: 1, id: 'phong-doc', name: 'Phòng đọc', x: 230, z: 530, hx: 70, hz: 54 },
  { chapter: 2, id: 'san-le-hoi-la-vang', name: 'Sân lễ hội lá vàng', x: 595, z: 250, hx: 66, hz: 48 },
  { chapter: 3, id: 'thap-dong-ho', name: 'Tháp đồng hồ và phòng lịch', x: 595, z: 600, hx: 62, hz: 50 },
];

interface Rect {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

// Water: the river down the middle of the map, the stream behind the library, the festival's round pool.
const riverCenter = (z: number): number => 420 + 22 * Math.sin(z / 60) + 6 * Math.sin(z / 23 + 1.3);
const streamCenter = (x: number): number => 568 + 3 * Math.sin(x / 11) + 2 * Math.sin(x / 29);
const POOL = { x: 632, z: 268, r: 10 };
const inWater = (x: number, z: number): boolean =>
  (z > 24 && z < 776 && Math.abs(x - riverCenter(z)) < 8 + 1.5 * Math.sin(z / 37)) ||
  (x > 120 && x < 318 && Math.abs(z - streamCenter(x)) < 2.2) ||
  Math.hypot(x - POOL.x, z - POOL.z) < POOL.r;

// Ways: the avenue (three lanes wide), the ring road, the side streets, a spur into each district.
const AVENUE_Z = 420;
const AVENUE: Point[][] = [-3, 0, 3].map((dz): Point[] => [[30, AVENUE_Z + dz], [770, AVENUE_Z + dz]]);
const STREETS: Point[][] = [
  [[60, 60], [740, 60]],
  [[60, 740], [740, 740]],
  [[60, 60], [60, 740]],
  [[740, 60], [740, 740]],
  [[150, 60], [150, 420]],
  [[60, 240], [480, 240]],
  [[330, 420], [330, 740]],
  [[60, 660], [330, 660]],
  [[480, 60], [480, 740]],
  [[690, 60], [690, 740]],
  [[480, 130], [740, 130]],
  [[480, 340], [740, 340]],
  [[480, 500], [740, 500]],
  [[480, 700], [740, 700]],
];
const SPURS: Point[][] = [
  [[230, 420], [230, 530]],
  [[200, 545], [200, 660]],
  [[595, 420], [595, 250]],
  [[595, 420], [595, 604]],
];
const ROUTES: Point[][] = [...AVENUE, ...STREETS, ...SPURS];
/** Avenue crossings (x) that get zebra stripes. */
const CROSSINGS = [60, 150, 230, 330, 480, 595, 690, 740];

/** Quarters lined with cottages (levelled ground), and the flower gardens north-west. */
const TOWN: readonly Rect[] = [
  { x0: 66, z0: 66, x1: 144, z1: 414 },
  { x0: 156, z0: 246, x1: 390, z1: 414 },
  { x0: 66, z0: 426, x1: 326, z1: 736 },
  { x0: 486, z0: 136, x1: 736, z1: 414 },
  { x0: 486, z0: 426, x1: 736, z1: 736 },
];
const GARDENS: Rect = { x0: 158, z0: 68, x1: 384, z1: 232 };
const FLAT: readonly Rect[] = [...TOWN, GARDENS];
const SPAWN = { x: 205, z: 432 };

const N = PACK.nature;
const F = PACK.furniture;
const P = PACK.props;
const M = {
  bookcase: `${F}/bookcaseOpen.glb`,
  bookcaseLow: `${F}/bookcaseOpenLow.glb`,
  table: `${F}/table.glb`,
  chair: `${F}/chair.glb`,
  rug: `${F}/rugRectangle.glb`,
  pillow: `${F}/pillow.glb`,
  plant: `${F}/pottedPlant.glb`,
  floorLamp: `${F}/lampRoundFloor.glb`,
  books: `${P}/books.glb`,
  openBook: `${P}/open-book.glb`,
  rock: `${N}/rock_largeA.glb`,
  grass: `${N}/grass_large.glb`,
  bush: `${N}/plant_bushLarge.glb`,
  fence: `${N}/fence_simple.glb`,
  flowerRed: `${N}/flower_redA.glb`,
  flowerYellow: `${N}/flower_yellowB.glb`,
  flowerPurple: `${N}/flower_purpleA.glb`,
  fruitTree: `${N}/tree_fat.glb`,
  autumnTree: `${N}/tree_oak_fall.glb`,
  bench: `${PACK.box}/park-bench.glb`,
  lamp: `${PACK.roads}/light-curved.glb`,
  leaf: `${P}/fallen-leaf.glb`,
  balloon: `${P}/balloon.glb`,
  gift: `${P}/gift-red.glb`,
  ticket: `${P}/ticket-red.glb`,
  chopsticks: `${P}/chopsticks.glb`,
  clock: `${P}/clock-face.glb`,
  alarm: `${P}/alarm-clock.glb`,
  calendar: `${P}/calendar.glb`,
  picture: `${P}/framed-picture.glb`,
  envelope: `${P}/envelope.glb`,
  wheel: `${P}/wheel.glb`,
  workbench: `${PACK.survival}/workbench.glb`,
  bucket: `${PACK.survival}/bucket.glb`,
};
const FLOWERS = [M.flowerRed, M.flowerYellow, M.flowerPurple];

const outsideRect = (r: Rect, x: number, z: number): number => Math.hypot(Math.max(0, r.x0 - x, x - r.x1), Math.max(0, r.z0 - z, z - r.z1));
const inRect = (r: Rect, x: number, z: number, pad = 0): boolean => x >= r.x0 - pad && x <= r.x1 + pad && z >= r.z0 - pad && z <= r.z1 + pad;

export async function generateThuVien() {
  return generateZoneMap({
    mapId: MAP_ID,
    region: 'thu-vien',
    seedText: 'miu-thu-vien',
    outland: 'library',
    zones: ZONES,
    spawn: { x: SPAWN.x, z: SPAWN.z, yaw: 0 },
    shape: (x, z, h) => {
      const d = Math.min(...FLAT.map((r) => outsideRect(r, x, z)));
      const k = smoothstep(0, 8, d);
      return LEVEL * (1 - k) + h * k;
    },
    water: { level: WATER_LEVEL, covers: inWater },
    pathsFromSpawn: false,
    routes: ROUTES,
    trees: {
      skip: 0.45,
      blocks: (roll, block) => ({ log: block('tree-log'), leaves: block(roll < 0.3 ? 'leaves-autumn' : roll < 0.5 ? 'leaves-pink' : 'leaves') }),
    },
    // The reading room's tall shelves and the tower's clock face (content/world/models.json has the usual sizes).
    sizes: { [M.bookcase]: 2.4, [M.clock]: 3 },
    // The districts are dressed below (clear of the rooms indoors), not by the builder.
    dressing: { models: [], spacing: SIZE },
    // The library town: readers and the librarian, the festival crowd, the tower's keepers, the streets.
    life: ({ landmark }) => [
      ...crowd('librarian', ['Cô thủ thư', 'Chú xếp sách'], [person('i'), person('j')], landmark('ban-thu-thu'), 6, 2, [LIFE_HELD.book]),
      ...crowd('reader', ['Bạn đọc sách', 'Bác đọc báo', 'Chị đọc truyện'], [person('n'), person('a'), person('h'), person('p')], landmark('ban-doc'), 8, 6, [LIFE_HELD.book]),
      ...crowd('reader', ['Bạn đọc dưới cây'], [person('f'), person('o')], landmark('vuon-doc-sach'), 10, 4, [LIFE_HELD.book]),
      ...crowd('waterer', ['Bác làm vườn'], [person('m')], landmark('vuon-doc-sach'), 14, 2, [LIFE_HELD.bucket]),
      ...crowd('pupil', ['Bạn dự hội'], [person('f'), person('n'), person('o'), person('q'), person('r')], landmark('san-khau-la-vang'), 12, 8, [LIFE_HELD.balloon]),
      ...crowd('vendor', ['Cô bán kẹo lá', 'Bác bán bóng bay'], [person('e'), person('b')], landmark('quay-keo-la'), 5, 2, [LIFE_HELD.apple]),
      ...crowd('shopper', ['Mẹ đưa con đi hội', 'Bố dắt con'], [person('l'), person('k')], landmark('duong-la-vang'), 14, 4, [LIFE_HELD.basket]),
      ...crowd('trumpeter', ['Chú thổi kèn hội'], [person('c')], landmark('san-khau-la-vang'), 6, 1, [LIFE_HELD.flute]),
      ...crowd('school-guard', ['Bác giữ tháp'], [person('d')], landmark('chan-thap-dong-ho'), 4, 1),
      ...crowd('teacher', ['Ông thợ đồng hồ'], [person('a')], landmark('phong-may-dong-ho'), 4, 1, [LIFE_HELD.book]),
      ...crowd('sweeper', ['Cô quét lá vàng'], [person('e'), person('h')], landmark('cay-la-vang'), 12, 2, [LIFE_HELD.basket]),
      ...crowd('dog', ['Cún phố sách'], [animal('dog')], landmark('thu-vien'), 30, 3),
      ...crowd('cat', ['Mèo thư viện'], [animal('cat')], landmark('goc-doc-co-goi'), 14, 3),
      ...crowd('chick', ['Gà nhà bác làm vườn'], [animal('chick')], landmark('vuon-doc-sach'), 12, 8),
      ...crowd('chick', ['Gà mái mẹ'], [animal('chick')], landmark('tang-da-phang'), 10, 5),
      ...crowd('cat', ['Mèo nằm nắng'], [animal('cat')], landmark('bai-cat-nho'), 8, 4),
      ...crowd('cat', ['Mèo phố hội'], [animal('cat')], landmark('cay-la-vang'), 10, 3),
      ...crowd('dog', ['Cún đi hội'], [animal('dog')], landmark('duong-la-vang'), 16, 4),
      ...crowd('dog', ['Chó giữ tháp'], [animal('dog')], landmark('goc-kinh-vien-vong'), 14, 3),
      ...crowd('cow', ['Bò gặm cỏ bờ suối'], [animal('cow')], landmark('suoi-nho'), 18, 3),
    ],
    build: (ctx) => buildTown(ctx),
  });
}

function buildTown(ctx: ZoneMapContext): void {
  const { world, block, rng, surface, zone } = ctx;
  const [reading, festival, tower] = [1, 2, 3].map(zone) as [Zone, Zone, Zone];

  // Ground taken (buildings, yards, plots) and props placed, cell by cell, so the town and the dressing
  // keep clear of them; rooms indoors get no dressing and no street lamps.
  const used = new Uint8Array(SIZE * SIZE);
  const propped = new Uint8Array(SIZE * SIZE);
  const indoors: Rect[] = [];
  const cell = (x: number, z: number): number => (x >= 0 && z >= 0 && x < SIZE && z < SIZE ? x * SIZE + z : -1);
  const mark = (grid: Uint8Array, x0: number, z0: number, x1: number, z1: number): void => {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) {
      const i = cell(x, z);
      if (i >= 0) grid[i] = 1;
    }
  };
  const isSet = (grid: Uint8Array, x: number, z: number): boolean => grid[cell(x, z)] === 1;
  const c: ZoneMapContext = {
    ...ctx,
    keepOut: (x0, z0, x1, z1) => {
      ctx.keepOut(x0, z0, x1, z1);
      mark(used, x0, z0, x1, z1);
    },
    prop: (model, x, z, yaw = 0) => {
      ctx.prop(model, x, z, yaw);
      mark(propped, x, z, x, z);
    },
    centred: (model, x, z, yaw) => {
      ctx.centred(model, x, z, yaw);
      mark(propped, x, z, x, z);
    },
  };
  const indoor = (r: Rect): void => {
    indoors.push(r);
    mark(used, r.x0, r.z0, r.x1, r.z1);
  };
  const isIndoor = (x: number, z: number): boolean => indoors.some((r) => inRect(r, x, z));
  const put = (x: number, y: number, z: number, name: string): void => world.set(x, y, z, name === 'air' ? 0 : block(name));
  const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, name: string): void => {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) put(x, y, z, name);
  };
  const tree = (x: number, z: number, leaves: string, height = 6): void => {
    placeTree(world, x, BASE, z, height, { log: block('tree-log'), leaves: block(leaves) }, rng);
    mark(used, x - 1, z - 1, x + 1, z + 1);
  };
  const bigTree = (x: number, z: number, leaves: string): void => {
    placeAncientTree(world, x, BASE, z, { log: block('tree-log'), leaves: block(leaves), core: block('log') }, rng);
    c.keepOut(x - 3, z - 3, x + 3, z + 3);
  };
  const benchRow = (x: number, z: number, count: number, dx: number, dz: number, yaw: number): void => {
    for (let i = 0; i < count; i++) c.prop(M.bench, x + i * dx, z + i * dz, yaw);
  };
  const stall = (x0: number, z0: number, stripes: readonly string[], goods: readonly string[]): [number, number] => {
    const s = placeStall(world, x0, z0, 5, 3, BASE, { log: block('log'), planks: block('planks'), stripes: stripes.map(block) });
    goods.forEach((g, i) => ctx.propAt(g, [s.counter[0] - 1.5 + i * 1.5, s.counter[1], s.counter[2]], i * 40));
    ctx.propAt(M.balloon, [x0 + 0.5, BASE + 4, z0 - 0.5], 0);
    c.keepOut(x0 - 1, z0 - 2, x0 + 5, z0 + 3);
    return [x0 + 2, z0 - 3];
  };

  // The avenue: asphalt between pavements, zebra stripes at the crossings.
  for (let x = 20; x < 780; x++) for (let dz = -2; dz <= 2; dz++) {
    const z = AVENUE_Z + dz;
    if (inWater(x, z) || !ctx.onPath(x, z)) continue;
    const zebra = CROSSINGS.some((cx) => Math.abs(x - cx) >= 4 && Math.abs(x - cx) <= 6) && (z + x) % 2 === 0;
    put(x, surface(x, z), z, zebra ? 'snow' : 'asphalt');
  }
  // The spawn and the gate beside it stay open.
  c.keepOut(SPAWN.x - 10, SPAWN.z - 4, SPAWN.x + 16, SPAWN.z + 12);

  buildLibrary(ctx, c, { put, box, tree, benchRow, indoor });
  buildFestival(ctx, c, festival, { put, box, tree, bigTree, benchRow, stall });
  buildClockTower(ctx, c, tower, { put, box, tree, benchRow, indoor });

  // Flower gardens north-west: fenced beds of one flower each, alleys between them.
  let plot = 0;
  for (let z = GARDENS.z0; z + 20 <= GARDENS.z1; z += 28) {
    for (let x = GARDENS.x0; x + 36 <= GARDENS.x1; x += 44) {
      if (plot++ % 3 === 1) continue;
      flowerField(c, { x0: x, z0: z, x1: x + 36, z1: z + 20 }, FLOWERS[plot % 3] ?? M.flowerRed);
    }
  }

  // Cottages along every street, with a little park now and then.
  const buffer = new Set<string>();
  for (const r of STREETS) for (const k of pathColumns(r, 5)) buffer.add(k);
  for (const r of SPURS) for (const k of pathColumns(r, 5)) buffer.add(k);
  for (const k of pathColumns([[30, AVENUE_Z], [770, AVENUE_Z]], 9)) buffer.add(k);
  const fits = (x0: number, z0: number, x1: number, z1: number, inDistrict = false): boolean => {
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
      if (buffer.has(`${x},${z}`) || isSet(used, x, z) || isSet(propped, x, z) || inWater(x, z) || inWater(x, z + 1)) return false;
      if (inDistrict ? !ctx.inZone(x, z) : ctx.inZone(x, z, 3)) return false;
    }
    return true;
  };
  let slot = 0;
  for (const r of TOWN) {
    for (let z = r.z0 + 7; z + 8 <= r.z1; z += 22) {
      let x = r.x0;
      while (x + 14 <= r.x1) {
        if (!fits(x - 1, z - 7, x + 14, z + 8)) {
          x += 3;
          continue;
        }
        if (slot++ % 8 === 5) {
          flowerBed(c, x + 1, z - 4, 11, 4);
          c.prop(M.bench, x + 6, z + 2, 0);
          c.prop(M.fruitTree, x + 2, z + 5, slot * 31);
          c.prop(M.fruitTree, x + 11, z + 5, slot * 17);
          c.keepOut(x - 1, z - 7, x + 14, z + 8);
          x += 17;
          continue;
        }
        x = cottageRow(c, x, z, 1).x1 + 2;
      }
    }
  }
  // Houses round the squares of the festival and the clock tower, along their edges.
  const edgeRow = (zn: Zone, z: number): void => {
    let x = zn.x - zn.hx + 1;
    while (x + 14 <= zn.x + zn.hx - 1) {
      if (fits(x - 1, z - 7, x + 14, z + 8, true)) x = cottageRow(c, x, z, 1).x1 + 2;
      else x += 3;
    }
  };
  edgeRow(festival, festival.z + festival.hz - 9);
  edgeRow(tower, tower.z - tower.hz + 9);
  edgeRow(tower, tower.z + tower.hz - 9);
  // Trees all round the inside of each district, golden round the festival.
  const leavesOf: Record<number, readonly string[]> = { 1: ['leaves', 'leaves-pink', 'leaves'], 2: ['leaves-autumn', 'leaves-autumn', 'leaves-pink'], 3: ['leaves', 'leaves-pink', 'leaves-autumn'] };
  for (const zn of [reading, festival, tower]) {
    const ring: Array<[number, number]> = [];
    for (let x = zn.x - zn.hx + 3; x <= zn.x + zn.hx - 3; x += 7) ring.push([x, zn.z - zn.hz + 3], [x, zn.z + zn.hz - 3]);
    for (let z = zn.z - zn.hz + 10; z <= zn.z + zn.hz - 10; z += 7) ring.push([zn.x - zn.hx + 3, z], [zn.x + zn.hx - 3, z]);
    ring.forEach(([x, z], i) => {
      let clear = !ctx.nearPath(x, z, 4);
      for (let dx = -3; dx <= 3 && clear; dx++) for (let dz = -3; dz <= 3 && clear; dz++) if (isSet(used, x + dx, z + dz) || isSet(propped, x + dx, z + dz) || inWater(x + dx, z + dz) || world.get(x + dx, surface(x + dx, z + dz) + 1, z + dz) !== 0) clear = false;
      if (clear) tree(x, z, leavesOf[zn.chapter]?.[i % 3] ?? 'leaves', 5 + (i % 3));
    });
  }

  // Street lamps on both sides of every way (the avenue's farther out), skipping water, rooms and walls.
  const lamps = (route: readonly Point[], off: number, spacing: number): void => {
    for (let i = 0; i + 1 < route.length; i++) {
      const [ax = 0, az = 0] = route[i] ?? [];
      const [bx = 0, bz = 0] = route[i + 1] ?? [];
      const len = Math.hypot(bx - ax, bz - az);
      const [nx, nz] = [-(bz - az) / len, (bx - ax) / len];
      for (let d = spacing / 2; d < len; d += spacing) {
        for (const side of [1, -1]) {
          const x = Math.round(ax + ((bx - ax) * d) / len + side * off * nx);
          const z = Math.round(az + ((bz - az) * d) / len + side * off * nz);
          if (inWater(x, z) || ctx.onPath(x, z) || isIndoor(x, z) || isSet(propped, x, z) || world.get(x, surface(x, z) + 1, z) !== 0) continue;
          // Facing the way, in [0, 360): a -0 would not survive the round trip through entities.json.
          const yaw = (Math.round((Math.atan2(-side * nx, -side * nz) * 180) / Math.PI) + 360) % 360;
          c.prop(M.lamp, x, z, yaw);
        }
      }
    }
  };
  lamps([[30, AVENUE_Z], [770, AVENUE_Z]], 6, 16);
  for (const r of [...STREETS, ...SPURS]) lamps(r, 3, 18);

  // Each district dressed with small things, clear of paths, water, rooms and what stands there.
  const dress = (zn: Zone, models: readonly string[], spacing: number): void => {
    for (let gx = zn.x - zn.hx + 2; gx < zn.x + zn.hx - 1; gx += spacing) {
      for (let gz = zn.z - zn.hz + 2; gz < zn.z + zn.hz - 1; gz += spacing) {
        const x = Math.round(gx + (rng() - 0.5) * spacing * 0.8);
        const z = Math.round(gz + (rng() - 0.5) * spacing * 0.8);
        const model = models[Math.floor(rng() * models.length)] ?? M.bush;
        let clear = !ctx.onPath(x, z) && !inWater(x, z) && !isIndoor(x, z) && world.get(x, surface(x, z) + 1, z) === 0;
        for (let dx = -1; dx <= 1 && clear; dx++) for (let dz = -1; dz <= 1 && clear; dz++) if (isSet(used, x + dx, z + dz) || isSet(propped, x + dx, z + dz)) clear = false;
        if (clear) c.prop(model, x, z, Math.floor(rng() * 360));
      }
    }
  };
  dress(reading, [...FLOWERS, M.bush, M.grass], 5);
  dress(festival, [M.leaf, M.leaf, M.flowerYellow, M.bush], 5);
  dress(tower, [...FLOWERS, M.bush, M.grass], 5);
}

interface Kit {
  put: (x: number, y: number, z: number, name: string) => void;
  box: (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, name: string) => void;
  tree: (x: number, z: number, leaves: string, height?: number) => void;
  benchRow: (x: number, z: number, count: number, dx: number, dz: number, yaw: number) => void;
}

/** A fenced bed of one flower in rows (every 2 blocks along x, every 3 along z), fence posts every 2 blocks. */
function flowerField(c: ZoneMapContext, r: Rect, flower: string): void {
  for (let x = r.x0 + 2; x < r.x1 - 1; x += 2) for (let z = r.z0 + 2; z < r.z1 - 1; z += 3) c.prop(flower, x, z, (x * 31 + z * 7) % 360);
  for (let x = r.x0; x <= r.x1; x += 2) for (const z of [r.z0, r.z1]) if (Math.abs(x - (r.x0 + r.x1) / 2) > 2) c.prop(M.fence, x, z, 0);
  for (let z = r.z0 + 2; z < r.z1; z += 2) for (const x of [r.x0, r.x1]) c.prop(M.fence, x, z, 90);
  c.keepOut(r.x0, r.z0, r.x1, r.z1);
}

/**
 * Chapter 1: the library hall, door on the avenue's spur, after the mock's reading room: tall bookcases along
 * the walls and in rows with aisles between, reading tables with lamps, the librarian's desk and the return
 * counter by the door, the reading corner with its rug and pillows, a book loft along the west wall up a
 * flight of stairs, big windows all round. Behind it the terrace steps down into the reading garden.
 */
function buildLibrary(ctx: ZoneMapContext, c: ZoneMapContext, kit: Kit & { indoor: (r: Rect) => void }): void {
  const { world, block, surface } = ctx;
  const { put, box, tree, benchRow, indoor } = kit;
  const H = { x0: 207, z0: 500, w: 47, d: 34 };
  const x1 = H.x0 + H.w - 1;
  const z1 = H.z0 + H.d - 1;
  const doorX = 230;
  placeHouse(world, H.x0, H.z0, H.w, H.d, 8, BASE, { wall: block('sand'), roof: block('brick-red'), trim: block('birch-log') });
  // Walls again with tall windows between birch pilasters, then the doors front and back.
  for (let y = BASE; y < BASE + 8; y++) for (let x = H.x0; x <= x1; x++) for (let z = H.z0; z <= z1; z++) {
    const edgeX = x === H.x0 || x === x1;
    const edgeZ = z === H.z0 || z === z1;
    if (!edgeX && !edgeZ) continue;
    const i = edgeZ ? x - H.x0 : z - H.z0;
    const trim = (edgeX && edgeZ) || i % 5 === 0 || y === BASE + 7;
    put(x, y, z, trim ? 'birch-log' : y >= BASE + 1 && y <= BASE + 4 ? 'glass' : 'sand');
  }
  box(doorX - 2, BASE, H.z0, doorX + 2, BASE + 2, H.z0, 'air');
  put(doorX - 3, BASE + 3, H.z0, 'birch-log');
  box(doorX - 2, BASE + 1, z1, doorX + 2, BASE + 3, z1, 'air');
  box(doorX - 2, BASE, z1, doorX + 2, BASE, z1, 'planks');
  // Plank floor, and a canopy over the front door on two posts.
  box(H.x0 + 1, LEVEL, H.z0, x1 - 1, LEVEL, z1 - 1, 'planks');
  for (const x of [doorX - 4, doorX + 4]) box(x, BASE, H.z0 - 3, x, BASE + 3, H.z0 - 3, 'log');
  box(doorX - 5, BASE + 4, H.z0 - 4, doorX + 5, BASE + 4, H.z0 - 1, 'roof-blue');
  indoor({ x0: H.x0 + 1, z0: H.z0 + 1, x1: x1 - 1, z1: z1 - 1 });
  ctx.landmark('thu-vien', 'Thư viện', doorX, H.z0 - 2);

  // The book loft along the west wall, three blocks up, bookcases on it, a rail of fence posts, the stairs.
  const loft = { x0: H.x0 + 1, z0: H.z0 + 2, x1: H.x0 + 7, z1: z1 - 2 };
  box(loft.x0, BASE, loft.z0, loft.x1, BASE + 2, loft.z1, 'planks');
  for (let z = loft.z0 + 1; z < loft.z1; z += 2) c.centred(M.bookcase, loft.x0, z, 90);
  const stairZ = 516;
  for (let z = loft.z0; z <= loft.z1; z += 2) if (Math.abs(z - stairZ) > 2) c.prop(M.fence, loft.x1, z, 90);
  box(loft.x1 + 1, BASE, stairZ - 1, loft.x1 + 1, BASE + 1, stairZ + 1, 'planks');
  box(loft.x1 + 2, BASE, stairZ - 1, loft.x1 + 2, BASE, stairZ + 1, 'planks');
  ctx.landmark('gac-sach', 'Gác sách', loft.x0 + 3, stairZ, BASE + 3);
  ctx.landmark('bac-cau-thang-gac-sach', 'Bậc cầu thang gác sách', loft.x1 + 3, stairZ);

  // Rows of bookcases in the east half, aisles between them; bookcases along the east and back walls.
  for (const [k, x] of [239, 243, 247].entries()) for (let z = 508; z <= 524; z += 2) c.centred(M.bookcase, x, z, k % 2 === 0 ? 90 : 270);
  for (let z = H.z0 + 3; z <= z1 - 2; z += 2) c.centred(M.bookcase, x1 - 1, z, 270);
  for (let x = 234; x <= 248; x += 2) c.centred(M.bookcase, x, z1 - 1, 180);
  ctx.landmark('ke-sach-phong-doc', 'Kệ sách phòng đọc', x1 - 3, 516);
  ctx.landmark('loi-giua-cac-ke-sach', 'Lối đi giữa các kệ sách', 241, 516);

  // Reading tables with chairs, books and lamps west of the middle aisle.
  for (const tx of [219, 225]) for (const tz of [509, 516, 523]) {
    c.centred(M.table, tx, tz, 0);
    for (const dz of [-1, 1]) c.centred(M.chair, tx, tz + dz, dz < 0 ? 0 : 180);
    ctx.propAt(M.openBook, [tx + 0.5, BASE + 0.8, tz + 0.5], tx * 7 + tz);
  }
  for (const [x, z] of [[222, 512], [222, 520], [217, 526], [235, 512], [235, 522]] as const) c.centred(M.floorLamp, x, z, 0);
  ctx.landmark('ban-doc', 'Bàn đọc sách', 222, 516);

  // The return counter west of the door, the librarian's desk east of it.
  box(216, BASE, 504, 225, BASE, 504, 'birch-log');
  box(216, BASE, 502, 216, BASE, 503, 'birch-log');
  for (let x = 217; x <= 225; x += 2) ctx.propAt(M.books, [x + 0.5, BASE + 1, 504.5], x * 13);
  ctx.landmark('quay-tra-sach', 'Quầy trả sách', 220, 506);
  c.centred(M.table, 237, 505, 0);
  c.centred(M.table, 238, 505, 0);
  c.centred(M.chair, 237, 503, 0);
  ctx.propAt(M.books, [237.5, BASE + 0.8, 505.5], 20);
  c.centred(M.floorLamp, 240, 503, 0);
  ctx.landmark('ban-thu-thu', 'Bàn thủ thư', 237, 507);

  // The reading corner by the back door: a rug, pillows on it, low bookcases, plants.
  c.centred(M.rug, 221, 528, 0);
  for (let i = 0; i < 6; i++) c.centred(M.pillow, 218 + (i % 3) * 3, 527 + Math.floor(i / 3) * 2, i * 30);
  for (let x = 217; x <= 225; x += 2) c.centred(M.bookcaseLow, x, z1 - 1, 180);
  for (const [x, z] of [[216, 526], [226, 526], [loft.x1 + 1, H.z0 + 1], [x1 - 2, H.z0 + 1], [226, 502]] as const) c.centred(M.plant, x, z, 0);
  ctx.landmark('goc-doc-co-goi', 'Góc đọc có gối', 221, 528);

  // The terrace behind the back door, two blocks up, a step all round down into the garden.
  const T = { x0: doorX - 9, z0: z1 + 1, x1: doorX + 9, z1: z1 + 6 };
  box(T.x0 - 1, BASE, T.z0, T.x1 + 1, BASE, T.z1 + 1, 'brick-grey');
  box(T.x0, BASE + 1, T.z0, T.x1, BASE + 1, T.z1, 'brick-grey');
  for (const x of [T.x0 + 1, T.x1 - 1]) ctx.propAt(M.plant, [x + 0.5, BASE + 2, T.z1 - 0.5], 0);
  ctx.landmark('bac-them-ra-vuon', 'Bậc thềm ra vườn', doorX, T.z1 + 2);

  // Flowers along the front, benches by the door, trees round the forecourt.
  for (const x0 of [H.x0 + 1, doorX + 6]) flowerBed(c, x0, H.z0 - 4, 16, 2);
  benchRow(doorX - 8, H.z0 - 8, 2, 16, 0, 0);
  for (const [x, z] of [[196, 486], [214, 482], [246, 482], [264, 486], [282, 480], [178, 482]] as const) tree(x, z, x === 214 || x === 264 ? 'leaves-pink' : 'leaves');

  // The reading garden west and south of the hall: the flat stone with wild grass round it and the stream
  // behind it, the purple myrtle, benches, a sandy beach on the stream.
  const stone = { x: 184, z: 555 };
  box(stone.x - 2, BASE, stone.z - 1, stone.x + 2, BASE, stone.z + 1, 'stone');
  for (const [dx, dz] of [[-5, -2], [5, 1], [-3, 4]] as const) c.prop(M.rock, stone.x + dx, stone.z + dz, dx * 40);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    c.prop(i % 3 === 0 ? M.flowerPurple : M.grass, Math.round(stone.x + Math.cos(a) * 5), Math.round(stone.z + Math.sin(a) * 4), i * 25);
  }
  c.keepOut(stone.x - 2, stone.z - 1, stone.x + 2, stone.z + 1);
  ctx.landmark('tang-da-phang', 'Tảng đá phẳng', stone.x, stone.z - 3);
  ctx.landmark('suoi-nho', 'Suối nhỏ', 190, Math.round(streamCenter(190)) - 4);
  const myrtle = { x: 174, z: 532 };
  tree(myrtle.x, myrtle.z, 'leaves-pink', 5);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    c.prop(M.flowerPurple, Math.round(myrtle.x + Math.cos(a) * 3), Math.round(myrtle.z + Math.sin(a) * 3), i * 45);
  }
  ctx.landmark('goc-sim-tim', 'Gốc sim tím', myrtle.x + 3, myrtle.z + 3);
  for (let x = 248; x <= 266; x++) {
    const bank = Math.floor(streamCenter(x) - 2.2);
    for (let z = bank - 5; z <= bank; z++) if (!inWater(x, z) && !ctx.onPath(x, z)) put(x, surface(x, z), z, 'sand');
  }
  c.prop(M.bucket, 252, 562, 30);
  ctx.landmark('bai-cat-nho', 'Bãi cát nhỏ', 257, Math.floor(streamCenter(257)) - 5);
  benchRow(176, 548, 3, 5, 0, 180);
  benchRow(168, 505, 3, 0, 8, 90);
  for (const [x0, z0] of [[166, 492], [186, 510], [256, 545], [282, 552]] as const) flowerBed(c, x0, z0, 10, 4);
  for (const [x, z] of [[166, 520], [192, 498], [204, 548], [214, 560], [244, 552], [276, 560], [292, 548], [168, 575], [236, 580], [286, 580]] as const) tree(x, z, (x + z) % 3 === 0 ? 'leaves-pink' : 'leaves');
  ctx.landmark('vuon-doc-sach', 'Vườn đọc sách', 190, 540);

  // East of the hall: a fountain among flower beds, benches and trees.
  const fx = 278;
  const fz = 514;
  placeFountain(world, fx, fz, LEVEL, { stone: block('brick-grey'), water: block('water') });
  c.keepOut(fx - 5, fz - 5, fx + 5, fz + 5);
  for (const [dx, dz, yaw] of [[0, -7, 0], [0, 7, 180], [-7, 0, 90], [7, 0, 270]] as const) c.prop(M.bench, fx + dx, fz + dz, yaw);
  for (const [x0, z0] of [[262, 496], [262, 528], [286, 496], [286, 528]] as const) flowerBed(c, x0, z0, 8, 4);
  for (const [x, z] of [[264, 506], [292, 506], [264, 522], [292, 522], [270, 540], [296, 536]] as const) tree(x, z, x > 280 ? 'leaves-pink' : 'leaves');
}

/**
 * Chapter 2: the golden-leaf festival yard: the stage under a leafy backdrop to the north, benches for the
 * audience, the golden-leaf road up the middle, the round pool with rafts to the east, the golden tree with
 * its stone table, the tree hung with clouds, the leaf-sweet stall and the contest stations.
 */
function buildFestival(ctx: ZoneMapContext, c: ZoneMapContext, zn: Zone, kit: Kit & { bigTree: (x: number, z: number, leaves: string) => void; stall: (x0: number, z0: number, stripes: readonly string[], goods: readonly string[]) => [number, number] }): void {
  const { surface } = ctx;
  const { put, box, bigTree, benchRow, stall } = kit;
  const top = zn.z - zn.hz;

  // The golden-leaf road: a sand road up the middle, leaves strewn along it, golden trees either side.
  for (let z = top + 20; z <= zn.z + zn.hz; z++) for (let dx = -3; dx <= 3; dx++) {
    const x = zn.x + dx;
    if (!inWater(x, z)) put(x, surface(x, z), z, 'sand');
  }
  for (let z = top + 22; z <= zn.z + zn.hz; z += 3) for (const dx of [-4, 4]) c.prop(M.leaf, zn.x + dx, z, z * 37);
  for (let z = top + 26; z <= zn.z + zn.hz - 2; z += 10) for (const dx of [-7, 7]) c.prop(M.autumnTree, zn.x + dx, z, z * 11);
  ctx.landmark('duong-la-vang', 'Đường lá vàng', zn.x, zn.z + 30);

  // The leaf stage: a plank platform, a backdrop of golden leaves in a red frame, balloons.
  const S = { x0: zn.x - 18, z0: top + 5, x1: zn.x + 18, z1: top + 16 };
  box(S.x0, BASE, S.z0, S.x1, BASE, S.z1, 'planks');
  box(S.x0, BASE + 1, S.z0 - 1, S.x1, BASE + 7, S.z0 - 1, 'leaves-autumn');
  for (let x = S.x0; x <= S.x1; x += 6) box(x, BASE + 1, S.z0 - 1, x, BASE + 8, S.z0 - 1, 'wood-red');
  box(S.x0, BASE + 8, S.z0 - 1, S.x1, BASE + 8, S.z0 - 1, 'wood-red');
  for (const x of [S.x0 + 1, S.x1 - 1]) ctx.propAt(M.balloon, [x + 0.5, BASE + 1, S.z0 + 0.5], 0);
  for (let x = S.x0 + 4; x < S.x1 - 2; x += 5) ctx.propAt(M.leaf, [x + 0.5, BASE + 1, S.z1 - 1.5], x * 17);
  ctx.landmark('san-khau-la-vang', 'Sân khấu lá vàng', zn.x, S.z1 + 2);
  for (const z of [S.z1 + 8, S.z1 + 14, S.z1 + 20]) {
    benchRow(zn.x - 16, z, 3, 4, 0, 180);
    benchRow(zn.x + 8, z, 3, 4, 0, 180);
  }

  // The round pool: a stone rim, rafts afloat, the edge where the fish swim.
  for (let x = POOL.x - 13; x <= POOL.x + 13; x++) for (let z = POOL.z - 13; z <= POOL.z + 13; z++) {
    const d = Math.hypot(x - POOL.x, z - POOL.z);
    if (d >= POOL.r && d < POOL.r + 1.6) put(x, surface(x, z), z, 'brick-grey');
  }
  for (const [dx, dz] of [[-5, -4], [3, -5], [-2, 4], [5, 3]] as const) box(POOL.x + dx, WATER_LEVEL + 1, POOL.z + dz, POOL.x + dx + 1, WATER_LEVEL + 1, POOL.z + dz + 2, 'planks');
  ctx.landmark('be-nuoc-tron', 'Bể nước tròn', POOL.x, POOL.z - POOL.r - 2);
  ctx.landmark('mep-be-nuoc-tron', 'Mép bể nước tròn', POOL.x - POOL.r - 3, POOL.z);

  // The golden tree with its stone table and stools; the tree hung with clouds.
  const gold = { x: zn.x + 50, z: top + 24 };
  bigTree(gold.x, gold.z, 'leaves-autumn');
  box(gold.x + 3, BASE, gold.z + 9, gold.x + 5, BASE, gold.z + 10, 'stone');
  for (const [dx, dz] of [[2, 8], [6, 8], [2, 11], [6, 11]] as const) put(gold.x + dx, BASE, gold.z + dz, 'brick-grey');
  c.keepOut(gold.x + 2, gold.z + 8, gold.x + 6, gold.z + 11);
  ctx.landmark('cay-la-vang', 'Cây lá vàng', gold.x, gold.z + 5);
  ctx.landmark('ban-da-duoi-cay-la-vang', 'Bàn đá dưới cây lá vàng', gold.x + 4, gold.z + 13);
  const cloudTree = { x: zn.x - 46, z: top + 12 };
  bigTree(cloudTree.x, cloudTree.z, 'leaves-autumn');
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.4;
    const x = Math.round(cloudTree.x + Math.cos(a) * 5);
    const z = Math.round(cloudTree.z + Math.sin(a) * 5);
    box(x, BASE + 8, z, x, BASE + 9, z, 'log');
    box(x - 1, BASE + 6, z - 1, x + 1, BASE + 7, z, 'snow');
  }
  ctx.landmark('cay-treo-may', 'Cây treo mây', cloudTree.x, cloudTree.z + 8);

  // The leaf-sweet stall by the road, the contest stations west of it and one by the pool.
  const sweets = stall(zn.x + 10, zn.z - 6, ['wood-red', 'snow'], [M.leaf, M.gift, M.leaf]);
  ctx.landmark('quay-keo-la', 'Quầy kẹo lá', sweets[0], sweets[1]);
  const stations: Array<[string, string, readonly string[], readonly string[]]> = [
    ['tram-bong-hoa', 'Trạm bông hoa', ['brick-red', 'snow'], [M.flowerRed, M.flowerYellow, M.flowerPurple]],
    ['tram-the-mau', 'Trạm thẻ màu', ['roof-blue', 'snow'], [M.ticket, M.ticket]],
    ['tram-doan-tu', 'Trạm đoán từ', ['sand', 'wood-red'], [M.openBook, M.books]],
    ['tram-do-vat', 'Trạm đồ vật', ['birch-log', 'roof-blue'], [M.gift, M.balloon]],
    ['tram-dong-vai', 'Trạm đóng vai', ['planks', 'brick-red'], [M.balloon, M.leaf]],
    ['tram-ke-chuyen', 'Trạm kể chuyện', ['snow', 'wood-red'], [M.books, M.openBook]],
    ['tram-bo-dua', 'Trạm bó đũa', ['sand', 'roof-blue'], [M.chopsticks, M.chopsticks]],
  ];
  const slots: Array<[number, number]> = [];
  for (const x0 of [zn.x - 57, zn.x - 33]) for (const dz of [-24, -8, 8, 24]) slots.push([x0, zn.z + dz]);
  stations.forEach(([id, name, stripes, goods], i) => {
    const [x0, z0] = slots[i] ?? [0, 0];
    const [lx, lz] = stall(x0, z0, stripes, goods);
    ctx.landmark(id, name, lx, lz);
  });
  const waterStall = stall(POOL.x + 14, POOL.z + 14, ['roof-blue', 'snow'], [M.balloon, M.leaf]);
  ctx.landmark('tram-be-nuoc', 'Trạm bể nước', waterStall[0], waterStall[1]);

  // Golden trees round the yard, lamps at the corners of the audience.
  for (let z = top + 30; z <= zn.z + 20; z += 12) c.prop(M.autumnTree, zn.x - zn.hx + 9, z, z * 13);
  // The audience's square paved in front of the stage, flowers before every stall.
  for (let x = S.x0; x <= S.x1; x++) for (let z = S.z1 + 1; z <= S.z1 + 26; z++) if (Math.abs(x - zn.x) > 3 && (x + z) % 9 !== 0) put(x, surface(x, z), z, 'path');
  for (const [x0, z0] of slots.slice(0, stations.length)) flowerBed(c, x0, z0 + 5, 6, 2);
  for (const [x, z] of [[zn.x - 20, S.z1 + 4], [zn.x + 20, S.z1 + 4], [zn.x - 20, S.z1 + 24], [zn.x + 20, S.z1 + 24]] as const) c.prop(M.lamp, x, z, 0);
}

/**
 * Chapter 3: the clock tower at the end of its street: a brick tower with a porch roof over the door, round
 * windows, spiral stairs up the inside to the landing and the balcony under the clock faces, on up to the
 * bell loft with its big bell, railing and eaves; the clock workshop and the calendar room either side, the
 * mailbox by the door, the telescope corner on its little deck, flower beds and benches on the lawn.
 */
function buildClockTower(ctx: ZoneMapContext, c: ZoneMapContext, zn: Zone, kit: Kit & { indoor: (r: Rect) => void }): void {
  const { surface } = ctx;
  const { put, box, tree, benchRow, indoor } = kit;
  const t = { x: zn.x, z: zn.z + 12 };
  const at = (dx: number, y: number, dz: number, name: string): void => put(t.x + dx, y, t.z + dz, name);
  const WALL_TOP = BASE + 22;
  const LANDING = BASE + 15;
  const BELFRY = BASE + 23;

  // The paved apron round the tower.
  for (let dx = -8; dx <= 8; dx++) for (let dz = -8; dz <= 8; dz++) {
    const x = t.x + dx;
    const z = t.z + dz;
    if (Math.max(Math.abs(dx), Math.abs(dz)) > 5 && !ctx.onPath(x, z)) put(x, surface(x, z), z, 'brick-grey');
  }
  // Walls: brick with stone corners and a stone band under the balcony; the door faces the street (-z).
  for (let y = BASE; y <= WALL_TOP; y++) for (let dx = -5; dx <= 5; dx++) for (let dz = -5; dz <= 5; dz++) {
    if (Math.max(Math.abs(dx), Math.abs(dz)) !== 5) continue;
    const corner = Math.abs(dx) === 5 && Math.abs(dz) === 5;
    at(dx, y, dz, corner || y === LANDING ? 'brick-grey' : 'brick-red');
  }
  box(t.x - 1, BASE, t.z - 5, t.x + 1, BASE + 2, t.z - 5, 'air');
  box(t.x - 4, LEVEL, t.z - 4, t.x + 4, LEVEL, t.z + 4, 'planks');
  // Round windows on every face, and a clock face over each balcony side: white dial, dark hands.
  const faces: Array<(u: number, y: number, name: string) => void> = [
    (u, y, n) => at(u, y, -5, n),
    (u, y, n) => at(u, y, 5, n),
    (u, y, n) => at(-5, y, u, n),
    (u, y, n) => at(5, y, u, n),
  ];
  for (const face of faces) {
    for (let u = -2; u <= 2; u++) for (let dy = -2; dy <= 2; dy++) {
      if (u * u + dy * dy <= 2.5) face(u, BASE + 8 + dy, 'glass');
      if (u * u + dy * dy <= 6.5) face(u, BASE + 19 + dy, 'snow');
    }
    for (const [u, dy] of [[0, 0], [0, 1], [0, 2], [1, 0], [2, 0]] as const) face(u, BASE + 19 + dy, 'board');
  }
  ctx.propAt(M.clock, [t.x + 0.5, BASE + 17.6, t.z - 6.3], 180);

  // Spiral stairs round the inside: from the door up to the landing, then on up to the bell loft.
  const ring: Array<[number, number]> = [];
  for (let dx = -2; dx >= -4; dx--) ring.push([dx, -4]);
  for (let dz = -3; dz <= 4; dz++) ring.push([-4, dz]);
  for (let dx = -3; dx <= 4; dx++) ring.push([dx, 4]);
  for (let dz = 3; dz >= -4; dz--) ring.push([4, dz]);
  for (let dx = 3; dx >= 2; dx--) ring.push([dx, -4]);
  // The landing covers the inside but the first flight's well; the second flight climbs from it.
  for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) {
    const k = ring.findIndex(([rx, rz]) => rx === dx && rz === dz);
    if (k < 0 || k > 15) at(dx, LANDING, dz, 'planks');
  }
  ring.forEach(([dx, dz], k) => {
    if (k <= 23) at(dx, BASE + k, dz, k === 15 || k === 23 ? 'planks' : 'birch-log');
  });
  // The balcony round the clock faces, a door onto it from the landing, a rail along its edge.
  for (let dx = -7; dx <= 7; dx++) for (let dz = -7; dz <= 7; dz++) {
    const d = Math.max(Math.abs(dx), Math.abs(dz));
    if (d >= 6) at(dx, LANDING, dz, 'planks');
    if (d === 7) at(dx, LANDING + 1, dz, 'birch-log');
  }
  box(t.x - 1, LANDING + 1, t.z - 5, t.x + 1, LANDING + 2, t.z - 5, 'air');
  ctx.landmark('chieu-nghi-cau-thang-xoan', 'Chiếu nghỉ cầu thang xoắn', t.x, t.z, LANDING + 1);
  ctx.landmark('ban-cong-mat-dong-ho', 'Ban công mặt đồng hồ', t.x, t.z - 6, LANDING + 1);
  ctx.landmark('chan-cau-thang-xoan', 'Chân cầu thang xoắn', t.x - 1, t.z - 3);

  // The bell loft: a floor over the walls (open over the last stairs), stone pillars, a railing, the bell.
  for (let dx = -5; dx <= 5; dx++) for (let dz = -5; dz <= 5; dz++) {
    const k = ring.findIndex(([rx, rz]) => rx === dx && rz === dz);
    if (k < 20 || k > 22) at(dx, BELFRY, dz, 'planks');
    const edge = Math.max(Math.abs(dx), Math.abs(dz)) === 5;
    const pillar = Math.abs(dx) >= 4 && Math.abs(dz) >= 4;
    if (pillar) for (let y = BELFRY + 1; y <= BELFRY + 4; y++) at(dx, y, dz, 'brick-grey');
    else if (edge) at(dx, BELFRY + 1, dz, 'birch-log');
  }
  at(0, BELFRY + 4, 0, 'sand');
  box(t.x - 1, BELFRY + 2, t.z - 1, t.x + 1, BELFRY + 3, t.z + 1, 'sand');
  for (const [dx, dz] of [[-2, 0], [2, 0], [0, -2], [0, 2]] as const) at(dx, BELFRY + 2, dz, 'sand');
  ctx.landmark('gac-chuong', 'Gác chuông', t.x, t.z + 3, BELFRY + 1);
  ctx.landmark('lan-can-dinh-thap', 'Lan can đỉnh tháp', t.x, t.z - 4, BELFRY + 1);
  // Eaves over the bell loft and a pointed roof.
  for (let dx = -6; dx <= 6; dx++) for (let dz = -6; dz <= 6; dz++) at(dx, BELFRY + 5, dz, 'roof-blue');
  for (let k = 0; k <= 5; k++) for (let dx = -5 + k; dx <= 5 - k; dx++) for (let dz = -5 + k; dz <= 5 - k; dz++) at(dx, BELFRY + 6 + k, dz, 'roof-blue');

  // The porch roof over the door, the mailbox beside it.
  for (const dx of [-3, 3]) box(t.x + dx, BASE, t.z - 9, t.x + dx, BASE + 2, t.z - 9, 'log');
  box(t.x - 4, BASE + 3, t.z - 9, t.x + 4, BASE + 3, t.z - 6, 'roof-blue');
  ctx.landmark('mai-hien-thap', 'Mái hiên tháp', t.x, t.z - 8);
  ctx.landmark('chan-thap-dong-ho', 'Chân tháp đồng hồ', t.x - 7, t.z);
  const mail = { x: t.x + 6, z: t.z - 9 };
  put(mail.x, BASE, mail.z, 'log');
  put(mail.x, BASE + 1, mail.z, 'wood-red');
  ctx.propAt(M.envelope, [mail.x + 0.5, BASE + 2, mail.z + 0.5], 0);
  c.keepOut(mail.x, mail.z, mail.x, mail.z);
  ctx.landmark('hop-thu', 'Hộp thư', mail.x, mail.z - 2);

  // The clock workshop east of the tower: shelves of clocks, a workbench with wheels.
  const W = { x0: t.x + 14, z0: t.z - 6, w: 13, d: 10 };
  room(ctx, W.x0, W.z0, W.w, W.d, 4, { wall: 'brick-grey', roof: 'roof-blue', trim: 'log' });
  indoor({ x0: W.x0 + 1, z0: W.z0 + 1, x1: W.x0 + W.w - 2, z1: W.z0 + W.d - 2 });
  for (let x = W.x0 + 2; x <= W.x0 + W.w - 3; x += 2) {
    c.centred(M.bookcase, x, W.z0 + W.d - 2, 180);
    for (const y of [0.15, 0.95, 1.7]) ctx.propAt(M.alarm, [x + 0.5, BASE + y, W.z0 + W.d - 2.2], 180);
  }
  c.prop(M.workbench, W.x0 + 3, W.z0 + 3, 90);
  ctx.propAt(M.wheel, [W.x0 + 3.5, BASE + 0.9, W.z0 + 3.5], 0);
  c.prop(M.workbench, W.x0 + W.w - 3, W.z0 + 3, 270);
  ctx.propAt(M.alarm, [W.x0 + W.w - 2.5, BASE + 0.9, W.z0 + 3.5], 200);
  ctx.landmark('phong-may-dong-ho', 'Phòng máy đồng hồ', W.x0 + 6, W.z0 - 2);
  ctx.landmark('ke-dong-ho', 'Kệ đồng hồ', W.x0 + 6, W.z0 + 5);

  // The calendar room west of it: the mending table, the calendar rack, the photo corner, the east window.
  const R = { x0: t.x - 29, z0: t.z - 10, w: 15, d: 11 };
  const rx1 = R.x0 + R.w - 1;
  room(ctx, R.x0, R.z0, R.w, R.d, 5, { wall: 'birch-log', roof: 'wood-red', trim: 'log' });
  box(rx1, BASE + 1, R.z0 + 2, rx1, BASE + 3, R.z0 + R.d - 3, 'glass');
  indoor({ x0: R.x0 + 1, z0: R.z0 + 1, x1: rx1 - 1, z1: R.z0 + R.d - 2 });
  for (const x of [R.x0 + 4, R.x0 + 5]) c.centred(M.table, x, R.z0 + 5, 0);
  c.centred(M.chair, R.x0 + 4, R.z0 + 4, 0);
  for (const [x, yaw] of [[R.x0 + 4.5, 10], [R.x0 + 5.6, 340]] as const) ctx.propAt(M.calendar, [x, BASE + 0.8, R.z0 + 5.5], yaw);
  ctx.landmark('ban-va-lich', 'Bàn vá lịch', R.x0 + 5, R.z0 + 7);
  const rack = R.z0 + R.d - 2;
  for (const x of [R.x0 + 3, rx1 - 3]) box(x, BASE, rack, x, BASE + 2, rack, 'log');
  box(R.x0 + 3, BASE + 3, rack, rx1 - 3, BASE + 3, rack, 'planks');
  for (let x = R.x0 + 4; x <= rx1 - 4; x += 2) ctx.propAt(M.calendar, [x + 0.5, BASE + 1.6, rack - 0.4], 180);
  ctx.landmark('gia-treo-lich', 'Giá treo lịch', R.x0 + 7, rack - 2);
  for (const z of [R.z0 + 3, R.z0 + 5, R.z0 + 7]) ctx.propAt(M.picture, [R.x0 + 1.3, BASE + 1.4, z + 0.5], 90);
  ctx.landmark('goc-treo-album-anh', 'Góc treo album ảnh', R.x0 + 2, R.z0 + 5);
  ctx.landmark('cua-so-huong-dong', 'Cửa sổ hướng đông', rx1 - 2, R.z0 + 5);
  ctx.landmark('phong-lich', 'Phòng lịch', R.x0 + 7, R.z0 - 2);

  // The telescope corner: a plank deck with a fence round it, a telescope on three legs.
  const tel = { x: zn.x + 34, z: zn.z - 26 };
  box(tel.x - 3, LEVEL, tel.z - 3, tel.x + 3, LEVEL, tel.z + 3, 'planks');
  for (let d = -3; d <= 3; d += 2) for (const [x, z, yaw] of [[tel.x + d, tel.z - 3, 0], [tel.x + d, tel.z + 3, 0], [tel.x - 3, tel.z + d, 90], [tel.x + 3, tel.z + d, 90]] as const) if (!(z === tel.z + 3 && Math.abs(d) <= 1)) c.prop(M.fence, x, z, yaw);
  for (const [dx, dz] of [[-1, 1], [1, 1], [0, -1]] as const) put(tel.x + dx, BASE, tel.z + dz, 'log');
  put(tel.x, BASE + 1, tel.z, 'brick-grey');
  put(tel.x, BASE + 2, tel.z - 1, 'brick-grey');
  put(tel.x, BASE + 2, tel.z - 2, 'glass');
  ctx.landmark('goc-kinh-vien-vong', 'Góc kính viễn vọng', tel.x, tel.z + 5);
  ctx.landmark('ban-cong-ngam-troi', 'Ban công ngắm trời', tel.x - 5, tel.z);

  // The lawn round the tower: flower beds, benches facing it, pink and green trees.
  for (const [x0, z0] of [[t.x - 20, t.z - 26], [t.x + 10, t.z - 26], [t.x - 22, t.z + 12], [t.x + 12, t.z + 12], [t.x - 8, t.z + 20]] as const) flowerBed(c, x0, z0, 10, 4);
  benchRow(t.x - 14, t.z - 18, 3, 4, 0, 0);
  benchRow(t.x + 6, t.z - 18, 3, 4, 0, 0);
  for (const [x, z] of [[zn.x - 50, zn.z - 22], [zn.x - 40, zn.z + 24], [zn.x + 50, zn.z + 24], [zn.x + 52, zn.z - 4], [zn.x - 52, zn.z + 6], [zn.x + 22, zn.z + 30], [zn.x - 20, zn.z + 30]] as const) tree(x, z, (x + z) % 2 === 0 ? 'leaves-pink' : 'leaves');
  // An avenue of trees up the street to the tower, flower beds between them.
  for (let z = zn.z - zn.hz + 14; z <= t.z - 22; z += 8) for (const dx of [-6, 6]) {
    tree(t.x + dx, z, z % 16 === 0 ? 'leaves-pink' : 'leaves', 5);
    flowerBed(c, t.x + dx - 1, z + 3, 3, 2);
  }
}

/** A room of `placeHouse` (door on -z) with glass in its windows. */
function room(ctx: ZoneMapContext, x0: number, z0: number, w: number, d: number, wallHeight: number, b: { wall: string; roof: string; trim: string }): void {
  const { world, block } = ctx;
  placeHouse(world, x0, z0, w, d, wallHeight, BASE, { wall: block(b.wall), roof: block(b.roof), trim: block(b.trim) });
  const y = BASE + 2;
  for (let x = x0; x < x0 + w; x++) for (let z = z0; z < z0 + d; z++) {
    const edge = x === x0 || x === x0 + w - 1 || z === z0 || z === z0 + d - 1;
    if (edge && world.get(x, y, z) === 0) world.set(x, y, z, block('glass'));
  }
  for (let x = x0 + 1; x < x0 + w - 1; x++) for (let z = z0 + 1; z < z0 + d - 1; z++) world.set(x, LEVEL, z, block('planks'));
}

await runIfMain(import.meta.url, generateThuVien);
