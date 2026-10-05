import { describe, expect, it } from 'vitest';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { AssetNotInManifestError, AssetRegistry, ModelCache } from './asset-loader';

const ORIGIN = 'http://localhost:4173';
const registry = new AssetRegistry(new Set(['packs/kenney-cube-pets/2.0/animal-parrot.glb', 'packs/kenney-cube-pets/2.0/Textures/colormap.png']), ORIGIN);

describe('AssetRegistry', () => {
  it('serves manifest paths under the asset prefix, URL-encoding each segment', () => {
    expect(registry.url('packs/kenney-cube-pets/2.0/animal-parrot.glb')).toBe('/game-assets/packs/kenney-cube-pets/2.0/animal-parrot.glb');
  });

  it('refuses paths that are not in the manifest', () => {
    expect(() => registry.url('packs/kenney-cube-pets/2.0/animal-cat.glb')).toThrow(AssetNotInManifestError);
  });

  it('allows a GLB-relative texture URL only when the texture is listed', () => {
    expect(registry.checkUrl('/game-assets/packs/kenney-cube-pets/2.0/Textures/colormap.png')).toContain('colormap.png');
    expect(() => registry.checkUrl('/game-assets/packs/kenney-cube-pets/2.0/Textures/other.png')).toThrow(AssetNotInManifestError);
  });

  it('refuses other origins and paths outside the asset prefix (no hotlinking)', () => {
    expect(() => registry.checkUrl('https://kenney.nl/media/pack.glb')).toThrow(AssetNotInManifestError);
    expect(() => registry.checkUrl('/src/main.ts')).toThrow(AssetNotInManifestError);
  });

  it('lets embedded data/blob URLs through (textures packed inside a GLB)', () => {
    expect(registry.checkUrl('blob:http://localhost:4173/1234')).toBe('blob:http://localhost:4173/1234');
    expect(registry.checkUrl('data:image/png;base64,AAAA')).toBe('data:image/png;base64,AAAA');
  });

  it('puts each file\'s content version in its URL, for the GLB and for the texture it asks for', () => {
    const versions = new Map([['packs/kenney-cube-pets/2.0/animal-parrot.glb', 'aaaaaaaaaaaa'], ['packs/kenney-cube-pets/2.0/Textures/colormap.png', 'bbbbbbbbbbbb']]);
    const fresh = new AssetRegistry(new Set(versions.keys()), ORIGIN, versions);
    expect(fresh.url('packs/kenney-cube-pets/2.0/animal-parrot.glb')).toBe('/game-assets/packs/kenney-cube-pets/2.0/animal-parrot.glb?v=aaaaaaaaaaaa');
    expect(fresh.checkUrl(`${ORIGIN}/game-assets/packs/kenney-cube-pets/2.0/Textures/colormap.png`)).toBe(`${ORIGIN}/game-assets/packs/kenney-cube-pets/2.0/Textures/colormap.png?v=bbbbbbbbbbbb`);
    expect(fresh.checkUrl('/game-assets/packs/kenney-cube-pets/2.0/animal-parrot.glb?v=aaaaaaaaaaaa')).toBe('/game-assets/packs/kenney-cube-pets/2.0/animal-parrot.glb?v=aaaaaaaaaaaa');
  });
});

describe('ModelCache', () => {
  const model = (): Promise<GLTF> => new Promise<GLTF>(() => undefined);

  it('keeps the models of this game and the one before it, and lets older ones go', () => {
    const cache = new ModelCache();
    const tree = model();
    const house = model();
    cache.set('/tree.glb', tree);
    cache.nextRound();
    cache.set('/house.glb', house);
    // The game before used the tree: still there for this one.
    expect(cache.get('/tree.glb')).toBe(tree);
    cache.nextRound();
    // Asked for again in the last round, the tree stays; the house was last asked for a round earlier, and stays too.
    expect(cache.get('/house.glb')).toBe(house);
    cache.nextRound();
    cache.nextRound();
    expect(cache.get('/tree.glb')).toBeUndefined();
    expect(cache.get('/house.glb')).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it('forgets a model on request (a failed load is tried again)', () => {
    const cache = new ModelCache();
    cache.set('/broken.glb', model());
    cache.delete('/broken.glb');
    expect(cache.get('/broken.glb')).toBeUndefined();
  });
});
