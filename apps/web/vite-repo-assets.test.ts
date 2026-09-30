import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { UI_ART_PATHS } from './src/ui/kit/ui-art';
import { createManifestReader, glbDependencies, runtimeAssetPaths } from './vite-repo-assets';

const ASSETS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../assets');

describe('runtime asset selection for the web build', async () => {
  const manifest = await createManifestReader(ASSETS_DIR)();
  const shipped = await runtimeAssetPaths(ASSETS_DIR, manifest);

  it('ships what the game loads: manifest, world, atlas, characters, fonts and placed models', () => {
    for (const p of [
      'manifest.json',
      'generated/world/forest-ch1/chunks.bin',
      'generated/world/forest-ch1/entities.json',
      'generated/atlas/atlas.png',
      'generated/characters/miu-cat.glb',
      'packs/kenney-cube-pets/2.0/animal-parrot.glb',
      // Forest life: a villager, an animal, and the axe the woodcutter holds.
      'packs/kenney-blocky-characters/2.0/character-a.glb',
      'packs/kenney-cube-pets/2.0/animal-bunny.glb',
      'packs/kenney-survival-kit/2.0/tool-axe.glb',
      'packs/font-baloo-2/5.3.0/baloo-2-vietnamese-700.woff2',
    ]) {
      expect(shipped).toContain(p);
    }
  });

  it('includes textures that placed models reference', async () => {
    const deps = (await Promise.all(shipped.filter((p) => p.endsWith('.glb') && p.startsWith('packs/')).map((p) => glbDependencies(ASSETS_DIR, p)))).flat();
    for (const dep of deps) expect(shipped).toContain(dep);
  });

  it('keeps the render-only world overview map out of dist, but ships its rendered image for the UI', async () => {
    expect(shipped.some((p) => p.startsWith('generated/world/the-gioi/'))).toBe(false);
    expect(shipped).not.toContain('packs/kenney-castle-kit/2.0/flag-pennant.glb'); // placed only on the overview
    expect(await runtimeAssetPaths(ASSETS_DIR, manifest, UI_ART_PATHS)).toContain('generated/home/world.png');
  });

  it('leaves the rest of the licensed packs out of dist', () => {
    expect(shipped.length).toBeLessThan(manifest.length / 4);
    expect(shipped).not.toContain('packs/kenney-cube-pets/2.0/animal-penguin.glb');
    expect(shipped.every((p) => manifest.includes(p))).toBe(true);
  });

  it('ships every icon and render the UI shows, and refuses one missing from the manifest', async () => {
    const withUi = await runtimeAssetPaths(ASSETS_DIR, manifest, UI_ART_PATHS);
    for (const p of UI_ART_PATHS) expect(withUi).toContain(p);
    await expect(runtimeAssetPaths(ASSETS_DIR, manifest, ['packs/fluent-emoji/unknown.png'])).rejects.toThrow(/missing from manifest/);
  });

  it('refuses a runtime asset missing from the manifest', async () => {
    const withoutParrot = manifest.filter((p) => !p.endsWith('animal-parrot.glb'));
    await expect(runtimeAssetPaths(ASSETS_DIR, withoutParrot)).rejects.toThrow(/missing from manifest/);
  });
});
