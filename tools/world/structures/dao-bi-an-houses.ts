// The houses of "Đảo bí ẩn" at the size the owner asks for (02/10/2026: a house many times the child's size,
// a really wide way in, room to move about inside): the fishers' houses of the village on their stilts and the
// captain's tent on the beach. Each is built with the shared house (buildings.ts `placeHouse`: walls seven
// high, a door three wide and three high, a gable roof) in its own frame turned to face its street, on ground
// raised level under it, then furnished along its walls so the floor between stays open.
import { doorSteps, placeHouse, type HouseBlocks } from './buildings';
import { type IslandKit, M } from './dao-bi-an-kit';
import { PACK } from '../map-kit';
import { type Facing, facingWriter, FRAME, frameCell } from './world-writer';

/** A house's footprint (inclusive, walls included) and the way its door looks. */
export interface IslandHouse {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  facing: Facing;
}

/** What is built: where its floor is stood on, and the world cell of a cell of its own (`u` along its front, `v` in from it). */
export interface BuiltHouse {
  floorY: number;
  /** The world cell of (u, v) counted from the front-left corner of the walls (inside: 1 … w-2, 1 … d-2). */
  at: (u: number, v: number) => [number, number];
  /** A yaw given in the house's own frame (0: facing its front wall), in the world. */
  yaw: (own: number) => number;
  w: number;
  d: number;
}

const WALL_HEIGHT = 7;
const FURNITURE = PACK.furniture;
const FACING_YAW: Record<Facing, number> = { north: 0, south: 180, east: 270, west: 90 };

/** The corner the frame turns about (frame cell (FRAME, FRAME) lands on it), and the width along the front and the depth. */
function frameOf(h: IslandHouse): { origin: [number, number]; w: number; d: number } {
  const along = h.facing === 'north' || h.facing === 'south';
  const [w, d] = along ? [h.x1 - h.x0 + 1, h.z1 - h.z0 + 1] : [h.z1 - h.z0 + 1, h.x1 - h.x0 + 1];
  const origin: Record<Facing, [number, number]> = { north: [h.x0, h.z0], south: [h.x1, h.z1], east: [h.x1, h.z0], west: [h.x0, h.z1] };
  return { origin: origin[h.facing], w, d };
}

/**
 * Raises the ground of a rectangle to its highest column, tapering down a block per block over `ring` round
 * it, so a house stands level with no ledge round it. Only raises (whatever stands on the ground finds its top
 * by looking up from the terrain), and leaves the paths and the water as they are. Returns the level.
 */
export function raisePad(k: IslandKit, x0: number, z0: number, x1: number, z1: number, ring = 3): number {
  const { ctx, b } = k;
  let level = 0;
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) level = Math.max(level, k.topAt(x, z));
  for (let x = x0 - ring; x <= x1 + ring; x++) {
    for (let z = z0 - ring; z <= z1 + ring; z++) {
      if (ctx.inWater(x, z) || ctx.onPath(x, z)) continue;
      const want = level - Math.max(0, x0 - x, x - x1, z0 - z, z - z1);
      const h = k.topAt(x, z);
      if (h >= want) continue;
      const top = ctx.world.get(x, h, z);
      for (let y = h; y < want; y++) k.put(x, y, z, b.dirt);
      k.put(x, want, z, top);
    }
  }
  return level;
}

/**
 * A house of the island on raised level ground: walls seven high of `look.wall` with log posts and beam, glazed
 * windows, a lantern either side of the three-wide door, a gable roof of `look.roof`. On `stilts` its plank
 * floor stands two over the ground on log posts, a deck runs along its front under the eaves and steps
 * five wide climb to it from the ground before it a block at a time; else its floor is laid on the ground. A lantern glows on
 * each side wall inside.
 */
export function islandHouse(k: IslandKit, house: IslandHouse, look: { wall: number; roof: number; ridge: number; gable?: number }, stilts: boolean): BuiltHouse {
  const { ctx, b } = k;
  const { origin, w, d } = frameOf(house);
  const world = (u: number, v: number): [number, number] => frameCell(origin, house.facing, u, v);
  // The ground: the walls, the eaves round them, the deck and step before the door.
  const corners = [world(FRAME - 1, FRAME - 3), world(FRAME + w, FRAME + d)];
  const xs = corners.map((c) => c[0]);
  const zs = corners.map((c) => c[1]);
  const level = raisePad(k, Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs));
  const writer = facingWriter(ctx.world, origin, house.facing);
  const set = (u: number, y: number, v: number, id: number): void => writer.set(u, y, v, id);
  const baseY = stilts ? level + 3 : level + 1;
  const blocks: HouseBlocks = { wall: look.wall, roof: look.roof, trim: b.log, beam: b.log, glass: ctx.block('glass'), ridge: look.ridge, gable: look.gable ?? b.planks, lantern: b.lantern, floor: b.planks };
  const front = placeHouse(writer, FRAME, FRAME, w, d, WALL_HEIGHT, baseY, blocks);
  // The doorway's sill laid with the floor, so the floor runs out through the door.
  for (let u = front.doorway.x0; u < front.doorway.x0 + front.doorway.width; u++) set(u, baseY - 1, FRAME, b.planks);
  if (stilts) {
    // The floor over its posts (a post every four blocks round the edge), the deck along the front.
    for (let u = FRAME; u < FRAME + w; u++) {
      for (let v = FRAME - 1; v < FRAME + d; v++) {
        set(u, baseY - 1, v, b.planks);
        const edge = u === FRAME || u === FRAME + w - 1 || v === FRAME - 1 || v === FRAME + d - 1;
        if (edge && ((u - FRAME) % 4 === 0 || u === FRAME + w - 1) && ((v - FRAME) % 4 === 0 || v === FRAME - 1 || v === FRAME + d - 1)) set(u, baseY - 2, v, b.log);
      }
    }
    // Steps of planks five wide from the deck down to the ground before it, a block at a time (a lane may run lower).
    const standing = (u: number, v: number): number => {
      const [x, z] = world(u, v);
      return k.topAt(x, z) + 1;
    };
    doorSteps(writer, front.doorway.x0 - 1, front.doorway.width + 2, FRAME - 1, baseY, standing, b.planks);
  }
  // Lanterns on the side walls inside, over the windows.
  for (const u of [FRAME, FRAME + w - 1]) set(u, baseY + 3, FRAME + Math.floor(d / 2), b.lantern);
  const [kx0, kz0] = world(FRAME - 1, FRAME - 2);
  const [kx1, kz1] = world(FRAME + w, FRAME + d);
  ctx.keepOut(kx0, kz0, kx1, kz1);
  return { floorY: baseY, at: (u, v) => world(FRAME + u, FRAME + v), yaw: (own) => (own + FACING_YAW[house.facing]) % 360, w, d };
}

/** Puts a model on the floor of a built house at its own cell (u, v), turned `own` in its frame. */
function furnish(k: IslandKit, h: BuiltHouse, model: string, u: number, v: number, own = 0, centred = false): void {
  const [x, z] = h.at(u, v);
  const at: [number, number, number] = [x + 0.5, h.floorY, z + 0.5];
  if (centred) k.ctx.centredAt(model, at, h.yaw(own));
  else k.ctx.propAt(model, at, h.yaw(own));
}

/**
 * A fisher's house (the fishing village): on stilts, thatch or red roof by `n`, inside a bedroll and a chest by
 * one wall, drying nets, a barrel and a crate by the other, a table with two chairs at the back, a lamp and a
 * rug; the middle and the way from the door to the back stay open. Even houses mirror the odd ones.
 */
export function fishingHouse(k: IslandKit, house: IslandHouse, n: number): BuiltHouse {
  const { b } = k;
  const h = islandHouse(k, house, { wall: b.planks, roof: n % 2 === 0 ? b.sand : b.wood, ridge: b.trail }, true);
  const { w, d } = h;
  const side = (u: number): number => (n % 2 === 0 ? u : w - 1 - u);
  furnish(k, h, M.bedroll, side(1), d - 2, 90);
  furnish(k, h, M.chest, side(1), d - 4, 90);
  furnish(k, h, M.netRack, side(1), 3, 90);
  furnish(k, h, M.barrel, side(w - 2), 1);
  furnish(k, h, M.crate, side(w - 2), 2, 15);
  furnish(k, h, `${FURNITURE}/table.glb`, side(w - 4), d - 3, 0, true);
  furnish(k, h, `${FURNITURE}/chair.glb`, side(w - 5), d - 3, 90, true);
  furnish(k, h, `${FURNITURE}/chair.glb`, side(w - 3), d - 3, 270, true);
  furnish(k, h, `${FURNITURE}/lampRoundFloor.glb`, side(w - 2), d - 2, 0, true);
  furnish(k, h, `${FURNITURE}/rugRectangle.glb`, Math.floor(w / 2), Math.floor(d / 2), 0, true);
  return h;
}

/**
 * The captain's tent on the beach (d-03): white canvas walls on log poles under a red canvas roof, its door
 * toward the pier; inside his map table in the middle, his chest and bedroll at the back, barrels, a crate
 * and a lamp by the walls, a rug; his flag and a lamp outside the door.
 */
export function captainTent(k: IslandKit, house: IslandHouse): BuiltHouse {
  const { b } = k;
  const h = islandHouse(k, house, { wall: b.white, roof: b.wood, ridge: b.planks, gable: b.white }, false);
  const { w, d } = h;
  furnish(k, h, M.mapTable, Math.floor(w / 2), d - 4);
  furnish(k, h, M.chest, 1, d - 2, 90);
  furnish(k, h, M.bedroll, w - 2, d - 2, 0);
  furnish(k, h, M.barrel, 1, 1);
  furnish(k, h, M.barrel, 1, 2);
  furnish(k, h, M.crate, w - 2, 1, 15);
  furnish(k, h, `${FURNITURE}/lampRoundFloor.glb`, w - 2, d - 4, 0, true);
  furnish(k, h, `${FURNITURE}/rugRectangle.glb`, Math.floor(w / 2), Math.floor(d / 2) - 1, 0, true);
  return h;
}
