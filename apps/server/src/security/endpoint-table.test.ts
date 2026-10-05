// Endpoint table read from the running Express app: every route must be either on the public list
// below (with its reason) or refuse a caller without a session. A route added later is covered
// automatically; one that should be public must be added here on purpose.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, parentWithChild, type TestApp } from '../../test/test-app';

/** Routes open without a session, and why. */
const PUBLIC: Record<string, string> = {
  'GET /health': 'uptime probe, no data',
  'POST /auth/register': 'creates the session',
  'POST /auth/login': 'creates the session (dev/test password login only)',
  'POST /auth/logout': 'ends whatever session there is',
  'GET /auth/me': 'tells the web app whether it is signed in (401 when not)',
  'GET /consents/policy': 'the consent text a parent reads before accepting',
  'GET /auth/google/start': 'starts Google sign-in',
  'GET /auth/google/callback': 'finishes Google sign-in',
};

interface Layer {
  route?: { path: string; methods: Record<string, boolean> };
  handle?: { stack?: Layer[] };
}

function routes(t: TestApp): string[] {
  const root = (t.app as unknown as { router: { stack: Layer[] } }).router.stack;
  const found: string[] = [];
  const walk = (layers: Layer[]): void => {
    for (const layer of layers) {
      if (layer.route) for (const method of Object.keys(layer.route.methods)) found.push(`${method.toUpperCase()} ${layer.route.path}`);
      if (layer.handle?.stack) walk(layer.handle.stack);
    }
  };
  walk(root);
  return found;
}

/** A concrete URL for a route pattern (`:id` → a well-formed id that exists nowhere). */
const fill = (path: string, id = '00000000-0000-4000-8000-000000000000'): string =>
  `/api${path.replace(':questId', 'forest-ch1').replace(':stepId', 'meet-parrot').replace(':lessonId', 'toan2-t1-b01').replace(':id', id)}`;

let t: TestApp;
beforeAll(async () => {
  t = await createTestApp();
});
afterAll(async () => {
  await t.handle.close();
});

describe('endpoint table', () => {
  it('lists every API route, and the public list names only routes that exist', () => {
    const all = routes(t);
    expect(all.length).toBeGreaterThan(20);
    for (const key of Object.keys(PUBLIC)) expect(all).toContain(key);
  });

  it('refuses every non-public route without a session (401), whatever the body', async () => {
    const anon = t.agent();
    const open: string[] = [];
    for (const route of routes(t)) {
      if (route in PUBLIC) continue;
      const [method = 'GET', path = ''] = route.split(' ');
      const call = anon[method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete'](fill(path));
      const res = method === 'GET' || method === 'DELETE' ? await call : await call.send({ name: 'Miu', equipped: [], layer: 'answer', answer: { value: 1 } });
      if (res.status !== 401) open.push(`${route} → ${res.status}`);
    }
    expect(open).toEqual([]);
  });

  it('keeps a family\'s child out of reach of another parent on every route that names a child (IDOR)', async () => {
    const a = await parentWithChild(t);
    const b = await parentWithChild(t);
    const childRoutes = routes(t).filter((r) => r.includes(':id'));
    expect(childRoutes.length).toBeGreaterThanOrEqual(3);
    const reached: string[] = [];
    for (const route of childRoutes) {
      const [method = 'GET', path = ''] = route.split(' ');
      const call = b.agent[method.toLowerCase() as 'get' | 'post' | 'patch' | 'delete'](fill(path, a.childId));
      const res = method === 'PATCH' ? await call.send({ displayName: 'Thỏ Bông', language: 'en' }) : await call;
      if (res.status !== 404) reached.push(`${route} → ${res.status}`);
    }
    expect(reached).toEqual([]);
    // A's child is untouched and still A's.
    const mine = await a.agent.get('/api/players').expect(200);
    expect((mine.body as Array<{ id: string; displayName: string }>).map((c) => c.id)).toEqual([a.childId]);
    expect((mine.body as Array<{ displayName: string }>)[0]?.displayName).toBe('Mèo Mây');
  });
});
