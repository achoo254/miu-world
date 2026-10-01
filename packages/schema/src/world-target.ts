// What the quests' map targets look like and are called (content/world/looks.json, content/world/targets.json).
// A quest names its targets by id; the map generators place every one of them from these two catalogues,
// so a new quest needs catalogue entries, not generator code. Looks are the shared wardrobe (a model or a
// shape built in code, its height in blocks, whether it is talked to or looked at); targets give each id
// its name on the prompt, its look and, when it differs from the look's, the action label.
import { z } from 'zod';
import { ContentId } from './content';

export const TargetLook = z
  .strictObject({
    /**
     * Manifest path of a pack model, of a prop built from an emoji (content/world/emoji-props.json), or of a
     * chibi character built from the character library (content/characters.json, `pnpm assets:character`).
     */
    model: z.string().regex(/^(packs|generated\/props|generated\/characters)\/.+\.glb$/).optional(),
    /** Colour the model is multiplied by (a red and a blue box from one box model). */
    tint: z.string().regex(/^#[0-9a-f]{6}$/).optional(),
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
  .refine((l) => (l.model === undefined) !== (l.shape === undefined), { message: 'a look has a model or a built shape, not both' })
  .refine((l) => l.tint === undefined || l.model !== undefined, { message: 'tint needs a model' });
export type TargetLook = z.infer<typeof TargetLook>;

export const LookCatalog = z.strictObject({ version: z.literal(1), looks: z.record(ContentId, TargetLook) });
export type LookCatalog = z.infer<typeof LookCatalog>;

export const QuestTarget = z.strictObject({
  /** Name on the prompt (Vietnamese, as the child reads it), e.g. "Thỏ Tí", "Hũ sành". */
  name: z.string().min(1),
  look: ContentId,
  /** Action on the prompt when the look's default does not fit, e.g. "Nhặt lên". */
  label: z.string().min(1).optional(),
  /**
   * The recurring character this is (another entry's id), met at a lesson's own place: the game shows one
   * of a character's entries at a time, where the story is (see `castHidden` in packages/voxel).
   */
  character: ContentId.optional(),
});
export type QuestTarget = z.infer<typeof QuestTarget>;

export const QuestTargetCatalog = z.strictObject({ version: z.literal(1), targets: z.record(ContentId, QuestTarget) });
export type QuestTargetCatalog = z.infer<typeof QuestTargetCatalog>;

/**
 * Quest things no 3D pack has (envelopes, tickets, rulers…), built as block models from Fluent Emoji images
 * (assets/packs/fluent-emoji/<version>/props/<emoji>.png) by tools/assets/build-emoji-props.ts into
 * generated/props/<id>.glb. `colorize` repaints the whole picture in one colour, keeping its shading.
 */
export const EmojiProp = z.strictObject({
  emoji: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  colorize: z.string().regex(/^#[0-9a-f]{6}$/).optional(),
});
export type EmojiProp = z.infer<typeof EmojiProp>;

export const EmojiPropCatalog = z.strictObject({ version: z.literal(1), props: z.record(ContentId, EmojiProp) });
export type EmojiPropCatalog = z.infer<typeof EmojiPropCatalog>;

const BoxVec = z.tuple([z.number(), z.number(), z.number()]);
/**
 * Props no pack has that are too fine for whole blocks (swings, a hoop, the flag), as boxes in block units
 * (origin at the bottom centre) with a colour each; tools/assets/build-box-props.ts builds them into
 * generated/box-props/<id>.glb.
 */
export const BoxProp = z.strictObject({
  boxes: z.array(z.strictObject({ from: BoxVec, to: BoxVec, color: z.string().regex(/^#[0-9a-f]{6}$/) })).min(1),
});
export type BoxProp = z.infer<typeof BoxProp>;

export const BoxPropCatalog = z.strictObject({ version: z.literal(1), props: z.record(ContentId, BoxProp) });
export type BoxPropCatalog = z.infer<typeof BoxPropCatalog>;
