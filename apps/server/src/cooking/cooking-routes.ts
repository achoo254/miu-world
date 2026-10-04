import { and, eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { ContentId } from '@miu/schema/content';
import { type Recipe } from '@miu/schema/cooking';
import { activeChildId, requireParent } from '../auth/auth-context';
import type { ContentCatalog } from '../content/content-catalog';
import type { Db } from '../db/client';
import { inventoryItems, shopInventory } from '../db/schema';
import { HttpError, parseInput } from '../http-error';

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
    const childId = await activeChildId(db, res, content.consent.version);
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

  /** Cook a delicious dish using ingredients from inventory */
  router.post('/cooking/cook', requireParent, async (req, res) => {
    const childId = await activeChildId(db, res, content.consent.version);
    const { recipeId } = parseInput(CookRequest, req.body);
    const recipe = content.recipes.get(recipeId);
    if (!recipe) throw new HttpError(404, 'recipe-not-found');

    // Check ingredients
    const inv = await db.select().from(inventoryItems).where(eq(inventoryItems.childId, childId));
    const shopInv = await db.select().from(shopInventory).where(eq(shopInventory.childId, childId));

    const available: Record<string, number> = {};
    for (const item of inv) available[item.itemId] = (available[item.itemId] ?? 0) + item.qty;
    for (const item of shopInv) available[item.itemId] = (available[item.itemId] ?? 0) + item.qty;

    // Deduct ingredients if child owns them
    for (const ing of recipe.ingredients) {
      const ownedQty = available[ing.itemId] ?? 0;
      if (ownedQty > 0) {
        // deduct from inventoryItems or shopInventory
        const inShop = shopInv.find((s) => s.itemId === ing.itemId && s.qty > 0);
        if (inShop) {
          const deduct = Math.min(inShop.qty, ing.qty);
          await db
            .update(shopInventory)
            .set({ qty: inShop.qty - deduct })
            .where(and(eq(shopInventory.childId, childId), eq(shopInventory.itemId, ing.itemId)));
        }
      }
    }

    // Add cooked dish to shop_inventory
    const [existing] = await db
      .select()
      .from(shopInventory)
      .where(and(eq(shopInventory.childId, childId), eq(shopInventory.itemId, recipe.resultItemId)));

    if (existing) {
      await db
        .update(shopInventory)
        .set({ qty: existing.qty + recipe.resultQty })
        .where(and(eq(shopInventory.childId, childId), eq(shopInventory.itemId, recipe.resultItemId)));
    } else {
      await db
        .insert(shopInventory)
        .values({ childId, itemId: recipe.resultItemId, qty: recipe.resultQty });
    }

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
