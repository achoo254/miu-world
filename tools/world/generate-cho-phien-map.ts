// Generates "Chợ phiên" (Toán topics 2 and 3) from a fixed seed, after the owner's market mocks
// (designs/cho-phien/): a country market on a brick square by a canal, rows of stalls under red, blue and
// yellow striped awnings piled with produce. West, the flower and vegetable market (chapter 1): flower,
// gourd, vegetable, fruit and bamboo stalls, the seedling greenhouse, the duck pond, the bamboo grove and
// the tug-of-war ground. East, the weighing row (chapter 2): the scale stalls, the drinks counter with its
// fish tank, the sweet-soup kitchen in the middle of the market and the goods store by the canal landing.
// Cottages with coloured roofs ring the square; a lamp-lit main road runs from the market gate to the canal
// and its dragon bridge. Output: assets/generated/world/cho-phien/{chunks.bin, entities.json}
import { PACK, runIfMain } from './map-kit';
import { placeHouse } from './structures/buildings';
import { placeCottage, placeStall } from './structures/countryside';
import { generateZoneMap, type Zone } from './zone-map';

export const MAP_ID = 'cho-phien';

export const ZONES: readonly Zone[] = [
  { chapter: 1, id: 'cho-rau-hoa', name: 'Chợ rau hoa', x: 72, z: 112, hx: 52, hz: 60, floor: 'path' },
  { chapter: 2, id: 'day-hang-can-dong', name: 'Dãy hàng cân đong', x: 190, z: 100, hx: 44, hz: 46, floor: 'path' },
];

const ROAD_X = 132;
const WATER_LEVEL = 10;
const CANAL = { z: 206, half: 5 };
const DUCK_POND = { x: 34, z: 156, r: 8 };

const F = PACK.food;
const N = PACK.nature;
const M = {
  flowerRed: `${N}/flower_redA.glb`,
  flowerYellow: `${N}/flower_yellowB.glb`,
  flowerPurple: `${N}/flower_purpleA.glb`,
  bamboo: `${N}/crops_bambooStageB.glb`,
  lily: `${N}/lily_large.glb`,
  canoe: `${N}/canoe.glb`,
  lamp: `${PACK.roads}/light-curved.glb`,
  barrel: `${PACK.survival}/barrel.glb`,
  crate: `${PACK.survival}/box-large.glb`,
  bucket: `${PACK.survival}/bucket.glb`,
  campfire: `${PACK.survival}/campfire-stand.glb`,
  scale: `${PACK.props}/balance-scale.glb`,
  basket: `${PACK.props}/basket.glb`,
  bench: `${PACK.box}/park-bench.glb`,
  pumpkinPile: `${N}/crop_pumpkin.glb`,
};
/** What each kind of stall piles on its counter. */
const GOODS: Record<string, readonly string[]> = {
  flowers: [M.flowerRed, M.flowerYellow, M.flowerPurple],
  vegetables: [`${F}/cabbage.glb`, `${F}/carrot.glb`, `${F}/broccoli.glb`, `${F}/eggplant.glb`, `${F}/radish.glb`],
  fruit: [`${F}/apple.glb`, `${F}/banana.glb`, `${F}/pear.glb`, `${F}/orange.glb`, `${F}/watermelon.glb`, `${F}/grapes.glb`],
  gourds: [`${F}/pumpkin.glb`, `${F}/corn.glb`, `${F}/tomato.glb`],
  drinks: [`${F}/soda-bottle.glb`, `${F}/can.glb`, `${F}/mug.glb`],
  kitchen: [`${F}/pot-stew.glb`, `${F}/bowl.glb`, `${F}/rice-ball.glb`],
  goods: [`${F}/bag.glb`, `${F}/bag-flat.glb`],
};
const GOODS_HEIGHT = 0.45;

export async function generateChoPhien() {
  const goodsModels = [...new Set(Object.values(GOODS).flat())];
  return generateZoneMap({
    mapId: MAP_ID,
    region: 'cho-phien',
    seedText: 'miu-cho-phien',
    zones: ZONES,
    spawn: { x: ROAD_X, z: 16, yaw: 0 },
    water: { level: WATER_LEVEL, covers: (x, z) => Math.abs(z - CANAL.z - 3 * Math.sin(x / 19)) < CANAL.half || Math.hypot(x - DUCK_POND.x, z - DUCK_POND.z) < DUCK_POND.r },
    pathsFromSpawn: false,
    routes: [
      // The main road from the market gate to the canal and over the dragon bridge; lanes into both rows.
      [[ROAD_X, 10], [ROAD_X, 244]],
      [[ROAD_X, 112], [20, 112]],
      [[ROAD_X, 100], [236, 100]],
      [[72, 52], [72, 172]],
      [[190, 54], [190, 146]],
    ],
    trees: {
      skip: 0.6,
      blocks: (roll, block) => ({ log: block('tree-log'), leaves: block(roll < 0.3 ? 'leaves-pink' : 'leaves') }),
    },
    models: {
      heights: {
        ...Object.fromEntries(goodsModels.map((m) => [m, GOODS_HEIGHT])),
        [`${F}/watermelon.glb`]: 0.55, [`${F}/pot-stew.glb`]: 0.7,
        [M.flowerRed]: 0.5, [M.flowerYellow]: 0.5, [M.flowerPurple]: 0.5, [M.bamboo]: 5, [M.lily]: 0.1, [M.canoe]: 0.6,
        [M.lamp]: 4.8, [M.barrel]: 1, [M.crate]: 0.9, [M.bucket]: 0.6, [M.campfire]: 1.1, [M.scale]: 0.8, [M.basket]: 0.6,
        [M.bench]: 0.96, [M.pumpkinPile]: 0.7,
      },
    },
    build: (ctx) => {
      const { world, block, ground, zone } = ctx;
      const [market, weighing] = [1, 2].map(zone) as [Zone, Zone];
      const awnings = [
        [block('wood-red'), block('snow')],
        [block('roof-blue'), block('snow')],
        [block('sand'), block('snow')],
      ];
      let stallN = 0;
      const stall = (x0: number, z0: number, kind: keyof typeof GOODS): void => {
        const { counter } = placeStall(world, x0, z0, 6, 4, ground + 1, { log: block('log'), planks: block('planks'), stripes: awnings[stallN++ % awnings.length] ?? [] });
        ctx.keepOut(x0 - 1, z0 - 2, x0 + 6, z0 + 4);
        const goods = GOODS[kind] ?? [];
        for (let i = 0; i < 4; i++) ctx.propAt(goods[(i + stallN) % goods.length] ?? '', [counter[0] - 1.5 + i, counter[1], counter[2]], (i * 53) % 360);
        ctx.prop(stallN % 2 === 0 ? M.crate : M.basket, x0 - 1, z0 + 2, stallN * 30);
      };

      // Chapter 1: two rows of stalls either side of the market lane, the greenhouse, the bamboo, the duck pond.
      const kinds: Array<keyof typeof GOODS> = ['flowers', 'vegetables', 'gourds', 'fruit'];
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 4; col++) {
          const x0 = market.x - 46 + col * 13 + (col >= 2 ? 6 : 0);
          const z0 = market.z - 44 + row * 30;
          stall(x0, z0, kinds[(row + col) % kinds.length] ?? 'fruit');
        }
      }
      ctx.landmark('day-sap-rau-hoa', 'Dãy sạp rau hoa', market.x, market.z - 30);
      const glass = { x0: market.x + 22, z0: market.z + 30 };
      placeHouse(world, glass.x0, glass.z0, 12, 8, 3, ground + 1, { wall: block('glass'), roof: block('glass'), trim: block('birch-log') });
      ctx.keepOut(glass.x0 - 1, glass.z0 - 3, glass.x0 + 12, glass.z0 + 8);
      ctx.landmark('nha-kinh-cay-giong', 'Nhà kính bán cây giống', glass.x0 + 6, glass.z0 - 2);
      for (let i = 0; i < 12; i++) ctx.prop(M.bamboo, market.x - 48 + (i % 4) * 2, market.z + 40 + Math.floor(i / 4) * 2, i * 50);
      ctx.landmark('hang-tre-nua', 'Hàng tre nứa', market.x - 45, market.z + 42);
      for (let i = 0; i < 6; i++) ctx.propAt(M.lily, [DUCK_POND.x + Math.cos(i) * 4 + 0.5, WATER_LEVEL + 1.02, DUCK_POND.z + Math.sin(i) * 4 + 0.5], i * 60);
      ctx.landmark('ao-vit', 'Ao vịt', DUCK_POND.x, DUCK_POND.z);

      // Chapter 2: the scale stalls, the drinks counter, the sweet-soup kitchen, the goods store by the canal.
      for (let col = 0; col < 3; col++) stall(weighing.x - 36 + col * 13, weighing.z - 36, 'fruit');
      for (const [i, dx] of [-30, -17, -4].entries()) ctx.prop(M.scale, weighing.x + dx, weighing.z - 30, i * 20);
      ctx.landmark('quay-can', 'Quầy cân', weighing.x - 17, weighing.z - 34);
      stall(weighing.x + 10, weighing.z - 36, 'drinks');
      stall(weighing.x + 23, weighing.z - 36, 'drinks');
      for (let i = 0; i < 4; i++) ctx.prop(M.bucket, weighing.x + 12 + i * 3, weighing.z - 29, i * 40);
      ctx.landmark('quay-nuoc', 'Quầy nước', weighing.x + 18, weighing.z - 34);
      const kitchen = { x: weighing.x - 10, z: weighing.z + 4 };
      stall(kitchen.x - 3, kitchen.z, 'kitchen');
      ctx.prop(M.campfire, kitchen.x, kitchen.z + 6, 0);
      for (let i = 0; i < 3; i++) ctx.prop(M.bench, kitchen.x - 6 + i * 6, kitchen.z + 10, 0);
      ctx.landmark('bep-che', 'Bếp chè giữa chợ', kitchen.x, kitchen.z + 2);
      const store = { x0: weighing.x + 10, z0: weighing.z + 18 };
      placeHouse(world, store.x0, store.z0, 16, 10, 4, ground + 1, { wall: block('planks'), roof: block('brick-grey'), trim: block('log') });
      ctx.keepOut(store.x0 - 1, store.z0 - 4, store.x0 + 16, store.z0 + 10);
      for (let i = 0; i < 6; i++) ctx.prop(i % 2 ? M.crate : M.barrel, store.x0 + 1 + i * 2, store.z0 - 2, i * 25);
      ctx.landmark('kho-hang', 'Kho hàng', store.x0 + 8, store.z0 - 2);

      // The canal: boats at the landing below the store; lamps along the main road.
      for (const dx of [-14, 8, 30]) ctx.propAt(M.canoe, [ROAD_X + dx + 0.5, WATER_LEVEL + 0.9, CANAL.z + 0.5], 90);
      ctx.landmark('ben-hang-ben-kenh', 'Bến hàng bên kênh', ROAD_X + 20, CANAL.z - 7);
      ctx.landmark('cau-rong', 'Cầu rồng qua kênh', ROAD_X, CANAL.z);
      for (let z = 22; z < 240; z += 16) for (const dx of [-3, 3]) if (!ctx.inWater(ROAD_X + dx, z)) ctx.prop(M.lamp, ROAD_X + dx, z, dx < 0 ? 90 : 270);
      ctx.landmark('cong-cho', 'Cổng chợ', ROAD_X, 18);

      // Cottages with coloured roofs round the square and along the canal's far bank.
      const tiles = { walls: [block('sand'), block('birch-log'), block('planks')], roofs: [block('brick-red'), block('roof-blue'), block('wood-red')], trim: block('log') };
      let n = 0;
      const cottage = (x0: number, z0: number): void => {
        const f = placeCottage(world, x0, z0, n++, ground + 1, tiles);
        ctx.keepOut(f.x0, f.z0, f.x1, f.z1);
      };
      for (let x = 16; x < 236; x += 16) if (Math.abs(x + 6 - ROAD_X) > 12) cottage(x, 222);
      for (let x = 146; x < 236; x += 16) cottage(x, 160);
      for (let z = 30; z < 200; z += 18) if (!ctx.inZone(236, z, 4)) cottage(230, z);
    },
  });
}

await runIfMain(import.meta.url, generateChoPhien);
