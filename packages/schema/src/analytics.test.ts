import { describe, expect, it } from 'vitest';
import {
  ANALYTICS_HEADER,
  formatAnalyticsHeader,
  normalizePagePath,
  parseAnalyticsHeader,
  referrerDomain,
  sanitizeWebEvent,
  WebEventBody,
  type AnalyticsCatalog,
  type WebEventBody as WebEvent,
} from './analytics';

const CATALOG: AnalyticsCatalog = {
  regions: new Set(['khu-rung-bi-mat', 'trung-tam']),
  lessons: new Set(['toan2-t1-b01']),
  lessonSlugs: new Set(['toan-2-bai-1-on-tap-cac-so-den-100']),
};
const ORIGIN = 'https://miu.example';
const CLIENT = '1234567890.1760000000';
const SESSION = 1_760_000_000;

const pageView = (extra: Partial<WebEvent> = {}): WebEvent => ({ name: 'page_view', client_id: CLIENT, session_id: SESSION, path: '/play', ...extra });
const share = (extra: Partial<WebEvent> = {}): WebEvent => ({ name: 'share', client_id: CLIENT, session_id: SESSION, method: 'copy-link', content_type: 'result', ...extra });

describe('analytics ids header', () => {
  it('round-trips well-formed ids', () => {
    expect(ANALYTICS_HEADER).toBe('x-miu-ga');
    const header = formatAnalyticsHeader({ clientId: CLIENT, sessionId: SESSION });
    expect(parseAnalyticsHeader(header)).toEqual({ clientId: CLIENT, sessionId: SESSION });
  });

  it('refuses anything else', () => {
    for (const bad of [undefined, 42, '', CLIENT, `${CLIENT};`, `${CLIENT};abc`, `${CLIENT};0`, `12345.1760000000;${SESSION}`, `${CLIENT};${SESSION};x`, `${CLIENT};12345678901`, `a@b.c;${SESSION}`]) {
      expect(parseAnalyticsHeader(bad)).toBeNull();
    }
  });
});

describe('page paths', () => {
  it('keeps the pages of the route table', () => {
    for (const page of ['/', '/login', '/play', '/home', '/privacy', '/moi', '/bai/toan-2', '/bai/tieng-viet-2']) expect(normalizePagePath(page, CATALOG)).toBe(page);
  });

  it('drops query, hash and a trailing slash', () => {
    expect(normalizePagePath('/play?region=trung-tam&quest=x', CATALOG)).toBe('/play');
    expect(normalizePagePath('/login#top', CATALOG)).toBe('/login');
    expect(normalizePagePath('/home/', CATALOG)).toBe('/home');
  });

  it('keeps a region or a lesson page only when it exists', () => {
    expect(normalizePagePath('/region/trung-tam', CATALOG)).toBe('/region/trung-tam');
    expect(normalizePagePath('/region/nowhere', CATALOG)).toBeNull();
    expect(normalizePagePath('/bai/toan-2-bai-1-on-tap-cac-so-den-100/', CATALOG)).toBe('/bai/toan-2-bai-1-on-tap-cac-so-den-100');
    expect(normalizePagePath('/bai/toan2-t1-b01', CATALOG)).toBeNull(); // a lesson id is not a page name
    expect(normalizePagePath('/bai/made-up', CATALOG)).toBeNull();
    expect(normalizePagePath('/region/trung-tam/more', CATALOG)).toBeNull();
  });

  it('counts an invite link as /moi without its code', () => {
    expect(normalizePagePath('/moi/AbC_12-xyz', CATALOG)).toBe('/moi');
    expect(normalizePagePath('/moi/a.b', CATALOG)).toBeNull();
  });

  it('refuses any other page', () => {
    for (const page of ['/parent', '/consent', '/friends', '/region', '/bai', 'play', '//play', 'https://evil.example/play', '/play/x', '']) {
      expect(normalizePagePath(page, CATALOG)).toBeNull();
    }
  });
});

describe('referrer domain', () => {
  it('keeps only the host of a URL or a host name', () => {
    expect(referrerDomain('https://www.google.com/search?q=miu+world')).toBe('www.google.com');
    expect(referrerDomain('Zalo.ME')).toBe('zalo.me');
  });

  it('refuses what is not a domain', () => {
    for (const bad of ['', 'localhost', '192.168.1.5', 'http://192.168.1.5/x', 'not a host', 'a@b.com', 'https://', 'x'.repeat(260) + '.com']) expect(referrerDomain(bad)).toBeNull();
  });
});

describe('web events', () => {
  it('turns a page view into a GA event with the page address built by the server', () => {
    const result = sanitizeWebEvent(pageView({ path: '/region/trung-tam?x=1', engagement_time_msec: 1500 }), ORIGIN, CATALOG);
    expect(result).toEqual({
      ok: true,
      hit: { clientId: CLIENT, event: { name: 'page_view', params: { session_id: SESSION, engagement_time_msec: 1500, page_location: `${ORIGIN}/region/trung-tam` } } },
    });
  });

  it('keeps well-formed campaign labels and the referrer domain, and drops malformed ones', () => {
    const good = sanitizeWebEvent(pageView({ source: 'share', medium: 'zalo', campaign: 'result', referrer: 'https://zalo.me/g/abc' }), ORIGIN, CATALOG);
    expect(good.ok && good.hit.event.params).toMatchObject({ source: 'share', medium: 'zalo', campaign: 'result', referrer: 'zalo.me' });
    const bad = sanitizeWebEvent(pageView({ source: 'Nguyễn Văn A', medium: 'a b', campaign: 'x'.repeat(41), referrer: 'me@mail.com' }), ORIGIN, CATALOG);
    expect(bad.ok && bad.hit.event.params).toEqual({ session_id: SESSION, engagement_time_msec: 1, page_location: `${ORIGIN}/play` });
  });

  it('bounds the engaged time', () => {
    for (const time of [0, -5, 1.5, 30 * 60_000 + 1]) {
      const result = sanitizeWebEvent(pageView({ engagement_time_msec: time }), ORIGIN, CATALOG);
      expect(result.ok && result.hit.event.params.engagement_time_msec).toBe(1);
    }
  });

  it('drops the whole event for a page outside the table', () => {
    expect(sanitizeWebEvent(pageView({ path: '/parent' }), ORIGIN, CATALOG)).toEqual({ ok: false, reason: 'unknown-page' });
    expect(sanitizeWebEvent(share({ path: '/region/nowhere' }), ORIGIN, CATALOG)).toEqual({ ok: false, reason: 'unknown-page' });
  });

  it('refuses a page view without a page', () => {
    expect(sanitizeWebEvent(pageView({ path: undefined }), ORIGIN, CATALOG)).toEqual({ ok: false, reason: 'invalid' });
  });

  it('refuses events only the server emits, and unknown ones', () => {
    for (const name of ['sign_up', 'tutorial_complete', 'level_end', 'invite_accepted', 'ccu_peak', 'purchase', '']) {
      expect(sanitizeWebEvent(pageView({ name }), ORIGIN, CATALOG)).toEqual({ ok: false, reason: 'invalid' });
    }
  });

  it('refuses malformed ids', () => {
    for (const client_id of ['', 'abc', '123.456', 'parent@example.vn', `${CLIENT}x`]) expect(sanitizeWebEvent(pageView({ client_id }), ORIGIN, CATALOG).ok).toBe(false);
    for (const session_id of [0, -1, 1.5, 10_000_000_000, Number.NaN]) expect(sanitizeWebEvent(pageView({ session_id }), ORIGIN, CATALOG).ok).toBe(false);
  });

  it('turns a share into a GA event with its method, kind and a known lesson', () => {
    const result = sanitizeWebEvent(share({ lesson_id: 'toan2-t1-b01', path: '/play' }), ORIGIN, CATALOG);
    expect(result.ok && result.hit.event).toEqual({
      name: 'share',
      params: { session_id: SESSION, engagement_time_msec: 1, page_location: `${ORIGIN}/play`, method: 'copy-link', content_type: 'result', lesson_id: 'toan2-t1-b01' },
    });
  });

  it('leaves out an unknown lesson, and refuses a share of unknown method or kind', () => {
    const unknownLesson = sanitizeWebEvent(share({ lesson_id: 'made-up' }), ORIGIN, CATALOG);
    expect(unknownLesson.ok && unknownLesson.hit.event.params.lesson_id).toBeUndefined();
    expect(sanitizeWebEvent(share({ method: 'email' }), ORIGIN, CATALOG).ok).toBe(false);
    expect(sanitizeWebEvent(share({ method: undefined }), ORIGIN, CATALOG).ok).toBe(false);
    expect(sanitizeWebEvent(share({ content_type: 'profile' }), ORIGIN, CATALOG).ok).toBe(false);
  });

  it('drops unknown parameters before anything else sees them', () => {
    const parsed = WebEventBody.parse({ ...pageView(), email: 'parent@example.vn', user_id: 'abc', ip_override: '1.2.3.4' });
    expect(parsed).not.toHaveProperty('email');
    const result = sanitizeWebEvent(parsed, ORIGIN, CATALOG);
    expect(JSON.stringify(result)).not.toMatch(/example\.vn|user_id|ip_override/);
  });
});
