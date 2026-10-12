// Sends anonymous usage events to Google Analytics 4 over the Measurement Protocol, from the server only (the browser
// loads nothing from Google). Events wait in a bounded queue and leave in small batches a few seconds later, so a
// player's request never waits on Google and an outage of Google never fails one. Without a GA4 property configured
// (dev, test, E2E, staging) nothing is queued or sent. Failures log the HTTP status or the error class only: the URL
// carries the secret.
import type { Ga4Hit } from '@miu/schema/analytics';
import type { Ga4Config } from '../config';

export const GA4_COLLECT_URL = 'https://www.google-analytics.com/mp/collect';
/** Google's validation endpoint: answers what is wrong with each event instead of recording it. */
export const GA4_DEBUG_URL = 'https://www.google-analytics.com/debug/mp/collect';
/** Queued events at most; when full the oldest is dropped. */
export const QUEUE_MAX = 1_000;
/** Events per request at most (the Measurement Protocol's own limit). */
export const BATCH_MAX = 25;
/** How long an event waits for others to leave with it. */
export const FLUSH_MS = 5_000;
/** A request to Google is given up after this long (a restart waits for the last flush). */
export const SEND_TIMEOUT_MS = 2_000;

/** Where events go: the forwarder, or a test's recorder. */
export interface EventSink {
  send(hit: Ga4Hit): void;
}

export interface Ga4ForwarderOptions {
  config: Ga4Config | null;
  /** Tests inject a fake so Google is never contacted. */
  fetchImpl?: typeof fetch;
  flushMs?: number;
  timeoutMs?: number;
  queueMax?: number;
}

/**
 * One Measurement Protocol request body: one GA user, up to 25 events. No IP, user agent or user id is ever added;
 * ads use of the data is refused.
 */
function requestBody(clientId: string, hits: readonly Ga4Hit[]): string {
  return JSON.stringify({
    client_id: clientId,
    consent: { ad_user_data: 'DENIED', ad_personalization: 'DENIED' },
    events: hits.map((hit) => hit.event),
  });
}

export class Ga4Forwarder implements EventSink {
  private queue: Ga4Hit[] = [];
  private timer: NodeJS.Timeout | null = null;
  private flushing: Promise<void> | null = null;
  private closed = false;
  private readonly config: Ga4Config | null;
  private readonly fetchImpl: typeof fetch;
  private readonly flushMs: number;
  private readonly timeoutMs: number;
  private readonly queueMax: number;

  constructor(options: Ga4ForwarderOptions) {
    this.config = options.config;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.flushMs = options.flushMs ?? FLUSH_MS;
    this.timeoutMs = options.timeoutMs ?? SEND_TIMEOUT_MS;
    this.queueMax = options.queueMax ?? QUEUE_MAX;
  }

  /** Events waiting to leave. */
  get pending(): number {
    return this.queue.length;
  }

  /** Queues an event; returns at once. Nothing happens without a GA4 property or after `close`. */
  send(hit: Ga4Hit): void {
    if (!this.config || this.closed) return;
    this.queue.push(hit);
    if (this.queue.length > this.queueMax) this.queue.shift();
    if (this.queue.length >= BATCH_MAX) void this.flush();
    else this.schedule();
  }

  /** Sends everything queued; never throws. Concurrent calls share one run. */
  flush(): Promise<void> {
    this.flushing ??= this.drain().finally(() => {
      this.flushing = null;
      if (this.queue.length > 0) this.schedule();
    });
    return this.flushing;
  }

  /** Sends what is left and stops taking events (the server is stopping). */
  async close(): Promise<void> {
    this.closed = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    await this.flush();
  }

  /** Posts `hits` to Google's validation endpoint and returns its answer (the dev check of the events' shape). */
  async validate(hits: readonly Ga4Hit[]): Promise<unknown> {
    const first = hits[0];
    if (!this.config || !first) return null;
    const res = await this.post(GA4_DEBUG_URL, requestBody(first.clientId, hits));
    return res.json();
  }

  private schedule(): void {
    if (this.timer || this.closed) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, this.flushMs);
    this.timer.unref();
  }

  private async drain(): Promise<void> {
    while (this.queue.length > 0) {
      const batch = this.takeBatch();
      const first = batch[0];
      if (!first) return;
      try {
        const res = await this.post(GA4_COLLECT_URL, requestBody(first.clientId, batch));
        if (!res.ok) console.warn('analytics events not accepted', res.status);
      } catch (err) {
        console.warn('analytics events not sent', err instanceof Error ? err.name : typeof err);
      }
    }
  }

  /** The oldest event's GA user and up to `BATCH_MAX` of that user's queued events, in order. */
  private takeBatch(): Ga4Hit[] {
    const clientId = this.queue[0]?.clientId;
    const batch: Ga4Hit[] = [];
    const rest: Ga4Hit[] = [];
    for (const hit of this.queue) {
      if (hit.clientId === clientId && batch.length < BATCH_MAX) batch.push(hit);
      else rest.push(hit);
    }
    this.queue = rest;
    return batch;
  }

  private post(base: string, body: string): Promise<Response> {
    if (!this.config) throw new Error('GA4 is not configured');
    const query = new URLSearchParams({ measurement_id: this.config.measurementId, api_secret: this.config.apiSecret });
    return this.fetchImpl(`${base}?${query.toString()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(this.timeoutMs),
    });
  }
}
