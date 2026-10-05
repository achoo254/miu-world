import { eq } from 'drizzle-orm';
import { Router } from 'express';
import { HomeObjects } from '@miu/schema/home-objects';
import { activePlayerId, requireParent } from '../auth/auth-context';
import type { ContentCatalog } from '../content/content-catalog';
import type { Db } from '../db/client';
import { homeObjects } from '../db/schema';
import { parseInput } from '../http-error';

export interface HomeObjectRouteDeps {
  db: Db;
  content: ContentCatalog;
  clock: () => Date;
}

/**
 * What the selected player left switched on in her own home (a lamp, the television, a wardrobe open): the game
 * reads it when she comes home and saves the whole set again after each switch. Play state like her home decor,
 * kept per player; nothing in it is worth a reward, so the server only checks its shape.
 */
export function homeObjectRoutes({ db, content, clock }: HomeObjectRouteDeps): Router {
  const router = Router();

  router.get('/home-objects', requireParent, async (_req, res) => {
    const childId = await activePlayerId(db, res, content.consent.version);
    const [row] = await db.select().from(homeObjects).where(eq(homeObjects.childId, childId));
    const body: HomeObjects = { states: row?.states ?? {} };
    res.json(body);
  });

  /** Replaces what is kept switched on with the set sent (off is the default and is not stored). */
  router.put('/home-objects', requireParent, async (req, res) => {
    const childId = await activePlayerId(db, res, content.consent.version);
    const { states } = parseInput(HomeObjects, req.body);
    const saved = { states, updatedAt: clock() };
    await db
      .insert(homeObjects)
      .values({ childId, ...saved })
      .onConflictDoUpdate({ target: homeObjects.childId, set: saved });
    const body: HomeObjects = { states };
    res.json(body);
  });

  return router;
}
