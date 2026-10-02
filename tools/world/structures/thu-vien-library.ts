// The library of "Thư viện" after the owner's detail mock (designs/thu-vien/d-01…d-12, 02/10/2026): a grand
// stone hall of cream walls and warm stone pilasters under a red hipped roof, a taller middle pavilion with a
// clock in its gable over the arched doorway, tall arched windows lit at the top, blue banners with a white
// open book, lanterns on the walls. Inside, on a raised floor (`floor`, one block over the ground):
// - the main hall (d-03), two storeys high: a red carpet from the door to the big globe in its ring of low
//   shelves, the librarian's desk and the return counter by the door, brass chandeliers, the grand staircase
//   up to the gallery that runs round the hall (d-09, wooden balustrades, banners);
// - west wing: the reading room (d-04: long tables, green lamps, tall bookcases) and the children's corner
//   (d-06: a tree growing up through the ceiling, a bright mat, cushions, round tables);
// - east wing: the bookcases by subject with their signs and the ladder, aisles between stacks (d-05), the
//   computers for looking books up (d-07), the glass-walled group room with its whiteboard (d-08);
// - upstairs: the rare-books room with its glass cases (d-10), the window seat of the private reading nook
//   (d-11), the store room of shelves and boxes (d-12).
// Writes blocks through the zone map's context and queues the furniture as props; returns the rooms indoors
// (kept clear of street lamps and garden dressing) and where the door and the back door open.
import { PACK } from '../map-kit';
import type { ZoneMapContext } from '../zone-map';

const FU = PACK.furniture;
const PR = PACK.props;
const BX = PACK.box;
/** Models of the library (content/world/models.json; the tv-* box props in content/world/box-props/thu-vien.json). */
export const LIBRARY_MODELS = {
  plant: `${FU}/pottedPlant.glb`,
  plantSmall: `${FU}/plantSmall1.glb`,
  rug: `${FU}/rugRectangle.glb`,
  pillow: `${FU}/pillow.glb`,
  pillowBlue: `${FU}/pillowBlue.glb`,
  carton: `${FU}/cardboardBoxClosed.glb`,
  books: `${PR}/books.glb`,
  openBook: `${PR}/open-book.glb`,
  globeSmall: `${PR}/globe.glb`,
  map: `${PR}/framed-picture-yellow.glb`,
  picture: `${PR}/framed-picture.glb`,
  clock: `${PR}/clock-face.glb`,
  banner: `${BX}/tv-book-banner.glb`,
  wallLantern: `${BX}/tv-wall-lantern.glb`,
  chandelier: `${BX}/tv-chandelier.glb`,
  readingLamp: `${BX}/tv-reading-lamp.glb`,
  sign: `${BX}/tv-library-sign.glb`,
  tallShelf: `${BX}/tv-shelf-tall.glb`,
  subjects: [`${BX}/tv-shelf-toan.glb`, `${BX}/tv-shelf-tieng-viet.glb`, `${BX}/tv-shelf-tieng-anh.glb`, `${BX}/tv-shelf-khoa-hoc.glb`],
  ladder: `${BX}/tv-ladder.glb`,
  glassCase: `${BX}/tv-glass-case.glb`,
  whiteboard: `${BX}/tv-whiteboard.glb`,
  computer: `${BX}/tv-computer.glb`,
  readingTable: `${BX}/tv-reading-table.glb`,
  woodChair: `${BX}/tv-chair.glb`,
  longDesk: `${BX}/tv-desk-long.glb`,
  lowShelf: `${BX}/tv-shelf-low.glb`,
  roundTable: `${BX}/tv-round-table.glb`,
  railing: `${BX}/tv-railing.glb`,
  poufs: `${BX}/tv-poufs.glb`,
  windowSeat: `${BX}/tv-window-seat.glb`,
  storeShelf: `${BX}/tv-store-shelf.glb`,
  globe: `${BX}/tv-globe.glb`,
} as const;
const L = LIBRARY_MODELS;

/** Yaw that turns a box prop's front (-z) to face a way. */
const FACE = { north: 0, south: 180, west: 90, east: 270 } as const;

/**
 * Where the library stands: the main block's walls (inclusive), the pavilion's front wall and its sides, the
 * door's middle column, the floor's top (one block over the ground, the ground raised there by the map).
 */
export interface LibraryPlan {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  pavX0: number;
  pavX1: number;
  pavZ0: number;
  door: number;
  floor: number;
}

export interface Rect {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

/** Builds the library; returns its rooms indoors and the cells before its front and back doors. */
export function buildLibraryHall(ctx: ZoneMapContext, lib: LibraryPlan): { indoors: Rect[]; front: [number, number]; back: [number, number] } {
  const { world, block } = ctx;
  const F = lib.floor;
  const S = F + 1; // where people stand downstairs
  const UP = F + 6; // the gallery's floor
  const US = UP + 1; // where people stand upstairs
  const TOP = F + 12; // top of the main walls
  const PTOP = F + 16; // top of the pavilion's walls
  const mid = lib.door;
  const put = (x: number, y: number, z: number, name: string): void => world.set(x, y, z, name === 'air' ? 0 : block(name));
  const fill = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, name: string): void => {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) for (let y = y0; y <= y1; y++) for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) put(x, y, z, name);
  };
  const at = (model: string, x: number, y: number, z: number, yaw = 0): void => ctx.propAt(model, [x, y, z], yaw);
  const furn = (model: string, x: number, y: number, z: number, yaw: number): void => ctx.centredAt(model, [x, y, z], yaw);
  const hall = { x0: lib.pavX0 + 1, x1: lib.pavX1 - 1 };
  // The stone shell stands a block outside the plan: the plan's own edge is the rooms' wooden lining.
  const O = { x0: lib.x0 - 1, x1: lib.x1 + 1, z0: lib.z0 - 1, z1: lib.z1 + 1 };

  // Floors of warm planks everywhere; air above up to the roof.
  fill(O.x0, F, O.z0, O.x1, F, O.z1, 'planks');
  fill(lib.pavX0, F, lib.pavZ0, lib.pavX1, F, lib.z1, 'planks');
  fill(lib.x0 + 1, S, lib.z0 + 1, lib.x1 - 1, PTOP + 12, lib.z1 - 1, 'air');
  fill(hall.x0, S, lib.pavZ0 + 1, hall.x1, PTOP + 12, lib.z0, 'air');

  // Walls: a stone foot, pilasters every six blocks, a band at the gallery's floor and at the top, two rows of
  // tall windows between the pilasters, each under a lit arch; the banners' bays are left plain.
  const banners = new Set([lib.x0 + 15, lib.x1 - 15, mid - 9, mid + 9]);
  const wall = (ax: number, az: number, bx: number, bz: number, top: number, phase: number, options: { from?: number; front?: boolean } = {}): void => {
    const from = options.from ?? S;
    const alongX = az === bz;
    const [lo, hi] = alongX ? [Math.min(ax, bx), Math.max(ax, bx)] : [Math.min(az, bz), Math.max(az, bz)];
    for (let u = lo; u <= hi; u++) {
      const [x, z] = alongX ? [u, az] : [ax, u];
      const m = (((u - phase) % 6) + 6) % 6;
      const plain = options.front === true && [...banners].some((b) => Math.abs(u - b) <= 2);
      for (let y = from; y <= top; y++) {
        let name = 'sand';
        if (y === S) name = 'cobble-grey';
        else if (u === lo || u === hi || m === 0 || y === UP || y === TOP || y === top) name = 'cobble';
        else if (!plain && m >= 2 && m <= 4 && ((y >= S + 1 && y <= S + 3) || (y >= US + 1 && y <= US + 3))) name = 'glass';
        else if (!plain && m === 3 && (y === S + 4 || y === US + 4)) name = 'lantern';
        put(x, y, z, name);
      }
    }
  };
  wall(O.x0, O.z0, lib.pavX0 - 1, O.z0, TOP, lib.x0, { front: true });
  wall(lib.pavX1 + 1, O.z0, O.x1, O.z0, TOP, lib.x1, { front: true });
  wall(O.x0, O.z0, O.x0, O.z1, TOP, lib.z0);
  wall(O.x1, O.z0, O.x1, O.z1, TOP, lib.z0);
  wall(O.x0, O.z1, O.x1, O.z1, TOP, lib.x0);
  wall(lib.pavX0, O.z1, lib.pavX1, O.z1, PTOP, mid);
  wall(lib.pavX0, lib.pavZ0, lib.pavX1, lib.pavZ0, PTOP, mid, { front: true });
  wall(lib.pavX0, lib.pavZ0, lib.pavX0, O.z0, PTOP, lib.pavZ0);
  wall(lib.pavX1, lib.pavZ0, lib.pavX1, O.z0, PTOP, lib.pavZ0);
  // The pavilion's clerestory over the wings' roofs.
  wall(lib.pavX0, O.z0, lib.pavX0, O.z1, PTOP, lib.z0, { from: TOP + 1 });
  wall(lib.pavX1, O.z0, lib.pavX1, O.z1, PTOP, lib.z0, { from: TOP + 1 });
  // The rooms' lining (d-04, d-08): planks between dark posts behind the pilasters, the windows' glass and
  // lit arches carried through it; stone along the back of the hall; dark timber all round the rare books.
  const darkRoom = (x: number, y: number, z: number): boolean => y > UP && x < lib.pavX0 && z <= lib.z0 + 14;
  const lining = (ax: number, az: number, bx: number, bz: number, phase: number, front = false): void => {
    const alongX = az === bz;
    const [lo, hi] = alongX ? [Math.min(ax, bx), Math.max(ax, bx)] : [Math.min(az, bz), Math.max(az, bz)];
    for (let u = lo; u <= hi; u++) {
      const [x, z] = alongX ? [u, az] : [ax, u];
      const m = (((u - phase) % 6) + 6) % 6;
      const plain = front && [...banners].some((b) => Math.abs(u - b) <= 2);
      const stone = x > lib.pavX0 && x < lib.pavX1;
      for (let y = S; y <= TOP; y++) {
        let name = stone ? 'sand' : 'planks';
        if (darkRoom(x, y, z)) name = 'log';
        else if (y === UP || y === TOP) name = stone ? 'cobble' : 'planks';
        else if (!plain && m >= 2 && m <= 4 && ((y >= S + 1 && y <= S + 3) || (y >= US + 1 && y <= US + 3))) name = 'glass';
        else if (!plain && m === 3 && (y === S + 4 || y === US + 4)) name = 'lantern';
        else if (m === 0 || u === lo || u === hi) name = stone ? 'cobble' : 'log';
        else if (y === S) name = stone ? 'cobble' : 'log';
        put(x, y, z, name);
      }
    }
  };
  lining(lib.x0, lib.z0, lib.pavX0 - 1, lib.z0, lib.x0, true);
  lining(lib.pavX1 + 1, lib.z0, lib.x1, lib.z0, lib.x1, true);
  lining(lib.x0, lib.z0, lib.x0, lib.z1, lib.z0);
  lining(lib.x1, lib.z0, lib.x1, lib.z1, lib.z0);
  lining(lib.x0, lib.z1, lib.x1, lib.z1, lib.x0);
  // Cornices jutting a block under the eaves.
  const ring = (x0: number, z0: number, x1: number, z1: number, y: number, name: string, skip?: (x: number) => boolean): void => {
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) if ((x === x0 || x === x1 || z === z0 || z === z1) && !skip?.(x)) put(x, y, z, name);
  };
  ring(O.x0 - 1, O.z0 - 1, O.x1 + 1, O.z1 + 1, TOP, 'cobble', (x) => x > lib.pavX0 - 1 && x < lib.pavX1 + 1);
  ring(lib.pavX0 - 1, lib.pavZ0 - 1, lib.pavX1 + 1, O.z1 + 1, PTOP + 1, 'cobble');

  // The arched front door (d-02): seven blocks wide, round at the top, a stone ring round it, the leaves
  // folded back inside; a tall arched window over it. The back door onto the terrace.
  const pz = lib.pavZ0;
  fill(mid - 3, S, pz, mid + 3, S + 4, pz, 'air');
  fill(mid - 2, S + 5, pz, mid + 2, S + 5, pz, 'air');
  fill(mid - 1, S + 6, pz, mid + 1, S + 6, pz, 'air');
  for (let y = S; y <= S + 4; y++) for (const x of [mid - 4, mid + 4]) put(x, y, pz, 'cobble');
  for (const x of [mid - 3, mid + 3]) put(x, S + 5, pz, 'cobble');
  for (const x of [mid - 2, mid + 2]) put(x, S + 6, pz, 'cobble');
  fill(mid - 1, S + 7, pz, mid + 1, S + 7, pz, 'cobble');
  for (const x of [mid - 3, mid - 2, mid + 2, mid + 3]) fill(x, S, pz + 1, x, S + 4, pz + 1, 'log');
  fill(mid - 3, S + 8, pz, mid + 3, S + 11, pz, 'glass');
  fill(mid - 2, S + 12, pz, mid + 2, S + 12, pz, 'glass');
  put(mid, S + 13, pz, 'lantern');
  for (const x of [mid - 1, mid + 1]) put(x, S + 13, pz, 'lantern');
  for (let y = S + 8; y <= S + 12; y++) for (const x of [mid - 4, mid + 4]) put(x, y, pz, 'cobble');
  fill(mid - 2, S, lib.z1, mid + 2, S + 3, O.z1, 'air');
  fill(mid - 1, S + 4, lib.z1, mid + 1, S + 4, O.z1, 'air');

  // Inside, between the hall and the wings: stone columns every four blocks up to the roof; the gallery's
  // floor over both wings and along the back of the hall; the grand staircase up to it.
  for (const x of [lib.pavX0, lib.pavX1]) {
    for (let z = lib.z0; z < lib.z1; z++) {
      fill(x, S, z, x, TOP, z, (z - lib.z0) % 4 === 0 ? 'cobble' : 'air');
    }
  }
  const treeAt = { x: lib.x0 + 10, z: lib.z1 - 9 };
  const inTreeWell = (x: number, z: number): boolean => Math.abs(x - treeAt.x) <= 4 && Math.abs(z - treeAt.z) <= 4;
  for (let x = lib.x0 + 1; x <= lib.x1 - 1; x++) {
    for (let z = lib.z0 + 1; z <= lib.z1 - 1; z++) {
      const wing = x <= lib.pavX0 || x >= lib.pavX1;
      const landing = z >= lib.z1 - 7;
      if ((wing || landing) && !inTreeWell(x, z)) put(x, UP, z, 'planks');
    }
  }
  const stair = { x0: mid - 3, x1: mid + 3, z0: lib.z1 - 13 };
  for (let k = 1; k <= 6; k++) {
    for (let x = stair.x0; x <= stair.x1; x++) {
      fill(x, S, stair.z0 + k - 1, x, F + k, stair.z0 + k - 1, 'planks');
      if (Math.abs(x - mid) <= 1) put(x, F + k, stair.z0 + k - 1, 'wood-red');
    }
  }
  for (const x of [stair.x0 - 1, stair.x1 + 1]) put(x, S, stair.z0, 'cobble');
  for (const x of [stair.x0 - 1, stair.x1 + 1]) furn(L.plant, x + 0.5, S, stair.z0 - 0.5, 0);
  // Wooden balustrades up both sides of the staircase (d-03).
  for (let k = 1; k <= 6; k++) for (const x of [stair.x0, stair.x1 + 1]) at(L.railing, x, F + k + 1, stair.z0 + k - 0.5, FACE.west);
  // Banners hung on the hall's columns over the arcade (d-03, d-09).
  for (const z of [lib.z0 + 8, lib.z0 + 16]) {
    at(L.banner, lib.pavX0 + 1.12, US + 0.4, z + 0.5, FACE.east);
    at(L.banner, lib.pavX1 - 0.12, US + 0.4, z + 0.5, FACE.west);
  }

  // Balustrades along the gallery's edges over the hall (not where the stairs arrive), banners on the back.
  const railZ = (x: number, z0: number, z1: number): void => {
    for (let z = z0; z + 1 <= z1; z += 2) at(L.railing, x + 0.5, US, z + 1, FACE.west);
  };
  railZ(lib.pavX0, lib.z1 - 18, lib.z1 - 7);
  railZ(lib.pavX1, lib.z0 + 1, lib.z1 - 7);
  for (let x = hall.x0; x + 1 <= hall.x1; x += 2) if (x + 1 < stair.x0 || x > stair.x1) at(L.railing, x + 1, US, lib.z1 - 7 + 0.1, 0);
  for (const x of [mid - 8, mid + 8]) at(L.banner, x + 0.5, US + 0.6, lib.z1 - 0.1, FACE.north);
  for (const x of [mid - 8, mid + 8]) at(L.banner, x + 0.5, S + 6.5, pz + 1.1, FACE.south);

  // The hall (d-03): the red carpet with its gold edge from the door to the globe, the round rug, the ring
  // of low shelves round the globe, chandeliers, the librarian's desk and the return counter by the door.
  const globe = { x: mid, z: lib.z0 + 10 };
  for (let x = hall.x0; x <= hall.x1; x++) {
    for (let z = pz + 1; z < stair.z0; z++) {
      const d = Math.hypot(x - globe.x, z - globe.z);
      const runner = z <= globe.z && Math.abs(x - mid) <= 3;
      if (d <= 6.5 || runner) put(x, F, z, (runner && Math.abs(x - mid) === 3) || (d > 5.6 && d <= 6.5 && !runner) ? 'sand' : 'wood-red');
    }
  }
  // The globe stands on a round dais, red inside a wooden rim (d-03).
  for (let x = globe.x - 3; x <= globe.x + 3; x++) {
    for (let z = globe.z - 3; z <= globe.z + 3; z++) {
      const d = Math.hypot(x - globe.x, z - globe.z);
      if (d <= 2.6) put(x, S, z, d > 1.8 ? 'planks' : 'wood-red');
    }
  }
  at(L.globe, globe.x + 0.5, S + 1, globe.z + 0.5, 20);
  // The ring of low bookcases round the globe, open at the front and the back, plants and books on top.
  for (let k = 0; k < 24; k++) {
    const a = ((k + 0.5) / 24) * Math.PI * 2;
    if (Math.abs(Math.sin(a)) < 0.3) continue;
    const [x, z] = [globe.x + 0.5 + Math.sin(a) * 4.2, globe.z + 0.5 - Math.cos(a) * 4.2];
    const yaw = (360 - Math.round((a * 180) / Math.PI)) % 360;
    at(L.lowShelf, x, S, z, yaw);
    if (k % 3 === 0) furn(L.plantSmall, x, S + 1.02, z, 0);
    else if (k % 3 === 1) at(L.books, x, S + 1.02, z, k * 40);
  }
  for (const z of [lib.z0 + 2, globe.z + 9]) at(L.chandelier, mid + 0.5, PTOP - 4.6, z + 0.5, 0);
  for (const [x0, x1] of [[hall.x0 + 1, hall.x0 + 6], [hall.x1 - 6, hall.x1 - 1]] as const) {
    const z = lib.z0 + 2;
    fill(x0, S, z, x1, S, z, 'planks');
    fill(x0, S, z - 2, x0, S, z - 1, 'planks');
    for (let x = x0 + 1; x <= x1; x += 2) at(L.books, x + 0.5, S + 1, z + 0.5, x * 13);
  }
  at(L.readingLamp, hall.x0 + 3.5, S + 1, lib.z0 + 2.5, 0);
  at(L.computer, hall.x1 - 3.5, S + 1, lib.z0 + 2.6, FACE.south);
  ctx.landmark('ban-thu-thu', 'Bàn thủ thư', hall.x0 + 3, lib.z0 + 4, S);
  ctx.landmark('quay-tra-sach', 'Quầy trả sách', hall.x1 - 3, lib.z0 + 4, S);
  ctx.landmark('sanh-chinh', 'Sảnh chính', mid, pz + 2, S);
  ctx.landmark('bac-cau-thang-gac-sach', 'Bậc cầu thang gác sách', mid, stair.z0 - 2, S);
  for (const [x, z] of [[hall.x0, pz + 1], [hall.x1, pz + 1], [hall.x0, stair.z0 - 1], [hall.x1, stair.z0 - 1]] as const) furn(L.plant, x + 0.5, S, z + 0.5, 0);
  // Lanterns on the hall's columns, facing in.
  for (let z = lib.z0 + 4; z < lib.z1 - 8; z += 8) {
    at(L.wallLantern, lib.pavX0 + 1, S + 3, z + 0.5, FACE.east);
    at(L.wallLantern, lib.pavX1, S + 3, z + 0.5, FACE.west);
  }

  // West wing, front: the reading room (d-04, and the school's library frame c-16): long tables with chairs,
  // green lamps and open books, tall bookcases along the outer wall.
  const W = { x0: lib.x0 + 1, x1: lib.pavX0 - 1 };
  for (const tx of [W.x0 + 2, W.x0 + 7, W.x0 + 12, W.x0 + 17]) {
    for (const tz of [lib.z0 + 3, lib.z0 + 7, lib.z0 + 11, lib.z0 + 15]) {
      at(L.readingTable, tx + 1, S, tz + 0.5, 0);
      for (const dx of [0.5, 1.5]) {
        at(L.woodChair, tx + dx, S, tz - 0.25, FACE.south);
        at(L.woodChair, tx + dx, S, tz + 1.25, FACE.north);
      }
      at(L.readingLamp, tx + 1, S + 0.8, tz + 0.5, (tx + tz) % 2 === 0 ? 0 : 180);
      at(L.openBook, tx + 0.4, S + 0.8, tz + 0.3, tx * 7 + tz);
      at(L.books, tx + 1.6, S + 0.8, tz + 0.6, tz * 3);
    }
  }
  // Floor-to-ceiling bookcases between the windows, on the outer wall and along the front (d-04).
  for (const z of [lib.z0 + 6.5, lib.z0 + 12.5]) at(L.tallShelf, W.x0 + 0.32, S, z, FACE.east);
  for (const x of [lib.x0 + 6.5, lib.x0 + 15.5, lib.x0 + 18.5]) at(L.tallShelf, x, S, lib.z0 + 1.32, FACE.south);
  ctx.landmark('ban-doc', 'Bàn đọc sách', W.x0 + 10, lib.z0 + 8, S);
  ctx.landmark('phong-doc-sach', 'Khu đọc sách', W.x0 + 10, lib.z0 + 14, S);

  // West wing, back: the children's corner (d-06): the tree up through the ceiling hung with lanterns, a mat
  // of bright squares, round tables, cushions and pillows, low bookcases.
  const mat = ['wood-red', 'roof-blue', 'sand', 'grass-library', 'snow'];
  for (let x = W.x0 + 1; x <= W.x1 - 1; x++) {
    for (let z = lib.z1 - 15; z <= lib.z1 - 2; z++) put(x, F, z, mat[(Math.floor(x / 2) + Math.floor(z / 2) * 2) % mat.length] ?? 'sand');
  }
  fill(treeAt.x, S, treeAt.z, treeAt.x + 1, UP + 3, treeAt.z + 1, 'tree-log');
  for (let dx = -6; dx <= 7; dx++) {
    for (let dz = -6; dz <= 7; dz++) {
      for (let y = S + 2; y <= UP + 6; y++) {
        const [x, z] = [treeAt.x + dx, treeAt.z + dz];
        if (x <= lib.x0 || x >= lib.pavX0 || z >= lib.z1 || y === UP || y === UP + 1) continue;
        const r = y < UP ? 3.6 + (y - S - 2) * 1.1 : 5.6 - Math.abs(y - UP - 3) * 0.8;
        const d = Math.hypot(dx - 0.5, dz - 0.5);
        if (d > r || (y < UP && d < 1.5)) continue;
        if (world.get(x, y, z) !== 0) continue;
        put(x, y, z, (dx * 7 + dz * 3 + y) % 23 === 0 ? 'lantern' : (dx + dz + y) % 5 === 0 ? 'leaves-pink' : 'leaves');
      }
    }
  }
  for (const [x, z] of [[treeAt.x - 3, treeAt.z], [treeAt.x + 4, treeAt.z + 1]] as const) put(x, S + 3, z, 'lantern');
  for (const [x, z] of [[treeAt.x + 3, treeAt.z - 5], [W.x0 + 3, lib.z1 - 4], [W.x1 - 3, lib.z1 - 3]] as const) {
    at(L.roundTable, x + 0.5, S, z + 0.5, 0);
    at(L.openBook, x + 0.3, S + 0.8, z + 0.5, x * 9);
    at(L.books, x + 0.8, S + 0.8, z + 0.7, z * 5);
    at(L.poufs, x + 0.5, S, z - 1.2, 0);
    at(L.poufs, x + 0.5, S, z + 2.2, 180);
    at(L.poufs, x - 1.2, S, z + 0.5, 90);
  }
  for (const [k, [x, z]] of ([[W.x0 + 1, lib.z1 - 7], [W.x0 + 2, lib.z1 - 4], [W.x1 - 6, lib.z1 - 13], [W.x1 - 2, lib.z1 - 9], [W.x0 + 7, lib.z1 - 2], [W.x1 - 1, lib.z1 - 14]] as const).entries()) {
    furn(k % 2 === 0 ? L.pillow : L.pillowBlue, x + 0.5, S, z + 0.5, k * 40);
  }
  for (let x = W.x0 + 6; x <= W.x1 - 6; x += 1) at(L.lowShelf, x + 0.5, S, lib.z1 - 0.3, FACE.north);
  for (let z = lib.z1 - 14; z <= lib.z1 - 7; z += 1) at(L.lowShelf, W.x0 + 0.3, S, z + 0.5, FACE.east);
  furn(L.plant, W.x1 - 0.5, S, lib.z1 - 1.5, 0);
  ctx.landmark('goc-doc-co-goi', 'Góc đọc có gối', W.x0 + 8, lib.z1 - 10, S);

  // East wing, front: the bookcases by subject along the outer wall with the ladder (d-05), stacks of
  // bookcases back to back with aisles between them.
  const E = { x0: lib.pavX1 + 1, x1: lib.x1 - 1 };
  L.subjects.forEach((model, i) => at(model, E.x1 + 0.68, S, lib.z0 + 4 + i * 2.05, FACE.west));
  at(L.ladder, E.x1 + 0.2, S, lib.z0 + 7.1, FACE.west);
  for (const [k, z] of [lib.z0 + 2.4, lib.z0 + 12.6].entries()) furn(k === 0 ? L.plant : L.plantSmall, E.x1 + 0.4, S, z, 0);
  for (const z of [lib.z0 + 2.4, lib.z0 + 12.6]) at(L.wallLantern, lib.x1, S + 3, z, FACE.west);
  for (const x of [E.x0 + 4, E.x0 + 9]) {
    for (let z = lib.z0 + 3; z <= lib.z0 + 13; z += 2) {
      at(L.tallShelf, x + 0.2, S, z + 1, FACE.west);
      at(L.tallShelf, x + 0.8, S, z + 1, FACE.east);
    }
  }
  ctx.landmark('ke-sach-phong-doc', 'Kệ sách phòng đọc', E.x1 - 4, lib.z0 + 8, S);
  ctx.landmark('loi-giua-cac-ke-sach', 'Lối đi giữa các kệ sách', E.x0 + 7, lib.z0 + 8, S);

  // East wing, middle: the computers (d-07), two rows of long desks, two screens on each, chairs before them.
  for (const z of [lib.z0 + 19, lib.z0 + 23]) {
    for (let x = E.x0 + 2.5; x <= E.x1 - 1; x += 4) {
      at(L.longDesk, x, S, z + 0.5, 0);
      for (const dx of [-0.75, 0.75]) {
        at(L.computer, x + dx, S + 0.8, z + 0.6, FACE.north);
        at(L.woodChair, x + dx, S, z - 0.45, FACE.south);
      }
    }
  }
  at(L.wallLantern, lib.x1, S + 2.8, lib.z0 + 21.5, FACE.west);
  ctx.landmark('khu-may-tinh', 'Khu tra cứu máy tính', E.x0 + 10, lib.z0 + 16, S);

  // East wing, back: the group room behind glass walls framed in timber (d-08): the whiteboard on the back
  // wall, a long table with chairs round it, books open on it, plants and a lantern.
  const G = { x0: E.x0 + 4, z0: lib.z1 - 8 };
  for (let x = G.x0; x <= E.x1; x++) for (let y = S; y < UP; y++) put(x, y, G.z0, (x - G.x0) % 4 === 0 || y === UP - 1 ? 'log' : 'glass');
  for (let z = G.z0; z < lib.z1; z++) for (let y = S; y < UP; y++) put(G.x0, y, z, (z - G.z0) % 4 === 0 || y === UP - 1 ? 'log' : 'glass');
  fill(G.x0 + 4, S, G.z0, G.x0 + 5, S + 2, G.z0, 'air');
  const board = Math.round((G.x0 + E.x1) / 2) + 1;
  at(L.whiteboard, board, S, lib.z1, FACE.north);
  for (const dx of [-1, 1]) at(L.readingTable, board + dx, S, lib.z1 - 4, 0);
  for (const dx of [-1.5, 0, 1.5]) {
    at(L.woodChair, board + dx, S, lib.z1 - 5.2, FACE.south);
    at(L.woodChair, board + dx, S, lib.z1 - 2.8, FACE.north);
    at(L.openBook, board + dx, S + 0.8, lib.z1 - 4.1, dx * 40 + 10);
  }
  for (const [x, z] of [[G.x0 + 1, lib.z1 - 1], [E.x1, lib.z1 - 1], [E.x1, G.z0 + 1]] as const) furn(L.plant, x + 0.5, S, z + 0.5, 0);
  at(L.wallLantern, board - 4.5, S + 3, lib.z1, FACE.north);
  ctx.landmark('phong-hoc-nhom', 'Phòng học nhóm', board, G.z0 + 1, S);

  // Upstairs west, front: the rare-books room (d-10) behind plank walls: glass cases, a red rug, the old map,
  // a small globe, lanterns.
  const RB = { z1: lib.z0 + 14 };
  for (let y = US; y <= TOP - 1; y++) {
    for (let x = W.x0; x <= lib.pavX0; x++) put(x, y, RB.z1, 'log');
    for (let z = lib.z0 + 1; z <= RB.z1; z++) put(lib.pavX0, y, z, (z - lib.z0) % 4 === 0 ? 'cobble' : 'log');
  }
  fill(W.x0 + 9, US, RB.z1, W.x0 + 10, US + 2, RB.z1, 'air');
  for (let x = W.x0 + 2; x <= W.x1 - 2; x++) for (let z = lib.z0 + 3; z <= RB.z1 - 3; z++) put(x, UP, z, Math.abs(x - (W.x0 + W.x1) / 2) > 7.5 || z === lib.z0 + 3 || z === RB.z1 - 3 ? 'sand' : 'wood-red');
  for (const [x, z] of [[W.x0 + 5, lib.z0 + 6], [W.x0 + 10, lib.z0 + 6], [W.x0 + 15, lib.z0 + 6], [W.x0 + 7, lib.z0 + 10], [W.x0 + 13, lib.z0 + 10]] as const) at(L.glassCase, x + 0.5, US, z + 0.5, 0);
  for (let z = lib.z0 + 2; z <= RB.z1 - 2; z += 3) at(L.tallShelf, W.x0 + 0.32, US, z + 1, FACE.east);
  for (let x = W.x0 + 3; x <= W.x1 - 2; x += 3) at(L.tallShelf, x + 0.5, US, lib.z0 + 1.32, FACE.south);
  for (const z of [lib.z0 + 4, lib.z0 + 10]) at(L.tallShelf, lib.pavX0 - 0.32, US, z, FACE.west);
  for (const [x, z] of [[W.x0 + 6, lib.z0 + 8], [W.x0 + 14, lib.z0 + 8]] as const) put(x, TOP - 1, z, 'lantern');
  for (const z of [lib.z0 + 7]) at(L.wallLantern, lib.pavX0, US + 2.4, z, FACE.west);
  at(L.map, W.x0 + 10.5, US + 1.6, RB.z1 - 0.15, 180);
  at(L.globeSmall, W.x1 - 1.5, US, RB.z1 - 1.5, 30);
  for (const x of [W.x0 + 4, W.x1 - 4]) at(L.wallLantern, x + 0.5, US + 2.4, RB.z1, FACE.north);
  ctx.landmark('phong-sach-quy', 'Khu sách quý', W.x0 + 10, RB.z1 - 2, US);

  // Upstairs west, back: bookcases round the tree's crown, a balustrade round the well and over the hall.
  for (let z = lib.z0 + 16; z <= lib.z1 - 2; z += 2) if (!inTreeWell(W.x0 + 1, z)) at(L.tallShelf, W.x0 + 0.32, US, z + 1, FACE.east);
  for (let k = -5; k <= 4; k += 2) {
    at(L.railing, treeAt.x + k + 1, US, treeAt.z - 4.6, 0);
    at(L.railing, treeAt.x + k + 1, US, treeAt.z + 5.4, 0);
    at(L.railing, treeAt.x - 4.4, US, treeAt.z + k + 1, FACE.west);
    at(L.railing, treeAt.x + 5.4, US, treeAt.z + k + 1, FACE.west);
  }

  // Upstairs east: the gallery along the hall with bookcases behind it (d-09), and through a door in their
  // wall the store room (d-12): a long aisle between metal shelves stacked with boxes, lamps overhead.
  const ST = { x0: E.x0 + 4 };
  for (let z = lib.z0 + 1; z <= lib.z1 - 8; z++) for (let y = US; y <= TOP; y++) put(ST.x0, y, z, (z - lib.z0) % 4 === 1 ? 'log' : 'planks');
  for (let x = ST.x0; x <= E.x1; x++) for (let y = US; y <= TOP; y++) put(x, y, lib.z1 - 8, (x - ST.x0) % 4 === 0 ? 'log' : 'planks');
  fill(ST.x0 + 1, TOP, lib.z0 + 1, E.x1, TOP, lib.z1 - 9, 'planks');
  fill(ST.x0, US, lib.z1 - 12, ST.x0, US + 2, lib.z1 - 11, 'air');
  for (let z = lib.z0 + 2; z <= lib.z1 - 13; z += 2) at(L.tallShelf, ST.x0 - 0.32, US, z + 1, FACE.west);
  const aisle = Math.round((ST.x0 + E.x1) / 2);
  for (let z = lib.z0 + 2; z <= lib.z1 - 11; z += 2) {
    at(L.storeShelf, aisle - 1.2, US, z + 1, FACE.east);
    at(L.storeShelf, aisle + 2.2, US, z + 1, FACE.west);
  }
  for (let z = lib.z0 + 4; z <= lib.z1 - 11; z += 6) {
    put(aisle, TOP - 1, z, 'lantern');
    furn(L.carton, aisle - 0.4, US, z + 2.5, z * 7);
  }
  furn(L.carton, aisle + 0.6, US, lib.z0 + 3.5, 30);
  ctx.landmark('kho-sach', 'Kho sách', aisle, lib.z0 + 3, US);
  // Upstairs east, at the back: the private reading nook (d-11): a window seat under the back window, a round
  // table with books, a lamp, plants and a bookcase.
  const nook = { x: board, z: lib.z1 };
  at(L.windowSeat, nook.x + 0.5, US, nook.z - 0.5, FACE.north);
  at(L.roundTable, nook.x + 0.5, US, nook.z - 3, 0);
  at(L.books, nook.x + 0.2, US + 0.8, nook.z - 2.9, 40);
  at(L.openBook, nook.x + 0.9, US + 0.8, nook.z - 3.1, 200);
  for (const dx of [-1.6, 2.6]) at(L.poufs, nook.x + dx, US, nook.z - 3, 90);
  at(L.readingLamp, nook.x - 2.2, US, nook.z - 0.8, 0);
  for (const [x, z] of [[nook.x - 3, nook.z - 1], [nook.x + 3, nook.z - 1], [nook.x + 4, nook.z - 5]] as const) furn(L.plant, x + 0.5, US, z + 0.5, 0);
  for (const z of [nook.z - 4, nook.z - 2]) at(L.tallShelf, lib.x1 - 0.32, US, z, FACE.west);
  ctx.landmark('goc-doc-rieng', 'Góc đọc riêng', nook.x, nook.z - 5, US);
  ctx.landmark('ban-cong-tang-2', 'Ban công tầng 2', lib.pavX1 + 2, lib.z0 + 6, US);
  ctx.landmark('gac-sach', 'Gác sách', lib.pavX1 + 2, lib.z1 - 12, US);

  // The roofs: the main block's hipped roof of red tiles (stepping in a block a course, flat on top), and the
  // pavilion's taller gable along z, its front gable filled with stone round the clock (d-01).
  for (let k = 0; k < PTOP - TOP; k++) {
    for (let x = O.x0 - 1 + k; x <= O.x1 + 1 - k; x++) {
      if (x >= lib.pavX0 && x <= lib.pavX1) continue;
      for (let z = O.z0 - 1 + k; z <= O.z1 + 1 - k; z++) put(x, TOP + 1 + k, z, 'brick-red');
    }
  }
  // Dormers on the wings' front slopes: a glazed gable two courses up the roof, a little roof over it.
  for (const x of [lib.x0 + 7, lib.x0 + 15, lib.x1 - 15, lib.x1 - 7]) {
    const z = O.z0 + 1;
    fill(x - 1, TOP + 2, z, x + 1, TOP + 3, z + 2, 'sand');
    fill(x - 1, TOP + 2, z, x + 1, TOP + 3, z, 'cobble');
    put(x, TOP + 2, z, 'glass');
    put(x, TOP + 3, z, 'lantern');
    fill(x - 2, TOP + 4, z - 1, x + 2, TOP + 4, z + 3, 'brick-red');
    fill(x - 1, TOP + 5, z - 1, x + 1, TOP + 5, z + 3, 'brick-red');
  }
  const half = Math.floor((lib.pavX1 - lib.pavX0) / 2) + 2;
  const roofY = (x: number): number => PTOP + 1 + Math.floor((half - Math.abs(x - mid)) * 0.7);
  for (let x = mid - half; x <= mid + half; x++) {
    for (let z = pz - 2; z <= O.z1 + 2; z++) put(x, roofY(x), z, Math.abs(x - mid) <= 0 ? 'brick-grey' : 'brick-red');
    if (x <= lib.pavX0 || x >= lib.pavX1) continue;
    for (const z of [pz, O.z1]) for (let y = PTOP + 1; y < roofY(x); y++) put(x, y, z, y === roofY(x) - 1 ? 'cobble' : 'sand');
  }
  // Plank ceilings over the rooms upstairs, a cream vault under the pavilion's roof.
  for (let x = lib.x0 + 1; x < lib.x1; x++) {
    for (let z = lib.z0 + 1; z < lib.z1; z++) {
      const overHall = x > lib.pavX0 && x < lib.pavX1;
      if (overHall) {
        if (world.get(x, roofY(x) - 1, z) === 0) put(x, roofY(x) - 1, z, 'sand');
      } else if (world.get(x, TOP, z) === 0) put(x, TOP, z, darkRoom(x, TOP, z) ? 'log' : 'planks');
    }
  }
  for (let x = hall.x0; x <= hall.x1; x++) for (let z = pz + 1; z <= lib.z0; z++) if (world.get(x, roofY(x) - 1, z) === 0) put(x, roofY(x) - 1, z, 'sand');
  // The clock in the gable, on a white disc in a stone ring.
  for (let dx = -3; dx <= 3; dx++) {
    for (let dy = -3; dy <= 3; dy++) {
      const d = Math.hypot(dx, dy);
      if (d <= 3.4) put(mid + dx, PTOP + 5 + dy, pz - 1, d > 2.5 ? 'cobble' : 'snow');
    }
  }
  at(L.clock, mid + 0.5, PTOP + 3.5, pz - 1.15, 180);

  // On the front: banners in the plain bays, lanterns on the pilasters and either side of the door.
  for (const x of banners) {
    const z = x > lib.pavX0 && x < lib.pavX1 ? pz : O.z0;
    at(L.banner, x + 0.5, S + 4.2, z - 0.12, FACE.north);
  }
  for (const x of [lib.x0 + 6, lib.x0 + 12, lib.x1 - 12, lib.x1 - 6]) at(L.wallLantern, x + 0.5, S + 2.2, O.z0, FACE.north);
  for (const x of [mid - 5, mid + 5]) at(L.wallLantern, x + 0.5, S + 2.6, pz, FACE.north);
  for (const x of [mid - 4, mid + 4]) at(L.wallLantern, x + 0.5, S + 2.2, O.z1 + 1, FACE.south);

  return {
    indoors: [
      { x0: O.x0, z0: O.z0, x1: O.x1, z1: O.z1 },
      { x0: lib.pavX0, z0: lib.pavZ0, x1: lib.pavX1, z1: O.z0 },
    ],
    front: [mid, pz - 1],
    back: [mid, O.z1 + 1],
  };
}
