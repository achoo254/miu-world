// Generates "Làng Ven Sông" (Tiếng Việt weeks 1–4) from a fixed seed: a village either side of a wide river
// crossed by bamboo bridges. South bank: the village gate under the banyan with the small village school and
// the rice fields (chapter 1), the meadow by the river with the flower garden and its beehives (chapter 2).
// North bank: the landing with its boats and the class under the banyan (chapter 3), the lotus marsh and the
// village football field (chapter 4). Tiled-roof houses line the lanes, bamboo hedges and trees fill the rest.
// Output: assets/generated/world/lang-ven-song/{regions/, horizon.bin, entities.json}
import { PACK, runIfMain } from './map-kit';
import { placeHouse } from './structures/buildings';
import { placeAncientTree } from './structures/tree';
import { generateZoneMap, type Zone } from './zone-map';

export const MAP_ID = 'lang-ven-song';

export const ZONES: readonly Zone[] = [
  { chapter: 1, id: 'dau-lang', name: 'Đầu làng', x: 62, z: 56, hx: 28, hz: 24 },
  { chapter: 2, id: 'bai-co-ven-song', name: 'Bãi cỏ ven sông', x: 192, z: 58, hx: 30, hz: 24 },
  { chapter: 3, id: 'ben-song', name: 'Bến sông', x: 66, z: 202, hx: 30, hz: 24 },
  { chapter: 4, id: 'dam-sen', name: 'Đầm sen và sân bóng', x: 190, z: 204, hx: 32, hz: 26 },
];

/** The village lanes along each bank, and where the bamboo bridges cross between them. */
const LANE_SOUTH = 92;
const LANE_NORTH = 166;
const BRIDGES = [58, 184];

export function riverCenter(x: number): number {
  return 129 + 6 * Math.sin(x / 23) + 2 * Math.sin(x / 9 + 0.7);
}
const RIVER_HALF = 5;
const POND = { x: 210, z: 214, r: 10 };
const WATER_LEVEL = 10;
/** Rice paddies: west to east, south to north (inclusive), between the zones. */
const PADDIES = [
  { x0: 100, z0: 18, x1: 154, z1: 80 },
  { x0: 104, z0: 176, x1: 150, z1: 236 },
];

const M = {
  rice: `${PACK.nature}/crops_wheatStageA.glb`,
  riceRipe: `${PACK.nature}/crops_wheatStageB.glb`,
  bamboo: `${PACK.nature}/crops_bambooStageB.glb`,
  palm: `${PACK.nature}/tree_palmTall.glb`,
  banana: `${PACK.nature}/tree_palmShort.glb`,
  flowerRed: `${PACK.nature}/flower_redA.glb`,
  flowerYellow: `${PACK.nature}/flower_yellowB.glb`,
  flowerPurple: `${PACK.nature}/flower_purpleA.glb`,
  bush: `${PACK.nature}/plant_bushLarge.glb`,
  lily: `${PACK.nature}/lily_large.glb`,
  lilySmall: `${PACK.nature}/lily_small.glb`,
  canoe: `${PACK.nature}/canoe.glb`,
  fence: `${PACK.nature}/fence_simple.glb`,
  logs: `${PACK.nature}/log_stack.glb`,
  barrel: `${PACK.survival}/barrel.glb`,
  bucket: `${PACK.survival}/bucket.glb`,
  box: `${PACK.survival}/box-large.glb`,
  bench: `${PACK.box}/park-bench.glb`,
  workbench: `${PACK.survival}/workbench.glb`,
};

const inPaddy = (x: number, z: number): boolean => PADDIES.some((p) => x >= p.x0 && x <= p.x1 && z >= p.z0 && z <= p.z1);

export async function generateLangVenSong() {
  return generateZoneMap({
    mapId: MAP_ID,
    region: 'lang-ven-song',
    seedText: 'miu-lang-ven-song',
    zones: ZONES,
    spawn: { x: 20, z: LANE_SOUTH - 4, yaw: 90 },
    water: {
      level: WATER_LEVEL,
      covers: (x, z) => Math.abs(z - riverCenter(x)) < RIVER_HALF + Math.sin(x / 11) || Math.hypot(x - POND.x, z - POND.z) < POND.r,
    },
    pathsFromSpawn: false,
    routes: [
      [[14, LANE_SOUTH], [242, LANE_SOUTH]],
      [[14, LANE_NORTH], [242, LANE_NORTH]],
      ...BRIDGES.map((x): Array<[number, number]> => [[x, LANE_SOUTH], [x, LANE_NORTH]]),
      // A short way from the lane into each zone.
      ...ZONES.map((zn): Array<[number, number]> => [[zn.x, zn.z < 128 ? LANE_SOUTH : LANE_NORTH], [zn.x, zn.z]]),
      // The dyke between the paddies.
      [[127, 18], [127, LANE_SOUTH]],
      [[127, LANE_NORTH], [127, 236]],
    ],
    trees: {
      skip: 0.72,
      blocks: (roll, block) => ({ log: block('tree-log'), leaves: block(roll < 0.12 ? 'leaves-autumn' : 'leaves') }),
    },
    models: {
      heights: {
        [M.rice]: 0.7, [M.riceRipe]: 1, [M.bamboo]: 5, [M.palm]: 7, [M.banana]: 3.2, [M.flowerRed]: 0.5, [M.flowerYellow]: 0.5, [M.flowerPurple]: 0.5,
        [M.bush]: 1.2, [M.lily]: 0.1, [M.lilySmall]: 0.08, [M.canoe]: 0.6, [M.fence]: 1, [M.logs]: 0.9, [M.barrel]: 1,
        [M.bucket]: 0.6, [M.box]: 0.9, [M.bench]: 0.96, [M.workbench]: 0.9,
      },
    },
    build: (ctx) => {
      const { world, block, rng, ground, zone } = ctx;
      const [gate, meadow, landing, marsh] = [1, 2, 3, 4].map(zone) as [Zone, Zone, Zone, Zone];
      const tiles = { wall: block('sand'), roof: block('brick-red'), trim: block('log') };

      // Rice paddies: flooded plots of young rice (ripe on the east plots) inside low earth dykes.
      for (const p of PADDIES) {
        for (let x = p.x0; x <= p.x1; x++) {
          for (let z = p.z0; z <= p.z1; z++) {
            const dyke = (x - p.x0) % 9 === 0 || (z - p.z0) % 7 === 0 || x === p.x1 || z === p.z1;
            if (ctx.onPath(x, z) || dyke) continue;
            world.set(x, ctx.surface(x, z), z, block('water'));
            if ((x - p.x0) % 3 === 2 && (z - p.z0) % 2 === 1) ctx.prop(x > (p.x0 + p.x1) / 2 + 9 ? M.riceRipe : M.rice, x, z, (x * 13 + z * 7) % 360);
          }
        }
        ctx.keepOut(p.x0, p.z0, p.x1, p.z1);
      }
      ctx.landmark('canh-dong-lua', 'Cánh đồng lúa', 127, 50);

      // Tiled-roof houses with a yard and a bamboo hedge behind, both sides of each lane, doors on the lane.
      let n = 0;
      const house = (x0: number, z0: number): void => {
        const w = 9 + (n % 3) * 2;
        placeHouse(world, x0, z0, w, 7, 3 + (n % 2), ground + 1, tiles);
        ctx.keepOut(x0 - 1, z0 - 3, x0 + w, z0 + 7);
        ctx.prop(n % 2 === 0 ? M.palm : M.banana, x0 + w + 2, z0 + 3, n * 47);
        for (let i = 0; i < w; i += 2) ctx.prop(M.bamboo, x0 + i, z0 + 9, (i * 61) % 360);
        if (n % 3 === 0) ctx.prop(M.barrel, x0 - 1, z0 - 2, 0);
        n++;
      };
      for (let x = 14; x < 236; x += 17) {
        const free = (z0: number): boolean => !inPaddy(x, z0) && !inPaddy(x + 12, z0) && !ctx.inZone(x + 6, z0 + 4, 3) && BRIDGES.every((b) => Math.abs(x + 6 - b) > 10);
        if (free(LANE_SOUTH + 4)) house(x, LANE_SOUTH + 4);
        if (free(LANE_NORTH + 4)) house(x, LANE_NORTH + 4);
      }

      // Chapter 1: the banyan at the village gate, the small village school, the well.
      const banyan = { x: gate.x - 14, z: gate.z + 10 };
      placeAncientTree(world, banyan.x, ground + 1, banyan.z, { log: block('tree-log'), leaves: block('leaves'), core: block('log') }, rng);
      ctx.keepOut(banyan.x - 5, banyan.z - 5, banyan.x + 5, banyan.z + 5);
      ctx.landmark('cay-da-dau-lang', 'Cây đa đầu làng', banyan.x, banyan.z);
      const school = { x0: gate.x + 6, z0: gate.z - 14, w: 15, d: 9 };
      placeHouse(world, school.x0, school.z0, school.w, school.d, 4, ground + 1, { wall: block('birch-log'), roof: block('brick-red'), trim: block('log') });
      ctx.keepOut(school.x0 - 1, school.z0 - 2, school.x0 + school.w, school.z0 + school.d);
      ctx.landmark('lop-hoc-nho', 'Lớp học nhỏ', school.x0 + school.w / 2, school.z0 - 2);
      for (let i = 0; i < 3; i++) ctx.prop(M.bench, school.x0 + 2 + i * 5, school.z0 - 3, 0);
      const well = { x: gate.x - 4, z: gate.z - 10 };
      for (const [dx, dz] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]] as const) world.set(well.x + dx, ground + 1, well.z + dz, block('brick-grey'));
      world.set(well.x, ground, well.z, block('water'));
      ctx.prop(M.bucket, well.x + 2, well.z, 0);
      ctx.keepOut(well.x - 1, well.z - 1, well.x + 1, well.z + 1);
      ctx.landmark('gieng-lang', 'Giếng làng', well.x, well.z);

      // Chapter 2: the meadow down to the river, the flower garden and its beehives.
      const garden = { x: meadow.x + 12, z: meadow.z - 8 };
      const flowers = [M.flowerRed, M.flowerYellow, M.flowerPurple];
      for (let i = 0; i < 30; i++) ctx.prop(flowers[i % 3] ?? M.flowerRed, garden.x - 7 + (i % 6) * 3, garden.z - 6 + Math.floor(i / 6) * 3, i * 40);
      for (const dx of [-10, 10]) ctx.prop(M.box, garden.x + dx, garden.z + 8, 10);
      for (let i = 0; i < 6; i++) ctx.prop(M.bush, meadow.x - 22 + i * 7, meadow.z + 18, i * 30);
      ctx.landmark('vuon-hoa-to-ong', 'Vườn hoa tổ ong', garden.x, garden.z);

      // Chapter 3: the landing, a plank jetty into the river with boats, and the class under the banyan.
      const jettyX = landing.x + 14;
      const bank = Math.ceil(riverCenter(jettyX) + RIVER_HALF + 1);
      for (let z = bank - 6; z <= bank + 1; z++) for (let x = jettyX - 1; x <= jettyX + 1; x++) world.set(x, WATER_LEVEL + 1, z, block('planks'));
      for (const dx of [-3, 3]) ctx.propAt(M.canoe, [jettyX + dx + 0.5, WATER_LEVEL + 0.9, bank - 4.5], 90);
      ctx.landmark('ben-do', 'Bến đò', jettyX, bank);
      for (let i = 0; i < 3; i++) ctx.prop(M.logs, jettyX + 6 + i * 3, LANE_NORTH - 4, 90);
      const classTree = { x: landing.x - 12, z: landing.z + 10 };
      placeAncientTree(world, classTree.x, ground + 1, classTree.z, { log: block('tree-log'), leaves: block('leaves'), core: block('log') }, rng);
      ctx.keepOut(classTree.x - 5, classTree.z - 5, classTree.x + 5, classTree.z + 5);
      for (let i = 0; i < 3; i++) ctx.prop(M.workbench, classTree.x - 4 + i * 4, classTree.z - 8, 180);
      ctx.landmark('lop-hoc-goc-da', 'Lớp học dưới gốc đa', classTree.x, classTree.z);

      // Chapter 4: the lotus marsh and the village football field.
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        const r = POND.r * (0.25 + 0.6 * (((i * 7) % 5) / 5));
        ctx.propAt(i % 3 === 0 ? M.lilySmall : M.lily, [POND.x + Math.cos(a) * r + 0.5, WATER_LEVEL + 1.02, POND.z + Math.sin(a) * r + 0.5], i * 50);
      }
      ctx.landmark('dam-sen', 'Đầm sen', POND.x, POND.z);
      const pitch = { x: marsh.x - 16, z: marsh.z - 6 };
      for (let dx = -8; dx <= 8; dx++) for (let dz = -12; dz <= 12; dz++) if (Math.abs(dx) === 8 || Math.abs(dz) === 12 || dz === 0) world.set(pitch.x + dx, ground, pitch.z + dz, block('snow'));
      for (const dz of [-13, 13]) for (const dx of [-1, 1]) ctx.prop(M.fence, pitch.x + dx, pitch.z + dz, 90);
      ctx.landmark('san-bong-lang', 'Sân bóng làng', pitch.x, pitch.z);

      // Bamboo hedges along the village's edge.
      for (let x = 12; x < 244; x += 3) for (const z of [11, 245]) if (!inPaddy(x, z)) ctx.prop(M.bamboo, x, z, (x * 37) % 360);
      for (let z = 14; z < 244; z += 3) for (const x of [11, 245]) if (Math.abs(z - riverCenter(x)) > 8) ctx.prop(M.bamboo, x, z, (z * 37) % 360);
    },
  });
}

await runIfMain(import.meta.url, generateLangVenSong);
