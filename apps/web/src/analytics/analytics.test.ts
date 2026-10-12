import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GA_CLIENT_ID, parseAnalyticsHeader } from '@miu/schema/analytics';
import { SESSION_IDLE_MS, analyticsHeaderValue, currentGaIds, resetGaIdsForTest } from './analytics-ids';
import { readAttribution, resetAttributionForTest, visitAttribution } from './attribution';
import { resetTrackForTest, trackPageView, trackShare } from './track';

const T0 = 1_760_000_000_000;

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  resetGaIdsForTest();
  resetAttributionForTest();
  resetTrackForTest();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('GA ids', () => {
  it('keeps one client id per browser and one session id per visit', () => {
    const first = currentGaIds(T0);
    expect(first.clientId).toMatch(GA_CLIENT_ID);
    expect(first.clientId.endsWith(`.${T0 / 1000}`)).toBe(true);
    expect(first.sessionId).toBe(T0 / 1000);
    expect(currentGaIds(T0 + 60_000)).toEqual(first);
  });

  it('starts a new visit after 30 minutes without activity, keeping the client id', () => {
    const first = currentGaIds(T0);
    const active = currentGaIds(T0 + SESSION_IDLE_MS);
    expect(active.sessionId).toBe(first.sessionId);
    const later = T0 + 2 * SESSION_IDLE_MS + 1;
    const next = currentGaIds(later);
    expect(next.clientId).toBe(first.clientId);
    expect(next.sessionId).toBe(Math.floor(later / 1000));
  });

  it('replaces a tampered stored id', () => {
    window.localStorage.setItem('miu.ga.client', 'parent@example.vn');
    window.sessionStorage.setItem('miu.ga.session', 'abc:def');
    const ids = currentGaIds(T0);
    expect(ids.clientId).toMatch(GA_CLIENT_ID);
    expect(ids.sessionId).toBe(T0 / 1000);
  });

  it('still works when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    const first = currentGaIds(T0);
    expect(first.clientId).toMatch(GA_CLIENT_ID);
    expect(currentGaIds(T0 + 1_000)).toEqual(first);
  });

  it('gives the header the server reads', () => {
    expect(parseAnalyticsHeader(analyticsHeaderValue())).toEqual(currentGaIds());
  });
});

describe('visit source', () => {
  it('keeps checked campaign labels and the referring domain only', () => {
    expect(readAttribution('?utm_source=Share&utm_medium=zalo&utm_campaign=result&quest=x', 'https://www.google.com/search?q=miu', 'miu.example')).toEqual({
      source: 'share',
      medium: 'zalo',
      campaign: 'result',
      referrer: 'www.google.com',
    });
    expect(readAttribution('?utm_source=Nguy%E1%BB%85n%20A&utm_campaign=x', '', 'miu.example')).toEqual({ campaign: 'x' });
  });

  it('does not count Miu’s own pages or an address as a referrer', () => {
    expect(readAttribution('', 'https://miu.example/login', 'miu.example')).toEqual({});
    expect(readAttribution('', 'http://192.168.1.5:4173/', 'miu.example')).toEqual({});
  });

  it('is read once per visit and kept for its later pages', () => {
    window.history.replaceState(null, '', '/?utm_source=share&utm_campaign=weekly');
    expect(visitAttribution()).toEqual({ source: 'share', campaign: 'weekly' });
    window.history.replaceState(null, '', '/play');
    resetAttributionForTest();
    expect(visitAttribution()).toEqual({ source: 'share', campaign: 'weekly' });
    window.history.replaceState(null, '', '/');
  });

  it('still works when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    expect(visitAttribution()).toEqual({});
  });
});

describe('reporting', () => {
  function stubFetch(impl: () => Promise<Response> = async () => new Response(null, { status: 204 })) {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({ url, init });
        return impl();
      }),
    );
    return calls;
  }
  const bodyOf = (call: { init: RequestInit | undefined } | undefined): Record<string, unknown> => JSON.parse(String(call?.init?.body)) as Record<string, unknown>;

  it('posts a page view to its own server with the ids, the source and the time on the page before', () => {
    window.sessionStorage.setItem('miu.ga.source', JSON.stringify({ source: 'share', referrer: 'zalo.me' }));
    const calls = stubFetch();
    trackPageView('/login', T0);
    trackPageView('/play', T0 + 4_000);
    expect(calls.map((c) => c.url)).toEqual(['/api/analytics/events', '/api/analytics/events']);
    expect(calls[0]?.init).toMatchObject({ method: 'POST', credentials: 'same-origin', keepalive: true });
    const ids = currentGaIds(T0 + 4_000);
    expect(bodyOf(calls[0])).toEqual({ name: 'page_view', path: '/login', source: 'share', referrer: 'zalo.me', client_id: ids.clientId, session_id: ids.sessionId, engagement_time_msec: 1 });
    expect(bodyOf(calls[1])).toMatchObject({ path: '/play', engagement_time_msec: 4_000 });
    expect((calls[0]?.init?.headers as Record<string, string>)['x-miu-ga']).toBe(`${ids.clientId};${ids.sessionId}`);
  });

  it('posts a share with its method and kind', () => {
    const calls = stubFetch();
    trackShare({ method: 'web-share', contentType: 'result', lessonId: 'toan2-t1-b01' }, T0);
    expect(bodyOf(calls[0])).toMatchObject({ name: 'share', method: 'web-share', content_type: 'result', lesson_id: 'toan2-t1-b01' });
  });

  it('never throws when the report fails', async () => {
    stubFetch(() => Promise.reject(new TypeError('offline')));
    expect(() => trackPageView('/play', T0)).not.toThrow();
    vi.stubGlobal('fetch', () => {
      throw new TypeError('no fetch');
    });
    expect(() => trackPageView('/play', T0)).not.toThrow();
    await Promise.resolve();
  });
});
