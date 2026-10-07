// The scenes of the limited-time events (content/events) standing on a generated map: the map audits check a map with
// them on it, as the game draws it while an event is open.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { LiveEvent } from '../../packages/schema/src/live-event';
import { RegionCatalog, mapForRegion } from '../../packages/schema/src/region';
import type { EventLayerInput } from '../../packages/voxel/src/event-layer';
import { REPO_ROOT } from '../assets/asset-lib';

export async function eventLayersOf(map: string): Promise<EventLayerInput[]> {
  const regions = RegionCatalog.parse(JSON.parse(await readFile(path.join(REPO_ROOT, 'content/world/regions.json'), 'utf8')));
  const dir = path.join(REPO_ROOT, 'content/events');
  const files = await readdir(dir).catch(() => [] as string[]);
  const layers: EventLayerInput[] = [];
  for (const file of files.filter((f) => f.endsWith('.json')).sort()) {
    const event = LiveEvent.parse(JSON.parse(await readFile(path.join(dir, file), 'utf8')));
    if (mapForRegion(regions, event.region) === map) layers.push(event.scene);
  }
  return layers;
}
