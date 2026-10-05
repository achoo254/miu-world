import { randomUUID } from 'node:crypto';
import { and, eq, inArray, like } from 'drizzle-orm';
import { levelFromXp } from '@miu/quest/level';
import { skillGiftOfSource, skillGiftSource, type AwardItemDto, type SkillGiftDto } from '@miu/schema/progression';
import type { ContentCatalog } from '../content/content-catalog';
import type { Db } from '../db/client';
import { rewardLedger, shopInventory, skillProgress } from '../db/schema';
import type { Tx } from '../reward/reward-ledger';

/** A wearable as the screens name it; null for an id the catalogue does not have. */
export function awardItem(content: ContentCatalog, itemId: string | undefined): AwardItemDto | null {
  const item = itemId ? content.accessories.get(itemId) : undefined;
  return item ? { id: item.id, name: item.name, slot: item.slot } : null;
}

/** The gift of one skill level (`content/progression/skill-gifts.json`). */
export function skillGift(content: ContentCatalog, skillId: string, level: number): SkillGiftDto {
  const item = content.skillGifts.items.find((gift) => gift.skill === skillId && gift.level === level)?.item;
  return { skillId, level, coin: content.skillGifts.coins[String(level)] ?? 0, item: awardItem(content, item) };
}

/** Skill levels whose gift the player has received, as `skill:level`. */
export async function receivedSkillGifts(db: Db | Tx, childId: string): Promise<Set<string>> {
  const rows = await db
    .select({ source: rewardLedger.source })
    .from(rewardLedger)
    .where(and(eq(rewardLedger.childId, childId), like(rewardLedger.source, 'skill-gift:%')));
  return new Set(rows.flatMap(({ source }) => {
    const gift = skillGiftOfSource(source);
    return gift ? [`${gift.skill}:${gift.level}`] : [];
  }));
}

/**
 * Pays the gift of every level the player has reached in `skillIds` and not received yet, in the caller's
 * transaction (the one that granted the skill XP): a ledger row `skill-gift:<skill>:<level>` with the coins and,
 * for a themed wearable, the item into her cupboard. The (child, source) key pays a level once, so a level reached
 * before gifts existed is paid with the next skill XP of that skill. Returns what this call paid.
 */
export async function grantSkillGifts(tx: Tx, content: ContentCatalog, childId: string, skillIds: readonly string[], now: Date): Promise<SkillGiftDto[]> {
  if (skillIds.length === 0) return [];
  const rows = await tx
    .select()
    .from(skillProgress)
    .where(and(eq(skillProgress.childId, childId), inArray(skillProgress.skillId, [...skillIds])));
  const received = await receivedSkillGifts(tx, childId);
  const paid: SkillGiftDto[] = [];
  // Sorted skills and levels: concurrent grants lock the same rows in the same order.
  for (const row of [...rows].sort((a, b) => a.skillId.localeCompare(b.skillId))) {
    const level = levelFromXp(row.xp, content.skillCurve).level;
    for (let next = 2; next <= level; next += 1) {
      if (received.has(`${row.skillId}:${next}`)) continue;
      const gift = skillGift(content, row.skillId, next);
      const inserted = await tx
        .insert(rewardLedger)
        .values({ id: randomUUID(), childId, source: skillGiftSource(row.skillId, next), coins: gift.coin, items: gift.item ? { [gift.item.id]: 1 } : {}, createdAt: now })
        .onConflictDoNothing()
        .returning({ id: rewardLedger.id });
      if (inserted.length === 0) continue;
      if (gift.item) await tx.insert(shopInventory).values({ childId, itemId: gift.item.id, qty: 1 }).onConflictDoNothing();
      paid.push(gift);
    }
  }
  return paid;
}
