// What a pet may wear (content/pet-gear.json): hats, bows, crowns and flowers on its head, collars and scarves
// round its neck. Each is drawn in code from a few coloured shapes (one draw call), so a new piece is a new entry
// with a shape and colours, no new file. Bought in the shop's "Thú cưng" tab (content/shop/thu-cung.json); the
// others see what her pet wears.
import { z } from 'zod';
import { ContentId } from './content';
import { PetGearSlot } from './pet-care';

/** The shapes the game knows how to draw, and the slot each sits in. */
export const PET_GEAR_SHAPES = {
  'party-hat': 'head',
  'sun-hat': 'head',
  crown: 'head',
  bow: 'head',
  flower: 'head',
  collar: 'neck',
  'medal-collar': 'neck',
  scarf: 'neck',
} as const satisfies Record<string, PetGearSlot>;
export type PetGearShape = keyof typeof PET_GEAR_SHAPES;
const ShapeName = z.enum(Object.keys(PET_GEAR_SHAPES) as [PetGearShape, ...PetGearShape[]]);

const Colour = z.string().regex(/^#[0-9a-f]{6}$/);
const Text = z.string().trim().min(1).max(40);

export const PetGearItem = z.strictObject({
  id: ContentId,
  name: Text,
  en: z.strictObject({ name: Text }),
  shape: ShapeName,
  /** Main colour, then the trim (band, knot, bell, pompom). */
  colors: z.tuple([Colour, Colour]),
  /** Its picture on the shop card and in the care screen: a UI icon of the web app (checked by `pnpm content:check`). */
  icon: z.string().min(1),
});
export type PetGearItem = z.infer<typeof PetGearItem>;

export const PetGearCatalog = z
  .strictObject({ version: z.literal(1), items: z.array(PetGearItem).min(1) })
  .refine((c) => new Set(c.items.map((i) => i.id)).size === c.items.length, { message: 'duplicate pet gear id' })
  .refine((c) => new Set(c.items.map((i) => i.name)).size === c.items.length, { message: 'duplicate pet gear name' });
export type PetGearCatalog = z.infer<typeof PetGearCatalog>;

/** The slot a piece sits in. */
export const gearSlot = (item: Pick<PetGearItem, 'shape'>): PetGearSlot => PET_GEAR_SHAPES[item.shape];

/** Why a set of gear cannot be worn together (empty when it can): unknown ids, two things in one slot, repeats. */
export function gearIssues(gear: readonly string[], catalog: ReadonlyMap<string, PetGearItem>): string[] {
  const issues: string[] = [];
  const slots = new Set<PetGearSlot>();
  if (new Set(gear).size !== gear.length) issues.push('gear repeats');
  for (const id of gear) {
    const item = catalog.get(id);
    if (!item) {
      issues.push(`unknown pet gear ${id}`);
      continue;
    }
    const slot = gearSlot(item);
    if (slots.has(slot)) issues.push(`two things on the ${slot}`);
    slots.add(slot);
  }
  return issues;
}
