// The child's home of the owner's mock (plan 261003, panels 1 and 2): a two-storey cottage of stone below and
// cream plaster in a timber frame above (posts and a belt of logs) under a steep red tiled
// roof with a chimney and two dormers, an arched double doorway with a lantern either side, flower boxes
// under the windows. Inside (panel 2's cut-away), walls of cream plaster over a plank skirting, the upstairs
// rooms papered pink: on the ground floor the living room open to the roof, its wooden staircase climbing the
// west wall to the gallery (three wide, a step a block, a landing half way under its own window, a log
// stringer down its open side where the balusters and the handrail stand), the kitchen east of it and the
// dining room behind the kitchen, the storeroom at the back with a door out to the animal pen; upstairs the
// gallery behind its railing, where the study corner is, the bedroom over the kitchen and the toy corner
// behind it.
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
/**
 * The staircase up the west wall, by row from the living room's front wall: each row's step top over the
 * ground floor (blocks). The front row is left clear (the way onto the first step), a landing three deep
 * half way, and the row past the last step is the gallery's slab (six over the floor).
 */
const STEPS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [2, 1],
  [3, 2],
  [4, 3],
  [5, 3],
  [6, 3],
  [7, 4],
  [8, 5],
];

export interface HomeBlocks {
  /** Floors, the upper floor's slab, the skirting, the ceiling under the roof. */
  planks: number;
  /** Beams, posts, braces, the door's frame, the stair's stringer. */
  log: number;
  /** The ground floor's walls outside, the stone course at their foot and their corners. */
  stoneWall: number;
  plinth: number;
  /** Plaster: the upper floor's panels outside, the gables, the walls inside. */
  plaster: number;
  /** The upstairs rooms' walls (bedroom, toy corner). */
  wallpaper: number;
  /** The staircase's steps. */
  stairs: number;
  glass: number;
  roof: number;
  ridge: number;
  chimney: number;
  sill: number;
  lantern: number;
}

/** A piece of the staircase's furniture: where it stands (feet) and which piece. */
export interface StairPiece {
  at: [number, number, number];
  kind: 'rail-rise' | 'rail-flat' | 'newel' | 'runner-rise' | 'runner-flat';
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
  /** The stairs' walking columns (x0..x1), the stringer column, and their first and last step rows. */
  stairs: { x0: number; x1: number; stringer: number; z0: number; z1: number; landing: [number, number] };
  /** The balusters and handrail on the stringer, the newel posts, the runner carpet on the steps. */
  stairPieces: StairPiece[];
  /** The under-stair cupboard's face (the stringer's open side, at the landing). */
  underStair: [number, number, number];
  /** Where the gallery railing's lengths go (block centre between two cells on x, the row z, its standing y). */
  railings: Array<[number, number, number]>;
  /** The void over the living room (open to the roof): its last row, and its beams' rows for the lanterns. */
  voidZ1: number;
  beams: number[];
  /** Tops of the flower boxes under the front windows. */
  sills: Array<[number, number, number]>;
  /** Every window's middle on a wall (x, y, z) and the way the wall faces, for curtains and flower boxes. */
  windows: Array<{ at: [number, number, number]; face: 'north' | 'south' | 'west' | 'east'; width: number }>;
  /** Inside faces of the walls: the cell next to each wall that furniture backs onto. */
  wall: { north: number; south: number; west: number; east: number; partitionX: number; partitionZ: number; splitZ: number };
  /** The cottage's footprint and its blocks' kinds by box, for the family's own colours (exterior style). */
  box: { x0: number; z0: number; x1: number; z1: number; y0: number; y1: number };
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
  /** Three walking columns against the west wall, the stringer beside them. */
  const stairX0 = ix0;
  const stairX1 = ix0 + 2;
  const stringer = ix0 + 3;
  const lastStep = STEPS[STEPS.length - 1]?.[0] ?? 8;
  /** The last row open to the roof over the living room; the gallery begins past it. */
  const voidZ1 = iz0 + lastStep;

  // Clear the inside, lay the floor.
  for (let x = x0 + 1; x < x1; x++) {
    for (let z = z0 + 1; z < z1; z++) {
      put(world, x, groundY - 1, z, b.planks);
      for (let y = groundY; y <= top + 16; y++) put(world, x, y, z, 0);
    }
  }

  // Windows: two wide, three high below and two high above, on every wall; the staircase's landing has its own.
  const windowCells = new Set<string>();
  const windows: HomeLayout['windows'] = [];
  const lower: [number, number] = [groundY + 1, groundY + 3];
  const upper: [number, number] = [upperY + 1, upperY + 2];
  const win = (face: 'north' | 'south' | 'west' | 'east', along: readonly number[], rows: readonly [number, number]): void => {
    const [wx, wz] = face === 'north' ? [null, z0] : face === 'south' ? [null, z1] : face === 'west' ? [x0, null] : [x1, null];
    for (const a of along) for (let y = rows[0]; y <= rows[1]; y++) windowCells.add(`${wx ?? a},${y},${wz ?? a}`);
    const mid = (Math.min(...along) + Math.max(...along) + 1) / 2;
    windows.push({ at: [wx ?? mid, rows[0], wz ?? mid], face, width: along.length });
  };
  for (const rows of [lower, upper]) {
    for (const xs of [[3, 4], [8, 9], [23, 24], [27, 28]]) win('north', xs.map((v) => x0 + v), rows);
    for (const xs of [[4, 5], [16, 17], [23, 24], [27, 28]]) win('south', xs.map((v) => x0 + v), rows);
    for (const zs of [[4, 5], [10, 11], [17, 18]]) win('east', zs.map((v) => z0 + v), rows);
  }
  // West: below, beside the sofa corner and in the storeroom; the landing's window; above, over the void and the gallery.
  for (const zs of [[12, 13], [17, 18]]) win('west', zs.map((v) => z0 + v), lower);
  win('west', [z0 + 6, z0 + 7, z0 + 8], [groundY + 4, groundY + 5]);
  for (const zs of [[4, 5], [12, 13], [17, 18]]) win('west', zs.map((v) => z0 + v), upper);

  // Outer walls: a stone course at the foot, stone below with stone corners, a log belt at the upper floor,
  // cream plaster above in a frame of logs (a post every four blocks), a log beam along the top.
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
        else if (windowCells.has(`${x},${y},${z}`) && !corner) id = b.glass;
        else if (y < slab) id = corner ? b.plinth : b.stoneWall;
        else id = y === slab || y === top || corner || along % 4 === 0 ? b.log : b.plaster;
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
  // A lantern either side of the arch.
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

  // Lining inside both storeys: planks with posts every four blocks, glazed where the wall has a window; then
  // plastered over a skirting of planks (the upstairs rooms east of the partition papered pink).
  const lining = { lining: b.planks, post: b.log, glass: b.glass };
  lineInside(world, x0, z0, x1, z1, groundY, GROUND_ROWS, lining);
  lineInside(world, x0, z0, x1, z1, upperY, UPPER_ROWS, lining);
  const wallFace = (x: number, y: number): number => (y >= upperY && x > partX ? b.wallpaper : b.plaster);
  for (let x = x0 + 1; x < x1; x++) {
    for (let z = z0 + 1; z < z1; z++) {
      if (x !== x0 + 1 && x !== x1 - 1 && z !== z0 + 1 && z !== z1 - 1) continue;
      for (let y = groundY + 1; y < top; y++) if (y !== upperY && world.get(x, y, z) === b.planks) put(world, x, y, z, wallFace(x, y));
    }
  }
  for (let x = x0 + 1; x < x1; x++) for (const z of [z0 + 1, z1 - 1]) put(world, x, slab, z, b.log);
  for (let z = z0 + 1; z < z1; z++) for (const x of [x0 + 1, x1 - 1]) put(world, x, slab, z, b.log);

  /** A partition's block: posts every four, a log at the floors' level, a skirting of planks, plaster or paper between. */
  const partitionBlock = (along: number, x: number, y: number): number => {
    if (along % 4 === 0 || y === slab || y === top) return b.log;
    if (y === groundY || y === upperY) return b.planks;
    return wallFace(x, y);
  };
  // Partitions: between the living room and the kitchen up both storeys (a doorway on each floor), between
  // the living room and the storeroom on the ground floor (a doorway in line with the back door).
  for (let z = iz0; z <= iz1; z++) {
    for (let y = groundY; y <= top; y++) {
      const ground = z >= iz0 + 3 && z <= iz0 + 5 && y <= groundY + 3;
      const gallery = z >= iz0 + 14 && z <= iz0 + 16 && y >= upperY && y <= upperY + 2;
      put(world, partX, y, z, ground || gallery ? 0 : partitionBlock(z - iz0, partX - 1, y));
    }
  }
  for (let x = ix0; x < partX; x++) {
    for (let y = groundY; y < slab; y++) {
      const doorway = x >= backX0 && x < backX0 + 3 && y <= groundY + 3;
      put(world, x, y, partZ, doorway ? 0 : partitionBlock(x - ix0, x, y));
    }
  }

  // Across the east side, a wall with a wide way through on the ground floor and a doorway upstairs; it rises
  // to the roof like the other inner walls.
  const roofAt = (z: number): number => top + 1 + Math.min(z - (z0 - 1), z1 + 1 - z);
  for (let x = partX + 1; x <= ix1; x++) {
    for (let y = groundY; y < roofAt(splitZ); y++) {
      const ground = x >= partX + 4 && x <= partX + 8 && y <= groundY + 3;
      const upstairs = x >= partX + 5 && x <= partX + 7 && y >= upperY && y <= upperY + 2;
      put(world, x, y, splitZ, ground || upstairs ? 0 : y > top ? b.wallpaper : partitionBlock(x - partX, x, y));
    }
  }

  // The upper floor: over the storeroom and the gallery (behind the void's railing), and over the kitchen.
  for (let x = ix0; x <= ix1; x++) for (let z = iz0; z <= iz1; z++) if (x > partX || z > voidZ1) put(world, x, slab, z, b.planks);

  // The staircase: each row's steps solid down to the floor, the treads in their own wood; the stringer column
  // beside them as high as the step, a log at its top (the balusters stand on it) and plaster under (the
  // cupboard under the stairs).
  const stairPieces: StairPiece[] = [];
  for (const [i, [row, rise]] of STEPS.entries()) {
    const z = iz0 + row;
    for (let x = stairX0; x <= stringer; x++) {
      for (let y = groundY; y <= groundY + rise; y++) put(world, x, y, z, x === stringer ? (y === groundY + rise ? b.log : b.plaster) : y === groundY + rise ? b.stairs : b.planks);
    }
    const next = STEPS[i + 1]?.[1] ?? rise + 1;
    const prev = STEPS[i - 1]?.[1] ?? -1;
    const feet = groundY + rise + 1;
    // The first step's stringer carries the bottom newel post; the foot of the stairs stays open beside it.
    stairPieces.push({ at: [stringer + 0.5, feet, z + 0.5], kind: i === 0 ? 'newel' : next > rise ? 'rail-rise' : 'rail-flat' });
    // The runner down the middle of the steps: over each step's tread and down its riser where it rises.
    stairPieces.push({ at: [stairX0 + 1.5, feet, z + 0.5], kind: prev < rise ? 'runner-rise' : 'runner-flat' });
  }
  // The top newel post with its lantern, beside the gallery's railing.
  stairPieces.push({ at: [stringer + 1.5, upperY, voidZ1 + 1.5], kind: 'newel' });

  // Log beams across the open living room under the eaves.
  const beams = [iz0 + 2, iz0 + 6];
  for (const z of beams) for (let x = ix0; x < partX; x++) put(world, x, top, z, b.log);

  // Gable roof along x, eaves a block over every wall, the ridge in its own colour; the gable ends plastered.
  const half = Math.ceil((d + 2) / 2);
  let roofTop = top + 1;
  for (let z = z0 - 1; z <= z1 + 1; z++) {
    const step = Math.min(z - (z0 - 1), z1 + 1 - z);
    const y = top + 1 + step;
    roofTop = Math.max(roofTop, y);
    for (let x = x0 - 1; x <= x1 + 1; x++) {
      put(world, x, y, z, step === half - 1 ? b.ridge : b.roof);
      if ((x === x0 || x === x1) && step > 0) for (let fy = top + 1; fy < y; fy++) put(world, x, fy, z, fy === y - 1 ? b.log : b.plaster);
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
  for (let x = x0 + 1; x < x1; x++) for (const z of [z0 + 1, z1 - 1]) for (let y = top; y < roofAt(z); y++) put(world, x, y, z, wallFace(x, upperY));
  for (let z = z0 + 1; z < z1; z++) for (const x of [x0 + 1, partX, x1 - 1]) for (let y = top; y < roofAt(z); y++) put(world, x, y, z, wallFace(x, upperY));
  // Two dormers on the front slope: a glazed face, log cheeks, a little gable roof.
  for (const cx of [x0 + 8, x0 + 25]) {
    const eaves = top + 1;
    for (let dx = -2; dx <= 2; dx++) {
      const cheek = Math.abs(dx) === 2;
      for (let y = eaves + 2; y <= eaves + 4; y++) put(world, cx + dx, y, z0 + 1, !cheek && y <= eaves + 3 ? b.glass : cheek ? b.log : b.plaster);
      // The dormer's sill is the top of the room's wall inside: it takes the wall's face, not the sill's red.
      put(world, cx + dx, eaves + 1, z0 + 1, wallFace(cx + dx, upperY));
    }
    for (let z = z0; z <= z0 + 6; z++) {
      for (let dx = -3; dx <= 3; dx++) put(world, cx + dx, eaves + 8 - Math.abs(dx), z, dx === 0 ? b.ridge : b.roof);
      for (const dx of [-2, 2]) put(world, cx + dx, eaves + 5, z, z === z0 ? b.log : b.roof);
    }
    for (let dx = -1; dx <= 1; dx++) for (let y = eaves + 5; y < eaves + 8 - Math.abs(dx); y++) put(world, cx + dx, y, z0, b.plaster);
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

  // The gallery railing along the void's south edge, from the top newel to the partition: two-block lengths.
  const railings: Array<[number, number, number]> = [];
  for (let x = stringer + 3; x <= partX - 1; x += 2) railings.push([x, voidZ1 + 1, upperY]);

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
    stairs: { x0: stairX0, x1: stairX1, stringer, z0: iz0 + (STEPS[0]?.[0] ?? 1), z1: voidZ1, landing: [iz0 + 4, iz0 + 6] },
    stairPieces,
    underStair: [stringer + 1, groundY, iz0 + 5],
    railings,
    voidZ1,
    beams,
    sills,
    windows,
    wall: { north: iz0, south: iz1, west: ix0, east: ix1, partitionX: partX, partitionZ: partZ, splitZ },
    box: { x0: x0 - 1, z0: z0 - 1, x1: x1 + 2, z1: z1 + 2, y0: groundY - 1, y1: roofTop + 4 },
    roofTop: roofTop + 4,
  };
}
