// Test requests must reach the app under test, never another program listening on the same machine.
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { describe, expect, it } from 'vitest';
import { createTestApp, listenOnLoopback } from './test-app';

/** Stands in for another program on the machine: listens on 127.0.0.1 and answers 403 to everything. */
async function otherProgram(): Promise<Server> {
  const server = createServer((_req, res) => {
    res.statusCode = 403;
    res.end('another program');
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return server;
}

describe('serving the app to supertest', () => {
  it('refuses a port another program holds on 127.0.0.1 instead of sharing it', async () => {
    const other = await otherProgram();
    const { port } = other.address() as AddressInfo;
    try {
      // Supertest's own `listen(0)` binds the IPv6 wildcard: on macOS that bind succeeds on this port too,
      // and its requests to 127.0.0.1 are answered by the other program.
      await expect(listenOnLoopback(express(), port)).rejects.toMatchObject({ code: 'EADDRINUSE' });
    } finally {
      await new Promise<void>((resolve) => other.close(() => resolve()));
    }
  });

  it('sends every request of a test app to its own server on 127.0.0.1, and closes it with the database', async () => {
    const t = await createTestApp();
    expect(t.server.address()).toMatchObject({ address: '127.0.0.1' });
    const other = await t.agentFor(express().get('/api/who', (_req, res) => res.json({ who: 'other app' })));
    await t.agent().get('/api/health').expect(200, { status: 'ok' });
    await t.request().get('/api/health').expect(200, { status: 'ok' });
    await other.get('/api/who').expect(200, { who: 'other app' });
    await t.handle.close();
    expect(t.server.listening).toBe(false);
  });
});
