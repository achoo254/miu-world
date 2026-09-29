import request from 'supertest';
import type { Express } from 'express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app';
import { loadConfig } from './config';
import { createTestDb, type DbHandle } from './db/client';

let handle: DbHandle;
let app: Express;

beforeAll(async () => {
  handle = await createTestDb();
  app = createApp({ config: loadConfig({ NODE_ENV: 'test' }), db: handle.db });
});
afterAll(async () => {
  await handle.close();
});

describe('server app', () => {
  it('answers the health check', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('returns JSON 404 for unknown routes', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'not-found' });
  });

  it('rejects bodies over 32 KB with 413', async () => {
    const res = await request(app)
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ blob: 'x'.repeat(33 * 1024) }));
    expect(res.status).toBe(413);
    expect(res.body).toEqual({ error: 'payload-too-large' });
  });

  it('rejects malformed JSON with 400 and no stack trace', async () => {
    const res = await request(app).post('/api/health').set('Content-Type', 'application/json').send('{bad');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'bad-request' });
    expect(res.text).not.toContain('at ');
  });

  it('sets security headers', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
