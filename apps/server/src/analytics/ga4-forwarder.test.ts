import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Ga4Hit } from '@miu/schema/analytics';
import { BATCH_MAX, GA4_COLLECT_URL, GA4_DEBUG_URL, Ga4Forwarder, SEND_CONCURRENCY } from './ga4-forwarder';

const CONFIG = { measurementId: 'G-TEST123456', apiSecret: 'test-ga-secret-0123456789' };

const serverHit = (name: 'sign_up' | 'level_end', clientId: string): Ga4Hit => ({ clientId, event: { name, params: { session_id: 1_760_000_000, engagement_time_msec: 1 } } });
const hit = (n: number, clientId = '1234567890.1760000000'): Ga4Hit => ({ clientId, event: { name: 'page_view', params: { session_id: 1_760_000_000, engagement_time_msec: 1, page_location: `https://miu.example/play?n=${n}` } } });

interface Call {
  url: string;
  body: { client_id: string; consent: unknown; events: Array<{ name: string; params: Record<string, unknown> }> } & Record<string, unknown>;
}

function fakeGoogle(answer: () => Promise<Response> | Response = () => new Response(null, { status: 204 })) {
  const calls: Call[] = [];
  const impl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), body: JSON.parse(String(init?.body)) as Call['body'] });
    return answer();
  });
  return { impl: impl as unknown as typeof fetch, calls };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('GA4 forwarder', () => {
  it('sends nothing without a GA4 property', async () => {
    const google = fakeGoogle();
    const forwarder = new Ga4Forwarder({ config: null, fetchImpl: google.impl });
    forwarder.send(hit(1));
    expect(forwarder.pending).toBe(0);
    await forwarder.close();
    expect(await forwarder.validate([hit(1)])).toBeNull();
    expect(google.calls).toHaveLength(0);
  });

  it('sends a queued event a little later, without IP, user agent or user id', async () => {
    vi.useFakeTimers();
    const google = fakeGoogle();
    const forwarder = new Ga4Forwarder({ config: CONFIG, fetchImpl: google.impl, flushMs: 5_000 });
    forwarder.send(hit(1));
    expect(google.calls).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(google.calls).toHaveLength(1);
    const [call] = google.calls;
    const url = new URL(call?.url ?? '');
    expect(`${url.origin}${url.pathname}`).toBe(GA4_COLLECT_URL);
    expect(url.searchParams.get('measurement_id')).toBe(CONFIG.measurementId);
    expect(url.searchParams.get('api_secret')).toBe(CONFIG.apiSecret);
    expect(call?.body.client_id).toBe('1234567890.1760000000');
    expect(call?.body.consent).toEqual({ ad_user_data: 'DENIED', ad_personalization: 'DENIED' });
    expect(call?.body.events).toEqual([hit(1).event]);
    expect(JSON.stringify(call?.body)).not.toMatch(/ip_override|user_agent|user_id/);
  });

  it('sends at most 25 events of one GA user per request', async () => {
    const google = fakeGoogle();
    const forwarder = new Ga4Forwarder({ config: CONFIG, fetchImpl: google.impl, flushMs: 60_000 });
    for (let n = 0; n < 30; n += 1) forwarder.send(hit(n));
    forwarder.send(hit(99, '9999999999.1760000000'));
    await forwarder.flush();
    expect(google.calls.map((c) => [c.body.client_id, c.body.events.length])).toEqual([
      ['1234567890.1760000000', BATCH_MAX],
      ['1234567890.1760000000', 5],
      ['9999999999.1760000000', 1],
    ]);
    // In the order they came.
    expect(google.calls[0]?.body.events[0]?.params.page_location).toBe('https://miu.example/play?n=0');
    expect(forwarder.pending).toBe(0);
  });

  it('keeps at most the newest events when the queue is full', async () => {
    const google = fakeGoogle();
    const forwarder = new Ga4Forwarder({ config: CONFIG, fetchImpl: google.impl, flushMs: 60_000, queueMax: 3 });
    // Different users, so no batch leaves on its own before the flush.
    for (let n = 0; n < 5; n += 1) forwarder.send(hit(n, `${1_000_000_000 + n}.1760000000`));
    expect(forwarder.pending).toBe(3);
    await forwarder.flush();
    expect(google.calls.map((c) => c.body.client_id)).toEqual(['1000000002.1760000000', '1000000003.1760000000', '1000000004.1760000000']);
  });

  it('keeps the server events when web events flood the queue, dropping the oldest web events first', async () => {
    const google = fakeGoogle();
    const forwarder = new Ga4Forwarder({ config: CONFIG, fetchImpl: google.impl, flushMs: 60_000, queueMax: 6, webQueueMax: 4 });
    const user = (n: number): string => `${1_000_000_000 + n}.1760000000`;
    forwarder.send(serverHit('sign_up', user(0)));
    // Web events from many users: they never hold more than 4 places, the oldest of them go first.
    for (let n = 1; n <= 10; n += 1) forwarder.send(hit(n, user(n)));
    expect(forwarder.pending).toBe(5);
    // Server events are taken even with the queue full of web events, each pushing the oldest web event out.
    forwarder.send(serverHit('level_end', user(20)));
    forwarder.send(serverHit('level_end', user(21)));
    expect(forwarder.pending).toBe(6);
    forwarder.send(serverHit('level_end', user(22)));
    expect(forwarder.pending).toBe(6);
    await forwarder.flush();
    const names = google.calls.flatMap((c) => c.body.events.map((e) => `${e.name}:${c.body.client_id}`));
    expect(names.filter((n) => !n.startsWith('page_view'))).toEqual([`sign_up:${user(0)}`, `level_end:${user(20)}`, `level_end:${user(21)}`, `level_end:${user(22)}`]);
    // Of the web events only the newest two are left (one pushed out by each server event beyond the cap).
    expect(names.filter((n) => n.startsWith('page_view'))).toEqual([`page_view:${user(9)}`, `page_view:${user(10)}`]);
  });

  it('keeps the oldest server events only when no web event is left to drop', async () => {
    const google = fakeGoogle();
    const forwarder = new Ga4Forwarder({ config: CONFIG, fetchImpl: google.impl, flushMs: 60_000, queueMax: 3, webQueueMax: 2 });
    for (let n = 0; n < 5; n += 1) forwarder.send(serverHit('level_end', `${1_000_000_000 + n}.1760000000`));
    expect(forwarder.pending).toBe(3);
    await forwarder.flush();
    expect(google.calls.map((c) => c.body.client_id)).toEqual(['1000000002.1760000000', '1000000003.1760000000', '1000000004.1760000000']);
  });

  it('sends the batches of many GA users in parallel, not one after the other', async () => {
    let inFlight = 0;
    let peak = 0;
    const google = fakeGoogle(async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 20));
      inFlight -= 1;
      return new Response(null, { status: 204 });
    });
    const forwarder = new Ga4Forwarder({ config: CONFIG, fetchImpl: google.impl, flushMs: 60_000 });
    for (let n = 0; n < 40; n += 1) forwarder.send(hit(n, `${1_000_000_000 + n}.1760000000`));
    await forwarder.flush();
    expect(google.calls).toHaveLength(40);
    expect(peak).toBe(SEND_CONCURRENCY);
    expect(forwarder.pending).toBe(0);
  });

  it('gives up on a slow Google at its own deadline when closing, and leaves nothing queued', async () => {
    vi.useFakeTimers();
    const google = fakeGoogle(() => new Promise<Response>(() => undefined));
    const forwarder = new Ga4Forwarder({ config: CONFIG, fetchImpl: google.impl, flushMs: 60_000, timeoutMs: 60_000 });
    for (let n = 0; n < 12; n += 1) forwarder.send(hit(n, `${1_000_000_000 + n}.1760000000`));
    let closed = false;
    const closing = forwarder.close(1_500).then(() => {
      closed = true;
    });
    await vi.advanceTimersByTimeAsync(1_499);
    expect(closed).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await closing;
    expect(closed).toBe(true);
    // Every request went out at once (up to the parallel cap), none waited for another.
    expect(google.calls.length).toBeGreaterThanOrEqual(SEND_CONCURRENCY);
    // The 8 requests hang on; the other 4 batches are still queued, and a closed forwarder takes no more.
    expect(forwarder.pending).toBe(12 - SEND_CONCURRENCY);
    forwarder.send(hit(99));
    expect(forwarder.pending).toBe(12 - SEND_CONCURRENCY);
  });

  it('sends a full batch at once', async () => {
    const google = fakeGoogle();
    const forwarder = new Ga4Forwarder({ config: CONFIG, fetchImpl: google.impl, flushMs: 60_000 });
    for (let n = 0; n < BATCH_MAX; n += 1) forwarder.send(hit(n));
    await vi.waitFor(() => expect(google.calls).toHaveLength(1));
    await forwarder.close();
  });

  it('never throws on a network error or a refusal, and logs only the status or the error class', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const failing = fakeGoogle(() => Promise.reject(new TypeError(`fetch failed ${GA4_COLLECT_URL}?api_secret=${CONFIG.apiSecret}`)));
    const forwarder = new Ga4Forwarder({ config: CONFIG, fetchImpl: failing.impl, flushMs: 60_000 });
    forwarder.send(hit(1));
    await expect(forwarder.flush()).resolves.toBeUndefined();
    const refusing = fakeGoogle(() => new Response('bad', { status: 400 }));
    const second = new Ga4Forwarder({ config: CONFIG, fetchImpl: refusing.impl, flushMs: 60_000 });
    second.send(hit(2));
    await second.flush();
    expect(warn.mock.calls).toEqual([
      ['analytics events not sent', 'TypeError'],
      ['analytics events not accepted', 400],
    ]);
    expect(JSON.stringify(warn.mock.calls)).not.toContain(CONFIG.apiSecret);
  });

  it('sends what is left on close and takes nothing after', async () => {
    const google = fakeGoogle();
    const forwarder = new Ga4Forwarder({ config: CONFIG, fetchImpl: google.impl, flushMs: 60_000 });
    forwarder.send(hit(1));
    forwarder.send(hit(2));
    await forwarder.close();
    expect(google.calls).toHaveLength(1);
    expect(google.calls[0]?.body.events).toHaveLength(2);
    forwarder.send(hit(3));
    expect(forwarder.pending).toBe(0);
  });

  it('checks events against the validation endpoint', async () => {
    const google = fakeGoogle(() => Response.json({ validationMessages: [] }));
    const forwarder = new Ga4Forwarder({ config: CONFIG, fetchImpl: google.impl });
    expect(await forwarder.validate([hit(1)])).toEqual({ validationMessages: [] });
    expect(google.calls[0]?.url.startsWith(`${GA4_DEBUG_URL}?`)).toBe(true);
  });
});
