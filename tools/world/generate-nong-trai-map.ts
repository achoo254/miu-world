// Generates "Nông trại" (Toán topic 4) from a fixed seed, after the owner's farm mocks (designs/nong-trai/):
// one big farmyard (chapter 1) with the red barn and the farmhouse, the wooden windmill, fenced plots of
// vegetables, maize and pumpkins, the granary, the tool workshop, the hen house and the pigsty, the fish
// pond with its little bridge, the orchard, the drying yard and the cart track where the produce carts
// wait. Cows graze in the paddock; pink blossom trees and hedges round the fields.
// Output: assets/generated/world/nong-trai/{regions/, horizon.bin, entities.json}
import { PACK, runIfMain } from './map-kit';
import { placeHouse } from './structures/buildings';
import { placeCottage, placeWindmill } from './structures/countryside';
import { generateZoneMap, type Zone } from './zone-map';

export const MAP_ID = 'nong-trai';

export const ZONES: readonly Zone[] = [{ chapter: 1, id: 'nong-trai', name: 'Nông trại', x: 128, z: 120, hx: 78, hz: 70 }];

const WATER_LEVEL = 10;
const POND = { x: 70, z: 170, r: 11 };
/** Fenced plots (inclusive) and what grows in each; the targets stay out of them. */
const PLOTS: ReadonlyArray<{ x0: number; z0: number; x1: number; z1: number; crop: string }> = [
  { x0: 150, z0: 62, x1: 176, z1: 82, crop: 'crops_cornStageD' },
  { x0: 184, z0: 62, x1: 202, z1: 82, crop: 'crop_pumpkin' },
  { x0: 150, z0: 92, x1: 170, z1: 106, crop: 'crop_carrot' },
  { x0: 178, z0: 92, x1: 202, z1: 106, crop: 'crops_leafsStageB' },
  { x0: 62, z0: 62, x1: 88, z1: 78, crop: 'crops_wheatStageB' },
];

const N = PACK.nature;
const M = {
  fence: `${N}/fence_simple.glb`,
  fruitTree: `${N}/tree_fat.glb`,
  bush: `${N}/plant_bushLarge.glb`,
  hay: `${PACK.survival}/box-large.glb`,
  barrel: `${PACK.survival}/barrel.glb`,
  bucket: `${PACK.survival}/bucket.glb`,
  workbench: `${PACK.survival}/workbench.glb`,
  anvil: `${PACK.survival}/workbench-anvil.glb`,
  cart: `${PACK.props}/railway-red.glb`,
  cartBlue: `${PACK.props}/railway-blue.glb`,
  cartYellow: `${PACK.props}/railway-yellow.glb`,
  lily: `${N}/lily_large.glb`,
  logs: `${N}/log_stack.glb`,
};
const CROPS = [...new Set(PLOTS.map((p) => `${N}/${p.crop}.glb`))];

export async function generateNongTrai() {
  return generateZoneMap({
    mapId: MAP_ID,
    region: 'nong-trai',
    seedText: 'miu-nong-trai',
    size: 256,
    zones: ZONES,
    spawn: { x: 128, z: 30, yaw: 0 },
    water: { level: WATER_LEVEL, covers: (x, z) => Math.hypot(x - POND.x, z - POND.z) < POND.r },
    pathsFromSpawn: false,
    routes: [
      // The farm road from the gate, the cart track round the fields, a path to the pond and the orchard.
      [[128, 24], [128, 186]],
      [[56, 120], [210, 120]],
      [[60, 140], [60, 186]],
      [[146, 56], [146, 112]],
    ],
    trees: {
      skip: 0.55,
      blocks: (roll, block) => ({ log: block('tree-log'), leaves: block(roll < 0.35 ? 'leaves-pink' : 'leaves') }),
    },
    models: {
      heights: {
        ...Object.fromEntries(CROPS.map((m) => [m, m.includes('corn') ? 1.6 : m.includes('wheat') ? 1 : 0.6])),
        [M.fence]: 1, [M.fruitTree]: 4.5, [M.bush]: 1.2, [M.hay]: 0.9, [M.barrel]: 1, [M.bucket]: 0.6, [M.workbench]: 0.9,
        [M.anvil]: 0.9, [M.cart]: 1.2, [M.cartBlue]: 1.2, [M.cartYellow]: 1.2, [M.lily]: 0.1, [M.logs]: 0.9,
      },
    },
    build: (ctx) => {
      const { world, block, ground, zone } = ctx;
      const farm = zone(1);
      const barnBlocks = { wall: block('wood-red'), roof: block('brick-grey'), trim: block('snow') };

      // Fenced plots of crops in rows.
      for (const p of PLOTS) {
        for (let x = p.x0 + 1; x < p.x1; x += 2) for (let z = p.z0 + 1; z < p.z1; z += 2) ctx.prop(`${N}/${p.crop}.glb`, x, z, (x * 31 + z * 7) % 360);
        for (let x = p.x0; x <= p.x1; x += 2) for (const z of [p.z0, p.z1]) ctx.prop(M.fence, x, z, 0);
        for (let z = p.z0 + 2; z < p.z1; z += 2) for (const x of [p.x0, p.x1]) ctx.prop(M.fence, x, z, 90);
        ctx.keepOut(p.x0, p.z0, p.x1, p.z1);
      }
      ctx.landmark('ruong-rau', 'Ruộng rau', 176, 84);
      ctx.landmark('ruong-ngo', 'Ruộng ngô', 163, 72);

      // The red barn (cows in the paddock beside it), the farmhouse, the granary, the workshop.
      placeHouse(world, 92, 132, 18, 12, 5, ground + 1, barnBlocks);
      ctx.keepOut(91, 129, 110, 144);
      ctx.landmark('chuong-bo', 'Chuồng bò', 101, 130);
      const tiles = { walls: [block('sand')], roofs: [block('brick-red')], trim: block('log') };
      const house = placeCottage(world, 150, 140, 2, ground + 1, tiles);
      ctx.keepOut(house.x0, house.z0, house.x1, house.z1);
      ctx.landmark('nha-nong-trai', 'Nhà nông trại', 156, 138);
      placeHouse(world, 176, 136, 14, 10, 6, ground + 1, { wall: block('planks'), roof: block('wood-red'), trim: block('log') });
      ctx.keepOut(175, 133, 190, 146);
      for (let i = 0; i < 5; i++) ctx.prop(M.hay, 176 + i * 3, 131, i * 20);
      ctx.landmark('kho-thoc', 'Kho thóc', 183, 134);
      placeHouse(world, 186, 160, 12, 8, 4, ground + 1, { wall: block('brick-grey'), roof: block('roof-blue'), trim: block('log') });
      ctx.keepOut(185, 157, 198, 168);
      ctx.prop(M.workbench, 188, 156, 0);
      ctx.prop(M.anvil, 193, 156, 0);
      ctx.landmark('xuong-nong-cu', 'Xưởng nông cụ', 192, 158);

      // The windmill on the knoll by the fields.
      const mill = { x: 118, z: 76 };
      placeWindmill(world, mill.x, mill.z, ground + 1, { planks: block('planks'), log: block('log'), roof: block('brick-red'), sail: block('snow') });
      ctx.keepOut(mill.x - 4, mill.z - 9, mill.x + 4, mill.z + 4);
      ctx.landmark('coi-xay-gio', 'Cối xay gió', mill.x, mill.z);

      // Hen house and pigsty: small huts with fenced runs.
      for (const [x0, z0, id, name] of [[66, 96, 'chuong-ga', 'Chuồng gà'], [88, 96, 'chuong-lon', 'Chuồng lợn']] as const) {
        placeHouse(world, x0, z0, 8, 6, 3, ground + 1, { wall: block('planks'), roof: block('wood-red'), trim: block('log') });
        ctx.keepOut(x0 - 1, z0 - 7, x0 + 8, z0 + 6);
        for (let x = x0; x <= x0 + 8; x += 2) ctx.prop(M.fence, x, z0 - 6, 0);
        ctx.prop(M.bucket, x0 + 2, z0 - 3, 0);
        ctx.landmark(id, name, x0 + 4, z0 - 3);
      }

      // The fish pond, the orchard and the drying yard; produce carts waiting on the track.
      for (let i = 0; i < 8; i++) ctx.propAt(M.lily, [POND.x + Math.cos(i * 0.8) * 6 + 0.5, WATER_LEVEL + 1.02, POND.z + Math.sin(i * 0.8) * 6 + 0.5], i * 45);
      ctx.landmark('ao-ca', 'Ao cá', POND.x, POND.z);
      for (let i = 0; i < 9; i++) ctx.prop(M.fruitTree, 150 + (i % 3) * 8, 166 + Math.floor(i / 3) * 7, i * 40);
      ctx.keepOut(147, 163, 169, 183);
      ctx.landmark('vuon-cay', 'Vườn cây ăn quả', 158, 172);
      for (let x = 100; x <= 116; x++) for (let z = 156; z <= 168; z++) if ((x + z) % 2 === 0) world.set(x, ground, z, block('sand'));
      ctx.landmark('san-phoi', 'Sân phơi', 108, 162);
      for (const [i, model] of [M.cart, M.cartBlue, M.cartYellow].entries()) ctx.prop(model, 120 - i * 4, 124, 90);
      ctx.landmark('bai-xe-keo', 'Bãi xe kéo', 116, 124);
      ctx.landmark('cong-nong-trai', 'Cổng nông trại', 128, 36);
      for (const dx of [-4, 4]) ctx.prop(M.logs, 128 + dx, 44, 0);

      // Hedges round the fields' outer edge.
      for (let x = farm.x - farm.hx; x <= farm.x + farm.hx; x += 4) for (const z of [farm.z - farm.hz - 3, farm.z + farm.hz + 3]) if (Math.abs(x - 128) > 4) ctx.prop(M.bush, x, z, x * 7);
    },
  });
}

await runIfMain(import.meta.url, generateNongTrai);
