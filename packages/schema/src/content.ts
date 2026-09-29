import { z } from 'zod';

/** Content ids are kebab-case and never change once player progress references them. */
export const ContentId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const RewardSpec = z.object({
  xp: z.number().int().min(0).default(0),
  coin: z.number().int().min(0).default(0),
  skillXp: z.record(ContentId, z.number().int().min(1)).default({}),
  items: z.record(ContentId, z.number().int().min(1)).default({}),
});
export type RewardSpec = z.infer<typeof RewardSpec>;

/** Quest data model (Master Plan §11), reduced to what the server needs to validate progress. */
export const QuestDefinition = z
  .object({
    id: ContentId,
    region: ContentId,
    steps: z.array(z.object({ id: ContentId })).min(1),
    reward: RewardSpec,
    /**
     * Quest ids this quest unlocks once finished. A quest opens when ANY quest listing it is finished;
     * a quest no one lists is open from the start.
     */
    unlock: z.array(ContentId).default([]),
  })
  .refine((q) => new Set(q.steps.map((s) => s.id)).size === q.steps.length, { message: 'duplicate step id' });
export type QuestDefinition = z.infer<typeof QuestDefinition>;

/** Subject → Skill catalogue (Master Plan §5). Skill ids are unique across subjects. */
export const SkillCatalog = z
  .object({
    subjects: z
      .array(
        z.object({
          id: ContentId,
          name: z.string().min(1),
          skills: z.array(z.object({ id: ContentId, name: z.string().min(1) })).min(1),
        }),
      )
      .min(1),
  })
  .refine(
    (c) => {
      const ids = c.subjects.flatMap((s) => s.skills.map((k) => k.id));
      return new Set(ids).size === ids.length;
    },
    { message: 'duplicate skill id' },
  );
export type SkillCatalog = z.infer<typeof SkillCatalog>;

/** Pick-from-list names (Master Plan §9: no free-text names for children). */
export const NameList = z
  .object({ names: z.array(z.string().trim().min(1).max(40).transform((s) => s.normalize('NFC'))).min(1) })
  .refine((l) => new Set(l.names).size === l.names.length, { message: 'duplicate name' });
export type NameList = z.infer<typeof NameList>;

/** Parent consent text. `requiresLegalReview` stays true until legal counsel approves the wording. */
export const ConsentDocument = z.object({
  version: z.string().min(1).max(32),
  requiresLegalReview: z.boolean(),
  title: z.string().min(1),
  paragraphs: z.array(z.string().min(1)).min(1),
});
export type ConsentDocument = z.infer<typeof ConsentDocument>;

/**
 * Cumulative XP needed to reach each level: `thresholds[0]` is level 1 and must be 0.
 * Strictly increasing so every XP total maps to exactly one level.
 */
export const LevelCurve = z
  .object({ thresholds: z.array(z.number().int().min(0)).min(2) })
  .refine((c) => c.thresholds[0] === 0, { message: 'level 1 starts at 0 XP' })
  .refine((c) => c.thresholds.every((v, i, a) => i === 0 || v > (a[i - 1] ?? 0)), { message: 'thresholds must increase' });
export type LevelCurve = z.infer<typeof LevelCurve>;
