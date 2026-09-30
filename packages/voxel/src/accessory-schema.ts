// JSON schema for code-authored voxel accessories (hats, backpacks...): boxes or small voxel layers
// painted with named palette colors, attached to a character rig node at runtime. A file is either a
// full accessory or a colour variant of one (`variantOf`), so a new colour needs no geometry copy.
import { z } from 'zod';

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const vec3 = z.tuple([z.number(), z.number(), z.number()]);
const int = z.number().int();
const itemId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

/** What the child must reach before wearing the item (the server enforces it). Absent = open from the start. */
const unlockSchema = z
  .strictObject({ level: int.min(2).optional(), quest: itemId.optional() })
  .refine((u) => u.level !== undefined || u.quest !== undefined, { message: 'unlock needs a level or a quest' });
export type AccessoryUnlock = z.infer<typeof unlockSchema>;

export const ACCESSORY_SLOTS = ['hat', 'back', 'wings', 'glasses', 'scarf'] as const;

const boxSchema = z.object({
  x: int,
  y: int,
  z: int,
  w: int.positive(),
  h: int.positive(),
  d: int.positive(),
  /** Palette key. Later boxes paint over earlier ones. */
  color: z.string().min(1),
});

/** Alternative to boxes: y-layers (bottom → top) of z-rows of characters mapped through `legend`. */
const layersSchema = z.object({
  origin: z.tuple([int, int, int]),
  legend: z.record(z.string().length(1), z.string().min(1)),
  rows: z.array(z.array(z.string())).min(1),
});

export const accessorySchema = z
  .object({
    id: itemId,
    slot: z.enum(ACCESSORY_SLOTS),
    unlock: unlockSchema.optional(),
    attachNode: z.string().min(1),
    /** World units per voxel (in character model space, before the rig node's own scale). */
    voxelSize: z.number().positive(),
    /** Position of voxel (0,0,0) relative to the attach node pivot, in model units. */
    offset: vec3,
    /** Euler XYZ degrees. */
    rotation: vec3.default([0, 0, 0]),
    palette: z.record(z.string(), hexColor),
    /** Named palette overrides: a new color variant needs no code change. */
    variants: z.record(z.string(), z.record(z.string(), hexColor)).default({}),
    boxes: z.array(boxSchema).default([]),
    layers: layersSchema.optional(),
  })
  .superRefine((def, ctx) => {
    if (def.boxes.length === 0 && !def.layers) ctx.addIssue({ code: 'custom', message: 'accessory needs boxes or layers' });
    const used = [...def.boxes.map((b) => b.color), ...Object.values(def.layers?.legend ?? {})];
    for (const color of used) {
      if (!(color in def.palette)) ctx.addIssue({ code: 'custom', message: `color "${color}" is not in the palette` });
    }
    for (const [name, variant] of Object.entries(def.variants)) {
      for (const key of Object.keys(variant)) {
        if (!(key in def.palette)) ctx.addIssue({ code: 'custom', message: `variant ${name} overrides unknown color "${key}"` });
      }
    }
    def.layers?.rows.forEach((layer, y) =>
      layer.forEach((row, zRow) => {
        for (const ch of row) {
          if (ch !== '.' && !(ch in (def.layers?.legend ?? {}))) {
            ctx.addIssue({ code: 'custom', message: `layer ${y} row ${zRow}: "${ch}" missing from legend` });
          }
        }
      }),
    );
  });

export type AccessoryDef = z.infer<typeof accessorySchema>;

export function parseAccessory(json: unknown): AccessoryDef {
  return accessorySchema.parse(json);
}

/** A colour variant sold as its own item: the base accessory's shape with one of its palette variants. */
export const accessoryVariantSchema = z.strictObject({
  id: itemId,
  variantOf: itemId,
  variant: z.string().min(1),
  unlock: unlockSchema.optional(),
});
export type AccessoryVariantDef = z.infer<typeof accessoryVariantSchema>;

/** One wearable item of the catalogue, as the character, the creator and the server see it. */
export interface AccessoryItem {
  id: string;
  slot: AccessoryDef['slot'];
  /** Geometry and palette source (the base accessory for a colour variant). */
  def: AccessoryDef;
  variant?: string;
  unlock?: AccessoryUnlock;
}

/**
 * Builds the item catalogue from every `content/accessories/*.json` (parsed JSON, any order).
 * Throws on duplicate ids, a variant of an unknown or variant accessory, or an unknown colour.
 */
export function buildAccessoryCatalog(files: readonly unknown[]): Map<string, AccessoryItem> {
  const bases = new Map<string, AccessoryDef>();
  const variants: AccessoryVariantDef[] = [];
  const seen = new Set<string>();
  const claim = (id: string): void => {
    if (seen.has(id)) throw new Error(`duplicate accessory id ${id}`);
    seen.add(id);
  };
  for (const json of files) {
    const isVariant = typeof json === 'object' && json !== null && 'variantOf' in json;
    if (isVariant) {
      const variant = accessoryVariantSchema.parse(json);
      claim(variant.id);
      variants.push(variant);
    } else {
      const def = parseAccessory(json);
      claim(def.id);
      bases.set(def.id, def);
    }
  }
  const items = new Map<string, AccessoryItem>();
  for (const def of bases.values()) items.set(def.id, { id: def.id, slot: def.slot, def, unlock: def.unlock });
  for (const v of variants) {
    const def = bases.get(v.variantOf);
    if (!def) throw new Error(`${v.id}: variantOf ${v.variantOf} is not a full accessory`);
    if (!(v.variant in def.variants)) throw new Error(`${v.id}: ${v.variantOf} has no variant "${v.variant}"`);
    items.set(v.id, { id: v.id, slot: def.slot, def, variant: v.variant, unlock: v.unlock });
  }
  return items;
}
