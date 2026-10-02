// Landmark pieces of the owner's detail mocks (designs/<map>/d-*.png, 02/10/2026) that every map builds
// from: a round tower under a pointed roof with a flag (the castle's towers, the library's clock tower, a
// village spire), a hanging banner with an emblem, a gate arch with a little tiled roof and a banner over the
// way in (village, market, farm and castle gates, the hub's portals), a humped stone arch bridge, a round
// paved square with a ring border, and a waterfall down a cliff into a pool. Each writes blocks only and
// returns where its lamps, signs or people go; a map file decides where they stand.
import { put, type WorldWriter } from './world-writer';

export interface TowerBlocks {
  wall: number;
  /** The cornice ring under the roof and the floor at its foot. */
  trim: number;
  roof: number;
  glass: number;
  /** A flag on a pole at the tip (the pole is `pole`). */
  flag?: number;
  pole?: number;
}

/**
 * A round tower of `radius` (3–6) and `height` on `baseY`: a hollow ring of wall with a door on -z (when
 * `door`), slit windows at the four compass points every four blocks, a cornice ring jutting one block, a
 * stepped cone roof overhanging it and a flag on the tip. Returns the cornice's y and the roof's tip.
 */
export function placeTower(world: WorldWriter, cx: number, cz: number, baseY: number, radius: number, height: number, b: TowerBlocks, door = true): { cornice: number; tip: number } {
  const span = radius + 2;
  for (let y = baseY; y < baseY + height; y++) {
    for (let dx = -span; dx <= span; dx++) {
      for (let dz = -span; dz <= span; dz++) {
        const d = Math.hypot(dx, dz);
        if (d > radius + 0.4 || d <= radius - 0.9) continue;
        const doorway = door && dx === 0 && dz < 0 && y < baseY + 2;
        if (doorway) continue;
        const slit = (y - baseY) % 4 === 2 && ((dx === 0 && Math.abs(dz) >= radius - 1) || (dz === 0 && Math.abs(dx) >= radius - 1));
        put(world, cx + dx, y, cz + dz, slit ? b.glass : b.wall);
      }
    }
  }
  // The floor inside, the cornice ring one block out.
  const cornice = baseY + height;
  for (let dx = -span; dx <= span; dx++) {
    for (let dz = -span; dz <= span; dz++) {
      const d = Math.hypot(dx, dz);
      if (d <= radius - 0.9) put(world, cx + dx, baseY - 1, cz + dz, b.trim);
      if (d <= radius + 1.4) put(world, cx + dx, cornice, cz + dz, b.trim);
    }
  }
  // A stepped cone: from one block past the cornice to a point, about twice as tall as it is wide.
  const base = radius + 1.6;
  const roofHeight = Math.round(base * 2.2);
  for (let k = 0; k <= roofHeight; k++) {
    const r = base * (1 - k / roofHeight);
    for (let dx = -span; dx <= span; dx++) for (let dz = -span; dz <= span; dz++) if (Math.hypot(dx, dz) <= r + 0.35) put(world, cx + dx, cornice + 1 + k, cz + dz, b.roof);
  }
  let tip = cornice + 1 + roofHeight;
  if (b.flag !== undefined) {
    const pole = b.pole ?? b.trim;
    for (let y = tip + 1; y <= tip + 3; y++) put(world, cx, y, cz, pole);
    put(world, cx + 1, tip + 3, cz, b.flag);
    put(world, cx + 2, tip + 3, cz, b.flag);
    put(world, cx + 1, tip + 2, cz, b.flag);
    tip += 3;
  }
  return { cornice, tip };
}

/**
 * A banner hanging down a wall from `yTop`: two blocks wide along `along` ('x' or 'z'), `length` tall, an
 * emblem block in the middle (the mocks' gold crest on red). (x, z) is the banner's first cell, outside the wall.
 */
export function placeBanner(world: WorldWriter, x: number, yTop: number, z: number, along: 'x' | 'z', b: { cloth: number; emblem: number }, length = 4): void {
  const mid = Math.floor(length / 2);
  for (let k = 0; k < length; k++) {
    for (let w = 0; w < 2; w++) {
      const [bx, bz] = along === 'x' ? [x + w, z] : [x, z + w];
      put(world, bx, yTop - k, bz, k === mid ? b.emblem : b.cloth);
    }
  }
}

export interface GateBlocks {
  pillar: number;
  beam: number;
  roof: number;
  cloth: number;
  emblem: number;
}

/**
 * A gate arch over a way running along z (`across` 'x') or along x (`across` 'z'), centred on (cx, cz), its
 * opening `span` wide (odd) and five blocks high: two 2 x 2 stone pillars, a timber beam across, a little
 * tiled gable roof over the beam and a banner hanging from its front. Returns the ground cells for a lamp
 * each side and a sign beside the left lamp, on the -z (or -x) side, the side the way arrives from.
 */
export function placeGateArch(world: WorldWriter, cx: number, cz: number, baseY: number, across: 'x' | 'z', b: GateBlocks, span = 5): { lamps: Array<[number, number]>; sign: [number, number] } {
  const half = Math.floor(span / 2);
  // Local frame: u across the way, v along it (v = 0, 1 is the gate's depth).
  const at = (u: number, v: number): [number, number] => (across === 'x' ? [cx + u, cz + v] : [cx + v, cz + u]);
  const set = (u: number, y: number, v: number, id: number): void => {
    const [x, z] = at(u, v);
    put(world, x, y, z, id);
  };
  const beamY = baseY + 5;
  for (const side of [-1, 1]) {
    for (const du of [half + 1, half + 2]) for (let v = 0; v <= 1; v++) for (let y = baseY; y < beamY + 1; y++) set(side * du, y, v, b.pillar);
  }
  for (let u = -half - 2; u <= half + 2; u++) for (let v = 0; v <= 1; v++) set(u, beamY, v, b.beam);
  for (let u = -half - 3; u <= half + 3; u++) {
    for (const v of [-1, 2]) set(u, beamY + 1, v, b.roof);
    for (const v of [0, 1]) set(u, beamY + 2, v, b.roof);
  }
  // The banner hangs from the beam's front, over the middle of the opening (clear of a child's head).
  for (let k = 1; k <= 2; k++) for (const u of [0, 1]) set(u - (span % 2 === 1 ? 0 : 1), beamY - k, -1, k === 1 ? b.emblem : b.cloth);
  const lamps: Array<[number, number]> = [at(-half - 4, -1), at(half + 4, -1)];
  return { lamps, sign: at(-half - 5, -2) };
}

/**
 * A humped stone bridge from (x0, z0) to (x1, z1) along x or z (one of them equal), `width` wide, its deck
 * rising `rise` blocks from `deckY` at the ends to the middle over an arch that opens from the water at
 * `waterY` up to two blocks under the deck's crown (anything under the arch, a plank deck, is cleared);
 * parapets one block high. Returns lamp cells beside the deck at both ends.
 */
export function placeArchBridge(world: WorldWriter, from: readonly [number, number], to: readonly [number, number], deckY: number, waterY: number, b: { stone: number; rail: number }, width = 4, rise = 2): { lamps: Array<[number, number]> } {
  const alongX = from[1] === to[1];
  const [a, c] = alongX ? [from[0], to[0]] : [from[1], to[1]];
  const fixed = alongX ? from[1] : from[0];
  const [lo, hi] = [Math.min(a, c), Math.max(a, c)];
  const length = Math.max(1, hi - lo);
  const half = Math.floor(width / 2);
  const archRise = deckY + rise - waterY - 2;
  const cell = (s: number, w: number): [number, number] => (alongX ? [s, fixed + w] : [fixed + w, s]);
  for (let s = lo; s <= hi; s++) {
    const t = (s - lo) / length;
    const deck = deckY + Math.round(rise * Math.sin(Math.PI * t));
    const open = waterY + Math.round(archRise * Math.sin(Math.PI * Math.min(1, Math.max(0, (t - 0.12) / 0.76))));
    for (let w = -half; w < width - half; w++) {
      const [x, z] = cell(s, w);
      for (let y = waterY + 1; y < open; y++) put(world, x, y, z, 0);
      for (let y = Math.max(open, waterY); y <= deck; y++) put(world, x, y, z, b.stone);
      for (let y = deck + 1; y <= deck + 3; y++) put(world, x, y, z, 0);
      if (w === -half || w === width - half - 1) put(world, x, deck + 1, z, b.rail);
    }
  }
  return { lamps: [cell(lo, -half - 1), cell(lo, width - half), cell(hi, -half - 1), cell(hi, width - half)] };
}

/** A round square of `radius` paved with `paver` at `y` (the ground's top), its outer ring in `border`. */
export function placePlaza(world: WorldWriter, cx: number, cz: number, radius: number, y: number, b: { paver: number; border: number }): void {
  const r = Math.ceil(radius);
  for (let dx = -r; dx <= r; dx++) {
    for (let dz = -r; dz <= r; dz++) {
      const d = Math.hypot(dx, dz);
      if (d > radius) continue;
      put(world, cx + dx, y, cz + dz, d > radius - 1.2 || Math.abs(d - radius * 0.55) < 0.6 ? b.border : b.paver);
      for (let up = 1; up <= 3; up++) if (world.get(cx + dx, y + up, cz + dz) !== 0) put(world, cx + dx, y + up, cz + dz, 0);
    }
  }
}

/**
 * Water down a cliff: from the lip (x, z) toward (dx, dz) a sheet `width` wide falls from the lip's height
 * to the ground below, every cell where the ground steps down holding water up to the lip, then a round pool
 * at the foot and mossy rocks either side. `surface` is the ground's top. Returns the pool's middle.
 */
export function placeWaterfall(world: WorldWriter, lip: readonly [number, number], toward: readonly [number, number], width: number, surface: (x: number, z: number) => number, b: { water: number; rock: number }): { pool: [number, number, number] } {
  const [lx, lz] = lip;
  const [tx, tz] = toward;
  const top = surface(lx, lz);
  const half = Math.floor(width / 2);
  const across = (k: number, w: number): [number, number] => [lx + tx * k + (tz !== 0 ? w : 0), lz + tz * k + (tx !== 0 ? w : 0)];
  let k = 1;
  let foot = top;
  for (; k < 48; k++) {
    const [x, z] = across(k, 0);
    const h = surface(x, z);
    const [nx, nz] = across(k + 1, 0);
    foot = Math.min(foot, h);
    for (let w = -half; w <= half; w++) {
      const [wx, wz] = across(k, w);
      for (let y = surface(wx, wz) + 1; y <= top; y++) put(world, wx, y, wz, b.water);
    }
    if (surface(nx, nz) >= h) break;
  }
  const [px, pz] = across(k + 3, 0);
  for (let dx = -half - 3; dx <= half + 3; dx++) {
    for (let dz = -half - 3; dz <= half + 3; dz++) {
      if (Math.hypot(dx, dz) > half + 3.2) continue;
      put(world, px + dx, surface(px + dx, pz + dz), pz + dz, b.water);
    }
  }
  for (const w of [-half - 2, half + 2]) {
    const [rx, rz] = across(k, w);
    put(world, rx, surface(rx, rz) + 1, rz, b.rock);
    put(world, rx, surface(rx, rz) + 2, rz, b.rock);
  }
  return { pool: [px + 0.5, foot + 1, pz + 0.5] };
}

/**
 * Opens the one-block door a round building cuts on its -z side (a windmill's foot, a lighthouse's) to three
 * across and `height` high, so the child walks in without a squeeze: clears the columns either side of its -z
 * axis from its centre out to `radius` + 1, the bottom rows from `baseY`.
 */
export function widenRoundDoor(world: WorldWriter, cx: number, cz: number, baseY: number, radius: number, height = 3): void {
  for (let y = baseY; y < baseY + height; y++) for (let dx = -1; dx <= 1; dx++) for (let dz = -radius - 1; dz < 0; dz++) put(world, cx + dx, y, cz + dz, 0);
}

/**
 * Fills the hollow shaft of a doorless round tower (`placeTower` with `door` false) solid from `baseY` for
 * `height` rows: a tower on a curtain wall or a roof is a mass of stone, not a sealed room.
 */
export function fillTowerShaft(world: WorldWriter, cx: number, cz: number, baseY: number, radius: number, height: number, block: number): void {
  for (let y = baseY; y < baseY + height; y++) {
    for (let dx = -radius; dx <= radius; dx++) for (let dz = -radius; dz <= radius; dz++) if (Math.hypot(dx, dz) <= radius - 0.9) put(world, cx + dx, y, cz + dz, block);
  }
}
