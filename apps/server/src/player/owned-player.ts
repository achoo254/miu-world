// The account-scoped lookup every route that names a player goes through: a player of another account is
// indistinguishable from a missing one (404, never 403), and so is an id that is not a uuid.
import { and, eq } from 'drizzle-orm';
import { Id } from '@miu/schema/account';
import type { Db } from '../db/client';
import { childProfiles } from '../db/schema';
import { HttpError } from '../http-error';

export type PlayerRow = typeof childProfiles.$inferSelect;

/** A route parameter that must be an id: anything else is simply "not found". */
export function idParam(raw: unknown): string {
  const parsed = Id.safeParse(raw);
  if (!parsed.success) throw new HttpError(404, 'not-found');
  return parsed.data;
}

export async function ownedPlayer(db: Db, parentId: string, id: string): Promise<PlayerRow> {
  const [row] = await db
    .select()
    .from(childProfiles)
    .where(and(eq(childProfiles.id, id), eq(childProfiles.parentId, parentId)));
  if (!row) throw new HttpError(404, 'not-found');
  return row;
}
