// The shores of "Đảo bí ẩn" after the owner's detail mock (designs/dao-bi-an/, 02/10/2026): the ground's
// colours (white sand beaches, rock faces of grey stone and moss, the volcano's dark rock and its lava), the
// palms along every shore, the harbour's long pier with its hanging lanterns, crates and the sailing ships
// (d-02), the beach of the welcome quest with its buried chest, the captain's tent, the leaning palm and the
// rock pool (d-03), the fishers' big houses on stilts, the pirates' cove under its cliff with their ship and jetty
// (d-12), the volcano with its streams of lava and its plume (d-11), the challenge court of glyph pillars over
// lava at its foot (d-10), plank causeways between the islands, and the islets with their rock arch.
import { placeStall } from './countryside';
import { CHALLENGE, coastDistance, COVE, COVE_JETTY, inArea, inPool, inZoneRect, ISLETS, isLand, LEDGE, LEVEL, PIER, SIZE, TIDE_POOL, VOLCANO, volcanoRise, WATER } from './dao-bi-an-land';
import { captainTent, fishingHouse, type IslandHouse } from './dao-bi-an-houses';
import { hangVines, type IslandKit, M, roll } from './dao-bi-an-kit';
import type { Point } from './path';

const TOP = LEVEL + 1;
const FLOAT = WATER + 0.6;
/** The fruit stall at the west end of the fishing village's lane (its corner; seven wide, four deep, counter north). */
export const STALL = { x: 446, z: 593 };
/** The captain's tent behind the beach, its door east toward the pier. */
const CAPTAIN_TENT: IslandHouse = { x0: 371, z0: 584, x1: 381, z1: 596, facing: 'east' };

/** Lava streams down the volcano (angle in degrees from +x toward +z) and the fields they spread into. */
const LAVA_STREAMS = [118, 162, 205, 248, 300, 35];
export function isLava(x: number, z: number): boolean {
  const [dx, dz] = [x - VOLCANO.x, z - VOLCANO.z];
  const d = Math.hypot(dx, dz);
  if (d < VOLCANO.crater) return true;
  if (d > VOLCANO.r + 14) return false;
  if (inArea(CHALLENGE, x, z, 3) || Math.hypot(x - LEDGE.x, z - LEDGE.z) < 7) return false;
  for (const deg of LAVA_STREAMS) {
    const a = (deg * Math.PI) / 180;
    const t = dx * Math.cos(a) + dz * Math.sin(a);
    if (t < VOLCANO.crater - 1) continue;
    const off = -dx * Math.sin(a) + dz * Math.cos(a) + 3 * Math.sin(t / 9 + deg);
    if (Math.abs(off) < 1.6 + t * 0.022) return true;
  }
  return d > VOLCANO.r - 8 && roll(Math.floor(x / 3), Math.floor(z / 3), 60) < 0.22;
}

/**
 * The ground's colours over the whole map: sand under the sea and along every beach, rock on every steep
 * face (moss and pale stone among the grey), the volcano in dark rock with its streams of lava, its cone laid
 * on past the terrain's cap up to its true height.
 */
export function paintLand(k: IslandKit): void {
  const { ctx, b } = k;
  const s = ctx.surface;
  for (let x = 0; x < SIZE; x++) {
    for (let z = 0; z < SIZE; z++) {
      const h = s(x, z);
      if (ctx.inWater(x, z)) {
        k.put(x, h, z, inPool(x, z) ? b.moss : b.sand);
        continue;
      }
      if (ctx.onPath(x, z)) continue;
      const v = volcanoRise(x, z);
      if (v > 0 || Math.hypot(x - VOLCANO.x, z - VOLCANO.z) < VOLCANO.r + 14) {
        const top = Math.max(h, LEVEL + v);
        for (let y = h - 3; y <= top; y++) k.put(x, y, z, k.darkAt(x, y, z));
        if (isLava(x, z)) {
          k.put(x, top, z, b.lava);
          k.put(x, top - 1, z, b.lava);
        }
        continue;
      }
      const steep = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx = 0, dz = 0]) => Math.abs(s(x + dx, z + dz) - h) >= 2);
      if (h >= LEVEL + 3 && steep) for (let y = h - 3; y <= h; y++) k.put(x, y, z, k.rockAt(x, y, z));
      else if (h >= LEVEL + 3 && roll(x, z, 61) < 0.1) k.put(x, h, z, b.moss);
      else if (!inZoneRect(x, z) && coastDistance(x, z) <= 4 && h <= LEVEL) {
        k.put(x, h, z, b.sand);
        k.put(x, h - 1, z, b.sand);
      }
    }
  }
}

/**
 * Palms along every shore and over the islets, now and then a leaning one, never on a path, in a zone or
 * on what was built. Returns where they stand and how tall (the parrots perch on them).
 */
export function palmShores(k: IslandKit): Array<{ x: number; z: number; height: number }> {
  const { ctx, b } = k;
  const bare = new Set([b.basalt, b.rock, b.cobble, b.paver, b.trail]);
  const palms: Array<{ x: number; z: number; height: number }> = [];
  for (let gx = 4; gx < SIZE - 4; gx += 6) {
    for (let gz = 4; gz < SIZE - 4; gz += 6) {
      const x = gx + Math.floor(roll(gx, gz, 62) * 4);
      const z = gz + Math.floor(roll(gz, gx, 63) * 4);
      const coast = coastDistance(x, z);
      if (coast < 2 || roll(x, z, 64) > (coast <= 12 ? 0.5 : 0.1)) continue;
      const y = ctx.surface(x, z);
      if (ctx.inWater(x, z) || ctx.inZone(x, z, 1) || ctx.nearPath(x, z, 3) || ctx.keptOut(x, z, 1) || y > LEVEL + 2 || ctx.world.get(x, y + 1, z) !== 0 || volcanoRise(x, z) > 0) continue;
      // Palms grow out of sand and earth, never out of the bare rock round the volcano or a paved way.
      if (bare.has(ctx.world.get(x, y, z))) continue;
      const r = roll(x, z, 65);
      const [model, height] = r < 0.45 ? [M.palmTall, 7] : r < 0.65 ? [M.palmDetailed, 8] : r < 0.88 ? [M.palmShort, 3.2] : [M.palmBend, 6];
      ctx.prop(model, x, z, Math.floor(roll(x, z, 66) * 360));
      palms.push({ x, z, height });
    }
  }
  return palms;
}

/** Posts of logs from the sea bed up through a deck at `deckY` (bollards one block over it). */
function piles(k: IslandKit, x: number, z: number, deckY: number): void {
  for (let y = WATER - 3; y <= deckY + 1; y++) if (y !== deckY) k.put(x, y, z, k.b.log);
}

/**
 * The harbour and its beach, chapter 1 (d-02, d-03): the long pier (posts, rails, hanging lanterns, barrels and
 * crates, ships and boats moored along it), the places of the welcome quest (the pier head, the beach, the
 * chest buried in the sand, the captain's tent, the leaning palm, the rock pool), a ruined gate glowing among
 * the palms behind the beach, a wreck in the shallows.
 */
export function buildHarbour(k: IslandKit): void {
  const { ctx, b } = k;
  const { x: px, z0, z1, half } = PIER;
  // The quest's places first, the pier head the first of them.
  ctx.landmark('ben-tau', 'Bến tàu', px, z0 - 4);
  ctx.landmark('bai-bien', 'Bãi biển', 376, 612);
  ctx.landmark('ruong-cat', 'Rương vùi trong cát', 420, 608);
  ctx.landmark('leu-thuyen-truong', 'Lều thuyền trưởng', 386, 598);
  ctx.landmark('cay-dua-nghieng', 'Cây dừa nghiêng', 410, 598);
  ctx.landmark('vung-nuoc-trieu', 'Vũng nước triều', TIDE_POOL.x0 - 6, TIDE_POOL.z0 + 5);

  // The beach: white sand over the zone's south (its edge ragged), grass and palms behind it.
  const zone = ctx.zone(1);
  for (let x = zone.x - zone.hx; x <= zone.x + zone.hx; x++) {
    for (let z = zone.z - zone.hz; z <= zone.z + zone.hz; z++) {
      if (ctx.onPath(x, z) || ctx.inWater(x, z) || z < 596 + Math.floor(roll(x, 0, 83) * 4) - (Math.abs(x - px) < 30 ? 4 : 0)) continue;
      k.put(x, LEVEL, z, b.sand);
      k.put(x, LEVEL - 1, z, b.sand);
    }
  }
  // The pier: a plank deck two above the sea, piles and rails along it, a wide head at its end.
  const headZ = z1 - 8;
  for (let z = z0; z <= z1; z++) {
    const wide = z >= headZ;
    const w = wide ? half + 8 : half;
    for (let x = px - w; x <= px + w; x++) {
      k.put(x, LEVEL, z, b.planks);
      for (let y = TOP; y <= TOP + 2; y++) k.put(x, y, z, 0);
    }
    if ((z - z0) % 4 === 0) for (const x of [px - w - 1, px + w + 1]) piles(k, x, z, LEVEL);
    else if (!wide && z > z0 + 2 && (z - z0) % 2 === 0) for (const x of [px - half, px + half]) ctx.propAt(M.fence, [x + 0.5, TOP, z + 0.5], 90);
  }
  for (let x = px - half - 8; x <= px + half + 8; x += 4) piles(k, x, z1 + 1, LEVEL);
  for (let z = z0 + 4; z < headZ; z += 12) {
    k.propOn(M.dockLantern, px - half, LEVEL, z, 180);
    k.propOn(M.dockLantern, px + half, LEVEL, z + 6, 0);
  }
  for (const x of [px - half - 7, px + half + 7]) k.propOn(M.dockLantern, x, LEVEL, z1 - 1, x < px ? 180 : 0);
  const cargo: ReadonlyArray<readonly [number, number, string]> = [
    [-1, 6, M.barrel], [1, 13, M.crate], [-1, 21, M.barrel], [-1, 22, M.box], [1, 30, M.barrel], [-6, headZ - z0 + 2, M.crate], [-5, headZ - z0 + 3, M.barrel], [6, headZ - z0 + 2, M.barrel],
    [7, headZ - z0 + 5, M.crate], [-8, headZ - z0 + 6, M.box], [3, headZ - z0 + 6, M.bucket],
  ];
  for (const [dx, dz, model] of cargo) k.propOn(model, px + dx, LEVEL, z0 + dz, dx * 31 + dz);
  // Ships and boats moored at the pier (d-02: the tall ship beside the child, more out in the bay).
  ctx.propAt(M.ship, [px - half - 7 + 0.5, FLOAT, z0 + 14 + 0.5], 90);
  ctx.propAt(M.ship, [px + half + 14 + 0.5, FLOAT, z1 + 2 + 0.5], 90);
  ctx.propAt(M.ship, [px - 46 + 0.5, FLOAT, z1 + 18 + 0.5], 20);
  ctx.propAt(M.rowboat, [px + half + 3 + 0.5, FLOAT - 0.3, z0 + 14 + 0.5], 90);
  ctx.propAt(M.canoe, [px + half + 2.5, FLOAT + 0.2, z0 + 20 + 0.5], 90);
  ctx.propAt(M.rowboat, [px - half - 3 + 0.5, FLOAT - 0.3, z0 + 40 + 0.5], 90);
  // The pier's gateway on the beach: tall posts with lanterns either side.
  for (const x of [px - half - 2, px + half + 2]) {
    for (let y = TOP; y <= TOP + 3; y++) k.put(x, y, z0 - 1, b.log);
    k.put(x, TOP + 4, z0 - 1, b.lantern);
  }
  ctx.keepOut(px - half - 2, z0 - 1, px + half + 2, z0);
  for (const [dx, model] of [[-5, M.crate], [-6, M.barrel], [6, M.barrel], [7, M.box]] as const) ctx.prop(model, px + dx, z0 - 2, dx * 17);

  // The beach (d-03): shells, driftwood, palms round the places of the quest.
  for (const [x, z, model, yaw] of [[370, 606, M.palmTall, 30], [382, 618, M.palmShort, 80], [368, 618, M.palmDetailed, 200], [412, 590, M.palmTall, 140]] as const) ctx.prop(model, x, z, yaw);
  for (let i = 0; i < 18; i++) {
    const x = 330 + Math.floor(roll(i, 7, 67) * 110);
    const z = 604 + Math.floor(roll(7, i, 68) * 22);
    if (!ctx.keptOut(x, z, 2)) ctx.prop(M.shell, x, z, i * 47);
  }
  ctx.prop(M.driftwood, 362, 622, 70);
  ctx.prop(M.driftwood, 436, 610, 20);
  // The chest buried in the sand, gold spilling round it.
  k.ctx.propAt(M.goldChest, [423.5, LEVEL + 0.65, 607.5], 200);
  for (const [dx, dz] of [[2, 1], [-1, 2]] as const) ctx.prop(M.goldPile, 423 + dx, 607 + dz, dx * 40);
  ctx.prop(M.rockLarge, 426, 605, 30);
  for (const [x, z, model, yaw] of [[430, 599, M.palmTall, 40], [438, 598, M.palmDetailed, 160], [433, 596, M.bush, 0], [428, 601, M.fern, 70]] as const) ctx.prop(model, x, z, yaw);
  // The captain's tent, his flag and a lamp at its door.
  captainTent(k, CAPTAIN_TENT);
  ctx.prop(M.flagpole, CAPTAIN_TENT.x1 + 3, CAPTAIN_TENT.z0 + 1, 0);
  ctx.prop(M.lamp, CAPTAIN_TENT.x1 + 3, CAPTAIN_TENT.z1 - 1, 0);
  ctx.prop(M.barrel, CAPTAIN_TENT.x1 + 2, CAPTAIN_TENT.z0 - 1, 0);
  // The leaning palm with coconuts under it.
  ctx.prop(M.palmBend, 413, 597, 300);
  for (const [dx, dz] of [[1, 2], [2, 1], [-1, 2]] as const) ctx.prop(M.coconut, 413 + dx, 597 + dz, dx * 60);
  // The rock pool: stones round the water, shells on its rim.
  for (let x = TIDE_POOL.x0 - 1; x <= TIDE_POOL.x1 + 1; x++) {
    for (const z of [TIDE_POOL.z0 - 1, TIDE_POOL.z1 + 1]) if (roll(x, z, 69) < 0.6) ctx.prop(roll(x, z, 70) < 0.5 ? M.rockSmall : M.rockLarge, x, z, x * 37);
  }
  for (let z = TIDE_POOL.z0; z <= TIDE_POOL.z1; z += 2) ctx.prop(M.rockLarge, TIDE_POOL.x1 + 1, z, z * 13);
  ctx.prop(M.shell, TIDE_POOL.x0 - 2, TIDE_POOL.z0 + 1, 40);
  ctx.keepOut(TIDE_POOL.x0, TIDE_POOL.z0, TIDE_POOL.x1, TIDE_POOL.z1);
  // A ruined gate glowing among the palms behind the beach (d-03).
  const gx = 352;
  const gz = 547;
  for (const dx of [-3, 2]) for (let x = gx + dx; x <= gx + dx + 1; x++) for (let y = LEVEL - 1; y <= TOP + 5; y++) k.put(x, y, gz, k.rockAt(x, y, gz) === k.b.stone ? b.brick : k.rockAt(x, y, gz));
  for (let x = gx - 3; x <= gx + 3; x++) k.put(x, TOP + 6, gz, b.brick);
  for (let x = gx - 1; x <= gx + 1; x++) for (let y = TOP; y <= TOP + 4; y++) k.put(x, y, gz - 1, b.crystal);
  hangVines(k, gx - 3, TOP + 6, gz + 1, 0);
  ctx.keepOut(gx - 3, gz - 1, gx + 3, gz);
  ctx.propAt(M.wreck, [446.5, WATER - 0.4, 650.5], 30);
}

/** The fishers' houses: a row facing south over the village lane, two across it facing north. */
const FISHING_HOUSES: readonly IslandHouse[] = [
  { x0: 452, z0: 573, x1: 464, z1: 583, facing: 'south' },
  { x0: 470, z0: 573, x1: 484, z1: 583, facing: 'south' },
  { x0: 490, z0: 573, x1: 502, z1: 583, facing: 'south' },
  { x0: 508, z0: 573, x1: 520, z1: 583, facing: 'south' },
  { x0: 459, z0: 591, x1: 471, z1: 601, facing: 'north' },
  { x0: 487, z0: 591, x1: 499, z1: 601, facing: 'north' },
];

/**
 * The fishing village east of the harbour: big houses on stilts either side of a lane, a small square with
 * its fire beside the lane down to the shore between the two across it, nets drying between the houses, canoes on the sand, a fruit stall at
 * the lane's west end.
 */
export function buildFishingVillage(k: IslandKit): void {
  const { ctx, b } = k;
  FISHING_HOUSES.forEach((house, i) => fishingHouse(k, house, i));
  for (const [x, z, yaw] of [[467, 578, 90], [487, 578, 90], [505, 578, 90], [474, 594, 0]] as const) ctx.prop(M.netRack, x, z, yaw);
  for (const [x, z, yaw] of [[466, 605, 80], [480, 606, 100], [496, 604, 70]] as const) ctx.prop(M.canoe, x, z, yaw);
  for (const [x, z, model] of [[475, 595, M.campfire], [485, 595, M.barrel], [474, 598, M.bucket], [474, 601, M.crate], [485, 601, M.logStack]] as const) ctx.prop(model, x, z, x * 7);
  const stall = placeStall(ctx.world, STALL.x, STALL.z, 7, 4, TOP, { log: b.log, planks: b.planks, stripes: [b.wood, b.white] });
  [M.coconut, M.pineapple, M.banana, M.coconut, M.pineapple].forEach((model, i) => ctx.propAt(model, [stall.counter[0] - 2 + i, stall.counter[1] + 0.2, stall.counter[2]], i * 40));
  // Its crates of fruit wait behind it, out from under the awning, so the floor under it stays open.
  for (const dx of [1, 5]) ctx.prop(M.crate, STALL.x + dx, STALL.z + 5, dx * 9);
  ctx.keepOut(STALL.x - 1, STALL.z - 1, STALL.x + 7, STALL.z + 4);
  ctx.landmark('lang-chai', 'Làng chài', 480, 598);
}

/**
 * The pirates' cove, chapter 5 (d-12): the cave into their cliff (its mouth framed by torches and vines,
 * inside their chests, gold, barrels, a map table and their flag), cannons and crates on the beach, the jetty
 * and their black-sailed ship moored beside it.
 */
export function buildCove(k: IslandKit): void {
  const { ctx, b } = k;
  const cave = COVE.cave;
  const midZ = (cave.z0 + cave.z1) / 2;
  const halfZ = (cave.z1 - cave.z0) / 2;
  for (let x = cave.x0; x <= cave.x1; x++) {
    for (let z = cave.z0; z <= cave.z1; z++) {
      const e = ((z - midZ) / halfZ) ** 2 + ((x - cave.x0) / (cave.x1 - cave.x0)) ** 6;
      if (e > 1) continue;
      const ceil = Math.min(TOP + Math.round((x < cave.x0 + 4 ? 6 : 8) * Math.sqrt(1 - Math.min(1, e))), ctx.surface(x, z) - 3);
      k.put(x, LEVEL, z, x < cave.x0 + 4 ? b.sand : b.planks);
      for (let y = TOP; y <= ceil; y++) k.put(x, y, z, 0);
      for (const [dx, dz] of [[1, 0], [0, 1], [0, -1]] as const) {
        for (let y = TOP; y <= ceil + 1; y++) if (ctx.world.get(x + dx, y, z + dz) !== 0) k.put(x + dx, y, z + dz, roll(x + dx, y, 71) < 0.06 ? b.lantern : k.darkAt(x + dx, y, z + dz));
      }
    }
  }
  const inside: ReadonlyArray<readonly [number, number, string, number]> = [
    [18, -3, M.goldChest, 270], [20, 1, M.goldHeap, 0], [16, 4, M.chest, 250], [12, -4, M.barrel, 0], [13, -4, M.barrel, 0], [10, 4, M.crate, 20], [21, -1, M.skullFlag, 270],
    [15, 0, M.mapTable, 90], [8, -4, M.goldPile, 30], [7, 4, M.bedroll, 0], [17, -2, M.goldPile, 0],
  ];
  for (const [dx, dz, model, yaw] of inside) k.propOn(model, cave.x0 + dx, LEVEL, Math.round(midZ) + dz, yaw);
  for (const dx of [8, 14, 19]) for (const dz of [-5, 5]) k.propOn(M.torch, cave.x0 + dx, LEVEL, Math.round(midZ) + dz, 0);
  // The mouth: torches, vines down the face, timber posts.
  for (const z of [cave.z0 - 1, cave.z1 + 1]) {
    k.propOn(M.torch, cave.x0 - 2, LEVEL, z, 0);
    for (let y = TOP; y <= TOP + 5; y++) k.put(cave.x0, y, z, b.log);
  }
  for (const dz of [-10, -4, 5, 11]) hangVines(k, cave.x0 - 1, LEVEL + 15, Math.round(midZ) + dz, 90);
  ctx.keepOut(cave.x0, cave.z0, cave.x1, cave.z1);
  ctx.landmark('hang-hai-tac', 'Hang hải tặc', cave.x0 - 8, Math.round(midZ));
  // The beach before it.
  for (const [x, z, model, yaw] of [[684, 690, M.skullFlag, 90], [676, 698, M.cannon, 90], [668, 700, M.cannon, 90], [690, 656, M.barrel, 0], [691, 657, M.crate, 30], [688, 684, M.crate, 10], [689, 685, M.barrel, 0], [660, 686, M.campfire, 0], [662, 684, M.logStack, 40], [694, 682, M.goldPile, 0]] as const) ctx.prop(model, x, z, yaw);
  // The jetty and the ship.
  const { x: jx, z0, z1 } = COVE_JETTY;
  for (let z = z0; z <= z1; z++) {
    for (let x = jx - 1; x <= jx + 1; x++) {
      k.put(x, LEVEL, z, b.planks);
      for (let y = TOP; y <= TOP + 2; y++) k.put(x, y, z, 0);
    }
    if ((z - z0) % 4 === 0) for (const x of [jx - 2, jx + 2]) piles(k, x, z, LEVEL);
  }
  k.propOn(M.torch, jx - 2, LEVEL, z1, 0);
  k.propOn(M.torch, jx + 2, LEVEL, z1, 0);
  k.propOn(M.barrel, jx + 1, LEVEL, z0 + 5, 0);
  k.propOn(M.crate, jx - 1, LEVEL, z0 + 9, 20);
  ctx.propAt(M.pirateShip, [jx - 6 + 0.5, FLOAT, z1 - 6 + 0.5], 270);
  ctx.propAt(M.rowboat, [jx + 4 + 0.5, FLOAT - 0.3, z1 - 6 + 0.5], 80);
  ctx.landmark('tau-hai-tac', 'Tàu hải tặc', jx, z0 - 3);
}

/**
 * The volcano (d-11) and the challenge court at its foot (d-10): its plume of smoke over the crater, a ledge
 * of dark rock to watch the lava from; the court a pit of lava walled in dark stone hung with glowing signs, a
 * fall of lava down its back wall, pillars to stand on with glyphs, torches and crystals on their heads.
 */
export function buildVolcano(k: IslandKit): void {
  const { ctx, b } = k;
  ctx.propAt(M.smoke, [VOLCANO.x + 0.5, VOLCANO.peak - 4, VOLCANO.z + 0.5], 0);
  // No tree takes root on the bare dark rock round the volcano.
  ctx.keepOut(VOLCANO.x - VOLCANO.r - 14, VOLCANO.z - VOLCANO.r - 14, VOLCANO.x + VOLCANO.r + 14, VOLCANO.z + VOLCANO.r + 14);
  ctx.keepOut(VOLCANO.x - VOLCANO.r, VOLCANO.z - VOLCANO.r, VOLCANO.x + VOLCANO.r, CHALLENGE.z0 - 4);
  // The ledge: a block of dark rock, its top four over the ground, steps up its south side.
  const ledgeTop = LEVEL + 4;
  for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) for (let y = LEVEL - 2; y <= ledgeTop - (Math.abs(dx) === 3 && Math.abs(dz) === 3 ? 1 : 0); y++) k.put(LEDGE.x + dx, y, LEDGE.z + dz, k.darkAt(LEDGE.x + dx, y, LEDGE.z + dz));
  for (let i = 1; i <= 4; i++) for (let dx = -1; dx <= 1; dx++) {
    const z = LEDGE.z + 3 + i;
    for (let y = LEVEL - 1; y <= ledgeTop - i; y++) k.put(LEDGE.x + dx, y, z, b.basalt);
    for (let y = ledgeTop - i + 1; y <= ledgeTop + 2; y++) k.put(LEDGE.x + dx, y, z, 0);
  }
  ctx.landmark('mom-nui-lua', 'Mỏm đá ngắm núi lửa', LEDGE.x, LEDGE.z, ledgeTop + 1);

  // The challenge court.
  const c = CHALLENGE;
  for (let x = c.x0; x <= c.x1; x++) {
    for (let z = c.z0; z <= c.z1; z++) {
      const wall = x === c.x1 || z === c.z0;
      const rim = x <= c.x0 + 1 || z >= c.z1 - 1;
      for (let y = LEVEL - 2; y < LEVEL; y++) k.put(x, y, z, b.basalt);
      for (let y = TOP; y <= TOP + 8; y++) k.put(x, y, z, 0);
      if (wall) {
        const h = 6 + Math.floor(roll(x, z, 72) * 2);
        for (let y = TOP; y <= TOP + h; y++) k.put(x, y, z, (y - TOP) % 4 === 2 && (x + z) % 5 === 0 ? b.crystal : k.darkAt(x, y, z));
        k.put(x, LEVEL, z, b.basalt);
      } else k.put(x, LEVEL, z, rim ? b.basalt : b.lava);
    }
  }
  // Lava falling down the back wall.
  for (const x of [c.x0 + 12, c.x0 + 13, c.x1 - 12]) for (let y = TOP; y <= TOP + 6; y++) k.put(x, y, c.z0 + 1, b.lava);
  // Pillars: dark stone, glowing glyphs on their faces, heads at different heights.
  for (let x = c.x0 + 5; x <= c.x1 - 4; x += 8) {
    for (let z = c.z0 + 6; z <= c.z1 - 5; z += 8) {
      const h = 2 + Math.floor(roll(x, z, 73) * 3);
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) for (let y = LEVEL; y <= LEVEL + h; y++) k.put(x + dx, y, z + dz, k.darkAt(x + dx, y, z + dz));
      // A glowing sign in the middle of each face under its head, the head paved.
      for (const [dx, dz] of [[0, -1], [0, 1], [-1, 0], [1, 0]] as const) if (h >= 2) k.put(x + dx, LEVEL + h - 1, z + dz, b.crystal);
      k.put(x, LEVEL + h, z, b.brick);
      const r = roll(x, z, 74);
      if (r < 0.3) k.propOn(M.crystalBlue, x, LEVEL + h, z, 0);
      else if (r < 0.55) k.propOn(M.torch, x, LEVEL + h, z, 0);
    }
  }
  // Glyph panels on the walls, torches on the rim, the way in at the south-west corner.
  for (let x = c.x0 + 6; x <= c.x1 - 6; x += 9) k.propOn(M.glyphPanel, x, LEVEL, c.z0 + 1, 0);
  for (let z = c.z0 + 6; z <= c.z1 - 6; z += 9) k.propOn(M.glyphPanel, c.x1 - 1, LEVEL, z, 90);
  for (const [x, z] of [[c.x0, c.z1], [c.x0, c.z0 + 4], [c.x1 - 4, c.z1]] as const) k.propOn(M.torch, x, LEVEL, z, 0);
  ctx.keepOut(c.x0, c.z0, c.x1, c.z1);
  ctx.landmark('khu-thu-thach', 'Khu thử thách dung nham', c.x0 - 3, c.z1 + 3);
}

/**
 * Causeways between the islands: the map's ways lay a plank deck where they cross the sea; this adds piles
 * along both sides every four blocks and a lantern every thirty.
 */
export function dressCauseways(k: IslandKit, routes: ReadonlyArray<readonly Point[]>): void {
  const { ctx } = k;
  for (const route of routes) {
    let walked = 0;
    for (let i = 0; i + 1 < route.length; i++) {
      const [ax = 0, az = 0] = route[i] ?? [];
      const [bx = 0, bz = 0] = route[i + 1] ?? [];
      const len = Math.hypot(bx - ax, bz - az);
      if (len === 0) continue;
      const [nx, nz] = [-(bz - az) / len, (bx - ax) / len];
      for (let d = 0; d < len; d += 1, walked++) {
        const [cx, cz] = [ax + ((bx - ax) * d) / len, az + ((bz - az) * d) / len];
        if (!ctx.inWater(Math.round(cx), Math.round(cz)) || inPool(Math.round(cx), Math.round(cz))) continue;
        if (walked % 4 !== 0) continue;
        for (const side of [-1, 1]) {
          const [x, z] = [Math.round(cx + nx * side * 2.2), Math.round(cz + nz * side * 2.2)];
          if (!ctx.inWater(x, z)) continue;
          for (let y = WATER - 3; y <= WATER + 2; y++) if (ctx.world.get(x, y, z) === 0 || ctx.world.get(x, y, z) === k.b.water) k.put(x, y, z, k.b.log);
          if (walked % 32 === 0 && side === 1) ctx.propAt(M.dockLantern, [x + 0.5, WATER + 3, z + 0.5], 0);
        }
      }
    }
  }
}

/** The islets: palms already line them; rocks, flowers, a fallen head or column, and the rock arch (d-03). */
export function buildIslets(k: IslandKit): void {
  const { ctx } = k;
  ISLETS.forEach((islet, i) => {
    for (let j = 0; j < Math.max(2, Math.round(islet.r / 4)); j++) {
      const a = roll(i, j, 75) * Math.PI * 2;
      const d = roll(j, i, 76) * islet.r * 0.6;
      const [x, z] = [Math.round(islet.x + Math.cos(a) * d), Math.round(islet.z + Math.sin(a) * d)];
      if (ctx.inWater(x, z) || ctx.keptOut(x, z)) continue;
      ctx.prop([M.rockLarge, M.bush, M.flowers[j % 4] ?? M.bush, M.rockSmall, M.fern][j % 5] ?? M.bush, x, z, j * 70);
    }
    if (i % 4 === 1 && islet.r > 12) ctx.prop(i % 8 === 1 ? M.stoneHead : M.columnBroken, islet.x, islet.z, i * 30);
  });
  // The rock arch on the islet south-east of the harbour.
  const arch = ISLETS.find((i) => i.x === 505 && i.z === 725);
  if (arch) {
    for (const dx of [-7, 5]) {
      for (let x = arch.x + dx; x <= arch.x + dx + 2; x++) {
        for (let z = arch.z - 1; z <= arch.z + 1; z++) for (let y = WATER - 1; y <= LEVEL + 13; y++) k.put(x, y, z, k.rockAt(x, y, z));
      }
    }
    for (let x = arch.x - 7; x <= arch.x + 7; x++) {
      const sag = Math.abs(x - arch.x) < 4 ? 0 : 1;
      for (let z = arch.z - 1; z <= arch.z + 1; z++) for (let y = LEVEL + 10 + sag; y <= LEVEL + 14; y++) k.put(x, y, z, k.rockAt(x, y, z));
      if (roll(x, arch.z, 77) < 0.6) k.put(x, LEVEL + 15, arch.z, k.b.leaves);
    }
    ctx.keepOut(arch.x - 8, arch.z - 2, arch.x + 8, arch.z + 2);
  }
  // Sea stacks and rocks off the shores.
  for (let gx = 20; gx < SIZE - 20; gx += 23) {
    for (let gz = 20; gz < SIZE - 20; gz += 23) {
      const [x, z] = [gx + Math.floor(roll(gx, gz, 78) * 12), gz + Math.floor(roll(gz, gx, 79) * 12)];
      const coast = coastDistance(x, z);
      if (isLand(x, z) || coast !== 0 || roll(x, z, 80) > 0.25) continue;
      let near = false;
      for (let r = 3; r <= 9 && !near; r += 3) near = isLand(x + r, z) || isLand(x - r, z) || isLand(x, z + r) || isLand(x, z - r);
      if (!near) continue;
      ctx.propAt(roll(x, z, 81) < 0.4 ? M.rockTall : M.rockBig, [x + 0.5, WATER - 1.5, z + 0.5], Math.floor(roll(x, z, 82) * 360));
    }
  }
}
