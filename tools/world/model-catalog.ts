// The tools' side of content/world/models.json (packages/voxel model-catalog.ts): each placed model's height,
// clip and placing, read once, with the sizes a map gives some models of its own laid over it.
import path from 'node:path';
import { modelCatalogSchema, type ModelCatalog } from '../../packages/voxel/src/model-catalog';
import { REPO_ROOT, readJson } from '../assets/asset-lib';

let cached: Promise<ModelCatalog> | null = null;

export function loadModelCatalog(): Promise<ModelCatalog> {
  cached ??= readJson(path.join(REPO_ROOT, 'content/world/models.json'), modelCatalogSchema);
  return cached;
}

/**
 * Heights, clips and corner-pivot models of the catalog, with a map's own `sizes` (model → height) over
 * the heights: what `mapModels` measures scales from.
 */
export async function catalogModels(sizes: Readonly<Record<string, number>> = {}): Promise<{ heights: Record<string, number>; clips: Record<string, string>; centred: string[] }> {
  const { models } = await loadModelCatalog();
  const unknown = Object.keys(sizes).filter((model) => !models[model]);
  if (unknown.length > 0) throw new Error(`not in content/world/models.json: ${unknown.join(', ')}`);
  const entries = Object.entries(models);
  return {
    heights: { ...Object.fromEntries(entries.map(([model, m]) => [model, m.height])), ...sizes },
    clips: Object.fromEntries(entries.flatMap(([model, m]) => (m.clip ? [[model, m.clip]] : []))),
    centred: entries.filter(([, m]) => m.centred).map(([model]) => model),
  };
}
