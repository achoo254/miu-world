import { z } from 'zod';

// The child's home, decorated her way (owner's mock, panels 11 and 12): for each piece of the house (bed,
// desk, chairs, wardrobe, ornaments, rugs, curtains, lamps inside; the house's colours, fence, gate, garden
// lights, flower beds, path, name board, flag outside) she picks one style from content/home/decor.json.
// The server keeps her picks per child profile and rejects anything the catalogue does not list; the map
// generator turns every style into props or block colours and the game shows the picked ones.

const Id = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);
const Colour = z.string().regex(/^#[0-9a-f]{6}$/);

export const DECOR_SIDES = ['inside', 'outside'] as const;
export type DecorSide = (typeof DECOR_SIDES)[number];

/** Most slots a catalogue may hold (and so a child's picks), so a stored row stays small. */
export const MAX_DECOR_SLOTS = 32;

export const DecorOption = z
  .strictObject({
    id: Id,
    /** What the child reads on the card ("Hồng chấm bi"). */
    name: z.string().min(1).max(40),
    /** Colours the card shows for this style, first the main one. */
    swatch: z.array(Colour).min(1).max(3),
    /** Models it places at the slot's spots (manifest paths), one after another round the spots. */
    models: z.array(z.string().min(1)).min(1).optional(),
    /** Degrees each model is turned past the spot's facing (a model built facing the other way). */
    turn: z.number().optional(),
    /** Block names it paints the slot's parts with (role → block), for the house's own blocks. */
    blocks: z.record(Id, Id).optional(),
    /**
     * A keepsake of another map (owner, 09/10/2026: the child plays only at home, so the other maps bring
     * things home): the region whose chest gives it (content/region-rewards.json `half.decor`). Picked only
     * once earned; never sold, never a slot's default.
     */
    souvenir: Id.optional(),
  })
  .refine((o) => (o.models === undefined) !== (o.blocks === undefined), { message: 'an option places models or paints blocks, not both' });
export type DecorOption = z.infer<typeof DecorOption>;

export const DecorSlot = z
  .strictObject({
    id: Id,
    side: z.enum(DECOR_SIDES),
    /** The slot's name on its tab ("Giường"). */
    name: z.string().min(1).max(30),
    /** The option the house is built with: what every child sees until she picks another. */
    default: Id,
    options: z.array(DecorOption).min(2).max(12),
  })
  .superRefine((slot, ctx) => {
    const ids = slot.options.map((o) => o.id);
    if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', message: `slot ${slot.id}: option ids repeat` });
    if (!ids.includes(slot.default)) ctx.addIssue({ code: 'custom', message: `slot ${slot.id}: default ${slot.default} is not one of its options` });
    if (slot.options.some((o) => o.id === slot.default && o.souvenir !== undefined)) ctx.addIssue({ code: 'custom', message: `slot ${slot.id}: default ${slot.default} is a souvenir, which must be earned` });
    const kinds = new Set(slot.options.map((o) => (o.models ? 'models' : 'blocks')));
    if (kinds.size > 1) ctx.addIssue({ code: 'custom', message: `slot ${slot.id}: every option places models, or every option paints blocks` });
    if (kinds.has('blocks')) {
      const roles = (o: DecorOption): string => Object.keys(o.blocks ?? {}).sort().join(',');
      const first = slot.options[0];
      if (first && slot.options.some((o) => roles(o) !== roles(first))) ctx.addIssue({ code: 'custom', message: `slot ${slot.id}: every option paints the same parts` });
    }
  });
export type DecorSlot = z.infer<typeof DecorSlot>;

export const HomeDecorCatalog = z
  .strictObject({
    version: z.literal(1),
    slots: z.array(DecorSlot).min(1).max(MAX_DECOR_SLOTS),
  })
  .superRefine((catalog, ctx) => {
    const ids = catalog.slots.map((s) => s.id);
    if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', message: 'slot ids repeat' });
  });
export type HomeDecorCatalog = z.infer<typeof HomeDecorCatalog>;

/** Every souvenir style of the catalogue: option id → the region whose chest gives it. */
export function decorSouvenirs(catalog: HomeDecorCatalog): Map<string, string> {
  const out = new Map<string, string>();
  for (const slot of catalog.slots) for (const option of slot.options) if (option.souvenir !== undefined) out.set(option.id, option.souvenir);
  return out;
}

/** A child's picks: slot id → option id. Slots left out keep the house's own style. */
export const DecorChoices = z.record(Id, Id).refine((c) => Object.keys(c).length <= MAX_DECOR_SLOTS, { message: 'too many slots' });
export type DecorChoices = z.infer<typeof DecorChoices>;

/** What the game sends to save, and what the server answers with (every slot filled). */
export const HomeDecor = z.strictObject({ choices: DecorChoices });
export type HomeDecor = z.infer<typeof HomeDecor>;

/** Why `choices` does not fit the catalogue (empty when it does): unknown slots, options of no slot. */
export function decorIssues(catalog: HomeDecorCatalog, choices: DecorChoices): string[] {
  const issues: string[] = [];
  for (const [slotId, optionId] of Object.entries(choices)) {
    const slot = catalog.slots.find((s) => s.id === slotId);
    if (!slot) issues.push(`unknown slot ${slotId}`);
    else if (!slot.options.some((o) => o.id === optionId)) issues.push(`slot ${slotId} has no option ${optionId}`);
  }
  return issues;
}

/**
 * Every slot of the catalogue with the child's pick, or the slot's default where she has none (or where a
 * stored pick is no longer in the catalogue).
 */
export function resolveDecor(catalog: HomeDecorCatalog, choices: DecorChoices = {}): Record<string, string> {
  const out: Record<string, string> = {};
  for (const slot of catalog.slots) {
    const picked = choices[slot.id];
    out[slot.id] = picked !== undefined && slot.options.some((o) => o.id === picked) ? picked : slot.default;
  }
  return out;
}
