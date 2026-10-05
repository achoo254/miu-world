import { afterAll, beforeAll, describe, expect, it } from 'vitest';
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

  it('rejects unknown recipe', async () => {
    const { agent } = await playingChild();
    await agent.post('/api/cooking/cook').send({ recipeId: 'unknown-dish' }).expect(404, { error: 'recipe-not-found' });
  });
});
