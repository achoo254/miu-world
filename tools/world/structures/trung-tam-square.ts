// Block structures of the hub, Trung tâm, after the owner's detail mock (designs/trung-tam/d-01 … d-08,
// 02/10/2026): the tiered fountain under the great white cat holding its book, the portals turned to face
// the square from its north side, the square clock tower with a face on every side, and the castle on its
// terrace behind the square (the backdrop of d-01: curtain walls with battlements and lit windows, round
// towers under pointed red roofs with flags, the gatehouse with its glowing gate and the hall behind it).
// Each writes blocks only and returns where its props go; the map file decides where they stand.
import { battlements, castleRoom, fillBox, type Rect } from './lau-dai-castle';
import { placeBanner, placeTower, type TowerBlocks } from './landmarks';
import { placePortal, type PortalBlocks } from './truong-hoc-plaza';
import { facingWriter, FRAME, frameCell, put, turnCell, type Facing, type WorldWriter } from './world-writer';

/** A point of a structure's own frame (fractional) in the world, the frame turned as `facingWriter` turns it. */
export function framePoint(origin: readonly [number, number], facing: Facing, u: number, v: number): [number, number] {
  const [cx, cz] = frameCell(origin, facing, Math.floor(u), Math.floor(v));
  const [dx, dz] = turnCell([0, 0], facing, u - Math.floor(u) - 0.5, v - Math.floor(v) - 0.5);
  return [cx + 0.5 + dx, cz + 0.5 + dz];
}

export interface FountainBlocks {
  stone: number;
  rim: number;
  water: number;
}

/**
 * The square's fountain (d-01): a round basin nine blocks out with a stone rim, a raised middle tier five out
 * and a top tier three out, each holding water, spouts falling from each tier into the one below, and a
 * pedestal in the middle. Returns where the statue sits (on the pedestal) and the basin's outer radius.
 */
export function placeTieredFountain(world: WorldWriter, cx: number, cz: number, baseY: number, b: FountainBlocks): { statue: [number, number, number]; radius: number } {
  const radius = 9.4;
  for (let dx = -10; dx <= 10; dx++) {
    for (let dz = -10; dz <= 10; dz++) {
      const d = Math.hypot(dx, dz);
      const [x, z] = [cx + dx, cz + dz];
      if (d > radius) continue;
      if (d > radius - 1) {
        put(world, x, baseY - 1, z, b.rim);
        put(world, x, baseY, z, b.rim);
        continue;
      }
      put(world, x, baseY - 2, z, b.stone);
      put(world, x, baseY - 1, z, b.water);
      // The middle tier: a stone drum up to baseY + 1, its rim and water a block over it.
      if (d <= 5.4) {
        for (let y = baseY - 1; y <= baseY + 1; y++) put(world, x, y, z, b.stone);
        put(world, x, baseY + 2, z, d > 4.4 ? b.rim : b.water);
      }
      // The top tier on its column: rim and water at baseY + 4.
      if (d <= 2.9) {
        for (let y = baseY + 2; y <= baseY + 3; y++) put(world, x, y, z, b.stone);
        put(world, x, baseY + 4, z, d > 1.9 ? b.rim : b.water);
      }
    }
  }
  // Spouts: water falling over each tier's rim at eight points, into the tier below.
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const [ox, oz] = [Math.round(Math.cos(a) * 5.6), Math.round(Math.sin(a) * 5.6)];
    for (let y = baseY - 1; y <= baseY + 1; y++) put(world, cx + ox, y, cz + oz, b.water);
    if (k % 2 === 0) {
      const [ix, iz] = [Math.round(Math.cos(a) * 3.1), Math.round(Math.sin(a) * 3.1)];
      for (let y = baseY + 2; y <= baseY + 3; y++) put(world, cx + ix, y, cz + iz, b.water);
    }
  }
  // The pedestal the cat sits on.
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) for (let y = baseY + 4; y <= baseY + 5; y++) put(world, cx + dx, y, cz + dz, b.rim);
  return { statue: [cx, baseY + 6, cz], radius };
}

export interface CatBlocks {
  fur: number;
  eye: number;
  coat: number;
  trim: number;
  book: number;
  page: number;
}

/**
 * The great white cat of the square (d-01) sitting on (cx, y, cz) and looking toward +z: a body in a blue coat
 * with a gold belt, a big head with pointed ears and dark eyes, a red book held to its chest with both paws,
 * its tail curled up behind. Eleven blocks tall.
 */
export function placeBigCat(world: WorldWriter, cx: number, y: number, cz: number, b: CatBlocks): void {
  // Body: five wide, four deep, four tall; the coat over the fur, a gold belt.
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 1; dz++) {
      for (let dy = 0; dy <= 3; dy++) put(world, cx + dx, y + dy, cz + dz, dy === 1 ? b.trim : Math.abs(dx) === 2 && dz === 1 && dy === 0 ? b.fur : b.coat);
    }
  }
  // Feet in front.
  for (const dx of [-2, -1, 1, 2]) put(world, cx + dx, y, cz + 2, b.fur);
  // Head: seven wide, five deep, five tall, white; ears on top.
  for (let dx = -3; dx <= 3; dx++) for (let dz = -2; dz <= 2; dz++) for (let dy = 4; dy <= 8; dy++) put(world, cx + dx, y + dy, cz + dz, b.fur);
  for (const s of [-1, 1]) {
    for (const [ex, ey] of [[3, 9], [2, 9], [3, 10]] as const) for (const dz of [-1, 0]) put(world, cx + s * ex, y + ey, cz + dz, b.fur);
    // Eyes, two tall, on the face (+z).
    for (const dy of [5, 6]) put(world, cx + s * 2, y + dy, cz + 2, b.eye);
  }
  put(world, cx, y + 5, cz + 2, b.trim);
  // The book held up to its chest, its pages on top, the paws round it.
  for (let dx = -1; dx <= 1; dx++) {
    for (const dy of [1, 2]) put(world, cx + dx, y + dy, cz + 2, b.book);
    put(world, cx + dx, y + 3, cz + 2, b.page);
  }
  for (const s of [-1, 1]) put(world, cx + s * 2, y + 2, cz + 2, b.fur);
  // The tail, curled up the back.
  for (let dy = 0; dy <= 3; dy++) put(world, cx + 2, y + dy, cz - 3, b.fur);
  put(world, cx + 1, y + 3, cz - 3, b.fur);
}

/**
 * A portal (placePortal's arch, d-06) turned to face +z: its opening five wide along x round (cx, cz), its
 * back a block north. Returns where its pane and its name board go (both facing +z, yaw 180) and the
 * ground cells either side of its step for pots or lamps.
 */
export function placePortalFacingSouth(world: WorldWriter, cx: number, cz: number, baseY: number, b: PortalBlocks): { pane: [number, number, number]; sign: [number, number, number]; feet: Array<[number, number]> } {
  // placePortal's front is -x in its frame; a frame turned west fronts +z in the world.
  placePortal(facingWriter(world, [cx, cz], 'west'), FRAME, FRAME, baseY, -1, b);
  return {
    pane: [cx + 0.5, baseY, cz + 1.12],
    sign: [cx + 0.5, baseY + 5.1, cz + 1.14],
    feet: [[cx - 5, cz + 1], [cx + 5, cz + 1]],
  };
}

export interface ClockTowerBlocks {
  wall: number;
  corner: number;
  glass: number;
  roof: number;
  pole: number;
  flag: number;
  lantern: number;
}

/**
 * The square clock tower (d-01): seven across, `height` tall, stone walls with darker corners and a door on
 * +z, slit windows up its sides, a lit belfry ring over the clock, a cornice, a pointed hipped roof with a
 * flag. Returns where the four clock faces hang (the middle of each face's wall, outside it) and their yaws.
 */
export function placeClockTower(world: WorldWriter, cx: number, cz: number, baseY: number, height: number, b: ClockTowerBlocks): { faces: Array<{ at: [number, number, number]; yaw: number }>; top: number } {
  const r = 3;
  const top = baseY + height;
  for (let dx = -r; dx <= r; dx++) {
    for (let dz = -r; dz <= r; dz++) {
      const edge = Math.abs(dx) === r || Math.abs(dz) === r;
      if (!edge) continue;
      const corner = Math.abs(dx) === r && Math.abs(dz) === r;
      for (let y = baseY; y < top; y++) {
        if (dz === r && Math.abs(dx) <= 1 && y < baseY + 3) continue; // the door
        const slit = !corner && (dx === 0 || dz === 0) && (y - baseY) % 5 === 3 && y < top - 8;
        const belfry = !corner && y >= top - 2 && Math.abs(dx) !== r - 1 && Math.abs(dz) !== r - 1;
        put(world, cx + dx, y, cz + dz, corner ? b.corner : belfry ? b.lantern : slit ? b.glass : b.wall);
      }
    }
  }
  for (let dx = -r - 1; dx <= r + 1; dx++) for (let dz = -r - 1; dz <= r + 1; dz++) put(world, cx + dx, top, cz + dz, b.corner);
  // A hipped roof stepping in a block every two rows to a point, the flag on a pole over it.
  let y = top + 1;
  for (let k = r + 1; k >= 0; k--) {
    for (let row = 0; row < (k === 0 ? 1 : 2); row++, y++) for (let dx = -k; dx <= k; dx++) for (let dz = -k; dz <= k; dz++) put(world, cx + dx, y, cz + dz, b.roof);
  }
  for (let py = y; py <= y + 2; py++) put(world, cx, py, cz, b.pole);
  put(world, cx + 1, y + 2, cz, b.flag);
  put(world, cx + 2, y + 2, cz, b.flag);
  put(world, cx + 1, y + 1, cz, b.flag);
  const faceY = top - 6.2;
  return {
    faces: [
      { at: [cx + 0.5, faceY, cz + r + 1.08], yaw: 180 },
      { at: [cx + 0.5, faceY, cz - r - 0.08], yaw: 0 },
      { at: [cx + r + 1.08, faceY, cz + 0.5], yaw: 270 },
      { at: [cx - r - 0.08, faceY, cz + 0.5], yaw: 90 },
    ],
    top: y + 2,
  };
}

export interface CastleBlocks {
  wall: number;
  trim: number;
  roof: number;
  glass: number;
  lantern: number;
  floor: number;
  carpet: number;
  beam: number;
  cloth: number;
  emblem: number;
  pole: number;
}

export interface HubCastle {
  /** The curtain wall's outer face (front, z) and its ends (x). */
  front: number;
  /** The gate's opening (its middle column, its front row) and the glowing pane's foot. */
  gate: { x: number; z: number; pane: [number, number, number] };
  /** The hall behind the gate: its room and where its chandeliers hang. */
  hall: Rect;
  lights: Array<[number, number, number]>;
  /** The tallest towers' cornices (the keep's and the hall's), where their upper stages (box props) stand. */
  crowns: Array<{ at: [number, number, number]; radius: 3 | 4 }>;
}

/**
 * The castle on its terrace (d-01's backdrop) with its front toward +z: a curtain wall two thick and `wallH`
 * high from x0 to x1 at `front`, going back to `back`, battlements and lit windows along it, red banners
 * between round towers under red roofs with flags (the four corners, two along the front, two over the
 * hall), the gatehouse jutting forward with its arched opening, and the hall behind the gate (its floor
 * paved, a red carpet up the middle, beams under the ceiling, lit windows). `baseY` is the terrace's
 * standing height.
 */
export function placeHubCastle(world: WorldWriter, spec: { x0: number; x1: number; front: number; back: number; gateX: number; baseY: number; wallH: number }, b: CastleBlocks): HubCastle {
  const { x0, x1, front, back, gateX, baseY, wallH } = spec;
  const top = baseY + wallH;
  const walls: Rect = { x0, z0: back, x1, z1: front };
  for (let x = x0; x <= x1; x++) {
    for (let z = back; z <= front; z++) {
      const ring = x <= x0 + 1 || x >= x1 - 1 || z <= back + 1 || z >= front - 1;
      if (!ring) continue;
      for (let y = baseY; y < top; y++) {
        const outer = z === front || x === x0 || x === x1 || z === back;
        // Lit arched windows in a row along the outer faces, every six blocks.
        const along = z === front || z === back ? x - x0 : z - back;
        const window = outer && y >= baseY + 4 && y <= baseY + 5 && along % 6 === 3;
        put(world, x, y, z, y === baseY ? b.trim : window ? (y === baseY + 5 ? b.glass : b.lantern) : b.wall);
      }
    }
  }
  battlements(world, walls, top, b.wall);
  for (let x = x0; x <= x1; x++) put(world, x, top - 1, front + 1, b.trim);
  // The gatehouse: jutting four blocks in front of the wall, four higher, its opening five wide and six high.
  const gh: Rect = { x0: gateX - 8, x1: gateX + 8, z0: front - 1, z1: front + 4 };
  fillBox(world, gh.x0, baseY, gh.z0, gh.x1, top + 3, gh.z1, b.wall);
  fillBox(world, gh.x0, baseY, gh.z1, gh.x1, baseY, gh.z1, b.trim);
  battlements(world, { ...gh, z0: gh.z0 - 1 }, top + 4, b.wall);
  for (let x = gh.x0; x <= gh.x1; x++) put(world, x, top + 3, gh.z1 + 1, b.trim);
  // The hall behind the gate.
  const hall: Rect = { x0: gateX - 16, x1: gateX + 16, z0: back + 30, z1: front - 2 };
  castleRoom(world, hall, baseY, 9, { wall: b.wall, plinth: b.trim, floor: b.floor, ceiling: b.wall, beam: b.beam });
  for (let z = hall.z0 + 1; z < hall.z1; z++) for (let x = gateX - 1; x <= gateX + 1; x++) put(world, x, baseY - 1, z, b.carpet);
  for (let z = hall.z0 + 4; z < hall.z1 - 2; z += 6) {
    for (const x of [hall.x0, hall.x1]) for (const y of [baseY + 3, baseY + 4, baseY + 5]) put(world, x, y, z, y === baseY + 5 ? b.glass : b.lantern);
    // Pillars down both sides of the carpet.
    for (const x of [gateX - 7, gateX + 7]) for (let y = baseY; y < baseY + 9; y++) put(world, x, y, z, b.trim);
  }
  // The opening through the gatehouse, the wall and the hall's front: five wide, the top row three.
  for (let z = gh.z0 - 1; z <= gh.z1; z++) {
    for (let dx = -2; dx <= 2; dx++) for (let y = baseY; y < baseY + (Math.abs(dx) === 2 ? 5 : 6); y++) put(world, gateX + dx, y, z, 0);
    if (z === gh.z1) for (let dx = -3; dx <= 3; dx++) put(world, gateX + dx, baseY + 6, z, b.trim);
  }
  for (let z = hall.z1 - 1; z <= gh.z1; z++) for (let dx = -2; dx <= 2; dx++) put(world, gateX + dx, baseY - 1, z, b.carpet);
  // Banners down the front between the towers, and two on the gatehouse either side of the gate.
  for (let x = x0 + 12; x < x1 - 10; x += 16) if (Math.abs(x - gateX) > 14) placeBanner(world, x, top - 2, front + 1, 'x', { cloth: b.cloth, emblem: b.emblem }, 5);
  for (const s of [-1, 1]) placeBanner(world, gateX + s * 5 - (s > 0 ? 1 : 0), top + 1, gh.z1 + 1, 'x', { cloth: b.cloth, emblem: b.emblem }, 4);
  // Towers: the four corners, two along the front, two over the hall, the keep's tall one in the middle.
  const towers: TowerBlocks = { wall: b.wall, trim: b.trim, roof: b.roof, glass: b.glass, flag: b.cloth, pole: b.pole };
  const crowns: HubCastle['crowns'] = [];
  for (const [tx, tz, r, h, crowned] of [
    [x0, front, 4, 12, false],
    [x1, front, 4, 12, false],
    [x0, back, 3, 11, false],
    [x1, back, 3, 11, false],
    [x0 + Math.round((gateX - x0) / 2), front, 3, 11, false],
    [x1 - Math.round((x1 - gateX) / 2), front, 3, 11, false],
    [gateX - 20, hall.z0 - 2, 3, 15, true],
    [gateX + 20, hall.z0 - 2, 3, 15, true],
    [gateX, hall.z0 - 4, 4, 13, true],
  ] as const) {
    const { cornice, tip } = placeTower(world, tx, tz, baseY, r, h, towers, false);
    if (!crowned) continue;
    // The world is 48 blocks tall: the tallest towers go on as a box-prop upper stage from their cornice.
    for (let y = cornice + 1; y <= tip + 3; y++) for (let dx = -r - 3; dx <= r + 3; dx++) for (let dz = -r - 3; dz <= r + 3; dz++) put(world, tx + dx, y, tz + dz, 0);
    crowns.push({ at: [tx + 0.5, cornice + 1, tz + 0.5], radius: r });
  }
  // The keep over the hall: its walls rising above the curtain with rows of lit windows, a red gable roof
  // along x over it, so the castle stands tall behind the square (d-01).
  const keep: Rect = { x0: hall.x0 + 4, x1: hall.x1 - 4, z0: hall.z0 + 4, z1: hall.z0 + 22 };
  const keepTop = baseY + 17;
  for (let x = keep.x0; x <= keep.x1; x++) {
    for (let z = keep.z0; z <= keep.z1; z++) {
      const edge = x === keep.x0 || x === keep.x1 || z === keep.z0 || z === keep.z1;
      if (!edge) continue;
      for (let y = baseY + 9; y < keepTop; y++) {
        const along = z === keep.z0 || z === keep.z1 ? x - keep.x0 : z - keep.z0;
        const window = (y - baseY) % 4 === 2 && along % 4 === 2;
        put(world, x, y, z, window ? b.lantern : b.wall);
      }
    }
  }
  const half = Math.ceil((keep.z1 - keep.z0 + 2) / 2);
  for (let z = keep.z0 - 1; z <= keep.z1 + 1; z++) {
    const step = Math.min(z - (keep.z0 - 1), keep.z1 + 1 - z);
    for (let x = keep.x0 - 1; x <= keep.x1 + 1; x++) {
      put(world, x, keepTop + step, z, b.roof);
      if ((x === keep.x0 || x === keep.x1) && step > 0 && step < half) for (let y = keepTop; y < keepTop + step; y++) put(world, x, y, z, b.wall);
    }
  }
  const lights: Array<[number, number, number]> = [];
  for (let z = hall.z0 + 6; z < hall.z1 - 3; z += 10) lights.push([gateX + 0.5, baseY + 5.8, z + 0.5]);
  return { front: gh.z1, gate: { x: gateX, z: gh.z1, pane: [gateX + 0.5, baseY, gh.z1 + 1.12] }, hall, lights, crowns };
}
