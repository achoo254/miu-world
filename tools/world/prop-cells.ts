// The cells a map's solid props fill (packages/voxel/src/prop-collision.ts), from each model's bounds read off
// its glTF file: the map checks walk round them as the child does in the game.
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { NodeIO, getBounds } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { modelCatalogSchema, modelTraversal } from '../../packages/voxel/src/model-catalog';
import { propSolidCells, type ModelBounds, type PlacedProp } from '../../packages/voxel/src/prop-collision';
import { ASSETS_DIR, REPO_ROOT } from '../assets/asset-lib';

const boundsCache = new Map<string, ModelBounds | null>();

async function modelBounds(io: NodeIO, model: string): Promise<ModelBounds | null> {
  if (boundsCache.has(model)) return boundsCache.get(model) ?? null;
  const doc = await io.read(path.join(ASSETS_DIR, model));
  const scene = doc.getRoot().getDefaultScene() ?? doc.getRoot().listScenes()[0];
  const b = scene ? getBounds(scene) : null;
  const bounds: ModelBounds | null = b ? { min: [b.min[0], b.min[1], b.min[2]], max: [b.max[0], b.max[1], b.max[2]] } : null;
  boundsCache.set(model, bounds);
  return bounds;
}

/** Cells (`cellKey`s) the solid props of `props` fill, with their traversal. */
export async function propCells(props: readonly PlacedProp[]): Promise<Map<string, 'auto-step' | 'blocking'>> {
  const catalog = modelCatalogSchema.parse(JSON.parse(await readFile(path.join(REPO_ROOT, 'content/world/models.json'), 'utf8')));
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const bounds = new Map<string, ModelBounds>();
  for (const model of new Set(props.map((p) => p.model))) {
    if (modelTraversal(catalog, model) === 'walk-through') continue;
    const b = await modelBounds(io, model);
    if (b) bounds.set(model, b);
  }
  return propSolidCells(props, (model) => bounds.get(model), (model) => modelTraversal(catalog, model));
}
