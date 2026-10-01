// Pet catalogue (content/pets.json): the little companions a child may pick in the Character Creator,
// which then trot after the character in the world. A new pet is a new entry (a model from a licensed
// pack); the creator, the server check and the game read this list.
import { z } from 'zod';
import { ContentId } from './content';

export const Pet = z.strictObject({
  id: ContentId,
  /** What the child reads on its tile, e.g. "Cún con". */
  name: z.string().min(1),
  /** Manifest path of its model (Kenney Cube Pets): clips `idle`, `walk`, `run`, `dance`. */
  model: z.string().regex(/^packs\/.+\.glb$/),
  /** World size relative to the model (the pets stand knee-high to the character). */
  scale: z.number().positive().max(2),
});
export type Pet = z.infer<typeof Pet>;

export const PetCatalog = z
  .strictObject({ version: z.literal(1), pets: z.array(Pet).min(1) })
  .refine((c) => new Set(c.pets.map((p) => p.id)).size === c.pets.length, { message: 'duplicate pet id' });
export type PetCatalog = z.infer<typeof PetCatalog>;

export { petArtPath } from './pet-art';
