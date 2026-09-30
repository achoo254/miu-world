import { describe, expect, it } from 'vitest';
import { SPECIES_SLOTS, composeCharacter, resolveOutfit, type CharacterLibrary, type SpeciesDef, type VoxelBox } from './character-recipe';

const box = (x: number, y: number, color: string, extra: Partial<VoxelBox> = {}): VoxelBox => ({ x, y, z: 0, w: 2, h: 1, d: 1, color, ...extra });
const speciesPalette = (fur: string): Record<string, string> => Object.fromEntries(SPECIES_SLOTS.map((slot) => [slot, slot === 'fur' ? fur : '#000000']));

const LIBRARY: CharacterLibrary = {
  bases: {
    chibi: { parts: { head: [box(-1, 0, 'fur')], 'arm-left': [box(0, -2, 'paw')], 'leg-left': [box(1, -2, 'foot')] }, tailPivot: [0, 8, -6] },
  },
  parts: {
    eyes: { dot: { joint: 'head', boxes: [box(3, 5, 'eye', { sym: true })] } },
    tail: { stub: { joint: 'tail', boxes: [box(-1, 0, 'fur')] } },
  },
  outfits: {
    tee: { name: 'Áo', parts: { torso: [box(-2, 0, 'main')], 'arm-left': [box(0, 0, 'main')] }, palette: { main: '#111111' }, variants: { red: { main: '#ff0000' } } },
    gown: { name: 'Áo dài', parts: { torso: [box(-2, 0, 'main'), box(-2, 1, 'fur')] }, palette: { main: '#222222' }, variants: {} },
  },
  species: {
    cat: { name: 'Mèo', trait: 'Tò mò', base: 'chibi', parts: { eyes: 'dot', tail: 'stub' }, palette: speciesPalette('#ffffff'), outfit: 'tee' },
    bear: { name: 'Gấu', trait: 'Hiền', base: 'chibi', parts: { eyes: { id: 'dot', offset: [1, 2, 0] } }, palette: speciesPalette('#8a5a3a'), outfit: 'gown' },
  },
};

describe('composeCharacter', () => {
  it('stacks base, species parts and outfit per joint, and mirrors the left limbs to the right', () => {
    const cat = composeCharacter({ species: 'cat' }, LIBRARY);
    expect(cat.outfit).toBe('tee');
    expect(cat.parts.get('head')).toEqual([box(-1, 0, 'fur'), box(3, 5, 'eye', { sym: true }), box(-5, 5, 'eye', { sym: true })]);
    expect(cat.parts.get('arm-left')).toEqual([box(0, -2, 'paw'), box(0, 0, 'main')]);
    expect(cat.parts.get('arm-right')).toEqual([box(-2, -2, 'paw'), box(-2, 0, 'main')]);
    expect(cat.parts.get('leg-right')).toEqual([box(-3, -2, 'foot')]);
    expect(cat.parts.get('tail')).toEqual([box(-1, 0, 'fur')]);
    expect(cat.tailPivot).toEqual([0, 8, -6]);
  });

  it('moves a picked part by its offset, spreading a symmetric pair apart', () => {
    const eyes = composeCharacter({ species: 'bear' }, LIBRARY).parts.get('head')?.filter((b) => b.color === 'eye');
    expect(eyes?.map((b) => [b.x, b.y])).toEqual([
      [4, 7],
      [-6, 7],
    ]);
  });

  it('paints with species slots, then the outfit, its variant, and the character last', () => {
    const cat = composeCharacter({ species: 'cat', outfit: 'tee:red', palette: { fur: '#ff8800' } }, LIBRARY);
    expect(cat.palette.main).toBe('#ff0000');
    expect(cat.palette.fur).toBe('#ff8800');
    // An outfit may paint with a species slot (bare fur under a gown).
    expect(composeCharacter({ species: 'bear' }, LIBRARY).palette.fur).toBe('#8a5a3a');
  });

  it('lets any species wear any outfit', () => {
    for (const species of Object.keys(LIBRARY.species)) {
      for (const outfit of ['tee', 'tee:red', 'gown']) expect(() => composeCharacter({ species, outfit }, LIBRARY)).not.toThrow();
    }
  });

  it('names what is missing', () => {
    expect(() => composeCharacter({ species: 'fox' }, LIBRARY)).toThrow('unknown species "fox"');
    expect(() => composeCharacter({ species: 'cat', outfit: 'tee:blue' }, LIBRARY)).toThrow('unknown variant of outfit tee "blue"');
    const noEye = { ...LIBRARY, species: { cat: { ...(LIBRARY.species.cat as SpeciesDef), palette: { fur: '#ffffff' } } } };
    expect(() => composeCharacter({ species: 'cat' }, noEye as unknown as CharacterLibrary)).toThrow(/no colour for slot\(s\) .*eye/);
  });
});

describe('outfit rules', () => {
  const cat = LIBRARY.species.cat as SpeciesDef;
  const rules = [
    { tags: ['girl', 'festival'], outfit: 'gown' },
    { tags: ['festival'], outfit: 'tee:red' },
  ];

  it('re-dress every character carrying all of a rule’s tags; the first matching rule wins', () => {
    expect(resolveOutfit({ species: 'cat', tags: ['girl', 'festival'] }, cat, rules)).toBe('gown');
    expect(resolveOutfit({ species: 'cat', tags: ['boy', 'festival'] }, cat, rules)).toBe('tee:red');
  });

  it('leave everyone else in their own outfit, or the species default', () => {
    expect(resolveOutfit({ species: 'cat', outfit: 'gown', tags: ['girl'] }, cat, rules)).toBe('gown');
    expect(resolveOutfit({ species: 'cat' }, cat, rules)).toBe('tee');
  });

  it('dress a whole crowd at once when composing', () => {
    const crowd = Array.from({ length: 100 }, (_, i) => ({ species: i % 2 ? 'cat' : 'bear', tags: i % 3 === 0 ? ['festival'] : [] }));
    const worn = crowd.map((recipe) => composeCharacter(recipe, LIBRARY, rules).outfit);
    expect(worn.filter((o) => o === 'tee:red')).toHaveLength(crowd.filter((r) => r.tags.includes('festival')).length);
    expect(new Set(worn.filter((_, i) => !crowd[i]?.tags.includes('festival')))).toEqual(new Set(['tee', 'gown']));
  });
});
