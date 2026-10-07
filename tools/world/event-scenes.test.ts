// The limited-time events' scenes (content/events) stand on their maps as the scenery rules want
// (.claude/rules/world-scenery.md): no tree or solid thing in a lane, every character and thing by the ways and
// reachable from the spawn, nothing covering where the child starts. The audits read each map with its events on it.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { LiveEvent } from '../../packages/schema/src/live-event';
import { RegionCatalog, mapForRegion } from '../../packages/schema/src/region';
import { REPO_ROOT } from '../assets/asset-lib';
import { auditReach } from './reach-audit';
import { auditScenery } from './scenery-audit';

const regions = RegionCatalog.parse(JSON.parse(readFileSync(path.join(REPO_ROOT, 'content/world/regions.json'), 'utf8')));
const events = readdirSync(path.join(REPO_ROOT, 'content/events'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => LiveEvent.parse(JSON.parse(readFileSync(path.join(REPO_ROOT, 'content/events', f), 'utf8'))));
const maps = [...new Set(events.map((e) => mapForRegion(regions, e.region)))];

describe('event scenes on their maps', () => {
  it.each(maps)('%s keeps its scenery rules with its events on it', async (map) => {
    expect(await auditScenery(map)).toEqual([]);
    expect(await auditReach(map)).toEqual({ stranded: [], covered: [] });
  });
});
