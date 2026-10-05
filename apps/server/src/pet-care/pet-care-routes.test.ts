import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PetCareResponse, PetCareStatusResponse } from '@miu/schema/pet-care';
import { createTestApp, parentWithChild, type Agent, type TestApp } from '../../test/test-app';

let app: TestApp;
beforeAll(async () => {
  app = await createTestApp();
});
afterAll(async () => {
  await app.handle.close();
});

async function childWithPet(pet: string | null = 'meo-xam'): Promise<{ agent: Agent; childId: string }> {
  const { agent, childId } = await parentWithChild(app);
  await agent.post(`/api/players/${childId}/select`).expect(200);
  if (pet) {
    await agent.put('/api/character').send({ name: 'Miu', equipped: [], pet }).expect(200);
  }
  return { agent, childId };
}

describe('pet care routes', () => {
  it('returns hasPet: false when child has no pet equipped', async () => {
    const { agent } = await childWithPet(null);
    const res = await agent.get('/api/character/pet/care').expect(200);
    const body = PetCareStatusResponse.parse(res.body);
    expect(body.hasPet).toBe(false);
    expect(body.petId).toBeNull();
  });

  it('returns pet care status and friendship tier for equipped pet', async () => {
    const { agent } = await childWithPet('meo-xam');
    const res = await agent.get('/api/character/pet/care').expect(200);
    const body = PetCareStatusResponse.parse(res.body);
    expect(body.hasPet).toBe(true);
    expect(body.petId).toBe('meo-xam');
    expect(body.stats).toBeDefined();
    expect(body.stats?.happiness).toBeGreaterThanOrEqual(0);
    expect(body.stats?.fullness).toBeGreaterThanOrEqual(0);
    expect(body.stats?.cleanliness).toBeGreaterThanOrEqual(0);
    expect(body.friendshipTier).toBeGreaterThanOrEqual(1);
    expect(body.title).toBeTruthy();
  });

  it('rejects action if child has no pet', async () => {
    const { agent } = await childWithPet(null);
    await agent.post('/api/character/pet/care').send({ action: 'pet' }).expect(400, { error: 'no-pet-equipped' });
  });

  it('performs petting action and increases happiness', async () => {
    const { agent } = await childWithPet('meo-xam');
    const before = (await agent.get('/api/character/pet/care').expect(200)).body as PetCareStatusResponse;
    const res = await agent.post('/api/character/pet/care').send({ action: 'pet' }).expect(200);
    const body = PetCareResponse.parse(res.body);
    expect(body.emote).toBe('love');
    expect(before.stats).toBeDefined();
    if (before.stats) {
      expect(body.stats.happiness).toBeGreaterThanOrEqual(before.stats.happiness);
    }
  });

  it('performs bath action and increases cleanliness', async () => {
    const { agent } = await childWithPet('meo-xam');
    const res = await agent.post('/api/character/pet/care').send({ action: 'bath' }).expect(200);
    const body = PetCareResponse.parse(res.body);
    expect(body.emote).toBe('sparkles');
    expect(body.message).toContain('xà phòng');
    expect(body.stats.cleanliness).toBe(100);
  });

  it('performs play action with dance emote', async () => {
    const { agent } = await childWithPet('meo-xam');
    const res = await agent.post('/api/character/pet/care').send({ action: 'play' }).expect(200);
    const body = PetCareResponse.parse(res.body);
    expect(body.emote).toBe('dance');
    expect(body.message).toContain('nhảy múa');
  });

  it('performs feed action and restores fullness', async () => {
    const { agent } = await childWithPet('meo-xam');
    const res = await agent.post('/api/character/pet/care').send({ action: 'feed' }).expect(200);
    const body = PetCareResponse.parse(res.body);
    expect(body.emote).toBe('yummy');
    expect(body.message).toContain('no nê');
    expect(body.stats.fullness).toBe(100);
  });
});
