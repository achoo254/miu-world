// Block structures of the school map (designs/truong-hoc/, docs/design-truong-hoc.md): the street with its
// crosswalk, the campus wall and gate, lamp posts, the two-storey main building with its clock tower,
// galleries, a furnished classroom on each floor and the staircase between them, the sports hall with its
// blue vaulted roof, the basketball court, the greenhouse, raised beds and the swings. Coordinates are
// inclusive block columns; the front of every building faces -z (the street side).
import { put, type WorldWriter } from './world-writer';

export interface SchoolPalette {
  wall: number;
  trim: number;
  roof: number;
  floor: number;
  glass: number;
  board: number;
  light: number;
  stone: number;
  brick: number;
  asphalt: number;
  line: number;
  court: number;
  roofBlue: number;
  log: number;
  door: number;
  grass: number;
  dirt: number;
  sand: number;
}

/** Fills a box of one block (inclusive bounds). */
export function fill(world: WorldWriter, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, id: number): void {
  for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) put(world, x, y, z, id);
}

/** The street from x0 to x1 between z0 and z1 at `y`: asphalt, a dashed middle line and a zebra crossing. */
export function placeStreet(world: WorldWriter, x0: number, x1: number, z0: number, z1: number, y: number, crossing: readonly [number, number], b: SchoolPalette): void {
  const middle = Math.floor((z0 + z1) / 2);
  for (let x = x0; x <= x1; x++) {
    for (let z = z0; z <= z1; z++) {
      const zebra = x >= crossing[0] && x <= crossing[1] && (x - crossing[0]) % 2 === 0;
      const dash = z === middle && x % 4 < 2 && !(x >= crossing[0] && x <= crossing[1]);
      put(world, x, y, z, zebra || dash ? b.line : b.asphalt);
    }
  }
}

/** A street lamp: a stone post four high with a glass lantern on top. */
export function placeLamp(world: WorldWriter, x: number, baseY: number, z: number, b: SchoolPalette): void {
  fill(world, x, baseY, z, x, baseY + 3, z, b.stone);
  put(world, x, baseY + 4, z, b.light);
}

/**
 * The campus wall around x0..x1, z0..z1: a low stone wall with taller pillars every four blocks, open at
 * `gate` (x from..to on the front side) between two broad gate pillars topped with lanterns.
 */
export function placeCampusWall(world: WorldWriter, x0: number, x1: number, z0: number, z1: number, baseY: (x: number, z: number) => number, gate: readonly [number, number], b: SchoolPalette): void {
  const onWall = (x: number, z: number) => x === x0 || x === x1 || z === z0 || z === z1;
  for (let x = x0; x <= x1; x++) {
    for (let z = z0; z <= z1; z++) {
      if (!onWall(x, z)) continue;
      if (z === z0 && x >= gate[0] && x <= gate[1]) continue;
      const y = baseY(x, z);
      put(world, x, y, z, b.brick);
      if ((x - x0) % 4 === 0 && (z - z0) % 4 === 0) {
        put(world, x, y + 1, z, b.stone);
        put(world, x, y + 2, z, b.trim);
      }
    }
  }
  for (const px of [gate[0] - 2, gate[1] + 1]) {
    fill(world, px, baseY(px, z0), z0, px + 1, baseY(px, z0) + 4, z0 + 1, b.stone);
    put(world, px, baseY(px, z0) + 5, z0, b.light);
    put(world, px + 1, baseY(px, z0) + 5, z0, b.light);
  }
}

export interface MainBuildingSpec {
  x0: number;
  x1: number;
  /** Front gallery row (two deep: zFront, zFront + 1); the body's front wall is zFront + 2. */
  zFront: number;
  /** Body's back wall; the back gallery is the two rows behind it. */
  zBack: number;
  /** Top of the plinth the building stands on (one above the ground). */
  floorY: number;
}

/** Where things of the main building are, for props, entities and tests. */
export interface MainBuilding {
  /** Ground-floor entrance hall, open from the front gallery to the back gallery. */
  hall: { x0: number; x1: number };
  /** The furnished classroom of each floor (inner cells) and the y a child stands at in it. */
  classrooms: Array<{ x0: number; x1: number; z0: number; z1: number; standY: number }>;
  /** Clock face position on the tower front (centre, y of its bottom). */
  clock: [number, number, number];
  /** Bookshelf tops (books go here) and the teacher's desk tops (a globe, an abacus). */
  shelves: Array<[number, number, number]>;
  desks: Array<[number, number, number]>;
  /** A pot plant at the foot of the staircase. */
  plant: [number, number, number];
  /** The top step of the staircase: standing here is the second floor. */
  stairTop: [number, number, number];
}

const STOREY = 4;
/** Wall-to-wall width of a classroom. */
const ROOM = 9;

/**
 * The two-storey main building (mock lop-01..07, nha-01..05): yellow walls, white posts and bands, red tiles;
 * galleries in front and behind on white posts, the upper front gallery with a railing; an entrance hall
 * through the middle under the clock tower; a furnished classroom on each floor west of the hall, a
 * staircase east of it; every other room shut behind a door.
 */
export function placeMainBuilding(world: WorldWriter, spec: MainBuildingSpec, b: SchoolPalette): MainBuilding {
  const { x0, x1, zFront, zBack, floorY } = spec;
  const zWall = zFront + 2;
  const zRear = zBack + 2;
  const mid = Math.floor((x0 + x1) / 2);
  const hall = { x0: mid - 3, x1: mid + 3 };
  const g = floorY + 1; // ground-floor feet
  const slab = floorY + STOREY; // the floor between the storeys
  const u = slab + 1; // upper-floor feet
  const ceiling = slab + STOREY; // the upper ceiling, under the roof
  // Plinth under the whole footprint and a step along the front.
  fill(world, x0 - 1, floorY, zFront - 1, x1 + 1, floorY, zRear, b.stone);
  fill(world, hall.x0, floorY, zFront - 2, hall.x1, floorY, zFront - 2, b.stone);

  // Body walls with windows on both storeys and a white band at the upper floor.
  for (let x = x0; x <= x1; x++) {
    for (let z = zWall; z <= zBack; z++) {
      const edgeX = x === x0 || x === x1;
      const edgeZ = z === zWall || z === zBack;
      if (!edgeX && !edgeZ) continue;
      for (let y = g; y < ceiling; y++) {
        const level = y < slab ? y - g : y - u;
        const isSlab = y === slab;
        const window = !isSlab && (level === 1 || level === 2) && (edgeZ ? (x - x0) % 3 === 1 : (z - zWall) % 3 === 1) && !(edgeX && edgeZ);
        put(world, x, y, z, isSlab || (edgeX && edgeZ) ? b.trim : window ? b.glass : b.wall);
      }
    }
  }
  // Floors inside: the slab between storeys and the upper ceiling, with lights.
  for (let x = x0 + 1; x < x1; x++) {
    for (let z = zWall + 1; z < zBack; z++) {
      const lamp = (x - x0) % 4 === 2 && (z - zWall) % 3 === 2;
      put(world, x, slab, z, lamp ? b.light : b.floor);
      put(world, x, ceiling, z, lamp ? b.light : b.floor);
    }
  }
  // Inner walls between rooms, both storeys, and the hall's side walls.
  // Rooms ROOM blocks apart; a room is at least four blocks wide (no wall closer to the hall or the end wall).
  const westWalls: number[] = [];
  const eastWalls: number[] = [];
  for (let x = x0 + ROOM; x < hall.x0 - 5; x += ROOM) westWalls.push(x);
  for (let x = hall.x1 + 6; x < x1 - 4; x += ROOM) eastWalls.push(x);
  for (const x of [...westWalls, ...eastWalls, hall.x0 - 1, hall.x1 + 1]) fill(world, x, g, zWall + 1, x, ceiling - 1, zBack - 1, b.wall);
  // Wooden floors in the rooms and the hall (the stone plinth shows only outside).
  fill(world, x0 + 1, floorY, zWall + 1, x1 - 1, floorY, zBack - 1, b.floor);
  for (const x of [hall.x0 - 1, hall.x1 + 1]) fill(world, x, slab, zWall + 1, x, slab, zBack - 1, b.trim);

  // The entrance hall: open front and back on the ground floor, floor-to-slab.
  fill(world, hall.x0, g, zWall, hall.x1, slab - 1, zWall, 0);
  fill(world, hall.x0, g, zBack, hall.x1, slab - 1, zBack, 0);

  // Galleries in front and behind: posts every third block, the upper floor, a railing on the front one.
  for (const [z0, z1, outer] of [[zFront, zFront + 1, zFront], [zBack + 1, zRear, zRear]] as const) {
    for (let x = x0 - 1; x <= x1 + 1; x++) {
      const post = (x - x0) % 3 === 0 || x === x0 - 1 || x === x1 + 1;
      if (post) fill(world, x, g, outer, x, ceiling - 1, outer, b.trim);
      for (let z = z0; z <= z1; z++) put(world, x, slab, z, b.floor);
      if (!post) put(world, x, u, outer, b.log);
    }
  }
  // Doors: classrooms open onto the galleries; every other room is shut.
  const between = (walls: readonly number[]) => walls.slice(0, -1).map((start, i) => ({ start: start + 1, end: (walls[i + 1] ?? start) - 1 }));
  const westRooms = between([x0, ...westWalls, hall.x0 - 1]);
  const eastRooms = between([hall.x1 + 1, ...eastWalls, x1]);
  // The furnished classroom is the west room next to the hall.
  const showcase = westRooms.at(-1) ?? { start: x0 + 1, end: hall.x0 - 2 };
  const stairRoom = eastRooms[0] ?? { start: hall.x1 + 2, end: hall.x1 + 6 };
  for (const floor of [g, u]) {
    for (const room of [...westRooms, ...eastRooms]) {
      const dx = Math.floor((room.start + room.end) / 2);
      const open = room === showcase || (room === stairRoom && floor === u);
      fill(world, dx, floor, zWall, dx + 1, floor + 1, zWall, open ? 0 : b.door);
    }
  }
  // The staircase room opens onto the hall on the ground floor, onto a flat landing before the first step
  // (a step under the door's lintel would leave no headroom).
  const firstStep = zWall + 3;
  fill(world, hall.x1 + 1, g, firstStep - 2, hall.x1 + 1, g + 1, firstStep - 1, 0);

  // Staircase: four steps north, then the upper floor; the slab is open above the lower steps.
  const sx0 = stairRoom.start;
  const sx1 = Math.min(stairRoom.start + 2, stairRoom.end);
  for (let i = 0; i < STOREY; i++) {
    const z = firstStep + i;
    fill(world, sx0, floorY + 1 + i, z, sx1, floorY + 1 + i, z, b.floor);
    if (i < STOREY - 1) fill(world, sx0, slab, z, sx1, slab, z, 0);
    fill(world, sx0, floorY + 2 + i, z, sx1, floorY + 3 + i, z, 0);
  }
  put(world, sx1 + 1, u + 2, zBack, b.glass);
  const stairTop: [number, number, number] = [sx0 + 0.5, slab + 1, firstStep + STOREY - 1 + 0.5];

  // Furnished classrooms: the board on the west wall, the teacher's desk, rows of desks and stools,
  // bookshelves in the corners.
  const classrooms: MainBuilding['classrooms'] = [];
  const shelves: MainBuilding['shelves'] = [];
  const desks: MainBuilding['desks'] = [];
  for (const feet of [g, u]) {
    const room = { x0: showcase.start, x1: showcase.end, z0: zWall + 1, z1: zBack - 1, standY: feet };
    classrooms.push(room);
    fill(world, room.x0 - 1, feet + 1, room.z0 + 1, room.x0 - 1, feet + 2, room.z1 - 1, b.board);
    put(world, room.x0 + 1, feet, room.z0 + 2, b.floor);
    desks.push([room.x0 + 1.5, feet + 1, room.z0 + 2.5]);
    for (let x = room.x0 + 3; x < room.x1; x += 2) {
      for (let z = room.z0 + 1; z < room.z1; z += 2) {
        put(world, x, feet, z, b.floor);
        put(world, x + 1, feet, z, b.log);
      }
    }
    for (const z of [room.z0, room.z1]) {
      fill(world, room.x1, feet, z, room.x1, feet + 1, z, b.floor);
      shelves.push([room.x1 + 0.5, feet + 2, z + 0.5]);
    }
  }

  // The clock tower over the hall: walls above the roof line, a gable facing the street, the clock face.
  const tz0 = zFront;
  const tz1 = zFront + 5;
  const roofBase = ceiling + 1;
  const towerTop = roofBase + 6;
  for (let x = hall.x0 - 1; x <= hall.x1 + 1; x++) {
    for (let z = tz0; z <= tz1; z++) {
      const edge = x === hall.x0 - 1 || x === hall.x1 + 1 || z === tz0 || z === tz1;
      if (edge) fill(world, x, roofBase, z, x, towerTop, z, x === hall.x0 - 1 || x === hall.x1 + 1 ? b.trim : b.wall);
    }
  }
  const half = Math.floor((hall.x1 - hall.x0 + 2) / 2);
  for (let k = 0; k <= half; k++) {
    for (let z = tz0 - 1; z <= tz1 + 1; z++) {
      for (const x of [hall.x0 - 1 + k, hall.x1 + 1 - k]) put(world, x, towerTop + 1 + k, z, b.roof);
    }
    for (let x = hall.x0 + k; x <= hall.x1 - k; x++) if (k < half) put(world, x, towerTop + 1 + k, tz0, b.wall);
  }
  const clock: [number, number, number] = [mid + 0.5, roofBase + 1, tz0 - 0.4];

  // Main roof: a red gable along x over the body and both galleries.
  const r0 = zFront - 1;
  const r1 = zRear + 1;
  for (let z = r0; z <= r1; z++) {
    const step = Math.min(z - r0, r1 - z);
    const y = roofBase + Math.floor(step * 0.75);
    for (let x = x0 - 2; x <= x1 + 2; x++) {
      if (x >= hall.x0 - 1 && x <= hall.x1 + 1 && z >= tz0 && z <= tz1) continue;
      put(world, x, y, z, b.roof);
      if ((x === x0 || x === x1) && z >= zWall && z <= zBack) for (let fy = roofBase; fy < y; fy++) put(world, x, fy, z, b.wall);
    }
  }
  return { hall, classrooms, clock, shelves, desks, plant: [hall.x1 + 1.5, g, zBack - 0.5], stairTop };
}

/** The sports hall (mock khu-04): pale stone walls with windows, a wide door, a blue vaulted roof, a stage inside. */
export function placeSportsHall(world: WorldWriter, x0: number, x1: number, z0: number, z1: number, baseY: number, b: SchoolPalette): void {
  const wallTop = baseY + 4;
  for (let x = x0; x <= x1; x++) {
    for (let z = z0; z <= z1; z++) {
      const edge = x === x0 || x === x1 || z === z0 || z === z1;
      put(world, x, baseY - 1, z, b.floor);
      if (!edge) continue;
      for (let y = baseY; y <= wallTop; y++) {
        const door = z === z0 && Math.abs(x - (x0 + x1) / 2) < 2.5 && y < baseY + 3;
        const window = y === baseY + 2 && (x - x0) % 3 === 1 && z !== z0;
        if (door) continue;
        put(world, x, y, z, window ? b.glass : b.stone);
      }
    }
  }
  // Vault across z: a half circle over the width, running the hall's length.
  const r = (z1 - z0) / 2;
  const cz = (z0 + z1) / 2;
  for (let z = z0 - 1; z <= z1 + 1; z++) {
    const h = Math.round(Math.sqrt(Math.max(0, (r + 1) * (r + 1) - (z - cz) * (z - cz))) * 0.8);
    for (let x = x0 - 1; x <= x1 + 1; x++) {
      put(world, x, wallTop + h, z, b.roofBlue);
      if ((x === x0 || x === x1) && z > z0 && z < z1) for (let y = wallTop + 1; y < wallTop + h; y++) put(world, x, y, z, b.stone);
    }
  }
  fill(world, x0 + 2, baseY, z1 - 3, x1 - 2, baseY, z1 - 1, b.floor);
}

/** A basketball court: coloured floor, white border and middle line, a hoop at each end. */
export function placeCourt(world: WorldWriter, x0: number, x1: number, z0: number, z1: number, y: number, b: SchoolPalette): void {
  const mz = Math.floor((z0 + z1) / 2);
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) put(world, x, y, z, x === x0 || x === x1 || z === z0 || z === z1 || z === mz ? b.line : b.court);
  const mx = Math.floor((x0 + x1) / 2);
  for (const [z, inward] of [[z0 - 1, 1], [z1 + 1, -1]] as const) {
    fill(world, mx, y + 1, z, mx, y + 4, z, b.stone);
    fill(world, mx - 1, y + 4, z + inward, mx + 1, y + 5, z + inward, b.line);
  }
}

/** The greenhouse (mock khu-06): glass walls and gable on white posts, a door in front, beds inside. */
export function placeGreenhouse(world: WorldWriter, x0: number, x1: number, z0: number, z1: number, baseY: number, b: SchoolPalette): void {
  const top = baseY + 3;
  for (let x = x0; x <= x1; x++) {
    for (let z = z0; z <= z1; z++) {
      const edgeX = x === x0 || x === x1;
      const edgeZ = z === z0 || z === z1;
      if (!edgeX && !edgeZ) continue;
      for (let y = baseY; y <= top; y++) {
        const door = z === z0 && Math.abs(x - (x0 + x1) / 2) < 1 && y < baseY + 2;
        if (door) continue;
        put(world, x, y, z, (edgeX && edgeZ) || (x - x0) % 3 === 0 ? b.trim : b.glass);
      }
    }
  }
  const half = Math.floor((z1 - z0 + 2) / 2);
  for (let k = 0; k <= half; k++) for (let x = x0 - 1; x <= x1 + 1; x++) for (const z of [z0 - 1 + k, z1 + 1 - k]) put(world, x, top + 1 + k, z, x % 3 === 0 ? b.trim : b.glass);
  for (let x = x0 + 2; x <= x1 - 2; x += 3) fill(world, x, baseY, z0 + 2, x + 1, baseY, z1 - 2, b.dirt);
}

/** A raised bed: a plank rim one block high around soil; returns the soil cells (crops stand on them). */
export function placeBed(world: WorldWriter, x0: number, x1: number, z0: number, z1: number, y: number, b: SchoolPalette): Array<[number, number]> {
  const soil: Array<[number, number]> = [];
  for (let x = x0; x <= x1; x++) {
    for (let z = z0; z <= z1; z++) {
      const rim = x === x0 || x === x1 || z === z0 || z === z1;
      if (rim) put(world, x, y, z, b.floor);
      else {
        put(world, x, y - 1, z, b.dirt);
        soil.push([x, z]);
      }
    }
  }
  return soil;
}

/** Swings (mock khu-05): two posts and a beam, seats hanging between. */
export function placeSwings(world: WorldWriter, x0: number, z: number, baseY: number, b: SchoolPalette): void {
  for (const x of [x0, x0 + 4]) fill(world, x, baseY, z, x, baseY + 3, z, b.roofBlue);
  fill(world, x0, baseY + 4, z, x0 + 4, baseY + 4, z, b.roofBlue);
  for (const x of [x0 + 1, x0 + 3]) put(world, x, baseY + 1, z, b.floor);
}

/** A bench: three planks on log legs. */
export function placeBench(world: WorldWriter, x0: number, z: number, baseY: number, b: SchoolPalette): void {
  fill(world, x0, baseY, z, x0 + 2, baseY, z, b.floor);
}
