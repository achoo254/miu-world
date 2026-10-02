// The hub's walk-in buildings on its square, after the owner's detail mock (designs/trung-tam/d-02, d-05) and
// his ask of 02/10/2026 ("houses many times the child's size, really wide entrances, room to move inside"):
// the timber shop with its striped awnings over two counters and a wide door between them into a hall of
// shelves and display tables, and the blue-roofed team gazebo open on every side. Each writes blocks only
// and returns where its props and people go; the map file decides where they stand.
import { fill } from './school';
import { put, type WorldWriter } from './world-writer';

export interface HubShopBlocks {
  wall: number;
  post: number;
  roof: number;
  floor: number;
  counter: number;
  glass: number;
  lantern: number;
  stripes: ReadonlyArray<readonly number[]>;
}

export interface HubShop {
  /** Where the name board hangs on the front over the door (its foot, a little out from the wall). */
  sign: [number, number, number];
  /** The counters' tops, one per bay either side of the door, for the goods. */
  counters: Array<[number, number, number]>;
  /** Shelves standing along the back and side walls (feet), each with the yaw that turns its front inward (0 toward -z, 270 toward +x). */
  shelves: Array<{ at: [number, number, number]; yaw: number }>;
  /** Display tables in the hall (feet), either side of the aisle from the door. */
  tables: Array<[number, number, number]>;
  /** Where the shopkeepers stand behind the counters, and the chandelier's foot under the roof. */
  keepers: Array<[number, number]>;
  light: [number, number, number];
  /** The doorway's first column and width on the front row (z0), and the aisle's middle. */
  door: { x0: number; width: number; mid: number };
}

/**
 * The square's shop (d-02), built in its own frame with its front toward -z: a timber hall `w` wide and `d`
 * deep with walls eight high (some five times the child's height, the roof as much again), log posts, lit
 * windows down the sides and the back, a tiled gable roof overhanging a block. Its front: a counter in each
 * bay either side of a door four wide and five high, a striped awning sloping out over each counter, a beam
 * over them all and a plank fascia for the big sign. Inside, a hall with shelves round its walls and two
 * display tables either side of a wide aisle from the door, a chandelier over the middle. (x0, z0) is its
 * front left corner; `w` is at least 18 and `d` at least 10.
 */
export function placeHubShop(world: WorldWriter, x0: number, z0: number, w: number, d: number, baseY: number, b: HubShopBlocks): HubShop {
  const [x1, z1] = [x0 + w - 1, z0 + d - 1];
  const wallTop = baseY + 7;
  const doorWidth = 4;
  const doorX0 = x0 + Math.floor((w - doorWidth) / 2);
  const doorX1 = doorX0 + doorWidth - 1;
  const doorTop = baseY + 4;
  fill(world, x0, baseY - 1, z0, x1, baseY - 1, z1, b.floor);
  // Sides and back: posts at the corners and every five blocks, planks between, a row of lit windows.
  for (let x = x0; x <= x1; x++) {
    for (let z = z0 + 1; z <= z1; z++) {
      const side = x === x0 || x === x1;
      const rear = z === z1;
      if (!side && !rear) continue;
      const along = rear ? x - x0 : z - z0;
      const post = (side && rear) || along % 5 === 0;
      for (let y = baseY; y <= wallTop; y++) {
        const window = !post && (along % 5 === 2 || along % 5 === 3) && (y === baseY + 3 || y === baseY + 4);
        const lamp = !post && along % 5 === 1 && y === baseY + 5;
        put(world, x, y, z, post ? b.post : window ? b.glass : lamp ? b.lantern : b.wall);
      }
    }
  }
  // The front: corner posts, a post either side of the door, a beam over the bays and the door, the fascia above.
  for (let y = baseY; y <= wallTop; y++) for (const x of [x0, doorX0 - 1, doorX1 + 1, x1]) put(world, x, y, z0, b.post);
  for (let x = x0; x <= x1; x++) {
    put(world, x, doorTop + 1, z0, b.post);
    for (let y = doorTop + 2; y <= wallTop; y++) put(world, x, y, z0, x === x0 || x === x1 || y === wallTop ? b.post : b.wall);
  }
  // Counters a block in from the front filling each bay, an awning sloping out over each.
  const counters: HubShop['counters'] = [];
  const keepers: HubShop['keepers'] = [];
  const bays: Array<[number, number]> = [[x0 + 1, doorX0 - 2], [doorX1 + 2, x1 - 1]];
  bays.forEach(([a, c], i) => {
    for (let x = a; x <= c; x++) put(world, x, baseY, z0 + 1, b.counter);
    const stripes = b.stripes[i % b.stripes.length] ?? [b.roof];
    for (let x = a - 1; x <= c + 1; x++) {
      const stripe = stripes[(x - a + 1) % stripes.length] ?? b.roof;
      put(world, x, doorTop, z0 - 1, stripe);
      put(world, x, doorTop - 1, z0 - 2, stripe);
    }
    counters.push([(a + c + 1) / 2, baseY + 1, z0 + 1.5]);
    keepers.push([Math.floor((a + c) / 2), z0 + 3]);
  });
  // Gable roof along x, overhanging a block, the gable ends closed with planks.
  const half = Math.ceil(d / 2) + 1;
  for (let k = 0; k <= half; k++) {
    for (let x = x0 - 1; x <= x1 + 1; x++) {
      put(world, x, wallTop + 1 + k, z0 - 1 + k, b.roof);
      put(world, x, wallTop + 1 + k, z1 + 1 - k, b.roof);
    }
    for (const x of [x0, x1]) for (let z = z0 + k; z <= z1 - k; z++) put(world, x, wallTop + 1 + k, z, b.wall);
  }
  // Shelves along the back wall and down both sides behind the counters' keepers; two display tables either
  // side of the aisle, which runs the door's width from the door to the back.
  const shelves: HubShop['shelves'] = [];
  for (let x = x0 + 2; x + 1 <= x1 - 1; x += 3) if (x + 1 < doorX0 || x > doorX1) shelves.push({ at: [x + 1, baseY, z1 - 0.3], yaw: 0 });
  for (let z = z0 + 5; z + 1 <= z1 - 2; z += 3) {
    shelves.push({ at: [x0 + 1.3, baseY, z + 1], yaw: 270 });
    shelves.push({ at: [x1 - 0.3, baseY, z + 1], yaw: 90 });
  }
  const midZ = z0 + Math.round(d / 2) + 0.5;
  const tables: HubShop['tables'] = [
    [doorX0 - 3.5, baseY, midZ],
    [doorX1 + 4.5, baseY, midZ],
  ];
  return {
    sign: [(x0 + x1 + 1) / 2, doorTop + 1.15, z0 - 0.15],
    counters,
    shelves,
    tables,
    keepers,
    light: [(doorX0 + doorX1 + 1) / 2, wallTop - 1.4, midZ],
    door: { x0: doorX0, width: doorWidth, mid: (doorX0 + doorX1 + 1) / 2 },
  };
}

export interface TeamGazeboBlocks {
  post: number;
  floor: number;
  rail: number;
  roof: number;
  lantern: number;
}

/**
 * The team gazebo (d-05): a plank floor eleven across under a blue hipped roof on log posts, eight high to
 * the beams, a rail between each corner post and the post beside it, so every side opens five wide in the
 * middle; a lantern hanging on a chain under the roof's tip. Returns its benches (feet and yaws, inside by
 * the rails, clear of the openings) and its beams' height for the boards hung from them.
 */
export function placeTeamGazebo(world: WorldWriter, cx: number, cz: number, baseY: number, b: TeamGazeboBlocks): { benches: Array<{ at: [number, number, number]; yaw: number }>; beam: number; radius: number } {
  const r = 5;
  const top = baseY + 6;
  fill(world, cx - r, baseY - 1, cz - r, cx + r, baseY - 1, cz + r, b.floor);
  // Posts at the corners and three in from each corner along every side; rails between them; beams round the top.
  for (const s of [-r, r]) {
    for (const k of [-r, -3, 3, r]) {
      for (let y = baseY; y <= top; y++) {
        put(world, cx + s, y, cz + k, b.post);
        put(world, cx + k, y, cz + s, b.post);
      }
    }
    for (const k of [-4, 4]) {
      put(world, cx + s, baseY, cz + k, b.rail);
      put(world, cx + k, baseY, cz + s, b.rail);
    }
    for (let k = -r; k <= r; k++) {
      put(world, cx + s, top, cz + k, b.post);
      put(world, cx + k, top, cz + s, b.post);
    }
  }
  // The hipped roof: a ring stepping in a block each row from a block out over the beams to its tip.
  for (let k = 0; k <= r + 1; k++) {
    const e = r + 1 - k;
    for (let dx = -e; dx <= e; dx++) for (let dz = -e; dz <= e; dz++) if (Math.max(Math.abs(dx), Math.abs(dz)) === e || e === 0) put(world, cx + dx, top + 1 + k, cz + dz, b.roof);
  }
  for (let y = top + 1; y <= top + r + 1; y++) put(world, cx, y, cz, b.rail);
  put(world, cx, top, cz, b.lantern);
  return {
    benches: [
      { at: [cx - 3, baseY, cz - r + 1.5], yaw: 0 },
      { at: [cx + 4, baseY, cz + r - 0.5], yaw: 180 },
      { at: [cx - r + 1.5, baseY, cz + 4], yaw: 90 },
      { at: [cx + r - 0.5, baseY, cz - 3], yaw: 270 },
    ],
    beam: top,
    radius: r,
  };
}
