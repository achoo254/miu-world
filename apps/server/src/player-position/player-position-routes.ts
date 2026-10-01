import { eq } from 'drizzle-orm';
import { Router } from 'express';
import { PlayerPosition, type PlayerPositionList } from '@miu/schema/player-position';
import { activeChildId, requireParent } from '../auth/auth-context';
import type { ContentCatalog } from '../content/content-catalog';
import type { Db } from '../db/client';
import { playerPositions } from '../db/schema';
import { HttpError, parseInput } from '../http-error';

export interface PlayerPositionRouteDeps {
  db: Db;
  content: ContentCatalog;
  clock: () => Date;
}

/** The active child's last spot on each map. Not a reward input: the client may report any spot it likes. */
export function playerPositionRoutes({ db, content, clock }: PlayerPositionRouteDeps): Router {
  const router = Router();

  router.get('/player-positions', requireParent, async (_req, res) => {
    const childId = await activeChildId(db, res, content.consent.version);
    const rows = await db.select().from(playerPositions).where(eq(playerPositions.childId, childId));
    const body: PlayerPositionList = {
      positions: rows.map((r) => ({ map: r.mapId, position: [r.x, r.y, r.z], facing: r.facing })),
    };
    res.json(body);
  });

  router.put('/player-positions', requireParent, async (req, res) => {
    const childId = await activeChildId(db, res, content.consent.version);
    const input = parseInput(PlayerPosition, req.body);
    if (!content.maps.has(input.map)) throw new HttpError(400, 'invalid-map');
    const [x, y, z] = input.position;
    const spot = { x, y, z, facing: input.facing, updatedAt: clock() };
    await db
      .insert(playerPositions)
      .values({ childId, mapId: input.map, ...spot })
      .onConflictDoUpdate({ target: [playerPositions.childId, playerPositions.mapId], set: spot });
    res.status(204).end();
  });

  return router;
}
