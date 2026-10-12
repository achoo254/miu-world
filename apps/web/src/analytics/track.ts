// The two usage events the web app reports: a page view and a share. They go to Miu's own server
// (`POST /api/analytics/events`), which checks them and forwards them to Google Analytics; the browser never contacts
// Google. Reporting never gets in the way: a failed or refused report is dropped silently.
import { ANALYTICS_HEADER, MAX_ENGAGEMENT_MSEC, formatAnalyticsHeader, type SHARE_CONTENT_TYPES, type SHARE_METHODS } from '@miu/schema/analytics';
import { currentGaIds } from './analytics-ids';
import { visitAttribution } from './attribution';

export type ShareMethod = (typeof SHARE_METHODS)[number];
export type ShareContentType = (typeof SHARE_CONTENT_TYPES)[number];

/** When the last event was reported: the time since then is the engaged time of the page just left. */
let lastEventAt: number | null = null;

function report(body: Record<string, string | number | undefined>, nowMs: number): void {
  const ids = currentGaIds(nowMs);
  const engaged = lastEventAt === null ? 1 : Math.min(MAX_ENGAGEMENT_MSEC, Math.max(1, Math.round(nowMs - lastEventAt)));
  lastEventAt = nowMs;
  try {
    void fetch('/api/analytics/events', {
      method: 'POST',
      credentials: 'same-origin',
      keepalive: true,
      headers: { 'Content-Type': 'application/json', [ANALYTICS_HEADER]: formatAnalyticsHeader(ids) },
      body: JSON.stringify({ ...body, client_id: ids.clientId, session_id: ids.sessionId, engagement_time_msec: engaged }),
    }).catch(() => undefined);
  } catch {
    // No fetch at all (an old or locked-down browser): nothing is reported.
  }
}

/** A page was opened; the server keeps only the pages of its route table and drops the query. */
export function trackPageView(path: string, nowMs: number = Date.now()): void {
  report({ name: 'page_view', path, ...visitAttribution() }, nowMs);
}

/** Something was shared (an invite link, a result card, the week's summary). */
export function trackShare(share: { method: ShareMethod; contentType: ShareContentType; lessonId?: string; path?: string }, nowMs: number = Date.now()): void {
  report({ name: 'share', method: share.method, content_type: share.contentType, lesson_id: share.lessonId, path: share.path }, nowMs);
}

/** Forgets the last event time (tests). */
export function resetTrackForTest(): void {
  lastEventAt = null;
}
