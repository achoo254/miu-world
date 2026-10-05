import { eq } from 'drizzle-orm';
import { Router, type Response } from 'express';
import { FriendAnswer, SocialView } from '@miu/schema/friends';
import { activePlayerId, auth, requireParent, requireParentGate } from '../auth/auth-context';
import type { ContentCatalog } from '../content/content-catalog';
import type { Db } from '../db/client';
import { characters } from '../db/schema';
import { HttpError, parseInput } from '../http-error';
import { idParam, ownedPlayer } from '../player/owned-player';
import type { PlayerEvents } from '../player/player-events';
import { DEFAULT_CHARACTER_NAME } from '../player/player-routes';
import { NOBODY_ONLINE, answerRequest, cancelRequest, hasRequest, removeFriend, socialView, unblock, type OnlineLookup } from './friend-store';

export interface FriendRouteDeps {
  db: Db;
  content: ContentCatalog;
  clock: () => Date;
  events?: PlayerEvents;
  /** Who is in a room now (the multiplayer hub); without it every friend shows offline. */
  online?: OnlineLookup;
}

/**
 * Friends and blocks over the API (requests themselves are sent in a room, over the multiplayer connection):
 * the selected player's own (`/friends`, `/blocks`), and any player's for the account owner (`/players/:id/…`,
 * behind the optional PIN: view, remove a friend, lift a block). Everything names rows by their own ids.
 */
export function friendRoutes({ db, content, clock, events, online = NOBODY_ONLINE }: FriendRouteDeps): Router {
  const router = Router();
  const gate = requireParentGate(clock);
  const version = content.consent.version;

  const view = async (res: Response, childId: string): Promise<void> => {
    res.set('Cache-Control', 'no-store');
    res.json(SocialView.parse(await socialView(db, childId, online)));
  };

  async function dropFriend(childId: string, friendshipId: string): Promise<void> {
    const ended = await removeFriend(db, childId, friendshipId);
    if (!ended) throw new HttpError(404, 'not-found');
    events?.emit({ type: 'unfriended', childId, ...ended });
  }

  async function liftBlock(childId: string, blockId: string): Promise<void> {
    const other = await unblock(db, childId, blockId);
    if (!other) throw new HttpError(404, 'not-found');
    events?.emit({ type: 'unblocked', childId, otherChildId: other });
  }

  /** The player of the account named in the path (another account's is "not found"). */
  const accountPlayer = async (res: Response, raw: unknown): Promise<string> => (await ownedPlayer(db, auth(res).parent.id, idParam(raw))).id;

  router.get('/friends', requireParent, async (_req, res) => {
    await view(res, await activePlayerId(db, res, version));
  });

  router.post('/friends/requests/:id', requireParent, async (req, res) => {
    const childId = await activePlayerId(db, res, version);
    const requestId = idParam(req.params.id);
    // Not hers (or gone) is "not found" whatever the body says.
    if (!(await hasRequest(db, childId, requestId))) throw new HttpError(404, 'not-found');
    const { accept } = parseInput(FriendAnswer, req.body);
    const outcome = await answerRequest(db, childId, requestId, accept);
    if (outcome.kind === 'not-found') throw new HttpError(404, 'not-found');
    if (outcome.kind === 'friends-full') throw new HttpError(409, 'friends-full');
    const [character] = await db.select({ name: characters.name, species: characters.species }).from(characters).where(eq(characters.childId, childId));
    events?.emit({
      type: 'friend-answered',
      childId,
      who: { displayName: character?.name ?? DEFAULT_CHARACTER_NAME, species: character?.species ?? 'cat' },
      fromChildId: outcome.fromChildId,
      fromBotId: outcome.fromBotId,
      accepted: outcome.accepted,
    });
    await view(res, childId);
  });

  router.delete('/friends/requests/:id', requireParent, async (req, res) => {
    const childId = await activePlayerId(db, res, version);
    if (!(await cancelRequest(db, childId, idParam(req.params.id)))) throw new HttpError(404, 'not-found');
    res.status(204).end();
  });

  router.delete('/friends/:id', requireParent, async (req, res) => {
    await dropFriend(await activePlayerId(db, res, version), idParam(req.params.id));
    res.status(204).end();
  });

  router.delete('/blocks/:id', requireParent, async (req, res) => {
    await liftBlock(await activePlayerId(db, res, version), idParam(req.params.id));
    res.status(204).end();
  });

  router.get('/players/:id/friends', requireParent, gate, async (req, res) => {
    await view(res, await accountPlayer(res, req.params.id));
  });

  router.delete('/players/:id/friends/:friendId', requireParent, gate, async (req, res) => {
    const childId = await accountPlayer(res, req.params.id);
    await dropFriend(childId, idParam(req.params.friendId));
    res.status(204).end();
  });

  router.delete('/players/:id/blocks/:blockId', requireParent, gate, async (req, res) => {
    const childId = await accountPlayer(res, req.params.id);
    await liftBlock(childId, idParam(req.params.blockId));
    res.status(204).end();
  });

  return router;
}
