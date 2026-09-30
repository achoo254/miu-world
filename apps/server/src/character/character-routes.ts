import { eq } from 'drizzle-orm';
import { Router } from 'express';
import { levelFromXp } from '@miu/quest/level';
import { CharacterDto, CharacterUpdate } from '@miu/schema/game';
import type { AccessoryUnlock } from '@miu/voxel/accessory-schema';
import { activeChildId, requireParent } from '../auth/auth-context';
import type { ContentCatalog } from '../content/content-catalog';
import type { Db } from '../db/client';
import { characters } from '../db/schema';
import { HttpError, parseInput } from '../http-error';
import { completedQuestIds } from '../quest/quest-access';
import { totalXp } from '../reward/reward-ledger';

/** An item opens once the child reaches its level (from ledger XP) and has finished its quest. */
export function isAccessoryOpen(unlock: AccessoryUnlock | undefined, level: number, completed: ReadonlySet<string>): boolean {
  if (!unlock) return true;
  return (unlock.level === undefined || level >= unlock.level) && (unlock.quest === undefined || completed.has(unlock.quest));
}

export interface CharacterRouteDeps {
  db: Db;
  content: ContentCatalog;
}

export function characterRoutes({ db, content }: CharacterRouteDeps): Router {
  const router = Router();

  async function load(childId: string): Promise<CharacterDto> {
    const [row] = await db.select().from(characters).where(eq(characters.childId, childId));
    if (!row) throw new HttpError(404, 'not-found');
    return CharacterDto.parse(row);
  }

  router.get('/character', requireParent, async (_req, res) => {
    res.json(await load(await activeChildId(db, res, content.consent.version)));
  });

  /**
   * Name from the pick list; equipment only from the accessory catalogue, one item per slot, and only
   * items the child has unlocked (an item already worn stays wearable if its rule later tightens).
   * Species stays `cat` (MVP).
   */
  router.put('/character', requireParent, async (req, res) => {
    const childId = await activeChildId(db, res, content.consent.version);
    const input = parseInput(CharacterUpdate, req.body);
    if (!content.characterNames.has(input.name)) throw new HttpError(400, 'invalid-character-name');
    const items = input.equipped.map((id) => content.accessories.get(id));
    const slots = new Set<string>();
    for (const item of items) {
      if (!item || slots.has(item.slot)) throw new HttpError(400, 'invalid-equipment');
      slots.add(item.slot);
    }
    if (items.some((item) => item?.unlock)) {
      const worn = new Set((await load(childId)).equipped);
      const level = levelFromXp(await totalXp(db, childId), content.levelCurve).level;
      const completed = await completedQuestIds(db, childId);
      for (const item of items) {
        if (item && !worn.has(item.id) && !isAccessoryOpen(item.unlock, level, completed)) throw new HttpError(403, 'equipment-locked');
      }
    }
    await db.update(characters).set({ name: input.name, equipped: input.equipped }).where(eq(characters.childId, childId));
    res.json(await load(childId));
  });

  return router;
}
