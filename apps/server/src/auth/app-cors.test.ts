import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ANALYTICS_HEADER } from '@miu/schema/analytics';
import { ORIGIN, createTestApp, type TestApp } from '../../test/test-app';
import { APP_ORIGINS } from './app-cors';

let t: TestApp;

beforeAll(async () => {
  t = await createTestApp();
});
afterAll(async () => {
  await t.handle.close();
});

describe('API access from the iPhone/Android app', () => {
  it('knows exactly the two Capacitor page origins', () => {
    expect(APP_ORIGINS).toEqual(['capacitor://localhost', 'https://localhost']);
    expect(t.config.appOrigins).toEqual(APP_ORIGINS);
  });

  it.each(APP_ORIGINS)('answers %s cross-origin, without credentials', async (origin) => {
    const res = await t.request().get('/api/health').set('Origin', origin);
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe(origin);
    expect(res.headers['access-control-allow-credentials']).toBeUndefined();
    expect(res.headers.vary).toMatch(/Origin/);
  });

  it.each(APP_ORIGINS)('answers the preflight of %s without a session, for Bearer and JSON requests', async (origin) => {
    const res = await t.request().options('/api/online-ticket').set('Origin', origin).set('Access-Control-Request-Method', 'POST').set('Access-Control-Request-Headers', 'authorization, content-type');
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe(origin);
    expect(res.headers['access-control-allow-methods']).toContain('POST');
    expect(res.headers['access-control-allow-headers']).toBe(`Authorization, Content-Type, ${ANALYTICS_HEADER}`);
    expect(res.headers['access-control-allow-credentials']).toBeUndefined();
  });

  it('lets a state-changing request from the app past the Origin check', async () => {
    for (const origin of APP_ORIGINS) {
      const res = await t.request().post('/api/health').set('Origin', origin).send({});
      expect(res.body).not.toEqual({ error: 'forbidden-origin' });
    }
  });

  it('gives no CORS header to any other origin, the web one included (it is same-origin)', async () => {
    for (const origin of ['https://evil.example', 'http://localhost', 'capacitor://evil', 'https://localhost:8443', ORIGIN, 'null']) {
      const res = await t.request().get('/api/health').set('Origin', origin);
      expect(res.headers['access-control-allow-origin'], origin).toBeUndefined();
      const preflight = await t.request().options('/api/online-ticket').set('Origin', origin).set('Access-Control-Request-Method', 'POST');
      expect(preflight.headers['access-control-allow-origin'], origin).toBeUndefined();
    }
  });

  it('still refuses a state-changing request with a foreign Origin or none', async () => {
    await t.request().post('/api/health').set('Origin', 'https://evil.example').send({}).expect(403, { error: 'forbidden-origin' });
    await t.request().post('/api/health').set('Origin', 'https://localhost:8443').send({}).expect(403, { error: 'forbidden-origin' });
    await t.request().post('/api/health').send({}).expect(403, { error: 'forbidden-origin' });
  });
});
