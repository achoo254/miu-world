// `pnpm exec tsx tools/world/life-audit.ts <map>…`: how a generated map's everyday life (`ambients`) spreads over
// it (owner, 03/10/2026: "lượng npc sinh hoạt đang tập trung vào 1 chỗ nhiều quá… phân bổ hợp lý hơn… như
// ngoài đời thật"). The map is cut into 100 × 100-block cells; per map: how many ambients, how many cells hold
// any, how many cells are lived in (ways or houses) and how many of those hold life, the busiest cell and its
// share, how many stand within 120 blocks of the spawn, and the ones standing where nobody stands about: in a
// house's doorway, in a lane's middle, in the water (fish, crabs and paddy planters aside). Reads the committed files.
import { pathToFileURL } from 'node:url';
import { auditRooms } from './room-audit';
import { blockIds, readGeneratedMap, WAY_BLOCKS, wayChecks } from './scenery-audit';
import { LIFE_CELL } from './village-life';

/** A cell with this many way columns (or a house) is lived in. */
const LIVED_WAYS = 40;
const SPAWN_RADIUS = 120;
/** Who belongs in the water: fish, crabs, and planters in a flooded paddy. */
const WATER_LIFE = new Set(['fish', 'crab', 'rice-planter']);

export interface LifeReport {
  map: string;
  count: number;
  cells: number;
  used: number;
  lived: number;
  livedUsed: number;
  busiest: { at: [number, number]; count: number; share: number };
  nearSpawn: number;
  inDoorway: string[];
  inLane: string[];
  inWater: string[];
}

export async function auditLife(map: string): Promise<LifeReport> {
  const { e, world } = await readGeneratedMap(map);
  const [SX, SY, SZ] = e.size;
  const { idsOf } = await blockIds();
  const way = idsOf([...WAY_BLOCKS, 'planks']);
  const water = idsOf(['water']);
  const { inLane } = wayChecks(world, idsOf(WAY_BLOCKS));
  const [cx, cz] = [Math.ceil(SX / LIFE_CELL), Math.ceil(SZ / LIFE_CELL)];
  const cellOf = (x: number, z: number): number => Math.min(cx - 1, Math.floor(x / LIFE_CELL)) + Math.min(cz - 1, Math.floor(z / LIFE_CELL)) * cx;

  // Lived cells: enough way columns (a way's block or planks on top: lanes, squares, decks, boardwalks), or a house.
  const ways = new Array<number>(cx * cz).fill(0);
  for (let x = 0; x < SX; x++) {
    for (let z = 0; z < SZ; z++) {
      for (let y = SY - 2; y > 0; y--) {
        const id = world.get(x, y, z);
        if (id === 0) continue;
        if (way.has(id)) ways[cellOf(x, z)] = (ways[cellOf(x, z)] ?? 0) + 1;
        break;
      }
    }
  }
  const rooms = await auditRooms(map);
  const housed = new Set(rooms.map((r) => cellOf(r.at[0], r.at[2])));
  const lived = new Set(ways.flatMap((n, i) => (n >= LIVED_WAYS || housed.has(i) ? [i] : [])));

  const ambients = e.ambients ?? [];
  const perCell = new Array<number>(cx * cz).fill(0);
  for (const a of ambients) perCell[cellOf(a.position[0], a.position[2])] = (perCell[cellOf(a.position[0], a.position[2])] ?? 0) + 1;
  let top = 0;
  for (let i = 1; i < perCell.length; i++) if ((perCell[i] ?? 0) > (perCell[top] ?? 0)) top = i;
  const used = perCell.filter((n) => n > 0).length;
  const livedUsed = [...lived].filter((i) => (perCell[i] ?? 0) > 0).length;
  const [spx, , spz] = e.spawn.position;

  // Doorsteps: the spot outside each house's doorway and the ones beside it.
  const doors = rooms.flatMap((r) => (r.doorAt ? [r.doorAt] : []));
  const inDoorway: string[] = [];
  const lane: string[] = [];
  const wet: string[] = [];
  for (const a of ambients) {
    const [x, y, z] = [Math.floor(a.position[0]), Math.floor(a.position[1]), Math.floor(a.position[2])];
    if (doors.some(([dx, dy, dz]) => Math.max(Math.abs(dx - x), Math.abs(dz - z)) <= 1 && Math.abs(dy - y) <= 1)) inDoorway.push(a.id);
    if (inLane(x, y, z)) lane.push(a.id);
    if (!WATER_LIFE.has(a.routine) && (water.has(world.get(x, y, z)) || water.has(world.get(x, y - 1, z)))) wet.push(a.id);
  }
  return {
    map,
    count: ambients.length,
    cells: cx * cz,
    used,
    lived: lived.size,
    livedUsed,
    busiest: { at: [(top % cx) * LIFE_CELL, Math.floor(top / cx) * LIFE_CELL], count: perCell[top] ?? 0, share: ambients.length ? (perCell[top] ?? 0) / ambients.length : 0 },
    nearSpawn: ambients.filter((a) => Math.hypot(a.position[0] - spx, a.position[2] - spz) < SPAWN_RADIUS).length,
    inDoorway,
    inLane: lane,
    inWater: wet,
  };
}

async function main(): Promise<void> {
  for (const map of process.argv.slice(2)) {
    const r = await auditLife(map);
    const pct = (v: number): string => `${Math.round(v * 100)}%`;
    console.log(
      `${map}: ${r.count} ambients; ${r.used}/${r.cells} cells hold life; lived cells ${r.livedUsed}/${r.lived} (${pct(r.lived ? r.livedUsed / r.lived : 0)}); ` +
        `busiest cell [${r.busiest.at.join(',')}] ${r.busiest.count} (${pct(r.busiest.share)}); ${r.nearSpawn} within ${SPAWN_RADIUS} of the spawn; ` +
        `${r.inDoorway.length} in a doorway, ${r.inLane.length} in a lane's middle, ${r.inWater.length} in the water`,
    );
    for (const [what, ids] of [['doorway', r.inDoorway], ['lane', r.inLane], ['water', r.inWater]] as const) if (ids.length > 0) console.log(`  ${what}: ${ids.slice(0, 20).join(', ')}${ids.length > 20 ? ` … ${ids.length - 20} more` : ''}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
