import { describe, expect, it } from 'vitest';
import { AssetNotInManifestError, AssetRegistry } from './asset-loader';

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
