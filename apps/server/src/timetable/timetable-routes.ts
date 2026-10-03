import { eq } from 'drizzle-orm';
import { Router } from 'express';
import { Timetable, emptyTimetable } from '@miu/schema/timetable';
import { activeChildId, requireParent } from '../auth/auth-context';
import type { ContentCatalog } from '../content/content-catalog';
import type { Db } from '../db/client';
import { timetables } from '../db/schema';
import { parseInput } from '../http-error';

export interface TimetableRouteDeps {
  db: Db;
  content: ContentCatalog;
  clock: () => Date;
}

/**
 * The selected child's class timetable and uniform rules. The family types them in the game (the child
 * or a parent beside her), so editing needs the same signed-in session as play, not the parent PIN.
 */
export function timetableRoutes({ db, content, clock }: TimetableRouteDeps): Router {
  const router = Router();

  router.get('/timetable', requireParent, async (_req, res) => {
    const childId = await activeChildId(db, res, content.consent.version);
    const [row] = await db.select().from(timetables).where(eq(timetables.childId, childId));
    // Nothing saved yet: the blank template, ready to fill in.
    const body: Timetable = row ? Timetable.parse(row.timetable) : emptyTimetable();
    res.json(body);
  });

  /** Replaces the whole timetable; answers with what was stored (trimmed). */
  router.put('/timetable', requireParent, async (req, res) => {
    const childId = await activeChildId(db, res, content.consent.version);
    const timetable = parseInput(Timetable, req.body);
    const saved = { timetable, updatedAt: clock() };
    await db
      .insert(timetables)
      .values({ childId, ...saved })
      .onConflictDoUpdate({ target: timetables.childId, set: saved });
    res.json(timetable);
  });

  return router;
}
