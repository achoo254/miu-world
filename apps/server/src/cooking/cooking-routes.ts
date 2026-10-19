import { and, eq, gt, sql } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { ContentId } from '@miu/schema/content';
import { type Recipe } from '@miu/schema/cooking';
import { activePlayerId, requireParent } from '../auth/auth-context';
import type { ContentCatalog } from '../content/content-catalog';
import type { Db } from '../db/client';
import { inventoryItems, shopInventory } from '../db/schema';
import { HttpError, parseInput } from '../http-error';
import { lockChild } from '../shop/shop-routes';

export interface CookingRouteDeps {
  db: Db;
  content: ContentCatalog;
  clock?: () => Date;
}

export const CookRequest = z.strictObject({
  recipeId: ContentId,
});
export type CookRequest = z.infer<typeof CookRequest>;

export const CookResponse = z.strictObject({
  recipe: z.custom<Recipe>(),
  cookedItem: z.strictObject({
    id: ContentId,
    name: z.string(),
    qty: z.number().int().positive(),
  }),
  message: z.string(),
});
export type CookResponse = z.infer<typeof CookResponse>;

export function cookingRoutes({ db, content }: CookingRouteDeps): Router {
  const router = Router();

  /** List all cooking recipes and child's available ingredients */
  router.get('/cooking/recipes', requireParent, async (_req, res) => {
    const childId = await activePlayerId(db, res, content.consent.version);
    const inv = await db.select().from(inventoryItems).where(eq(inventoryItems.childId, childId));
    const shopInv = await db.select().from(shopInventory).where(eq(shopInventory.childId, childId));

    const ingredientCounts: Record<string, number> = {};
    for (const item of inv) ingredientCounts[item.itemId] = (ingredientCounts[item.itemId] ?? 0) + item.qty;
    for (const item of shopInv) ingredientCounts[item.itemId] = (ingredientCounts[item.itemId] ?? 0) + item.qty;

    res.json({
      recipes: [...content.recipes.values()],
      ingredients: ingredientCounts,
    });
  });

  /** Cooks a dish: the ingredients she has are used up, and the dish goes into her shop inventory. */
  router.post('/cooking/cook', requireParent, async (req, res) => {
    const childId = await activePlayerId(db, res, content.consent.version);
    const { recipeId } = parseInput(CookRequest, req.body);
    const recipe = content.recipes.get(recipeId);
    if (!recipe) throw new HttpError(404, 'recipe-not-found');

    // Cooking is free (owner decision): she may cook without the ingredients, and any she has in her shop
    // inventory are used up (as many as the recipe takes, never below zero). One transaction with her profile row
    // locked, and every change made in the database (`qty - n`, `qty + n`), so two cooks at once lose no update.
    await db.transaction(async (tx) => {
      await lockChild(tx, childId);
      // Sorted ids: concurrent changes of the same rows always lock them in the same order.
      for (const ing of [...recipe.ingredients].sort((a, b) => a.itemId.localeCompare(b.itemId))) {
        await tx
          .update(shopInventory)
          .set({ qty: sql`greatest(${shopInventory.qty} - ${ing.qty}, 0)` })
          .where(and(eq(shopInventory.childId, childId), eq(shopInventory.itemId, ing.itemId), gt(shopInventory.qty, 0)));
      }
      await tx
        .insert(shopInventory)
        .values({ childId, itemId: recipe.resultItemId, qty: recipe.resultQty })
        .onConflictDoUpdate({ target: [shopInventory.childId, shopInventory.itemId], set: { qty: sql`${shopInventory.qty} + ${recipe.resultQty}` } });
    });

    const response: CookResponse = {
      recipe,
      cookedItem: {
        id: recipe.resultItemId,
        name: recipe.name,
        qty: recipe.resultQty,
      },
      message: `Bé đã nấu thành công món ${recipe.name}! Mùi thơm nức gian bếp nhỏ. ✨🍳`,
    };

    res.json(response);
  });

  return router;
}
