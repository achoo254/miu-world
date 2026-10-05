import { randomUUID } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { and, eq, like } from 'drizzle-orm';
import { ShopResponse, ShopState, type ShopItemDto } from '@miu/schema/shop';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TEST_PIN, createTestApp, parentWithChild, type Agent, type TestApp, signedInWithoutPlayer } from '../../test/test-app';
import { childProfiles, rewardLedger, shopInventory } from '../db/schema';
import { loadDecorCatalog } from '../home/home-decor-routes';
import { loadShopCatalog } from './shop-catalog';

let app: TestApp;
let items: ShopItemDto[];
beforeAll(async () => {
  app = await createTestApp();
  items = loadShopCatalog(app.content.accessories, loadDecorCatalog()).items as ShopItemDto[];
});
afterAll(async () => {
  await app.handle.close();
});

/** A listing of the shipped catalogue, picked by what the test needs (so prices can change freely). */
function pick(test: (item: ShopItemDto) => boolean): ShopItemDto {
  const found = items.find(test);
  if (!found) throw new Error('the shop sells nothing like that');
  return found;
}
const wearable = (k = 0): ShopItemDto => items.filter((i) => i.kind === 'wearable' && i.level === null)[k] ?? pick(() => false);
const heart = (): ShopItemDto => pick((i) => i.kind === 'booster' && i.effect !== null && 'lives' in i.effect);
const clock = (): ShopItemDto => pick((i) => i.kind === 'booster' && i.effect !== null && 'seconds' in i.effect);

async function playingChild(): Promise<{ agent: Agent; childId: string }> {
  const { agent, childId } = await parentWithChild(app);
  await agent.post(`/api/players/${childId}/select`).expect(200);
  return { agent, childId };
}

/** Coins (and XP) the child earned, as a quest would have paid them. */
async function earn(childId: string, coins: number, xp = 0): Promise<void> {
  await app.db.insert(rewardLedger).values({ id: randomUUID(), childId, source: `quest:test-${randomUUID()}`, xp, coins });
}

const buy = (agent: Agent, itemId: string, purchaseId: string = randomUUID(), extra: object = {}) => agent.post('/api/shop/buy').send({ itemId, purchaseId, ...extra });

describe('shop', () => {
  it('lists what is for sale with the coins of the ledger, the level and nothing owned yet', async () => {
    const { agent, childId } = await playingChild();
    await earn(childId, 37);
    const body = ShopResponse.parse((await agent.get('/api/shop').expect(200)).body);
    expect(body.coins).toBe(37);
    expect(body.level).toBe(1);
    expect(body.owned).toEqual({});
    expect(body.items.map((i) => i.kind)).toEqual(expect.arrayContaining(['wearable', 'decor', 'booster', 'bundle']));
    expect(body.items.every((i) => i.price >= 50 && i.price <= 500)).toBe(true);
    // The HUD's coins come from the same ledger.
    expect((await agent.get('/api/progress').expect(200)).body).toMatchObject({ coins: 37 });
  });

  it('charges its own price, whatever price the client sends, and the item becomes hers', async () => {
    const { agent, childId } = await playingChild();
    const item = wearable();
    await earn(childId, item.price + 15);
    const res = await buy(agent, item.id, randomUUID(), { price: 1, coins: 9999 }).expect(200);
    expect(ShopState.parse(res.body)).toEqual({ coins: 15, level: 1, owned: { [item.id]: 1 } });
    expect(res.body).toMatchObject({ bought: item.id });
    const rows = await app.db.select().from(rewardLedger).where(and(eq(rewardLedger.childId, childId), like(rewardLedger.source, 'shop:%')));
    expect(rows.map((r) => ({ coins: r.coins, items: r.items }))).toEqual([{ coins: -item.price, items: { [item.id]: 1 } }]);
    expect((await agent.get('/api/progress').expect(200)).body).toMatchObject({ coins: 15 });
  });

  it('refuses a purchase she cannot pay, kindly and without storing anything', async () => {
    const { agent, childId } = await playingChild();
    const item = wearable();
    await earn(childId, item.price - 1);
    expect((await buy(agent, item.id).expect(409)).body).toEqual({ error: 'not-enough-coins' });
    expect(await app.db.select().from(shopInventory).where(eq(shopInventory.childId, childId))).toEqual([]);
    expect((await agent.get('/api/shop').expect(200)).body).toMatchObject({ coins: item.price - 1, owned: {} });
  });

  it('buys once per purchase id: a resent or double-tapped purchase charges nothing more', async () => {
    const { agent, childId } = await playingChild();
    const booster = heart();
    await earn(childId, booster.price * 3);
    const purchaseId = randomUUID();
    const [a, b] = await Promise.all([buy(agent, booster.id, purchaseId), buy(agent, booster.id, purchaseId)]);
    expect([a.status, b.status]).toEqual([200, 200]);
    const again = await buy(agent, booster.id, purchaseId).expect(200);
    expect(again.body).toMatchObject({ coins: booster.price * 2, owned: { [booster.id]: 1 } });
    // The same id for something else is a client bug, not a second purchase.
    expect((await buy(agent, clock().id, purchaseId).expect(409)).body).toEqual({ error: 'purchase-id-reused' });
  });

  it('never spends the same coins twice when purchases race', async () => {
    const { agent, childId } = await playingChild();
    const booster = heart();
    await earn(childId, booster.price * 2 + 10);
    const results = await Promise.all(Array.from({ length: 5 }, () => buy(agent, booster.id)));
    expect(results.map((r) => r.status).sort()).toEqual([200, 200, 409, 409, 409]);
    const state = ShopState.parse((await agent.get('/api/shop').expect(200)).body);
    expect(state).toMatchObject({ coins: 10, owned: { [booster.id]: 2 } });
  });

  it('sells a wearable or a home style once, and minds the level a listing asks for', async () => {
    const { agent, childId } = await playingChild();
    const item = wearable();
    const levelled = pick((i) => i.level !== null);
    await earn(childId, 2000);
    await buy(agent, item.id).expect(200);
    expect((await buy(agent, item.id).expect(409)).body).toEqual({ error: 'already-owned' });
    expect((await buy(agent, levelled.id).expect(403)).body).toEqual({ error: 'shop-level-locked' });
    await earn(childId, 0, 100_000);
    await buy(agent, levelled.id).expect(200);
  });

  it('gives every thing of a bundle, boosters counted, and refuses one holding something she owns', async () => {
    const { agent, childId } = await playingChild();
    const boosters = pick((i) => i.kind === 'bundle' && Object.keys(i.contains ?? {}).every((id) => items.find((x) => x.id === id)?.kind === 'booster'));
    const outfit = pick((i) => i.kind === 'bundle' && Object.keys(i.contains ?? {}).some((id) => items.find((x) => x.id === id)?.kind === 'wearable'));
    await earn(childId, 3000);
    const res = await buy(agent, boosters.id).expect(200);
    expect(res.body).toMatchObject({ owned: boosters.contains });
    const part = Object.keys(outfit.contains ?? {})[0] ?? '';
    await buy(agent, part).expect(200);
    expect((await buy(agent, outfit.id).expect(409)).body).toEqual({ error: 'already-owned' });
  });

  it('refuses unknown items and malformed requests', async () => {
    const { agent } = await playingChild();
    expect((await buy(agent, 'hat-gold-diamond').expect(400)).body).toEqual({ error: 'invalid-item' });
    for (const body of [{}, { itemId: wearable().id }, { itemId: wearable().id, purchaseId: 'abc' }, { itemId: 'Hat X', purchaseId: randomUUID() }]) {
      expect((await agent.post('/api/shop/buy').send(body).expect(400)).body).toEqual({ error: 'invalid-input' });
    }
  });

  it("keeps each family's shop apart (IDOR): another child neither sees nor spends her things", async () => {
    const a = await playingChild();
    const b = await playingChild();
    const item = wearable();
    await earn(a.childId, item.price);
    await buy(a.agent, item.id).expect(200);
    expect((await b.agent.get('/api/shop').expect(200)).body).toMatchObject({ coins: 0, owned: {} });
    expect((await buy(b.agent, item.id).expect(409)).body).toEqual({ error: 'not-enough-coins' });
    await b.agent.post(`/api/players/${a.childId}/select`).expect(404);
    expect((await a.agent.get('/api/shop').expect(200)).body).toMatchObject({ coins: 0, owned: { [item.id]: 1 } });
  });

  it('needs a signed-in parent with a selected child, and an allowed origin to buy', async () => {
    await app.agent().get('/api/shop').expect(401);
    const agent = await signedInWithoutPlayer(app);
    expect((await agent.get('/api/shop').expect(401)).body).toEqual({ error: 'no-active-child' });
    const { agent: playing } = await playingChild();
    await buy(playing.set('Origin', 'https://evil.example'), wearable().id).expect(403);
  });
});

describe('what the shop opens', () => {
  it('lets her wear a shop-only item only once bought', async () => {
    const { agent, childId } = await playingChild();
    const item = wearable();
    const put = () => agent.put('/api/character').send({ name: 'Miu', equipped: [item.id] });
    expect((await put().expect(403)).body).toEqual({ error: 'equipment-locked' });
    await earn(childId, item.price);
    await buy(agent, item.id).expect(200);
    expect((await put().expect(200)).body).toMatchObject({ equipped: [item.id] });
  });

  it('lets her pick a style sold in the shop only once bought; the free styles stay free', async () => {
    const { agent, childId } = await playingChild();
    const style = pick((i) => i.kind === 'decor');
    const slot = style.slot ?? '';
    const pickStyle = () => agent.put('/api/home-decor').send({ choices: { [slot]: style.id } });
    expect((await pickStyle().expect(403)).body).toEqual({ error: 'decor-locked' });
    await earn(childId, style.price);
    await buy(agent, style.id).expect(200);
    expect((await pickStyle().expect(200)).body).toMatchObject({ choices: { [slot]: style.id } });
  });
});

describe('boosters', () => {
  it('uses up one per round id: a resend uses nothing more, and none is used without one owned', async () => {
    const { agent, childId } = await playingChild();
    const booster = clock();
    const use = (useId: string, itemId = booster.id) => agent.post('/api/shop/use').send({ itemId, useId });
    expect((await use(randomUUID()).expect(409)).body).toEqual({ error: 'not-owned' });
    await earn(childId, booster.price * 2);
    await buy(agent, booster.id).expect(200);
    await buy(agent, booster.id).expect(200);
    const round = randomUUID();
    const [first, resent] = await Promise.all([use(round), use(round)]);
    expect([first.status, resent.status]).toEqual([200, 200]);
    expect((await use(round).expect(200)).body).toMatchObject({ owned: { [booster.id]: 1 } });
    expect((await use(round, heart().id).expect(409)).body).toEqual({ error: 'use-id-reused' });
    await use(randomUUID()).expect(200);
    expect((await use(randomUUID()).expect(409)).body).toEqual({ error: 'not-owned' });
    expect((await agent.get('/api/shop').expect(200)).body).toMatchObject({ owned: {} });
    expect((await agent.post('/api/shop/use').send({ itemId: wearable().id, useId: randomUUID() }).expect(400)).body).toEqual({ error: 'invalid-item' });
  });
});

describe("the child's data", () => {
  it('is in the family export and goes with the profile', async () => {
    const { agent, childId } = await playingChild();
    const item = wearable();
    await earn(childId, item.price);
    await buy(agent, item.id).expect(200);
    await agent.post('/api/parent-gate/unlock').send({ pin: TEST_PIN }).expect(200);
    const exported = (await agent.get('/api/account/export').expect(200)).body as { players: Array<{ shop: unknown; rewards: Array<{ source: string; coins: number }> }> };
    expect(exported.players[0]?.shop).toEqual([{ itemId: item.id, qty: 1 }]);
    expect(exported.players[0]?.rewards).toEqual(expect.arrayContaining([expect.objectContaining({ coins: -item.price, source: expect.stringMatching(/^shop:/) as unknown })]));
    // The primary player goes only with the account.
    await agent.delete('/api/account').expect(204);
    expect(await app.db.select().from(childProfiles).where(eq(childProfiles.id, childId))).toEqual([]);
    expect(await app.db.select().from(shopInventory).where(eq(shopInventory.childId, childId))).toEqual([]);
    expect(await app.db.select().from(rewardLedger).where(eq(rewardLedger.childId, childId))).toEqual([]);
  });
});

describe('shop catalogue', () => {
  it('fails loudly when it sells something the content does not have', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'miu-shop-'));
    mkdirSync(path.join(dir, 'shop'));
    writeFileSync(path.join(dir, 'shop/phu-kien.json'), JSON.stringify({ category: 'phu-kien', items: [{ kind: 'wearable', id: 'hat-gold-diamond', price: 100 }] }));
    expect(() => loadShopCatalog(app.content.accessories, loadDecorCatalog(), dir)).toThrow(/hat-gold-diamond is not a wearable/);
  });
});
