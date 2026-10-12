// The web app's GA ids (`x-miu-ga` header: its random client id and its visit's session id), kept in memory per
// sign-in session so the events the server emits for that account or player (sign-up, quests) join the same GA user
// and visit as its page views. Never written to the database, never logged; forgotten after half an hour without a
// request (GA's own visit length), on restart, or when the table is full.
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

/** Remembers the request's GA ids for its sign-in session (after `loadSession`); requests without either pass as they are. */
export function rememberAnalyticsIds(sessions: AnalyticsSessions): RequestHandler {
  return (req, res, next) => {
    const ctx = optionalAuth(res);
    const ids = ctx ? parseAnalyticsHeader(req.headers[ANALYTICS_HEADER]) : null;
    if (ctx && ids) sessions.remember(ctx.session.id, ids, { parentId: ctx.parent.id, childId: ctx.session.activeChildId });
    next();
  };
}
