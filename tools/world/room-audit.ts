// `pnpm exec tsx tools/world/room-audit.ts <map>…`: every roofed space of a generated map (floor cells with a
// block roof 2–24 above, and no open sky beside it: the ring under the eaves is outside) as a room, with what the owner asks of a house (02/10/2026: a really wide way in,
// room enough inside, houses many times the child's size). Per room: its doorways (width in blocks, and the
// climb from the ground outside onto its floor), its floor area, the share of floor left free by solid props
// (prop-collision.ts), the share of that free floor reached from a doorway, and the cells of 1-wide pinches.
// Reads the map's committed files (assets/generated/world/<map>); prints the rooms that fall short.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { VoxelWorld } from '../../packages/voxel/src/chunk-format';
import { cellKey } from '../../packages/voxel/src/prop-collision';
import { insertRegion } from '../../packages/voxel/src/region-format';
import { ASSETS_DIR } from '../assets/asset-lib';
import { propCells } from './prop-cells';
import { walkSolid } from './walkable';

/**
 * What a house should give the child (blocks): a doorway this wide, a climb onto the floor this low, this share
 * of its floor free and reached. A roofed space narrower than `minSpan` (an alley under two houses' eaves, a
 * covered walk) is a passage, not a room.
 */
export const ROOM_RULES = { doorWidth: 3, doorClimb: 1, freeShare: 0.7, reachShare: 0.95, minArea: 12, minSpan: 3 } as const;
/** How far over a floor a block still makes it a roofed space (blocks). */
const ROOF_REACH = 24;

export interface RoomReport {
  at: [number, number, number];
  box: [number, number, number, number];
  area: number;
  /** Widest doorway (cells along the wall), and the lowest climb from outside onto the floor there. */
  door: number;
  /** The spot the child stands on just outside that doorway, or none without a way in. */
  doorAt?: [number, number, number];
  climb: number;
  freeShare: number;
  reachShare: number;
  pinch: number;
  short: string[];
}

const SIDES = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;

export async function auditRooms(map: string): Promise<RoomReport[]> {
  const dir = path.join(ASSETS_DIR, 'generated/world', map);
  const e = JSON.parse(await readFile(path.join(dir, 'entities.json'), 'utf8')) as { size: [number, number, number]; props: Array<{ model: string; position: [number, number, number]; yaw: number; scale: number }> };
  const [SX, SY, SZ] = e.size;
  const world = new VoxelWorld([SX / 16, SY / 16, SZ / 16]);
  for (const f of await readdir(path.join(dir, 'regions'))) {
    const m = /^r(-?\d+)-(-?\d+)\.bin$/.exec(f);
    if (m) insertRegion(world, Number(m[1]), Number(m[2]), new Uint8Array(await readFile(path.join(dir, 'regions', f))));
  }
  const isSolid = await walkSolid();
  const props = await propCells(e.props);
  const B = (x: number, y: number, z: number): boolean => x >= 0 && z >= 0 && x < SX && z < SZ && y >= 0 && y < SY && isSolid(world.get(x, y, z));
  const spot = (x: number, y: number, z: number): boolean => !B(x, y, z) && !B(x, y + 1, z) && B(x, y - 1, z);
  // Up to ROOF_REACH: a big house's ceiling stands seven to nine blocks over its floor, its roof higher still.
  const roofed = (x: number, y: number, z: number): boolean => {
    for (let d = 2; d <= ROOF_REACH; d++) if (B(x, y + d, z)) return true;
    return false;
  };
  // Under the eaves is outside: a roofed spot with open sky beside it at the child's head (no wall, no roof,
  // whatever the ground does there) is the ring under a roof's overhang or a doorway's sill, and counting it as
  // the room would join the whole ring to the doorway.
  const underEaves = (x: number, y: number, z: number): boolean => SIDES.some(([dx, dz]) => !B(x + dx, y + 1, z + dz) && !B(x + dx, y + 2, z + dz) && !roofed(x + dx, y + 1, z + dz));
  const indoor = new Set<string>();
  for (let x = 1; x < SX - 1; x++) for (let z = 1; z < SZ - 1; z++) for (let y = 1; y < SY - 3; y++) if (spot(x, y, z) && roofed(x, y, z) && !underEaves(x, y, z)) indoor.add(`${x},${y},${z}`);
  const parse = (k: string): [number, number, number] => k.split(',').map(Number) as [number, number, number];
  const free = ([x, y, z]: readonly number[]): boolean => !props.has(cellKey(x ?? 0, y ?? 0, z ?? 0)) && !props.has(cellKey(x ?? 0, (y ?? 0) + 1, z ?? 0));
  const seen = new Set<string>();
  const rooms: RoomReport[] = [];
  for (const start of indoor) {
    if (seen.has(start)) continue;
    const cells: Array<[number, number, number]> = [];
    const queue = [start];
    seen.add(start);
    while (queue.length > 0) {
      const [x, y, z] = parse(queue.pop() as string);
      cells.push([x, y, z]);
      for (const [dx, dz] of SIDES) {
        for (const dy of [0, 1, -1]) {
          const k = `${x + dx},${y + dy},${z + dz}`;
          if (indoor.has(k) && !seen.has(k)) {
            seen.add(k);
            queue.push(k);
            break;
          }
        }
      }
    }
    if (cells.length < ROOM_RULES.minArea) continue;
    const inRoom = new Set(cells.map((c) => c.join(',')));
    // Doorway cells: room cells beside a floor spot outside the room at most three blocks lower or higher; the climb is how far up from outside.
    const doorClimb = new Map<string, number>();
    const outsideOf = new Map<string, [number, number, number]>();
    for (const [x, y, z] of cells) {
      for (const [dx, dz] of SIDES) {
        for (let dy = -3; dy <= 3; dy++) {
          const [nx, ny, nz] = [x + dx, y + dy, z + dz];
          // Outside: any floor spot not in this room (under the eaves too), a step up or down from it.
          if (inRoom.has(`${nx},${ny},${nz}`) || !spot(nx, ny, nz)) continue;
          if (dy < 0 && (B(nx, y, nz) || B(nx, y + 1, nz))) continue; // a wall, not a drop
          const k = `${x},${y},${z}`;
          doorClimb.set(k, Math.min(doorClimb.get(k) ?? Infinity, Math.max(0, -dy)));
          if (!outsideOf.has(k)) outsideOf.set(k, [nx, ny, nz]);
        }
      }
    }
    // Doorways: connected doorway cells; width = their count, climb = the lowest among them.
    const doorSeen = new Set<string>();
    let door = 0;
    let doorAt: [number, number, number] | undefined;
    let climb = Infinity;
    for (const d of doorClimb.keys()) {
      if (doorSeen.has(d)) continue;
      let width = 0;
      let low = Infinity;
      const q = [d];
      doorSeen.add(d);
      while (q.length > 0) {
        const k = q.pop() as string;
        width++;
        low = Math.min(low, doorClimb.get(k) ?? Infinity);
        const [x, y, z] = parse(k);
        for (const [dx, dz] of SIDES) {
          for (const dy of [0, 1, -1]) {
            const n = `${x + dx},${y + dy},${z + dz}`;
            if (doorClimb.has(n) && !doorSeen.has(n)) {
              doorSeen.add(n);
              q.push(n);
            }
          }
        }
      }
      if (width > door || (width === door && low < climb)) {
        door = width;
        climb = low;
        doorAt = outsideOf.get(d);
      }
    }
    const freeCells = cells.filter(free);
    const reach = new Set<string>();
    const q = [...doorClimb.keys()].filter((k) => free(parse(k)));
    for (const k of q) reach.add(k);
    while (q.length > 0) {
      const [x, y, z] = parse(q.pop() as string);
      for (const [dx, dz] of SIDES) {
        for (const dy of [0, 1, -1]) {
          const k = `${x + dx},${y + dy},${z + dz}`;
          if (inRoom.has(k) && free(parse(k)) && !reach.has(k)) {
            reach.add(k);
            q.push(k);
            break;
          }
        }
      }
    }
    let pinch = 0;
    for (const [x, y, z] of freeCells) {
      const open = (dx: number, dz: number): boolean => inRoom.has(`${x + dx},${y},${z + dz}`) && free([x + dx, y, z + dz]);
      const alongX = open(1, 0) || open(-1, 0);
      const alongZ = open(0, 1) || open(0, -1);
      if (alongX !== alongZ) pinch++;
    }
    const xs = cells.map((c) => c[0]);
    const zs = cells.map((c) => c[2]);
    const box: [number, number, number, number] = [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)];
    if (Math.min(box[2] - box[0], box[3] - box[1]) + 1 < ROOM_RULES.minSpan) continue;
    const report: RoomReport = {
      at: [Math.round((box[0] + box[2]) / 2), cells[0]?.[1] ?? 0, Math.round((box[1] + box[3]) / 2)],
      box,
      area: cells.length,
      door,
      ...(doorAt ? { doorAt } : {}),
      climb: Number.isFinite(climb) ? climb : -1,
      freeShare: +(freeCells.length / cells.length).toFixed(2),
      reachShare: +(reach.size / Math.max(1, freeCells.length)).toFixed(2),
      pinch,
      short: [],
    };
    if (door === 0) report.short.push('no way in');
    else {
      if (door < ROOM_RULES.doorWidth) report.short.push(`doorway ${door} wide`);
      if (report.climb > ROOM_RULES.doorClimb) report.short.push(`${report.climb}-block climb at the door`);
    }
    if (report.freeShare < ROOM_RULES.freeShare) report.short.push(`${Math.round(report.freeShare * 100)}% floor free`);
    if (door > 0 && report.reachShare < ROOM_RULES.reachShare) report.short.push(`${Math.round(report.reachShare * 100)}% of free floor reached`);
    rooms.push(report);
  }
  return rooms;
}

async function main(): Promise<void> {
  for (const map of process.argv.slice(2)) {
    const rooms = await auditRooms(map);
    const short = rooms.filter((r) => r.short.length > 0);
    console.log(`${map}: ${rooms.length} roofed spaces, ${short.length} short`);
    for (const r of short.sort((a, b) => b.area - a.area)) console.log(`  [${r.at.join(',')}] ${r.box[2] - r.box[0] + 1}x${r.box[3] - r.box[1] + 1} area ${r.area}: ${r.short.join('; ')}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
