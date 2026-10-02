// Snow and ice of "Núi tuyết" after the owner's detail mock (designs/nui-tuyet/d-01, d-07, d-08, d-09,
// 02/10/2026): pines of blocks whose every step is capped with snow, falls frozen down a cliff face (or still
// running, white streaks down blue water) with an ice mound at their foot, ice floes on open water, and
// the hollow of the ice cave with its crystal walls. Each writes blocks only; the map file decides where.
import { put, type WorldWriter } from './world-writer';

/**
 * A pine of `height` on `baseY`: a trunk and a stepped cone of leaves, the top block of every column of the
 * cone snow, so each step of the cone reads white from above and green from the side (d-01, d-15).
 */
export function placeSnowPine(world: WorldWriter, x: number, baseY: number, z: number, height: number, b: { trunk: number; leaves: number; snow: number }): void {
  for (let y = baseY; y < baseY + height; y++) put(world, x, y, z, b.trunk);
  const tipY = baseY + height + 1;
  const tops = new Map<string, number>();
  for (let y = baseY + 2; y <= tipY; y++) {
    const r = Math.min(3, Math.round((tipY - y) / 2.2));
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (Math.abs(dx) + Math.abs(dz) > r + 1) continue;
        if (dx === 0 && dz === 0 && y < baseY + height) continue;
        put(world, x + dx, y, z + dz, b.leaves, true);
        tops.set(`${dx},${dz}`, y);
      }
    }
  }
  for (const [key, y] of tops) {
    const [dx = 0, dz = 0] = key.split(',').map(Number);
    if (world.get(x + dx, y, z + dz) === b.leaves) put(world, x + dx, y, z + dz, b.snow);
  }
  put(world, x, tipY + 1, z, b.snow, true);
}

/**
 * A fall down a cliff face that looks toward `dir` along z (+1: the cliff lies at smaller z): a sheet `width`
 * wide on the face's first open row `faceZ`, from `yTop` down to `yBottom`, frozen (`ice`, ribs jutting a
 * block, snow streaks, a mound of ice and snow at its foot) or running (`water` between frozen rims), and a
 * channel cut back into the cliff top. Returns the middle of the foot.
 */
export function placeFall(world: WorldWriter, x: number, faceZ: number, dir: 1 | -1, width: number, yTop: number, yBottom: number, running: boolean, b: { ice: number; snow: number; water: number }): [number, number, number] {
  const half = Math.floor(width / 2);
  for (let dx = -half; dx <= half; dx++) {
    const rim = Math.abs(dx) === half;
    // A frozen sheet still runs in a column here and there (blue among the white, d-08).
    const sheet = (running && !rim) || (!running && !rim && (dx + half) % 3 === 1) ? b.water : b.ice;
    for (let y = yBottom; y <= yTop; y++) {
      const streak = !running && (dx * 7 + y * 3) % 11 === 0;
      put(world, x + dx, y, faceZ, streak ? b.snow : sheet);
      // Ribs of ice jut out of a frozen sheet.
      if (!running && (dx + half) % 2 === 0 && y < yTop - 1 && (y + dx) % 5 !== 0) put(world, x + dx, y, faceZ + dir, b.ice);
    }
    // The channel the fall comes down from, cut into the cliff top.
    for (let k = 1; k <= 6; k++) put(world, x + dx, yTop, faceZ - dir * k, running && !rim ? b.water : b.ice);
  }
  if (!running) {
    for (let dx = -half - 2; dx <= half + 2; dx++) {
      for (let k = 0; k <= 3; k++) {
        const h = Math.max(0, 2 - Math.floor((Math.abs(dx) + k) / 2));
        for (let y = yBottom; y < yBottom + h; y++) put(world, x + dx, y, faceZ + dir * (1 + k), (dx + k) % 3 === 0 ? b.snow : b.ice, true);
      }
    }
  }
  return [x, yBottom, faceZ + dir * 3];
}

/** An ice floe on open water at `waterY`: a slab of ice `w` x `d`, a snow drift on it. */
export function placeFloe(world: WorldWriter, x0: number, z0: number, w: number, d: number, waterY: number, b: { ice: number; snow: number }): void {
  for (let x = x0; x < x0 + w; x++) {
    for (let z = z0; z < z0 + d; z++) {
      put(world, x, waterY, z, b.ice);
      if ((x + z) % 3 !== 0 && x > x0 && z > z0 && x < x0 + w - 1) put(world, x, waterY + 1, z, b.snow);
    }
  }
}

/**
 * The hollow of the ice cave (d-09) inside rock: a hall over the rectangle (inclusive) from `floorY` up to a
 * ragged vault `height` high, its walls and vault faced with ice and stone, veins and clusters of glowing
 * crystal in the walls, icicles of ice hanging from the vault. `seed` varies the vault. Returns nothing: the
 * map dresses the hall (lanterns, the bridge, the crystal props).
 */
export function carveIceHall(world: WorldWriter, x0: number, z0: number, x1: number, z1: number, floorY: number, height: number, seed: number, b: { ice: number; stone: number; crystal: number; floor: number }): void {
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const rx = (x1 - x0) / 2;
  const rz = (z1 - z0) / 2;
  const hash = (x: number, z: number): number => {
    const h = Math.sin(x * 12.9898 + z * 78.233 + seed * 0.37) * 43758.5453;
    return h - Math.floor(h);
  };
  const inside = (x: number, z: number): number => Math.hypot((x - cx) / rx, (z - cz) / rz);
  for (let x = x0 - 3; x <= x1 + 3; x++) {
    for (let z = z0 - 3; z <= z1 + 3; z++) {
      const d = inside(x, z);
      if (d > 1.12) continue;
      if (d <= 1) {
        // The vault: highest in the middle, ragged.
        const vault = floorY + Math.round(height * (0.55 + 0.45 * Math.sqrt(Math.max(0, 1 - d * d))) + hash(x, z) * 2);
        put(world, x, floorY - 1, z, b.floor);
        for (let y = floorY; y < vault; y++) put(world, x, y, z, 0);
        put(world, x, vault, z, hash(z, x) < 0.5 ? b.ice : b.stone);
        // Icicles from the vault.
        if (hash(x + 3, z) < 0.08) for (let y = vault - 1; y > vault - 1 - Math.floor(hash(x, z + 5) * 4) - 1; y--) put(world, x, y, z, b.ice);
      } else {
        // The walls: ice and stone, crystal veins glowing in them.
        for (let y = floorY; y <= floorY + height + 2; y++) {
          const r = hash(x * 3 + y, z * 5 - y);
          put(world, x, y, z, r < 0.12 ? b.crystal : r < 0.55 ? b.ice : b.stone);
        }
      }
    }
  }
}
