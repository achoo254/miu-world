import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { OUTLAND_MODELS } from '../../packages/voxel/src/outland';
import { worldEntitiesSchema } from '../../packages/voxel/src/world-entities';
import { ASSETS_DIR, REPO_ROOT } from '../assets/asset-lib';
import { catalogModels, loadModelCatalog } from './model-catalog';
import { modelScales } from './model-scales';

/** Quest characters and things take their look's height from content/world/looks.json, not the catalog. */
async function lookModels(): Promise<Set<string>> {
  const { looks } = JSON.parse(await readFile(path.join(REPO_ROOT, 'content/world/looks.json'), 'utf8')) as { looks: Record<string, { model?: string }> };
  return new Set(Object.values(looks).flatMap((l) => (l.model ? [l.model] : [])));
}

describe('model catalog (content/world/models.json)', () => {
  it('lists models of the asset manifest, each animated one with the clip it plays', async () => {
    const { heights, clips } = await catalogModels();
    expect(Object.keys(heights).length).toBeGreaterThan(150);
    // Throws on a model missing from the manifest or a clip missing from its model.
    expect((await modelScales(heights, clips)).size).toBe(Object.keys(heights).length);
  }, 60_000);

  it('holds every model the maps place and the land round them may place', async () => {
    const { models } = await loadModelCatalog();
    const looks = await lookModels();
    const missing = new Set<string>();
    for (const map of await readdir(path.join(ASSETS_DIR, 'generated/world'))) {
      const file = path.join(ASSETS_DIR, 'generated/world', map, 'entities.json');
      const entities = worldEntitiesSchema.parse(JSON.parse(await readFile(file, 'utf8')));
      const placed = [...entities.props.map((p) => p.model), ...(entities.ambients ?? []).map((a) => a.model), ...entities.interactables.flatMap((t) => (t.model ? [t.model] : []))];
      for (const model of placed) if (!models[model] && !looks.has(model)) missing.add(`${map}: ${model}`);
    }
    for (const model of OUTLAND_MODELS) if (!models[model]) missing.add(`outland: ${model}`);
    expect([...missing]).toEqual([]);
  });
});
