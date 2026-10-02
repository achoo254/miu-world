// The island's sea life (`ambients` beside the everyday cast of village-life.ts), whose routines need places
// of their own rather than the everyday `work-*` ones: crabs scuttling between two spots of sand, fish
// leaping out of the sea, parrots flying between palm tops and circling, monkeys hopping between the palms'
// feet for fruit, and anglers casting from the piers (bank and water). Spots are found on the finished map, the same on every run, and keep clear of
// every quest target and every other creature.
import type { VoxelWorld } from '../../../packages/voxel/src/chunk-format';
import type { Ambient, AmbientRoutine } from '../../../packages/voxel/src/world-entities';
import { PACK } from '../map-kit';
import { catalogModels } from '../model-catalog';
import { modelScales } from '../model-scales';
import { LIFE_CLEARANCE, person } from '../village-life';
import { roll } from './dao-bi-an-kit';

type Vec = [number, number, number];
type Cell = readonly [number, number];

export interface SeaLifeMap {
  world: VoxelWorld;
  /** Block ids the life stands on or swims in. */
  blocks: { sand: number; water: number };
  /** Blocks that are not ground under a creature (leaves, water, tree trunks the child walks through). */
  passable: ReadonlySet<number>;
  waterLevel: number;
  /** Sea (not a pool on land). */
  isSea: (x: number, z: number) => boolean;
  /** Quest targets and stops (x, z): creatures keep away from them. */
  questSpots: readonly Cell[];
  palms: ReadonlyArray<{ x: number; z: number; height: number }>;
  crabs: readonly Cell[];
  fish: readonly Cell[];
  parrots: readonly Cell[];
  /** Anglers: a name, where they stand (on a deck or the shore) and the water they cast to. */
  anglers: ReadonlyArray<{ name: string; letter: string; bank: Cell; water: Cell }>;
}

const CRAB = `${PACK.pets}/animal-crab.glb`;
const FISH = `${PACK.pets}/animal-fish.glb`;
const PARROT = `${PACK.pets}/animal-parrot.glb`;
const MONKEY = `${PACK.pets}/animal-monkey.glb`;
const ROD = 'built:fishing-rod';
const CAUGHT = `${PACK.survival}/fish.glb`;

const CRAB_NAMES = ['Cua đỏ', 'Cua cát', 'Cua càng to', 'Cua con', 'Cua nhỏ tinh nghịch', 'Cua bò ngang'];
const FISH_NAMES = ['Cá hề', 'Cá chuồn', 'Cá bạc', 'Cá vàng biển', 'Cá xanh'];
const PARROT_NAMES = ['Vẹt đỏ', 'Vẹt xanh', 'Vẹt đuôi dài', 'Vẹt mỏ vàng', 'Vẹt hay hót'];
const MONKEY_NAMES = ['Khỉ con tinh nghịch', 'Khỉ hái dừa', 'Khỉ đuôi dài', 'Khỉ mê chuối', 'Khỉ nhào lộn', 'Khỉ mẹ bế con'];
/** One palm in this many has a monkey about its foot (the others keep theirs up in the crown). */
const MONKEY_EVERY = 5;
const MONKEYS = 14;

export async function placeSeaLife(map: SeaLifeMap): Promise<Ambient[]> {
  const { world } = map;
  const [sx, sy, sz] = world.size;
  const models = [CRAB, FISH, PARROT, MONKEY, ...map.anglers.map((a) => person(a.letter))];
  const { heights, clips } = await catalogModels();
  const scales = await modelScales(Object.fromEntries(models.map((m) => [m, heights[m] ?? 1])), Object.fromEntries(models.flatMap((m) => (clips[m] ? [[m, clips[m]]] : []))));
  const scaleOf = (model: string): number => {
    const scale = scales.get(model);
    if (scale === undefined) throw new Error(`${model} is not in content/world/models.json`);
    return scale;
  };
  const used: Cell[] = [];
  const clear = (x: number, z: number, gap = 2): boolean =>
    !map.questSpots.some(([qx, qz]) => Math.hypot(qx - x, qz - z) < LIFE_CLEARANCE + 1) && used.every(([ux, uz]) => Math.hypot(ux - x, uz - z) >= gap);
  /** The top of the ground at a column (feet height), skipping leaves, water and walk-through trunks. */
  const groundTop = (x: number, z: number): { y: number; id: number } => {
    for (let y = sy - 1; y > 0; y--) {
      const id = world.get(x, y, z);
      if (id !== 0 && !map.passable.has(id)) return { y: y + 1, id };
    }
    return { y: 1, id: 0 };
  };
  const onSand = (x: number, z: number): boolean => {
    if (x < 4 || z < 4 || x >= sx - 4 || z >= sz - 4) return false;
    const top = groundTop(x, z);
    return top.id === map.blocks.sand && world.get(x, top.y, z) === 0 && world.get(x, top.y + 1, z) === 0;
  };
  const near = (x: number, z: number, test: (x: number, z: number) => boolean, maxRing: number): Cell | null => {
    for (let r = 0; r <= maxRing; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          if (test(x + dx, z + dz) && clear(x + dx, z + dz)) return [x + dx, z + dz];
        }
      }
    }
    return null;
  };
  const feet = ([x, z]: Cell): Vec => [x + 0.5, groundTop(x, z).y, z + 0.5];
  const water = ([x, z]: Cell): Vec => [x + 0.5, map.waterLevel + 1, z + 0.5];
  const out: Ambient[] = [];
  const add = (id: string, routine: AmbientRoutine, name: string, model: string, position: Vec, spots: Record<string, Vec>, held?: string[]): void => {
    out.push({ id, routine, name, model, scale: +scaleOf(model).toFixed(4), ...(held ? { held } : {}), position, yaw: Math.floor(roll(Math.floor(position[0]), Math.floor(position[2]), 90) * 360), spots });
  };

  map.crabs.forEach(([ax, az], i) => {
    const a = near(ax, az, onSand, 8);
    if (!a) return;
    used.push(a);
    const b = near(a[0] + 3, a[1] + (i % 2 === 0 ? 1 : -1), onSand, 3);
    if (!b) return;
    add(`cua-bien-${i + 1}`, 'crab', CRAB_NAMES[i % CRAB_NAMES.length] ?? 'Cua', CRAB, feet(a), { 'sand-a': feet(a), 'sand-b': feet(b) });
  });
  const sea = (x: number, z: number): boolean => map.isSea(x, z) && map.isSea(x + 1, z) && map.isSea(x, z + 1) && world.get(x, map.waterLevel, z) === map.blocks.water;
  map.fish.forEach(([ax, az], i) => {
    const a = near(ax, az, sea, 6);
    if (!a) return;
    used.push(a);
    const b = near(a[0] + 4, a[1] + 2, sea, 4) ?? a;
    add(`ca-bien-${i + 1}`, 'fish', FISH_NAMES[i % FISH_NAMES.length] ?? 'Cá', FISH, water(a), { 'leap-a': water(a), 'leap-b': water(b) });
  });
  const palmTop = (p: { x: number; z: number; height: number }): Vec => [p.x + 0.5, groundTop(p.x, p.z).y + p.height * 0.92, p.z + 0.5];
  map.parrots.forEach(([ax, az], i) => {
    const ranked = [...map.palms].filter((p) => clear(p.x, p.z, 4)).sort((p, q) => Math.hypot(p.x - ax, p.z - az) - Math.hypot(q.x - ax, q.z - az));
    const [first, second] = ranked;
    if (!first || !second || Math.hypot(first.x - ax, first.z - az) > 30) return;
    used.push([first.x, first.z]);
    const perch = palmTop(first);
    add(`vet-dao-${i + 1}`, 'parrot', PARROT_NAMES[i % PARROT_NAMES.length] ?? 'Vẹt', PARROT, perch, { 'perch-a': perch, 'perch-b': palmTop(second), sky: [perch[0] + 2, perch[1] + 5, perch[2] - 2] });
  });
  const onLand = (x: number, z: number): boolean => {
    if (x < 4 || z < 4 || x >= sx - 4 || z >= sz - 4 || map.isSea(x, z)) return false;
    const top = groundTop(x, z);
    return top.id !== 0 && top.id !== map.blocks.water && world.get(x, top.y, z) === 0 && world.get(x, top.y + 1, z) === 0;
  };
  const palmsOnLand = map.palms.filter((p, i) => i % MONKEY_EVERY === 0 && clear(p.x, p.z, 4)).slice(0, MONKEYS);
  palmsOnLand.forEach((palm, i) => {
    const home = near(palm.x + 1, palm.z, onLand, 3);
    if (!home) return;
    used.push(home);
    const others = map.palms.filter((p) => p !== palm && Math.hypot(p.x - palm.x, p.z - palm.z) < 14);
    const toward = (k: number, dx: number, dz: number): Cell => {
      const other = others[k];
      return near(other ? other.x + 1 : home[0] + dx, other ? other.z : home[1] + dz, onLand, 3) ?? home;
    };
    add(`khi-dao-${i + 1}`, 'monkey', MONKEY_NAMES[i % MONKEY_NAMES.length] ?? 'Khỉ', MONKEY, feet(home), { 'graze-a': feet(toward(0, 4, 2)), 'graze-b': feet(toward(1, -3, 4)) });
  });
  map.anglers.forEach((angler, i) => {
    const [bx, bz] = angler.bank;
    if (!clear(bx, bz, 1)) return;
    used.push(angler.bank);
    const bank = feet(angler.bank);
    add(`ngu-dan-${i + 1}`, 'fisher', angler.name, person(angler.letter), bank, { bank, water: water(angler.water) }, [ROD, CAUGHT]);
  });
  return out;
}
