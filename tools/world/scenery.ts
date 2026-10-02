// Everyday scenery the wide maps are filled with, after the owner's mocks (designs/the-gioi/, designs/<map>/):
// clusters of cottages round a shared yard with fences, fruit trees and wash buckets; fenced field plots;
// rows of street lamps along a road; flower beds; bamboo hedges; jetties with boats. Each writes through a
// zone map's context (zone-map.ts), keeps quest targets and trees out of what it builds, and returns nothing
// the map has to place again. A map file decides where; these decide how it looks.
import { PACK } from './map-kit';
import { cottageSize, placeCottage } from './structures/countryside';
import { facingOf, facingWriter, FRAME, frameCell, turnCell } from './structures/world-writer';
import type { Point } from './structures/path';
import type { ZoneMapContext } from './zone-map';

const N = PACK.nature;
const FLOWERS = [`${N}/flower_redA.glb`, `${N}/flower_yellowB.glb`, `${N}/flower_purpleA.glb`];
/** The mocks' street lamp: a thin black post under a glowing lantern (content/world/box-props.json). */
export const STREET_LANTERN = `${PACK.box}/street-lantern.glb`;
/** A sailing ship of the mocks' harbours (content/world/box-props.json). */
export const SAILING_SHIP = `${PACK.box}/sailing-ship.glb`;
const YARD_TREES = [`${N}/tree_fat.glb`, `${N}/tree_palmTall.glb`, `${N}/tree_palmShort.glb`];

/**
 * Wall and roof colours of the mocks' streets: red, blue and orange roofs over cream, birch and plank walls,
 * and the finish of the detail mocks (designs/lang-ven-song/d-03): a stone foot, timber posts and beam,
 * glazed windows over flower boxes, a dark ridge, timber gables and a chimney.
 */
export function cottagePalette(ctx: ZoneMapContext) {
  return {
    walls: [ctx.block('sand'), ctx.block('birch-log'), ctx.block('planks')],
    roofs: [ctx.block('brick-red'), ctx.block('roof-blue'), ctx.block('wood-red')],
    trim: ctx.block('log'),
    finish: {
      plinth: ctx.block('cobble-grey'),
      beam: ctx.block('log'),
      glass: ctx.block('glass'),
      sill: ctx.block('planks'),
      ridge: ctx.block('brick-grey'),
      gable: ctx.block('planks'),
      chimney: ctx.block('brick-grey'),
      lantern: ctx.block('lantern'),
      floor: ctx.block('planks'),
    },
  };
}

/** Cottages placed so far on each map being built (their colours rotate through the palette). */
const cottagesOf = new WeakMap<ZoneMapContext, number>();
const nextCottage = (ctx: ZoneMapContext): number => {
  const n = cottagesOf.get(ctx) ?? 0;
  cottagesOf.set(ctx, n + 1);
  return n;
};

/**
 * A cluster of `count` cottages in a row facing a shared yard to their south (-z), a fence round the yard
 * with a gap in front of each door, a fruit tree, a bench, a wash bucket and a flower bed. (x0, z0) is the
 * first cottage's corner; the yard runs `yard` blocks south of the row.
 */
export function cottageRow(ctx: ZoneMapContext, x0: number, z0: number, count: number, yard = 7): { x1: number } {
  const palette = cottagePalette(ctx);
  let x = x0;
  for (let i = 0; i < count; i++) {
    const n = nextCottage(ctx);
    const f = placeCottage(ctx.world, x, z0, n, ctx.ground + 1, palette);
    ctx.keepOut(f.x0, f.z0, f.x1, f.z1);
    for (const [bx, by, bz] of f.boxes) ctx.propAt(FLOWERS[(Math.floor(bx) + n) % 3] ?? '', [bx, by, bz], n * 23);
    for (const [lx, lz] of f.lamps.slice(0, 1)) ctx.prop(STREET_LANTERN, lx, lz, 0);
    const doorX = Math.floor((f.x0 + 1 + f.x1) / 2);
    for (let fx = f.x0; fx <= f.x1; fx += 2) if (Math.abs(fx - doorX) > 1) ctx.prop(`${N}/fence_simple.glb`, fx, z0 - yard, 0);
    ctx.prop(YARD_TREES[n % YARD_TREES.length] ?? '', f.x1 + 1, z0 - 2, n * 37);
    if (i % 2 === 0) ctx.prop(`${PACK.survival}/bucket.glb`, f.x0 + 2, z0 - 2, i * 40);
    if (i % 3 === 1) ctx.prop(`${PACK.box}/park-bench.glb`, doorX + 3, z0 - 4, 0);
    for (let k = 0; k < 3; k++) ctx.prop(FLOWERS[(k + i) % 3] ?? '', f.x0 + 1 + k, z0 - 1, k * 50);
    ctx.keepOut(f.x0, z0 - yard, f.x1, z0);
    x = f.x1 + 3;
  }
  return { x1: x };
}

/** Rows of cottages filling a rectangle (inclusive), streets between them; skips what lies in a zone or the water. */
export function hamlet(ctx: ZoneMapContext, x0: number, z0: number, x1: number, z1: number, rowEvery = 22): void {
  for (let z = z0 + 8; z + 9 <= z1; z += rowEvery) {
    let x = x0;
    while (x + 13 <= x1) {
      const clear = !ctx.inZone(x + 6, z, 4) && !ctx.inWater(x + 6, z) && !ctx.inWater(x + 6, z - 7) && !ctx.onPath(x + 6, z + 3);
      if (!clear) {
        x += 6;
        continue;
      }
      x = cottageRow(ctx, x, z, 1).x1 + 2;
    }
  }
}

/** A fenced plot (inclusive) planted in rows with `crop` (a nature-kit model), fence posts every two blocks. */
export function fieldPlot(ctx: ZoneMapContext, x0: number, z0: number, x1: number, z1: number, crop: string): void {
  for (let x = x0 + 1; x < x1; x += 2) for (let z = z0 + 1; z < z1; z += 2) ctx.prop(crop, x, z, (x * 31 + z * 7) % 360);
  for (let x = x0; x <= x1; x += 2) for (const z of [z0, z1]) ctx.prop(`${N}/fence_simple.glb`, x, z, 0);
  for (let z = z0 + 2; z < z1; z += 2) for (const x of [x0, x1]) ctx.prop(`${N}/fence_simple.glb`, x, z, 90);
  ctx.keepOut(x0, z0, x1, z1);
}

/** Street lamps every `spacing` blocks along a polyline, two blocks to its side, skipping water and zones' insides. */
export function lampRow(ctx: ZoneMapContext, route: readonly Point[], spacing = 18): void {
  for (let i = 0; i + 1 < route.length; i++) {
    const [ax = 0, az = 0] = route[i] ?? [];
    const [bx = 0, bz = 0] = route[i + 1] ?? [];
    const len = Math.hypot(bx - ax, bz - az);
    for (let d = spacing / 2; d < len; d += spacing) {
      const t = d / len;
      const side = Math.floor(d / spacing) % 2 === 0 ? 1 : -1;
      const x = Math.round(ax + (bx - ax) * t + (side * 3 * -(bz - az)) / len);
      const z = Math.round(az + (bz - az) * t + (side * 3 * (bx - ax)) / len);
      if (ctx.inWater(x, z) || ctx.inZone(x, z, -2)) continue;
      ctx.prop(`${PACK.roads}/light-curved.glb`, x, z, side > 0 ? 90 : 270);
    }
  }
}

/** A bed of mixed flowers, `w` x `d` blocks from (x0, z0). */
export function flowerBed(ctx: ZoneMapContext, x0: number, z0: number, w: number, d: number): void {
  for (let x = 0; x < w; x += 2) for (let z = 0; z < d; z += 2) ctx.prop(FLOWERS[(x + z) % 3] ?? '', x0 + x, z0 + z, (x * 17 + z * 29) % 360);
}

/** Bamboo along a polyline, a clump every 3 blocks (village hedges, the edge of a map). */
export function bambooHedge(ctx: ZoneMapContext, route: readonly Point[]): void {
  for (let i = 0; i + 1 < route.length; i++) {
    const [ax = 0, az = 0] = route[i] ?? [];
    const [bx = 0, bz = 0] = route[i + 1] ?? [];
    const len = Math.hypot(bx - ax, bz - az);
    for (let d = 0; d < len; d += 3) {
      const x = Math.round(ax + ((bx - ax) * d) / len);
      const z = Math.round(az + ((bz - az) * d) / len);
      if (!ctx.inWater(x, z) && !ctx.onPath(x, z) && !ctx.inZone(x, z, 1)) ctx.prop(`${N}/crops_bambooStageB.glb`, x, z, (x * 37 + z) % 360);
    }
  }
}

/**
 * A plank jetty from a bank into the water along +z or -z (`dir`) as the mocks' piers (designs/lang-ven-song/
 * c-12): a deck three wide on log posts every three blocks, a rail along both sides with a gap at its tip,
 * boats moored beside it (a sailing ship on one side when `sail`), a barrel and a lantern on the bank.
 */
export function jetty(ctx: ZoneMapContext, x: number, zBank: number, length: number, dir: 1 | -1, waterLevel: number, sail = false): void {
  const [planks, log] = [ctx.block('planks'), ctx.block('log')];
  for (let i = 0; i < length; i++) {
    const z = zBank + dir * i;
    for (let dx = -1; dx <= 1; dx++) ctx.world.set(x + dx, waterLevel + 1, z, planks);
    if (i % 3 === 0) {
      for (const dx of [-2, 2]) for (let y = waterLevel - 2; y <= waterLevel + 2; y++) ctx.world.set(x + dx, y, z, log);
    } else if (i < length - 2) for (const dx of [-2, 2]) ctx.prop(`${N}/fence_simple.glb`, x + dx, z, 90);
  }
  const tip = zBank + dir * (length - 3);
  ctx.propAt(`${N}/canoe.glb`, [x - 4 + 0.5, waterLevel + 0.9, tip + 0.5], 90);
  if (sail) ctx.propAt(SAILING_SHIP, [x + 6 + 0.5, waterLevel + 0.6, tip - dir * 2 + 0.5], 90);
  else ctx.propAt(`${N}/canoe.glb`, [x + 4 + 0.5, waterLevel + 0.9, tip + 0.5], 90);
  ctx.prop(`${PACK.survival}/barrel.glb`, x + 2, zBank - dir * 2, 0);
  ctx.prop(STREET_LANTERN, x - 2, zBank - dir * 2, 0);
}

/**
 * The verges of a lane (the detail mocks' streets, designs/lang-ven-song/d-10): a lantern post every
 * `lampEvery` blocks on alternate sides (STREET_LANTERN), green and blossom bushes of blocks, flowers and now
 * and then a fence length along both sides, two to three blocks off the way, never in the water, a zone, on
 * the paths or on what the map built.
 */
export function laneVerge(ctx: ZoneMapContext, route: readonly Point[], options: { spacing?: number; lampEvery?: number } = {}): void {
  const spacing = options.spacing ?? 3;
  const lampEvery = options.lampEvery ?? 15;
  const verge = [...FLOWERS, `${N}/plant_bush.glb`, `${N}/flower_yellowA.glb`, `${N}/grass_large.glb`];
  const bushes = [ctx.block('leaves'), ctx.block('leaves-pink'), ctx.block('leaves'), ctx.block('leaves-autumn')];
  const free = (x: number, z: number): boolean =>
    !ctx.inWater(x, z) && !ctx.inZone(x, z, -1) && !ctx.onPath(x, z) && !ctx.keptOut(x, z) && ctx.world.get(x, ctx.surface(x, z) + 1, z) === 0;
  let walked = 0;
  for (let i = 0; i + 1 < route.length; i++) {
    const [ax = 0, az = 0] = route[i] ?? [];
    const [bx = 0, bz = 0] = route[i + 1] ?? [];
    const len = Math.hypot(bx - ax, bz - az);
    if (len === 0) continue;
    const [nx, nz] = [-(bz - az) / len, (bx - ax) / len];
    for (let d = 1; d < len; d += spacing, walked += spacing) {
      for (const side of [-1, 1]) {
        const off = 2.6 + ((d * 7 + side * 3) % 3) * 0.4;
        const x = Math.round(ax + ((bx - ax) * d) / len + nx * side * off);
        const z = Math.round(az + ((bz - az) * d) / len + nz * side * off);
        if (!free(x, z)) continue;
        const k = Math.floor(walked / spacing) + (side > 0 ? 2 : 0);
        const y = ctx.surface(x, z) + 1;
        const lampHere = (walked % (lampEvery * 2) < spacing && side === 1) || (walked % (lampEvery * 2) >= lampEvery && walked % (lampEvery * 2) < lampEvery + spacing && side === -1);
        if (lampHere) ctx.prop(STREET_LANTERN, x, z, 0);
        else if (k % 5 === 1) {
          ctx.world.set(x, y, z, bushes[k % bushes.length] ?? 0);
          if (k % 3 === 0) ctx.world.set(x, y + 1, z, bushes[k % bushes.length] ?? 0);
        } else if (k % 13 === 6) for (let f = 0; f < 3; f++) ctx.prop(`${N}/fence_simple.glb`, x + Math.round((bx - ax) / len) * f * 2, z + Math.round((bz - az) / len) * f * 2, Math.abs(bx - ax) > Math.abs(bz - az) ? 0 : 90);
        else ctx.prop(verge[k % verge.length] ?? '', x, z, (k * 53) % 360);
      }
    }
  }
}

/**
 * Cottages lining a lane on both sides (or `sides`), their doors on it, as the detail mocks' streets
 * (designs/lang-ven-song/d-10, c-07): each `setback` blocks off the way behind a front garden (a fence with a
 * gap at the gate, a cobbled walk to the door, bushes, flower boxes, a lantern by every other gate), houses
 * `gap` blocks apart on a stone foot where the ground falls away. Skips spots in the water, the zones, on
 * other paths, kept out or too uneven. Returns how many it built.
 */
export function streetHouses(ctx: ZoneMapContext, route: readonly Point[], options: { setback?: number; gap?: number; sides?: ReadonlyArray<1 | -1> } = {}): number {
  const setback = options.setback ?? 6;
  const gap = options.gap ?? 3;
  const palette = cottagePalette(ctx);
  const bushes = [ctx.block('leaves'), ctx.block('leaves-pink')];
  const foot = ctx.block('cobble-grey');
  let built = 0;
  for (let i = 0; i + 1 < route.length; i++) {
    const [ax = 0, az = 0] = route[i] ?? [];
    const [bx = 0, bz = 0] = route[i + 1] ?? [];
    const len = Math.hypot(bx - ax, bz - az);
    if (len < 16) continue;
    const [ux, uz] = [(bx - ax) / len, (bz - az) / len];
    for (const side of options.sides ?? [-1, 1]) {
      const [nx, nz] = [-uz * side, ux * side];
      const facing = facingOf(-nx, -nz);
      let d = 8;
      while (d < len - 8) {
        const n = nextCottage(ctx);
        const { w, d: depth } = cottageSize(n);
        const [px, pz] = [Math.round(ax + ux * d), Math.round(az + uz * d)];
        const [rx, rz] = turnCell([0, 0], facing, Math.floor(w / 2), -setback);
        const origin: [number, number] = [px - rx, pz - rz];
        const cell = (u: number, v: number): [number, number] => frameCell(origin, facing, FRAME + u, FRAME + v);
        const lot: Array<[number, number]> = [];
        for (let u = -2; u <= w + 1; u++) for (let v = -3; v <= depth + 1; v++) lot.push(cell(u, v));
        const heights = lot.map(([x, z]) => ctx.surface(x, z));
        const clear = lot.every(([x, z]) => !ctx.inWater(x, z) && !ctx.inZone(x, z, 1) && !ctx.onPath(x, z) && !ctx.keptOut(x, z)) && Math.max(...heights) - Math.min(...heights) <= 3;
        if (!clear) {
          d += 4;
          continue;
        }
        const baseY = Math.max(...heights) + 1;
        for (let u = 0; u < w; u++) for (let v = 0; v < depth; v++) {
          const [x, z] = cell(u, v);
          for (let y = ctx.surface(x, z) + 1; y < baseY; y++) ctx.world.set(x, y, z, foot);
        }
        const writer = facingWriter(ctx.world, origin, facing);
        const house = placeCottage(writer, FRAME, FRAME, n, baseY, palette);
        const door = Math.floor(w / 2);
        const doorCols = Array.from({ length: house.doorway.width }, (_, i) => house.doorway.x0 - FRAME + i);
        // The garden: a cobbled walk from the gate to the door, bushes either side, a fence with its gate gap;
        // where the house stands on its stone foot, steps up to the door one block at a time.
        for (let v = -3; v <= -1; v++) for (const u of doorCols) {
          const [x, z] = cell(u, v);
          ctx.world.set(x, ctx.surface(x, z), z, ctx.soil.path);
        }
        for (const u of doorCols) {
          for (let k = 1; k <= 4; k++) {
            const [x, z] = cell(u, -k);
            const top = baseY - k;
            if (top <= ctx.surface(x, z) + 1) break;
            for (let y = ctx.surface(x, z) + 1; y < top; y++) ctx.world.set(x, y, z, foot);
          }
        }
        for (const u of [0, 1, w - 2, w - 1]) {
          const [x, z] = cell(u, -2);
          ctx.world.set(x, ctx.surface(x, z) + 1, z, bushes[(u + n) % 2] ?? 0);
        }
        const [fx, fz] = turnCell([0, 0], facing, 1, 0);
        const fenceYaw = Math.abs(fx) > Math.abs(fz) ? 0 : 90;
        for (let u = -1; u <= w; u += 2) {
          if (Math.abs(u - door + 0.5) < 2.5) continue;
          const [x, z] = cell(u, -3);
          ctx.prop(`${N}/fence_simple.glb`, x, z, fenceYaw);
        }
        if (n % 2 === 0) {
          const [x, z] = cell(-2, -3);
          ctx.prop(STREET_LANTERN, x, z, 0);
        }
        for (const [bx0, by, bz0] of house.boxes) {
          const [x, z] = frameCell(origin, facing, Math.floor(bx0), Math.floor(bz0));
          ctx.propAt(FLOWERS[(x + n) % 3] ?? '', [x + 0.5, by, z + 0.5], n * 23);
        }
        const xs = lot.map(([x]) => x);
        const zs = lot.map(([, z]) => z);
        ctx.keepOut(Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs));
        built++;
        d += w + gap;
      }
    }
  }
  return built;
}
