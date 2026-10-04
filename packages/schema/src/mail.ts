import { z } from 'zod';

export const MailCategory = z.enum(['npc', 'gift', 'system']);
export type MailCategory = z.infer<typeof MailCategory>;

export const MailItemReward = z.object({
  itemId: z.string().min(1),
  qty: z.number().int().positive(),
});
export type MailItemReward = z.infer<typeof MailItemReward>;

export const MailReward = z.object({
  coins: z.number().int().nonnegative().optional().default(0),
  xp: z.number().int().nonnegative().optional().default(0),
  items: z.record(z.string(), z.number().int().positive()).optional().default({}),
});
export type MailReward = z.infer<typeof MailReward>;

export const LocalizedText = z.union([
  z.string().min(1),
  z.object({
    vi: z.string().min(1),
    en: z.string().min(1),
  }),
]);
export type LocalizedText = z.infer<typeof LocalizedText>;

export const MailTemplate = z.object({
  id: z.string().min(1),
  sender: z.string().min(1),
  title: LocalizedText,
  body: LocalizedText,
  category: MailCategory,
  reward: MailReward.optional(),
  icon: z.string().optional(),
});
export type MailTemplate = z.infer<typeof MailTemplate>;

export const MailCatalog = z.object({
  templates: z.array(MailTemplate).min(1),
});
export type MailCatalog = z.infer<typeof MailCatalog>;

export const MailDto = z.object({
  id: z.string().uuid(),
  templateId: z.string().min(1),
  sender: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
  category: MailCategory,
  isRead: z.boolean(),
  isClaimed: z.boolean(),
  reward: MailReward.nullable().optional(),
  icon: z.string().optional(),
  createdAt: z.string(),
});
export type MailDto = z.infer<typeof MailDto>;

export const MailListResponse = z.object({
  mail: z.array(MailDto),
  unreadCount: z.number().int().nonnegative(),
});
export type MailListResponse = z.infer<typeof MailListResponse>;

export const MailClaimResponse = z.object({
  claimed: z.boolean(),
  coins: z.number().int().nonnegative(),
  xp: z.number().int().nonnegative(),
  items: z.record(z.string(), z.number().int().positive()),
  totalCoins: z.number().int().nonnegative(),
});
export type MailClaimResponse = z.infer<typeof MailClaimResponse>;
