import { describe, expect, it } from 'vitest';
import { composeCharacter } from '../../packages/voxel/src/character-recipe';
import { readCharacterLibrary, readOutfitRules } from './character-library';

describe('character library in content/', () => {
  it('composes every species in every outfit and colourway, so any recipe line builds', async () => {
    const library = await readCharacterLibrary();
    const outfits = Object.entries(library.outfits).flatMap(([id, def]) => [id, ...Object.keys(def.variants).map((v) => `${id}:${v}`)]);
    expect(Object.keys(library.species)).toEqual(expect.arrayContaining(['cat', 'rabbit', 'fox', 'bear']));
    for (const species of Object.keys(library.species)) {
      for (const outfit of outfits) expect(() => composeCharacter({ species, outfit }, library), `${species} in ${outfit}`).not.toThrow();
    }
  });

  it('uses every library part in at least one species, and every species default outfit exists', async () => {
    const library = await readCharacterLibrary();
    const used = new Set(Object.values(library.species).flatMap((s) => Object.entries(s.parts).map(([kind, ref]) => `${kind}/${typeof ref === 'string' ? ref : ref.id}`)));
    for (const [kind, parts] of Object.entries(library.parts)) for (const id of Object.keys(parts)) expect(used, `${kind}/${id}`).toContain(`${kind}/${id}`);
    for (const species of Object.values(library.species)) expect(Object.keys(library.outfits)).toContain(species.outfit.split(':')[0]);
  });

  it('has no outfit rules unless an event adds content/outfit-rules.json', async () => {
    expect(Array.isArray(await readOutfitRules())).toBe(true);
  });
});
