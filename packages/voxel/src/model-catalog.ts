// The one list of the models the maps place (content/world/models.json): what each stands as. A new
// object is one line there; a change there (its size, its clip, whether it fades in front of the child)
// reaches every map and the land round them. A map may still give a model a size of its own where it means
// a different thing (a toy boat on a stall, a wall clock), named in that map's generator.
import { z } from 'zod';
import { TRAVERSALS, type Traversal } from './traversal';

/** A point in the model's own frame (its units, before the map scales it; its pivot at 0). */
const modelPoint = z.tuple([z.number(), z.number(), z.number()]);
/** Degrees about the up axis in the model's own frame: 0 is its +z, 90 its +x, 180 its -z. */
const modelHeading = z.number().min(-360).max(360);

export const catalogModelSchema = z.strictObject({
  /** Height it stands at, in blocks. */
  height: z.number().positive(),
  /** The clip an animated model plays (villagers and animals: `idle`). */
  clip: z.string().optional(),
  /** Its pivot is a corner (furniture, houses): it is placed by its middle. */
  centred: z.literal(true).optional(),
  /** False: it stays solid even between the camera and the child (it fades by default, like the trees). */
  fade: z.literal(false).optional(),
  /**
   * How the child gets past it (traversal.ts; default `auto-step`): `walk-through` for plants, rugs and the
   * villagers and animals standing as scenery, `blocking` for fences, doors, railings and big rocks.
   */
  traversal: z.enum(TRAVERSALS).optional(),
  /** Which way its front faces (a seat, a screen, a door), when that is not +z. */
  front: modelHeading.optional(),
  /**
   * Where a child sitting on it rests her hips (on top of the seat, a little back from its middle), facing its
   * `front` unless the seat says otherwise; one per place on a bench or a sofa. A seat on a moving part (a
   * swing's) names the part and the point it swings about, as the part's model has it.
   */
  seats: z
    .array(z.strictObject({ at: modelPoint, facing: modelHeading.optional(), part: z.string().regex(/^[a-z0-9-]+$/).optional(), pivot: modelPoint.optional() }))
    .min(1)
    .optional(),
  /** Where a child lies on it: the middle of the mattress's top, and which way her feet point. */
  lie: z.strictObject({ at: modelPoint, feet: modelHeading }).optional(),
  /** Its screen (a television, a computer): the middle of the glass and its width and height, facing `front`. */
  screen: z.strictObject({ at: modelPoint, size: z.tuple([z.number().positive(), z.number().positive()]) }).optional(),
});
export type CatalogModel = z.infer<typeof catalogModelSchema>;
export type CatalogSeat = NonNullable<CatalogModel['seats']>[number];

export const modelCatalogSchema = z.strictObject({
  version: z.literal(1),
  models: z.record(z.string().regex(/^[a-z0-9_./-]+\.glb$/i), catalogModelSchema),
});
export type ModelCatalog = z.infer<typeof modelCatalogSchema>;

/** Whether a placed model fades where it would hide the child (everything does unless the catalog says not). */
export function modelFades(catalog: ModelCatalog, model: string): boolean {
  return catalog.models[model]?.fade !== false;
}

/** How the child gets past a placed model (traversal.ts): its catalog entry's, else `auto-step`. */
export function modelTraversal(catalog: ModelCatalog, model: string): Traversal {
  return catalog.models[model]?.traversal ?? 'auto-step';
}
