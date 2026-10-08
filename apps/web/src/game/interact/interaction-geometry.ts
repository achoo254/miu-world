// Where the child goes for an interaction, from the object's catalogue entry (content/world/models.json: its
// seats, its mattress, its front, its screen) and where the map placed it: her hips on the seat facing out,
// lying on the mattress, sitting on the floor in front of a screen, swinging with a swing's seat; and the spot
// she stands on when she gets up. Pure: no scene, testable in Node.
import type { CatalogModel, CatalogSeat } from '@miu/voxel/model-catalog';
import type { ModelBounds } from '@miu/voxel/prop-collision';
import { SWING_PERIOD } from './player-actions';
import type { BodyPlacement } from './object-interaction-types';

export type Point = readonly [number, number, number];

/** A placed model: where its pivot stands, its turn (degrees) and size, as the map's props list it. */
export interface Placed {
  position: Point;
  yaw: number;
  scale: number;
}

/**
 * In the seated clip the seat of her trousers rests this far above her feet origin (blocks): the rig's 0.1
 * (vehicle-ride.ts `SEAT_ABOVE_FEET`) at her size (`PLAYER_SCALE`); kept as a number so the map tools can read
 * this file, and checked against both by its test.
 */
export const HIPS_ABOVE_FEET = 0.068;
/** Lying, her feet origin is this far from the mattress's middle toward her feet (about half her length). */
export const HALF_BODY_LYING = 0.62;
/** Lying, her feet origin is this far over the mattress (her back's half thickness). */
export const LIE_ABOVE_MATTRESS = 0.14;
/** She sits this far in front of a screen. */
export const WATCH_DISTANCE = 1.9;
/** She gets up this far in front of a seat. */
export const STAND_UP_DISTANCE = 0.9;
/** How far a swing swings either way (radians). */
export const SWING_AMPLITUDE = (24 * Math.PI) / 180;

const rad = (deg: number): number => (deg * Math.PI) / 180;

/** A point of the model's own frame where the map placed it. */
export function toWorld(placed: Placed, local: Point): Point {
  const t = rad(placed.yaw);
  const [x, y, z] = local.map((v) => v * placed.scale) as [number, number, number];
  return [placed.position[0] + x * Math.cos(t) + z * Math.sin(t), placed.position[1] + y, placed.position[2] - x * Math.sin(t) + z * Math.cos(t)];
}

/** A heading of the model's own frame (degrees, 0 = its +z) as the controller's facing (radians, 0 = +z). */
export function worldFacing(placed: Placed, heading: number): number {
  return rad(heading + placed.yaw);
}

/** The unit step of a facing on the ground. */
export const stepOf = (facing: number): readonly [number, number] => [Math.sin(facing), Math.cos(facing)];

/** The model's middle (its bounds' centre at the base) where the map placed it; the pivot without bounds. */
export function middleOf(placed: Placed, bounds: ModelBounds | undefined): Point {
  if (!bounds) return placed.position;
  return toWorld(placed, [(bounds.min[0] + bounds.max[0]) / 2, bounds.min[1], (bounds.min[2] + bounds.max[2]) / 2]);
}

/**
 * Its seats: the catalogue's, else one in the middle of the model at 45% of its height facing its front (a
 * model the maps do not place yet; the catalogue test holds every placed seat model to explicit seats).
 */
export function seatsOf(entry: CatalogModel | undefined, bounds: ModelBounds | undefined): readonly CatalogSeat[] {
  if (entry?.seats) return entry.seats;
  if (!bounds) return [{ at: [0, 0, 0] }];
  const [x0, y0, z0] = bounds.min;
  const [x1, y1, z1] = bounds.max;
  return [{ at: [(x0 + x1) / 2, y0 + (y1 - y0) * 0.45, (z0 + z1) / 2] }];
}

/** The seat nearest to where she stands (a bench's place by her, a swing's free seat). */
export function nearestSeat(placed: Placed, seats: readonly CatalogSeat[], from: Point): CatalogSeat {
  let best = seats[0];
  let bestD = Infinity;
  for (const seat of seats) {
    const [x, , z] = toWorld(placed, seat.at);
    const d = Math.hypot(x - from[0], z - from[2]);
    if (d < bestD) {
      bestD = d;
      best = seat;
    }
  }
  if (!best) throw new Error('a seat list is never empty');
  return best;
}

/** Her body on a seat: the seated clip's hips on its top, facing out. */
export function seatBody(placed: Placed, seat: CatalogSeat, front: number): BodyPlacement {
  const [x, y, z] = toWorld(placed, seat.at);
  return { position: [x, y - HIPS_ABOVE_FEET, z], facing: worldFacing(placed, seat.facing ?? front), pitch: 0 };
}

/** Her body standing inside it (a shower's tray): her feet on its floor, facing out of it. */
export function standBody(placed: Placed, stand: NonNullable<CatalogModel['stand']>, front: number): BodyPlacement {
  return { position: toWorld(placed, stand.at), facing: worldFacing(placed, stand.facing ?? front), pitch: 0 };
}

/** Her body lying on a mattress: feet toward its foot, her back on its top (the gesture lays her down). */
export function lieBody(placed: Placed, lie: NonNullable<CatalogModel['lie']>): BodyPlacement {
  const facing = worldFacing(placed, lie.feet);
  const [sx, sz] = stepOf(facing);
  const [x, y, z] = toWorld(placed, lie.at);
  return { position: [x + sx * HALF_BODY_LYING, y + LIE_ABOVE_MATTRESS, z + sz * HALF_BODY_LYING], facing, pitch: 0 };
}

/** The bed's mattress: the catalogue's, else the middle of its top facing its front. */
export function lieOf(entry: CatalogModel | undefined, bounds: ModelBounds | undefined): NonNullable<CatalogModel['lie']> {
  if (entry?.lie) return entry.lie;
  const [x0, , z0] = bounds?.min ?? [0, 0, 0];
  const [x1, y1, z1] = bounds?.max ?? [0, 0.5, 0];
  return { at: [(x0 + x1) / 2, y1, (z0 + z1) / 2], feet: entry?.front ?? 0 };
}

/** Where she sits to watch a screen: on the floor in front of it (the caller snaps it to open ground), facing it. */
export function watchSpot(placed: Placed, entry: CatalogModel | undefined, bounds: ModelBounds | undefined): { spot: Point; facing: number } {
  const out = worldFacing(placed, entry?.front ?? 0);
  const [sx, sz] = stepOf(out);
  const screen = entry?.screen ? toWorld(placed, entry.screen.at) : middleOf(placed, bounds);
  return { spot: [screen[0] + sx * WATCH_DISTANCE, placed.position[1], screen[2] + sz * WATCH_DISTANCE], facing: out + Math.PI };
}

/** Sitting on the floor where she stands (in front of a screen): the seated clip's hips on the floor. */
export function floorBody(spot: Point, facing: number): BodyPlacement {
  return { position: [spot[0], spot[1] - HIPS_ABOVE_FEET, spot[2]], facing, pitch: 0 };
}

/** Where she would like to stand up from a seat (in front of it, on its floor): the caller checks it is open. */
export function standUpSpot(placed: Placed, body: BodyPlacement): Point {
  const [sx, sz] = stepOf(body.facing);
  return [body.position[0] + sx * STAND_UP_DISTANCE, placed.position[1], body.position[2] + sz * STAND_UP_DISTANCE];
}

/** How far the swing has swung `t` seconds after she sat (eases in over the first push); 0 for less motion. */
export function swingAngle(t: number, reduced: boolean): number {
  if (reduced) return 0;
  return SWING_AMPLITUDE * Math.min(1, t / 1.5) * Math.sin((t * Math.PI * 2) / SWING_PERIOD);
}

/**
 * Her body on a swinging seat: the seat at rest turned `angle` about the axis through `pivot` along the swing's
 * own x (its bar), and her body tipped with it (forward when she faces the swing's +z).
 */
export function swingBody(rest: BodyPlacement, pivot: Point, swingYaw: number, angle: number): BodyPlacement {
  const t = rad(swingYaw);
  // The bar's direction in the world, and the seat's offset from the pivot.
  const ax = Math.cos(t);
  const az = -Math.sin(t);
  const v = [rest.position[0] - pivot[0], rest.position[1] - pivot[1], rest.position[2] - pivot[2]] as const;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const dot = v[0] * ax + v[2] * az;
  // Rodrigues' rotation about the unit axis (ax, 0, az).
  const cross = [-(az * v[1]), az * v[0] - ax * v[2], ax * v[1]] as const;
  const k = 1 - c;
  const rotated = [v[0] * c + cross[0] * s + ax * dot * k, v[1] * c + cross[1] * s, v[2] * c + cross[2] * s + az * dot * k] as const;
  // Her forward against the swing's +z: tipped the same way when she faces it, the other way when she faces back.
  const along = Math.sin(rest.facing) * Math.sin(t) + Math.cos(rest.facing) * Math.cos(t);
  return { position: [pivot[0] + rotated[0], pivot[1] + rotated[1], pivot[2] + rotated[2]], facing: rest.facing, pitch: angle * Math.sign(along || 1) };
}

/** Whether a solid block stands between two spots at waist and chest height (sampled every quarter block). */
export function wallBetween(from: Point, to: Point, solidBlock: (x: number, y: number, z: number) => boolean): boolean {
  const dx = to[0] - from[0];
  const dz = to[2] - from[2];
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.25));
  for (let i = 1; i < steps; i++) {
    const x = Math.floor(from[0] + (dx * i) / steps);
    const z = Math.floor(from[2] + (dz * i) / steps);
    const y = Math.floor(Math.max(from[1], to[1]));
    if (solidBlock(x, y, z) && solidBlock(x, y + 1, z)) return true;
  }
  return false;
}

/**
 * The object's key among the switched states: a piece of her home by its slot and the decor spot it stands at
 * (the same whatever style she picks), anything else by its interaction and where it stands.
 */
export function stateKey(defId: string, position: Point, slotSpot: { slot: string; index: number } | null): string {
  if (slotSpot) return `${defId}@${slotSpot.slot}#${slotSpot.index}`;
  return `${defId}@${position.map((v) => Math.round(v)).join(',')}`;
}
