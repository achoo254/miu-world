// Block buildings of "Núi tuyết" after the owner's detail mock (designs/nui-tuyet/d-01 … d-15, 02/10/2026):
// timber chalets on a stone foot under deep snow roofs with warm lit windows (the village, the lodge, the
// shop, the quest station, the research huts), the village clock tower, the gate of timber and stone, the
// cable car's station shelters, the observatory's dome on the summit, the stone viaduct of many arches and
// the plank bridges on log trestles. Each writes blocks only and returns where its dressing goes; the map
// file decides where they stand.
import { FRAME, frameCell, put, type Facing, type WorldWriter } from './world-writer';

/** An inclusive rectangle of columns. */
export interface Rect {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

export interface ChaletBlocks {
  /** The stone courses at the foot of the walls. */
  stone: number;
  /** The walls between the posts. */
  timber: number;
  /** Corner posts, a post every four blocks, the storey beam and the top beam. */
  post: number;
  /** The roof's top (snow) and the boards under it, seen at the eaves and the gables. */
  roof: number;
  eave: number;
  /** Window panes (a lit window glows at dusk). */
  window: number;
  floor: number;
  chimney: number;
}

export interface Chalet {
  /** The cell before the door's middle (outside), and the door's three cells. */
  door: [number, number];
  doorCells: Array<[number, number]>;
  /** Cells by the door for a lantern each side (outside, against the wall). */
  lamps: Array<[number, number]>;
  /** y of the eaves over the front wall, and of the roof's ridge. */
  eaves: number;
  ridge: number;
}

/**
 * A chalet of `w` x `d` on `baseY` with walls `wall` high, its door (three wide and three high, so the child
 * walks in without a squeeze) in the middle of the -z side on a sill of stone: `stoneCourses` of stone at the foot, timber walls with posts every four blocks, a beam at
 * mid height on a tall house, lit windows in one row (two on a tall house), a gable roof whose ridge runs
 * along x, two layers (boards under snow) overhanging one block, a lit window in each gable, a chimney.
 * The inside is cleared and floored: every chalet can be walked into.
 */
export function placeChalet(world: WorldWriter, x0: number, z0: number, w: number, d: number, wall: number, baseY: number, b: ChaletBlocks, stoneCourses = 1): Chalet {
  const x1 = x0 + w - 1;
  const z1 = z0 + d - 1;
  const doorX = x0 + Math.floor(w / 2);
  const tall = wall >= 7;
  const top = baseY + wall - 1;
  const windowRows = tall ? [baseY + 1, baseY + 2, baseY + 4, baseY + 5] : [baseY + 1, baseY + 2];
  for (let x = x0 + 1; x < x1; x++) {
    for (let z = z0 + 1; z < z1; z++) {
      put(world, x, baseY - 1, z, b.floor);
      for (let y = baseY; y <= top; y++) put(world, x, y, z, 0);
    }
  }
  for (let y = baseY; y <= top; y++) {
    for (let x = x0; x <= x1; x++) {
      for (let z = z0; z <= z1; z++) {
        const edgeX = x === x0 || x === x1;
        const edgeZ = z === z0 || z === z1;
        if (!edgeX && !edgeZ) continue;
        const [i, length] = edgeZ ? [x - x0, w] : [z - z0, d];
        const door = z === z0 && Math.abs(x - doorX) <= 1 && y < baseY + 3;
        if (door) {
          put(world, x, y, z, 0);
          continue;
        }
        const nearDoor = z === z0 && Math.abs(x - doorX) <= 2;
        const corner = edgeX && edgeZ;
        const beam = y === top || (tall && y === baseY + 3);
        const window = !corner && !beam && !nearDoor && i % 4 === 2 && i < length - 1 && windowRows.includes(y);
        let id = b.timber;
        if (corner || beam || i % 4 === 0) id = b.post;
        if (y < baseY + stoneCourses) id = b.stone;
        if (window) id = b.window;
        put(world, x, y, z, id);
      }
    }
  }
  // A lintel over the door, the sill under it level with the floor.
  for (let x = doorX - 1; x <= doorX + 1; x++) {
    put(world, x, baseY + 3, z0, b.post);
    put(world, x, baseY - 1, z0, b.stone);
  }
  // The roof: each row one block higher toward the ridge, boards under the snow, eaves one block out.
  const half = Math.ceil((d + 2) / 2);
  let ridge = baseY + wall;
  for (let z = z0 - 1; z <= z1 + 1; z++) {
    const step = Math.min(z - (z0 - 1), z1 + 1 - z);
    const y = baseY + wall + step;
    ridge = Math.max(ridge, y);
    for (let x = x0 - 1; x <= x1 + 1; x++) {
      put(world, x, y, z, b.roof);
      put(world, x, y - 1, z, b.eave);
      if ((x === x0 || x === x1) && step > 0 && step < half) for (let fy = baseY + wall; fy < y - 1; fy++) put(world, x, fy, z, b.timber);
    }
  }
  // A lit window high in each gable.
  const midZ = Math.floor((z0 + z1) / 2);
  for (const x of [x0, x1]) if (ridge - baseY - wall >= 3) put(world, x, baseY + wall + 1, midZ, b.window);
  // The chimney through the back slope, near the east gable.
  if (w >= 7) {
    const [cx, cz] = [x1 - 2, z1 - 1];
    const slope = baseY + wall + Math.min(cz - (z0 - 1), z1 + 1 - cz);
    for (let y = slope - 1; y <= Math.max(slope + 2, ridge + 1); y++) put(world, cx, y, cz, b.chimney);
  }
  return {
    door: [doorX, z0 - 1],
    doorCells: [[doorX - 1, z0], [doorX, z0], [doorX + 1, z0]],
    lamps: [[doorX - 2, z0 - 1], [doorX + 2, z0 - 1]],
    eaves: baseY + wall,
    ridge,
  };
}

/**
 * Where a structure's own frame (FRAME-based, front toward -z, `w` along its front and `d` deep) must start so
 * that, turned to `facing`, its footprint fills the world rectangle `r`; and the frame's size.
 */
export function frameFor(r: Rect, facing: Facing): { origin: [number, number]; w: number; d: number } {
  const [ex, ez] = [r.x1 - r.x0 + 1, r.z1 - r.z0 + 1];
  if (facing === 'north') return { origin: [r.x0, r.z0], w: ex, d: ez };
  if (facing === 'south') return { origin: [r.x1, r.z1], w: ex, d: ez };
  if (facing === 'east') return { origin: [r.x1, r.z0], w: ez, d: ex };
  return { origin: [r.x0, r.z1], w: ez, d: ex };
}

/** The world column of a frame cell given relative to the frame's corner (u along the front, v inward). */
export const frameAt = (origin: readonly [number, number], facing: Facing, u: number, v: number): [number, number] => frameCell(origin, facing, FRAME + u, FRAME + v);

export interface TowerBlocks {
  stone: number;
  timber: number;
  post: number;
  roof: number;
  snow: number;
  window: number;
  floor: number;
}

/**
 * The village clock tower (d-02): a stone foot seven blocks square, a timber shaft as wide with lit windows
 * (no ledge left round it where nobody can climb), a clock stage seven square banded by beams (the clock
 * faces are props on its four sides), a dark pyramid roof under snow. Its door faces -z. Returns the middle of each face of the clock stage (x, y, z, yaw) and the
 * roof's tip.
 */
export function placeClockTower(world: WorldWriter, cx: number, cz: number, baseY: number, b: TowerBlocks): { faces: Array<[number, number, number, number]>; tip: number } {
  const ring = (half: number, y0: number, y1: number, id: (dx: number, dz: number, y: number) => number): void => {
    for (let y = y0; y <= y1; y++) {
      for (let dx = -half; dx <= half; dx++) {
        for (let dz = -half; dz <= half; dz++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== half) continue;
          put(world, cx + dx, y, cz + dz, id(dx, dz, y));
        }
      }
    }
  };
  for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) put(world, cx + dx, baseY - 1, cz + dz, b.floor);
  ring(3, baseY, baseY + 5, (dx, dz, y) => (dz === -3 && Math.abs(dx) <= 1 && y < baseY + 3 ? 0 : y === baseY + 5 ? b.post : b.stone));
  for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) for (let y = baseY; y <= baseY + 4; y++) if (Math.max(Math.abs(dx), Math.abs(dz)) < 3) put(world, cx + dx, y, cz + dz, 0);
  ring(3, baseY + 6, baseY + 15, (dx, dz, y) => {
    const corner = Math.abs(dx) === 3 && Math.abs(dz) === 3;
    const win = !corner && (dx === 0 || dz === 0) && (y - baseY) % 4 === 0;
    return corner || y === baseY + 15 ? b.post : win ? b.window : b.timber;
  });
  // The clock stage, a beam above and below the faces.
  ring(3, baseY + 16, baseY + 20, (dx, dz, y) => (y === baseY + 16 || y === baseY + 20 || (Math.abs(dx) === 3 && Math.abs(dz) === 3) ? b.post : b.stone));
  for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) put(world, cx + dx, baseY + 16, cz + dz, b.post);
  // The stage is the clockwork's, no room: solid inside, so no sealed hollow hides behind the faces.
  for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) for (let y = baseY + 17; y <= baseY + 20; y++) put(world, cx + dx, y, cz + dz, b.stone);
  // The pyramid roof, snow along its eaves and on its tip.
  let tip = baseY + 21;
  for (let k = 0; k <= 4; k++) {
    const half = 4 - k;
    const y = baseY + 21 + k;
    for (let dx = -half; dx <= half; dx++) for (let dz = -half; dz <= half; dz++) put(world, cx + dx, y, cz + dz, k === 0 && Math.max(Math.abs(dx), Math.abs(dz)) === half ? b.snow : b.roof);
    tip = y;
  }
  put(world, cx, tip + 1, cz, b.snow);
  const fy = baseY + 17;
  return {
    faces: [
      [cx + 0.5, fy, cz - 3 - 0.12, 0],
      [cx + 0.5, fy, cz + 4 + 0.12, 0],
      [cx - 3 - 0.12, fy, cz + 0.5, 90],
      [cx + 4 + 0.12, fy, cz + 0.5, 90],
    ],
    tip: tip + 2,
  };
}

export interface GateBlocks {
  stone: number;
  post: number;
  roof: number;
  eave: number;
}

/**
 * The village gate (d-03) across a way running along z at row `z` (its depth z…z+2): two stone pillars
 * three square either side of an opening `span` wide (odd), timber posts inside them, a timber beam and
 * struts over the opening, a snow roof over it all. `front` is the side the way arrives from (-1: -z, 1: +z).
 * Returns where the emblem hangs (on the front of the beam's middle), the first row before the pillars'
 * front faces (for banners and lanterns) and the outer edges (for walls).
 */
export function placeVillageGate(world: WorldWriter, cx: number, z: number, baseY: number, b: GateBlocks, front: 1 | -1 = -1, span = 9): { emblem: [number, number, number]; pillars: Array<[number, number]>; edges: [number, number] } {
  const half = Math.floor(span / 2);
  const beamY = baseY + 7;
  for (const side of [-1, 1]) {
    const inner = cx + side * (half + 1);
    const outer = cx + side * (half + 3);
    for (let x = Math.min(inner, outer); x <= Math.max(inner, outer); x++) {
      for (let dz = 0; dz <= 2; dz++) {
        for (let y = baseY; y <= beamY + 1; y++) put(world, x, y, z + dz, x === inner && dz === 1 ? b.post : b.stone);
      }
    }
    // A diagonal strut from each pillar up to the beam.
    for (let k = 0; k < 3; k++) for (const dz of [0, 2]) put(world, inner - side * (k + 1), beamY - 3 + k, z + dz, b.post);
  }
  for (let x = cx - half - 3; x <= cx + half + 3; x++) {
    for (let dz = 0; dz <= 2; dz++) {
      put(world, x, beamY, z + dz, b.post);
      put(world, x, beamY + 1, z + dz, b.post);
    }
  }
  // The roof: two rows of eaves overhanging front and back, the ridge over the middle row.
  for (let x = cx - half - 4; x <= cx + half + 4; x++) {
    for (const dz of [-1, 3]) {
      put(world, x, beamY + 2, z + dz, b.roof);
      put(world, x, beamY + 1, z + dz, b.eave);
    }
    for (const dz of [0, 2]) {
      put(world, x, beamY + 3, z + dz, b.roof);
      put(world, x, beamY + 2, z + dz, b.eave);
    }
    put(world, x, beamY + 4, z + 1, b.roof);
    put(world, x, beamY + 3, z + 1, b.eave);
  }
  const before = front > 0 ? z + 3 : z - 1;
  return {
    emblem: [cx + 0.5, beamY - 1.1, front > 0 ? z + 3.15 : z - 0.15],
    pillars: [[cx - half - 2, before], [cx + half + 2, before]],
    edges: [cx - half - 3, cx + half + 3],
  };
}

/** A low stone wall along x on row `z` from `x0` to `x1` (inclusive), `height` high on the ground, snow along its top. */
export function placeSnowWall(world: WorldWriter, x0: number, x1: number, z: number, surface: (x: number, z: number) => number, height: number, b: { stone: number; snow: number }): void {
  for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
    const y0 = surface(x, z) + 1;
    for (let y = y0; y < y0 + height; y++) put(world, x, y, z, b.stone);
    put(world, x, y0 + height, z, b.snow);
  }
}

/**
 * The shelter of a cable car station over the rectangle `r`: log posts at its corners and every six blocks
 * along its long sides, a roof of boards under snow five blocks up, a beam along the front. The cabins wait
 * under it; nothing else is built inside.
 */
export function placeStationShelter(world: WorldWriter, r: Rect, baseY: number, b: { post: number; roof: number; eave: number; floor: number }): void {
  const alongX = r.x1 - r.x0 >= r.z1 - r.z0;
  for (let x = r.x0; x <= r.x1; x++) for (let z = r.z0; z <= r.z1; z++) put(world, x, baseY - 1, z, b.floor);
  const postAt = (x: number, z: number): boolean => {
    const edge = alongX ? z === r.z0 || z === r.z1 : x === r.x0 || x === r.x1;
    const along = alongX ? x - r.x0 : z - r.z0;
    const end = alongX ? x === r.x1 : z === r.z1;
    return edge && (along % 6 === 0 || end);
  };
  for (let x = r.x0; x <= r.x1; x++) for (let z = r.z0; z <= r.z1; z++) if (postAt(x, z)) for (let y = baseY; y < baseY + 5; y++) put(world, x, y, z, b.post);
  for (let x = r.x0 - 1; x <= r.x1 + 1; x++) {
    for (let z = r.z0 - 1; z <= r.z1 + 1; z++) {
      put(world, x, baseY + 5, z, b.eave);
      put(world, x, baseY + 6, z, b.roof);
    }
  }
}

/**
 * The observatory on the summit (d-06): a round stone drum of `radius` with lit slit windows and a door on
 * +z, a dome of pale metal with dark ribs, and its slit open toward +z where the telescope looks out.
 * Returns where the telescope stands (inside, under the slit) and the dome's top.
 */
export function placeObservatory(world: WorldWriter, cx: number, cz: number, baseY: number, radius: number, b: { wall: number; trim: number; dome: number; rib: number; window: number; floor: number }): { telescope: [number, number, number]; top: number } {
  const drum = 5;
  const span = radius + 1;
  for (let dx = -span; dx <= span; dx++) {
    for (let dz = -span; dz <= span; dz++) {
      const d = Math.hypot(dx, dz);
      if (d > radius + 0.4) continue;
      put(world, cx + dx, baseY - 1, cz + dz, b.floor);
      for (let y = baseY; y < baseY + drum; y++) {
        const shell = d > radius - 0.9;
        const door = dz > 0 && Math.abs(dx) <= 1 && y < baseY + 3;
        const slit = shell && !door && y === baseY + 2 && (Math.abs(dx) <= 1 || Math.abs(dz) <= 1);
        put(world, cx + dx, y, cz + dz, !shell || door ? 0 : slit ? b.window : y === baseY + drum - 1 ? b.trim : b.wall);
      }
    }
  }
  // The dome: a shell one block thick, ribs where it crosses the axes and the diagonals, the slit toward +x.
  const y0 = baseY + drum;
  let top = y0;
  for (let dx = -span; dx <= span; dx++) {
    for (let dz = -span; dz <= span; dz++) {
      for (let dy = 0; dy <= span; dy++) {
        const d = Math.hypot(dx, dy * 1.1, dz);
        if (d > radius + 0.3 || d <= radius - 0.8) continue;
        const slit = dz > 0 && Math.abs(dx) <= 1 && dy < radius;
        if (slit) continue;
        const rib = dx === 0 || dz === 0;
        put(world, cx + dx, y0 + dy, cz + dz, rib ? b.rib : b.dome);
        top = Math.max(top, y0 + dy);
      }
    }
  }
  return { telescope: [cx + 0.5, baseY, cz + 0.5], top };
}

/**
 * A stone viaduct along x on row `z` (`width` wide, odd) from `x0` to `x1`: its deck's top at `deckY`, a
 * parapet along both edges, piers three thick every `span` blocks down to the ground and round arches
 * between them (the space under each arch is left as it was). Returns cells beside the deck for lamps.
 */
export function placeViaduct(world: WorldWriter, x0: number, x1: number, z: number, deckY: number, width: number, span: number, surface: (x: number, z: number) => number, b: { stone: number; rail: number; deck: number }): { lamps: Array<[number, number, number]> } {
  const half = Math.floor(width / 2);
  const lamps: Array<[number, number, number]> = [];
  const pierAt = (x: number): boolean => (x - x0) % span < 3 || x > x1 - 3;
  for (let x = x0; x <= x1; x++) {
    const k = (x - x0) % span;
    // The arch's soffit: two blocks under the deck at the crown, down to the springing at the piers.
    const t = (k - 3 + 0.5) / (span - 3);
    const ground = Math.max(...Array.from({ length: width }, (_, i) => surface(x, z - half + i)));
    const rise = Math.max(0, deckY - 2 - ground);
    const soffit = pierAt(x) ? ground : Math.round(deckY - 2 - rise * (1 - Math.sqrt(Math.max(0, Math.sin(Math.PI * t)))));
    for (let w = -half; w <= half; w++) {
      const zz = z + w;
      for (let y = Math.min(soffit, deckY); y <= deckY; y++) put(world, x, y, zz, y === deckY && Math.abs(w) < half ? b.deck : b.stone);
      if (pierAt(x)) for (let y = surface(x, zz) + 1; y < deckY; y++) put(world, x, y, zz, b.stone);
      for (let y = deckY + 1; y <= deckY + 3; y++) put(world, x, y, zz, Math.abs(w) === half && y === deckY + 1 ? b.rail : 0);
    }
    if ((x - x0) % span === 1 && x > x0) for (const w of [-half, half]) lamps.push([x + 0.5, deckY + 2, z + w + 0.5]);
  }
  return { lamps };
}

/**
 * A plank bridge along z on column `x` from `z0` to `z1` (three wide), its deck's top at `deckY`, on log
 * trestles every `every` blocks down to the ground, log posts and a hand rail along both sides.
 */
export function placePlankBridge(world: WorldWriter, x: number, z0: number, z1: number, deckY: number, surface: (x: number, z: number) => number, b: { planks: number; log: number }, every = 6): void {
  for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) {
    for (let dx = -1; dx <= 1; dx++) {
      put(world, x + dx, deckY, z, b.planks);
      for (let y = deckY + 1; y <= deckY + 3; y++) put(world, x + dx, y, z, 0);
    }
    const post = (z - z0) % 3 === 0;
    for (const dx of [-2, 2]) {
      put(world, x + dx, deckY, z, b.planks);
      if (post) put(world, x + dx, deckY + 1, z, b.log);
      put(world, x + dx, deckY + 2, z, b.log);
    }
    if ((z - z0) % every === 0) {
      for (const dx of [-2, 2]) for (let y = surface(x + dx, z) + 1; y < deckY; y++) put(world, x + dx, y, z, b.log);
      for (let dx = -2; dx <= 2; dx++) put(world, x + dx, deckY - 2, z, b.log);
    }
  }
}

/** The same bridge along x on row `z` from `x0` to `x1`. */
export function placePlankBridgeX(world: WorldWriter, z: number, x0: number, x1: number, deckY: number, surface: (x: number, z: number) => number, b: { planks: number; log: number }, every = 6): void {
  const swapped: WorldWriter = {
    size: [world.size[2], world.size[1], world.size[0]],
    get: (x, y, zz) => world.get(zz, y, x),
    set: (x, y, zz, id) => world.set(zz, y, x, id),
  };
  placePlankBridge(swapped, z, x0, x1, deckY, (a, c) => surface(c, a), b, every);
}
