// Block pieces of the castle of "Lâu đài" after the owner's detail mock (designs/lau-dai/d-*, 02/10/2026):
// stone rooms with a timbered ceiling (the great hall, the library, the dining hall, the bedchamber, the
// dungeon), arched doorways and tall arched windows, battlements, a gable roof along the depth of a hall,
// iron bars across a cell. Each writes blocks only; the map file decides where they stand and dresses them.
import { put, type WorldWriter } from './world-writer';

/** An inclusive rectangle of columns. */
export interface Rect {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

/** Every block of an inclusive box. */
export function fillBox(world: WorldWriter, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, id: number): void {
  for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) put(world, x, y, z, id);
  }
}

export interface RoomBlocks {
  wall: number;
  /** The course along the foot of the walls and the posts at the corners. */
  plinth: number;
  /** The floor inside (written over the ground's top at `baseY - 1`). */
  floor: number;
  ceiling: number;
  /** Beams across the room under its ceiling, one every four blocks. */
  beam: number;
}

/**
 * A room of stone: four walls `height` high on `baseY` round `r` (walls on its edge), a plinth course,
 * the floor, a flat ceiling on top of the walls and beams under it across the short side. The doors and
 * windows are cut afterwards (`archway`, `archWindow`).
 */
export function castleRoom(world: WorldWriter, r: Rect, baseY: number, height: number, b: RoomBlocks): void {
  const top = baseY + height;
  for (let x = r.x0; x <= r.x1; x++) {
    for (let z = r.z0; z <= r.z1; z++) {
      const edgeX = x === r.x0 || x === r.x1;
      const edgeZ = z === r.z0 || z === r.z1;
      if (edgeX || edgeZ) {
        for (let y = baseY; y < top; y++) put(world, x, y, z, y === baseY || (edgeX && edgeZ) ? b.plinth : b.wall);
      } else {
        put(world, x, baseY - 1, z, b.floor);
        for (let y = baseY; y < top; y++) put(world, x, y, z, 0);
      }
      put(world, x, top, z, b.ceiling);
    }
  }
  const alongX = r.x1 - r.x0 >= r.z1 - r.z0;
  if (alongX) for (let x = r.x0 + 2; x < r.x1; x += 4) for (let z = r.z0 + 1; z < r.z1; z++) put(world, x, top - 1, z, b.beam);
  else for (let z = r.z0 + 2; z < r.z1; z += 4) for (let x = r.x0 + 1; x < r.x1; x++) put(world, x, top - 1, z, b.beam);
}

/**
 * An opening through a wall: along x (`across` 'x', the wall runs along x at `z`) or along z, from `a` to
 * `b` inclusive, `height` high on `baseY`, its top row stepped in by one block at each side (an arch).
 */
export function archway(world: WorldWriter, across: 'x' | 'z', fixed: number, a: number, b: number, baseY: number, height: number): void {
  const [lo, hi] = [Math.min(a, b), Math.max(a, b)];
  for (let s = lo; s <= hi; s++) {
    const edge = s === lo || s === hi;
    const h = edge && hi - lo >= 2 ? height - 1 : height;
    for (let y = baseY; y < baseY + h; y++) {
      if (across === 'x') put(world, s, y, fixed, 0);
      else put(world, fixed, y, s, 0);
    }
  }
}

/**
 * A tall arched window two blocks wide in a wall along x (`across` 'x', at `z`) or along z, its first
 * column at `at`: glass from `baseY` for `height` rows, the top row a single pane (the arch), a stone sill.
 */
export function archWindow(world: WorldWriter, across: 'x' | 'z', fixed: number, at: number, baseY: number, height: number, b: { glass: number; sill: number }): void {
  const set = (s: number, y: number, id: number): void => (across === 'x' ? put(world, s, y, fixed, id) : put(world, fixed, y, s, id));
  for (let y = baseY; y < baseY + height - 1; y++) for (const s of [at, at + 1]) set(s, y, b.glass);
  set(at, baseY + height - 1, b.glass);
  for (const s of [at - 1, at, at + 1, at + 2]) set(s, baseY - 1, b.sill);
}

/** Merlons on every other block of the outer ring of `r` at `y`. */
export function battlements(world: WorldWriter, r: Rect, y: number, id: number): void {
  for (let x = r.x0; x <= r.x1; x++) {
    for (let z = r.z0; z <= r.z1; z++) {
      const edge = x === r.x0 || x === r.x1 || z === r.z0 || z === r.z1;
      if (edge && (x + z) % 2 === 0) put(world, x, y, z, id);
    }
  }
}

/**
 * A gable roof over `r` whose ridge runs along z through the middle of x: from `y` at the eaves (one block
 * past the walls) rising one block every two, the gable ends (z0 and z1) filled with `gable`, and the loft
 * between the ceiling at `y` and the roof filled with it too, so no hollow space hides under the roof.
 */
export function gableRoofAlongZ(world: WorldWriter, r: Rect, y: number, b: { roof: number; ridge: number; gable: number }): number {
  const mid = (r.x0 + r.x1) / 2;
  let peak = y;
  for (let x = r.x0 - 1; x <= r.x1 + 1; x++) {
    const rise = Math.floor((Math.min(x - (r.x0 - 1), r.x1 + 1 - x)) / 2);
    const yy = y + rise;
    peak = Math.max(peak, yy);
    const ridge = Math.abs(x - mid) < 1;
    for (let z = r.z0 - 1; z <= r.z1 + 1; z++) put(world, x, yy, z, ridge ? b.ridge : b.roof);
    if (x >= r.x0 && x <= r.x1) for (let z = r.z0; z <= r.z1; z++) for (let fy = y + 1; fy < yy; fy++) put(world, x, fy, z, b.gable);
    if (x >= r.x0 && x <= r.x1) for (const z of [r.z0, r.z1]) put(world, x, y, z, b.gable);
  }
  return peak;
}

export interface RoundRoomBlocks {
  wall: number;
  trim: number;
  floor: number;
  roof: number;
  beam: number;
  /** Below the floor down to the hill's foot. */
  footing: number;
}

/**
 * A round stone room (the watchtower of d-10): a wall `radius` round and `height` high on `baseY`, a plank
 * floor on a stone footing four deep (the tower stands on a slope), an arched door three wide and four high
 * on the +x side, wide open windows on the other three sides with sills three high (the child looks out,
 * she does not climb out), beams under a plank ceiling, and a red cone stepped one block a row over a
 * cornice. Returns the ceiling's height and the cone's tip.
 */
export function roundRoom(world: WorldWriter, cx: number, cz: number, baseY: number, radius: number, height: number, b: RoundRoomBlocks): { ceiling: number; tip: number } {
  const span = radius + 2;
  const ceiling = baseY + height;
  for (let dx = -span; dx <= span; dx++) {
    for (let dz = -span; dz <= span; dz++) {
      const d = Math.hypot(dx, dz);
      const [x, z] = [cx + dx, cz + dz];
      if (d > radius + 0.4) {
        if (d <= radius + 1.4) put(world, x, ceiling, z, b.trim);
        continue;
      }
      for (let y = baseY - 4; y < baseY - 1; y++) put(world, x, y, z, b.footing);
      put(world, x, baseY - 1, z, d > radius - 0.9 ? b.trim : b.floor);
      put(world, x, ceiling, z, b.trim);
      if (d <= radius - 0.9) {
        for (let y = baseY; y < ceiling; y++) put(world, x, y, z, 0);
        put(world, x, ceiling - 1, z, Math.abs(dz) === 3 || dx === 0 ? b.beam : 0);
        put(world, x, ceiling, z, b.floor);
        continue;
      }
      const door = dx > 0 && Math.abs(dz) <= 1;
      // The windows: west, north and south, five across, from three blocks over the floor to under the beams.
      const across = Math.abs(dx) > Math.abs(dz) ? Math.abs(dz) : Math.abs(dx);
      const window = !door && across <= 2 && !(dx > 0 && Math.abs(dx) > Math.abs(dz));
      for (let y = baseY; y < ceiling; y++) {
        const open = (door && y < baseY + 4) || (window && y >= baseY + 3 && y < ceiling - 2);
        put(world, x, y, z, open ? 0 : y === baseY || across === 3 ? b.trim : b.wall);
      }
    }
  }
  // The cone: from one block past the cornice, in a block a row, to a single cap.
  let r = radius + 1.6;
  let y = ceiling + 1;
  while (r > 0.5) {
    for (let dx = -span; dx <= span; dx++) for (let dz = -span; dz <= span; dz++) if (Math.hypot(dx, dz) <= r + 0.35) put(world, cx + dx, y, cz + dz, b.roof);
    r -= 1;
    y++;
  }
  put(world, cx, y, cz, b.trim);
  return { ceiling, tip: y };
}

/**
 * A booth for the review show inside the great hall: corner posts three high, a counter one high along its
 * front (z0) and a shelf two high along its back, and striped cloth valances across the top of front and back
 * (no roof: the hall's ceiling is over it, and nothing flat up there for the child to be stuck on).
 */
export function reviewBooth(world: WorldWriter, x0: number, z0: number, w: number, d: number, baseY: number, b: { log: number; planks: number; stripes: readonly number[] }): void {
  const [x1, z1] = [x0 + w - 1, z0 + d - 1];
  for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]] as const) for (let y = baseY; y < baseY + 3; y++) put(world, x, y, z, b.log);
  for (let x = x0 + 1; x < x1; x++) {
    put(world, x, baseY, z0, b.planks);
    put(world, x, baseY, z1, b.planks);
    put(world, x, baseY + 1, z1, b.planks);
  }
  for (let x = x0; x <= x1; x++) {
    const stripe = b.stripes[(x - x0) % b.stripes.length] ?? b.planks;
    for (const z of [z0, z1]) put(world, x, baseY + 3, z, stripe);
  }
}

/** Iron bars across an opening: a bar every other block from `a` to `b`, a rail along the top. */
export function ironBars(world: WorldWriter, across: 'x' | 'z', fixed: number, a: number, b: number, baseY: number, height: number, iron: number): void {
  for (let s = Math.min(a, b); s <= Math.max(a, b); s++) {
    for (let y = baseY; y < baseY + height; y++) {
      const id = s % 2 === 0 || y === baseY + height - 1 ? iron : 0;
      if (across === 'x') put(world, s, y, fixed, id);
      else put(world, fixed, y, s, id);
    }
  }
}
