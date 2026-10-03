import { readFileSync } from 'node:fs';
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
  /** What a child sees before her family saves its own timetable (the blank template when none is configured). */
  defaultTimetable?: Timetable;
}

/**
 * The timetable every child starts from: the JSON file named by TIMETABLE_DEFAULT_FILE, else the blank
 * template. A missing or invalid file falls back to the blank template (logged without its content).
 */
export function loadDefaultTimetable(file: string | null): Timetable {
  if (!file) return emptyTimetable();
  try {
    return Timetable.parse(JSON.parse(readFileSync(file, 'utf8')));
  } catch (err) {
    console.warn(`timetable default not used (${err instanceof SyntaxError || (err instanceof Error && err.name === 'ZodError') ? 'invalid' : 'unreadable'} file)`);
    return emptyTimetable();
  }
}

/**
 * The selected child's class timetable and uniform rules. The family types them in the game (the child
 * or a parent beside her), so editing needs the same signed-in session as play, not the parent PIN.
 */
export function timetableRoutes({ db, content, clock, defaultTimetable }: TimetableRouteDeps): Router {
  const router = Router();

  router.get('/timetable', requireParent, async (_req, res) => {
    const childId = await activeChildId(db, res, content.consent.version);
    const [row] = await db.select().from(timetables).where(eq(timetables.childId, childId));
    // Nothing saved yet: the default timetable (the owner's class) or the blank template, ready to edit.
    const body: Timetable = row ? Timetable.parse(row.timetable) : (defaultTimetable ?? emptyTimetable());
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
