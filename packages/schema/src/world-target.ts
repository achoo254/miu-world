// What the quests' map targets look like and are called (content/world/looks.json, content/world/targets.json).
// A quest names its targets by id; the map generators place every one of them from these two catalogues,
// so a new quest needs catalogue entries, not generator code. Looks are the shared wardrobe (a model or a
// shape built in code, its height in blocks, whether it is talked to or looked at); targets give each id
// its name on the prompt, its look and, when it differs from the look's, the action label.
import { z } from 'zod';
import { ContentId } from './content';

export const TargetLook = z
  .strictObject({
    /** Manifest path of a pack model. */
    model: z.string().regex(/^packs\/.+\.glb$/).optional(),
    /** A shape the runtime builds in code (no pack has it). */
    shape: z.enum(['letter']).optional(),
    /** Standing height in blocks; the generator turns it into the model's scale. */
    height: z.number().positive().max(8),
    /** `npc`: talked to (it faces the child, plays its clip); `object`: looked at, picked up, used. */
    kind: z.enum(['npc', 'object']),
    /** Default action on the prompt, e.g. "Nói chuyện", "Xem". */
    label: z.string().min(1),
    /** Looping clip of an animated model. */
    animation: z.string().optional(),
  })
  .refine((l) => (l.model === undefined) !== (l.shape === undefined), { message: 'a look has a model or a built shape, not both' });
export type TargetLook = z.infer<typeof TargetLook>;

export const LookCatalog = z.strictObject({ version: z.literal(1), looks: z.record(ContentId, TargetLook) });
export type LookCatalog = z.infer<typeof LookCatalog>;

export const QuestTarget = z.strictObject({
  /** Name on the prompt (Vietnamese, as the child reads it), e.g. "Thỏ Tí", "Hũ sành". */
  name: z.string().min(1),
  look: ContentId,
  /** Action on the prompt when the look's default does not fit, e.g. "Nhặt lên". */
  label: z.string().min(1).optional(),
});
export type QuestTarget = z.infer<typeof QuestTarget>;

export const QuestTargetCatalog = z.strictObject({ version: z.literal(1), targets: z.record(ContentId, QuestTarget) });
export type QuestTargetCatalog = z.infer<typeof QuestTargetCatalog>;
