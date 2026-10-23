// The web app's GA ids (`x-miu-ga` header: its random client id and its visit's session id), kept in memory per
// sign-in session so the events the server emits for that account or player (sign-up, quests) join the same GA user
// and visit as its page views. Never written to the database, never logged; forgotten after half an hour without a
// request (GA's own visit length), on restart, or when the table is full.
import { AsyncLocalStorage } from 'node:async_hooks';
import type { RequestHandler } from 'express';
import { ANALYTICS_HEADER, parseAnalyticsHeader, type GaIds } from '@miu/schema/analytics';
import { optionalAuth } from '../auth/auth-context';

/** Ids unused this long are dropped: GA starts a new visit after 30 minutes anyway. */
export const IDS_IDLE_MS = 30 * 60_000;
/** Sign-in sessions remembered at most; the least recently seen goes first. */
export const MAX_SESSIONS = 10_000;

interface Entry {
  ids: GaIds;
  parentId: string;
  childId: string | null;
  seenAt: number;
}

export class AnalyticsSessions {
  /** By sign-in session id, least recently seen first. */
  private readonly entries = new Map<string, Entry>();
  /** Account and player → the sign-in session that last brought ids for it. */
  private readonly byAccount = new Map<string, string>();
  private readonly byPlayer = new Map<string, string>();

  constructor(private readonly now: () => number = Date.now) {}

  /** Keeps `ids` for a sign-in session of `parentId` playing as `childId` (null before a player is chosen). */
  remember(sessionId: string, ids: GaIds, owner: { parentId: string; childId: string | null }): void {
    const previous = this.entries.get(sessionId);
    if (previous) this.forget(sessionId, previous);
    this.entries.set(sessionId, { ids, ...owner, seenAt: this.now() });
    this.byAccount.set(owner.parentId, sessionId);
    if (owner.childId) this.byPlayer.set(owner.childId, sessionId);
    while (this.entries.size > MAX_SESSIONS) {
      const oldest = this.entries.entries().next().value;
      if (!oldest) break;
      this.forget(oldest[0], oldest[1]);
    }
  }

  /** The ids of the account's latest sign-in session, if still fresh. */
  forAccount(parentId: string): GaIds | null {
    return this.fresh(this.byAccount.get(parentId), (entry) => entry.parentId === parentId);
  }

  /** The ids of the latest sign-in session playing as `childId`, if still fresh. */
  forPlayer(childId: string): GaIds | null {
    return this.fresh(this.byPlayer.get(childId), (entry) => entry.childId === childId);
  }

  private fresh(sessionId: string | undefined, owns: (entry: Entry) => boolean): GaIds | null {
    if (sessionId === undefined) return null;
    const entry = this.entries.get(sessionId);
    if (!entry || !owns(entry)) return null;
    if (this.now() - entry.seenAt > IDS_IDLE_MS) {
      this.forget(sessionId, entry);
      return null;
    }
    return entry.ids;
  }

  private forget(sessionId: string, entry: Entry): void {
    this.entries.delete(sessionId);
    if (this.byAccount.get(entry.parentId) === sessionId) this.byAccount.delete(entry.parentId);
    if (entry.childId && this.byPlayer.get(entry.childId) === sessionId) this.byPlayer.delete(entry.childId);
  }
}

/** Whether the request being handled comes from the iPhone/Android app (set by `markAppRequests`). */
const appRequest = new AsyncLocalStorage<boolean>();

/**
 * True while handling a request of the iPhone/Android app: nothing it causes goes to Google Analytics (the app sends
 * no usage events at all; the web is unchanged). Outside a request (the hourly online peak) it is false.
 */
export const inAppRequest = (): boolean => appRequest.getStore() === true;

/** Runs `work` marked as the app's (or the web's) when it happens outside an HTTP request (a WebSocket message). */
export const asAppRequest = <T>(fromApp: boolean, work: () => T): T => appRequest.run(fromApp, work);

/**
 * Marks each request (after `loadSession`) as the app's or the web's, from what the server knows rather than anything
 * the client says about itself: the kind of its sign-in session (an app session is `native`, used as a Bearer token),
 * or, before sign-in, the app's own page origin (`APP_ORIGINS`, set by the system web view, which a page cannot
 * change; a client forging it only silences its own events). Everything the request goes on to do, including work
 * deferred until its transaction commits, runs inside the mark.
 */
export function markAppRequests(appOrigins: readonly string[]): RequestHandler {
  return (req, res, next) => {
    const ctx = optionalAuth(res);
    const fromApp = ctx ? ctx.session.kind === 'native' : appOrigins.includes(req.headers.origin ?? '');
    appRequest.run(fromApp, next);
  };
}

/**
 * Remembers the request's GA ids for its sign-in session (after `loadSession`); requests without either, and the
 * app's, pass as they are.
 */
export function rememberAnalyticsIds(sessions: AnalyticsSessions): RequestHandler {
  return (req, res, next) => {
    const ctx = optionalAuth(res);
    const ids = ctx && ctx.session.kind !== 'native' ? parseAnalyticsHeader(req.headers[ANALYTICS_HEADER]) : null;
    if (ctx && ids) sessions.remember(ctx.session.id, ids, { parentId: ctx.parent.id, childId: ctx.session.activeChildId });
    next();
  };
}
