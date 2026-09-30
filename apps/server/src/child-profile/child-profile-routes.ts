import { randomUUID } from 'node:crypto';
import { and, asc, count, eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { ChildProfileDto, ChildProfileInput, Id } from '@miu/schema/account';
import { hasCurrentConsent } from '../auth/consent-store';
import { auth, requireParent, requireParentGate } from '../auth/auth-context';
import type { ContentCatalog } from '../content/content-catalog';
import type { Db } from '../db/client';
import { characters, childProfiles, parents, sessions } from '../db/schema';
import { HttpError, parseInput } from '../http-error';

export const MAX_CHILD_PROFILES = 3;
export const DEFAULT_CHARACTER_NAME = 'Miu';
/** Same as the `characters.species` column default. */
const DEFAULT_SPECIES = 'cat';

export interface ChildProfileRouteDeps {
  db: Db;
  content: ContentCatalog;
  clock: () => Date;
}

/** Non-uuid ids are simply "not found": same answer as another family's profile. */
function profileId(raw: unknown): string {
  const parsed = Id.safeParse(raw);
  if (!parsed.success) throw new HttpError(404, 'not-found');
  return parsed.data;
}

const toDto = (row: typeof childProfiles.$inferSelect, species: string) => ChildProfileDto.parse({ ...row, species });

export function childProfileRoutes({ db, content, clock }: ChildProfileRouteDeps): Router {
  const router = Router();
  const gate = requireParentGate(clock);

  function displayName(input: unknown): string {
    const { displayName: name } = parseInput(ChildProfileInput, input);
    if (!content.childDisplayNames.has(name)) throw new HttpError(400, 'invalid-display-name');
    return name;
  }

  /** Every lookup is scoped by parent: another family's profile is indistinguishable from a missing one. */
  async function ownedProfile(parentId: string, id: string) {
    const [row] = await db
      .select()
      .from(childProfiles)
      .where(and(eq(childProfiles.id, id), eq(childProfiles.parentId, parentId)));
    if (!row) throw new HttpError(404, 'not-found');
    return row;
  }

  /** Every profile has a character (created with it); the fallback only covers a row being deleted. */
  async function speciesOf(childId: string): Promise<string> {
    const [row] = await db.select({ species: characters.species }).from(characters).where(eq(characters.childId, childId));
    return row?.species ?? DEFAULT_SPECIES;
  }

  router.get('/children', requireParent, async (_req, res) => {
    const rows = await db
      .select({ profile: childProfiles, species: characters.species })
      .from(childProfiles)
      .leftJoin(characters, eq(characters.childId, childProfiles.id))
      .where(eq(childProfiles.parentId, auth(res).parent.id))
      .orderBy(asc(childProfiles.createdAt), asc(childProfiles.id));
    res.json(z.array(ChildProfileDto).parse(rows.map((r) => toDto(r.profile, r.species ?? DEFAULT_SPECIES))));
  });

  router.post('/children', requireParent, gate, async (req, res) => {
    const { parent } = auth(res);
    const name = displayName(req.body);
    if (!(await hasCurrentConsent(db, parent.id, content.consent.version))) throw new HttpError(403, 'consent-required');
    const created = await db.transaction(async (tx) => {
      // Lock the parent row so two concurrent creates cannot both pass the profile limit.
      await tx.select({ id: parents.id }).from(parents).where(eq(parents.id, parent.id)).for('update');
      const [existing] = await tx.select({ n: count() }).from(childProfiles).where(eq(childProfiles.parentId, parent.id));
      if ((existing?.n ?? 0) >= MAX_CHILD_PROFILES) throw new HttpError(409, 'profile-limit');
      const [row] = await tx
        .insert(childProfiles)
        .values({ id: randomUUID(), parentId: parent.id, displayName: name, createdAt: clock() })
        .returning();
      if (!row) throw new Error('profile insert returned no row');
      const [character] = await tx.insert(characters).values({ childId: row.id, name: DEFAULT_CHARACTER_NAME }).returning({ species: characters.species });
      return { row, species: character?.species ?? DEFAULT_SPECIES };
    });
    console.info('child profile created', created.row.id);
    res.status(201).json(toDto(created.row, created.species));
  });

  router.patch('/children/:id', requireParent, gate, async (req, res) => {
    const { parent } = auth(res);
    const id = profileId(req.params.id);
    const name = displayName(req.body);
    const [row] = await db
      .update(childProfiles)
      .set({ displayName: name })
      .where(and(eq(childProfiles.id, id), eq(childProfiles.parentId, parent.id)))
      .returning();
    if (!row) throw new HttpError(404, 'not-found');
    res.json(toDto(row, await speciesOf(row.id)));
  });

  /** Hard delete: foreign keys cascade to character, progress, ledger, inventory and skills. */
  router.delete('/children/:id', requireParent, gate, async (req, res) => {
    const { parent } = auth(res);
    const id = profileId(req.params.id);
    const deleted = await db.transaction(async (tx) =>
      tx
        .delete(childProfiles)
        .where(and(eq(childProfiles.id, id), eq(childProfiles.parentId, parent.id)))
        .returning({ id: childProfiles.id }),
    );
    if (deleted.length === 0) throw new HttpError(404, 'not-found');
    console.info('child profile deleted', id);
    res.status(204).end();
  });

  /**
   * Choosing who plays is not parent-gated: the child picks their own profile on a shared device.
   * Handing the device to the child closes the parent area; play needs consent to the current policy.
   */
  router.post('/children/:id/select', requireParent, async (req, res) => {
    const { parent, session } = auth(res);
    const id = profileId(req.params.id);
    await ownedProfile(parent.id, id);
    if (!(await hasCurrentConsent(db, parent.id, content.consent.version))) throw new HttpError(403, 'consent-required');
    await db.update(sessions).set({ activeChildId: id, parentGateUntil: null }).where(eq(sessions.id, session.id));
    res.json({ activeChildId: id });
  });

  return router;
}
