import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { Ga4Hit } from '@miu/schema/analytics';
import { loadContentCatalog } from '../content/content-catalog';
import { eq } from 'drizzle-orm';
import { ORIGIN, createTestApp, parentWithChild, type TestApp } from '../../test/test-app';
import { APP_ORIGINS } from '../auth/app-cors';
import { createSession } from '../auth/session-store';
import * as t from '../db/schema';
import { AnalyticsSessions } from './analytics-session';
import { analyticsCatalog } from './analytics-routes';

const CLIENT = '1234567890.1760000000';
const SESSION = 1_760_000_000;
const pageView = { name: 'page_view', client_id: CLIENT, session_id: SESSION, path: '/play?quest=x' };

let app: TestApp;
const sent: Ga4Hit[] = [];
const sink = { send: (hit: Ga4Hit) => void sent.push(hit) };

beforeAll(async () => {
  app = await createTestApp(undefined, { analyticsLimitPerMinute: 5, analyticsClientLimitPerMinute: 12 }, undefined, undefined, { analytics: { sink, sessions: new AnalyticsSessions() } });
});
afterEach(() => {
  sent.length = 0;
});
afterAll(async () => {
  await app.handle.close();
});

/** Each case from its own client address, so the per-IP limit of one case does not spill into the next. */
let ip = 0;
const post = (body: unknown, origin: string | null = ORIGIN) => {
  ip += 1;
  const req = app.request().post('/api/analytics/events').set('X-Forwarded-For', `198.51.100.${ip}`);
  return origin ? req.set('Origin', origin).send(body as object) : req.send(body as object);
};

describe('POST /api/analytics/events', () => {
  it('takes a page view without sign-in and forwards it with the page address built by the server', async () => {
    await post(pageView).expect(204);
    expect(sent).toEqual([{ clientId: CLIENT, event: { name: 'page_view', params: { session_id: SESSION, engagement_time_msec: 1, page_location: `${ORIGIN}/play` } } }]);
  });

  it('takes a share', async () => {
    await post({ name: 'share', client_id: CLIENT, session_id: SESSION, method: 'web-share', content_type: 'invite' }).expect(204);
    expect(sent[0]?.event).toMatchObject({ name: 'share', params: { method: 'web-share', content_type: 'invite' } });
  });

  it('refuses an event only the server emits', async () => {
    for (const name of ['sign_up', 'tutorial_complete', 'level_end', 'invite_accepted', 'ccu_peak']) {
      await post({ ...pageView, name, ccu: 999 }).expect(400, { error: 'invalid-event' });
    }
    expect(sent).toEqual([]);
  });

  it('refuses a malformed body', async () => {
    await post({ ...pageView, client_id: 'parent@example.vn' }).expect(400, { error: 'invalid-event' });
    await post({ ...pageView, session_id: 'soon' }).expect(400, { error: 'invalid-event' });
    await post('not json').expect(400);
    expect(sent).toEqual([]);
  });

  it('drops a page outside the route table quietly', async () => {
    await post({ ...pageView, path: '/parent' }).expect(204);
    expect(sent).toEqual([]);
  });

  it('drops parameters it does not know', async () => {
    await post({ ...pageView, email: 'parent@example.vn', user_id: 'x', ip_override: '203.0.113.9', user_agent: 'Test' }).expect(204);
    expect(JSON.stringify(sent)).not.toMatch(/example\.vn|user_id|ip_override|user_agent|203\.0\.113/);
  });

  it('refuses a body over 4 KB before reading it', async () => {
    await post({ ...pageView, padding: 'x'.repeat(5 * 1024) }).expect(413, { error: 'payload-too-large' });
    expect(sent).toEqual([]);
  });

  it('sends nothing to Google for the iPhone/Android app, signed in or not, while the web is unchanged', async () => {
    // A browser of its own, so the per-browser limit of the other cases does not spill into this one.
    const pageView = { name: 'page_view', client_id: '2234567890.1760000000', session_id: SESSION, path: '/play' };
    // Before sign-in: the app's own page origin.
    for (const appOrigin of APP_ORIGINS) await post(pageView, appOrigin).expect(204);
    expect(sent).toEqual([]);
    // Signed in: an app session (Bearer), even if a page claimed the web's origin.
    const { childId } = await parentWithChild(app);
    const [child] = await app.db.select({ parentId: t.childProfiles.parentId }).from(t.childProfiles).where(eq(t.childProfiles.id, childId));
    const { token } = await createSession(app.db, child?.parentId ?? '', new Date(), { openParentGate: false, kind: 'native' });
    ip += 1;
    await app.request().post('/api/analytics/events').set('X-Forwarded-For', `198.51.100.${ip}`).set('Origin', ORIGIN).set('Authorization', `Bearer ${token}`).send(pageView).expect(204);
    expect(sent).toEqual([]);
    await post(pageView).expect(204);
    expect(sent).toHaveLength(1);
  });

  it('refuses a foreign or missing Origin', async () => {
    await post(pageView, 'https://evil.example').expect(403, { error: 'forbidden-origin' });
    await post(pageView, null).expect(403, { error: 'forbidden-origin' });
    expect(sent).toEqual([]);
  });

  it('limits events per minute per IP, whoever the browsers are', async () => {
    const send = (n: number) => app.request().post('/api/analytics/events').set('X-Forwarded-For', '198.51.100.250').set('Origin', ORIGIN).send({ ...pageView, client_id: `${2_000_000_000 + n}.1760000000` });
    for (let n = 0; n < 5; n += 1) await send(n).expect(204);
    await send(5).expect(429, { error: 'rate-limited' });
    expect(sent).toHaveLength(5);
  });

  it('limits events per minute per GA client id, from whatever addresses it comes', async () => {
    const send = (address: string, clientId: string) => app.request().post('/api/analytics/events').set('X-Forwarded-For', address).set('Origin', ORIGIN).send({ ...pageView, client_id: clientId });
    const flooder = '3000000001.1760000000';
    for (let n = 0; n < 12; n += 1) await send(`198.51.${n}.200`, flooder).expect(204);
    await send('198.51.99.200', flooder).expect(429, { error: 'rate-limited' });
    // Another browser on the very address the flooder used is not held back.
    await send('198.51.0.200', '3000000002.1760000000').expect(204);
    expect(sent).toHaveLength(13);
  });
});

describe('analytics catalogue', () => {
  it('knows the shipped regions and the lessons the quests play', () => {
    const catalog = analyticsCatalog(app.content);
    expect(catalog.regions.has('trung-tam')).toBe(true);
    expect(catalog.lessons.has('tv2-t1-b01')).toBe(true);
    // A lesson page is named by the book's title for the lesson, never by the lesson id.
    expect(catalog.lessonSlugs).toEqual(new Set(['tieng-viet-2-bai-1-toi-la-hoc-sinh-lop-2']));
  });

  it('names a lesson page for every textbook lesson the shipped quests play', () => {
    const { lessons, lessonSlugs } = analyticsCatalog(loadContentCatalog());
    expect(lessonSlugs.size).toBe(lessons.size);
    expect(lessonSlugs.has('toan-2-bai-1-on-tap-cac-so-den-100')).toBe(true);
    expect(lessonSlugs.has('tieng-viet-2-on-tap-giua-hoc-ki-1')).toBe(true);
    expect(lessonSlugs.has('toan2-t1-b01')).toBe(false);
  });
});
