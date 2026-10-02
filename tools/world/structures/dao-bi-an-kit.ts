// What every scene of "Đảo bí ẩn" builds with: its blocks, its models (packs and its own box props,
// content/world/box-props/dao-bi-an.json), a cell's own roll, rock of mixed stones, and a few small pieces the
// scenes share (a waterfall sheet down a sheer face, a lamp post of blocks, hanging vines).
import { PACK } from '../map-kit';
import { SAILING_SHIP, STREET_LANTERN } from '../scenery';
import type { ZoneMapContext } from '../zone-map';
import { cellRoll } from './forest-scene';
import { fillBox } from './lau-dai-castle';
import { put } from './world-writer';

export interface IslandBlocks {
  grass: number;
  trail: number;
  sand: number;
  dirt: number;
  stone: number;
  rock: number;
  moss: number;
  brick: number;
  dark: number;
  basalt: number;
  lava: number;
  crystal: number;
  water: number;
  planks: number;
  log: number;
  treeLog: number;
  leaves: number;
  lantern: number;
  cobble: number;
  paver: number;
  wood: number;
  white: number;
}

export const islandBlocks = (ctx: ZoneMapContext): IslandBlocks => ({
  grass: ctx.soil.grass,
  trail: ctx.soil.path,
  sand: ctx.block('sand'),
  dirt: ctx.block('dirt'),
  stone: ctx.block('stone'),
  rock: ctx.block('cobble-grey'),
  moss: ctx.block('rock-moss'),
  brick: ctx.block('brick-grey'),
  dark: ctx.block('iron'),
  basalt: ctx.block('asphalt'),
  lava: ctx.block('lava'),
  crystal: ctx.block('crystal'),
  water: ctx.block('water'),
  planks: ctx.block('planks'),
  log: ctx.block('log'),
  treeLog: ctx.block('tree-log'),
  leaves: ctx.block('leaves'),
  lantern: ctx.block('lantern'),
  cobble: ctx.block('cobble'),
  paver: ctx.block('paver'),
  wood: ctx.block('wood-red'),
  white: ctx.block('snow'),
});

const N = PACK.nature;
const S = PACK.survival;
const BX = PACK.box;
export const M = {
  palmTall: `${N}/tree_palmTall.glb`,
  palmShort: `${N}/tree_palmShort.glb`,
  palmBend: `${N}/tree_palmBend.glb`,
  palmDetailed: `${N}/tree_palmDetailedTall.glb`,
  bush: `${N}/plant_bushLarge.glb`,
  bushSmall: `${N}/plant_bush.glb`,
  fern: `${N}/plant_flatTall.glb`,
  grass: `${N}/grass_large.glb`,
  flowers: [`${N}/flower_redA.glb`, `${N}/flower_yellowB.glb`, `${N}/flower_purpleA.glb`, `${N}/flower_yellowA.glb`],
  rockSmall: `${N}/rock_smallA.glb`,
  rockLarge: `${N}/rock_largeA.glb`,
  rockBig: `${N}/rock_largeB.glb`,
  rockTall: `${N}/rock_tallA.glb`,
  rockTallF: `${N}/rock_tallF.glb`,
  column: `${N}/statue_column.glb`,
  columnBroken: `${N}/statue_columnDamaged.glb`,
  stoneHead: `${N}/statue_head.glb`,
  obelisk: `${N}/statue_obelisk.glb`,
  tent: `${N}/tent_detailedOpen.glb`,
  canoe: `${N}/canoe.glb`,
  fence: `${N}/fence_simple.glb`,
  lily: `${N}/lily_large.glb`,
  mushroom: `${N}/mushroom_redTall.glb`,
  mushrooms: `${N}/mushroom_tanGroup.glb`,
  logStack: `${N}/log_stack.glb`,
  stump: `${N}/stump_round.glb`,
  campfire: `${S}/campfire-pit.glb`,
  campStand: `${S}/campfire-stand.glb`,
  barrel: `${S}/barrel.glb`,
  crate: `${S}/box-large.glb`,
  box: `${S}/box.glb`,
  chest: `${S}/chest.glb`,
  bucket: `${S}/bucket.glb`,
  bedroll: `${S}/bedroll.glb`,
  driftwood: `${S}/tree-log.glb`,
  signpost: `${S}/signpost.glb`,
  coconut: `${PACK.food}/coconut.glb`,
  pineapple: `${PACK.food}/pineapple.glb`,
  banana: `${PACK.food}/banana.glb`,
  shell: `${PACK.props}/spiral-shell.glb`,
  monkey: `${PACK.pets}/animal-monkey.glb`,
  ship: SAILING_SHIP,
  lamp: STREET_LANTERN,
  flagpole: `${BX}/flagpole.glb`,
  bench: `${BX}/park-bench.glb`,
  wallTorch: `${BX}/ld-wall-torch.glb`,
  fallsStreaks: `${BX}/kr-falls-streaks.glb`,
  fallsFoam: `${BX}/kr-falls-foam.glb`,
  bigCrystal: `${BX}/dba-big-crystal.glb`,
  cannon: `${BX}/dba-cannon.glb`,
  crystalBlue: `${BX}/dba-crystal-blue.glb`,
  crystalPurple: `${BX}/dba-crystal-purple.glb`,
  dockLantern: `${BX}/dba-dock-lantern.glb`,
  fireflies: `${BX}/dba-fireflies.glb`,
  glowMushroom: `${BX}/dba-glow-mushroom.glb`,
  glowMushroomPink: `${BX}/dba-glow-mushroom-pink.glb`,
  glyphPanel: `${BX}/dba-glyph-panel.glb`,
  goldChest: `${BX}/dba-gold-chest.glb`,
  goldHeap: `${BX}/dba-gold-heap.glb`,
  goldPile: `${BX}/dba-gold-pile.glb`,
  goldStatue: `${BX}/dba-gold-statue.glb`,
  lightShaft: `${BX}/dba-light-shaft.glb`,
  mapTable: `${BX}/dba-map-table.glb`,
  moon: `${BX}/dba-moon.glb`,
  netRack: `${BX}/dba-net-rack.glb`,
  pirateShip: `${BX}/dba-pirate-ship.glb`,
  rowboat: `${BX}/dba-rowboat.glb`,
  skullFlag: `${BX}/dba-skull-flag.glb`,
  smoke: `${BX}/dba-smoke.glb`,
  torch: `${BX}/dba-torch.glb`,
  vines: `${BX}/dba-vines.glb`,
  wreck: `${BX}/dba-wreck.glb`,
} as const;

/** A cell's own roll in [0, 1): the same on every run, no draw from the map's random numbers. */
export const roll = cellRoll;

/** Everything a scene needs: the map's context, its blocks, and writing helpers. */
export interface IslandKit {
  ctx: ZoneMapContext;
  b: IslandBlocks;
  put: (x: number, y: number, z: number, id: number) => void;
  fill: (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, id: number) => void;
  /** Weathered rock: grey stone, pale stone and moss mixed by the cell. */
  rockAt: (x: number, y: number, z: number) => number;
  /** Dark rock of the volcano. */
  darkAt: (x: number, y: number, z: number) => number;
  /** The caves' rock: dark grey and near-black, moss here and there (d-07, d-08). */
  caveAt: (x: number, y: number, z: number) => number;
  /** A prop standing on a block whose top is `y` (feet at y + 1). */
  propOn: (model: string, x: number, y: number, z: number, yaw?: number) => void;
  /** The highest solid block of a column as built so far (leaves and water left out). */
  topAt: (x: number, z: number) => number;
}

export function islandKit(ctx: ZoneMapContext): IslandKit {
  const b = islandBlocks(ctx);
  return {
    ctx,
    b,
    put: (x, y, z, id) => put(ctx.world, x, y, z, id),
    fill: (x0, y0, z0, x1, y1, z1, id) => fillBox(ctx.world, x0, y0, z0, x1, y1, z1, id),
    rockAt: (x, y, z) => {
      const r = roll(x * 3 + y, z, 41);
      return r < 0.55 ? b.rock : r < 0.8 ? b.stone : b.moss;
    },
    darkAt: (x, y, z) => {
      const r = roll(x, z * 3 + y, 43);
      return r < 0.5 ? b.basalt : r < 0.8 ? b.rock : b.dark;
    },
    caveAt: (x, y, z) => {
      const r = roll(x * 5 + y, z * 3 - y, 44);
      return r < 0.55 ? b.basalt : r < 0.9 ? b.dark : b.moss;
    },
    propOn: (model, x, y, z, yaw = 0) => ctx.propAt(model, [x + 0.5, y + 1, z + 0.5], yaw),
    topAt: (x, z) => {
      for (let y = ctx.world.size[1] - 1; y > 0; y--) {
        const id = ctx.world.get(x, y, z);
        if (id !== 0 && id !== b.leaves && id !== b.water) return y;
      }
      return 0;
    },
  };
}

/**
 * A fall down a sheer face: the high ground ends at row `faceZ` and the water drops toward `dir` (+1 south, -1
 * north), `half` blocks either side of `x`: a sheet in the row past the face from its foot to the lip, the run
 * from the sheet to the pool, a channel cut into the top behind the lip. Returns the lip's height.
 */
export function fallsSheet(k: IslandKit, x: number, faceZ: number, dir: 1 | -1, half: number, channel = 10): number {
  const { ctx, b } = k;
  let lip = 0;
  for (let dx = -half; dx <= half; dx++) {
    const fx = x + dx;
    const top = k.topAt(fx, faceZ);
    lip = Math.max(lip, top);
    const out = faceZ + dir;
    for (let y = ctx.surface(fx, out); y <= top; y++) k.put(fx, y, out, b.water);
    for (let s = 2; s <= 5; s++) {
      const z = faceZ + dir * s;
      if (!ctx.inWater(fx, z)) k.put(fx, ctx.surface(fx, z), z, b.water);
    }
    if (Math.abs(dx) < half) for (let s = 0; s <= channel; s++) k.put(fx, k.topAt(fx, faceZ - dir * s), faceZ - dir * s, b.water);
  }
  ctx.keepOut(x - half - 1, Math.min(faceZ, faceZ + dir * 5), x + half + 1, Math.max(faceZ, faceZ + dir * 5));
  return lip;
}

/** Vines (a prop three blocks long) hanging with their top at `topY` against a face. */
export function hangVines(k: IslandKit, x: number, topY: number, z: number, yaw = 0): void {
  k.ctx.propAt(M.vines, [x + 0.5, topY - 3, z + 0.5], yaw);
}
