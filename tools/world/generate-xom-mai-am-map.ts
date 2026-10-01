// Generates "Xóm Mái Ấm" (Tiếng Việt weeks 14–17, "Mái ấm gia đình") from a fixed seed: a cosy hamlet of
// tiled-roof houses with yards, porches, fences and gardens along a lane hedged with bamboo. South: the
// flower garden and Chíp's lane (chapter 1), the porches under the moon and the warm stone den at the foot
// of the hill (chapter 2). North, round a big lotus lake: the old hut on the shore and the slope up to
// grandpa's house (chapter 3), the lotus lake's far bank and the windy field of maize and carrots (chapter 4).
// Output: assets/generated/world/xom-mai-am/{regions/, horizon.bin, entities.json}
import { PACK, runIfMain } from './map-kit';
import { placeHouse } from './structures/buildings';
import { generateZoneMap, type Zone } from './zone-map';

export const MAP_ID = 'xom-mai-am';

export const ZONES: readonly Zone[] = [
  { chapter: 1, id: 'vuon-hoa-ngo-nho', name: 'Vườn hoa và ngõ nhà Mẩy', x: 66, z: 58, hx: 30, hz: 24 },
  { chapter: 2, id: 'hien-nha-hang-da', name: 'Hiên nhà đêm trăng và hang đá', x: 184, z: 58, hx: 30, hz: 24 },
  { chapter: 3, id: 'choi-cu-con-doc', name: 'Chòi cũ bên bờ hồ và con dốc nhà ông', x: 62, z: 196, hx: 30, hz: 26 },
  { chapter: 4, id: 'ho-sen-canh-dong-gio', name: 'Hồ sen và cánh đồng gió', x: 196, z: 198, hx: 30, hz: 26 },
];

const LANE = 120;
const WATER_LEVEL = 10;
/** The lotus lake between the two northern zones. */
const LAKE = { x: 130, z: 200, rx: 24, rz: 30 };
/** The hill west of the slope (grandpa's house on top) and the one east of the den. */
const GRANDPA_HILL = { x: 14, z: 214, r: 26, rise: 7 };
const DEN_HILL = { x: 244, z: 58, r: 26, rise: 8 };

const M = {
  bamboo: `${PACK.nature}/crops_bambooStageB.glb`,
  palm: `${PACK.nature}/tree_palmTall.glb`,
  banana: `${PACK.nature}/tree_palmShort.glb`,
  fruitTree: `${PACK.nature}/tree_oak.glb`,
  flowerRed: `${PACK.nature}/flower_redA.glb`,
  flowerYellow: `${PACK.nature}/flower_yellowB.glb`,
  flowerPurple: `${PACK.nature}/flower_purpleA.glb`,
  bush: `${PACK.nature}/plant_bushLarge.glb`,
  fence: `${PACK.nature}/fence_simple.glb`,
  lily: `${PACK.nature}/lily_large.glb`,
  lilySmall: `${PACK.nature}/lily_small.glb`,
  canoe: `${PACK.nature}/canoe.glb`,
  corn: `${PACK.nature}/crops_cornStageD.glb`,
  carrot: `${PACK.nature}/crop_carrot.glb`,
  dirtRow: `${PACK.nature}/crops_dirtRow.glb`,
  rock: `${PACK.nature}/rock_largeB.glb`,
  rockTall: `${PACK.nature}/rock_tallC.glb`,
  hay: `${PACK.survival}/box-large.glb`,
  barrel: `${PACK.survival}/barrel.glb`,
  bucket: `${PACK.survival}/bucket.glb`,
  bench: `${PACK.box}/park-bench.glb`,
  table: `${PACK.furniture}/table.glb`,
};

const hill = (h: { x: number; z: number; r: number; rise: number }, x: number, z: number): number => {
  const d = Math.hypot(x - h.x, z - h.z) / h.r;
  return d >= 1 ? 0 : h.rise * (1 - d * d);
};

export async function generateXomMaiAm() {
  return generateZoneMap({
    mapId: MAP_ID,
    region: 'xom-mai-am',
    seedText: 'miu-xom-mai-am',
    size: 256,
    zones: ZONES,
    spawn: { x: 128, z: LANE - 4, yaw: 0 },
    water: { level: WATER_LEVEL, covers: (x, z) => ((x - LAKE.x) / LAKE.rx) ** 2 + ((z - LAKE.z) / LAKE.rz) ** 2 < 1 },
    shape: (x, z, h) => h + hill(GRANDPA_HILL, x, z) + hill(DEN_HILL, x, z),
    pathsFromSpawn: false,
    routes: [
      [[12, LANE], [244, LANE]],
      ...ZONES.map((zn): Array<[number, number]> => [[zn.x, LANE], [zn.x, zn.z]]),
      // Up the slope to grandpa's house, and round the lake's south shore.
      [[ZONES[2]?.x ?? 62, 196], [24, 212]],
      [[100, 168], [160, 168]],
    ],
    trees: {
      skip: 0.7,
      blocks: (roll, block) => ({ log: block('tree-log'), leaves: block(roll < 0.25 ? 'leaves-pink' : 'leaves') }),
    },
    models: {
      heights: {
        [M.bamboo]: 5, [M.palm]: 7, [M.banana]: 3.2, [M.fruitTree]: 5, [M.flowerRed]: 0.5, [M.flowerYellow]: 0.5, [M.flowerPurple]: 0.5,
        [M.bush]: 1.2, [M.fence]: 1, [M.lily]: 0.1, [M.lilySmall]: 0.08, [M.canoe]: 0.6, [M.corn]: 1.6, [M.carrot]: 0.45, [M.dirtRow]: 0.25,
        [M.rock]: 2.2, [M.rockTall]: 3.2, [M.hay]: 0.9, [M.barrel]: 1, [M.bucket]: 0.6, [M.bench]: 0.96, [M.table]: 0.8,
      },
    },
    build: (ctx) => {
      const { world, block, ground, zone } = ctx;
      const [garden, porch, shore, field] = [1, 2, 3, 4].map(zone) as [Zone, Zone, Zone, Zone];
      const tiles = { wall: block('sand'), roof: block('brick-red'), trim: block('log') };

      // Houses along both sides of the lane, doors on the lane, each with a yard fence, a fruit tree and a
      // bamboo hedge behind; the ones south of the lane turn their backs to it, so they stand north of it.
      let n = 0;
      const house = (x0: number, z0: number): void => {
        const w = 9 + (n % 3) * 2;
        placeHouse(world, x0, z0, w, 7, 3 + (n % 2), ground + 1, n % 4 === 3 ? { ...tiles, wall: block('planks') } : tiles);
        ctx.keepOut(x0 - 1, z0 - 4, x0 + w, z0 + 7);
        for (let i = 0; i < w; i += 2) ctx.prop(M.bamboo, x0 + i, z0 + 9, (i * 61) % 360);
        for (const x of [x0 - 1, x0 + w]) ctx.prop(M.fence, x, z0 - 2, 90);
        ctx.prop(n % 3 === 0 ? M.fruitTree : n % 3 === 1 ? M.palm : M.banana, x0 + w + 2, z0 + 2, n * 47);
        if (n % 2 === 0) ctx.prop(M.bucket, x0 + 1, z0 - 1, 0);
        n++;
      };
      for (let x = 14; x < 240; x += 16) {
        if (Math.abs(x + 6 - 128) < 10 || ZONES.some((zn) => Math.abs(x + 6 - zn.x) < 6)) continue;
        house(x, LANE + 4);
      }

      // Chapter 1: the flower garden, the bamboo at the lane's mouth, the straw nest by the fence.
      const flowers = [M.flowerRed, M.flowerYellow, M.flowerPurple];
      for (let i = 0; i < 36; i++) ctx.prop(flowers[i % 3] ?? M.flowerRed, garden.x - 20 + (i % 9) * 3, garden.z - 16 + Math.floor(i / 9) * 3, i * 31);
      for (let i = 0; i < 6; i++) ctx.prop(M.bamboo, garden.x + 18 + (i % 3) * 2, garden.z + 14 + Math.floor(i / 3) * 2, i * 50);
      ctx.prop(M.hay, garden.x + 10, garden.z - 14, 15);
      ctx.prop(M.bench, garden.x - 4, garden.z + 12, 180);
      ctx.landmark('vuon-hoa', 'Vườn hoa', garden.x - 8, garden.z - 12);

      // Chapter 2: two porches facing a yard under the moon, a bamboo bed and a table; the den in the hill.
      for (const dx of [-22, 6]) {
        placeHouse(world, porch.x + dx, porch.z + 8, 13, 8, 4, ground + 1, tiles);
        ctx.keepOut(porch.x + dx - 1, porch.z + 5, porch.x + dx + 13, porch.z + 16);
        ctx.prop(M.bench, porch.x + dx + 3, porch.z + 5, 0);
      }
      ctx.prop(M.table, porch.x - 2, porch.z - 4, 0);
      ctx.landmark('hien-nha', 'Hiên nhà', porch.x, porch.z + 6);
      const den = { x: porch.x + 26, z: porch.z - 10 };
      for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) for (let y = ground + 1; y <= ground + 5; y++) {
        const edge = Math.max(Math.abs(dx), Math.abs(dz)) === 3;
        const door = dx < -1 && Math.abs(dz) <= 1 && y <= ground + 3;
        if ((edge || y === ground + 5) && !door) world.set(den.x + dx, y, den.z + dz, block('rock-moss'));
      }
      ctx.keepOut(den.x - 3, den.z - 3, den.x + 3, den.z + 3);
      for (const [dx, dz] of [[-6, -5], [-7, 4]] as const) ctx.prop(M.rock, den.x + dx, den.z + dz, dx * 20);
      ctx.landmark('hang-da', 'Hang đá', den.x, den.z);

      // Chapter 3: the old hut on the lake shore with a boat, and the slope up to grandpa's house.
      const hutX = Math.round(LAKE.x - LAKE.rx - 6);
      placeHouse(world, hutX - 4, shore.z - 6, 8, 6, 3, ground + 1, { wall: block('planks'), roof: block('wood-red'), trim: block('log') });
      ctx.keepOut(hutX - 5, shore.z - 9, hutX + 4, shore.z);
      ctx.propAt(M.canoe, [LAKE.x - LAKE.rx + 3.5, WATER_LEVEL + 0.9, shore.z + 0.5], 0);
      ctx.landmark('choi-cu', 'Chòi cũ bên bờ', hutX, shore.z - 3);
      const top = { x: GRANDPA_HILL.x + 2, z: GRANDPA_HILL.z };
      placeHouse(world, top.x - 5, top.z - 4, 11, 8, 3, ctx.surface(top.x, top.z) + 1, tiles);
      ctx.keepOut(top.x - 6, top.z - 7, top.x + 6, top.z + 4);
      ctx.landmark('nha-ong', 'Nhà ông', top.x, top.z, ctx.surface(top.x, top.z) + 1);

      // Chapter 4: lotus over the lake, the windy field of maize and carrots, a boat at the far landing.
      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * Math.PI * 2;
        const r = 0.35 + 0.5 * (((i * 7) % 5) / 5);
        ctx.propAt(i % 3 === 0 ? M.lilySmall : M.lily, [LAKE.x + Math.cos(a) * LAKE.rx * r + 0.5, WATER_LEVEL + 1.02, LAKE.z + Math.sin(a) * LAKE.rz * r + 0.5], i * 50);
      }
      ctx.landmark('ho-sen', 'Hồ sen', LAKE.x, LAKE.z);
      const maize = { x0: field.x + 4, z0: field.z - 22, x1: field.x + 26, z1: field.z - 6 };
      for (let x = maize.x0; x <= maize.x1; x += 2) for (let z = maize.z0; z <= maize.z1; z += 2) ctx.prop(M.corn, x, z, (x * 17 + z) % 360);
      ctx.keepOut(maize.x0, maize.z0, maize.x1, maize.z1);
      for (let i = 0; i < 8; i++) {
        ctx.prop(M.dirtRow, field.x - 24 + i, field.z + 16, 0);
        ctx.prop(M.carrot, field.x - 24 + i, field.z + 16, i * 40);
      }
      ctx.keepOut(field.x - 24, field.z + 16, field.x - 17, field.z + 16);
      ctx.landmark('canh-dong-gio', 'Cánh đồng gió', maize.x0 + 11, maize.z0 + 8);

      // Bamboo hedges round the hamlet.
      for (let x = 12; x < 244; x += 3) for (const z of [11, 245]) ctx.prop(M.bamboo, x, z, (x * 37) % 360);
    },
  });
}

await runIfMain(import.meta.url, generateXomMaiAm);
