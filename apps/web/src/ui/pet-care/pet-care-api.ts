// The pet's care calls (apps/server/src/pet-care): what she did goes up, the server's numbers come back.
import { z } from 'zod';
import { ContentId } from '@miu/schema/content';
import { PetBondChange, PetBondResponse, PetCareStatusResponse, type PetCareAction, type PetTrick } from '@miu/schema/pet-care';
import { api } from '../api-client';
import type { Bilingual } from '../i18n/i18n';

export const loadPetCare = (): Promise<PetCareStatusResponse> => api('GET', '/character/pet/care', PetCareStatusResponse);

/** A care button; feeding may give a dish she cooked (`itemId`), which the server checks she owns and uses up. */
export const careForPet = (action: PetCareAction, itemId?: string): Promise<PetBondChange> =>
  api('POST', '/character/pet/care', PetBondChange, itemId === undefined ? { action } : { action, itemId });

export const askTrick = (trick: PetTrick): Promise<PetBondResponse> => api('POST', '/character/pet/trick', PetBondResponse, { trick });

export const namePet = (name: string | null): Promise<PetBondResponse> => api('PUT', '/character/pet/name', PetBondResponse, { name });

export const dressPet = (gear: readonly string[]): Promise<PetBondResponse> => api('PUT', '/character/pet/gear', PetBondResponse, { gear });

/** A minute walked together (the server counts it by its own clock; the body says nothing). */
export function reportPetWalk(): Promise<void> {
  return api('POST', '/character/pet/walk', PetBondChange, {}).then(() => undefined);
}

/** The kitchen's list as the feeding choice reads it: each recipe's dish and its names, and what she holds of each. */
const KitchenResponse = z.object({
  recipes: z.array(z.object({ name: z.string(), en: z.object({ name: z.string() }).optional(), resultItemId: ContentId })),
  ingredients: z.record(z.string(), z.number()),
});

/** A dish she cooked and still has, to feed her pet. */
export interface CookedDish {
  itemId: string;
  name: Bilingual;
  qty: number;
}

/** The dishes she cooked and still has (none when the kitchen cannot be read: feeding falls back to the pet's own food). */
export async function loadCookedDishes(): Promise<CookedDish[]> {
  try {
    const kitchen = await api('GET', '/cooking/recipes', KitchenResponse);
    const seen = new Set<string>();
    return kitchen.recipes.flatMap((recipe): CookedDish[] => {
      const qty = kitchen.ingredients[recipe.resultItemId] ?? 0;
      if (qty <= 0 || seen.has(recipe.resultItemId)) return [];
      seen.add(recipe.resultItemId);
      return [{ itemId: recipe.resultItemId, name: { vi: recipe.name, en: recipe.en?.name ?? recipe.name }, qty }];
    });
  } catch {
    return [];
  }
}
