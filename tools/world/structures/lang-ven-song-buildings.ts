// Block buildings of Làng Ven Sông the village shares (owner, 02/10/2026: a house many times the child's size,
// a really wide way in, room to move inside): a hall for the little school and the craft workshop of d-12 on a
// stone foot levelled over the ground, its doorway five wide with steps up to it; and the touches that open the
// village's round landmarks to her (the windmill's and the lighthouse's doorways three wide) or close what is
// not a room (the bell tower's hollow shaft filled). Each writes blocks only, its front toward -z.
import { doorSteps, placeHouse, type HouseBlocks, type HouseFront } from './buildings';
import { put, type WorldWriter } from './world-writer';

/** A public building's doorway: wider than a cottage's three, as wide as the hall's front can carry. */
const HALL_DOOR = { width: 5, height: 3 } as const;

/** The open floor inside a hall (inclusive), and the row the child stands on there. */
export interface HallRoom {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  floorY: number;
}

/**
 * A hall `w` x `d` from (x0, z0) with walls `wallHeight` high (a detailed house, buildings.ts), set one row
 * over the highest ground of its footprint on a stone `foot` down to the ground, its doorway in the middle of
 * the -z wall five wide and three high, the lanterns either side of it moved out to the new jambs, and steps
 * of `foot` from the doorway down to the ground a block at a time. `surface(x, z)` is the top solid row of
 * the ground in the writer's own coordinates. Returns the house's front (lamps at the new jambs) and the room.
 */
export function placeHall(
  world: WorldWriter,
  x0: number,
  z0: number,
  w: number,
  d: number,
  wallHeight: number,
  surface: (x: number, z: number) => number,
  blocks: HouseBlocks & { foot: number },
): HouseFront & { room: HallRoom } {
  const x1 = x0 + w - 1;
  const z1 = z0 + d - 1;
  let top = -Infinity;
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) top = Math.max(top, surface(x, z));
  const baseY = top + 1;
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) for (let y = surface(x, z) + 1; y < baseY; y++) put(world, x, y, z, blocks.foot);
  const front = placeHouse(world, x0, z0, w, d, wallHeight, baseY, blocks);
  // Widen the doorway evenly on both sides, the lanterns stepping out with its jambs.
  const extra = (HALL_DOOR.width - front.doorway.width) / 2;
  const doorFrom = front.doorway.x0 - Math.floor(extra);
  const doorTo = front.doorway.x0 + front.doorway.width - 1 + Math.ceil(extra);
  for (const [lx, lz] of front.lamps) put(world, lx, baseY + 2, lz, 0);
  for (let x = doorFrom; x <= doorTo; x++) {
    put(world, x, baseY - 1, z0, blocks.foot); // the threshold, level with the floor
    for (let y = baseY; y < baseY + HALL_DOOR.height; y++) put(world, x, y, z0, 0);
  }
  if (blocks.beam !== undefined) for (let x = doorFrom; x <= doorTo; x++) put(world, x, baseY + HALL_DOOR.height, z0, blocks.beam);
  const lamps: Array<[number, number]> = [[doorFrom - 1, z0 - 1], [doorTo + 1, z0 - 1]];
  if (blocks.lantern !== undefined) for (const [lx, lz] of lamps) put(world, lx, baseY + 2, lz, blocks.lantern);
  doorSteps(world, doorFrom, doorTo - doorFrom + 1, z0, baseY, (x, z) => surface(x, z) + 1, blocks.foot);
  return {
    ...front,
    doorway: { x0: doorFrom, width: doorTo - doorFrom + 1 },
    lamps,
    room: { x0: x0 + 1, z0: z0 + 1, x1: x1 - 1, z1: z1 - 1, floorY: baseY },
  };
}

