// `pnpm world:walk [<map>…]` (every map of content/world/regions.json when none is named): a map's standing spots
// for the companion bots, written to content/world/walk/<map>.bin (packages/voxel/src/walk-cells.ts, raw deflate)
// and <map>.json (size, the inputs' sha256, the places a bot recognises). The spots are the auto-walk's own
// (apps/web/src/game/nav: blocks, solid props and `blocking` things counted as in the game, edges marked the
// same way), the lowest WALK_LEVELS of each column of the core. No routes: the bots find their own way with
// `canStep`. Run it after regenerating a map (`pnpm world:<map>`, then `pnpm assets:manifest`):
// tools/world/walk-export.test.ts fails while a map's grid is stale.
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { deflateRawSync } from 'node:zlib';
import { QuestDefinition, stepTargets } from '../../packages/schema/src/content';
import { RegionCatalog, mapForRegion } from '../../packages/schema/src/region';
import { blockTableSchema } from '../../packages/voxel/src/block-table';
import { REGION_BLOCKS } from '../../packages/voxel/src/region-format';
import { encodeWalkCells, WALK_FORMAT_VERSION, WALK_LEVELS, walkInfoSchema, type WalkInfo, type WalkPlace, type WalkSpot } from '../../packages/voxel/src/walk-cells';
import type { WorldEntities } from '../../packages/voxel/src/world-entities';
import { buildWalkGrid, type WalkGrid } from '../../apps/web/src/game/nav/route-search';
import { blockKinds, PROP_BLOCKING_ID, PROP_STEP_ID, walkRegion, type RegionWalk } from '../../apps/web/src/game/nav/walk-grid';
import { ASSETS_DIR, REPO_ROOT } from '../assets/asset-lib';
import { loadMapGrid } from './reach-audit';

export const WALK_DIR = path.join(REPO_ROOT, 'content/world/walk');

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
 * the sha256 of content/blocks.json, content/world/models.json and of each event file placed on the map (by name),
 * and the walk format's version.
 */
export async function walkSources(map: string): Promise<string> {
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
  parts.push(`walk-format ${WALK_FORMAT_VERSION}`);
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

/**
 * The places a bot recognises on a map (its events' scenes included), sorted by id. An id an interactable and a
 * landmark share is the interactable's (they stand at the same thing).
 */
export function placesOf(e: WorldEntities): WalkPlace[] {
  const places: WalkPlace[] = [{ id: 'spawn', kind: 'spawn', at: [...e.spawn.position] }];
  for (const [chapter, start] of Object.entries(e.chapterSpawns ?? {})) places.push({ id: `chapter-${chapter}`, kind: 'chapter', at: [...start.position] });
  for (const t of e.interactables) {
    const kind = t.kind === 'gate' || t.travel !== undefined ? 'gate' : t.ride !== undefined ? 'stop' : t.kind === 'npc' ? 'npc' : 'object';
    places.push({ id: t.id, kind, at: [...t.position], ...(t.ride ? { ride: [...t.ride] } : {}) });
    if (t.ride) places.push({ id: `arrival-${t.id}`, kind: 'arrival', at: [...t.ride] });
  }
  for (const l of e.landmarks) places.push({ id: l.id, kind: 'landmark', at: [...l.position] });
  const seen = new Set<string>();
  return places.filter((p) => !seen.has(p.id) && !!seen.add(p.id)).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

export interface WalkExport {
  info: WalkInfo;
  /** The deflated bytes of content/world/walk/<map>.bin. */
  bin: Uint8Array;
  /** Spots written, those on levels 1 and 2, and those over the third level left out. */
  spots: number;
  upper: number;
  dropped: number;
  seconds: number;
}

/** The core's standing spots with its solid props over the blocks, as the auto-walk reads a region (route-service.ts). */
function coreGrid(loaded: Awaited<ReturnType<typeof loadMapGrid>>, blocks: Parameters<typeof blockKinds>[0]): WalkGrid {
  const { entities: e, grid } = loaded;
  const [sx, sy, sz] = e.size;
  const kinds = blockKinds(blocks);
  const walks = new Map<string, RegionWalk>();
  for (let rz = 0; rz * REGION_BLOCKS < sz; rz++) {
    for (let rx = 0; rx * REGION_BLOCKS < sx; rx++) {
      const [ox, oz] = [rx * REGION_BLOCKS, rz * REGION_BLOCKS];
      const walk = walkRegion(
        (x, y, z) => {
          // Past the core's edge (a region sticking out of it) is open air.
          if (ox + x >= sx || oz + z >= sz) return 0;
          const id = grid.get(ox + x, y, oz + z);
          return id === -2 ? PROP_BLOCKING_ID : id === -1 ? PROP_STEP_ID : id;
        },
        sy,
        kinds,
      );
      walks.set(`${rx},${rz}`, walk);
    }
  }
  return buildWalkGrid(0, 0, sx, sz, (rx, rz) => walks.get(`${rx},${rz}`) ?? null);
}

export async function buildWalk(map: string): Promise<WalkExport> {
  const started = performance.now();
  const loaded = await loadMapGrid(map);
  const e = loaded.entities;
  const table = blockTableSchema.parse(JSON.parse(await readFile(repoFile('content/blocks.json'), 'utf8')));
  const grid = coreGrid(loaded, table.blocks);
  let spots = 0;
  let upper = 0;
  let dropped = 0;
  const raw = encodeWalkCells({
    size: [grid.width, grid.depth],
    spotsAt: (x, z) => {
      const c = x + z * grid.width;
      const [first, end] = [grid.start[c] ?? 0, grid.start[c + 1] ?? 0];
      const out: WalkSpot[] = [];
      for (let i = first; i < end; i++) {
        if (out.length === WALK_LEVELS) {
          dropped += end - i;
          break;
        }
        out.push({ feet: grid.feet[i] ?? 0, clear: grid.clear[i] ?? 0, ground: grid.ground[i] ?? 0, edge: grid.edge[i] === 1 });
      }
      spots += out.length;
      upper += Math.max(0, out.length - 1);
      return out;
    },
  });
  const info = walkInfoSchema.parse({
    version: WALK_FORMAT_VERSION,
    map,
    size: [e.size[0], e.size[2]],
    height: e.size[1],
    levels: WALK_LEVELS,
    sources: await walkSources(map),
    places: placesOf(e),
  });
  const bin = new Uint8Array(deflateRawSync(raw, { level: 9 }));
  return { info, bin, spots, upper, dropped, seconds: (performance.now() - started) / 1000 };
}

/** The .json as written: one place per line, so the same map always gives the same bytes. */
export function formatWalkInfo(info: WalkInfo): string {
  const places = info.places.length === 0 ? '[]' : `[\n${info.places.map((p) => `    ${JSON.stringify(p)}`).join(',\n')}\n  ]`;
  return [
    '{',
    `  "version": ${JSON.stringify(info.version)},`,
    `  "map": ${JSON.stringify(info.map)},`,
    `  "size": ${JSON.stringify(info.size)},`,
    `  "height": ${JSON.stringify(info.height)},`,
    `  "levels": ${JSON.stringify(info.levels)},`,
    `  "sources": ${JSON.stringify(info.sources)},`,
    `  "places": ${places}`,
    '}',
    '',
  ].join('\n');
}

async function main(): Promise<void> {
  const named = process.argv.slice(2);
  const known = await playableMaps();
  const unknown = named.filter((m) => !known.includes(m));
  if (unknown.length > 0) throw new Error(`not a playable map (content/world/regions.json): ${unknown.join(', ')}`);
  await mkdir(WALK_DIR, { recursive: true });
  let total = 0;
  for (const map of named.length > 0 ? named : known) {
    const { info, bin, spots, upper, dropped, seconds } = await buildWalk(map);
    const text = formatWalkInfo(info);
    await writeFile(path.join(WALK_DIR, `${map}.bin`), bin);
    await writeFile(path.join(WALK_DIR, `${map}.json`), text);
    total += bin.length + Buffer.byteLength(text);
    console.log(
      `${map}: ${spots} spots (${upper} on upper levels, ${dropped} over level ${WALK_LEVELS} left out), ${info.places.length} places; ` +
        `.bin ${(bin.length / 1024).toFixed(1)} KB, .json ${(Buffer.byteLength(text) / 1024).toFixed(1)} KB in ${seconds.toFixed(1)} s`,
    );
  }
  console.log(`written: ${(total / 1024).toFixed(1)} KB`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
