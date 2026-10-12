import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Ga4Hit } from '@miu/schema/analytics';
import { BATCH_MAX, GA4_COLLECT_URL, GA4_DEBUG_URL, Ga4Forwarder } from './ga4-forwarder';

const CONFIG = { measurementId: 'G-TEST123456', apiSecret: 'test-ga-secret-0123456789' };

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
