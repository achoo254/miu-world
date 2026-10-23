import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { UI_ART_PATHS } from './src/ui/kit/ui-art';
import { createManifestReader, fontAssetPaths, glbDependencies, runtimeAssetPaths } from './vite-repo-assets';

const ASSETS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../assets');

describe('runtime asset selection for the web build', async () => {
  const manifest = await createManifestReader(ASSETS_DIR)();
  const shipped = await runtimeAssetPaths(ASSETS_DIR, manifest);

  it('ships what the game loads: manifest, world, atlas, characters, fonts and placed models', () => {
    for (const p of [
      'manifest.json',
      'generated/world/forest-ch1/regions/r0-0.bin',
      'generated/world/forest-ch1/horizon.bin',
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
    // Pack files only: generated files (maps, props built for quests) are made for the runtime and all ship.
    const packFiles = (paths: readonly string[]) => paths.filter((p) => p.startsWith('packs/'));
    expect(packFiles(shipped).length).toBeLessThan(packFiles(manifest).length / 4);
    expect(shipped).not.toContain('packs/kenney-castle-kit/2.0/siege-catapult.glb');
    expect(shipped.every((p) => manifest.includes(p))).toBe(true);
  });

  it('ships every icon and render the UI shows, and refuses one missing from the manifest', async () => {
    const withUi = await runtimeAssetPaths(ASSETS_DIR, manifest, UI_ART_PATHS);
    for (const p of UI_ART_PATHS) expect(withUi).toContain(p);
    await expect(runtimeAssetPaths(ASSETS_DIR, manifest, ['packs/fluent-emoji/unknown.png'])).rejects.toThrow(/missing from manifest/);
  });

  it('ships the review material with the review pages, and leaves it out of a release but for the portraits the UI shows', async () => {
    expect(shipped).toContain('generated/review/mvp/10-reward.png');
    const release = await runtimeAssetPaths(ASSETS_DIR, manifest, UI_ART_PATHS, { review: false });
    const reviewInRelease = release.filter((p) => p.startsWith('generated/review/'));
    expect(reviewInRelease.length).toBeGreaterThan(0);
    for (const p of reviewInRelease) expect(UI_ART_PATHS).toContain(p);
    expect(release).not.toContain('generated/review/mvp/10-reward.png');
    expect(release).not.toContain('generated/review/perf.json');
  });

  it('ships the link-preview cards in a release, which the pages\' Open Graph tags point at', async () => {
    const release = await runtimeAssetPaths(ASSETS_DIR, manifest, UI_ART_PATHS, { review: false });
    const cards = release.filter((p) => p.startsWith('generated/share-cards/'));
    expect(cards).toContain('generated/share-cards/miu-world.png');
    expect(cards).toContain('generated/share-cards/toan-2-bai-1-on-tap-cac-so-den-100.png');
    expect(cards.length).toBeGreaterThanOrEqual(71);
  });

  it('lets the game reach review material only through the UI art list a release keeps', () => {
    // Anything else under src/ that names generated/review/ would load in review builds and 404 in production.
    const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'src');
    const pageOnly = ['review/', 'preview/']; // the review and render tool pages, left out of a release
    // readdirSync returns native separators; compare in POSIX form so Windows matches the same folders.
    const naming = readdirSync(SRC, { recursive: true, encoding: 'utf8' })
      .map((f) => f.split(path.sep).join('/'))
      .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f) && !pageOnly.some((dir) => f.startsWith(dir)))
      .filter((f) => readFileSync(path.join(SRC, f), 'utf8').includes('generated/review/'));
    expect(naming).toEqual(['ui/kit/ui-art.ts']);
  });

  it('refuses a runtime asset missing from the manifest', async () => {
    const withoutParrot = manifest.filter((p) => !p.endsWith('animal-parrot.glb'));
    await expect(runtimeAssetPaths(ASSETS_DIR, withoutParrot)).rejects.toThrow(/missing from manifest/);
  });
});

describe('asset selection for the app build', async () => {
  const manifest = await createManifestReader(ASSETS_DIR)();

  it('packs the fonts (every one fonts.css names) and no world, model, sound or picture', () => {
    const fonts = fontAssetPaths(manifest);
    const css = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'src/ui/fonts.css'), 'utf8');
    const named = [...css.matchAll(/url\('\/game-assets\/([^']+)'\)/g)].map((m) => m[1]).sort();
    expect(named.length).toBeGreaterThan(0);
    for (const font of named) expect(fonts).toContain(font);
    expect(fonts.every((p) => p.endsWith('.woff2'))).toBe(true);
  });
});
