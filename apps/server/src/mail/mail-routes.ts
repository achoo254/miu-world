import { randomUUID } from 'node:crypto';
import { and, desc, eq, sql } from 'drizzle-orm';
import { Router } from 'express';
import type { MailDto, MailTemplate } from '@miu/schema/mail';
import { activeChildId, requireParent } from '../auth/auth-context';
import type { ContentCatalog } from '../content/content-catalog';
import type { Db } from '../db/client';
import { characters, childProfiles, mail, rewardLedger } from '../db/schema';
import { HttpError } from '../http-error';
import { grantReward } from '../reward/reward-ledger';
import { loadMailCatalog, resolveLocalizedText } from './mail-catalog';

export interface MailRouteDeps {
  db: Db;
  content: ContentCatalog;
  templates?: MailTemplate[];
  clock?: () => Date;
}

export function mailRoutes({
  db,
  content,
  templates = loadMailCatalog(),
  clock = () => new Date(),
}: MailRouteDeps): Router {
  const router = Router();

  /** Ensure seed/welcome mail exists for the child */
  async function ensureSeedMail(childId: string): Promise<void> {
    const existing = await db
      .select({ id: mail.id })
      .from(mail)
      .where(eq(mail.childId, childId))
      .limit(1);

    if (existing.length > 0) return;

    // Seed default mail templates
    for (const tmpl of templates) {
      await db
        .insert(mail)
        .values({
          id: randomUUID(),
          childId,
          templateId: tmpl.id,
          category: tmpl.category,
          read: 0,
          claimed: 0,
          createdAt: clock(),
        })
        .onConflictDoNothing();
    }
  }

  // GET /api/mail - List mail and unread count
  router.get('/mail', requireParent, async (_req, res) => {
    const childId = await activeChildId(db, res, content.consent.version);

    // Get child profile to resolve name and language
    const [profile] = await db
      .select({ displayName: childProfiles.displayName, language: childProfiles.language })
      .from(childProfiles)
      .where(eq(childProfiles.id, childId));

    const [char] = await db
      .select({ name: characters.name })
      .from(characters)
      .where(eq(characters.childId, childId));

    const childName = char?.name || profile?.displayName || 'bé';
    const lang = (profile?.language ?? 'vi') as 'vi' | 'en' | 'both';

    await ensureSeedMail(childId);

    const rows = await db
      .select()
      .from(mail)
      .where(eq(mail.childId, childId))
      .orderBy(desc(mail.createdAt));

    const tmplMap = new Map(templates.map((t) => [t.id, t]));

    const mailDtos: MailDto[] = rows.map((row) => {
      const tmpl = tmplMap.get(row.templateId);
      const title = tmpl ? resolveLocalizedText(tmpl.title, lang, childName) : 'Thư mới';
      const body = tmpl ? resolveLocalizedText(tmpl.body, lang, childName) : '';
      const sender = tmpl ? tmpl.sender : 'Người gửi';
      const icon = tmpl?.icon ?? (row.category === 'gift' ? 'gift' : 'package');

      return {
        id: row.id,
        templateId: row.templateId,
        sender,
        title,
        body,
        category: (row.category as 'npc' | 'gift' | 'system') || 'system',
        isRead: row.read === 1,
        isClaimed: row.claimed === 1,
        reward: tmpl?.reward ?? null,
        icon,
        createdAt: row.createdAt.toISOString(),
      };
    });

    const unreadCount = mailDtos.filter((m) => !m.isRead).length;

    res.json({
      mail: mailDtos,
      unreadCount,
    });
  });

  // POST /api/mail/:id/read - Mark mail as read
  router.post('/mail/:id/read', requireParent, async (req, res) => {
    const childId = await activeChildId(db, res, content.consent.version);
    const id = String(req.params.id);

    const [row] = await db
      .select({ id: mail.id, read: mail.read })
      .from(mail)
      .where(and(eq(mail.id, id), eq(mail.childId, childId)));

    if (!row) {
      throw new HttpError(404, 'mail-not-found');
    }

    if (row.read === 0) {
      await db
        .update(mail)
        .set({ read: 1 })
        .where(and(eq(mail.id, id), eq(mail.childId, childId)));
    }

    res.json({ success: true });
  });

  // POST /api/mail/:id/claim - Claim reward from mail (idempotent)
  router.post('/mail/:id/claim', requireParent, async (req, res) => {
    const childId = await activeChildId(db, res, content.consent.version);
    const id = String(req.params.id);

    const [row] = await db
      .select()
      .from(mail)
      .where(and(eq(mail.id, id), eq(mail.childId, childId)));

    if (!row) {
      throw new HttpError(404, 'mail-not-found');
    }

    const tmpl = templates.find((t) => t.id === row.templateId);
    const reward = tmpl?.reward ?? { coins: 0, xp: 0, items: {} };

    if (row.claimed === 0) {
      const now = clock();
      await db.transaction(async (tx) => {
        const source = `mail:claim:${row.id}`;
        await grantReward(
          tx,
          childId,
          source,
          {
            xp: reward.xp ?? 0,
            coin: reward.coins ?? 0,
            skillXp: {},
            items: reward.items ?? {},
          },
          now,
        );
        await tx
          .update(mail)
          .set({ claimed: 1, read: 1, claimedAt: now })
          .where(and(eq(mail.id, id), eq(mail.childId, childId)));
      });
    }

    // Get current total coins
    const [totalRow] = await db
      .select({ coins: sql<number>`coalesce(sum(${rewardLedger.coins}), 0)::int` })
      .from(rewardLedger)
      .where(eq(rewardLedger.childId, childId));

    res.json({
      claimed: true,
      coins: reward.coins ?? 0,
      xp: reward.xp ?? 0,
      items: reward.items ?? {},
      totalCoins: totalRow?.coins ?? 0,
    });
  });

  return router;
}
