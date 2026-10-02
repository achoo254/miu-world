// Everyday scenery the wide maps are filled with, after the owner's mocks (designs/the-gioi/, designs/<map>/):
// clusters of cottages round a shared yard with fences, fruit trees and wash buckets; fenced field plots;
// rows of street lamps along a road; flower beds; bamboo hedges; jetties with boats. Each writes through a
// zone map's context (zone-map.ts), keeps quest targets and trees out of what it builds, and returns nothing
// the map has to place again. A map file decides where; these decide how it looks.
import { PACK } from './map-kit';
import { placeCottage } from './structures/countryside';
import type { Point } from './structures/path';
import type { ZoneMapContext } from './zone-map';

const N = PACK.nature;
const FLOWERS = [`${N}/flower_redA.glb`, `${N}/flower_yellowB.glb`, `${N}/flower_purpleA.glb`];
const YARD_TREES = [`${N}/tree_fat.glb`, `${N}/tree_palmTall.glb`, `${N}/tree_palmShort.glb`];

/** Wall and roof colours of the mocks' streets: red, blue and orange roofs over cream, birch and plank walls. */
export function cottagePalette(ctx: ZoneMapContext) {
  return {
    walls: [ctx.block('sand'), ctx.block('birch-log'), ctx.block('planks')],
    roofs: [ctx.block('brick-red'), ctx.block('roof-blue'), ctx.block('wood-red')],
    trim: ctx.block('log'),
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

/** A plank jetty from a bank into the water along +z or -z (`dir`), boats moored beside it. */
export function jetty(ctx: ZoneMapContext, x: number, zBank: number, length: number, dir: 1 | -1, waterLevel: number, sail = false): void {
  for (let i = 0; i < length; i++) for (let dx = -1; dx <= 1; dx++) ctx.world.set(x + dx, waterLevel + 1, zBank + dir * i, ctx.block('planks'));
  const tip = zBank + dir * (length - 2);
  for (const dx of [-3, 3]) ctx.propAt(sail && dx > 0 ? `${PACK.props}/sailboat.glb` : `${N}/canoe.glb`, [x + dx + 0.5, waterLevel + 0.9, tip + 0.5], 90);
  ctx.prop(`${PACK.survival}/barrel.glb`, x + 2, zBank - dir * 2, 0);
}
