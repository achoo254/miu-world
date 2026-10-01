import { describe, expect, it } from 'vitest';
import { SPECIES_ART } from '../../ui/kit/ui-art';
import { characterForSpecies, SPECIES } from './characters';

describe('playable characters', () => {
  it('plays every species as its own character, never as a quest NPC of the same species', () => {
    expect(characterForSpecies('cat').id).toBe('miu-cat');
    for (const s of SPECIES) expect(characterForSpecies(s.id).id).not.toMatch(/^npc-/);
    for (const art of Object.values(SPECIES_ART)) expect(art.idle).not.toMatch(/\/npc-/);
  });
});
