import { z } from 'zod';
import { ContentId } from './content';

export const RecipeIngredient = z.strictObject({
  itemId: ContentId,
  name: z.string().min(1),
  qty: z.number().int().positive(),
});
export type RecipeIngredient = z.infer<typeof RecipeIngredient>;

export const Recipe = z.strictObject({
  id: ContentId,
  name: z.string().min(1),
  /** The dish's name in English (the bilingual display: the pet's feeding choice lists it). */
  en: z.strictObject({ name: z.string().min(1) }).optional(),
  description: z.string().min(1),
  icon: z.string().min(1),
  ingredients: z.array(RecipeIngredient).min(1),
  resultItemId: ContentId,
  resultQty: z.number().int().positive().default(1),
  hungerRestore: z.number().int().min(10).max(100),
  happinessBonus: z.number().int().min(5).max(100),
});
export type Recipe = z.infer<typeof Recipe>;

export const RecipeCatalog = z.strictObject({
  version: z.literal(1),
  recipes: z.array(Recipe).min(1),
});
export type RecipeCatalog = z.infer<typeof RecipeCatalog>;
