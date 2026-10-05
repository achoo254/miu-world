import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { resolveDecor } from '@miu/schema/home-decor';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, parentWithChild, type Agent, type TestApp, signedInWithoutPlayer } from '../../test/test-app';
import { homeDecor } from '../db/schema';
import { loadDecorCatalog } from './home-decor-routes';

const catalog = loadDecorCatalog();
/** The house as built: every slot at its default. */
const DEFAULTS = resolveDecor(catalog);
/** A slot's options other than its default (the catalogue ships at least two per slot). */
const other = (slotId: string, k = 0): string => {
  const slot = catalog.slots.find((s) => s.id === slotId);
  const option = slot?.options.filter((o) => o.id !== slot.default)[k];
  if (!option) throw new Error(`no other option for ${slotId}`);
  return option.id;
};

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

describe('home decor', () => {
  it('starts as the house is built, keeps each pick and leaves the other slots as they were', async () => {
    const { agent } = await playingChild();
    expect((await agent.get('/api/home-decor').expect(200)).body).toEqual({ choices: DEFAULTS });

    const first = { bed: other('bed'), house: other('house') };
    expect((await agent.put('/api/home-decor').send({ choices: first }).expect(200)).body).toEqual({ choices: { ...DEFAULTS, ...first } });
    // A later pick of another slot keeps the earlier ones; a slot can go back to its default.
    const next = { rug: other('rug', 1), bed: DEFAULTS.bed ?? '' };
    expect((await agent.put('/api/home-decor').send({ choices: next }).expect(200)).body).toEqual({ choices: { ...DEFAULTS, house: first.house, ...next } });
    expect((await agent.get('/api/home-decor').expect(200)).body).toEqual({ choices: { ...DEFAULTS, house: first.house, ...next } });
  });

  it('belongs to the selected child: a sibling keeps the house as built until she picks', async () => {
    const { agent, childId } = await parentWithChild(app);
    const sibling = await agent.post('/api/players').send({ displayName: 'Thỏ Bông' }).expect(201);
    await agent.post(`/api/players/${childId}/select`).expect(200);
    await agent.put('/api/home-decor').send({ choices: { fence: other('fence') } }).expect(200);
    await agent.post(`/api/players/${(sibling.body as { id: string }).id}/select`).expect(200);
    expect((await agent.get('/api/home-decor').expect(200)).body).toEqual({ choices: DEFAULTS });
  });

  it("never shows or changes another family's home (IDOR)", async () => {
    const a = await playingChild();
    await a.agent.put('/api/home-decor').send({ choices: { lamp: other('lamp') } }).expect(200);
    const b = await playingChild();
    expect((await b.agent.get('/api/home-decor').expect(200)).body).toEqual({ choices: DEFAULTS });
    await b.agent.put('/api/home-decor').send({ choices: { lamp: other('lamp', 1) } }).expect(200);
    // B selecting A's child is refused as if it did not exist, so B can never reach A's row.
    await b.agent.post(`/api/players/${a.childId}/select`).expect(404);
    expect((await a.agent.get('/api/home-decor').expect(200)).body).toEqual({ choices: { ...DEFAULTS, lamp: other('lamp') } });
  });

  it('refuses ids the catalogue does not list, and anything malformed, storing none of it', async () => {
    const { agent, childId } = await playingChild();
    const bad: unknown[] = [
      { choices: { bed: 'bed-gold' } },
      { choices: { sofa: other('bed') } },
      { choices: { bed: other('rug') } },
      { choices: { bed: other('bed'), house: 'house-castle' } },
      { choices: { bed: 'Bed Pink' } },
      { choices: { bed: 7 } },
      { choices: Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`slot-${i}`, 'x'])) },
      { choices: {}, extra: true },
      { bed: other('bed') },
      [],
    ];
    for (const body of bad) expect((await agent.put('/api/home-decor').send(body as object).expect(400)).body).toEqual({ error: 'invalid-input' });
    expect(await app.db.select().from(homeDecor).where(eq(homeDecor.childId, childId))).toEqual([]);
    expect((await agent.get('/api/home-decor').expect(200)).body).toEqual({ choices: DEFAULTS });
  });

  it('answers a saved pick the catalogue dropped since with the slot default', async () => {
    const { agent, childId } = await playingChild();
    await app.db.insert(homeDecor).values({ childId, choices: { bed: 'bed-retired', rug: other('rug') } });
    expect((await agent.get('/api/home-decor').expect(200)).body).toEqual({ choices: { ...DEFAULTS, rug: other('rug') } });
  });

  it('needs a signed-in parent with a selected child, and an allowed origin to save', async () => {
    await app.agent().get('/api/home-decor').expect(401);
    const agent = await signedInWithoutPlayer(app);
    expect((await agent.put('/api/home-decor').send({ choices: {} }).expect(401)).body).toEqual({ error: 'no-active-child' });
    const { agent: playing } = await playingChild();
    await playing.put('/api/home-decor').set('Origin', 'https://evil.example').send({ choices: { bed: other('bed') } }).expect(403);
  });
});

describe('decor catalogue', () => {
  it('fails loudly on a broken file instead of serving a guess', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'miu-decor-'));
    mkdirSync(path.join(dir, 'home'));
    writeFileSync(path.join(dir, 'home/decor.json'), JSON.stringify({ version: 1, slots: [{ id: 'bed', side: 'inside', name: 'Giường', default: 'bed-x', options: [] }] }));
    expect(() => loadDecorCatalog(dir)).toThrow(/invalid content file/);
  });
});
