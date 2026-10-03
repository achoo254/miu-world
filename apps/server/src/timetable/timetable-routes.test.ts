import { emptyPeriodRow, emptyTimetable, type Timetable } from '@miu/schema/timetable';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
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
  await agent.post(`/api/children/${childId}/select`).expect(200);
  return { agent, childId };
}

/** Made-up values only: the repo is public, a real class's timetable never goes in. */
function sample(): Timetable {
  const t = emptyTimetable();
  t.header = { school: 'Trường Tiểu học Mây Hồng', className: '2B', schoolYear: '2030 - 2031', appliesFrom: '01/09/2030', teacher: 'Cô Lá – ĐT: 0000 000 000' };
  t.morning[0] = { ...emptyPeriodRow(), mon: 'Tiếng Việt', fri: 'Toán' };
  t.afternoon = [{ ...emptyPeriodRow(), wed: 'GDTC' }];
  t.uniform = { ...t.uniform, mon: 'Bộ sơ mi trắng', thu: 'Bộ thể thao' };
  return t;
}

describe('timetable', () => {
  it('starts as the blank template, keeps what is saved and replaces it on the next save', async () => {
    const { agent } = await playingChild();
    expect((await agent.get('/api/timetable').expect(200)).body).toEqual(emptyTimetable());

    const first = sample();
    expect((await agent.put('/api/timetable').send(first).expect(200)).body).toEqual(first);
    expect((await agent.get('/api/timetable').expect(200)).body).toEqual(first);

    const next = { ...first, saturday: true, uniform: { ...first.uniform, sat: 'Tự do' }, uniformNote: '  Mang giày thể thao ' };
    expect((await agent.put('/api/timetable').send(next).expect(200)).body).toEqual({ ...next, uniformNote: 'Mang giày thể thao' });
    expect((await agent.get('/api/timetable').expect(200)).body).toMatchObject({ saturday: true, uniformNote: 'Mang giày thể thao' });
  });

  it('belongs to the selected child: a sibling has her own, blank until she fills it', async () => {
    const { agent, childId } = await parentWithChild(app);
    const sibling = await agent.post('/api/children').send({ displayName: 'Thỏ Bông' }).expect(201);
    await agent.post(`/api/children/${childId}/select`).expect(200);
    await agent.put('/api/timetable').send(sample()).expect(200);
    await agent.post(`/api/children/${(sibling.body as { id: string }).id}/select`).expect(200);
    expect((await agent.get('/api/timetable').expect(200)).body).toEqual(emptyTimetable());
  });

  it("never shows one family's timetable to another", async () => {
    const a = await playingChild();
    await a.agent.put('/api/timetable').send(sample()).expect(200);
    const b = await playingChild();
    expect((await b.agent.get('/api/timetable').expect(200)).body).toEqual(emptyTimetable());
    // B selecting A's child is refused, so B can never reach A's row.
    await b.agent.post(`/api/children/${a.childId}/select`).expect(404);
  });

  it('refuses a malformed timetable without storing any of it', async () => {
    const { agent } = await playingChild();
    const t = sample();
    const bad: unknown[] = [
      { ...t, morning: Array.from({ length: 7 }, emptyPeriodRow) },
      { ...t, morning: [{ ...emptyPeriodRow(), mon: 'x'.repeat(41) }] },
      { ...t, uniform: { ...t.uniform, tue: 'x'.repeat(61) } },
      { ...t, header: { ...t.header, school: 'a\nb' } },
      { ...t, extra: true },
      { header: t.header },
      [],
    ];
    for (const body of bad) expect((await agent.put('/api/timetable').send(body as object).expect(400)).body).toEqual({ error: 'invalid-input' });
    expect((await agent.get('/api/timetable').expect(200)).body).toEqual(emptyTimetable());
  });

  it('needs a signed-in parent with a selected child, and an allowed origin to save', async () => {
    await app.agent().get('/api/timetable').expect(401);
    const { agent } = await parentWithChild(app);
    expect((await agent.put('/api/timetable').send(sample()).expect(401)).body).toEqual({ error: 'no-active-child' });
    const { agent: playing } = await playingChild();
    await playing.put('/api/timetable').set('Origin', 'https://evil.example').send(sample()).expect(403);
  });
});
