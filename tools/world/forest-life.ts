// Life around Khu rừng bí mật (`ambients` in entities.json): a small camp by the spawn (a cook at the
// campfire, a child carrying firewood, a woodcutter at a nearby tree), a gardener with a carrot
// patch, a fisher on the stream bank, and animals where they belong (deer in the north-east meadow,
// a fox by its den, a hog under mushrooms, chicks by the garden, a bunny in the west, a crab on the
// sand, fish in the stream, bees at the flowers, parrots over the trees), and by the mocks' waterfall and
// camp east of chapter 1 an old angler, the camp's cook and woodcutter, sika deer, a fox, a bunny and a
// parrot (designs/khu-rung-bi-mat/, 02/10/2026). Spots are the nearest open
// grass to hand-picked anchors, found on the finished terrain so the blocks never change; every
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

/**
 * The forest's own cast, sized for their roles (content/world/models.json has everyone else's): a
 * grey-bearded woodsman (a), a young helper (f), a grandmother in glasses (i).
 */
export const FOREST_CAST_SIZES: Readonly<Record<string, number>> = {
  [`${LIFE_PACK.people}/character-a.glb`]: 1.8,
  [`${LIFE_PACK.people}/character-f.glb`]: 1.3,
  [`${LIFE_PACK.people}/character-i.glb`]: 1.65,
};

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
  /** Meadows of the forest beyond chapter 1's corner: each gets its own deer, fox, hog, bunny, bees and parrot. */
  meadows: ReadonlyArray<{ x: number; z: number }>;
  waterLevel: number;
  riverCenter(x: number): number;
  riverHalfWidth(x: number): number;
  addProp(model: string, x: number, z: number, yaw?: number): void;
  scaleOf(model: string): number;
  /**
   * The mocks' scene east of chapter 1 (designs/khu-rung-bi-mat/): the waterfall's pool and the forest folk's
   * camp round its fire. An old man fishes the pool, a cook and a woodcutter keep the camp, a sika deer and
   * her fawn, a fox, a bunny and a parrot live round about.
   */
  scene?: { pool: { x: number; z: number; r: number }; camp: { x: number; z: number }; fire: { x: number; z: number } };
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
  add('sau-bo-go', 'caterpillar', 'Sâu con', `${P.pets}/animal-caterpillar.glb`, logStart, 90, { 'log-end': at(logEnd) });

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
  parrot('vet-suoi', 70, 30, [60, 20]);

  // The wider forest: every meadow has a family of its own, so wherever the child walks something lives.
  map.meadows.forEach((m, i) => {
    const n = i + 1;
    const doe = spot(m.x - 3, m.z - 2, { maxRing: 6 });
    const grazeAt = spot(m.x + 2, m.z + 3, { from: doe, maxRing: 6 });
    add(`nai-me-${n}`, 'deer', 'Nai mẹ', `${P.pets}/animal-deer.glb`, doe, (n * 70) % 360, { 'graze-b': at(grazeAt) });
    const fawn = spot(doe.x + 2, doe.z + 1, { maxRing: 6 });
    add(`nai-con-${n}`, 'deer', 'Nai con', `${P.pets}/animal-deer.glb`, fawn, (n * 70 + 40) % 360, { 'graze-b': at(spot(grazeAt.x + 1, grazeAt.z + 1, { from: fawn, maxRing: 6 })) }, { scale: 0.62 });
    const blooms = [spot(m.x + 4, m.z - 4, { maxRing: 6 }), spot(m.x + 6, m.z, { maxRing: 6 }), spot(m.x + 3, m.z + 6, { maxRing: 6 })];
    blooms.forEach((c, k) => map.addProp(k === 1 ? `${P.nature}/flower_purpleB.glb` : `${P.nature}/flower_yellowA.glb`, c.x, c.z, k * 70 + n * 13));
    const [fa, fb, fc] = blooms.map((c) => at(c, 0.7));
    if (fa && fb && fc) add(`ong-mat-${n}`, 'bee', 'Ong mật', `${P.pets}/animal-bee.glb`, fb, 0, { 'flower-a': fa, 'flower-b': fb, 'flower-c': fc });
    const den = spot(m.x - 6, m.z + 5, { maxRing: 6 });
    add(`cao-${n}`, 'fox', 'Cáo', `${P.pets}/animal-fox.glb`, den, (n * 50) % 360, { den: at(den), lookout: at(spot(den.x + 4, den.z - 2, { from: den, maxRing: 6 })) });
    const hog = spot(m.x + 6, m.z + 6, { maxRing: 6 });
    const mushroomA = spot(hog.x + 2, hog.z + 1, { from: hog, maxRing: 6 });
    const mushroomB = spot(hog.x - 2, hog.z + 2, { from: hog, maxRing: 6 });
    map.addProp(`${P.nature}/mushroom_redGroup.glb`, mushroomA.x + 1, mushroomA.z, 20 + n);
    map.addProp(`${P.nature}/mushroom_tanGroup.glb`, mushroomB.x, mushroomB.z + 1, 70 + n);
    add(`heo-rung-${n}`, 'hog', 'Heo rừng', `${P.pets}/animal-hog.glb`, hog, (n * 90) % 360, { 'mush-a': at(mushroomA), 'mush-b': at(mushroomB) });
    const bunny = spot(m.x - 5, m.z - 6, { maxRing: 6 });
    const bush = spot(bunny.x + 3, bunny.z + 2, { from: bunny, maxRing: 6 });
    map.addProp(`${P.nature}/plant_bush.glb`, bush.x + 1, bush.z, 40 + n);
    add(`tho-${n}`, 'bunny', 'Thỏ', `${P.pets}/animal-bunny.glb`, bunny, (n * 120) % 360, { 'bush-b': at(bush) });
    parrot(`vet-rung-${n}`, m.x, m.z, [m.x + 12, m.z - 8]);
  });

  if (map.scene) {
    const { pool, camp, fire } = map.scene;
    const anglerBank = spot(Math.round(pool.x - pool.r - 1), pool.z, { maxRing: 5 });
    const anglerHome = spot(anglerBank.x - 3, anglerBank.z - 1, { from: anglerBank });
    add('ong-cau-ca-thac', 'fisher', 'Ông Câu cá', `${P.people}/character-n.glb`, anglerHome, 90, {
      bank: at(anglerBank),
      water: [pool.x + 0.5, map.waterLevel + 1, pool.z + 0.5],
    }, { held: ['built:fishing-rod', `${P.survival}/fish.glb`] });

    const campCookHome = spot(fire.x - 2, fire.z + 2);
    const campCookAt = spot(fire.x + 1, fire.z + 2, { from: campCookHome });
    add('co-nau-bep-trai', 'cook', 'Cô Nấu bếp trại', `${P.people}/character-l.glb`, campCookHome, 0, {
      fire: at(campCookAt),
      pot: at(fire),
      table: at(spot(camp.x - 8, camp.z - 3, { from: campCookAt })),
      seat: at(spot(fire.x - 3, fire.z - 1, { from: campCookAt })),
    }, { held: [`${P.food}/cooking-spoon.glb`] });

    const [cx, cz] = nearestTree(camp.x - 6, camp.z + 18);
    const cutterHome = spot(cx + 3, cz + 1);
    const cutterChop = spot(cx + 2, cz, { from: cutterHome });
    const cutterStump = spot(cutterHome.x + 2, cutterHome.z + 2, { from: cutterHome });
    map.addProp(`${P.nature}/stump_round.glb`, cutterStump.x, cutterStump.z + 1, 30);
    const cutterLogs = spot(cutterHome.x - 2, cutterHome.z + 2, { from: cutterChop });
    map.addProp(`${P.nature}/log_stack.glb`, cutterLogs.x - 1, cutterLogs.z, 0);
    add('chu-tieu-phu-lam', 'woodcutter', 'Chú Tiều phu Lâm', `${P.people}/character-g.glb`, cutterHome, 270, {
      tree: at(cutterChop),
      trunk: [cx + 0.5, surface(cx, cz) + 1.5, cz + 0.5],
      logs: at(cutterLogs),
      stump: at(cutterStump),
    }, { held: [`${P.survival}/tool-axe.glb`, `${P.survival}/resource-wood.glb`] });

    const doe = spot(pool.x - 34, pool.z, { maxRing: 6 });
    const doeGraze = spot(doe.x + 3, doe.z + 3, { from: doe, maxRing: 6 });
    add('huou-sao', 'deer', 'Hươu sao', `${P.pets}/animal-deer.glb`, doe, 120, { 'graze-b': at(doeGraze) });
    const fawn = spot(doe.x + 2, doe.z - 2, { maxRing: 6 });
    add('huou-con', 'deer', 'Hươu con', `${P.pets}/animal-deer.glb`, fawn, 150, { 'graze-b': at(spot(doeGraze.x + 1, doeGraze.z - 1, { from: fawn, maxRing: 6 })) }, { scale: 0.62 });
    const den = spot(camp.x + 14, camp.z + 10, { maxRing: 6 });
    add('cao-do', 'fox', 'Cáo đỏ', `${P.pets}/animal-fox.glb`, den, 200, { den: at(den), lookout: at(spot(den.x - 4, den.z + 2, { from: den, maxRing: 6 })) });
    const bunny = spot(pool.x - 30, pool.z + 20, { maxRing: 6 });
    const bunnyBush = spot(bunny.x + 3, bunny.z - 2, { from: bunny, maxRing: 6 });
    map.addProp(`${P.nature}/plant_bush.glb`, bunnyBush.x + 1, bunnyBush.z, 60);
    add('tho-xam', 'bunny', 'Thỏ xám', `${P.pets}/animal-bunny.glb`, bunny, 80, { 'bush-b': at(bunnyBush) });
    parrot('vet-thac', pool.x - 6, pool.z + 8, [camp.x, camp.z]);
  }

  return ambients;
}
