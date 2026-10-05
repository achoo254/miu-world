import { Router } from 'express';
import { PlayTimeBeat, type PlayerProgressDto } from '@miu/schema/progress';
import { activePlayerId, auth, requireParent, requireParentGate } from '../auth/auth-context';
import type { ContentCatalog } from '../content/content-catalog';
import type { Db } from '../db/client';
import { parseInput } from '../http-error';
import { idParam, ownedPlayer } from './owned-player';
import { addPlayTime, loadProgress } from './player-progress';

export interface ProgressRouteDeps {
  db: Db;
  content: ContentCatalog;
  clock: () => Date;
}

/**
 * Learning progress: the selected player's own (`GET /learning-progress`, Hồ sơ), any player of the account for its
 * owner (`GET /players/:id/learning-progress`, behind the account area's optional PIN), and the play screen's weekly
 * play time report (`POST /play-time`).
 */
export function progressRoutes({ db, content, clock }: ProgressRouteDeps): Router {
  const router = Router();
  const version = content.consent.version;

  router.get('/learning-progress', requireParent, async (_req, res) => {
    const childId = await activePlayerId(db, res, version);
    const body: PlayerProgressDto = await loadProgress(db, content, childId, clock());
    res.json(body);
  });

  router.get('/players/:id/learning-progress', requireParent, requireParentGate(clock), async (req, res) => {
    const player = await ownedPlayer(db, auth(res).parent.id, idParam(req.params.id));
    const body: PlayerProgressDto = await loadProgress(db, content, player.id, clock());
    res.json(body);
  });

  router.post('/play-time', requireParent, async (req, res) => {
    const childId = await activePlayerId(db, res, version);
    const { seconds } = parseInput(PlayTimeBeat, req.body);
    await addPlayTime(db, childId, seconds, clock());
    res.status(204).end();
  });

  return router;
}
