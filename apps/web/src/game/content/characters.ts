// The species a child can pick (content/species.json) and the built character each one plays as
// (content/characters.json: a recipe per character). A new species is data only: its recipe, a
// characters.json line and its generated model; nothing here changes.
import { z } from 'zod';
import { speciesSchema } from '@miu/voxel/character-recipe';
import charactersJson from '../../../../../content/characters.json';
import speciesJson from '../../../../../content/species.json';

export interface SpeciesChoice {
  readonly id: string;
  readonly name: string;
  readonly trait: string;
}

export interface CharacterModel {
  /** characters.json key; also the prefix of its review renders. */
  readonly id: string;
  /** Manifest path of the GLB. */
  readonly output: string;
  /** Accessory size per attach node for this body. */
  readonly accessoryScale: Readonly<Record<string, number>>;
  /** Clothes item worn when the child has chosen none: the species' own look (the model has a plain fur layer). */
  readonly clothes?: string;
}

const Characters = z.record(
  z.string(),
  z.object({
    output: z.string(),
    role: z.enum(['player', 'npc']).default('player'),
    recipe: z.object({ species: z.string() }).optional(),
    accessoryScale: z.record(z.string(), z.number()).default({}),
    clothes: z.string().optional(),
  }),
);

/** In content order: the Character Creator shows them in this order. */
export const SPECIES: readonly SpeciesChoice[] = Object.entries(z.record(z.string(), speciesSchema).parse(speciesJson)).map(([id, s]) => ({
  id,
  name: s.name,
  trait: s.trait,
}));

/** The species a character starts as (the column default on the server). */
export const DEFAULT_SPECIES = 'cat';

const bySpecies = new Map<string, CharacterModel>();
for (const [id, spec] of Object.entries(Characters.parse(charactersJson))) {
  // Quest NPCs (`role: npc`) share the species' recipe but are never what a child plays as.
  if (spec.recipe && spec.role === 'player') {
    bySpecies.set(spec.recipe.species, { id, output: spec.output, accessoryScale: spec.accessoryScale, clothes: spec.clothes });
  }
}
for (const s of SPECIES) if (!bySpecies.has(s.id)) throw new Error(`content/characters.json has no character for species ${s.id}`);

/** The model a species plays as; an unknown species (older data) falls back to the default one. */
export function characterForSpecies(species: string): CharacterModel {
  const model = bySpecies.get(species) ?? bySpecies.get(DEFAULT_SPECIES);
  if (!model) throw new Error(`no character for species ${species}`);
  return model;
}
