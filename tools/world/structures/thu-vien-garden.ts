// Garden pieces of "Thư viện" after the owner's detail mock (designs/thu-vien/d-01, d-14, 02/10/2026): a stone
// bridge over a lake on three round arches, each arch ringed in lighter stone, a humped deck with a low
// parapet; and the slender clock tower standing apart behind the library, a clock face on two sides under
// a pointed red roof. Each writes blocks only and returns where its lamps go.
import { put, type WorldWriter } from './world-writer';

/**
 * A bridge along x from `x0` to `x1` centred on row `z`, five blocks wide, its deck rising from `ground` at
 * the ends two blocks to the middle; under it three arches open from the lake's bed over the water at
 * `water`, each `span` blocks wide, ringed in `ring` on both faces; a parapet a block high along both
 * edges. Returns lamp cells on the parapet at both ends and the middle.
 */
export function placeArchedBridge(
  world: WorldWriter,
  x0: number,
  x1: number,
  z: number,
  ground: number,
  water: number,
  b: { stone: number; ring: number; parapet: number; deck: number; water: number },
  span = 9,
): { lamps: Array<[number, number]> } {
  const length = x1 - x0;
  const mid = (x0 + x1) / 2;
  const arches = [mid - span - 1, mid, mid + span + 1];
  const half = span / 2;
  const rise = 3;
  const bed = water - 2;
  const inside = (x: number, y: number, grow: number): boolean => arches.some((ax) => ((x + 0.5 - ax - 0.5) / (half + grow)) ** 2 + ((y - water) / (rise + grow)) ** 2 < 1);
  for (let x = x0; x <= x1; x++) {
    const deck = ground + Math.round(2 * Math.sin((Math.PI * (x - x0)) / length));
    for (let dz = -2; dz <= 2; dz++) {
      const face = Math.abs(dz) === 2;
      for (let y = bed + 1; y <= deck; y++) {
        if (inside(x, y, 0) && y < deck) put(world, x, y, z + dz, y <= water ? b.water : 0);
        else put(world, x, y, z + dz, y === deck ? b.deck : face && inside(x, y, 1) ? b.ring : b.stone);
      }
      for (let y = deck + 1; y <= deck + 3; y++) put(world, x, y, z + dz, face && y === deck + 1 ? b.parapet : 0);
    }
  }
  const ends = [x0, Math.round(mid), x1];
  return { lamps: ends.flatMap((x): Array<[number, number]> => [[x, z - 2], [x, z + 2]]) };
}

/**
 * A square clock tower of side 7 on `baseY` at (cx, cz), solid (it has no door): cream walls with stone corners and bands, slit
 * windows lit at the top, a white clock face on its north and west sides near the top, a jutting cornice and
 * a pointed roof with an iron finial. Returns where the clock props go (north face, west face) and the top.
 */
export function placeClockTower(
  world: WorldWriter,
  cx: number,
  cz: number,
  baseY: number,
  b: { wall: number; trim: number; glass: number; lantern: number; dial: number; roof: number; finial: number },
  height = 22,
): { clocks: Array<{ at: [number, number, number]; yaw: number }>; top: number } {
  const top = baseY + height - 1;
  for (let y = baseY; y <= top; y++) {
    for (let dx = -3; dx <= 3; dx++) {
      for (let dz = -3; dz <= 3; dz++) {
        // A slender tower with no door: solid inside, never a sealed hollow.
        if (Math.max(Math.abs(dx), Math.abs(dz)) < 3) {
          put(world, cx + dx, y, cz + dz, b.wall);
          continue;
        }
        const corner = Math.abs(dx) === 3 && Math.abs(dz) === 3;
        const band = (y - baseY) % 6 === 0 || y === top;
        const u = Math.abs(dx) === 3 ? dz : dx;
        const slit = u === 0 && (y - baseY) % 6 >= 2 && (y - baseY) % 6 <= 4 && y < top - 6;
        put(world, cx + dx, y, cz + dz, corner || band ? b.trim : slit ? ((y - baseY) % 6 === 4 ? b.lantern : b.glass) : b.wall);
      }
    }
  }
  // The clock faces: a white disc ringed in stone, a block proud of the north and west walls.
  const dialY = top - 3;
  for (let u = -2; u <= 2; u++) {
    for (let v = -2; v <= 2; v++) {
      const d = Math.hypot(u, v);
      if (d > 2.6) continue;
      const id = d > 1.8 ? b.trim : b.dial;
      put(world, cx + u, dialY + v, cz - 4, id);
      put(world, cx - 4, dialY + v, cz + u, id);
    }
  }
  for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) if (Math.max(Math.abs(dx), Math.abs(dz)) === 4) put(world, cx + dx, top + 1, cz + dz, b.trim);
  let y = top + 2;
  for (let r = 4; r >= 0; r--, y++) for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) put(world, cx + dx, y, cz + dz, b.roof);
  put(world, cx, y, cz, b.finial);
  put(world, cx, y + 1, cz, b.finial);
  return {
    clocks: [
      { at: [cx + 0.5, dialY - 1.5, cz - 4.15], yaw: 180 },
      { at: [cx - 4.15, dialY - 1.5, cz + 0.5], yaw: 270 },
    ],
    top: y + 1,
  };
}
