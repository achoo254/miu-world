import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ASSETS_DIR } from '../assets/asset-lib';
import { checkPets } from './check-content';
import { modelSwatches } from './pet-swatches';

const CAT = 'packs/kenney-cube-pets/2.0/animal-cat.glb';

describe('pet colour variants', () => {
  it('reads the swatches a Cube Pet draws with from its model', () => {
    const swatches = modelSwatches(path.join(ASSETS_DIR, CAT));
    expect(swatches).toContain('grey'); // the fur
    expect(swatches).toContain('dark'); // the eyes
    expect(swatches).not.toContain('tan');
  });

  it('flags a variant naming a swatch its model never draws with, and a pet without a picture', () => {
    const catalogue = {
      version: 1,
      pets: [
        { id: 'meo-trang', name: 'Mèo trắng', model: CAT, scale: 0.5, recolor: { grey: 'white' } },
        { id: 'meo-la', name: 'Mèo lạ', model: CAT, scale: 0.5, recolor: { tan: 'white' } },
      ],
    };
    const swatchesOf = (model: string) => modelSwatches(path.join(ASSETS_DIR, model));
    const issues = checkPets(catalogue, new Set([CAT]), new Set(['generated/pets/meo-trang.png']), swatchesOf);
    expect(issues).toEqual([
      'pet meo-la: no picture generated/pets/meo-la.png (run pnpm assets:pets)',
      `pet meo-la: recolor names swatch tan, which ${CAT} never draws with`,
    ]);
  });

  it('refuses a variant that maps a swatch to itself or to an unknown one', () => {
    const pet = { id: 'meo', name: 'Mèo', model: CAT, scale: 0.5 };
    for (const recolor of [{ grey: 'grey' }, { grey: 'rainbow' }, {}]) {
      expect(checkPets({ version: 1, pets: [{ ...pet, recolor }] }, new Set([CAT]), new Set(), () => new Set())[0]).toMatch(/^content\/pets\.json/);
    }
  });
});
