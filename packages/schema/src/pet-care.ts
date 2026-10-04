import { z } from 'zod';
import { ContentId } from './content';

export const PetCareStats = z.strictObject({
  happiness: z.number().int().min(0).max(100),
  fullness: z.number().int().min(0).max(100),
  cleanliness: z.number().int().min(0).max(100),
});
export type PetCareStats = z.infer<typeof PetCareStats>;

export const PetCareAction = z.enum(['feed', 'pet', 'bath', 'play']);
export type PetCareAction = z.infer<typeof PetCareAction>;

export const PetCareRequest = z.strictObject({
  action: PetCareAction,
  itemId: ContentId.optional(),
});
export type PetCareRequest = z.infer<typeof PetCareRequest>;

export const PetCareResponse = z.strictObject({
  stats: PetCareStats,
  message: z.string().min(1),
  emote: z.string().min(1),
  friendshipTier: z.number().int().min(1).max(3),
  title: z.string().min(1),
});
export type PetCareResponse = z.infer<typeof PetCareResponse>;
