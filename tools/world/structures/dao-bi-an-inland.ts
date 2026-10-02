// The heart of "Đảo bí ẩn" after the owner's detail mock (designs/dao-bi-an/, 02/10/2026): the rock spires
// over the central mesa and its great fall between ruins with glowing doorways (d-01, d-05); the cave in from
// the mesa's north face (torches, a timber-propped tunnel, d-07) to its great hall with the lake, plank
// bridges and glowing crystals (d-08), and the treasure vault behind it (d-14); the ruins and the temple of
// the great crystal (d-06, d-09); the jungle's big trees, vines, its fall and the rope bridge between two
// platforms (d-04); the night forest of glowing mushrooms and crystals by its pool under the moon (d-13).
import { CAVE, FALLS, FALLS_POOL, HIGHLAND, JUNGLE_POOL, LEVEL, MESA, mesaHeight, NIGHT_POOL, TEMPLE, ZONES } from './dao-bi-an-land';
import { fallsSheet, hangVines, type IslandKit, M, roll } from './dao-bi-an-kit';
import { placeSkyBridge } from './buildings';
import { placeBigTree } from './forest-scene';
import { archway, castleRoom } from './lau-dai-castle';

const TOP = LEVEL + 1;
/** The height the mock's falls streaks are drawn for (content/world/models.json `kr-falls-streaks`, this map's size). */
export const STREAKS_HEIGHT = 19;

/** Streaks and foam over a fall's sheet seen from `dir` (+1: from the south), its lip at `lip`. */
function fallsDressing(k: IslandKit, x: number, faceZ: number, dir: 1 | -1, lip: number, offsets: readonly number[]): void {
  const sheetZ = faceZ + dir;
  const front = dir > 0 ? sheetZ + 1.01 : sheetZ - 0.01;
  for (const dx of offsets) k.ctx.propAt(M.fallsStreaks, [x + dx + 0.5, lip + 1 - STREAKS_HEIGHT, front], dir > 0 ? 180 : 0);
  k.ctx.propAt(M.fallsFoam, [x + 0.5, LEVEL - 1.1, sheetZ + dir * 2.5 + 0.5], dir > 0 ? 180 : 0);
}

/**
 * The central mountain (d-01): its top laid on past the terrain's cap, grey rock on every step of its sides,
 * grass, bushes and palms on its ledges, rock spires over its top; no ordinary trees hide its rock.
 */
export function buildMesa(k: IslandKit): void {
  const { ctx, b } = k;
  const trueTop = (x: number, z: number): number => Math.max(ctx.surface(x, z), LEVEL + mesaHeight(x, z));
  const [x0, x1, z0, z1] = [MESA.x - MESA.r - 60, MESA.x + MESA.r + 20, MESA.z - MESA.r - 10, FALLS.faceZ + 20];
  for (let x = x0; x <= x1; x++) {
    for (let z = z0; z <= z1; z++) {
      const top = trueTop(x, z);
      const s = ctx.surface(x, z);
      if (top < LEVEL + 3 || ctx.inWater(x, z) || ctx.onPath(x, z)) continue;
      const steep = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx = 0, dz = 0]) => Math.abs(trueTop(x + dx, z + dz) - top) >= 2);
      for (let y = Math.min(s, top) - 3; y < top; y++) k.put(x, y, z, k.rockAt(x, y, z));
      const r = roll(x, z, 2);
      k.put(x, top, z, steep || r < 0.45 ? k.rockAt(x, top, z) : r < 0.55 ? b.moss : b.grass);
      if (steep || top < LEVEL + 6) continue;
      if (r > 0.97) ctx.propAt(r > 0.985 ? M.palmTall : M.palmDetailed, [x + 0.5, top + 1, z + 0.5], Math.floor(r * 9000) % 360);
      else if (r > 0.88) {
        k.put(x, top + 1, z, b.leaves);
        if (r > 0.93) k.put(x, top + 2, z, b.leaves);
      } else if (r > 0.85) ctx.propAt(M.fern, [x + 0.5, top + 1, z + 0.5], Math.floor(r * 7000) % 360);
    }
  }
  const spires: ReadonlyArray<readonly [number, number, number, number]> = [
    [396, 352, 6, 47], [426, 372, 4, 46], [372, 344, 4, 45], [352, 328, 4, 40], [458, 338, 5, 44], [418, 328, 3, 45], [380, 392, 3, 41], [432, 400, 3, 39], [340, 352, 3, 36], [470, 360, 3, 38],
  ];
  for (const [cx, cz, r, peak] of spires) {
    for (let dx = -r - 1; dx <= r + 1; dx++) {
      for (let dz = -r - 1; dz <= r + 1; dz++) {
        const d = Math.hypot(dx, dz) + roll(cx + dx, cz + dz, 3) * 1.4;
        if (d > r) continue;
        const [x, z] = [cx + dx, cz + dz];
        const top = peak - Math.floor(d * 1.3) - (roll(x, z, 4) < 0.3 ? 1 : 0);
        for (let y = k.topAt(x, z) + 1; y < top; y++) k.put(x, y, z, k.rockAt(x, y, z));
        k.put(x, top, z, d < r - 1.5 ? b.grass : b.moss);
      }
    }
    ctx.propAt(roll(cx, cz, 5) < 0.5 ? M.palmTall : M.palmDetailed, [cx + 0.5, peak + 1, cz + 0.5], cx * 7);
  }
  ctx.keepOut(MESA.x - MESA.r, MESA.z - MESA.r, MESA.x + MESA.r, FALLS.faceZ);
  ctx.keepOut(308, 286, 500, 380);
}

/**
 * The great fall down the mesa's sheer south face into its pool (d-05): two ruined shrines built into the
 * face either side, their doorways and windows glowing blue, columns and old stones round the pool, a plank
 * platform out over the water where the child stands to look up at it.
 */
export function buildGreatFalls(k: IslandKit): void {
  const { ctx, b } = k;
  const lip = fallsSheet(k, FALLS.x, FALLS.faceZ, 1, 3, 14);
  fallsDressing(k, FALLS.x, FALLS.faceZ, 1, lip, [-1.5, 1.5]);
  for (const side of [-1, 1] as const) {
    const cx = FALLS.x + side * 14;
    const [x0, x1] = [cx - 6, cx + 6];
    const z0 = FALLS.faceZ + 1;
    const z1 = FALLS.faceZ + 4;
    for (let x = x0; x <= x1; x++) {
      const ragged = 25 + Math.floor(roll(x, z0, 8) * 3) - (Math.abs(x - cx) > 4 ? 2 : 0);
      for (let z = z0; z <= z1; z++) for (let y = LEVEL - 1; y <= ragged; y++) k.put(x, y, z, k.rockAt(x, y, z) === b.stone ? b.brick : k.rockAt(x, y, z));
      if (roll(x, z1, 9) < 0.5) k.put(x, ragged + 1, z0 + 1, b.leaves);
    }
    // Pillars before the face, the doorway between them glowing from inside, a glowing window above.
    for (const px of [x0 + 1, x1 - 1]) for (let y = LEVEL; y <= 22; y++) k.put(px, y, z1 + 1, y === 22 ? b.rock : b.brick);
    for (let x = cx - 1; x <= cx + 1; x++) {
      for (let y = TOP; y <= TOP + 4; y++) k.put(x, y, z1, 0);
      for (let y = TOP; y <= TOP + 4; y++) k.put(x, y, z1 - 1, b.crystal);
      k.put(x, TOP + 5, z1, b.brick);
    }
    for (let y = 19; y <= 21; y++) k.put(cx, y, z1, b.crystal);
    for (const dx of [-4, 4]) k.put(cx + dx, 17, z1, b.crystal);
    hangVines(k, x0 + 2, 25, z1 + 1, 0);
    hangVines(k, x1 - 3, 24, z1 + 1, 0);
    ctx.keepOut(x0, z0, x1, z1 + 2);
    // Old stones and columns along the pool's sides.
    k.propOn(M.columnBroken, cx + side * 3, LEVEL - 1, FALLS.faceZ + 9, 0);
    k.propOn(M.column, cx - side * 2, LEVEL - 1, FALLS.faceZ + 12, 0);
    k.propOn(M.glyphPanel, cx, LEVEL - 1, FALLS.faceZ + 7, 180);
    k.propOn(M.stoneHead, cx + side * 5, LEVEL, FALLS.faceZ + 17, side > 0 ? 250 : 110);
    k.propOn(M.monkey, cx + 2, 25 + 1, z0 + 1, 160);
  }
  // The platform out over the pool from its south bank.
  const pz1 = FALLS_POOL.z + FALLS_POOL.r + 1;
  for (let z = FALLS_POOL.z + 2; z <= pz1; z++) {
    for (let x = FALLS.x - 3; x <= FALLS.x + 3; x++) k.put(x, LEVEL, z, b.planks);
    if ((z - FALLS_POOL.z) % 3 === 0) for (const x of [FALLS.x - 4, FALLS.x + 4]) for (let y = LEVEL - 4; y <= TOP; y++) k.put(x, y, z, b.log);
  }
  for (let x = FALLS.x - 3; x <= FALLS.x + 3; x += 2) ctx.propAt(M.fence, [x + 0.5, TOP, FALLS_POOL.z + 1.5], 0);
  ctx.landmark('thac-nuoc', 'Thác nước giữa tàn tích', FALLS.x, pz1 + 4);
  ctx.landmark('be-thac', 'Bệ gỗ trước thác', FALLS.x, FALLS_POOL.z + 4, TOP);
}

/**
 * The cave (d-07, d-08, d-14): a rock face round its mouth with torches, a fenced way in and vines; a tunnel
 * propped with timber frames; the great hall domed out of the mesa, dark stone hung with stalactites, a lake
 * crossed by a plank bridge, crystals glowing blue and violet, lamps along the boardwalk; a passage on to the
 * vault of gold (stepped dais with the golden guardian, statues, heaps of coins, chests, a shaft of light).
 */
export function buildCave(k: IslandKit): void {
  const { ctx, b } = k;
  const { tunnel, hall, vault, mouthZ } = CAVE;
  const midX = (tunnel.x0 + tunnel.x1) / 2;
  // The rock face round the mouth.
  for (let x = midX - 18; x <= midX + 18; x++) {
    for (let z = mouthZ; z <= mouthZ + 16; z++) {
      const side = Math.max(0, Math.abs(x - midX) - 10);
      const top = 27 - side - Math.floor(roll(x, z, 11) * 2) - Math.max(0, mouthZ + 3 - z);
      for (let y = ctx.surface(x, z) + 1; y <= top; y++) k.put(x, y, z, k.rockAt(x, y, z));
      if (top > ctx.surface(x, z) && roll(x, z, 12) < 0.5) k.put(x, top + 1, z, b.leaves);
    }
  }
  // The tunnel: a trail floor, an arched top, timber frames every six blocks.
  const carve = (x0: number, x1: number, z0: number, z1: number, floor: number, ceil: number): void => {
    for (let x = x0; x <= x1; x++) {
      for (let z = z0; z <= z1; z++) {
        k.put(x, LEVEL, z, floor);
        const arch = x === x0 || x === x1 ? ceil - 1 : ceil;
        for (let y = TOP; y <= arch; y++) k.put(x, y, z, 0);
      }
    }
  };
  carve(tunnel.x0, tunnel.x1, mouthZ, hall.z0 + 3, b.trail, TOP + 5);
  carve(tunnel.x0 - 2, tunnel.x1 + 2, mouthZ, mouthZ + 3, b.trail, TOP + 7);
  for (let x = tunnel.x0 - 3; x <= tunnel.x1 + 3; x++) for (let y = TOP; y <= TOP + 8; y++) if (ctx.world.get(x, y, mouthZ + 4) !== 0) k.put(x, y, mouthZ + 4, k.caveAt(x, y, mouthZ + 4));
  for (let z = mouthZ + 2; z <= hall.z0; z += 6) {
    for (const x of [tunnel.x0, tunnel.x1]) for (let y = TOP; y <= TOP + 4; y++) k.put(x, y, z, b.log);
    for (let x = tunnel.x0; x <= tunnel.x1; x++) k.put(x, TOP + 5, z, b.planks);
    k.propOn(M.wallTorch, tunnel.x0 + 1, LEVEL + 3, z + 1, 90);
  }
  for (let x = tunnel.x0 - 2; x <= tunnel.x1 + 2; x++) for (let y = TOP + 8; y <= TOP + 9; y++) k.put(x, y, mouthZ, k.rockAt(x, y, mouthZ));
  // The torches, the fences and the vines of the mouth (d-07).
  for (const x of [tunnel.x0 - 2, tunnel.x1 + 2]) k.propOn(M.torch, x, LEVEL, mouthZ - 1, 0);
  for (let z = mouthZ - 14; z <= mouthZ - 3; z += 2) {
    ctx.prop(M.fence, tunnel.x0 - 3, z, 90);
    ctx.prop(M.fence, tunnel.x1 + 3, z, 90);
  }
  for (const dx of [-9, -5, 5, 9]) hangVines(k, midX + dx, 24 - Math.abs(dx) / 3, mouthZ - 1, 0);
  for (const dx of [-12, -8, 8, 12]) ctx.prop(M.fern, midX + dx, mouthZ - 2, dx * 13);
  ctx.keepOut(midX - 18, mouthZ - 16, midX + 18, mouthZ + 16);
  ctx.landmark('loi-vao-hang', 'Lối vào hang động', midX, mouthZ - 10);

  // The great hall: a dome under the mesa, never closer than three blocks to its top.
  const [cx, cz] = [(hall.x0 + hall.x1) / 2, (hall.z0 + hall.z1) / 2];
  const [hx, hz] = [(hall.x1 - hall.x0) / 2, (hall.z1 - hall.z0) / 2];
  const inHall = (x: number, z: number): number => ((x - cx) / hx) ** 2 + ((z - cz) / hz) ** 2 + roll(x, z, 13) * 0.06;
  const ceilAt = new Map<string, number>();
  for (let x = hall.x0; x <= hall.x1; x++) {
    for (let z = hall.z0; z <= hall.z1; z++) {
      const e = inHall(x, z);
      if (e > 1) continue;
      const ceil = Math.min(TOP + Math.round(13 * Math.sqrt(1 - e)) + 2, ctx.surface(x, z) - 3);
      k.put(x, LEVEL, z, k.caveAt(x, LEVEL, z));
      for (let y = TOP; y <= ceil; y++) k.put(x, y, z, 0);
      ceilAt.set(`${x},${z}`, ceil);
    }
  }
  // Its walls and roof of dark stone, stalactites hanging and crystals growing out of the rock.
  for (let x = hall.x0 - 1; x <= hall.x1 + 1; x++) {
    for (let z = hall.z0 - 1; z <= hall.z1 + 1; z++) {
      for (let y = TOP; y <= TOP + 16; y++) {
        if (ctx.world.get(x, y, z) === 0) continue;
        const open = [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, -1, 0]].some(([dx = 0, dy = 0, dz = 0]) => ceilAt.has(`${x + dx},${z + dz}`) && y + dy >= TOP && y + dy <= (ceilAt.get(`${x + dx},${z + dz}`) ?? 0) && ctx.world.get(x + dx, y + dy, z + dz) === 0);
        if (open) k.put(x, y, z, roll(x * 5 + y, z, 14) < 0.008 ? b.crystal : k.caveAt(x, y, z));
      }
    }
  }
  for (const [key, ceil] of ceilAt) {
    const [x = 0, z = 0] = key.split(',').map(Number);
    if ((x + z) % 3 !== 0 || roll(x, z, 15) > 0.3 || ceil < TOP + 7) continue;
    const length = 1 + Math.floor(roll(x, z, 16) * 4);
    for (let y = ceil; y > ceil - length; y--) k.put(x, y, z, k.caveAt(x, y, z));
  }
  // The lake in the hall's east, the plank bridge over it.
  const lake = { x: cx + 13, z: cz + 4, rx: 11, rz: 9 };
  for (let x = lake.x - lake.rx; x <= lake.x + lake.rx; x++) {
    for (let z = lake.z - lake.rz; z <= lake.z + lake.rz; z++) {
      if (((x - lake.x) / lake.rx) ** 2 + ((z - lake.z) / lake.rz) ** 2 > 1 || !ceilAt.has(`${x},${z}`)) continue;
      // Shallow: a child who steps in wades out a block up from anywhere on its shore.
      k.put(x, LEVEL - 1, z, b.stone);
      k.put(x, LEVEL, z, b.water);
    }
  }
  const bridgeZ = Math.round(lake.z);
  for (let x = Math.round(cx) + 1; x <= lake.x + lake.rx + 1; x++) {
    for (let z = bridgeZ - 1; z <= bridgeZ + 1; z++) if (ceilAt.has(`${x},${z}`)) k.put(x, LEVEL, z, b.planks);
    if (x % 4 === 0) for (const z of [bridgeZ - 2, bridgeZ + 2]) if (ceilAt.has(`${x},${z}`)) for (let y = LEVEL - 3; y <= TOP; y++) k.put(x, y, z, b.log);
  }
  // The boardwalk from the tunnel to the vault's passage, its lamps.
  for (let z = hall.z0; z <= hall.z1; z++) for (let x = tunnel.x0 + 1; x <= tunnel.x1 - 1; x++) if (ceilAt.has(`${x},${z}`)) k.put(x, LEVEL, z, b.planks);
  for (let z = hall.z0 + 3; z <= hall.z1 - 2; z += 6) {
    const x = Math.floor(z / 6) % 2 === 0 ? tunnel.x0 : tunnel.x1;
    if (ceilAt.has(`${x},${z}`)) k.propOn(M.dockLantern, x, LEVEL, z, x < midX ? 180 : 0);
  }
  for (let x = Math.round(cx) + 4; x <= lake.x + lake.rx; x += 6) if (ceilAt.has(`${x},${bridgeZ - 1}`)) k.propOn(M.torch, x, LEVEL, bridgeZ - 1, 0);
  // Crystals among the rocks, blue and violet (d-08), a few clusters of blocks by the walls.
  for (const [key] of ceilAt) {
    const [x = 0, z = 0] = key.split(',').map(Number);
    const e = inHall(x, z);
    const r = roll(x, z, 18);
    if (e > 0.5 && e < 0.92 && r < 0.05) k.propOn(r < 0.015 ? M.crystalPurple : M.crystalBlue, x, LEVEL, z, Math.floor(r * 9000) % 360);
    else if (e >= 0.92 && r < 0.12) for (let y = TOP; y < TOP + 1 + Math.floor(roll(x, z, 19) * 3); y++) k.put(x, y, z, b.crystal);
  }
  for (const [x, z] of [[cx - 10, cz - 8], [cx - 14, cz + 6], [lake.x + 2, lake.z - 9]] as const) k.propOn(M.crystalBlue, Math.round(x), LEVEL, Math.round(z), 30);
  ctx.landmark('trong-hang', 'Hồ trong hang', Math.round(cx), Math.round(cz) - 6, TOP);

  // The passage to the vault.
  carve(tunnel.x0, tunnel.x1, hall.z1 - 2, vault.z0, b.cobble, TOP + 5);
  for (const x of [tunnel.x0, tunnel.x1]) for (let y = TOP; y <= TOP + 4; y++) k.put(x, y, vault.z0 - 4, b.cobble);
  // The vault: warm stone walls with pillars and lamps, a paved floor, the dais at its far end.
  for (let x = vault.x0 - 1; x <= vault.x1 + 1; x++) {
    for (let z = vault.z0 - 1; z <= vault.z1 + 1; z++) {
      const wall = x < vault.x0 || x > vault.x1 || z < vault.z0 || z > vault.z1;
      for (let y = LEVEL; y <= TOP + 9; y++) {
        if (wall) {
          if (ctx.world.get(x, y, z) !== 0 || y === LEVEL) k.put(x, y, z, y % 4 === 0 && (x + z) % 6 === 0 ? b.lantern : (x * 3 + y + z) % 7 === 0 ? b.brick : b.cobble);
        } else if (y === LEVEL) k.put(x, y, z, roll(x, z, 22) < 0.14 ? b.lantern : (x + z) % 2 === 0 ? b.paver : b.cobble);
        else if (y === TOP + 9) k.put(x, y, z, (x + z) % 5 === 0 ? b.lantern : b.cobble);
        else k.put(x, y, z, 0);
      }
    }
  }
  for (let x = tunnel.x0 + 1; x <= tunnel.x1 - 1; x++) for (let y = TOP; y <= TOP + 4; y++) k.put(x, y, vault.z0 - 1, 0);
  for (const x of [vault.x0 + 2, vault.x1 - 2]) {
    for (let z = vault.z0 + 3; z <= vault.z1 - 4; z += 6) {
      for (let y = TOP; y <= TOP + 8; y++) for (const dx of [0, 1]) k.put(x + dx - (x > cx ? 1 : 0), y, z, y === TOP + 4 ? b.lantern : b.cobble);
      // Torches, gold and crystals of the vault stand on glowing tiles, like its heaps of coins.
      k.put(x + (x > cx ? -2 : 2), LEVEL, z, b.lantern);
      k.propOn(M.torch, x + (x > cx ? -2 : 2), LEVEL, z, 0);
    }
  }
  const midVault = Math.round((vault.x0 + vault.x1) / 2);
  for (let step = 0; step < 3; step++) for (let x = midVault - 8 + step * 2; x <= midVault + 8 - step * 2; x++) for (let z = vault.z1 - 7 + step * 2; z <= vault.z1; z++) k.put(x, TOP + step, z, step === 2 ? b.paver : b.cobble);
  k.propOn(M.goldStatue, midVault, TOP + 2, vault.z1 - 2, 180);
  k.propOn(M.lightShaft, midVault, TOP + 2, vault.z1 - 2, 0);
  for (const dx of [-6, 6]) k.propOn(M.goldStatue, midVault + dx, TOP + 1, vault.z1 - 3, 180);
  for (const dx of [-4, 4]) k.propOn(M.torch, midVault + dx, TOP + 2, vault.z1 - 1, 0);
  const heaps: ReadonlyArray<readonly [number, number, string, number]> = [
    [-11, 4, M.goldHeap, 20], [11, 4, M.goldHeap, 200], [-12, 11, M.goldHeap, 90], [12, 12, M.goldHeap, 270], [-9, 17, M.goldPile, 0], [9, 17, M.goldPile, 40],
    [-6, 8, M.goldPile, 10], [6, 8, M.goldPile, 300], [-8, 2, M.goldChest, 150], [8, 2, M.goldChest, 210], [-12, 19, M.goldChest, 120], [12, 19, M.goldChest, 240],
    [-3, 14, M.goldPile, 60], [4, 15, M.goldPile, 120], [-10, 22, M.goldPile, 30], [10, 22, M.goldPile, 80], [-4, 21, M.goldChest, 160], [4, 21, M.goldChest, 200],
  ];
  for (const [dx, dz, model, yaw] of heaps) {
    k.put(midVault + dx, LEVEL, vault.z0 + dz, b.lantern);
    k.propOn(model, midVault + dx, LEVEL, vault.z0 + dz, yaw);
  }
  // Chests and heaps along both walls.
  for (let z = vault.z0 + 2; z <= vault.z1 - 9; z += 3) {
    for (const x of [vault.x0 + 1, vault.x1 - 1]) {
      k.put(x, LEVEL, z, b.lantern);
      k.propOn(roll(x, z, 23) < 0.5 ? M.goldHeap : M.goldChest, x, LEVEL, z, x < midVault ? 90 : 270);
    }
  }
  // Coins strewn over the floor either side of the walk to the dais.
  for (let x = vault.x0 + 1; x <= vault.x1 - 1; x += 2) {
    for (let z = vault.z0 + 2; z <= vault.z1 - 9; z += 2) {
      if (Math.abs(x - midVault) <= 2 || roll(x, z, 20) > 0.3 || heaps.some(([dx, dz]) => Math.abs(midVault + dx - x) < 2 && Math.abs(vault.z0 + dz - z) < 2)) continue;
      k.put(x, LEVEL, z, b.lantern);
      k.propOn(M.goldPile, x, LEVEL, z, Math.floor(roll(z, x, 21) * 360));
    }
  }
  for (const [dx, dz] of [[-13, 7], [13, 7], [-13, 15], [13, 15]] as const) {
    k.put(midVault + dx, LEVEL, vault.z0 + dz, b.lantern);
    k.propOn(M.crystalPurple, midVault + dx, LEVEL, vault.z0 + dz, dx * 11);
  }
  ctx.landmark('kho-bau', 'Kho báu bí mật', midVault, vault.z0 + 4, TOP);
  ctx.keepOut(hall.x0, hall.z0, vault.x1, vault.z1);
  // Over the way through the cave (tunnel, boardwalk, passage) the mountain's top is bare stone and moss,
  // never the grey of a paved way, so the walk inside reads as the island's way under it.
  for (let x = tunnel.x0 - 1; x <= tunnel.x1 + 1; x++) {
    for (let z = mouthZ; z <= vault.z0; z++) {
      const y = k.topAt(x, z);
      if (y > TOP + 5 && ctx.world.get(x, y, z) === b.rock) k.put(x, y, z, roll(x, z, 27) < 0.65 ? b.stone : b.moss);
    }
  }
}

/** Moss and old paving over a zone's floor: pavers, mossy stone and grass mixed (the ruins, d-06). */
export function paveRuins(k: IslandKit, chapter: number): void {
  const { ctx, b } = k;
  const zn = ZONES.find((z) => z.chapter === chapter);
  if (!zn) return;
  for (let x = zn.x - zn.hx; x <= zn.x + zn.hx; x++) {
    for (let z = zn.z - zn.hz; z <= zn.z + zn.hz; z++) {
      if (ctx.onPath(x, z) || ctx.inWater(x, z) || ctx.keptOut(x, z)) continue;
      const avenue = Math.abs(x - zn.x) <= 4;
      const r = roll(x, z, 21);
      if (avenue) k.put(x, LEVEL, z, r < 0.12 ? b.moss : b.paver);
      else if (r < 0.32) k.put(x, LEVEL, z, r < 0.08 ? b.moss : b.paver);
    }
  }
}

/** A ruined tower of the old island people, hollow, its top broken, windows glowing blue (d-01, d-06). */
function ruinTower(k: IslandKit, cx: number, cz: number, height: number, doorToward: 'north' | 'south' | 'east' | 'west'): void {
  const { ctx, b } = k;
  const r = 3;
  for (let dx = -r; dx <= r; dx++) {
    for (let dz = -r; dz <= r; dz++) {
      const [x, z] = [cx + dx, cz + dz];
      const wall = Math.abs(dx) === r || Math.abs(dz) === r;
      const top = LEVEL + height - (wall ? Math.floor(roll(x, z, 22) * 5) : 0);
      for (let y = LEVEL - 2; y <= LEVEL; y++) k.put(x, y, z, b.brick);
      for (let y = TOP; y <= top; y++) {
        if (!wall) {
          k.put(x, y, z, 0);
          continue;
        }
        const window = (y - TOP) % 6 === 4 && (dx === 0 || dz === 0);
        k.put(x, y, z, window ? b.crystal : (y + x + z) % 5 === 0 ? b.moss : b.brick);
      }
      if (wall && roll(x, z, 23) < 0.35) k.put(x, top + 1, z, b.leaves);
    }
  }
  const door: Record<typeof doorToward, [number, number]> = { north: [0, -r], south: [0, r], east: [r, 0], west: [-r, 0] };
  const [ddx, ddz] = door[doorToward];
  for (let y = TOP; y <= TOP + 2; y++) for (const s of [-1, 0, 1]) k.put(cx + ddx + (ddz !== 0 ? s : 0), y, cz + ddz + (ddx !== 0 ? s : 0), 0);
  hangVines(k, cx + ddx * 1.4, LEVEL + height - 2, cz + ddz * 1.4, 0);
  ctx.propAt(M.monkey, [cx + r + 0.5, LEVEL + height - 3, cz + 0.5], 90);
  ctx.keepOut(cx - r - 1, cz - r - 1, cx + r + 1, cz + r + 1);
}

/**
 * The ruins and the temple (d-06, d-09): the temple raised on a foundation, its gate of glowing signs over
 * the steps, inside rows of mossy pillars with torches, a stepped dais at the back with the great crystal on
 * its pedestal, glowing runes on the wall behind; towers, columns and old heads round the paved zone.
 */
export function buildTemple(k: IslandKit): void {
  const { ctx, b } = k;
  const t = TEMPLE;
  const mid = Math.round((t.x0 + t.x1) / 2);
  const floorY = LEVEL + 2;
  k.fill(t.x0, LEVEL - 2, t.z0, t.x1, floorY - 1, t.z1, b.brick);
  castleRoom(ctx.world, t, floorY + 1, 15, { wall: b.brick, plinth: b.rock, floor: b.rock, ceiling: b.brick, beam: b.basalt });
  // Old stone: the walls weathered dark and mossy, the floor in dark and grey flags.
  for (let x = t.x0; x <= t.x1; x++) {
    for (let z = t.z0; z <= t.z1; z++) {
      const edge = x === t.x0 || x === t.x1 || z === t.z0 || z === t.z1;
      if (!edge) {
        k.put(x, floorY, z, (x + z) % 2 === 0 ? b.basalt : b.rock);
        continue;
      }
      for (let y = floorY + 2; y <= floorY + 15; y++) {
        const r = roll(x * 7 + y, z, 39);
        if (r < 0.25) k.put(x, y, z, b.basalt);
        else if (r < 0.37) k.put(x, y, z, b.moss);
      }
    }
  }
  // A stepped roof, ragged with moss and leaves.
  const roofY = floorY + 16;
  for (let tier = 1; tier <= 3; tier++) {
    for (let x = t.x0 + tier * 3; x <= t.x1 - tier * 3; x++) {
      for (let z = t.z0 + tier * 3; z <= t.z1 - tier * 3; z++) {
        if (roll(x, z, 24) < 0.08 && tier > 1) continue;
        k.put(x, roofY + tier - 1, z, roll(x, z, 25) < 0.18 ? b.moss : b.brick);
        if (roll(x, z, 26) < 0.05) k.put(x, roofY + tier, z, b.leaves);
      }
    }
  }
  // The door and the steps up to it; the gate of glowing signs over them (d-06).
  archway(ctx.world, 'x', t.z1, mid - 3, mid + 3, floorY + 1, 8);
  // The doorway's sill paved level with the floor, and the ground from the steps through the gate to the avenue.
  for (let x = mid - 3; x <= mid + 3; x++) k.put(x, floorY, t.z1, b.rock);
  k.fill(mid - 4, LEVEL, t.z1 + 3, mid + 4, LEVEL, t.z1 + 5, b.paver);
  for (let x = mid - 6; x <= mid + 6; x++) {
    k.fill(x, LEVEL, t.z1 + 1, x, floorY, t.z1 + 1, b.rock);
    k.fill(x, LEVEL, t.z1 + 2, x, floorY - 1, t.z1 + 2, b.rock);
  }
  const gz = t.z1 + 3;
  for (const px of [mid - 7, mid + 5]) {
    for (let x = px; x <= px + 2; x++) {
      for (let z = gz; z <= gz + 2; z++) for (let y = LEVEL - 1; y <= LEVEL + 12; y++) k.put(x, y, z, (y - LEVEL) % 4 === 3 && z === gz + 2 && x === px + 1 ? b.crystal : k.rockAt(x, y, z) === b.moss ? b.moss : b.brick);
    }
  }
  for (let x = mid - 8; x <= mid + 8; x++) for (let z = gz; z <= gz + 2; z++) for (let y = LEVEL + 10; y <= LEVEL + 12; y++) k.put(x, y, z, b.brick);
  for (let x = mid - 3; x <= mid + 3; x++) k.put(x, LEVEL + 11, gz + 2, x % 2 === 0 ? b.crystal : b.brick);
  k.put(mid, LEVEL + 13, gz + 1, b.crystal);
  // A frame of glowing runes round the doorway (the mock's glowing door).
  for (let y = floorY + 1; y <= floorY + 9; y++) for (const x of [mid - 4, mid + 4]) k.put(x, y, t.z1, y % 2 === 0 ? b.crystal : b.basalt);
  for (let x = mid - 4; x <= mid + 4; x++) k.put(x, floorY + 9, t.z1, x % 2 === 0 ? b.crystal : b.basalt);
  k.put(mid, floorY + 11, t.z1, b.crystal);
  k.put(mid - 1, floorY + 10, t.z1, b.crystal);
  k.put(mid + 1, floorY + 10, t.z1, b.crystal);
  for (const dx of [-5, 5]) k.propOn(M.torch, mid + dx, LEVEL, gz + 4, 0);
  for (const dx of [-9, 9]) k.propOn(M.glyphPanel, mid + dx, LEVEL, gz + 3, 180);
  hangVines(k, mid - 6, LEVEL + 12, gz + 3, 0);
  hangVines(k, mid + 6, LEVEL + 12, gz + 3, 0);
  ctx.keepOut(mid - 8, gz, mid + 8, gz + 2);
  // Inside: pillars with torches, the dais and the great crystal (d-09).
  for (const px of [t.x0 + 8, t.x1 - 10]) {
    for (let z = t.z0 + 8; z <= t.z1 - 6; z += 8) {
      for (let x = px; x <= px + 2; x++) for (let dz = 0; dz <= 2; dz++) for (let y = floorY + 1; y <= floorY + 14; y++) k.put(x, y, z + dz, y === floorY + 5 && dz === 1 ? b.lantern : roll(x, y + z, 29) < 0.15 ? b.moss : roll(x, y + z, 30) < 0.3 ? b.basalt : b.brick);
      k.propOn(M.torch, px + (px < mid ? 3 : -1), floorY, z + 1, 0);
    }
  }
  for (let step = 0; step < 3; step++) {
    for (let x = mid - 9 + step * 2; x <= mid + 9 - step * 2; x++) for (let z = t.z0 + 1; z <= t.z0 + 11 - step * 3; z++) k.put(x, floorY + 1 + step, z, step === 2 ? b.paver : b.rock);
  }
  const pedestal = { x: mid, z: t.z0 + 4 };
  k.fill(pedestal.x - 1, floorY + 4, pedestal.z - 1, pedestal.x + 1, floorY + 4, pedestal.z + 1, b.brick);
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) k.put(pedestal.x + dx, floorY + 4, pedestal.z + dz, b.crystal);
  k.propOn(M.bigCrystal, pedestal.x, floorY + 4, pedestal.z, 0);
  for (const dx of [-7, -4, 4, 7]) k.propOn(M.crystalBlue, mid + dx, floorY + 1 + (Math.abs(dx) > 5 ? 0 : 1), t.z0 + 9, dx * 20);
  // A ring of glowing runes on the wall behind the crystal, a glowing arch over the dais.
  for (let a = 0; a < 32; a++) {
    const t2 = (a / 32) * Math.PI * 2;
    k.put(mid + Math.round(Math.cos(t2) * 6), floorY + 10 + Math.round(Math.sin(t2) * 4), t.z0, b.crystal);
  }
  for (const dx of [-8, 8]) for (let y = floorY + 4; y <= floorY + 10; y++) k.put(mid + dx, y, t.z0 + 1, y % 2 === 0 ? b.crystal : b.brick);
  for (const z of [t.z0 + 14, t.z0 + 26, t.z0 + 38]) {
    k.propOn(M.glyphPanel, t.x0 + 1, floorY, z, 270);
    k.propOn(M.glyphPanel, t.x1 - 1, floorY, z, 90);
  }
  // The front: pilasters of stone, moss and leaves down it, palms and torches either side of the gate.
  for (let x = t.x0; x <= t.x1; x += 6) {
    if (Math.abs(x - mid) < 9) continue;
    for (let y = LEVEL; y <= roofY; y++) for (const dz of [1, 2]) k.put(x, y, t.z1 + dz, dz === 2 && y > roofY - 3 ? b.moss : b.rock);
    if (roll(x, t.z1, 30) < 0.6) hangVines(k, x + 1, roofY - 1, t.z1 + 1, 0);
  }
  // Palms either side of the gate, each in a bed of earth the paving keeps clear of.
  for (const dx of [-14, 14, -22, 22]) {
    const [x, z] = [mid + dx, t.z1 + 6];
    k.fill(x - 1, LEVEL, z - 1, x + 1, LEVEL, z + 1, b.grass);
    ctx.keepOut(x - 1, z - 1, x + 1, z + 1);
    ctx.prop(Math.abs(dx) > 18 ? M.palmTall : M.palmDetailed, x, z, dx * 9);
  }
  for (const dx of [-12, 12]) ctx.prop(M.bush, mid + dx, t.z1 + 4, 0);
  ctx.keepOut(t.x0 - 1, t.z0 - 1, t.x1 + 1, t.z1 + 2);
  ctx.landmark('den-tho', 'Đền thờ bí ẩn', mid, t.z0 + 22, floorY + 1);
  ctx.landmark('cong-di-tich', 'Cổng di tích cổ', mid, t.z1 + 14);

  // Towers, columns and stones round the ruins zone.
  ruinTower(k, 530, 352, 20, 'east');
  ruinTower(k, 636, 352, 17, 'west');
  ruinTower(k, 548, 468, 18, 'north');
  ruinTower(k, 634, 468, 15, 'north');
  for (let z = t.z1 + 12; z <= t.z1 + 72; z += 10) {
    for (const dx of [-8, 8]) k.ctx.prop(roll(mid + dx, z, 30) < 0.35 ? M.columnBroken : M.column, mid + dx, z, 0);
  }
  for (const [x, z, model, yaw] of [[550, 380, M.stoneHead, 70], [640, 400, M.stoneHead, 250], [560, 440, M.obelisk, 0], [628, 380, M.obelisk, 0], [570, 404, M.glyphPanel, 120], [620, 430, M.glyphPanel, 220]] as const) {
    ctx.prop(model, x, z, yaw);
  }
  // Low broken walls along the zone's edges.
  const walls: ReadonlyArray<readonly [number, number, number, number]> = [[540, 368, 556, 368], [628, 368, 646, 368], [540, 452, 552, 452], [634, 452, 646, 452], [538, 380, 538, 396], [646, 410, 646, 426]];
  for (const [x0, z0, x1, z1] of walls) {
    for (let x = x0; x <= x1; x++) {
      for (let z = z0; z <= z1; z++) {
        const h = 1 + Math.floor(roll(x, z, 31) * 3);
        if (roll(x, z, 32) < 0.15) continue;
        for (let y = TOP; y < TOP + h; y++) k.put(x, y, z, (x + y) % 3 === 0 ? b.moss : b.brick);
      }
    }
    ctx.keepOut(x0, z0, x1, z1);
  }
}

/** A plank platform `size` across at `deckY` on four log posts with a rail, a lamp on one post (d-04). */
function treePlatform(k: IslandKit, x0: number, z0: number, size: number, deckY: number): void {
  const { b } = k;
  const [x1, z1] = [x0 + size - 1, z0 + size - 1];
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) k.put(x, deckY, z, b.planks);
  for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]] as const) for (let y = k.ctx.surface(x, z) + 1; y <= deckY + 3; y++) if (y !== deckY) k.put(x, y, z, b.log);
  k.put(x0, deckY + 4, z0, b.lantern);
  for (let x = x0 + 1; x < x1; x += 2) {
    k.ctx.propAt(M.fence, [x + 0.5, deckY + 1, z0 + 0.5], 0);
    k.ctx.propAt(M.fence, [x + 0.5, deckY + 1, z1 + 0.5], 0);
  }
}

/** A stair of planks from a platform's edge down to the ground along +z (`x0`..`x1` wide), on log stilts. */
function stairDown(k: IslandKit, x0: number, x1: number, zTop: number, deckY: number): void {
  for (let i = 1; deckY - i >= LEVEL; i++) {
    const z = zTop + i;
    for (let x = x0; x <= x1; x++) {
      k.put(x, deckY - i, z, k.b.planks);
      for (let y = deckY - i + 1; y <= deckY - i + 3; y++) k.put(x, y, z, 0);
      if (i % 3 === 0 && (x === x0 || x === x1)) for (let y = k.ctx.surface(x, z) + 1; y < deckY - i; y++) k.put(x, y, z, k.b.log);
    }
  }
}

/**
 * The jungle round its zone (d-04): big trees with hanging vines and monkeys in their crowns, ferns and
 * flowers under them, the highland's fall into its pool and the rope bridge across in front of it between two
 * plank platforms in the trees, each with a stair down.
 */
export function buildJungle(k: IslandKit): void {
  const { ctx, b } = k;
  const deckY = LEVEL + 8;
  const bridgeZ = JUNGLE_POOL.z - 6;
  const lip = fallsSheet(k, JUNGLE_POOL.x, HIGHLAND.z1, 1, 2, 10);
  fallsDressing(k, JUNGLE_POOL.x, HIGHLAND.z1, 1, lip, [0]);
  const west = JUNGLE_POOL.x - 22;
  const east = JUNGLE_POOL.x + 16;
  treePlatform(k, west, bridgeZ - 3, 7, deckY);
  treePlatform(k, east, bridgeZ - 3, 7, deckY);
  placeSkyBridge(ctx.world, [west + 7, deckY, bridgeZ], [east - 1, deckY, bridgeZ], { planks: b.planks, log: b.log }, () => false);
  stairDown(k, west + 2, west + 4, bridgeZ + 3, deckY);
  stairDown(k, east + 2, east + 4, bridgeZ + 3, deckY);
  ctx.keepOut(west - 1, bridgeZ - 4, east + 8, bridgeZ + 12);
  for (const x of [west + 1, east + 5]) {
    const [z, y] = [bridgeZ - 7, ctx.surface(x, bridgeZ - 7) + 1];
    // Its roots in earth, not on the rock of the highland's foot.
    k.fill(x, y - 1, z, x + 1, y - 1, z + 1, b.grass);
    placeBigTree(ctx.world, x, y, z, 15, { log: b.log, leaves: b.leaves });
  }
  ctx.landmark('cau-treo', 'Cầu treo gỗ', JUNGLE_POOL.x, bridgeZ, deckY + 1);
  ctx.landmark('thac-rung', 'Thác nước trong rừng', JUNGLE_POOL.x - 4, JUNGLE_POOL.z + JUNGLE_POOL.r + 6);
  for (let i = 0; i < 6; i++) ctx.propAt(M.lily, [JUNGLE_POOL.x - 5 + i * 2 + 0.5, LEVEL - 1 + 0.05, JUNGLE_POOL.z + (i % 3) * 2 - 1 + 0.5], i * 40);
  jungleTrees(k, { x0: 140, z0: 326, x1: 300, z1: 500 }, 8, 0.55);
}

/** Big trees and undergrowth over an area, clear of the zones, the paths, the water and what was built. */
function jungleTrees(k: IslandKit, area: { x0: number; z0: number; x1: number; z1: number }, spacing: number, chance: number, leaves?: number): void {
  const { ctx, b } = k;
  for (let gx = area.x0; gx <= area.x1; gx += spacing) {
    for (let gz = area.z0; gz <= area.z1; gz += spacing) {
      const x = gx + Math.floor(roll(gx, gz, 33) * (spacing - 3));
      const z = gz + Math.floor(roll(gz, gx, 34) * (spacing - 3));
      const y = ctx.surface(x, z);
      const clear = !ctx.inZone(x, z, 4) && !ctx.nearPath(x, z, 5) && !ctx.inWater(x, z) && !ctx.inWater(x + 4, z) && !ctx.inWater(x - 4, z) && !ctx.keptOut(x, z, 4) && Math.abs(y - LEVEL) <= 2 && ctx.world.get(x, y + 1, z) === 0;
      if (!clear) continue;
      if (roll(x, z, 35) < chance) {
        const height = 12 + Math.floor(roll(x, z, 36) * 6);
        placeBigTree(ctx.world, x, y + 1, z, height, { log: b.log, leaves: leaves ?? b.leaves });
        const top = y + 1 + height;
        hangVines(k, x - 2, top - 3, z + 1, 0);
        hangVines(k, x + 3, top - 3, z, 90);
        if (roll(x, z, 37) < 0.25) ctx.propAt(M.monkey, [x + 0.5, top + 4, z + 0.5], Math.floor(roll(x, z, 38) * 360));
        ctx.keepOut(x - 1, z - 1, x + 2, z + 2);
      }
      for (let i = 0; i < 7; i++) {
        const [ux, uz] = [x + Math.floor(roll(x, z, 40 + i) * 7) - 3, z + Math.floor(roll(z, x, 44 + i) * 7) - 3];
        if (i >= 5) {
          // Clumps of leaves among the ferns, now and then in blossom (d-04).
          const gy = ctx.surface(ux, uz);
          if (!ctx.inWater(ux, uz) && !ctx.onPath(ux, uz) && !ctx.keptOut(ux, uz) && !ctx.inZone(ux, uz, 1) && ctx.world.get(ux, gy + 1, uz) === 0) k.put(ux, gy + 1, uz, roll(ux, uz, 47) < 0.2 ? ctx.block('leaves-pink') : b.leaves);
          continue;
        }
        if (ctx.inWater(ux, uz) || ctx.onPath(ux, uz) || ctx.keptOut(ux, uz) || ctx.inZone(ux, uz, 1) || ctx.world.get(ux, ctx.surface(ux, uz) + 1, uz) !== 0) continue;
        const pick = [M.fern, M.bush, M.fern, M.grass, M.flowers[i % 4] ?? M.fern][i + (Math.floor(roll(ux, uz, 48) * 2))] ?? M.fern;
        ctx.prop(pick, ux, uz, Math.floor(roll(ux, uz, 49) * 360));
      }
    }
  }
}

/**
 * The night forest by its pool under the highland's north fall (d-13): dark trees, mushrooms and crystals
 * glowing blue and violet, fireflies over the water, a boardwalk with lamps out to the pool, the moon over it.
 */
export function buildNightForest(k: IslandKit): void {
  const { ctx, b } = k;
  const lip = fallsSheet(k, NIGHT_POOL.x, HIGHLAND.z0, -1, 2, 10);
  fallsDressing(k, NIGHT_POOL.x, HIGHLAND.z0, -1, lip, [0]);
  const walkZ0 = NIGHT_POOL.z - NIGHT_POOL.r - 12;
  for (let z = walkZ0; z <= NIGHT_POOL.z - 2; z++) {
    for (let x = NIGHT_POOL.x - 2; x <= NIGHT_POOL.x + 2; x++) k.put(x, LEVEL, z, b.planks);
    if ((z - walkZ0) % 4 === 0) {
      for (const x of [NIGHT_POOL.x - 3, NIGHT_POOL.x + 3]) {
        if (ctx.inWater(x, z)) for (let y = LEVEL - 3; y <= LEVEL; y++) k.put(x, y, z, b.log);
        if ((z - walkZ0) % 8 === 0) k.propOn(M.dockLantern, x, LEVEL, z, x < NIGHT_POOL.x ? 180 : 0);
        else ctx.propAt(M.fence, [x + 0.5, TOP, z + 0.5], 90);
      }
    }
  }
  ctx.keepOut(NIGHT_POOL.x - 3, walkZ0, NIGHT_POOL.x + 3, NIGHT_POOL.z);
  const glade = { x0: NIGHT_POOL.x - 34, z0: NIGHT_POOL.z - 30, x1: NIGHT_POOL.x + 34, z1: HIGHLAND.z0 - 1 };
  jungleTrees(k, glade, 9, 0.6);
  for (let x = glade.x0; x <= glade.x1; x++) {
    for (let z = glade.z0; z <= glade.z1; z++) {
      if (ctx.inWater(x, z) || ctx.onPath(x, z) || ctx.keptOut(x, z) || ctx.world.get(x, ctx.surface(x, z) + 1, z) !== 0) continue;
      const r = roll(x, z, 50);
      const y = ctx.surface(x, z);
      if (r < 0.018) k.propOn(r < 0.009 ? M.glowMushroom : M.glowMushroomPink, x, y, z, Math.floor(r * 20000) % 360);
      else if (r < 0.024) for (let h = 1; h <= 1 + Math.floor(roll(x, z, 51) * 3); h++) k.put(x, y + h, z, b.crystal);
      else if (r < 0.03) k.propOn(r < 0.027 ? M.crystalBlue : M.crystalPurple, x, y, z, 45);
      else if (r < 0.038) ctx.propAt(M.fireflies, [x + 0.5, y + 1.2, z + 0.5], 0);
    }
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.propAt(M.fireflies, [NIGHT_POOL.x + Math.cos(a) * 4 + 0.5, LEVEL + 0.5, NIGHT_POOL.z + Math.sin(a) * 4 + 0.5], 0);
  }
  for (let i = 0; i < 5; i++) ctx.propAt(M.lily, [NIGHT_POOL.x - 4 + i * 2 + 0.5, LEVEL - 1 + 0.05, NIGHT_POOL.z + (i % 2) * 3 + 0.5], i * 50);
  ctx.landmark('rung-dem', 'Rừng đêm phát sáng', NIGHT_POOL.x, walkZ0 - 2);
}

