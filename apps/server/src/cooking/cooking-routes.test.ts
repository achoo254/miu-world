import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { shopInventory } from '../db/schema';
import { CookResponse } from './cooking-routes';
import { createTestApp, parentWithChild, type Agent, type TestApp } from '../../test/test-app';

let app: TestApp;
beforeAll(async () => {
  app = await createTestApp();
});
afterAll(async () => {
  await app.handle.close();
});

async function playingChild(): Promise<{ agent: Agent; childId: string }> {
  const { agent, childId } = await parentWithChild(app);
  await agent.post(`/api/players/${childId}/select`).expect(200);
  return { agent, childId };
}

describe('cooking routes', () => {
  it('lists available cooking recipes', async () => {
    const { agent } = await playingChild();
    const res = await agent.get('/api/cooking/recipes').expect(200);
    expect(res.body.recipes).toBeDefined();
    expect(res.body.recipes.length).toBeGreaterThanOrEqual(10);
    expect(res.body.recipes[0].name).toBeTruthy();
    expect(res.body.recipes[0].ingredients.length).toBeGreaterThanOrEqual(1);
  });

  it('cooks a recipe and adds the dish to inventory', async () => {
    const { agent } = await playingChild();
    const res = await agent.post('/api/cooking/cook').send({ recipeId: 'banh-mi-trung-op-la' }).expect(200);
    const body = CookResponse.parse(res.body);
    expect(body.recipe.id).toBe('banh-mi-trung-op-la');
    expect(body.cookedItem.id).toBe('banh-mi-trung-op-la');
    expect(body.cookedItem.qty).toBe(1);
    expect(body.message).toContain('Bánh mì trứng ốp la');
  });

  it('loses no dish and no ingredient when she cooks several times at once', async () => {
    const { agent, childId } = await playingChild();
    // Enough rice for two dishes (two ears each), one egg; far more cooks at once than that.
    await app.db.insert(shopInventory).values([
      { childId, itemId: 'bong-lua-vang', qty: 4 },
      { childId, itemId: 'trung-ga-ta', qty: 1 },
    ]);
    const times = 12;
    const cooks = await Promise.all(Array.from({ length: times }, () => agent.post('/api/cooking/cook').send({ recipeId: 'banh-mi-trung-op-la' })));
    expect(cooks.filter((r) => r.status === 200)).toHaveLength(times);
    const qty = async (itemId: string) =>
      (await app.db.select({ qty: shopInventory.qty }).from(shopInventory).where(and(eq(shopInventory.childId, childId), eq(shopInventory.itemId, itemId))))[0]?.qty;
    expect(await qty('banh-mi-trung-op-la')).toBe(times);
    expect(await qty('bong-lua-vang')).toBe(0);
    expect(await qty('trung-ga-ta')).toBe(0);
  });

  it('rejects unknown recipe', async () => {
    const { agent } = await playingChild();
    await agent.post('/api/cooking/cook').send({ recipeId: 'unknown-dish' }).expect(404, { error: 'recipe-not-found' });
  });
});
