// Anonymous usage numbers for Google Analytics 4, sent by the server (Measurement Protocol). The browser loads nothing
// from Google: it posts `page_view` and `share` to its own origin (`POST /api/analytics/events`), and every other event
// is emitted by the server. Every parameter is checked against a pattern or a list here, so no free text (a name, an
// email, an account id, a code from a link) can reach Google; the page address is rebuilt from a fixed route table.
import { z } from 'zod';
import { LESSON_PAGES_ROOT, SUBJECT_SLUGS } from './lesson-pages';

/** Events the web app may send. */
export const WEB_EVENTS = ['page_view', 'share'] as const;
/** Events only the server emits (a web request naming one is refused). */
export const SERVER_EVENTS = ['sign_up', 'tutorial_complete', 'level_end', 'invite_accepted', 'ccu_peak'] as const;
export type WebEventName = (typeof WEB_EVENTS)[number];
export type ServerEventName = (typeof SERVER_EVENTS)[number];

/** GA's own client id shape: ten random digits, a dot, the first visit in Unix seconds. */
export const GA_CLIENT_ID = /^\d{10}\.\d{10}$/;
/** A GA session id is the session's start in Unix seconds. */
export const GaSessionId = z.number().int().min(1).max(9_999_999_999);
/** `utm_source`, `utm_medium`, `utm_campaign`: short lower-case labels only. */
export const ATTRIBUTION_VALUE = /^[a-z0-9._-]{1,40}$/;
/** A host name with an alphabetic top-level label (an IP address is not a referrer domain). */
const HOSTNAME = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
/** How something was shared: the device's share sheet, a copied link, a saved picture. */
export const SHARE_METHODS = ['web-share', 'copy-link', 'download'] as const;
/** What was shared: an invite link, a quest result card, the week's summary. */
export const SHARE_CONTENT_TYPES = ['invite', 'result', 'weekly'] as const;
export const SIGN_UP_METHODS = ['idp', 'password'] as const;
/** Engaged time one web event may claim (GA needs some to count the session as active). */
export const MAX_ENGAGEMENT_MSEC = 30 * 60_000;

/** Request header the web app sends its GA ids in, so server events join the same GA user and session. */
export const ANALYTICS_HEADER = 'x-miu-ga';

export interface GaIds {
  clientId: string;
  sessionId: number;
}

export const formatAnalyticsHeader = (ids: GaIds): string => `${ids.clientId};${ids.sessionId}`;

/** The ids of an `x-miu-ga` header, or null unless both are well formed. */
export function parseAnalyticsHeader(value: unknown): GaIds | null {
  if (typeof value !== 'string' || value.length > 40) return null;
  const [clientId, session, ...rest] = value.split(';');
  if (rest.length > 0 || !clientId || !GA_CLIENT_ID.test(clientId) || !session || !/^\d{1,10}$/.test(session)) return null;
  const sessionId = GaSessionId.safeParse(Number(session));
  return sessionId.success ? { clientId, sessionId: sessionId.data } : null;
}

/**
 * What the web app posts: one event. Only types and sizes are checked here (unknown keys are dropped);
 * `sanitizeWebEvent` decides what, if anything, goes on to Google.
 */
export const WebEventBody = z.object({
  name: z.string().max(40),
  client_id: z.string().max(40),
  session_id: z.number(),
  /** The page's path; query and hash are dropped. */
  path: z.string().max(300).optional(),
  engagement_time_msec: z.number().optional(),
  source: z.string().max(100).optional(),
  medium: z.string().max(100).optional(),
  campaign: z.string().max(100).optional(),
  /** Referrer domain (a full URL is cut down to its host). */
  referrer: z.string().max(300).optional(),
  method: z.string().max(40).optional(),
  content_type: z.string().max(40).optional(),
  lesson_id: z.string().max(80).optional(),
});
export type WebEventBody = z.infer<typeof WebEventBody>;

/** What the server knows exists: page addresses and lesson ids are checked against it. */
export interface AnalyticsCatalog {
  /** Region ids (`/region/:id`). */
  regions: ReadonlySet<string>;
  /** Textbook lesson ids a quest plays (`lesson_id`). */
  lessons: ReadonlySet<string>;
  /** Slugs of the lesson pages (`/bai/<slug>`, see lesson-pages.ts). */
  lessonSlugs: ReadonlySet<string>;
}

/** Paths sent to GA as they are. */
const FIXED_PAGES = new Set(['/', '/login', '/play', '/home', '/privacy', '/moi', ...SUBJECT_SLUGS.map((slug) => `${LESSON_PAGES_ROOT}/${slug}`)]);
/** An invite link `/moi/<code>`: counted as `/moi`, the code never leaves the server. */
const INVITE_PAGE = /^\/moi\/[A-Za-z0-9_-]{1,64}$/;

/** The path GA is told for `path` (query, hash and trailing slash dropped), or null for a page outside the table. */
export function normalizePagePath(path: string, catalog: AnalyticsCatalog): string | null {
  const bare = path.split(/[?#]/, 1)[0] ?? '';
  if (!bare.startsWith('/')) return null;
  const trimmed = bare.length > 1 && bare.endsWith('/') ? bare.slice(0, -1) : bare;
  if (FIXED_PAGES.has(trimmed)) return trimmed;
  if (INVITE_PAGE.test(trimmed)) return '/moi';
  const [, section, id, ...rest] = trimmed.split('/');
  if (rest.length > 0 || !id) return null;
  if (section === 'region' && catalog.regions.has(id)) return trimmed;
  if (section === LESSON_PAGES_ROOT.slice(1) && catalog.lessonSlugs.has(id)) return trimmed;
  return null;
}

/** The referrer's domain (`https://www.google.com/search?q=…` → `www.google.com`), or null. */
export function referrerDomain(value: string): string | null {
  let host = value.trim().toLowerCase();
  if (host.includes('/')) {
    try {
      host = new URL(host).hostname;
    } catch {
      return null;
    }
  }
  return HOSTNAME.test(host) ? host : null;
}

/** One event as GA receives it. Parameter values are short checked labels or numbers, never free text. */
export interface Ga4Event {
  name: WebEventName | ServerEventName;
  params: Record<string, string | number>;
}

/** An event with the GA user it belongs to. */
export interface Ga4Hit {
  clientId: string;
  event: Ga4Event;
}

export type SanitizedWebEvent = { ok: true; hit: Ga4Hit } | { ok: false; reason: 'unknown-page' | 'invalid' };

const isOneOf = <T extends string>(list: readonly T[], value: string | undefined): value is T => value !== undefined && (list as readonly string[]).includes(value);

/**
 * The GA event for a web request, built only from checked values. A missing or malformed required value (event name,
 * ids, share method and kind) makes it `invalid`; a page outside the route table drops the whole event
 * (`unknown-page`); a malformed optional value (campaign labels, referrer, lesson) is left out. `origin` is the
 * request's allowed Origin, the base of `page_location`.
 */
export function sanitizeWebEvent(body: WebEventBody, origin: string, catalog: AnalyticsCatalog): SanitizedWebEvent {
  const invalid = { ok: false, reason: 'invalid' } as const;
  if (!isOneOf(WEB_EVENTS, body.name) || !GA_CLIENT_ID.test(body.client_id)) return invalid;
  const sessionId = GaSessionId.safeParse(body.session_id);
  if (!sessionId.success) return invalid;
  const engagement = body.engagement_time_msec;
  const params: Record<string, string | number> = {
    session_id: sessionId.data,
    engagement_time_msec: engagement !== undefined && Number.isInteger(engagement) && engagement >= 1 && engagement <= MAX_ENGAGEMENT_MSEC ? engagement : 1,
  };
  if (body.path !== undefined) {
    const page = normalizePagePath(body.path, catalog);
    if (page === null) return { ok: false, reason: 'unknown-page' };
    params.page_location = `${origin}${page}`;
  }
  if (body.name === 'page_view') {
    if (params.page_location === undefined) return invalid;
    for (const key of ['source', 'medium', 'campaign'] as const) {
      const value = body[key];
      if (value !== undefined && ATTRIBUTION_VALUE.test(value)) params[key] = value;
    }
    const referrer = body.referrer === undefined ? null : referrerDomain(body.referrer);
    if (referrer) params.referrer = referrer;
  } else {
    if (!isOneOf(SHARE_METHODS, body.method) || !isOneOf(SHARE_CONTENT_TYPES, body.content_type)) return invalid;
    params.method = body.method;
    params.content_type = body.content_type;
    if (body.lesson_id !== undefined && catalog.lessons.has(body.lesson_id)) params.lesson_id = body.lesson_id;
  }
  return { ok: true, hit: { clientId: body.client_id, event: { name: body.name, params } } };
}
