// Block structures of the school map (designs/truong-hoc/, docs/design-truong-hoc.md): the street with its
// crosswalk, the campus wall and gate, lamp posts, the two-storey main building with its clock tower,
// galleries, rows of furnished classrooms on both floors and the staircase between them, the sports hall
// with its blue vaulted roof, the basketball court, the greenhouse, raised beds and the swings. Coordinates are
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
  /** A glowing lantern block (gate pillars, corridor lights); the pillars' `light` when none. */
  lantern?: number;
  /** The campus wall above its first course as iron bars with panes between (c-02's railing); brick when none. */
  railing?: { bar: number; pane: number };
  /**
   * The main building's upper floor and its top ceiling, when unlike the ground floor's boards (`floor`): a
   * map reads its ways off the ground floor, the stairs leading up from it.
   */
  loft?: number;
  ceiling?: number;
  /** The street's dashed middle line, when unlike the crossing's stripes (`line`): pale stones read as part of the road. */
  dash?: number;
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
      put(world, x, y, z, zebra ? b.line : dash ? (b.dash ?? b.line) : b.asphalt);
    }
  }
}

/**
 * The campus wall around x0..x1, z0..z1: a stone wall two high with taller pillars every four blocks, open at
 * `gate` (x from..to on the front side) between two broad gate pillars (designs/truong-hoc/c-02: stone, a
 * cap, a lantern on top), and at `backGate` on the back side when given.
 */
export function placeCampusWall(world: WorldWriter, x0: number, x1: number, z0: number, z1: number, baseY: (x: number, z: number) => number, gate: readonly [number, number], b: SchoolPalette, backGate?: readonly [number, number]): void {
  const onWall = (x: number, z: number) => x === x0 || x === x1 || z === z0 || z === z1;
  for (let x = x0; x <= x1; x++) {
    for (let z = z0; z <= z1; z++) {
      if (!onWall(x, z)) continue;
      if (z === z0 && x >= gate[0] && x <= gate[1]) continue;
      if (backGate && z === z1 && x >= backGate[0] && x <= backGate[1]) continue;
      const y = baseY(x, z);
      // Three blocks high: the child climbs two blocks on her own, so the wall keeps her in the campus.
      const pillar = (x - x0) % 4 === 0 && (z - z0) % 4 === 0;
      for (let h = 0; h < 3; h++) put(world, x, y + h, z, pillar || h === 0 || !b.railing ? (pillar ? b.stone : b.brick) : (x + z) % 2 === 0 ? b.railing.bar : b.railing.pane);
      if (pillar) {
        put(world, x, y + 3, z, b.stone);
        put(world, x, y + 4, z, b.trim);
      }
    }
  }
  const pillars: Array<[number, number]> = [...[gate[0] - 2, gate[1] + 1].map((px): [number, number] => [px, z0]), ...(backGate ? [backGate[0] - 2, backGate[1] + 1].map((px): [number, number] => [px, z1 - 1]) : [])];
  for (const [px, pz] of pillars) {
    const y = baseY(px, pz);
    fill(world, px, y, pz, px + 1, y + 3, pz, b.stone);
    fill(world, px, y + 4, pz, px + 1, y + 4, pz, b.trim);
    put(world, px + (px < gate[0] ? 0 : 1), y + 5, pz, b.lantern ?? b.light);
  }
}

export type FurnitureKind = 'desk' | 'chair' | 'teacher-desk' | 'teacher-chair' | 'bookcase' | 'lamp' | 'plant' | 'bin' | 'globe';

export interface MainBuildingSpec {
  x0: number;
  x1: number;
  /** Front gallery row (two deep: zFront, zFront + 1); the body's front wall is zFront + 2. */
  zFront: number;
  /** Body's back wall; the back gallery is the two rows behind it. */
  zBack: number;
  /** Top of the plinth the building stands on (one above the ground). */
  floorY: number;
  /**
   * The front gallery closed into a corridor (designs/truong-hoc/c-02, c-17): a wall of windows one block
   * out from its posts' row, the entrance open under the tower, lights in its ceilings.
   */
  corridor?: boolean;
  /** More rooms open onto the gallery and returned to be furnished: east or west of the hall, nth from it, which floor. */
  extraRooms?: ReadonlyArray<{ side: 'east' | 'west'; index: number; upper: boolean }>;
}

/** Where things of the main building are, for props, entities and tests. */
export interface MainBuilding {
  /** Ground-floor entrance hall, open from the front gallery to the back gallery. */
  hall: { x0: number; x1: number };
  /** The furnished classrooms (inner cells) and the y a child stands at in each: the showcase's two floors first, then the others. */
  classrooms: Array<{ x0: number; x1: number; z0: number; z1: number; standY: number }>;
  /** Clock face position on the tower front (centre, y of its bottom). */
  clock: [number, number, number];
  /** Classroom furniture (pack models): where each piece stands (its middle, on the floor) and its yaw. */
  furniture: Array<{ kind: FurnitureKind; at: [number, number, number]; yaw: number }>;
  /** A pot plant in the staircase room's back corner, beside the flight. */
  plant: [number, number, number];
  /** The top step of the staircase: standing here is the second floor. */
  stairTop: [number, number, number];
  /** The staircase room (inner cells) and its floor. */
  stairs: { x0: number; x1: number; z0: number; z1: number; standY: number };
  /** The rooms `extraRooms` asked for, in its order (inner cells) and their floor. */
  extraRooms: Array<{ x0: number; x1: number; z0: number; z1: number; standY: number }>;
}

/**
 * Floor to floor of the main building: the rooms stand five clear under their ceilings, three and a half
 * times the child (owner, 03/10/2026: raise the classrooms' ceilings).
 */
const STOREY = 6;
/** A wall's window rows on a storey: from the second row to the one under the band. */
const windowRow = (level: number): boolean => level >= 1 && level <= STOREY - 2;
/**
 * Wall-to-wall width a classroom aims at (owner, 02/10/2026: rooms many times the child's size, room to move
 * inside): a run of rooms is split into as many as come nearest this.
 */
const ROOM = 13;
/** Inner width of the staircase room: the flight five wide, a landing four wide beside it upstairs. */
const STAIR_ROOM = 9;
const FLIGHT = 5;
/** Every doorway of the building is three wide and as high as a storey's room. */
const DOOR = 3;

/** The rooms of a run of inner cells a..b, as near ROOM apart as fits (wider ones last): their spans and the walls between. */
function splitRooms(a: number, b: number): { rooms: Array<{ start: number; end: number }>; walls: number[] } {
  const n = Math.max(1, Math.round((b - a + 2) / ROOM));
  const cells = b - a + 1 - (n - 1);
  const rooms: Array<{ start: number; end: number }> = [];
  const walls: number[] = [];
  let start = a;
  for (let i = 0; i < n; i++) {
    const end = start + Math.floor(cells / n) + (i >= n - (cells % n) ? 1 : 0) - 1;
    rooms.push({ start, end });
    if (i < n - 1) walls.push(end + 1);
    start = end + 2;
  }
  return { rooms, walls };
}

/**
 * The two-storey main building (mock lop-01..07, nha-01..05): yellow walls, white posts and bands, red tiles;
 * galleries in front and behind on white posts, the upper front gallery with a railing; an entrance hall
 * through the middle under the clock tower; classrooms about ROOM wide on both floors, each furnished and
 * open onto the corridor through a doorway DOOR wide, the showcase the one west of the hall; a staircase
 * room east of the hall, open onto it and the corridor.
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

  // Body walls with windows on both storeys, a white band at the upper floor and one at the ceiling (no gap
  // left between the walls' top and the roof).
  for (let x = x0; x <= x1; x++) {
    for (let z = zWall; z <= zBack; z++) {
      const edgeX = x === x0 || x === x1;
      const edgeZ = z === zWall || z === zBack;
      if (!edgeX && !edgeZ) continue;
      for (let y = g; y <= ceiling; y++) {
        const level = y < slab ? y - g : y - u;
        const isSlab = y === slab || y === ceiling;
        const window = !isSlab && windowRow(level) && (edgeZ ? (x - x0) % 3 === 1 : (z - zWall) % 3 === 1) && !(edgeX && edgeZ);
        put(world, x, y, z, isSlab || (edgeX && edgeZ) ? b.trim : window ? b.glass : b.wall);
      }
    }
  }
  // Floors inside: the slab between storeys and the upper ceiling, with lights.
  for (let x = x0 + 1; x < x1; x++) {
    for (let z = zWall + 1; z < zBack; z++) {
      const lamp = (x - x0) % 4 === 2 && (z - zWall) % 3 === 2;
      put(world, x, slab, z, lamp ? b.light : (b.loft ?? b.floor));
      put(world, x, ceiling, z, lamp ? b.light : (b.ceiling ?? b.floor));
    }
  }
  // Inner walls between rooms, both storeys, and the hall's side walls: west of the hall classrooms about
  // ROOM wide; east of it the staircase room, then rooms about ROOM wide.
  const west = splitRooms(x0 + 1, hall.x0 - 2);
  const stairRoom = { start: hall.x1 + 2, end: hall.x1 + 1 + STAIR_ROOM };
  const east = splitRooms(stairRoom.end + 2, x1 - 1);
  const westRooms = west.rooms;
  const eastRooms = [stairRoom, ...east.rooms];
  for (const x of [...west.walls, stairRoom.end + 1, ...east.walls, hall.x0 - 1, hall.x1 + 1]) fill(world, x, g, zWall + 1, x, ceiling - 1, zBack - 1, b.wall);
  // Wooden floors in the rooms and the hall (the stone plinth shows only outside).
  fill(world, x0 + 1, floorY, zWall + 1, x1 - 1, floorY, zBack - 1, b.floor);
  for (const x of [hall.x0 - 1, hall.x1 + 1]) fill(world, x, slab, zWall + 1, x, slab, zBack - 1, b.trim);

  // The entrance hall: open front and back on the ground floor, floor-to-slab.
  fill(world, hall.x0, g, zWall, hall.x1, slab - 1, zWall, 0);
  fill(world, hall.x0, g, zBack, hall.x1, slab - 1, zBack, 0);

  // Galleries in front and behind: posts every third block, the upper floor, a railing on the front one.
  // With `corridor` the front one is a hall of windows instead (below).
  const galleries = spec.corridor ? ([[zBack + 1, zRear, zRear]] as const) : ([[zFront, zFront + 1, zFront], [zBack + 1, zRear, zRear]] as const);
  for (const [z0, z1, outer] of galleries) {
    for (let x = x0 - 1; x <= x1 + 1; x++) {
      const post = (x - x0) % 3 === 0 || x === x0 - 1 || x === x1 + 1;
      if (post) fill(world, x, g, outer, x, ceiling - 1, outer, b.trim);
      for (let z = z0; z <= z1; z++) put(world, x, slab, z, b.loft ?? b.floor);
      if (!post) put(world, x, u, outer, b.log);
    }
  }
  if (spec.corridor) {
    // The front corridor: its outer wall two blocks out from the old posts' row (the corridor three wide), white
    // pilasters every third block and windows between on both floors, a band at the upper floor, the
    // entrance open under the tower; its floor, its upper floor and ceiling with lights every fourth block.
    const zOut = zFront - 2;
    fill(world, x0 - 2, floorY, zOut - 1, x1 + 2, floorY, zFront + 1, b.stone);
    for (let x = x0 - 2; x <= x1 + 2; x++) {
      const end = x === x0 - 2 || x === x1 + 2;
      for (let y = g; y <= ceiling; y++) {
        const isSlab = y === slab || y === ceiling;
        const level = y < slab ? y - g : y - u;
        const pilaster = (x - x0) % 3 === 0 || x <= x0 - 1 || x >= x1 + 1;
        const window = !isSlab && !pilaster && windowRow(level);
        const entrance = x >= hall.x0 && x <= hall.x1 && y < slab;
        put(world, x, y, zOut, entrance ? 0 : isSlab || pilaster ? b.trim : window ? b.glass : b.wall);
        if (end) for (let z = zOut + 1; z <= zFront + 1; z++) put(world, x, y, z, isSlab ? b.trim : windowRow(level) ? b.glass : b.wall);
      }
      if (x <= x0 - 2 || x >= x1 + 2) continue;
      for (let z = zOut + 1; z <= zFront + 1; z++) {
        put(world, x, floorY, z, b.floor);
        const lamp = (x - x0) % 4 === 1 && z === zFront;
        put(world, x, slab, z, lamp ? b.light : (b.loft ?? b.floor));
        put(world, x, ceiling, z, lamp ? b.light : (b.ceiling ?? b.floor));
      }
    }
  }
  // Doors: every room opens onto the corridor (or the front gallery) on both floors through a doorway DOOR
  // wide and a storey's room high, in the middle of its front wall; the hall's upper floor opens front and
  // back (onto the back gallery). No room is left shut.
  // The furnished classroom is the west room next to the hall.
  const showcase = westRooms.at(-1) ?? { start: x0 + 1, end: hall.x0 - 2 };
  const extras = (spec.extraRooms ?? []).map((r) => {
    const list = r.side === 'east' ? eastRooms : [...westRooms].reverse();
    const room = list[r.index];
    if (!room) throw new Error(`main building: no ${r.side} room ${r.index}`);
    return { room, floor: r.upper ? u : g };
  });
  const doorway = (from: number, floor: number, z: number): void => fill(world, from, floor, z, from + DOOR - 1, floor + STOREY - 2, z, 0);
  for (const floor of [g, u]) for (const room of [...westRooms, ...eastRooms]) doorway(Math.floor((room.start + room.end) / 2) - 1, floor, zWall);
  for (const z of [zWall, zBack]) doorway(mid - 1, u, z);
  // The staircase room opens onto the hall on the ground floor too, onto a flat landing DOOR deep before the
  // first step (a step under the opening's lintel would leave no headroom).
  const firstStep = zWall + 1 + DOOR;
  fill(world, hall.x1 + 1, g, zWall + 1, hall.x1 + 1, slab - 1, firstStep - 1, 0);

  // Staircase: a flight FLIGHT wide along the room's west wall, four steps north, then the upper floor; the
  // slab is open above the lower steps, the landing beside the flight upstairs is four wide.
  const sx0 = stairRoom.start;
  const sx1 = Math.min(stairRoom.start + FLIGHT - 1, stairRoom.end);
  for (let i = 0; i < STOREY; i++) {
    const z = firstStep + i;
    fill(world, sx0, floorY + 1 + i, z, sx1, floorY + 1 + i, z, b.floor);
    if (i < STOREY - 1) fill(world, sx0, slab, z, sx1, slab, z, 0);
    fill(world, sx0, floorY + 2 + i, z, sx1, floorY + 3 + i, z, 0);
  }
  // A tall window on the stair well's back wall, both floors (c-18).
  for (let x = sx0; x <= sx1 + 1; x++) for (let y = g + 1; y <= u + 2; y++) put(world, x, y, zBack, y === slab ? b.trim : b.glass);
  const stairTop: [number, number, number] = [sx0 + 0.5, slab + 1, firstStep + STOREY - 1 + 0.5];

  // Furnished classrooms (mock lop-04, lop-05), every room but the staircase and those `extraRooms` took, the
  // showcase first: the board on the west wall; the teacher's desk before it; rows of desks facing the board,
  // a chair behind each, a strip two deep left free along the front wall from the door and an aisle three wide
  // down the middle; bookcases on the back wall; lamps under the ceiling.
  const classrooms: MainBuilding['classrooms'] = [];
  const furniture: MainBuilding['furniture'] = [];
  const facingBoard = 270;
  const taken = (room: { start: number; end: number }, feet: number): boolean => room === stairRoom || extras.some((e) => e.room === room && e.floor === feet);
  const classroomRooms = [showcase, ...westRooms.filter((r) => r !== showcase), ...eastRooms];
  for (const span of classroomRooms) {
    for (const feet of [g, u]) {
      if (taken(span, feet)) continue;
      const room = { x0: span.start, x1: span.end, z0: zWall + 1, z1: zBack - 1, standY: feet };
      classrooms.push(room);
      // The green board in a wooden frame (c-15).
      fill(world, room.x0 - 1, feet, room.z0 + 1, room.x0 - 1, feet + 3, room.z1 - 1, b.trim);
      fill(world, room.x0 - 1, feet + 1, room.z0 + 2, room.x0 - 1, feet + 2, room.z1 - 2, b.board);
      const midZ = (room.z0 + room.z1 + 1) / 2;
      furniture.push({ kind: 'teacher-desk', at: [room.x0 + 1.6, feet, midZ], yaw: 90 });
      furniture.push({ kind: 'teacher-chair', at: [room.x0 + 0.7, feet, midZ], yaw: 90 });
      furniture.push({ kind: 'globe', at: [room.x0 + 1.6, feet + 0.85, midZ - 0.5], yaw: 0 });
      for (let x = room.x0 + 4.5; x <= room.x1 - 1.5; x += 2.6) {
        for (let z = room.z0 + 2.5; z <= room.z1 - 1.5; z += 2) {
          if (Math.abs(z - midZ) < 1.5) continue;
          furniture.push({ kind: 'desk', at: [x, feet, z], yaw: facingBoard });
          furniture.push({ kind: 'chair', at: [x + 0.95, feet, z], yaw: facingBoard });
        }
      }
      for (const z of [room.z0 + 0.6, room.z1 + 0.4]) furniture.push({ kind: 'bookcase', at: [room.x1 + 0.45, feet, z], yaw: facingBoard });
      furniture.push({ kind: 'plant', at: [room.x1 + 0.5, feet, midZ], yaw: 0 });
      furniture.push({ kind: 'bin', at: [room.x0 + 0.5, feet, room.z1 + 0.5], yaw: 0 });
      for (let x = room.x0 + 3; x <= room.x1; x += 4) for (const z of [room.z0 + 2.5, room.z1 - 1.5]) furniture.push({ kind: 'lamp', at: [x + 0.5, feet + STOREY - 1.55, z], yaw: 0 });
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
  // The tower is no room: solid inside, under its gable.
  fill(world, hall.x0, roofBase, tz0 + 1, hall.x1, towerTop, tz1 - 1, b.wall);
  const half = Math.floor((hall.x1 - hall.x0 + 2) / 2);
  for (let k = 0; k <= half; k++) {
    for (let z = tz0 - 1; z <= tz1 + 1; z++) {
      for (const x of [hall.x0 - 1 + k, hall.x1 + 1 - k]) put(world, x, towerTop + 1 + k, z, b.roof);
    }
    for (let x = hall.x0 + k; x <= hall.x1 - k; x++) if (k < half) put(world, x, towerTop + 1 + k, tz0, b.wall);
  }
  // Over a corridor the roof's eave reaches further out and rises in front of the tower: the clock sits higher.
  const clock: [number, number, number] = [mid + 0.5, roofBase + (spec.corridor ? 2 : 1), tz0 - 0.4];

  // Main roof: a red gable along x over the body and both galleries.
  const r0 = spec.corridor ? zFront - 3 : zFront - 1;
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
  const stairs = { x0: stairRoom.start, x1: stairRoom.end, z0: zWall + 1, z1: zBack - 1, standY: g };
  const extraRooms = extras.map(({ room, floor }) => ({ x0: room.start, x1: room.end, z0: zWall + 1, z1: zBack - 1, standY: floor }));
  return { hall, classrooms, clock, furniture, plant: [stairRoom.end + 0.5, g, zBack - 0.5], stairTop, stairs, extraRooms };
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

/** A basketball court: coloured floor, white border and middle line; returns where its two hoops stand (and their yaw, facing the court). */
export function placeCourt(world: WorldWriter, x0: number, x1: number, z0: number, z1: number, y: number, b: SchoolPalette): Array<{ at: [number, number, number]; yaw: number }> {
  const mz = Math.floor((z0 + z1) / 2);
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) put(world, x, y, z, x === x0 || x === x1 || z === z0 || z === z1 || z === mz ? b.line : b.court);
  const mx = (x0 + x1 + 1) / 2;
  return [
    { at: [mx, y + 1, z0 - 0.5], yaw: 0 },
    { at: [mx, y + 1, z1 + 1.5], yaw: 180 },
  ];
}

/**
 * The greenhouse (mock khu-06): glass walls six high and a gable on white posts, glass in the gable ends, a
 * doorway three wide and three high in the middle of the front; inside, raised beds two wide along its depth
 * with aisles two wide between them and three down the middle from the door, a strip two deep free along the
 * front and the back. Returns the beds' soil cells (crops and flowers stand on them).
 */
export function placeGreenhouse(world: WorldWriter, x0: number, x1: number, z0: number, z1: number, baseY: number, b: SchoolPalette): Array<[number, number]> {
  const top = baseY + 5;
  const mid = Math.floor((x0 + x1) / 2);
  for (let x = x0; x <= x1; x++) {
    for (let z = z0; z <= z1; z++) {
      const edgeX = x === x0 || x === x1;
      const edgeZ = z === z0 || z === z1;
      if (!edgeX && !edgeZ) continue;
      for (let y = baseY; y <= top; y++) {
        const door = z === z0 && Math.abs(x - mid) <= 1 && y < baseY + 3;
        if (door) continue;
        put(world, x, y, z, (edgeX && edgeZ) || (x - x0) % 3 === 0 || y === top ? b.trim : b.glass);
      }
    }
  }
  // The gable along x: its slopes over the front and back, glass filling the two ends under it.
  const half = Math.floor((z1 - z0 + 2) / 2);
  for (let k = 0; k <= half; k++) {
    for (let x = x0 - 1; x <= x1 + 1; x++) for (const z of [z0 - 1 + k, z1 + 1 - k]) put(world, x, top + 1 + k, z, x % 3 === 0 ? b.trim : b.glass);
    for (const x of [x0, x1]) for (let z = z0 + k; z <= z1 - k; z++) put(world, x, top + 1 + k, z, b.glass);
  }
  const soil: Array<[number, number]> = [];
  for (let k = 2; mid - k - 1 > x0; k += 4) {
    for (const bx of [mid - k - 1, mid - k, mid + k, mid + k + 1]) {
      for (let z = z0 + 3; z <= z1 - 3; z++) {
        put(world, bx, baseY, z, b.dirt);
        soil.push([bx, z]);
      }
    }
  }
  return soil;
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

