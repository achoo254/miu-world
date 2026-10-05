import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CARE_XP, CARE_XP_GAP_MS, WALK_BEAT_SECONDS, WALK_SECONDS_PER_XP } from '@miu/quest/pet-bond';
import { PET_LEVEL_XP, PET_STAT_FLOOR, PetBondChange, PetBondResponse, PetCareStatusResponse, type PetBond } from '@miu/schema/pet-care';
import { CharacterDto } from '@miu/schema/game';
import { petBonds, shopInventory } from '../db/schema';
import { CharacterEvents } from '../character/character-events';
import { createTestApp, parentWithChild, type Agent, type TestApp } from '../../test/test-app';

let app: TestApp;
const saved: Array<{ childId: string; petGear: string[] }> = [];
beforeAll(async () => {
  const characterEvents = new CharacterEvents();
  characterEvents.on((childId, character) => saved.push({ childId, petGear: character.petGear ?? [] }));
  app = await createTestApp(undefined, undefined, undefined, undefined, { characterEvents });
});
afterAll(async () => {
  await app.handle.close();
});

async function childWithPet(pet: string | null = 'meo-xam'): Promise<{ agent: Agent; childId: string }> {
  const { agent, childId } = await parentWithChild(app);
  await agent.post(`/api/players/${childId}/select`).expect(200);
  if (pet) await agent.put('/api/character').send({ name: 'Miu', equipped: [], pet }).expect(200);
  return { agent, childId };
}

async function bondOf(agent: Agent): Promise<PetBond> {
  const status = PetCareStatusResponse.parse((await agent.get('/api/character/pet/care').expect(200)).body);
  if (!status.hasPet) throw new Error('expected a pet');
  return status.bond;
}

const care = async (agent: Agent, body: object): Promise<PetBondChange> => PetBondChange.parse((await agent.post('/api/character/pet/care').send(body).expect(200)).body);

describe('pet care', () => {
  it('has nothing to care for without a pet, and refuses every change', async () => {
    const { agent } = await childWithPet(null);
    expect(PetCareStatusResponse.parse((await agent.get('/api/character/pet/care').expect(200)).body)).toEqual({ hasPet: false, petId: null });
    for (const [method, url, body] of [
      ['post', '/api/character/pet/care', { action: 'pet' }],
      ['post', '/api/character/pet/walk', {}],
      ['post', '/api/character/pet/trick', { trick: 'sit' }],
      ['put', '/api/character/pet/name', { name: 'Bông' }],
      ['put', '/api/character/pet/gear', { gear: [] }],
    ] as const) {
      expect((await agent[method](url).send(body).expect(400)).body).toEqual({ error: 'no-pet-equipped' });
    }
  });

  it('starts a new pet content and at level 1 with its first trick', async () => {
    const { agent } = await childWithPet();
    const bond = await bondOf(agent);
    expect(bond).toMatchObject({ name: null, level: 1, xp: 0, levelXp: 0, nextLevelXp: PET_LEVEL_XP[1], tricks: ['sit'], gear: [] });
    expect(bond.stats.happiness).toBeGreaterThan(PET_STAT_FLOOR);
  });

  it('lifts the need each care answers and pays bond XP once per gap, whatever the client sends', async () => {
    const { agent } = await childWithPet();
    const fed = await care(agent, { action: 'feed' });
    expect(fed.xpGained).toBe(CARE_XP);
    expect(fed.bond.stats.fullness).toBe(100);
    // A second tap at once: the scene plays, nothing more is paid.
    const again = await care(agent, { action: 'feed' });
    expect(again.xpGained).toBe(0);
    expect(again.bond.xp).toBe(CARE_XP);
    // Another care is its own: it pays.
    expect((await care(agent, { action: 'bath' })).xpGained).toBe(CARE_XP);
    app.advance(CARE_XP_GAP_MS);
    expect((await care(agent, { action: 'feed' })).xpGained).toBe(CARE_XP);
    // Numbers in the body are not the client's to set.
    await agent.post('/api/character/pet/care').send({ action: 'pet', xp: 9999 }).expect(400);
    await agent.post('/api/character/pet/care').send({ action: 'sleep' }).expect(400);
    expect((await bondOf(agent)).xp).toBe(3 * CARE_XP);
  });

  it('pays once for a burst of taps sent together', async () => {
    const { agent } = await childWithPet();
    const results = await Promise.all(Array.from({ length: 5 }, () => agent.post('/api/character/pet/care').send({ action: 'pet' })));
    expect(results.map((r) => r.status)).toEqual([200, 200, 200, 200, 200]);
    expect((await bondOf(agent)).xp).toBe(CARE_XP);
  });

  it('lets needs drift down while she is away, never below the cheerful floor', async () => {
    const { agent, childId } = await childWithPet();
    await care(agent, { action: 'feed' });
    // Her last care, hours and then weeks ago (the bond row's clock moved back rather than the session's forward).
    const away = async (hours: number): Promise<void> => {
      await app.db.update(petBonds).set({ statsAt: new Date(Date.now() - hours * 3_600_000) }).where(eq(petBonds.childId, childId));
    };
    await away(4);
    expect((await bondOf(agent)).stats.fullness).toBe(100 - 12);
    await away(60 * 24);
    expect((await bondOf(agent)).stats).toEqual({ happiness: PET_STAT_FLOOR, fullness: PET_STAT_FLOOR, cleanliness: PET_STAT_FLOOR });
  });

  it('counts walks together by the server clock and opens tricks with the level', async () => {
    const { agent, childId } = await childWithPet();
    const first = PetBondChange.parse((await agent.post('/api/character/pet/walk').send({ seconds: 99999 }).expect(200)).body);
    expect(first.xpGained).toBe(WALK_BEAT_SECONDS / WALK_SECONDS_PER_XP);
    // Reports faster than the clock count nothing more.
    const spam = PetBondChange.parse((await agent.post('/api/character/pet/walk').send({}).expect(200)).body);
    expect(spam.xpGained).toBe(0);
    await agent.post('/api/character/pet/trick').send({ trick: 'spin' }).expect(403, { error: 'trick-locked' });
    // Care just short of level 2 (with the minute walked, one bond XP short): the next half minute opens spin, as news once.
    await app.db.update(petBonds).set({ careXp: (PET_LEVEL_XP[1] ?? 0) - 3 }).where(and(eq(petBonds.childId, childId), eq(petBonds.petId, 'meo-xam')));
    app.advance(30_000);
    const walked = PetBondChange.parse((await agent.post('/api/character/pet/walk').send({}).expect(200)).body);
    expect(walked).toMatchObject({ levelUp: true, unlocked: ['spin'] });
    expect(walked.bond.tricks).toEqual(['sit', 'spin']);
    const spun = PetBondResponse.parse((await agent.post('/api/character/pet/trick').send({ trick: 'spin' }).expect(200)).body);
    expect(spun.bond.level).toBe(2);
    await agent.post('/api/character/pet/trick').send({ trick: 'fly' }).expect(400);
  });

  it('names the pet only from the list, and back to its own name', async () => {
    const { agent } = await childWithPet();
    expect(PetBondResponse.parse((await agent.put('/api/character/pet/name').send({ name: 'Bông' }).expect(200)).body).bond.name).toBe('Bông');
    expect((await agent.put('/api/character/pet/name').send({ name: 'Nguyễn Văn A' }).expect(400)).body).toEqual({ error: 'invalid-pet-name' });
    expect((await bondOf(agent)).name).toBe('Bông');
    expect(PetBondResponse.parse((await agent.put('/api/character/pet/name').send({ name: null }).expect(200)).body).bond.name).toBeNull();
  });

  it('dresses the pet only in gear she bought, one per place, and tells the others', async () => {
    const { agent, childId } = await childWithPet();
    await agent.put('/api/character/pet/gear').send({ gear: ['pet-bow-pink'] }).expect(403, { error: 'gear-not-owned' });
    await app.db.insert(shopInventory).values([
      { childId, itemId: 'pet-bow-pink', qty: 1 },
      { childId, itemId: 'pet-crown', qty: 1 },
      { childId, itemId: 'pet-collar-bell', qty: 1 },
    ]);
    await agent.put('/api/character/pet/gear').send({ gear: ['pet-bow-pink', 'pet-crown'] }).expect(400, { error: 'invalid-pet-gear' });
    await agent.put('/api/character/pet/gear').send({ gear: ['pet-cape'] }).expect(400, { error: 'invalid-pet-gear' });
    const worn = PetBondResponse.parse((await agent.put('/api/character/pet/gear').send({ gear: ['pet-bow-pink', 'pet-collar-bell'] }).expect(200)).body);
    expect(worn.bond.gear).toEqual(['pet-bow-pink', 'pet-collar-bell']);
    expect(saved.at(-1)).toEqual({ childId, petGear: ['pet-bow-pink', 'pet-collar-bell'] });
    expect(CharacterDto.parse((await agent.get('/api/character').expect(200)).body).petGear).toEqual(['pet-bow-pink', 'pet-collar-bell']);
    // Another pet wears the same gear; saving the character leaves it on.
    await agent.put('/api/character').send({ name: 'Miu', equipped: [], pet: 'cun-con' }).expect(200);
    expect((await bondOf(agent)).gear).toEqual(['pet-bow-pink', 'pet-collar-bell']);
  });

  it('feeds a cooked dish only when she has one, and uses it up', async () => {
    const { agent, childId } = await childWithPet();
    const dish = [...app.content.recipes.values()][0];
    if (!dish) throw new Error('fixture content has no recipe');
    await agent.post('/api/character/pet/care').send({ action: 'feed', itemId: dish.resultItemId }).expect(409, { error: 'not-owned' });
    await agent.post('/api/character/pet/care').send({ action: 'bath', itemId: dish.resultItemId }).expect(400, { error: 'invalid-item' });
    await app.db.insert(shopInventory).values({ childId, itemId: dish.resultItemId, qty: 1 });
    await care(agent, { action: 'feed', itemId: dish.resultItemId });
    const [left] = await app.db.select().from(shopInventory).where(and(eq(shopInventory.childId, childId), eq(shopInventory.itemId, dish.resultItemId)));
    expect(left?.qty).toBe(0);
    await agent.post('/api/character/pet/care').send({ action: 'feed', itemId: dish.resultItemId }).expect(409, { error: 'not-owned' });
  });

  it("keeps each player's pet her own, and never another family's (IDOR)", async () => {
    const a = await parentWithChild(app);
    // A second player of the same account (made while the account area is open, before playing).
    const sibling = (await a.agent.post('/api/players').send({ displayName: 'Thỏ Bông' }).expect(201)).body as { id: string };
    await a.agent.post(`/api/players/${a.childId}/select`).expect(200);
    await a.agent.put('/api/character').send({ name: 'Miu', equipped: [], pet: 'meo-xam' }).expect(200);
    await a.agent.post('/api/character/pet/care').send({ action: 'pet' }).expect(200);
    await a.agent.put('/api/character/pet/name').send({ name: 'Mít' }).expect(200);
    await a.agent.post(`/api/players/${sibling.id}/select`).expect(200);
    await a.agent.put('/api/character').send({ name: 'Miu', equipped: [], pet: 'meo-xam' }).expect(200);
    expect(await bondOf(a.agent)).toMatchObject({ name: null, xp: 0 });
    const b = await childWithPet();
    expect(await bondOf(b.agent)).toMatchObject({ name: null, xp: 0 });
    await b.agent.post(`/api/players/${a.childId}/select`).expect(404);
    await a.agent.post(`/api/players/${a.childId}/select`).expect(200);
    expect(await bondOf(a.agent)).toMatchObject({ name: 'Mít', xp: CARE_XP });
    expect(await app.db.select().from(petBonds).where(eq(petBonds.childId, b.childId))).toEqual([]);
  });

  it('needs a signed-in parent with a selected player, and an allowed origin to change anything', async () => {
    await app.agent().get('/api/character/pet/care').expect(401);
    const { agent } = await childWithPet();
    await agent.post('/api/character/pet/care').set('Origin', 'https://evil.example').send({ action: 'pet' }).expect(403);
    expect((await bondOf(agent)).xp).toBe(0);
  });
});
