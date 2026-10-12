// `POST /api/analytics/events`: the web app's page views and shares, on their way to Google Analytics. Open without
// sign-in (the landing and lesson pages are public) but behind the API's Origin check, a 4 KB body limit (mounted in
// app.ts ahead of the general parser) and two rate limits: a wide one per IP (a school shares one address) and a
// narrow one per GA client id (one browser). Only the two web events pass; every value is checked
// and the page address rebuilt by `sanitizeWebEvent`, so nothing the browser makes up reaches Google.
import path from 'node:path';
import { Router, type Request } from 'express';
import { GA_CLIENT_ID, WebEventBody, sanitizeWebEvent, type AnalyticsCatalog } from '@miu/schema/analytics';
import { lessonPages } from '@miu/schema/lesson-pages';
import { RegionCatalog } from '@miu/schema/region';
import { readContentJson, type ContentCatalog } from '../content/content-catalog';
import { CONTENT_DIR } from '../content/content-dir';
import { HttpError } from '../http-error';
import { ipKey, limiter } from '../rate-limit';
import { readBookTocs } from '../worksheet/curriculum-books';
import type { EventSink } from './ga4-forwarder';
import { questLabels } from './server-events';

/** Largest body the analytics route reads (its own parser, ahead of the general 32 KB one). */
export const ANALYTICS_BODY_LIMIT = '4kb';

/**
 * Page addresses and lesson ids the analytics may name: the regions of `content/world/regions.json`, the lessons the
 * quests play, and the lesson pages (one per such lesson, named as the static pages are: `@miu/schema/lesson-pages`).
 */
export function analyticsCatalog(content: Pick<ContentCatalog, 'quests' | 'subjects'>, contentDir = CONTENT_DIR): AnalyticsCatalog {
  const regions = readContentJson(RegionCatalog, path.join(contentDir, 'world/regions.json')).regions;
  const { lessons } = questLabels(content);
  const lessonSlugs = new Set(lessonPages(readBookTocs(path.join(contentDir, 'curriculum')), lessons).map((page) => page.slug));
  return { regions: new Set(regions.map((r) => r.id)), lessons, lessonSlugs };
}

export interface AnalyticsRouteDeps {
  sink: EventSink;
  catalog: AnalyticsCatalog;
  /** Events per minute per IP. */
  limitPerMinute: number;
  /** Events per minute per GA client id. */
  clientLimitPerMinute: number;
}

/** The body's GA client id when it has the right shape; the IP otherwise (such a body is refused further on). */
function clientKey(req: Request): string {
  const clientId: unknown = (req.body as { client_id?: unknown } | undefined)?.client_id;
  return typeof clientId === 'string' && GA_CLIENT_ID.test(clientId) ? `client:${clientId}` : `ip:${ipKey(req)}`;
}

export function analyticsRoutes({ sink, catalog, limitPerMinute, clientLimitPerMinute }: AnalyticsRouteDeps): Router {
  const router = Router();
  const limitIp = limiter(60_000, limitPerMinute, ipKey);
  const limitClient = limiter(60_000, clientLimitPerMinute, clientKey);

  router.post('/analytics/events', limitIp, limitClient, (req, res) => {
    const body = WebEventBody.safeParse(req.body);
    // The Origin check before this route lets only allowed origins through: it is the base of the page address.
    const origin = req.headers.origin;
    if (!body.success || !origin) throw new HttpError(400, 'invalid-event');
    const result = sanitizeWebEvent(body.data, origin, catalog);
    if (result.ok) sink.send(result.hit);
    // A page outside the route table is dropped quietly: the app reports every screen and lets the server choose.
    else if (result.reason === 'invalid') throw new HttpError(400, 'invalid-event');
    res.status(204).end();
  });

  return router;
}
