// Skill tree and the gifts of each skill level (plan "Xu, đồ thưởng và điểm kỹ năng có chỗ dùng": every skill
// level lights a leaf and pays a gift). The gift table is content/progression/skill-gifts.json: coins for every
// level reached, and on some levels a themed wearable given only there (an item of content/accessories marked
// `"unlock": { "award": true }`). The server pays a level's gift once, through the ledger (source
// `skill-gift:<skill>:<level>`), in the same transaction as the skill XP that reached it.
import { z } from 'zod';
import { ContentId } from './content';

/** Highest skill level a gift may name (the skill curve has ten levels). */
export const MAX_SKILL_LEVEL = 10;

const Level = z.number().int().min(2).max(MAX_SKILL_LEVEL);

export const SkillGiftItem = z.strictObject({ skill: ContentId, level: Level, item: ContentId });
export type SkillGiftItem = z.infer<typeof SkillGiftItem>;

export const SkillGiftCatalog = z
  .strictObject({
    version: z.literal(1),
    /** Coins paid on reaching each level ("2" … "10"), whatever the skill. */
    coins: z.record(z.string().regex(/^(?:[2-9]|10)$/), z.number().int().min(1).max(200)),
    /** Themed wearables on top of the coins, each on one skill level. */
    items: z.array(SkillGiftItem),
  })
  .refine((c) => new Set(c.items.map((i) => `${i.skill}:${i.level}`)).size === c.items.length, { message: 'a skill level has two items' })
  .refine((c) => new Set(c.items.map((i) => i.item)).size === c.items.length, { message: 'an item is the gift of two skill levels' });
export type SkillGiftCatalog = z.infer<typeof SkillGiftCatalog>;

/** Ledger source of one skill level's gift: one row per child, skill and level, so it pays once. */
export const skillGiftSource = (skill: string, level: number): string => `skill-gift:${skill}:${level}`;

/** The skill and level a ledger source pays; null for any other source. */
export function skillGiftOfSource(source: string): { skill: string; level: number } | null {
  const match = /^skill-gift:([a-z0-9]+(?:-[a-z0-9]+)*):(\d+)$/.exec(source);
  return match?.[1] && match[2] ? { skill: match[1], level: Number(match[2]) } : null;
}

/** What the content is checked against. */
export interface SkillGiftContext {
  skills: ReadonlySet<string>;
  /** Every wearable by id; `award`: given only by a skill gift or an achievement. */
  wearables: ReadonlyMap<string, { award: boolean }>;
}

/** Problems of the gift table: every level has coins, items are award wearables of known skills. */
export function skillGiftIssues(catalog: SkillGiftCatalog, context: SkillGiftContext): string[] {
  const issues: string[] = [];
  for (let level = 2; level <= MAX_SKILL_LEVEL; level += 1) {
    if (catalog.coins[String(level)] === undefined) issues.push(`skill gifts: level ${level} has no coins`);
  }
  for (const gift of catalog.items) {
    if (!context.skills.has(gift.skill)) issues.push(`skill gift ${gift.item}: unknown skill ${gift.skill}`);
    const wearable = context.wearables.get(gift.item);
    if (!wearable) issues.push(`skill gift ${gift.item} is not a wearable of content/accessories`);
    else if (!wearable.award) issues.push(`skill gift ${gift.item}: the accessory must say "unlock": { "award": true }`);
  }
  return issues;
}

/** A wearable as the screens name it. */
export const AwardItemDto = z.object({ id: ContentId, name: z.string(), slot: z.string() });
export type AwardItemDto = z.infer<typeof AwardItemDto>;

/** One skill level's gift. */
export const SkillGiftDto = z.object({
  skillId: ContentId,
  level: z.number().int().min(2),
  coin: z.number().int().min(0),
  item: AwardItemDto.nullable(),
});
export type SkillGiftDto = z.infer<typeof SkillGiftDto>;

export const SkillTreeSkill = z.object({
  skillId: ContentId,
  name: z.string(),
  xp: z.number().int().min(0),
  level: z.number().int().min(1),
  maxLevel: z.number().int().min(1),
  xpIntoLevel: z.number().int().min(0),
  /** XP from this level to the next; null at the top level. */
  xpForNextLevel: z.number().int().min(1).nullable(),
  /** The gift of every level from 2 up, with whether she has received it. */
  gifts: z.array(SkillGiftDto.extend({ received: z.boolean() })),
});
export type SkillTreeSkill = z.infer<typeof SkillTreeSkill>;

export const SkillTreeResponse = z.object({
  subjects: z.array(
    z.object({
      subjectId: ContentId,
      name: z.string(),
      xp: z.number().int().min(0),
      level: z.number().int().min(1),
      skills: z.array(SkillTreeSkill),
    }),
  ),
});
export type SkillTreeResponse = z.infer<typeof SkillTreeResponse>;
