import { eq, inArray } from 'drizzle-orm';
import { Router } from 'express';
import type { AccountExport } from '@miu/schema/account';
import type { ServerConfig } from '../config';
import type { Db } from '../db/client';
import {
  characters,
  childProfiles,
  consents,
  inventoryItems,
  parents,
  questProgress,
  rewardLedger,
  sessions,
  skillProgress,
  stepAttempts,
} from '../db/schema';
import { auth, requireParent, requireParentGate } from './auth-context';
import { clearSessionCookie } from './session-cookie';

export interface AccountRouteDeps {
  db: Db;
  config: ServerConfig;
  clock: () => Date;
}

const iso = (d: Date) => d.toISOString();

/** Rows of one child table grouped by child id, so each profile gets only its own rows. */
function byChild<T extends { childId: string }>(rows: T[]): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const row of rows) out.set(row.childId, [...(out.get(row.childId) ?? []), row]);
  return out;
}

async function buildExport(db: Db, parent: typeof parents.$inferSelect, now: Date): Promise<AccountExport> {
  const profiles = await db.select().from(childProfiles).where(eq(childProfiles.parentId, parent.id)).orderBy(childProfiles.createdAt);
  const ids = profiles.map((p) => p.id);
  const ofChildren = <T extends { childId: string }>(rows: Promise<T[]>) => (ids.length ? rows : Promise.resolve([] as T[]));
  const [consentRows, sessionRows, characterRows, questRows, counterRows, rewardRows, itemRows, skillRows] = await Promise.all([
    db.select().from(consents).where(eq(consents.parentId, parent.id)).orderBy(consents.acceptedAt),
    db.select().from(sessions).where(eq(sessions.parentId, parent.id)).orderBy(sessions.createdAt),
    ofChildren(db.select().from(characters).where(inArray(characters.childId, ids))),
    ofChildren(db.select().from(questProgress).where(inArray(questProgress.childId, ids))),
    ofChildren(db.select().from(stepAttempts).where(inArray(stepAttempts.childId, ids))),
    ofChildren(db.select().from(rewardLedger).where(inArray(rewardLedger.childId, ids)).orderBy(rewardLedger.createdAt)),
    ofChildren(db.select().from(inventoryItems).where(inArray(inventoryItems.childId, ids))),
    ofChildren(db.select().from(skillProgress).where(inArray(skillProgress.childId, ids))),
  ]);
  const quests = byChild(questRows);
  const counters = byChild(counterRows);
  const rewards = byChild(rewardRows);
  const items = byChild(itemRows);
  const skills = byChild(skillRows);
  return {
    exportedAt: iso(now),
    parent: { email: parent.email, signIn: parent.googleSub ? 'google' : 'password', createdAt: iso(parent.createdAt) },
    consents: consentRows.map((c) => ({ policyVersion: c.policyVersion, acceptedAt: iso(c.acceptedAt) })),
    sessions: sessionRows.map((s) => ({ createdAt: iso(s.createdAt), lastSeenAt: iso(s.lastSeenAt), expiresAt: iso(s.expiresAt) })),
    children: profiles.map((p) => {
      const character = characterRows.find((c) => c.childId === p.id);
      return {
        displayName: p.displayName,
        createdAt: iso(p.createdAt),
        character: character ? { species: character.species, name: character.name, equipped: character.equipped } : null,
        quests: (quests.get(p.id) ?? []).map((q) => ({
          questId: q.questId,
          completedSteps: q.completedSteps,
          found: q.found,
          completedAt: q.completedAt ? iso(q.completedAt) : null,
          stars: q.stars,
          xpAwarded: q.xpAwarded,
        })),
        stepCounters: (counters.get(p.id) ?? []).map(({ questId, stepId, wrongCount, answerViews }) => ({ questId, stepId, wrongCount, answerViews })),
        rewards: (rewards.get(p.id) ?? []).map((r) => ({ source: r.source, xp: r.xp, coins: r.coins, skillXp: r.skillXp, items: r.items, createdAt: iso(r.createdAt) })),
        inventory: (items.get(p.id) ?? []).map(({ itemId, qty }) => ({ itemId, qty })),
        skills: (skills.get(p.id) ?? []).map(({ skillId, xp }) => ({ skillId, xp })),
      };
    }),
  };
}

/** The parent's own data rights: download everything, or delete the account. Both behind the PIN. */
export function accountRoutes({ db, config, clock }: AccountRouteDeps): Router {
  const router = Router();
  const gate = requireParentGate(clock);

  router.get('/account/export', requireParent, gate, async (_req, res) => {
    const { parent } = auth(res);
    res.set('Cache-Control', 'no-store');
    res.json(await buildExport(db, parent, clock()));
  });

  /**
   * Hard delete: the parent row cascades to sessions, consents, profiles and every child table, so
   * nothing is left to restore (backups age out on their own schedule).
   */
  router.delete('/account', requireParent, gate, async (_req, res) => {
    const { parent } = auth(res);
    await db.delete(parents).where(eq(parents.id, parent.id));
    console.info('parent account deleted', parent.id);
    clearSessionCookie(res, config);
    res.status(204).end();
  });

  return router;
}
