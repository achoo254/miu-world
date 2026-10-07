// The companion bots' ways (content/world/bot-routes) against the maps as committed, without finding any route again:
// each playable map has its file, the file matches the map's files in assets/manifest.json, the active quests'
// targets are on the network, the network is one piece from the spawn, and its polylines walk as the auto-walk does.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { BotRoutes } from '../../packages/schema/src/bot-routes';
import { activeQuestTargets, BOT_ROUTES_DIR, playableMaps, routeSources } from './bot-routes';

/** Share of a map's active quest targets that must have an edge (a few may stand where no one can). */
const TARGETS_WITH_EDGE = 0.95;
/** A merged straight run is at most this long, and a step between waypoints rises or drops at most this much. */
const MAX_RUN = 48;
const MAX_RISE = 3;

const maps = await playableMaps();
let targetsByMap: Map<string, Set<string>>;

beforeAll(async () => {
  targetsByMap = await activeQuestTargets();
});

async function routesOf(map: string): Promise<BotRoutes> {
  const text = await readFile(path.join(BOT_ROUTES_DIR, `${map}.json`), 'utf8').catch(() => {
    throw new Error(`content/world/bot-routes/${map}.json is missing: run pnpm world:bot-routes ${map}`);
  });
  return BotRoutes.parse(JSON.parse(text));
}

describe.each(maps)('bot routes of %s', (map) => {
  it('is up to date with the map', async () => {
    const routes = await routesOf(map);
    expect(routes.map).toBe(map);
    expect(routes.sources, `the map, its blocks, models or events changed since the bot routes were made: run pnpm world:bot-routes ${map}`).toBe(await routeSources(map));
  });

  it("reaches the map's active quest targets", async () => {
    const routes = await routesOf(map);
    const withEdge = new Set(routes.edges.flatMap((e) => [routes.stops[e.a]?.id, routes.stops[e.b]?.id]));
    const targets = [...(targetsByMap.get(map) ?? [])].sort();
    const missing = targets.filter((id) => !withEdge.has(id));
    expect(missing.length, `quest targets no bot route reaches: ${missing.join(', ')}`).toBeLessThanOrEqual(Math.floor(targets.length * (1 - TARGETS_WITH_EDGE)));
    const isolatedTargets = routes.isolated.filter((id) => targets.includes(id));
    expect(isolatedTargets, 'quest targets cut off from the spawn').toEqual([]);
  });

  it('is one network from the spawn', async () => {
    const routes = await routesOf(map);
    const parent = routes.stops.map((_, i) => i);
    const root = (i: number): number => (parent[i] === i ? i : (parent[i] = root(parent[i] ?? i)));
    for (const { a, b } of [...routes.edges, ...routes.rides]) parent[root(a)] = root(b);
    const spawn = routes.stops.findIndex((s) => s.kind === 'spawn');
    expect(spawn).toBeGreaterThanOrEqual(0);
    const apart = routes.stops.filter((_, i) => root(i) !== root(spawn)).map((s) => s.id);
    expect(apart, 'stops off the spawn network').toEqual([]);
  });

  it('walks in merged runs, stepping as the child can', async () => {
    const routes = await routesOf(map);
    const bad: string[] = [];
    for (const edge of routes.edges) {
      for (let i = 1; i < edge.points.length; i++) {
        const [p, q] = [edge.points[i - 1], edge.points[i]];
        if (!p || !q) continue;
        const run = Math.hypot(q[0] - p[0], q[2] - p[2]);
        if (run > MAX_RUN || Math.abs(q[1] - p[1]) > MAX_RISE) bad.push(`${routes.stops[edge.a]?.id}→${routes.stops[edge.b]?.id} at ${p.join(',')}`);
      }
    }
    expect(bad).toEqual([]);
  });
});
