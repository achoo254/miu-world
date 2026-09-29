import { describe, expect, it } from 'vitest';
import { selectZipEntries } from './fetch-assets';

describe('selectZipEntries', () => {
  const names = [
    'License.txt',
    'Models/GLB format/animal-cat.glb',
    'Models/GLB format/Textures/colormap.png',
    'Models/FBX format/animal-cat.fbx',
    'PNG (Transparent)/star_01.png',
    'PNG (Transparent)/smoke_01.png',
    'Overview.html',
    'Models/GLB format/',
  ];

  it('keeps only whitelisted files and strips the prefix', () => {
    const selected = selectZipEntries(names, [
      { glob: 'License.txt', strip: '' },
      { glob: 'Models/GLB format/**/*.{glb,png}', strip: 'Models/GLB format/' },
      { glob: 'PNG \\(Transparent\\)/{star,spark}_*.png', strip: 'PNG (Transparent)/' },
    ]);
    expect([...selected.entries()]).toEqual([
      ['License.txt', 'License.txt'],
      ['Models/GLB format/animal-cat.glb', 'animal-cat.glb'],
      ['Models/GLB format/Textures/colormap.png', 'Textures/colormap.png'],
      ['PNG (Transparent)/star_01.png', 'star_01.png'],
    ]);
  });

  it('rejects a strip prefix that does not match the entry', () => {
    expect(() => selectZipEntries(names, [{ glob: 'License.txt', strip: 'Models/' }])).toThrow(/does not prefix/);
  });
});
