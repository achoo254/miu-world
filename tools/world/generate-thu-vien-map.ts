// Generates "Thư viện" (Tiếng Việt weeks 8–9, Toán topic 6) from a fixed seed: a big library in a garden.
// Chapter 1, the reading rooms: the library hall full of bookcases, reading tables and a reading corner
// (after the mock's library room, designs/truong-hoc/v2-a-12-thu-vien-trong-truong.png) and the reading
// garden with its flat stone by a little stream. Chapter 2, the golden-leaf festival yard in front of the
// doors: golden trees, a leaf stage, a round pool and the contest stations. Chapter 3, the clock tower
// beside the library with the calendar room. Cottages with coloured roofs and lamp-lit streets round it.
// Output: assets/generated/world/thu-vien/{regions/, horizon.bin, entities.json}
import { PACK, runIfMain } from './map-kit';
import { placeHouse } from './structures/buildings';
import { placeCottage, placeFountain } from './structures/countryside';
import { generateZoneMap, type Zone } from './zone-map';

export const MAP_ID = 'thu-vien';

export const ZONES: readonly Zone[] = [
  { chapter: 1, id: 'phong-doc', name: 'Phòng đọc', x: 74, z: 150, hx: 46, hz: 40 },
  { chapter: 2, id: 'san-le-hoi-la-vang', name: 'Sân lễ hội lá vàng', x: 128, z: 66, hx: 52, hz: 30, floor: 'path' },
  { chapter: 3, id: 'thap-dong-ho', name: 'Tháp đồng hồ và phòng lịch', x: 190, z: 156, hx: 40, hz: 40 },
];

const WATER_LEVEL = 10;
const STREAM_X = (z: number): number => 30 + 4 * Math.sin(z / 13);
const F = PACK.furniture;
const M = {
  bookcase: `${F}/bookcaseOpen.glb`,
  bookcaseLow: `${F}/bookcaseOpenLow.glb`,
  table: `${F}/table.glb`,
  chair: `${F}/chair.glb`,
  rug: `${F}/rugRectangle.glb`,
  pillow: `${F}/pillow.glb`,
  plant: `${F}/pottedPlant.glb`,
  lamp: `${PACK.roads}/light-curved.glb`,
  books: `${PACK.props}/books.glb`,
  clock: `${PACK.props}/clock-face.glb`,
  calendar: `${PACK.props}/calendar.glb`,
  rock: `${PACK.nature}/rock_largeA.glb`,
  autumnTree: `${PACK.nature}/tree_oak_fall.glb`,
  bench: `${PACK.box}/park-bench.glb`,
  statue: `${PACK.nature}/statue_obelisk.glb`,
  flowerYellow: `${PACK.nature}/flower_yellowB.glb`,
};
const CENTRED = [M.bookcase, M.bookcaseLow, M.table, M.chair, M.rug, M.pillow, M.plant];

export async function generateThuVien() {
  return generateZoneMap({
    mapId: MAP_ID,
    region: 'thu-vien',
    seedText: 'miu-thu-vien',
    size: 256,
    zones: ZONES,
    spawn: { x: 128, z: 18, yaw: 0 },
    water: { level: WATER_LEVEL, covers: (x, z) => z > 110 && z < 200 && Math.abs(x - STREAM_X(z)) < 2.5 },
    pathsFromSpawn: false,
    routes: [
      [[128, 12], [128, 112]],
      [[30, 112], [226, 112]],
      [[74, 112], [74, 150]],
      [[190, 112], [190, 156]],
    ],
    trees: {
      skip: 0.55,
      blocks: (roll, block) => ({ log: block('tree-log'), leaves: block(roll < 0.4 ? 'leaves-autumn' : roll < 0.55 ? 'leaves-pink' : 'leaves') }),
    },
    models: {
      heights: {
        [M.bookcase]: 2.4, [M.bookcaseLow]: 1.2, [M.table]: 0.8, [M.chair]: 1, [M.rug]: 0.05, [M.pillow]: 0.35, [M.plant]: 1.3, [M.lamp]: 4.8,
        [M.books]: 0.6, [M.clock]: 3, [M.calendar]: 1, [M.rock]: 1.4, [M.autumnTree]: 6, [M.bench]: 0.96, [M.statue]: 3, [M.flowerYellow]: 0.5,
      },
      centred: CENTRED,
    },
    build: (ctx) => {
      const { world, block, ground, zone } = ctx;
      const [reading, festival, tower] = [1, 2, 3].map(zone) as [Zone, Zone, Zone];

      // Chapter 1: the library hall, its door on the street, bookcases along the walls, tables in rows.
      const hall = { x0: reading.x - 16, z0: reading.z - 14, w: 40, d: 22 };
      placeHouse(world, hall.x0, hall.z0, hall.w, hall.d, 6, ground + 1, { wall: block('sand'), roof: block('roof-blue'), trim: block('birch-log') });
      for (let x = hall.x0 + 2; x < hall.x0 + hall.w - 2; x += 3) ctx.centred(M.bookcase, x + 0.5, hall.z0 + hall.d - 2, 180);
      for (let z = hall.z0 + 3; z < hall.z0 + hall.d - 3; z += 3) ctx.centred(M.bookcase, hall.x0 + 1.5, z + 0.5, 90);
      for (let row = 0; row < 2; row++) for (let col = 0; col < 4; col++) {
        const x = hall.x0 + 8 + col * 7;
        const z = hall.z0 + 6 + row * 6;
        ctx.centred(M.table, x + 0.5, z + 0.5, 0);
        for (const dz of [-1, 1]) ctx.centred(M.chair, x + 0.5, z + dz + 0.5, dz < 0 ? 0 : 180);
        ctx.propAt(M.books, [x + 0.5, ground + 1.8, z + 0.5], col * 40);
      }
      ctx.centred(M.rug, hall.x0 + hall.w - 6, hall.z0 + 6, 0);
      for (let i = 0; i < 4; i++) ctx.centred(M.pillow, hall.x0 + hall.w - 8 + i, hall.z0 + 7, i * 30);
      ctx.landmark('phong-doc', 'Phòng đọc', hall.x0 + hall.w / 2, hall.z0 + 2);
      // The reading garden west of the hall: flat stones by the stream, benches.
      for (const [dx, dz] of [[-28, 4], [-32, -10], [-26, 18]] as const) ctx.prop(M.rock, reading.x + dx, reading.z + dz, dx * 10);
      for (let i = 0; i < 3; i++) ctx.prop(M.bench, reading.x - 22, reading.z - 18 + i * 12, 90);
      ctx.landmark('vuon-doc-sach', 'Vườn đọc sách', reading.x - 28, reading.z);

      // Chapter 2: the festival yard: golden trees round it, a round pool in the middle, the leaf stage.
      const pool = placeFountain(world, festival.x, festival.z, ground, { stone: block('brick-grey'), water: block('water') });
      ctx.propAt(M.statue, pool.plinth, 0);
      ctx.keepOut(festival.x - 5, festival.z - 5, festival.x + 5, festival.z + 5);
      ctx.landmark('be-nuoc-tron', 'Bể nước tròn', festival.x, festival.z);
      for (let i = 0; i < 10; i++) ctx.prop(M.autumnTree, festival.x - 46 + i * 10, festival.z + (i % 2 ? 24 : -24), i * 36);
      const stage = { x0: festival.x + 24, z0: festival.z - 6 };
      for (let x = stage.x0; x < stage.x0 + 14; x++) for (let z = stage.z0; z < stage.z0 + 10; z++) world.set(x, ground + 1, z, block('planks'));
      ctx.keepOut(stage.x0, stage.z0, stage.x0 + 13, stage.z0 + 9);
      for (let i = 0; i < 12; i++) ctx.prop(M.flowerYellow, festival.x - 40 + i * 4, festival.z + 16, i * 30);
      ctx.landmark('san-khau-la-vang', 'Sân khấu lá vàng', stage.x0 + 7, stage.z0 + 5);

      // Chapter 3: the clock tower: a tall square tower of brick with a clock face on each side.
      const t = { x: tower.x, z: tower.z - 8 };
      for (let y = ground + 1; y <= ground + 22; y++) for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) {
        const edge = Math.max(Math.abs(dx), Math.abs(dz)) === 4;
        const door = dz === -4 && Math.abs(dx) <= 1 && y <= ground + 3;
        const window = edge && (y - ground) % 5 === 3 && (dx === 0 || dz === 0);
        if (edge && !door && !window) world.set(t.x + dx, y, t.z + dz, Math.abs(dx) === 4 && Math.abs(dz) === 4 ? block('brick-grey') : block('brick-red'));
      }
      for (let k = 0; k <= 4; k++) for (let dx = -5 + k; dx <= 5 - k; dx++) for (let dz = -5 + k; dz <= 5 - k; dz++) world.set(t.x + dx, ground + 23 + k, t.z + dz, block('roof-blue'));
      ctx.propAt(M.clock, [t.x + 0.5, ground + 19, t.z - 4.6], 180);
      ctx.keepOut(t.x - 5, t.z - 6, t.x + 5, t.z + 5);
      ctx.landmark('thap-dong-ho', 'Tháp đồng hồ', t.x, t.z - 6);
      const room = { x0: tower.x + 12, z0: tower.z + 8 };
      placeHouse(world, room.x0, room.z0, 12, 9, 4, ground + 1, { wall: block('birch-log'), roof: block('brick-red'), trim: block('log') });
      ctx.keepOut(room.x0 - 1, room.z0 - 3, room.x0 + 12, room.z0 + 9);
      for (let i = 0; i < 3; i++) ctx.prop(M.calendar, room.x0 + 2 + i * 4, room.z0 - 2, 0);
      ctx.landmark('phong-lich', 'Phòng lịch', room.x0 + 6, room.z0 - 2);

      // Lamps along the streets; cottages round the square.
      for (let x = 36; x < 226; x += 16) ctx.prop(M.lamp, x, 108, 0);
      for (let z = 20; z < 108; z += 16) ctx.prop(M.lamp, 124, z, 90);
      const tiles = { walls: [block('sand'), block('birch-log'), block('planks')], roofs: [block('brick-red'), block('roof-blue'), block('wood-red')], trim: block('log') };
      let n = 0;
      for (const [x, z] of [[20, 20], [40, 22], [196, 20], [216, 22], [20, 216], [44, 220], [120, 214], [150, 220]] as const) {
        const f = placeCottage(world, x, z, n++, ground + 1, tiles);
        ctx.keepOut(f.x0, f.z0, f.x1, f.z1);
      }
    },
  });
}

await runIfMain(import.meta.url, generateThuVien);
