import { eq } from 'drizzle-orm';
import { Router } from 'express';
import { levelFromXp } from '@miu/quest/level';
import type { SkillTreeResponse } from '@miu/schema/progression';
import { activePlayerId, requireParent } from '../auth/auth-context';
import type { ContentCatalog } from '../content/content-catalog';
import type { Db } from '../db/client';
import { skillProgress } from '../db/schema';
import { receivedSkillGifts, skillGift } from './skill-gifts';

export interface SkillTreeRouteDeps {
  db: Db;
  content: ContentCatalog;
}

/**
 * The skill tree of the selected player (Hồ sơ): every skill by subject with its level, the XP towards the next
 * one, and the gift of each level with whether she has received it. `GET /skill-tree`, read only.
 */
export function skillTreeRoutes({ db, content }: SkillTreeRouteDeps): Router {
  const router = Router();
  const maxLevel = content.skillCurve.thresholds.length;

  router.get('/skill-tree', requireParent, async (_req, res) => {
    const childId = await activePlayerId(db, res, content.consent.version);
    const rows = await db.select().from(skillProgress).where(eq(skillProgress.childId, childId));
    const xpOf = new Map(rows.map((r) => [r.skillId, r.xp]));
    const received = await receivedSkillGifts(db, childId);
    const body: SkillTreeResponse = {
      subjects: content.subjects.map((subject) => {
        const skills = subject.skills.map((skill) => {
          const xp = xpOf.get(skill.id) ?? 0;
          const gifts = Array.from({ length: maxLevel - 1 }, (_, i) => {
            const gift = skillGift(content, skill.id, i + 2);
            return { ...gift, received: received.has(`${skill.id}:${gift.level}`) };
          });
          return { skillId: skill.id, name: skill.name, xp, maxLevel, ...levelFromXp(xp, content.skillCurve), gifts };
        });
        const xp = skills.reduce((sum, k) => sum + k.xp, 0);
        return { subjectId: subject.id, name: subject.name, xp, level: levelFromXp(xp, content.skillCurve).level, skills };
      }),
    };
    res.json(body);
  });

  return router;
}
