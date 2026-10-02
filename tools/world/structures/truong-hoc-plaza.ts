// Block structures of the hub's central square and campus extras, after the owner's detail mocks
// (designs/trung-tam/d-*, designs/truong-hoc/c-06): the glowing stone portals to the other maps, the big
// fountain under the white cat, the shop with its striped awnings, the blue-roofed team gazebo, the event
// stage and the wooden playhouse of the playground. Each writes blocks only and returns where its props,
// signs and people go; the map file decides where they stand.
import { fill } from './school';
import { put, type WorldWriter } from './world-writer';

export interface PortalBlocks {
  stone: number;
  trim: number;
  moss: number;
  lantern: number;
}

/**
 * A stone portal (d-06) whose way runs along x, its front toward `dir` (+1 east, -1 west): an opening five
 * wide and five high narrowing to three at the top, two-block pillars either side with a wall lantern set in
 * each front face, a crown with crenels and moss over it, a step in front. (cx, cz) is the opening's middle
 * column, where the gate stands. Returns where its glowing pane and its name board go and the yaw that
 * turns their fronts to `dir`.
 */
export function placePortal(world: WorldWriter, cx: number, cz: number, baseY: number, dir: 1 | -1, b: PortalBlocks): { pane: [number, number, number]; sign: [number, number, number]; yaw: number } {
  const back = cx - dir;
  for (const x of [cx, back]) {
    for (let dz = -4; dz <= 4; dz++) {
      const z = cz + dz;
      put(world, x, baseY - 1, z, b.trim);
      for (let y = baseY; y <= baseY + 6; y++) {
        const h = y - baseY;
        const open = (Math.abs(dz) <= 2 && h <= 3) || (Math.abs(dz) <= 1 && h === 4);
        if (open) continue;
        const lamp = x === cx && Math.abs(dz) === 4 && h === 3;
        put(world, x, y, z, lamp ? b.lantern : Math.abs(dz) >= 3 && h <= 5 ? b.stone : b.trim);
      }
      if (Math.abs(dz) % 2 === 0) put(world, x, baseY + 7, z, b.stone);
    }
  }
  // Moss over the crown and down the pillars' outer edges.
  for (const dz of [-3, -1, 2, 4]) put(world, back, baseY + 7, cz + dz, b.moss);
  for (const dz of [-4, 4]) for (const h of [5, 6]) put(world, cx + dir, baseY + h, cz + dz, b.moss);
  // The step in front, a block lower than the opening's floor would be: flush with the ground.
  for (let dz = -3; dz <= 3; dz++) put(world, cx + dir, baseY - 1, cz + dz, b.trim);
  return {
    pane: [cx + 0.5 + dir * 0.62, baseY, cz + 0.5],
    sign: [cx + 0.5 + dir * 0.64, baseY + 5.1, cz + 0.5],
    yaw: dir > 0 ? 270 : 90,
  };
}

/**
 * The square's big fountain (d-01): a round basin seven blocks out with a stone rim, a raised inner basin,
 * a column in the middle and the white cat on top. Returns where the cat sits.
 */
export function placeGrandFountain(world: WorldWriter, cx: number, cz: number, baseY: number, b: { stone: number; rim: number; water: number }): { statue: [number, number, number] } {
  for (let dx = -8; dx <= 8; dx++) {
    for (let dz = -8; dz <= 8; dz++) {
      const d = Math.hypot(dx, dz);
      const [x, z] = [cx + dx, cz + dz];
      if (d > 7.4) continue;
      if (d > 6.4) {
        put(world, x, baseY, z, b.rim);
        continue;
      }
      put(world, x, baseY - 2, z, b.stone);
      put(world, x, baseY - 1, z, b.water);
      if (d > 3.4) continue;
      put(world, x, baseY - 1, z, b.stone);
      put(world, x, baseY, z, d > 2.4 ? b.rim : b.stone);
      if (d > 2.4) put(world, x, baseY + 1, z, b.rim);
      else put(world, x, baseY + 1, z, b.water);
    }
  }
  for (let y = baseY + 1; y <= baseY + 3; y++) for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]] as const) put(world, cx + dx, y, cz + dz, b.rim);
  // Spouts: water falling from the inner basin's rim into the outer one at the four points.
  for (const [dx, dz] of [[4, 0], [-4, 0], [0, 4], [0, -4]] as const) put(world, cx + dx, baseY, cz + dz, b.water);
  return { statue: [cx, baseY + 4, cz] };
}

export interface ShopBlocks {
  wall: number;
  post: number;
  roof: number;
  floor: number;
  counter: number;
  stripes: ReadonlyArray<readonly number[]>;
}

/**
 * The square's shop (d-02), built in its own frame with its open front toward -z: a timber hall `w` wide and
 * six deep on log posts, plank walls behind and at the sides, a tiled gable roof, two counters across the
 * front each under its own striped awning sloping out over it, a lantern at each post. (x0, z0) is its front
 * left corner. Returns where the name board hangs (over the awnings), the counters' tops, the shelves along
 * the back wall and where the shopkeepers stand.
 */
export function placeShop(world: WorldWriter, x0: number, z0: number, w: number, baseY: number, b: ShopBlocks): { sign: [number, number, number]; counters: Array<[number, number, number]>; shelves: Array<[number, number, number]>; keepers: Array<[number, number]> } {
  const d = 6;
  const [x1, z1] = [x0 + w - 1, z0 + d - 1];
  const wallTop = baseY + 4;
  fill(world, x0, baseY - 1, z0, x1, baseY - 1, z1, b.floor);
  for (let x = x0; x <= x1; x++) {
    for (let z = z0; z <= z1; z++) {
      const side = x === x0 || x === x1;
      const rear = z === z1;
      if (!side && !rear) continue;
      const post = (side && (z === z0 || z === z1)) || (rear && (x - x0) % 4 === 0);
      for (let y = baseY; y <= wallTop; y++) put(world, x, y, z, post ? b.post : b.wall);
    }
  }
  // Front posts between the two counters, a beam along the front.
  const midX = Math.floor((x0 + x1) / 2);
  for (let y = baseY; y <= wallTop; y++) put(world, midX, y, z0, b.post);
  for (let x = x0; x <= x1; x++) put(world, x, wallTop, z0, b.post);
  // Gable roof along x, overhanging a block.
  const half = Math.ceil(d / 2) + 1;
  for (let k = 0; k <= half; k++) {
    for (let x = x0 - 1; x <= x1 + 1; x++) {
      put(world, x, wallTop + 1 + k, z0 - 1 + k, b.roof);
      put(world, x, wallTop + 1 + k, z1 + 1 - k, b.roof);
    }
    for (const x of [x0, x1]) for (let z = z0 + k; z <= z1 - k; z++) put(world, x, wallTop + 1 + k, z, b.wall);
  }
  // Counters a block in from the front, each half of the front, with an awning sloping out over it.
  const counters: Array<[number, number, number]> = [];
  const keepers: Array<[number, number]> = [];
  const halves: Array<[number, number]> = [[x0 + 1, midX - 1], [midX + 1, x1 - 1]];
  halves.forEach(([a, c], i) => {
    for (let x = a; x <= c; x++) put(world, x, baseY, z0 + 1, b.counter);
    const stripes = b.stripes[i % b.stripes.length] ?? [b.roof];
    for (let x = a - 1; x <= c + 1; x++) {
      const stripe = stripes[(x - a + 1) % stripes.length] ?? b.roof;
      put(world, x, wallTop - 1, z0 - 1, stripe);
      put(world, x, wallTop - 2, z0 - 2, stripe);
    }
    counters.push([(a + c + 1) / 2, baseY + 1, z0 + 1.5]);
    keepers.push([Math.floor((a + c) / 2), z0 + 3]);
  });
  const shelves: Array<[number, number, number]> = [];
  for (let x = x0 + 2; x <= x1 - 2; x += 3) shelves.push([x + 0.5, baseY, z1 - 0.3]);
  return { sign: [(x0 + x1 + 1) / 2, wallTop + 0.05, z0 - 0.62], counters, shelves, keepers };
}

/**
 * The team gazebo (d-05): a raised plank floor seven across on four log posts, rails between them but
 * an opening on each side, a blue hipped roof with a lantern under its tip. Returns its benches' spots.
 */
export function placeGazebo(world: WorldWriter, cx: number, cz: number, baseY: number, b: { post: number; floor: number; rail: number; roof: number; lantern: number }): { benches: Array<[number, number, number]> } {
  const r = 3;
  fill(world, cx - r, baseY - 1, cz - r, cx + r, baseY - 1, cz + r, b.floor);
  const top = baseY + 4;
  for (const sx of [-r, r]) for (const sz of [-r, r]) for (let y = baseY; y <= top; y++) put(world, cx + sx, y, cz + sz, b.post);
  for (let k = -r; k <= r; k++) for (const s of [-r, r]) put(world, cx + s, top, cz + k, b.post);
  for (let k = -r; k <= r; k++) for (const s of [-r, r]) put(world, cx + k, top, cz + s, b.post);
  for (let k = 0; k <= r + 1; k++) {
    const e = r + 1 - k;
    for (let dx = -e; dx <= e; dx++) for (let dz = -e; dz <= e; dz++) if (Math.max(Math.abs(dx), Math.abs(dz)) === e || k === r + 1) put(world, cx + dx, top + 1 + k, cz + dz, b.roof);
  }
  put(world, cx, top, cz, b.lantern);
  return {
    benches: [
      [cx - 1.5, baseY, cz + r - 0.5],
      [cx + 1.5, baseY, cz - r + 0.5],
    ],
  };
}

/**
 * The event stage (d-08), its front toward -z: a plank platform `w` wide and six deep one block up with
 * steps across its front, a truss post at each back corner for the screen. (cx, z0) is its front middle.
 * Returns the screen's foot (centre back, on the platform) and the posts' tops (for bunting).
 */
export function placeStage(world: WorldWriter, cx: number, z0: number, baseY: number, w: number, b: { deck: number; edge: number; step: number }): { screen: [number, number, number]; deck: number } {
  const half = Math.floor(w / 2);
  const d = 6;
  for (let dx = -half; dx <= half; dx++) {
    for (let k = 0; k < d; k++) {
      const edge = Math.abs(dx) === half || k === 0;
      put(world, cx + dx, baseY, z0 + k, edge ? b.edge : b.deck);
    }
    if (Math.abs(dx) < half - 1) put(world, cx + dx, baseY - 1, z0 - 1, b.step);
  }
  return { screen: [cx + 0.5, baseY + 1, z0 + d - 0.6], deck: baseY + 1 };
}

/**
 * The playground's wooden playhouse (c-06): a plank deck three blocks up on four log posts, a rail round it,
 * a red gable roof over it and a ladder of steps up its back. (x0, z0) is its corner; it is five across.
 * Returns where the slide leans off its front (-z) and the deck's height.
 */
export function placePlayhouse(world: WorldWriter, x0: number, z0: number, baseY: number, b: { post: number; deck: number; roof: number; rail: number }): { slide: [number, number, number]; deck: number } {
  const n = 4;
  const deckY = baseY + 2;
  for (const x of [x0, x0 + n]) for (const z of [z0, z0 + n]) for (let y = baseY; y <= deckY + 3; y++) put(world, x, y, z, b.post);
  fill(world, x0, deckY, z0, x0 + n, deckY, z0 + n, b.deck);
  for (let k = 1; k < n; k++) {
    for (const z of [z0, z0 + n]) if (!(z === z0 && k === 2)) put(world, x0 + k, deckY + 1, z, b.rail);
    for (const x of [x0, x0 + n]) put(world, x, deckY + 1, z0 + k, b.rail);
  }
  // Ladder up the back: steps a block apart behind the deck.
  for (let s = 0; s < 2; s++) put(world, x0 + 2, baseY + s, z0 + n + 2 - s, b.deck);
  put(world, x0 + 2, deckY + 1, z0 + n, 0);
  // Gable roof along z.
  for (let k = 0; k <= 3; k++) {
    for (let z = z0 - 1; z <= z0 + n + 1; z++) {
      put(world, x0 - 1 + k, deckY + 4 + k, z, b.roof);
      put(world, x0 + n + 1 - k, deckY + 4 + k, z, b.roof);
    }
  }
  return { slide: [x0 + 2.5, baseY, z0 - 1.8], deck: deckY + 1 };
}
