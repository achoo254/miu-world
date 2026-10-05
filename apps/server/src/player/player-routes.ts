import { randomUUID } from 'node:crypto';
import { and, asc, count, eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { PlayerDto, PlayerInput, PlayerLanguage } from '@miu/schema/account';
import { hasCurrentConsent } from '../auth/consent-store';
import { auth, requireParent, requireParentGate } from '../auth/auth-context';
import type { ContentCatalog } from '../content/content-catalog';
import type { Db } from '../db/client';
import { characters, childProfiles, consents, parents, sessions } from '../db/schema';
import { HttpError, parseInput } from '../http-error';
import { idParam, ownedPlayer, type PlayerRow } from './owned-player';

/** The primary player plus up to two extra players on a shared device. */
export const MAX_PLAYERS = 3;
export const DEFAULT_CHARACTER_NAME = 'Miu';
/** Same as the `characters.species` column default. */
const DEFAULT_SPECIES = 'cat';

const PlayerLanguageUpdate = z.object({ language: PlayerLanguage });
const PlayerPatchInput = z.object({
  displayName: z.string().min(1).max(40).transform((s) => s.normalize('NFC')).optional(),
  language: PlayerLanguage.optional(),
});

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

export interface PlayerRouteDeps {
  db: Db;
  content: ContentCatalog;
  clock: () => Date;
}

const toDto = (row: PlayerRow, species: string) => PlayerDto.parse({ ...row, primary: row.isPrimary, species });

/** Lock the account row so two concurrent creates cannot both pass the player limit or both make a primary. */
async function lockAccount(tx: Tx, parentId: string): Promise<void> {
  await tx.select({ id: parents.id }).from(parents).where(eq(parents.id, parentId)).for('update');
}

/** A new player always comes with its default character, so every player can play straight away. */
async function insertPlayer(tx: Tx, values: { parentId: string; displayName: string; language: string; isPrimary: boolean; createdAt: Date }) {
  const [row] = await tx.insert(childProfiles).values({ id: randomUUID(), ...values }).returning();
  if (!row) throw new Error('player insert returned no row');
  const [character] = await tx.insert(characters).values({ childId: row.id, name: DEFAULT_CHARACTER_NAME }).returning({ species: characters.species });
  return { row, species: character?.species ?? DEFAULT_SPECIES };
}

/**
 * The person who signs in is the account's primary player. Made once, in the same transaction that
 * records the policy acceptance (never before: no player data exists without consent), with the first
 * list name no other player of the account uses; the name can be changed later like any player's. An
 * account that somehow has players but no primary gets its oldest player promoted. The caller holds the
 * account lock.
 */
async function ensurePrimaryIn(tx: Tx, content: ContentCatalog, parentId: string, now: Date): Promise<string> {
  const players = await tx.select().from(childProfiles).where(eq(childProfiles.parentId, parentId)).orderBy(asc(childProfiles.createdAt), asc(childProfiles.id));
  const primary = players.find((p) => p.isPrimary);
  if (primary) return primary.id;
  const oldest = players[0];
  if (oldest) {
    await tx.update(childProfiles).set({ isPrimary: true }).where(eq(childProfiles.id, oldest.id));
    return oldest.id;
  }
  const taken = new Set(players.map((p) => p.displayName));
  const displayName = [...content.childDisplayNames].find((n) => !taken.has(n));
  if (!displayName) throw new Error('display name list is empty');
  const { row } = await insertPlayer(tx, { parentId, displayName, language: 'vi', isPrimary: true, createdAt: now });
  console.info('primary player created', row.id);
  return row.id;
}

/** Records the accepted policy version and makes sure the primary player exists, atomically. */
export async function acceptPolicy(db: Db, content: ContentCatalog, parentId: string, now: Date): Promise<string> {
  return db.transaction(async (tx) => {
    await lockAccount(tx, parentId);
    await tx.insert(consents).values({ id: randomUUID(), parentId, policyVersion: content.consent.version, acceptedAt: now }).onConflictDoNothing();
    return ensurePrimaryIn(tx, content, parentId, now);
  });
}

export function playerRoutes({ db, content, clock }: PlayerRouteDeps): Router {
  const router = Router();
  const gate = requireParentGate(clock);

  /** Every player has a character (created with it); the fallback only covers a row being deleted. */
  async function speciesOf(id: string): Promise<string> {
    const [row] = await db.select({ species: characters.species }).from(characters).where(eq(characters.childId, id));
    return row?.species ?? DEFAULT_SPECIES;
  }

  router.get('/players', requireParent, async (_req, res) => {
    const rows = await db
      .select({ player: childProfiles, species: characters.species })
      .from(childProfiles)
      .leftJoin(characters, eq(characters.childId, childProfiles.id))
      .where(eq(childProfiles.parentId, auth(res).parent.id))
      .orderBy(asc(childProfiles.createdAt), asc(childProfiles.id));
    res.json(z.array(PlayerDto).parse(rows.map((r) => toDto(r.player, r.species ?? DEFAULT_SPECIES))));
  });

  /** An extra player on a shared device (the primary player is made on consent). */
  router.post('/players', requireParent, gate, async (req, res) => {
    const { parent } = auth(res);
    const input = parseInput(PlayerInput, req.body);
    if (!content.childDisplayNames.has(input.displayName)) throw new HttpError(400, 'invalid-display-name');
    if (!(await hasCurrentConsent(db, parent.id, content.consent.version))) throw new HttpError(403, 'consent-required');
    const created = await db.transaction(async (tx) => {
      await lockAccount(tx, parent.id);
      // Self-heal: an extra player is only ever added next to the primary one.
      await ensurePrimaryIn(tx, content, parent.id, clock());
      const [existing] = await tx.select({ n: count() }).from(childProfiles).where(eq(childProfiles.parentId, parent.id));
      if ((existing?.n ?? 0) >= MAX_PLAYERS) throw new HttpError(409, 'profile-limit');
      return insertPlayer(tx, { parentId: parent.id, displayName: input.displayName, language: input.language ?? 'vi', isPrimary: false, createdAt: clock() });
    });
    console.info('extra player created', created.row.id);
    res.status(201).json(toDto(created.row, created.species));
  });

  router.patch('/players/:id', requireParent, gate, async (req, res) => {
    const { parent } = auth(res);
    const id = idParam(req.params.id);
    const patch = parseInput(PlayerPatchInput, req.body);
    if (patch.displayName !== undefined && !content.childDisplayNames.has(patch.displayName)) {
      throw new HttpError(400, 'invalid-display-name');
    }
    const updateValues: Partial<typeof childProfiles.$inferInsert> = {};
    if (patch.displayName !== undefined) updateValues.displayName = patch.displayName;
    if (patch.language !== undefined) updateValues.language = patch.language;
    if (Object.keys(updateValues).length === 0) throw new HttpError(400, 'empty-patch');
    const [row] = await db
      .update(childProfiles)
      .set(updateValues)
      .where(and(eq(childProfiles.id, id), eq(childProfiles.parentId, parent.id)))
      .returning();
    if (!row) throw new HttpError(404, 'not-found');
    res.json(toDto(row, await speciesOf(row.id)));
  });

  /** Changing language is a player's own setting: no gate, only authentication and ownership. */
  router.patch('/players/:id/language', requireParent, async (req, res) => {
    const { parent } = auth(res);
    const id = idParam(req.params.id);
    const { language } = parseInput(PlayerLanguageUpdate, req.body);
    const [row] = await db
      .update(childProfiles)
      .set({ language })
      .where(and(eq(childProfiles.id, id), eq(childProfiles.parentId, parent.id)))
      .returning();
    if (!row) throw new HttpError(404, 'not-found');
    res.json(toDto(row, await speciesOf(row.id)));
  });

  /**
   * Hard delete of an extra player: foreign keys cascade to character, progress, ledger, inventory and
   * skills. The primary player goes only with the whole account.
   */
  router.delete('/players/:id', requireParent, gate, async (req, res) => {
    const { parent } = auth(res);
    const id = idParam(req.params.id);
    const row = await ownedPlayer(db, parent.id, id);
    if (row.isPrimary) throw new HttpError(409, 'primary-player');
    await db.delete(childProfiles).where(and(eq(childProfiles.id, id), eq(childProfiles.parentId, parent.id), eq(childProfiles.isPrimary, false)));
    console.info('extra player deleted', id);
    res.status(204).end();
  });

  /**
   * Choosing who plays is not gated: each player picks their own on a shared device. Switching player
   * closes the account area; play needs consent to the current policy.
   */
  router.post('/players/:id/select', requireParent, async (req, res) => {
    const { parent, session } = auth(res);
    const id = idParam(req.params.id);
    await ownedPlayer(db, parent.id, id);
    if (!(await hasCurrentConsent(db, parent.id, content.consent.version))) throw new HttpError(403, 'consent-required');
    await db.update(sessions).set({ activeChildId: id, parentGateUntil: null }).where(eq(sessions.id, session.id));
    res.json({ activePlayerId: id });
  });

  return router;
}
