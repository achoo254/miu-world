// Scale for each pack model a map places, from the height (in blocks) it should stand at, checked
// against the asset manifest; animated models must carry the clip the runtime plays.
import path from 'node:path';
import { NodeIO, getBounds } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { ASSETS_DIR, MANIFEST_NAME, manifestSchema, readJson } from '../assets/asset-lib';

export async function modelScales(heights: Readonly<Record<string, number>>, clips: Readonly<Record<string, string>>): Promise<Map<string, number>> {
  const manifest = await readJson(path.join(ASSETS_DIR, MANIFEST_NAME), manifestSchema);
  const listed = new Set(manifest.files.map((f) => f.path));
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const scales = new Map<string, number>();
  for (const [model, height] of Object.entries(heights)) {
    if (!listed.has(model)) throw new Error(`model ${model} is not in the asset manifest`);
    const doc = await io.read(path.join(ASSETS_DIR, model));
    const scene = doc.getRoot().getDefaultScene() ?? doc.getRoot().listScenes()[0];
    if (!scene) throw new Error(`${model} has no scene`);
    const clip = clips[model];
    if (clip && !doc.getRoot().listAnimations().some((a) => a.getName() === clip)) throw new Error(`${model} has no ${clip} clip`);
    const bounds = getBounds(scene);
    scales.set(model, +(height / Math.max(bounds.max[1] - bounds.min[1], 1e-3)).toFixed(4));
  }
  return scales;
}
