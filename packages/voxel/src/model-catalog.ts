// The one list of the models the maps place (content/world/models.json): what each stands as. A new
// object is one line there; a change there (its size, its clip, whether it fades in front of the child)
// reaches every map and the land round them. A map may still give a model a size of its own where it means
// a different thing (a toy boat on a stall, a wall clock), named in that map's generator.
import { z } from 'zod';

export const catalogModelSchema = z.strictObject({
  /** Height it stands at, in blocks. */
  height: z.number().positive(),
  /** The clip an animated model plays (villagers and animals: `idle`). */
  clip: z.string().optional(),
  /** Its pivot is a corner (furniture, houses): it is placed by its middle. */
  centred: z.literal(true).optional(),
  /** False: it stays solid even between the camera and the child (it fades by default, like the trees). */
  fade: z.literal(false).optional(),
});
export type CatalogModel = z.infer<typeof catalogModelSchema>;

export const modelCatalogSchema = z.strictObject({
  version: z.literal(1),
  models: z.record(z.string().regex(/^[a-z0-9_./-]+\.glb$/i), catalogModelSchema),
});
export type ModelCatalog = z.infer<typeof modelCatalogSchema>;

/** Whether a placed model fades where it would hide the child (everything does unless the catalog says not). */
export function modelFades(catalog: ModelCatalog, model: string): boolean {
  return catalog.models[model]?.fade !== false;
}
