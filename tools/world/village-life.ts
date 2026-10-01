// Everyday life of a wide map (`ambients` in entities.json): the people at their trades and the farm animals
// of each district, placed from a short cast list (who, which trade, where they live, what they hold). Each
// gets a home on open ground near its anchor and the places its routine uses (everyday-routines.ts in the
// web app: `work-a`, `work-b`, `work-c` and `focus` for people, `graze-a`, `graze-b` for animals), each a
// straight clear walk from home, off the paths and away from every quest target. Deterministic for a seed.
import type { VoxelWorld } from '../../packages/voxel/src/chunk-format';
import type { Ambient, AmbientRoutine } from '../../packages/voxel/src/world-entities';
import { PACK } from './map-kit';
import { createRng } from './noise';

/** Quest targets keep this far from any home or work place (as in the forest, forest-life.ts). */
export const LIFE_CLEARANCE = 5;

const PEOPLE = 'packs/kenney-blocky-characters/2.0';
/** Standing heights of the models life uses (merged into a map's model heights). */
export const LIFE_HEIGHTS: Readonly<Record<string, number>> = {
  ...Object.fromEntries('abcdefghijklmnopqr'.split('').map((k) => [`${PEOPLE}/character-${k}.glb`, 1.75])),
  [`${PACK.pets}/animal-cow.glb`]: 1.5,
  [`${PACK.pets}/animal-pig.glb`]: 0.9,
  [`${PACK.pets}/animal-dog.glb`]: 0.9,
  [`${PACK.pets}/animal-cat.glb`]: 0.7,
  [`${PACK.pets}/animal-chick.glb`]: 0.5,
};
export const LIFE_CLIPS: Readonly<Record<string, string>> = Object.fromEntries(Object.keys(LIFE_HEIGHTS).map((m) => [m, 'idle']));

/** A person model by letter (Kenney Blocky Characters), for a cast list. */
export const person = (letter: string): string => `${PEOPLE}/character-${letter}.glb`;
export const animal = (kind: 'cow' | 'pig' | 'dog' | 'cat' | 'chick'): string => `${PACK.pets}/animal-${kind}.glb`;

/** Animals graze between two spots (chicks only peck round home and need none). */
const ANIMALS = new Set<AmbientRoutine>(['cow', 'pig', 'dog', 'cat', 'chick']);

export interface Resident {
  routine: AmbientRoutine;
  /** Shown on the prompt ("Bác bán rau"). */
  name: string;
  model: string;
  /** Manifest models the person holds, the everyday tool first. */
  held?: readonly string[];
  /** Where they live and work round (block column). */
  at: readonly [number, number];
  /** What they face at work (a counter, a cow); default: their first work place. */
  facing?: readonly [number, number];
  scale?: number;
}

export interface LifeGround {
  world: VoxelWorld;
  surface(x: number, z: number): number;
  standY(x: number, z: number): number;
  onPath(x: number, z: number): boolean;
  inWater(x: number, z: number): boolean;
  /** Quest targets of every chapter (x, z). */
  questSpots: ReadonlyArray<readonly [number, number]>;
  scaleOf(model: string): number;
}

type Cell = { x: number; z: number };

export function placeVillageLife(ground: LifeGround, cast: readonly Resident[], seed: number): Ambient[] {
  const { world, surface } = ground;
  const [sx, , sz] = world.size;
  const rng = createRng(seed);
  const used = new Set<string>();
  const nearQuest = (x: number, z: number): boolean => ground.questSpots.some(([qx, qz]) => Math.hypot(qx - (x + 0.5), qz - (z + 0.5)) < LIFE_CLEARANCE);
  /** Open ground: two free blocks above a solid top, off the paths and the water, clear of quests. */
  const open = (x: number, z: number): boolean => {
    if (x < 12 || z < 12 || x >= sx - 12 || z >= sz - 12 || used.has(`${x},${z}`)) return false;
    if (ground.onPath(x, z) || ground.inWater(x, z) || nearQuest(x, z)) return false;
    const y = surface(x, z);
    return world.get(x, y, z) !== 0 && world.get(x, y + 1, z) === 0 && world.get(x, y + 2, z) === 0;
  };
  /** A straight walk with no wall, no water and no step higher than one block. */
  const clearWalk = (a: Cell, b: Cell): boolean => {
    const steps = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) * 2);
    let lastY = surface(a.x, a.z);
    for (let i = 1; i <= steps; i++) {
      const x = Math.round(a.x + ((b.x - a.x) * i) / steps);
      const z = Math.round(a.z + ((b.z - a.z) * i) / steps);
      const y = surface(x, z);
      if (Math.abs(y - lastY) > 1 || world.get(x, y + 1, z) !== 0 || world.get(x, y + 2, z) !== 0 || ground.inWater(x, z)) return false;
      lastY = y;
    }
    return true;
  };
  const nearest = (x: number, z: number, from?: Cell, maxRing = 10): Cell | null => {
    for (let r = 0; r <= maxRing; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          const c = { x: Math.round(x) + dx, z: Math.round(z) + dz };
          if (!open(c.x, c.z) || (from && !clearWalk(from, c))) continue;
          used.add(`${c.x},${c.z}`);
          return c;
        }
      }
    }
    return null;
  };
  const at = (c: Cell): [number, number, number] => [c.x + 0.5, ground.standY(c.x, c.z), c.z + 0.5];

  const out: Ambient[] = [];
  const counts = new Map<string, number>();
  for (const resident of cast) {
    const home = nearest(resident.at[0], resident.at[1]);
    if (!home) continue; // crowded ground: this one stays home today
    const isAnimal = ANIMALS.has(resident.routine);
    const names = isAnimal ? ['graze-a', 'graze-b'] : ['work-a', 'work-b', 'work-c'];
    const spots: Record<string, [number, number, number]> = {};
    for (const name of names) {
      const a = rng() * Math.PI * 2;
      const r = (isAnimal ? 4 : 3) + rng() * 4;
      const c = nearest(home.x + Math.cos(a) * r, home.z + Math.sin(a) * r, home, 4) ?? home;
      spots[name] = at(c);
    }
    if (!isAnimal) {
      const [fx, fz] = resident.facing ?? [spots['work-a']?.[0] ?? home.x, (spots['work-a']?.[2] ?? home.z) + 1];
      spots.focus = [fx + (resident.facing ? 0.5 : 0), ground.standY(Math.floor(fx), Math.floor(fz)) + 0.8, fz + (resident.facing ? 0.5 : 0)];
    }
    const n = (counts.get(resident.routine) ?? 0) + 1;
    counts.set(resident.routine, n);
    out.push({
      id: `${resident.routine}-${n}`,
      routine: resident.routine,
      name: resident.name,
      model: resident.model,
      scale: +(ground.scaleOf(resident.model) * (resident.scale ?? 1)).toFixed(4),
      ...(resident.held ? { held: [...resident.held] } : {}),
      position: at(home),
      yaw: Math.floor(rng() * 360),
      spots,
    });
  }
  return out;
}

/**
 * `count` residents of one trade spread on a ring round (x, z), at `radius` blocks, their names and
 * models taken in turn from the lists (a crowd of planters on a paddy, of hens round a yard).
 */
export function crowd(
  routine: AmbientRoutine,
  names: readonly string[],
  models: readonly string[],
  center: readonly [number, number],
  radius: number,
  count: number,
  held?: readonly string[],
): Resident[] {
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2 + radius;
    return {
      routine,
      name: names[i % names.length] ?? names[0] ?? routine,
      model: models[i % models.length] ?? models[0] ?? '',
      at: [Math.round(center[0] + Math.cos(a) * radius), Math.round(center[1] + Math.sin(a) * radius)] as const,
      ...(held ? { held } : {}),
    };
  });
}
