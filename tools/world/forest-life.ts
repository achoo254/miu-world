// Life around Khu rừng bí mật (`ambients` in entities.json): a small camp by the spawn (a cook at the
// campfire, a child carrying firewood, a woodcutter at a nearby tree), a gardener with a carrot
// patch, a fisher on the stream bank, and animals where they belong (deer in the north-east meadow,
// a fox by its den, a hog under mushrooms, chicks by the garden, a bunny in the west, a crab on the
// sand, fish in the stream, bees at the flowers, parrots over the trees). Spots are the nearest open
// grass to hand-picked anchors, found on the finished terrain so chunks.bin never changes; every
// villager spot is a straight, clear walk from home, away from quest targets and off the quest path.
import type { Ambient, AmbientRoutine } from '../../packages/voxel/src/world-entities';
import type { VoxelWorld } from '../../packages/voxel/src/chunk-format';

export const LIFE_PACK = {
  people: 'packs/kenney-blocky-characters/2.0',
  pets: 'packs/kenney-cube-pets/2.0',
  survival: 'packs/kenney-survival-kit/2.0',
  nature: 'packs/kenney-nature-kit/2.1',
  food: 'packs/kenney-food-kit/2.0',
};

/** Heights (blocks) of the models forest life adds; merged into the generator's MODEL_HEIGHT. */
export const LIFE_MODEL_HEIGHT: Readonly<Record<string, number>> = {
  // Looks chosen for the roles: a grey-bearded woodsman (a), a gardener (e), a young helper (f),
  // a grandmother in glasses (i), an outdoorsy fisher (m). No robots, zombies or costumes.
  [`${LIFE_PACK.people}/character-a.glb`]: 1.8,
  [`${LIFE_PACK.people}/character-e.glb`]: 1.75,
  [`${LIFE_PACK.people}/character-f.glb`]: 1.3,
  [`${LIFE_PACK.people}/character-i.glb`]: 1.65,
  [`${LIFE_PACK.people}/character-m.glb`]: 1.75,
  [`${LIFE_PACK.pets}/animal-bee.glb`]: 0.32,
  [`${LIFE_PACK.pets}/animal-bunny.glb`]: 0.8,
  [`${LIFE_PACK.pets}/animal-deer.glb`]: 1.5,
  [`${LIFE_PACK.pets}/animal-fox.glb`]: 0.9,
  [`${LIFE_PACK.pets}/animal-hog.glb`]: 0.9,
  [`${LIFE_PACK.pets}/animal-chick.glb`]: 0.5,
  [`${LIFE_PACK.pets}/animal-crab.glb`]: 0.45,
  [`${LIFE_PACK.pets}/animal-fish.glb`]: 0.7,
  [`${LIFE_PACK.survival}/tree-log.glb`]: 0.5,
  [`${LIFE_PACK.survival}/campfire-stand.glb`]: 1.1,
  [`${LIFE_PACK.nature}/stump_round.glb`]: 0.5,
  [`${LIFE_PACK.nature}/crops_dirtRow.glb`]: 0.25,
  [`${LIFE_PACK.nature}/crop_carrot.glb`]: 0.45,
  [`${LIFE_PACK.nature}/flower_yellowA.glb`]: 0.5,
  [`${LIFE_PACK.nature}/flower_purpleB.glb`]: 0.5,
};
/** Clips the animated models must carry (checked when scales are computed). */
export const LIFE_MODEL_ANIMATION: Readonly<Record<string, string>> = Object.fromEntries(
  Object.keys(LIFE_MODEL_HEIGHT)
    .filter((m) => m.includes('/character-') || m.includes('/animal-'))
    .map((m) => [m, 'idle']),
);

export interface ForestLifeMap {
  world: VoxelWorld;
  surface(x: number, z: number): number;
  standY(x: number, z: number): number;
  pathCells: ReadonlySet<string>;
  blocks: { grass: number; sand: number };
  /** Quest targets of every chapter (x, z): life keeps its distance from them. */
  questSpots: ReadonlyArray<readonly [number, number]>;
  /** Trunks of the scattered trees (x, z). */
  trees: ReadonlyArray<readonly [number, number]>;
  spawn: { x: number; z: number };
  waterLevel: number;
  riverCenter(x: number): number;
  riverHalfWidth(x: number): number;
  addProp(model: string, x: number, z: number, yaw?: number): void;
  scaleOf(model: string): number;
}

/** Quest targets stay this far from any ambient home or spot, so their prompts and the arrow stay clear. */
export const QUEST_CLEARANCE = 5;
/** Homes and walking spots stay this far from the quest path. */
export const PATH_CLEARANCE = 2;

type Cell = { x: number; z: number };

export function placeForestLife(map: ForestLifeMap): Ambient[] {
  const { world, surface, pathCells } = map;
  const [sx, sy, sz] = world.size;
  const used: Cell[] = [];

  const nearPath = (x: number, z: number): boolean => {
    for (let dx = -PATH_CLEARANCE; dx <= PATH_CLEARANCE; dx++) {
      for (let dz = -PATH_CLEARANCE; dz <= PATH_CLEARANCE; dz++) if (pathCells.has(`${x + dx},${z + dz}`)) return true;
    }
    return false;
  };
  /** Open ground: grass (or sand when asked), two free blocks above, away from quests and the path. */
  const open = (x: number, z: number, ground: number): boolean => {
    if (x < 10 || z < 10 || x >= sx - 10 || z >= sz - 10) return false;
    if (world.get(x, surface(x, z), z) !== ground || nearPath(x, z)) return false;
    for (let y = surface(x, z) + 1; y <= surface(x, z) + 3; y++) if (world.get(x, y, z) !== 0) return false;
    if (map.questSpots.some(([qx, qz]) => Math.hypot(qx - (x + 0.5), qz - (z + 0.5)) < QUEST_CLEARANCE)) return false;
    return used.every((c) => c.x !== x || c.z !== z);
  };
  /** A straight walk with no wall and no step higher than one block. */
  const clearWalk = (a: Cell, b: Cell): boolean => {
    const steps = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) * 2);
    let lastY = surface(a.x, a.z);
    for (let i = 1; i <= steps; i++) {
      const x = Math.round(a.x + ((b.x - a.x) * i) / steps);
      const z = Math.round(a.z + ((b.z - a.z) * i) / steps);
      const y = surface(x, z);
      if (Math.abs(y - lastY) > 1 || world.get(x, y + 1, z) !== 0 || world.get(x, y + 2, z) !== 0 || pathCells.has(`${x},${z}`)) return false;
      lastY = y;
    }
    return true;
  };
  /** Nearest open cell to an anchor (reachable from `from` when given), marked as used. */
  const spot = (x: number, z: number, opts: { from?: Cell; ground?: number; maxRing?: number } = {}): Cell => {
    const ground = opts.ground ?? map.blocks.grass;
    for (let r = 0; r <= (opts.maxRing ?? 8); r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          const c = { x: x + dx, z: z + dz };
          if (!open(c.x, c.z, ground) || (opts.from && !clearWalk(opts.from, c))) continue;
          used.push(c);
          return c;
        }
      }
    }
    throw new Error(`no open ground near ${x},${z} for forest life`);
  };
  const at = (c: Cell, lift = 0): [number, number, number] => [c.x + 0.5, map.standY(c.x, c.z) + lift, c.z + 0.5];
  const treeTop = (x: number, z: number): [number, number, number] => {
    let y = sy - 1;
    while (y > 0 && world.get(x, y, z) === 0) y--;
    return [x + 0.5, y + 1, z + 0.5];
  };
  const nearestTree = (x: number, z: number): readonly [number, number] => {
    const [first, ...rest] = map.trees;
    if (!first) throw new Error('the forest has no trees for life to use');
    return rest.reduce((best, t) => (Math.hypot(t[0] - x, t[1] - z) < Math.hypot(best[0] - x, best[1] - z) ? t : best), first);
  };

  const ambients: Ambient[] = [];
  const add = (id: string, routine: AmbientRoutine, name: string, model: string, home: Cell | [number, number, number], yaw: number, spots: Record<string, [number, number, number]>, extra: Partial<Ambient> = {}): void => {
    ambients.push({
      id,
      routine,
      name,
      model,
      scale: +(map.scaleOf(model) * (extra.scale ?? 1)).toFixed(4),
      position: Array.isArray(home) ? home : at(home),
      yaw,
      spots,
      ...(extra.held ? { held: extra.held } : {}),
    });
  };
  const P = LIFE_PACK;

  // Camp by the spawn: the campfire (already there) gets a cooking stand; a log pile and a stump.
  const fire = { x: map.spawn.x - 3, z: map.spawn.z + 1 };
  map.addProp(`${P.survival}/campfire-stand.glb`, fire.x, fire.z, 90);
  const cookHome = spot(fire.x - 1, fire.z + 2);
  const cookSpot = spot(fire.x + 1, fire.z + 2, { from: cookHome });
  const table = spot(map.spawn.x - 6, map.spawn.z - 2, { from: cookSpot });
  const seatCell = spot(fire.x - 3, fire.z + 3, { from: cookSpot });
  map.addProp(`${P.nature}/stump_round.glb`, seatCell.x - 1, seatCell.z, 0);
  add('bac-nau-an', 'cook', 'Bà Bếp', `${P.people}/character-i.glb`, cookHome, 90, {
    fire: at(cookSpot),
    pot: at(fire),
    table: at(table),
    seat: at(seatCell),
  }, { held: [`${P.food}/cooking-spoon.glb`] });

  const pileCell = spot(map.spawn.x - 7, map.spawn.z + 7);
  map.addProp(`${P.nature}/log_stack.glb`, pileCell.x - 1, pileCell.z, 90);
  const carrierHome = spot(pileCell.x + 1, pileCell.z - 1, { from: cookSpot });
  const carrierFire = spot(fire.x + 1, fire.z - 1, { from: carrierHome });
  add('be-ganh-cui', 'firewood-carrier', 'Bé Tí', `${P.people}/character-f.glb`, carrierHome, 45, {
    pile: at(pileCell),
    stack: at({ x: pileCell.x - 1, z: pileCell.z }),
    fire: at(carrierFire),
  }, { held: [`${P.survival}/resource-wood.glb`] });

  const [tx, tz] = nearestTree(map.spawn.x - 6, map.spawn.z + 14);
  const woodHome = spot(tx + 2, tz + 1);
  const chop = spot(tx + 1, tz, { from: woodHome });
  const stumpCell = spot(woodHome.x + 2, woodHome.z + 2, { from: woodHome });
  map.addProp(`${P.nature}/stump_round.glb`, stumpCell.x, stumpCell.z + 1, 0);
  const logs = spot(pileCell.x + 2, pileCell.z + 2, { from: chop });
  add('bac-tieu-phu', 'woodcutter', 'Bác Tiều phu', `${P.people}/character-a.glb`, woodHome, 270, {
    tree: at(chop),
    trunk: [tx + 0.5, surface(tx, tz) + 1.5, tz + 0.5],
    logs: at(logs),
    stump: at(stumpCell),
  }, { held: [`${P.survival}/tool-axe.glb`, `${P.survival}/resource-wood.glb`] });
  // A caterpillar crawls along a fallen log beside the woodcutter.
  const logStart = spot(woodHome.x - 2, woodHome.z + 3);
  const logEnd = spot(logStart.x + 2, logStart.z, { from: logStart });
  map.addProp(`${P.survival}/tree-log.glb`, logStart.x + 1, logStart.z + 1, 90);
  add('sau-bo-go', 'caterpillar', 'Sâu con', `${P.pets}/animal-caterpillar.glb`, logStart, 90, { 'log-end': at(logEnd) }, { scale: 0.6 });

  // Garden: three rows of carrots, a gardener, two chicks, a bee and flowers.
  const bed = spot(map.spawn.x + 12, map.spawn.z - 3);
  for (let i = 0; i < 3; i++) {
    map.addProp(`${P.nature}/crops_dirtRow.glb`, bed.x + i, bed.z, 0);
    map.addProp(`${P.nature}/crop_carrot.glb`, bed.x + i, bed.z, i * 60);
  }
  const gardenHome = spot(bed.x - 2, bed.z + 2);
  const rows = [0, 1, 2].map((i) => spot(bed.x + i, bed.z + 1, { from: gardenHome }));
  add('co-lam-vuon', 'gardener', 'Cô Làm vườn', `${P.people}/character-e.glb`, gardenHome, 180, {
    'row-a': at(rows[0] ?? gardenHome),
    'row-b': at(rows[1] ?? gardenHome),
    'row-c': at(rows[2] ?? gardenHome),
    bed: at({ x: bed.x + 1, z: bed.z }),
  }, { held: [`${P.survival}/tool-hoe.glb`, `${P.survival}/bucket.glb`, `${P.food}/carrot.glb`] });
  for (const [i, dz] of [-2, 0].entries()) {
    add(`ga-con-${i + 1}`, 'chick', 'Gà con', `${P.pets}/animal-chick.glb`, spot(bed.x + 4, bed.z + dz + 3), i * 140, {});
  }
  const flowerSpots = [spot(bed.x - 3, bed.z - 1), spot(bed.x + 5, bed.z - 2), spot(bed.x + 1, bed.z - 3)];
  flowerSpots.forEach((c, i) => map.addProp(i === 1 ? `${P.nature}/flower_purpleB.glb` : `${P.nature}/flower_yellowA.glb`, c.x, c.z, i * 50));
  const [fa, fb, fc] = flowerSpots.map((c) => at(c, 0.7));
  if (!fa || !fb || !fc) throw new Error('garden flowers missing');
  add('ong-vuon', 'bee', 'Ong mật', `${P.pets}/animal-bee.glb`, fa, 0, { 'flower-a': fa, 'flower-b': fb, 'flower-c': fc });

  // Stream bank, west of the bridge: a fisher, fish that leap, a crab on the sand.
  const fishX = 26;
  const fishZ = Math.round(map.riverCenter(fishX));
  const bankZ = Math.floor(map.riverCenter(fishX) - map.riverHalfWidth(fishX)) - 1;
  const bank = spot(fishX, bankZ, { maxRing: 4, ground: world.get(fishX, surface(fishX, bankZ), bankZ) });
  const fisherHome = spot(bank.x - 2, bank.z - 2, { from: bank });
  add('chu-cau-ca', 'fisher', 'Chú Câu cá', `${P.people}/character-m.glb`, fisherHome, 0, {
    bank: at(bank),
    water: [fishX + 0.5, map.waterLevel + 1, fishZ + 0.5],
  }, { held: ['built:fishing-rod', `${P.survival}/fish.glb`] });
  const water = (x: number): [number, number, number] => [x + 0.5, map.waterLevel + 1, Math.round(map.riverCenter(x)) + 0.5];
  add('ca-suoi', 'fish', 'Cá suối', `${P.pets}/animal-fish.glb`, water(30), 90, { 'leap-a': water(30), 'leap-b': water(36) });
  const sandA = spot(33, Math.round(map.riverCenter(33) - map.riverHalfWidth(33)) - 1, { ground: map.blocks.sand, maxRing: 5 });
  const sandB = spot(sandA.x + 3, sandA.z, { ground: map.blocks.sand, from: sandA, maxRing: 3 });
  add('cua-cat', 'crab', 'Cua', `${P.pets}/animal-crab.glb`, sandA, 0, { 'sand-a': at(sandA), 'sand-b': at(sandB) });

  // North-east meadow: a deer and her fawn; a fox by its den further along; bees in the flowers.
  const deerHome = spot(80, 24);
  const graze = spot(84, 31, { from: deerHome });
  add('nai-me', 'deer', 'Nai mẹ', `${P.pets}/animal-deer.glb`, deerHome, 200, { 'graze-b': at(graze) });
  const fawnHome = spot(deerHome.x + 2, deerHome.z + 1);
  add('nai-con', 'deer', 'Nai con', `${P.pets}/animal-deer.glb`, fawnHome, 160, { 'graze-b': at(spot(graze.x + 1, graze.z + 1, { from: fawnHome })) }, { scale: 0.62 });
  const meadowFlowers = [spot(76, 20), spot(82, 18), spot(78, 28)];
  meadowFlowers.forEach((c, i) => map.addProp(i === 2 ? `${P.nature}/flower_purpleB.glb` : `${P.nature}/flower_yellowA.glb`, c.x, c.z, i * 70));
  const [ma, mb, mc] = meadowFlowers.map((c) => at(c, 0.7));
  if (!ma || !mb || !mc) throw new Error('meadow flowers missing');
  add('ong-dong-co', 'bee', 'Ong mật', `${P.pets}/animal-bee.glb`, mb, 0, { 'flower-a': ma, 'flower-b': mb, 'flower-c': mc });
  const den = spot(84, 40);
  add('cao-ngu-ngay', 'fox', 'Cáo', `${P.pets}/animal-fox.glb`, den, 240, { den: at(den), lookout: at(spot(78, 38, { from: den })) });

  // South-west woods: a hog rooting under mushrooms; west bank: a bunny between two bushes.
  const hogHome = spot(38, 74);
  const mushA = spot(hogHome.x + 3, hogHome.z + 1, { from: hogHome });
  const mushB = spot(hogHome.x - 2, hogHome.z + 3, { from: hogHome });
  map.addProp(`${P.nature}/mushroom_redGroup.glb`, mushA.x + 1, mushA.z, 20);
  map.addProp(`${P.nature}/mushroom_tanGroup.glb`, mushB.x, mushB.z + 1, 70);
  add('heo-rung', 'hog', 'Heo rừng', `${P.pets}/animal-hog.glb`, hogHome, 90, { 'mush-a': at(mushA), 'mush-b': at(mushB) });
  const bunnyHome = spot(14, 38);
  const bushB = spot(bunnyHome.x + 4, bunnyHome.z + 2, { from: bunnyHome });
  map.addProp(`${P.nature}/plant_bush.glb`, bushB.x + 1, bushB.z, 40);
  map.addProp(`${P.nature}/plant_bush.glb`, bunnyHome.x - 1, bunnyHome.z, 10);
  add('tho-trang', 'bunny', 'Thỏ', `${P.pets}/animal-bunny.glb`, bunnyHome, 120, { 'bush-b': at(bushB) });

  // Two parrots: each perches on a tree top and loops over its part of the forest.
  const parrot = (id: string, x: number, z: number, other: readonly [number, number]): void => {
    const [ax, az] = nearestTree(x, z);
    const [bx, bz] = nearestTree(other[0], other[1]);
    const perchA = treeTop(ax, az);
    add(id, 'parrot', 'Vẹt rừng', `${P.pets}/animal-parrot.glb`, perchA, 0, {
      'perch-a': perchA,
      'perch-b': treeTop(bx, bz),
      sky: [x + 0.5, perchA[1] + 5, z + 0.5],
    });
  };
  parrot('vet-trai', map.spawn.x + 4, map.spawn.z + 18, [map.spawn.x + 18, map.spawn.z - 2]);
  parrot('vet-xanh', 70, 30, [60, 20]);

  return ambients;
}
