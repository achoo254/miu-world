// The moderator's API (the moderation screen, `/kiem-duyet`): the report queue, decisions on a report, and the
// emergency switch. A moderator is a signed-in account whose email is in `MODERATOR_ACCOUNTS`; to anyone else
// every route answers 404 (401 without a session), as if it did not exist.
import { eq } from 'drizzle-orm';
import { Router, type RequestHandler } from 'express';
import { Id } from '@miu/schema/account';
import { CharacterDto } from '@miu/schema/game';
import { ModerationActionRequest, OnlineModeRequest, ReportFilter, type ModerationActionResponse, type ModeratorStatus, type ReportListResponse } from '@miu/schema/moderation';
import { auth } from '../auth/auth-context';
import type { CharacterEvents } from '../character/character-events';
import type { ContentCatalog } from '../content/content-catalog';
import type { Db } from '../db/client';
import { characters } from '../db/schema';
import { HttpError, parseInput } from '../http-error';
import type { OnlineSwitch } from '../multiplayer/online-switch';
import type { PlayerEvents } from '../player/player-events';
import { decide, listReports } from './moderation-store';

export interface ModerationRouteDeps {
  db: Db;
  content: ContentCatalog;
  clock: () => Date;
  /** Lower-case sign-in emails of the moderators. */
  moderators: ReadonlySet<string>;
  onlineSwitch: OnlineSwitch;
  /** Told when a player's online play is locked (the hub closes her connection). */
  events?: PlayerEvents;
  /** Told when a player's name is reset (the others see the new name at once). */
  characterEvents?: CharacterEvents;
}

export function moderationRoutes({ db, content, clock, moderators, onlineSwitch, events, characterEvents }: ModerationRouteDeps): Router {
  const router = Router();
  const names = [...content.characterNames];

  /** Signed in (401 otherwise) as a moderator (404 otherwise, like a route that does not exist). */
  const requireModerator: RequestHandler = (_req, res, next) => {
    if (!moderators.has(auth(res).parent.email)) throw new HttpError(404, 'not-found');
    next();
  };

  router.get('/moderation/me', requireModerator, (_req, res) => {
    const body: ModeratorStatus = { onlineMode: onlineSwitch.mode };
    res.json(body);
  });

  /** `?status=open` (default) or `handled`; newest first. */
  router.get('/moderation/reports', requireModerator, async (req, res) => {
    const filter = ReportFilter.safeParse(req.query.status ?? 'open');
    if (!filter.success) throw new HttpError(400, 'invalid-input');
    const body: ReportListResponse = { reports: await listReports(db, clock(), { filter: filter.data }) };
    res.json(body);
  });

  router.post('/moderation/reports/:id/action', requireModerator, async (req, res) => {
    const id = Id.safeParse(req.params.id);
    if (!id.success) throw new HttpError(404, 'not-found');
    const request = parseInput(ModerationActionRequest, req.body);
    const now = clock();
    const decision = await decide(db, id.data, request, auth(res).parent.id, now, names);
    if (!decision) throw new HttpError(404, 'not-found');
    if (decision.locked) events?.emit({ type: 'restricted', childId: decision.reportedChildId });
    if (decision.renamed !== null && characterEvents) {
      const [row] = await db.select().from(characters).where(eq(characters.childId, decision.reportedChildId));
      if (row) characterEvents.emit(decision.reportedChildId, CharacterDto.parse(row));
    }
    const [report] = await listReports(db, now, { ids: [id.data] });
    if (!report) throw new HttpError(404, 'not-found');
    const body: ModerationActionResponse = { report };
    res.json(body);
  });

  /** The emergency switch: takes effect at once for everyone online; a restart goes back to `ONLINE_MODE`. */
  router.put('/moderation/online-mode', requireModerator, (req, res) => {
    const { mode } = parseInput(OnlineModeRequest, req.body);
    onlineSwitch.set(mode);
    console.log(`online mode set to ${mode} by a moderator`);
    const body: ModeratorStatus = { onlineMode: onlineSwitch.mode };
    res.json(body);
  });

  return router;
}
