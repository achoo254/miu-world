import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MAX_HOME_OBJECT_STATES } from '@miu/schema/home-objects';
import { createTestApp, parentWithChild, signedInWithoutPlayer, type Agent, type TestApp } from '../../test/test-app';
import { homeObjects } from '../db/schema';

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

const LAMP = 'lamp-toggle@lamp#0';
const TV = 'tv-watch@77,14,61';
const WARDROBE = 'wardrobe-pick@wardrobe#0';

describe('home objects', () => {
  it('starts with nothing switched on, then keeps exactly the set last saved', async () => {
    const { agent } = await playingChild();
    expect((await agent.get('/api/home-objects').expect(200)).body).toEqual({ states: {} });
    expect((await agent.put('/api/home-objects').send({ states: { [LAMP]: true, [TV]: true } }).expect(200)).body).toEqual({ states: { [LAMP]: true, [TV]: true } });
    // The television switched off, the wardrobe opened: the whole set is replaced.
    await agent.put('/api/home-objects').send({ states: { [LAMP]: true, [WARDROBE]: true } }).expect(200);
    expect((await agent.get('/api/home-objects').expect(200)).body).toEqual({ states: { [LAMP]: true, [WARDROBE]: true } });
    await agent.put('/api/home-objects').send({ states: {} }).expect(200);
    expect((await agent.get('/api/home-objects').expect(200)).body).toEqual({ states: {} });
  });

  it('belongs to the selected player: another player of the account starts with her own home as built', async () => {
    const { agent, childId } = await parentWithChild(app);
    const sibling = await agent.post('/api/players').send({ displayName: 'Thỏ Bông' }).expect(201);
    await agent.post(`/api/players/${childId}/select`).expect(200);
    await agent.put('/api/home-objects').send({ states: { [LAMP]: true } }).expect(200);
    await agent.post(`/api/players/${(sibling.body as { id: string }).id}/select`).expect(200);
    expect((await agent.get('/api/home-objects').expect(200)).body).toEqual({ states: {} });
  });

  it("never shows or changes another family's home (IDOR)", async () => {
    const a = await playingChild();
    await a.agent.put('/api/home-objects').send({ states: { [LAMP]: true } }).expect(200);
    const b = await playingChild();
    expect((await b.agent.get('/api/home-objects').expect(200)).body).toEqual({ states: {} });
    await b.agent.put('/api/home-objects').send({ states: { [TV]: true } }).expect(200);
    await b.agent.post(`/api/players/${a.childId}/select`).expect(404);
    expect((await a.agent.get('/api/home-objects').expect(200)).body).toEqual({ states: { [LAMP]: true } });
  });

  it('refuses anything malformed or too big, storing none of it', async () => {
    const { agent, childId } = await playingChild();
    const tooMany = Object.fromEntries(Array.from({ length: MAX_HOME_OBJECT_STATES + 1 }, (_, i) => [`lamp-toggle@${i},1,1`, true]));
    const bad: unknown[] = [
      { states: { [LAMP]: false } },
      { states: { 'Lamp Toggle@1': true } },
      { states: { 'lamp-toggle': true } },
      { states: { [`lamp-toggle@${'x'.repeat(90)}`]: true } },
      { states: { [LAMP]: 'on' } },
      { states: tooMany },
      { states: {}, extra: true },
      { [LAMP]: true },
      [],
    ];
    for (const body of bad) expect((await agent.put('/api/home-objects').send(body as object).expect(400)).body).toEqual({ error: 'invalid-input' });
    expect(await app.db.select().from(homeObjects).where(eq(homeObjects.childId, childId))).toEqual([]);
  });

  it('needs a signed-in parent with a selected player, and an allowed origin to save', async () => {
    await app.agent().get('/api/home-objects').expect(401);
    const agent = await signedInWithoutPlayer(app);
    expect((await agent.put('/api/home-objects').send({ states: {} }).expect(401)).body).toEqual({ error: 'no-active-child' });
    const { agent: playing } = await playingChild();
    await playing.put('/api/home-objects').set('Origin', 'https://evil.example').send({ states: { [LAMP]: true } }).expect(403);
  });
});
