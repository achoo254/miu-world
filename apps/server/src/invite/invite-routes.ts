import { eq } from 'drizzle-orm';
import { Router, type Request } from 'express';
import { INVITE_CODE, InviteAcceptedDto, InviteList, CreatedInviteDto, INVITES_MAX } from '@miu/schema/invites';
import { serverEvents } from '../analytics/server-events';
import { activePlayerId, optionalAuth, requireParent } from '../auth/auth-context';
import type { ContentCatalog } from '../content/content-catalog';
import type { Db } from '../db/client';
import { characters } from '../db/schema';
import { HttpError } from '../http-error';
import { idParam } from '../player/owned-player';
import type { PlayerEvents } from '../player/player-events';
import { requireOnlineAllowed } from '../player/player-controls';
import { DEFAULT_CHARACTER_NAME } from '../player/player-routes';
import { ipKey, limiter } from '../rate-limit';
import { acceptInvite, createInvite, listInvites, revokeInvite } from './invite-store';

export interface InviteRouteDeps {
  db: Db;
  content: ContentCatalog;
  clock: () => Date;
  events?: PlayerEvents;
}

const TEN_MINUTES = 10 * 60_000;
const HOUR = 60 * 60_000;

/** Whoever is asking: her account (a school shares one address), or the address when there is no session. */
const perAccount = (req: Request): string => (req.res ? optionalAuth(req.res)?.parent.id : undefined) ?? ipKey(req);

/** A code in the address that is not a code's shape is simply "not found", whoever asks. */
function codeParam(raw: unknown): string {
  if (typeof raw !== 'string' || !INVITE_CODE.test(raw)) throw new HttpError(404, 'not-found');
  return raw;
}

/**
 * Invite links: the selected player makes one (`POST /invites`, the code is told once), lists her live ones
 * (`GET /invites`, no codes) and withdraws one (`DELETE /invites/:id`); another player uses a code
 * (`POST /invites/:code/accept`) to become her friend. A code that does not work for any reason, and an invite that
 * is not hers to withdraw, are "not found". Using a link is limited per account.
 */
export function inviteRoutes({ db, content, clock, events }: InviteRouteDeps): Router {
  const router = Router();
  const version = content.consent.version;
  const createLimit = limiter(HOUR, 20, perAccount);
  const acceptLimit = limiter(TEN_MINUTES, 10, perAccount);

  /** A player's character as a friends list shows her. */
  async function lookOf(childId: string): Promise<{ displayName: string; species: string }> {
    const [row] = await db.select({ name: characters.name, species: characters.species }).from(characters).where(eq(characters.childId, childId));
    return { displayName: row?.name ?? DEFAULT_CHARACTER_NAME, species: row?.species ?? 'cat' };
  }

  router.get('/invites', requireParent, async (_req, res) => {
    const childId = await activePlayerId(db, res, version);
    res.set('Cache-Control', 'no-store');
    res.json(InviteList.parse({ invites: await listInvites(db, childId, clock()), max: INVITES_MAX }));
  });

  router.post('/invites', requireParent, createLimit, async (_req, res) => {
    const childId = await activePlayerId(db, res, version);
    // Online off (account owner): no new friends, by link either.
    await requireOnlineAllowed(db, childId);
    const created = await createInvite(db, childId, clock());
    if (!created) throw new HttpError(409, 'invite-limit');
    res.set('Cache-Control', 'no-store');
    res.status(201).json(CreatedInviteDto.parse(created));
  });

  router.delete('/invites/:id', requireParent, async (req, res) => {
    const childId = await activePlayerId(db, res, version);
    if (!(await revokeInvite(db, childId, idParam(req.params.id), clock()))) throw new HttpError(404, 'not-found');
    res.status(204).end();
  });

  router.post('/invites/:code/accept', requireParent, acceptLimit, async (req, res) => {
    const childId = await activePlayerId(db, res, version);
    await requireOnlineAllowed(db, childId);
    const outcome = await acceptInvite(db, childId, codeParam(req.params.code), clock());
    if (outcome.kind === 'not-found') throw new HttpError(404, 'not-found');
    if (outcome.kind === 'friends-full') throw new HttpError(409, 'friends-full');
    if (outcome.fresh) {
      // The one who made the link hears it in the game like any accepted request; the usage number is the visit's.
      events?.emit({ type: 'friend-answered', childId, who: await lookOf(childId), fromChildId: outcome.inviterId, fromBotId: null, accepted: true });
      serverEvents()?.inviteAccepted(childId);
    }
    res.set('Cache-Control', 'no-store');
    res.json(InviteAcceptedDto.parse({ friend: await lookOf(outcome.inviterId), already: !outcome.fresh }));
  });

  return router;
}
