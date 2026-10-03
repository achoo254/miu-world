// The child's home of the owner's mock (plan 261003, panels 1 and 2): a two-storey cottage of stone below and
// light timber above under a steep red tiled roof with a chimney and two dormers, an arched double doorway
// with a lantern either side, flower boxes under the windows. Inside (panel 2's cut-away), lined with planks:
// on the ground floor the living room open to the roof, its wooden staircase climbing the west wall to the
// gallery, the kitchen east of it and the dining room behind the kitchen, the storeroom at the back with a
// door out to the animal pen; upstairs the gallery behind its railing, where the study corner is, the bedroom
// over the kitchen and the toy corner behind it.
// Writes blocks only (its front toward -z) and returns where every room, door and fitting is; the map file
// furnishes it.
import { put, type WorldWriter } from './world-writer';
import { lineInside, type Room } from './xom-mai-am-home';

/** Outer size of the cottage (walls and their lining included). */
export const HOME_SIZE = { w: 33, d: 23 } as const;
/** Clear rows of each storey: six on the ground floor, then the upper floor's slab. */
const GROUND_ROWS = 6;
/** Rows of wall over the upper floor's slab before the roof starts (the roof rises from there). */
const UPPER_ROWS = 4;

export interface HomeBlocks {
  /** Floors, the upper floor's slab, the steps, the lining inside. */
  planks: number;
  /** Beams, posts, the door's frame. */
  log: number;
  /** The ground floor's walls outside, the stone course at their foot and their corners. */
  stoneWall: number;
  plinth: number;
  /** The upper floor's walls outside (light timber) and the gables. */
  timber: number;
  glass: number;
  roof: number;
  ridge: number;
  chimney: number;
  sill: number;
  lantern: number;
}

export interface HomeLayout {
  /** The front doorway (its first column, width) on the front wall `z`; the back door's likewise. */
  door: { x0: number; width: number; z: number };
  backDoor: { x0: number; width: number; z: number };
  /** Standing heights: the ground floor and the upper floor. */
  groundY: number;
  upperY: number;
  /** Rooms' open floors (inclusive). The living room includes the foot of the stairs; the study is the gallery. */
  living: Room;
  kitchen: Room;
  dining: Room;
  storeroom: Room;
  study: Room;
  bedroom: Room;
  toyCorner: Room;
  /** The stairs' columns (x0..x1) and their first and last rows (z0 at the bottom). */
  stairs: { x0: number; x1: number; z0: number; z1: number };
  /** Where the gallery railing's lengths go (block centre between two cells on x, the row z, its standing y). */
  railings: Array<[number, number, number]>;
  /** The void over the living room (open to the roof): its edge rows, for the beams' lanterns. */
  beams: number[];
  /** Tops of the flower boxes under the front windows. */
  sills: Array<[number, number, number]>;
  /** Inside faces of the walls: the cell next to each wall that furniture backs onto. */
  wall: { north: number; south: number; west: number; east: number; partitionX: number; partitionZ: number };
  roofTop: number;
}

/**
 * The cottage with its corner at (x0, z0), the ground floor standing at `groundY` (its floor one block under,
 * level with the ground outside, so the doorway has no step).
 */
export function placeHomeCottage(world: WorldWriter, x0: number, z0: number, groundY: number, b: HomeBlocks): HomeLayout {
  const { w, d } = HOME_SIZE;
  const x1 = x0 + w - 1;
  const z1 = z0 + d - 1;
  const slab = groundY + GROUND_ROWS;
  const upperY = slab + 1;
  const top = upperY + UPPER_ROWS - 1;
  // Inside the lining.
  const ix0 = x0 + 2;
  const ix1 = x1 - 2;
  const iz0 = z0 + 2;
  const iz1 = z1 - 2;
  /** The wall between the living room and the kitchen (both floors), and between the living room and the storeroom. */
  const partX = x0 + 19;
  const partZ = z0 + 15;
  /** The wall across the east side: the kitchen before the dining room, the bedroom before the toy corner. */
  const splitZ = z0 + 12;
  const doorX0 = x0 + 15;
  const backX0 = x0 + 10;
  const stairs = { x0: ix0, x1: ix0 + 2, z0: iz0, z1: iz0 + 11 };

  // Clear the inside, lay the floor.
  for (let x = x0 + 1; x < x1; x++) {
    for (let z = z0 + 1; z < z1; z++) {
      put(world, x, groundY - 1, z, b.planks);
      for (let y = groundY; y <= top + 16; y++) put(world, x, y, z, 0);
    }
  }

  // Outer walls: a stone course at the foot, stone below with stone corners, a log belt at the upper floor,
  // light timber above with a post every four blocks, a log beam along the top.
  const windows = new Set<string>();
  const win = (x: number, z: number, y0: number, y1: number): void => {
    for (let y = y0; y <= y1; y++) windows.add(`${x},${y},${z}`);
  };
  const lower: [number, number] = [groundY + 1, groundY + 3];
  const upper: [number, number] = [upperY + 1, upperY + 2];
  for (const [rows, xs] of [
    [lower, [x0 + 3, x0 + 4, x0 + 8, x0 + 9, x0 + 23, x0 + 24, x0 + 27, x0 + 28]],
    [upper, [x0 + 3, x0 + 4, x0 + 8, x0 + 9, x0 + 23, x0 + 24, x0 + 27, x0 + 28]],
  ] as const) for (const x of xs) win(x, z0, rows[0], rows[1]);
  for (const x of [x0 + 4, x0 + 5, x0 + 16, x0 + 17, x0 + 23, x0 + 24, x0 + 27, x0 + 28]) win(x, z1, lower[0], lower[1]);
  for (const x of [x0 + 4, x0 + 5, x0 + 16, x0 + 17, x0 + 23, x0 + 24, x0 + 27, x0 + 28]) win(x, z1, upper[0], upper[1]);
  for (const x of [x0, x1]) for (const z of [z0 + 4, z0 + 5, z0 + 10, z0 + 11, z0 + 17, z0 + 18]) {
    win(x, z, lower[0], lower[1]);
    win(x, z, upper[0], upper[1]);
  }
  for (let y = groundY - 1; y <= top; y++) {
    for (let x = x0; x <= x1; x++) {
      for (let z = z0; z <= z1; z++) {
        const edgeX = x === x0 || x === x1;
        const edgeZ = z === z0 || z === z1;
        if (!edgeX && !edgeZ) continue;
        const corner = edgeX && edgeZ;
        const along = edgeZ ? x - x0 : z - z0;
        let id: number;
        if (y === groundY - 1) id = b.plinth;
        else if (windows.has(`${x},${y},${z}`) && !corner) id = b.glass;
        else if (y < slab) id = corner ? b.plinth : b.stoneWall;
        else if (y === slab || y === top || corner || along % 4 === 0) id = b.log;
        else id = b.timber;
        put(world, x, y, z, id);
      }
    }
  }

  // The arched front doorway, three wide, four high at its sides and five in the middle, framed in logs; a
  // lantern either side. The back door to the pen, three by three.
  for (let x = doorX0 - 1; x <= doorX0 + 3; x++) {
    for (let y = groundY; y <= groundY + 5; y++) {
      const inner = x >= doorX0 && x <= doorX0 + 2;
      const middle = x === doorX0 + 1;
      const open = inner && (y <= groundY + 3 || (middle && y === groundY + 4));
      const frame = !open && (y <= groundY + 4 || (inner && y === groundY + 5)) && (!inner || y >= groundY + 4);
      if (open) put(world, x, y, z0, 0);
      else if (frame) put(world, x, y, z0, b.log);
    }
  }
  // A lantern either side, clear of the door's leaves folded back on the wall.
  for (const x of [doorX0 - 3, doorX0 + 5]) put(world, x, groundY + 3, z0 - 1, b.lantern);
  // The doorways' sills are floor, so the walk outside runs on into the house.
  for (let x = doorX0; x < doorX0 + 3; x++) put(world, x, groundY - 1, z0, b.planks);
  for (let x = backX0; x < backX0 + 3; x++) put(world, x, groundY - 1, z1, b.planks);
  for (let x = backX0; x < backX0 + 3; x++) for (let y = groundY; y < groundY + 3; y++) put(world, x, y, z1, 0);
  for (const x of [backX0 - 1, backX0 + 3]) for (let y = groundY; y <= groundY + 3; y++) put(world, x, y, z1, b.log);
  for (let x = backX0; x < backX0 + 3; x++) put(world, x, groundY + 3, z1, b.log);

  // Sills (flower boxes) under the ground floor's front windows.
  const sills: Array<[number, number, number]> = [];
  for (const x of [x0 + 3, x0 + 4, x0 + 8, x0 + 9, x0 + 23, x0 + 24, x0 + 27, x0 + 28]) {
    put(world, x, lower[0] - 1, z0 - 1, b.sill);
    sills.push([x + 0.5, lower[0], z0 - 0.5]);
  }

  // Lining inside both storeys (planks, posts every four blocks, glazed where the wall has a window).
  const lining = { lining: b.planks, post: b.log, glass: b.glass };
  lineInside(world, x0, z0, x1, z1, groundY, GROUND_ROWS, lining);
  lineInside(world, x0, z0, x1, z1, upperY, UPPER_ROWS, lining);
  for (let x = x0 + 1; x < x1; x++) for (const z of [z0 + 1, z1 - 1]) put(world, x, slab, z, b.log);
  for (let z = z0 + 1; z < z1; z++) for (const x of [x0 + 1, x1 - 1]) put(world, x, slab, z, b.log);

  // Partitions: between the living room and the kitchen up both storeys (a doorway on each floor), between
  // the living room and the storeroom on the ground floor (a doorway in line with the back door).
  for (let z = iz0; z <= iz1; z++) {
    for (let y = groundY; y <= top; y++) {
      const ground = z >= iz0 + 3 && z <= iz0 + 5 && y <= groundY + 3;
      const gallery = z >= iz0 + 14 && z <= iz0 + 16 && y >= upperY && y <= upperY + 2;
      put(world, partX, y, z, ground || gallery ? 0 : (z - iz0) % 4 === 0 || y === slab || y === top ? b.log : b.planks);
    }
  }
  for (let x = ix0; x < partX; x++) {
    for (let y = groundY; y < slab; y++) {
      const doorway = x >= backX0 && x < backX0 + 3 && y <= groundY + 3;
      put(world, x, y, partZ, doorway ? 0 : (x - ix0) % 4 === 0 ? b.log : b.planks);
    }
  }

  // Across the east side, a wall with a wide way through on the ground floor and a doorway upstairs; it rises
  // to the roof like the other inner walls.
  const roofAt = (z: number): number => top + 1 + Math.min(z - (z0 - 1), z1 + 1 - z);
  for (let x = partX + 1; x <= ix1; x++) {
    for (let y = groundY; y < roofAt(splitZ); y++) {
      const ground = x >= partX + 4 && x <= partX + 8 && y <= groundY + 3;
      const upstairs = x >= partX + 5 && x <= partX + 7 && y >= upperY && y <= upperY + 2;
      put(world, x, y, splitZ, ground || upstairs ? 0 : y === slab ? b.log : (x - partX) % 4 === 0 ? b.log : b.planks);
    }
  }

  // The upper floor: over the storeroom and the gallery (behind the void's railing), and over the kitchen.
  const voidZ1 = stairs.z1;
  for (let x = ix0; x <= ix1; x++) for (let z = iz0; z <= iz1; z++) if (x > partX || z > voidZ1) put(world, x, slab, z, b.planks);

  // The staircase up the west wall: six steps two blocks deep, each a block higher, solid under, then the
  // landing on the slab.
  for (let k = 0; k < 6; k++) {
    for (let x = stairs.x0; x <= stairs.x1; x++) {
      for (const z of [stairs.z0 + 2 * k, stairs.z0 + 2 * k + 1]) for (let y = groundY; y <= groundY + k; y++) put(world, x, y, z, b.planks);
    }
  }
  // Log beams across the open living room under the eaves.
  const beams = [iz0 + 3, iz0 + 8];
  for (const z of beams) for (let x = ix0; x < partX; x++) put(world, x, top, z, b.log);

  // Gable roof along x, eaves a block over every wall, the ridge in its own colour; the gable ends in timber.
  const half = Math.ceil((d + 2) / 2);
  let roofTop = top + 1;
  for (let z = z0 - 1; z <= z1 + 1; z++) {
    const step = Math.min(z - (z0 - 1), z1 + 1 - z);
    const y = top + 1 + step;
    roofTop = Math.max(roofTop, y);
    for (let x = x0 - 1; x <= x1 + 1; x++) {
      put(world, x, y, z, step === half - 1 ? b.ridge : b.roof);
      if ((x === x0 || x === x1) && step > 0) for (let fy = top + 1; fy < y; fy++) put(world, x, fy, z, b.timber);
    }
  }
  // A ceiling of planks under the tiles, so the rooms under the roof are timber overhead, not tile.
  for (let x = x0 + 2; x <= x1 - 2; x++) {
    if (x === partX) continue;
    for (let z = z0 + 2; z <= z1 - 2; z++) {
      if (z === splitZ && x > partX) continue;
      const y = roofAt(z) - 1;
      if (world.get(x, y, z) === 0) put(world, x, y, z, b.planks);
    }
  }
  // Under the roof nothing is left to stand on: the lining round the upper floor and the partition rise to
  // the roof (a second, inner gable), so no ledge runs round the attic over the rooms.
  for (let x = x0 + 1; x < x1; x++) for (const z of [z0 + 1, z1 - 1]) for (let y = top; y < roofAt(z); y++) put(world, x, y, z, b.timber);
  for (let z = z0 + 1; z < z1; z++) for (const x of [x0 + 1, partX, x1 - 1]) for (let y = top; y < roofAt(z); y++) put(world, x, y, z, b.timber);
  // Two dormers on the front slope: a glazed face, log cheeks, a little gable roof.
  for (const cx of [x0 + 8, x0 + 25]) {
    const eaves = top + 1;
    for (let dx = -2; dx <= 2; dx++) {
      const cheek = Math.abs(dx) === 2;
      for (let y = eaves + 2; y <= eaves + 4; y++) put(world, cx + dx, y, z0 + 1, !cheek && y <= eaves + 3 ? b.glass : cheek ? b.log : b.timber);
      put(world, cx + dx, eaves + 1, z0 + 1, b.sill);
    }
    for (let z = z0; z <= z0 + 6; z++) {
      for (let dx = -3; dx <= 3; dx++) put(world, cx + dx, eaves + 8 - Math.abs(dx), z, dx === 0 ? b.ridge : b.roof);
      for (const dx of [-2, 2]) put(world, cx + dx, eaves + 5, z, z === z0 ? b.timber : b.roof);
    }
    for (let dx = -1; dx <= 1; dx++) for (let y = eaves + 5; y < eaves + 8 - Math.abs(dx); y++) put(world, cx + dx, y, z0, b.timber);
  }
  // The chimney behind the kitchen's stove: a stack against the back wall from the ground, through the eaves
  // and three blocks over the ridge, capped.
  const chimneyX = x0 + 25;
  for (const x of [chimneyX, chimneyX + 1]) {
    for (let y = groundY - 1; y <= roofTop + 3; y++) put(world, x, y, z1 + 1, b.chimney);
    for (let y = top + 1; y <= roofTop + 3; y++) put(world, x, y, z1, b.chimney);
  }
  for (const x of [chimneyX - 1, chimneyX + 2]) for (const z of [z1 - 1, z1 + 2]) put(world, x, roofTop + 4, z, b.chimney);
  for (const x of [chimneyX, chimneyX + 1]) for (const z of [z1 - 1, z1 + 2]) put(world, x, roofTop + 4, z, b.chimney);
  for (const z of [z1, z1 + 1]) for (const x of [chimneyX - 1, chimneyX + 2]) put(world, x, roofTop + 4, z, b.chimney);

  // The gallery railing along the void's south edge, east of the landing: two-block lengths.
  const railings: Array<[number, number, number]> = [];
  for (let x = stairs.x1 + 2; x <= partX - 1; x += 2) railings.push([x, voidZ1 + 1, upperY]);

  return {
    door: { x0: doorX0, width: 3, z: z0 },
    backDoor: { x0: backX0, width: 3, z: z1 },
    groundY,
    upperY,
    living: { x0: ix0, z0: iz0, x1: partX - 1, z1: partZ - 1, floorY: groundY },
    kitchen: { x0: partX + 1, z0: iz0, x1: ix1, z1: splitZ - 1, floorY: groundY },
    dining: { x0: partX + 1, z0: splitZ + 1, x1: ix1, z1: iz1, floorY: groundY },
    storeroom: { x0: ix0, z0: partZ + 1, x1: partX - 1, z1: iz1, floorY: groundY },
    study: { x0: ix0, z0: voidZ1 + 1, x1: partX - 1, z1: iz1, floorY: upperY },
    bedroom: { x0: partX + 1, z0: iz0, x1: ix1, z1: splitZ - 1, floorY: upperY },
    toyCorner: { x0: partX + 1, z0: splitZ + 1, x1: ix1, z1: iz1, floorY: upperY },
    stairs,
    railings,
    beams,
    sills,
    wall: { north: iz0, south: iz1, west: ix0, east: ix1, partitionX: partX, partitionZ: partZ },
    roofTop: roofTop + 4,
  };
}
