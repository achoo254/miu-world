// Generates "Lâu đài" (Toán topics 5 and 7, the end-of-term review) from a fixed seed: a stone castle on a
// rise, its walls and corner towers round a paved inner court, a moat all round. Chapter 1, the court of
// shapes: big coloured blocks, pyramids and steps on the flagstones, the drawing room with its easels and
// stained-glass windows, the picture gallery. Chapter 2, the great hall: a long stone hall with the stage,
// the wings and the backstage. Chapter 3, outside the gate: the suspension bridge over the moat, the willow
// on its bank and the meadow before the walls. Banners on the towers.
// Output: assets/generated/world/lau-dai/{regions/, horizon.bin, entities.json}
import { PACK, runIfMain } from './map-kit';
import { placeHouse } from './structures/buildings';
import { generateZoneMap, type Zone } from './zone-map';

export const MAP_ID = 'lau-dai';

/** Castle walls (inclusive) and the gate's opening on the south wall. */
const WALLS = { x0: 40, x1: 216, z0: 92, z1: 236 };
const GATE = { x0: 124, x1: 132 };
const MOAT = 5;
const WATER_LEVEL = 10;

export const ZONES: readonly Zone[] = [
  { chapter: 1, id: 'san-hinh-khoi', name: 'Sân hình khối', x: 92, z: 162, hx: 44, hz: 60, floor: 'path' },
  { chapter: 2, id: 'dai-sanh-on-tap', name: 'Đại sảnh ôn tập', x: 176, z: 166, hx: 34, hz: 56, floor: 'planks' },
  { chapter: 3, id: 'cau-treo-cong-thanh', name: 'Cầu treo trước cổng thành', x: 128, z: 50, hx: 70, hz: 28 },
];

const C = PACK.castle;
const M = {
  flag: `${C}/flag-banner-long.glb`,
  flagWide: `${C}/flag-wide.glb`,
  easel: `${PACK.nature}/sign.glb`,
  palette: `${PACK.props}/artist-palette.glb`,
  picture: `${PACK.props}/framed-picture.glb`,
  pictureYellow: `${PACK.props}/framed-picture-yellow.glb`,
  willow: `${PACK.nature}/tree_detailed.glb`,
  bench: `${PACK.box}/park-bench.glb`,
  barrel: `${PACK.survival}/barrel.glb`,
  teddy: `${PACK.props}/teddy-bear.glb`,
  medal: `${PACK.props}/medal-gold.glb`,
  flowerRed: `${PACK.nature}/flower_redA.glb`,
};

const inMoat = (x: number, z: number): boolean => {
  const out = x < WALLS.x0 - 1 || x > WALLS.x1 + 1 || z < WALLS.z0 - 1 || z > WALLS.z1 + 1;
  const near = x >= WALLS.x0 - 1 - MOAT && x <= WALLS.x1 + 1 + MOAT && z >= WALLS.z0 - 1 - MOAT && z <= WALLS.z1 + 1 + MOAT;
  return out && near;
};

export async function generateLauDai() {
  return generateZoneMap({
    mapId: MAP_ID,
    region: 'lau-dai',
    seedText: 'miu-lau-dai',
    size: 256,
    zones: ZONES,
    spawn: { x: 128, z: 16, yaw: 0 },
    water: { level: WATER_LEVEL, covers: inMoat },
    pathsFromSpawn: false,
    routes: [
      // Over the suspension bridge, through the gate and up the court to the great hall.
      [[128, 10], [128, 200]],
      [[60, 120], [200, 120]],
    ],
    trees: { skip: 0.6, blocks: (roll, block) => ({ log: block('tree-log'), leaves: block(roll < 0.3 ? 'leaves-pink' : 'leaves') }) },
    models: {
      heights: {
        [M.flag]: 3, [M.flagWide]: 2.5, [M.easel]: 1.4, [M.palette]: 0.9, [M.picture]: 1.2, [M.pictureYellow]: 1.2, [M.willow]: 6,
        [M.bench]: 0.96, [M.barrel]: 1, [M.teddy]: 0.8, [M.medal]: 0.8, [M.flowerRed]: 0.5,
      },
    },
    build: (ctx) => {
      const { world, block, ground, zone } = ctx;
      const [court, hall, bridge] = [1, 2, 3].map(zone) as [Zone, Zone, Zone];
      const stone = block('brick-grey');

      // Curtain walls six blocks high with battlements, corner towers, the gate in the south wall.
      for (let x = WALLS.x0; x <= WALLS.x1; x++) for (let z = WALLS.z0; z <= WALLS.z1; z++) {
        const edge = x === WALLS.x0 || x === WALLS.x1 || z === WALLS.z0 || z === WALLS.z1;
        if (!edge) continue;
        const gate = z === WALLS.z0 && x >= GATE.x0 && x <= GATE.x1;
        for (let y = ground + 1; y <= ground + 6; y++) if (!gate || y > ground + 5) world.set(x, y, z, stone);
        if ((x + z) % 2 === 0) world.set(x, ground + 7, z, stone);
      }
      for (const [tx, tz] of [[WALLS.x0, WALLS.z0], [WALLS.x1, WALLS.z0], [WALLS.x0, WALLS.z1], [WALLS.x1, WALLS.z1], [GATE.x0 - 2, WALLS.z0], [GATE.x1 + 2, WALLS.z0]] as const) {
        for (let y = ground + 1; y <= ground + 11; y++) for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) if (Math.max(Math.abs(dx), Math.abs(dz)) === 2) world.set(tx + dx, y, tz + dz, stone);
        for (let k = 0; k <= 3; k++) for (let dx = -3 + k; dx <= 3 - k; dx++) for (let dz = -3 + k; dz <= 3 - k; dz++) world.set(tx + dx, ground + 12 + k, tz + dz, block('roof-blue'));
        ctx.propAt(M.flag, [tx + 0.5, ground + 16, tz + 0.5], 0);
        ctx.keepOut(tx - 3, tz - 3, tx + 3, tz + 3);
      }
      ctx.keepOut(WALLS.x0, WALLS.z0, WALLS.x1, WALLS.z0 + 1);
      ctx.keepOut(WALLS.x0, WALLS.z1 - 1, WALLS.x1, WALLS.z1);
      ctx.keepOut(WALLS.x0, WALLS.z0, WALLS.x0 + 1, WALLS.z1);
      ctx.keepOut(WALLS.x1 - 1, WALLS.z0, WALLS.x1, WALLS.z1);
      ctx.landmark('cong-thanh', 'Cổng thành', 128, WALLS.z0);

      // Chapter 1: coloured shapes on the court (cubes, a pyramid, steps), the drawing room, the gallery.
      const colours = [block('wood-red'), block('roof-blue'), block('sand'), block('leaves-pink')];
      const shapes: Array<[number, number]> = [[court.x - 30, court.z - 40], [court.x - 10, court.z - 44], [court.x + 14, court.z - 38], [court.x - 26, court.z + 20]];
      shapes.forEach(([sx, sz], i) => {
        const c = colours[i % colours.length] ?? stone;
        if (i % 2 === 0) for (let y = 0; y < 3; y++) for (let dx = 0; dx < 3; dx++) for (let dz = 0; dz < 3; dz++) world.set(sx + dx, ground + 1 + y, sz + dz, c);
        else for (let k = 0; k < 3; k++) for (let dx = k; dx < 5 - k; dx++) for (let dz = k; dz < 5 - k; dz++) world.set(sx + dx, ground + 1 + k, sz + dz, c);
        ctx.keepOut(sx - 1, sz - 1, sx + 5, sz + 5);
      });
      ctx.landmark('khoi-hinh', 'Khối hình trên sân', court.x - 10, court.z - 40);
      const drawing = { x0: court.x - 34, z0: court.z + 34 };
      placeHouse(world, drawing.x0, drawing.z0, 20, 12, 5, ground + 1, { wall: block('sand'), roof: block('brick-red'), trim: stone });
      ctx.keepOut(drawing.x0 - 1, drawing.z0 - 3, drawing.x0 + 20, drawing.z0 + 12);
      for (let i = 0; i < 4; i++) {
        ctx.prop(M.easel, drawing.x0 + 3 + i * 4, drawing.z0 - 5, 180);
        ctx.prop(M.palette, drawing.x0 + 4 + i * 4, drawing.z0 - 4, 180);
      }
      ctx.landmark('phong-ve', 'Phòng vẽ', drawing.x0 + 10, drawing.z0 - 2);
      const gallery = { x0: court.x + 6, z0: court.z + 34 };
      placeHouse(world, gallery.x0, gallery.z0, 22, 12, 5, ground + 1, { wall: block('birch-log'), roof: block('roof-blue'), trim: stone });
      ctx.keepOut(gallery.x0 - 1, gallery.z0 - 3, gallery.x0 + 22, gallery.z0 + 12);
      for (let i = 0; i < 4; i++) ctx.prop(i % 2 ? M.picture : M.pictureYellow, gallery.x0 + 3 + i * 5, gallery.z0 - 5, 180);
      ctx.landmark('phong-tranh', 'Phòng trưng bày tranh', gallery.x0 + 11, gallery.z0 - 2);

      // Chapter 2: the great hall with a raised stage at its far end; benches for the audience outside.
      const great = { x0: hall.x - 22, z0: hall.z + 6, w: 44, d: 26 };
      placeHouse(world, great.x0, great.z0, great.w, great.d, 7, ground + 1, { wall: stone, roof: block('wood-red'), trim: block('sand') });
      for (let x = great.x0 + 4; x < great.x0 + great.w - 4; x++) for (let z = great.z0 + great.d - 7; z < great.z0 + great.d - 1; z++) world.set(x, ground + 1, z, block('planks'));
      ctx.landmark('dai-sanh', 'Đại sảnh', hall.x, great.z0 - 2);
      for (let row = 0; row < 3; row++) for (let i = 0; i < 4; i++) ctx.prop(M.bench, hall.x - 18 + i * 12, hall.z - 30 + row * 8, 0);
      for (const [dx, model] of [[-16, M.teddy], [-8, M.barrel], [8, M.medal], [16, M.barrel]] as const) ctx.prop(model, hall.x + dx, great.z0 - 4, 0);
      ctx.landmark('hau-truong', 'Hậu trường', great.x0 + great.w - 6, great.z0 - 3);

      // Chapter 3: the meadow before the walls, a willow by the moat, flowers; banners at the bridge.
      for (const [dx, dz] of [[-40, 14], [36, 18], [-58, -6]] as const) ctx.prop(M.willow, bridge.x + dx, bridge.z + dz, dx);
      for (let i = 0; i < 20; i++) ctx.prop(M.flowerRed, bridge.x - 60 + i * 6, bridge.z - 18 + (i % 3) * 3, i * 40);
      for (const dx of [-4, 4]) ctx.prop(M.flagWide, 128 + dx, WALLS.z0 - MOAT - 3, 0);
      ctx.landmark('cau-treo', 'Cầu treo', 128, WALLS.z0 - 3);
    },
  });
}

await runIfMain(import.meta.url, generateLauDai);
