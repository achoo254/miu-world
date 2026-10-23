// `POST /api/online-ticket`: the one-use ticket the web app opens the multiplayer connection with (`online-tickets.ts`).
// Signed in and playing as a player who accepted the policy, from an allowed Origin (every POST is checked). While
// the emergency switch is off, her online play is locked, or the account owner turned her online play off, no ticket
// is given and the answer says why, so the game shows a friendly line instead of trying to connect.
import { eq } from 'drizzle-orm';
import { Router } from 'express';
import type { WsTicketResponse } from '@miu/schema/multiplayer';
import { activePlayerId, auth, requireParent } from '../auth/auth-context';
import type { ContentCatalog } from '../content/content-catalog';
import type { Db } from '../db/client';
import { childProfiles } from '../db/schema';
import { HttpError } from '../http-error';
import { activeRestriction } from '../moderation/moderation-store';
import type { OnlineSwitch } from './online-switch';
import type { WsTickets } from './online-tickets';

export interface WsTicketRouteDeps {
  db: Db;
  content: ContentCatalog;
  clock: () => Date;
  tickets: WsTickets;
  onlineSwitch: OnlineSwitch;
}

export function wsTicketRoutes({ db, content, clock, tickets, onlineSwitch }: WsTicketRouteDeps): Router {
  const router = Router();

  router.post('/online-ticket', requireParent, async (_req, res) => {
    const childId = await activePlayerId(db, res, content.consent.version);
    if (onlineSwitch.mode === 'off') throw new HttpError(503, 'online-paused');
    if (await activeRestriction(db, childId, clock())) throw new HttpError(403, 'online-restricted');
    const [controls] = await db.select({ onlineAllowed: childProfiles.onlineAllowed }).from(childProfiles).where(eq(childProfiles.id, childId));
    if (!controls?.onlineAllowed) throw new HttpError(403, 'online-off');
    const body: WsTicketResponse = { ticket: tickets.issue(auth(res).session.id, childId) };
    res.set('Cache-Control', 'no-store').json(body);
  });

  return router;
}
