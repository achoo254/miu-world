// `pnpm world:bot-routes [<map>…]` (every map of content/world/regions.json when none is named): the ways the
// companion bots walk on a map, written to content/world/bot-routes/<map>.json (packages/schema/src/bot-routes.ts).
// Every place a bot may go to (each target, named place, start, gate, ride stop and arrival) gets up to four spots
// to stand on beside it, roads first; the places are joined by the routes the child's own auto-walk finds
// (apps/web/src/game/nav: the same standing spots, step rules and road-first costs), so a bot keeps to the laid
// ways, goes round walls and fences, and never floats or sinks. Run it after regenerating a map
// (`pnpm world:<map>`, then `pnpm assets:manifest`): the file records the sha256 of its inputs and
// tools/world/bot-routes.test.ts fails while it is stale.
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { BOT_ROUTES_VERSION, BotRoutes, type BotEdge, type BotRoutePoint, type BotStop, type BotStopKind } from '../../packages/schema/src/bot-routes';
import { QuestDefinition, stepTargets } from '../../packages/schema/src/content';
import { RegionCatalog, mapForRegion } from '../../packages/schema/src/region';
import { blockTableSchema } from '../../packages/voxel/src/block-table';
import { REGION_BLOCKS } from '../../packages/voxel/src/region-format';
import type { WorldEntities } from '../../packages/voxel/src/world-entities';
import { buildWalkGrid, findRoute, type WalkGrid } from '../../apps/web/src/game/nav/route-search';
import { SPOT_REACH } from '../../apps/web/src/game/nav/walk-goal';
import { blockKinds, Ground, PROP_BLOCKING_ID, PROP_STEP_ID, walkRegion, type RegionWalk } from '../../apps/web/src/game/nav/walk-grid';
import { ASSETS_DIR, REPO_ROOT } from '../assets/asset-lib';
import { loadMapGrid } from './reach-audit';

export const BOT_ROUTES_DIR = path.join(REPO_ROOT, 'content/world/bot-routes');

/** Land round both ends that a route may swing out through (route-service.ts MARGIN). */
const MARGIN = 48;
/** Places each place is joined to, nearest first, and how far apart they may be (blocks, straight line). */
const NEIGHBOURS = 5;
const NEIGHBOUR_RANGE = 160;
/** Joining what is left apart: the nearest pairs between two parts tried, and how far apart they may be. */
const BRIDGE_RANGE = 400;
const BRIDGE_TRIES = 4;
const MAX_SPOTS = 4;
/** Spots of one place stand at least this far apart (blocks). */
const SPOT_SPACING = 1.5;
/** A spot stands at least this far from the place itself: a bot does not stand inside a character. */
const SPOT_MIN = 1;
/** Feet within this many blocks of the place's own height (as the auto-walk's goal). */
const SPOT_RISE = 3;
/** A further spot is one the bot walks to from the first in a few steps, not round a wall. */
const SPOT_WALK = 8;

const repoFile = (rel: string): string => path.join(REPO_ROOT, rel);
const sha256 = (data: string | Uint8Array): string => createHash('sha256').update(data).digest('hex');

async function regionCatalog(): Promise<RegionCatalog> {
  return RegionCatalog.parse(JSON.parse(await readFile(repoFile('content/world/regions.json'), 'utf8')));
}

/** The playable maps: every map a region of content/world/regions.json is on, in order. */
export async function playableMaps(): Promise<string[]> {
  return [...new Set((await regionCatalog()).regions.flatMap((r) => (r.map ? [r.map] : [])))];
}

/**
 * sha256 over, in order: the manifest's sha256 of the map's entities.json and of each of its regions/*.bin (by path),
 * then the sha256 of content/blocks.json, content/world/models.json and of each event file placed on the map (by name).
 */
export async function routeSources(map: string): Promise<string> {
  const manifest = JSON.parse(await readFile(path.join(ASSETS_DIR, 'manifest.json'), 'utf8')) as { files?: unknown; generated?: unknown };
  const entries = [manifest.files, manifest.generated].flatMap((list) => (Array.isArray(list) ? (list as Array<{ path?: unknown; sha256?: unknown }>) : []));
  const prefix = `generated/world/${map}/`;
  const mapFiles = entries
    .flatMap((f) => (typeof f.path === 'string' && typeof f.sha256 === 'string' ? [{ path: f.path, sha256: f.sha256 }] : []))
    .filter((f) => f.path === `${prefix}entities.json` || (f.path.startsWith(`${prefix}regions/`) && f.path.endsWith('.bin')))
    .sort((a, b) => (a.path === b.path ? 0 : a.path < b.path ? -1 : 1));
  if (!mapFiles.some((f) => f.path === `${prefix}entities.json`)) throw new Error(`${map}: no ${prefix}entities.json in assets/manifest.json`);
  const parts = mapFiles.map((f) => f.sha256);
  for (const rel of ['content/blocks.json', 'content/world/models.json']) parts.push(sha256(await readFile(repoFile(rel))));
  const regions = await regionCatalog();
  const eventsDir = repoFile('content/events');
  for (const file of (await readdir(eventsDir).catch(() => [] as string[])).filter((f) => f.endsWith('.json')).sort()) {
    const bytes = await readFile(path.join(eventsDir, file));
    const event = JSON.parse(bytes.toString('utf8')) as { region?: unknown };
    if (typeof event.region === 'string' && mapForRegion(regions, event.region) === map) parts.push(sha256(bytes));
  }
  return sha256(parts.join('\n'));
}

/** By map, every target a step of an `active` quest there points at. */
export async function activeQuestTargets(): Promise<Map<string, Set<string>>> {
  const regions = await regionCatalog();
  const dir = repoFile('content/quests');
  const byMap = new Map<string, Set<string>>();
  for (const file of (await readdir(dir)).filter((f) => f.endsWith('.json')).sort()) {
    const raw = JSON.parse(await readFile(path.join(dir, file), 'utf8')) as { status?: unknown };
    if (raw.status !== 'active') continue;
    const quest = QuestDefinition.parse(raw);
    if (quest.status !== 'active') continue;
    const map = mapForRegion(regions, quest.region);
    const targets = byMap.get(map) ?? new Set<string>();
    for (const step of quest.steps) for (const id of stepTargets(step)) targets.add(id);
    byMap.set(map, targets);
  }
  return byMap;
}

interface Place {
  id: string;
  kind: BotStopKind;
  at: readonly [number, number, number];
}

/** Every place a bot may head for, by id (the first of a repeated id kept). */
function placesOf(e: WorldEntities): Place[] {
  const places: Place[] = [{ id: 'spawn', kind: 'spawn', at: e.spawn.position }];
  for (const [chapter, start] of Object.entries(e.chapterSpawns ?? {})) places.push({ id: `chapter:${chapter}`, kind: 'chapter', at: start.position });
  for (const t of e.interactables) {
    places.push({ id: t.id, kind: t.travel !== undefined ? 'gate' : t.ride !== undefined ? 'stop' : 'target', at: t.position });
    if (t.ride) places.push({ id: `arrival:${t.id}`, kind: 'arrival', at: t.ride });
  }
  for (const l of e.landmarks) places.push({ id: `landmark:${l.id}`, kind: 'landmark', at: l.position });
  const seen = new Set<string>();
  return places.filter((p) => !seen.has(p.id) && !!seen.add(p.id));
}

/** The standing spots of the map's core, region by region, with its solid props over the blocks (route-service.ts). */
function coreWalks(map: Awaited<ReturnType<typeof loadMapGrid>>, blocks: Parameters<typeof blockKinds>[0]): Map<string, RegionWalk> {
  const { entities: e, world, cells } = map;
  const kinds = blockKinds(blocks);
  // The props' cells by column, so a column without any reads only its blocks.
  const propColumns = new Map<string, Map<number, 'auto-step' | 'blocking'>>();
  for (const [key, kind] of cells) {
    const [x, y, z] = key.split(',').map(Number);
    if (x === undefined || y === undefined || z === undefined) continue;
    const column = `${x},${z}`;
    const ys = propColumns.get(column) ?? new Map<number, 'auto-step' | 'blocking'>();
    ys.set(y, kind);
    propColumns.set(column, ys);
  }
  const walks = new Map<string, RegionWalk>();
  for (let rz = 0; rz * REGION_BLOCKS < e.size[2]; rz++) {
    for (let rx = 0; rx * REGION_BLOCKS < e.size[0]; rx++) {
      const [ox, oz] = [rx * REGION_BLOCKS, rz * REGION_BLOCKS];
      let column: Map<number, 'auto-step' | 'blocking'> | undefined;
      let columnKey = '';
      const walk = walkRegion(
        (x, y, z) => {
          const key = `${ox + x},${oz + z}`;
          if (key !== columnKey) {
            columnKey = key;
            column = propColumns.get(key);
          }
          const prop = column?.get(y);
          return prop === 'blocking' ? PROP_BLOCKING_ID : prop ? PROP_STEP_ID : world.get(ox + x, y, oz + z);
        },
        e.size[1],
        kinds,
      );
      walks.set(`${rx},${rz}`, walk);
    }
  }
  return walks;
}

type Spot = [number, number, number];

const flat = (a: readonly number[], b: readonly number[]): number => Math.hypot((a[0] ?? 0) - (b[0] ?? 0), (a[2] ?? 0) - (b[2] ?? 0));

function polylineLength(points: readonly BotRoutePoint[]): number {
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    const [p, q] = [points[i - 1], points[i]];
    if (p && q) length += Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
  }
  return Math.round(length * 10) / 10;
}

export interface MapRouteReport {
  routes: BotRoutes;
  /** Parts the network fell into before the ones apart from the spawn's were left out. */
  parts: number;
  /** Targets of active quests on the map that no edge reaches. */
  questTargetsWithoutEdge: string[];
  seconds: number;
}

export async function buildBotRoutes(map: string): Promise<MapRouteReport> {
  const started = performance.now();
  const loaded = await loadMapGrid(map);
  const e = loaded.entities;
  const table = blockTableSchema.parse(JSON.parse(await readFile(repoFile('content/blocks.json'), 'utf8')));
  const walks = coreWalks(loaded, table.blocks);
  const [SX, SZ] = [e.size[0], e.size[2]];

  /** The standing spots of a rectangle round two points, clamped to the core (bots never walk the outer land). */
  const gridAround = (a: readonly number[], b: readonly number[], margin: number): WalkGrid => {
    const x0 = Math.max(0, Math.floor(Math.min(a[0] ?? 0, b[0] ?? 0) - margin));
    const z0 = Math.max(0, Math.floor(Math.min(a[2] ?? 0, b[2] ?? 0) - margin));
    const x1 = Math.min(SX, Math.ceil(Math.max(a[0] ?? 0, b[0] ?? 0) + margin));
    const z1 = Math.min(SZ, Math.ceil(Math.max(a[2] ?? 0, b[2] ?? 0) + margin));
    return buildWalkGrid(x0, z0, x1, z1, (rx, rz) => walks.get(`${rx},${rz}`) ?? null);
  };

  /** The auto-walk's route from one spot to another, both ends included, or null when it does not get there. */
  const route = (grid: WalkGrid, from: Spot, to: Spot): Spot[] | null => {
    const found = findRoute(grid, { from, to, reach: 0.5 });
    if (!found.ok || !found.reachesTarget) return null;
    const end = found.points.at(-1);
    if (!end || end[0] !== to[0] || end[1] !== to[1] || end[2] !== to[2]) return null;
    return [from, ...found.points];
  };

  /** Up to MAX_SPOTS spots beside a place, roads first then nearest; the further ones a short walk from the first. */
  const spotsFor = (at: readonly [number, number, number]): Spot[] => {
    const grid = gridAround(at, at, SPOT_REACH + SPOT_WALK);
    const candidates: Array<{ spot: Spot; road: boolean; away: number; rise: number }> = [];
    for (let cz = 0; cz < grid.depth; cz++) {
      for (let cx = 0; cx < grid.width; cx++) {
        const spot0: Spot = [grid.x0 + cx + 0.5, 0, grid.z0 + cz + 0.5];
        const away = flat(spot0, at);
        if (away < SPOT_MIN || away > SPOT_REACH) continue;
        const c = cx + cz * grid.width;
        for (let i = grid.start[c] ?? 0; i < (grid.start[c + 1] ?? 0); i++) {
          const feet = grid.feet[i] ?? 0;
          const rise = Math.abs(feet - at[1]);
          if (rise > SPOT_RISE || grid.ground[i] === Ground.water || (grid.clear[i] ?? 0) < 2) continue;
          candidates.push({ spot: [spot0[0], feet, spot0[2]], road: grid.ground[i] === Ground.road, away, rise });
        }
      }
    }
    candidates.sort((p, q) => Number(q.road) - Number(p.road) || p.away - q.away || p.rise - q.rise || p.spot[0] - q.spot[0] || p.spot[2] - q.spot[2] || p.spot[1] - q.spot[1]);
    const first = candidates[0];
    if (!first) return [];
    const spots: Spot[] = [first.spot];
    for (const { spot } of candidates.slice(1)) {
      if (spots.length >= MAX_SPOTS) break;
      if (spots.some((s) => flat(s, spot) < SPOT_SPACING)) continue;
      const way = route(grid, first.spot, spot);
      if (way && polylineLength(way) <= SPOT_WALK) spots.push(spot);
    }
    return spots;
  };

  const placed: Array<Place & { spots: Spot[] }> = [];
  const unplaced: string[] = [];
  for (const place of placesOf(e)) {
    const spots = spotsFor(place.at);
    if (spots.length === 0) unplaced.push(place.id);
    else placed.push({ ...place, spots });
  }
  const spawnIndex = placed.findIndex((p) => p.kind === 'spawn');
  if (spawnIndex < 0) throw new Error(`${map}: no spot to stand on beside the spawn`);

  // Edges by index pair (low, high), each found once; parts joined by union-find.
  const edges = new Map<string, { a: number; b: number; points: Spot[] }>();
  const tried = new Set<string>();
  const parent = placed.map((_, i) => i);
  const root = (i: number): number => {
    let r = i;
    while (parent[r] !== r) r = parent[r] ?? r;
    parent[i] = r;
    return r;
  };
  const join = (i: number, j: number): void => {
    parent[root(i)] = root(j);
  };
  const tryEdge = (i: number, j: number): boolean => {
    const key = i < j ? `${i},${j}` : `${j},${i}`;
    if (tried.has(key)) return edges.has(key);
    tried.add(key);
    const [from, to] = [placed[i]?.spots[0], placed[j]?.spots[0]];
    if (!from || !to || flat(from, to) === 0) return false;
    const points = route(gridAround(from, to, MARGIN), from, to);
    if (!points) return false;
    edges.set(key, i < j ? { a: i, b: j, points } : { a: j, b: i, points: points.reverse() });
    join(i, j);
    return true;
  };
  for (const [i, place] of placed.entries()) {
    const near = placed
      .map((other, j) => ({ j, away: flat(place.spots[0] ?? place.at, other.spots[0] ?? other.at) }))
      .filter(({ j, away }) => j !== i && away <= NEIGHBOUR_RANGE)
      .sort((p, q) => p.away - q.away || p.j - q.j)
      .slice(0, NEIGHBOURS);
    for (const { j } of near) tryEdge(i, j);
  }
  // A ride joins its stop to its arrival as an edge would.
  const byId = new Map(placed.map((p, i) => [p.id, i]));
  const rides: Array<{ a: number; b: number }> = [];
  for (const t of e.interactables) {
    const [a, b] = [byId.get(t.id), byId.get(`arrival:${t.id}`)];
    if (t.ride && a !== undefined && b !== undefined) {
      rides.push({ a, b });
      join(a, b);
    }
  }
  const partsOf = (): Map<number, number[]> => {
    const parts = new Map<number, number[]>();
    for (let i = 0; i < placed.length; i++) parts.set(root(i), [...(parts.get(root(i)) ?? []), i]);
    return parts;
  };
  const parts = partsOf().size;
  // Join what is left apart, the nearest pairs first, until nothing more joins.
  for (let joined = true; joined; ) {
    joined = false;
    for (const members of partsOf().values()) {
      if (partsOf().size <= 1) break;
      const own = root(members[0] ?? 0);
      const pairs: Array<{ i: number; j: number; away: number }> = [];
      for (const i of members) {
        for (let j = 0; j < placed.length; j++) {
          if (root(j) === own) continue;
          const away = flat(placed[i]?.spots[0] ?? [], placed[j]?.spots[0] ?? []);
          const key = i < j ? `${i},${j}` : `${j},${i}`;
          if (away <= BRIDGE_RANGE && !tried.has(key)) pairs.push({ i, j, away });
        }
      }
      pairs.sort((p, q) => p.away - q.away || p.i - q.i || p.j - q.j);
      for (const { i, j } of pairs.slice(0, BRIDGE_TRIES)) {
        if (root(i) !== root(j) && tryEdge(i, j)) {
          joined = true;
          break;
        }
      }
    }
  }

  // Keep the spawn's network; the rest is listed as isolated.
  const home = root(spawnIndex);
  const kept = placed.map((p, i) => ({ p, i })).filter(({ i }) => root(i) === home);
  const isolated = placed.filter((_, i) => root(i) !== home).map((p) => p.id);
  kept.sort((x, y) => (x.p.id < y.p.id ? -1 : x.p.id > y.p.id ? 1 : 0));
  const index = new Map(kept.map(({ i }, k) => [i, k]));
  const stops: BotStop[] = kept.map(({ p }) => ({ id: p.id, kind: p.kind, face: [p.at[0], p.at[2]], spots: p.spots }));
  const outEdges: BotEdge[] = [];
  for (const edge of edges.values()) {
    const [a, b] = [index.get(edge.a), index.get(edge.b)];
    if (a === undefined || b === undefined) continue;
    const points = a < b ? edge.points : [...edge.points].reverse();
    outEdges.push({ a: Math.min(a, b), b: Math.max(a, b), length: polylineLength(points), points });
  }
  outEdges.sort((p, q) => p.a - q.a || p.b - q.b);
  const outRides = rides.flatMap((r) => {
    const [a, b] = [index.get(r.a), index.get(r.b)];
    return a !== undefined && b !== undefined ? [{ a, b }] : [];
  });
  outRides.sort((p, q) => p.a - q.a || p.b - q.b);

  const routes = BotRoutes.parse({
    version: BOT_ROUTES_VERSION,
    map,
    sources: await routeSources(map),
    stops,
    edges: outEdges,
    rides: outRides,
    isolated: [...isolated].sort(),
    unplaced: [...unplaced].sort(),
  });
  const withEdge = new Set(routes.edges.flatMap((edge) => [routes.stops[edge.a]?.id, routes.stops[edge.b]?.id]));
  const questTargetsWithoutEdge = [...((await activeQuestTargets()).get(map) ?? [])].filter((id) => !withEdge.has(id)).sort();
  return { routes, parts, questTargetsWithoutEdge, seconds: (performance.now() - started) / 1000 };
}

/** The file as written: one stop, edge or ride per line, so the same input always gives the same bytes. */
export function formatBotRoutes(routes: BotRoutes): string {
  const list = (items: readonly unknown[]): string => (items.length === 0 ? '[]' : `[\n${items.map((item) => `    ${JSON.stringify(item)}`).join(',\n')}\n  ]`);
  return [
    '{',
    `  "version": ${JSON.stringify(routes.version)},`,
    `  "map": ${JSON.stringify(routes.map)},`,
    `  "sources": ${JSON.stringify(routes.sources)},`,
    `  "stops": ${list(routes.stops)},`,
    `  "edges": ${list(routes.edges)},`,
    `  "rides": ${list(routes.rides)},`,
    `  "isolated": ${JSON.stringify(routes.isolated)},`,
    `  "unplaced": ${JSON.stringify(routes.unplaced)}`,
    '}',
    '',
  ].join('\n');
}

async function main(): Promise<void> {
  const named = process.argv.slice(2);
  const known = await playableMaps();
  const unknown = named.filter((m) => !known.includes(m));
  if (unknown.length > 0) throw new Error(`not a playable map (content/world/regions.json): ${unknown.join(', ')}`);
  await mkdir(BOT_ROUTES_DIR, { recursive: true });
  for (const map of named.length > 0 ? named : known) {
    const { routes, parts, questTargetsWithoutEdge, seconds } = await buildBotRoutes(map);
    const text = formatBotRoutes(routes);
    await writeFile(path.join(BOT_ROUTES_DIR, `${map}.json`), text);
    console.log(
      `${map}: ${routes.stops.length} stops, ${routes.edges.length} edges, ${routes.rides.length} rides, ${parts} parts before joining; ` +
        `${(text.length / 1024).toFixed(0)} KB in ${seconds.toFixed(1)} s`,
    );
    if (routes.isolated.length > 0) console.log(`  isolated (no way from the spawn): ${routes.isolated.join(', ')}`);
    if (routes.unplaced.length > 0) console.log(`  no spot to stand on: ${routes.unplaced.join(', ')}`);
    if (questTargetsWithoutEdge.length > 0) console.log(`  quest targets without an edge: ${questTargetsWithoutEdge.join(', ')}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
