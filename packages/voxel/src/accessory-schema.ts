// JSON schema for code-authored voxel accessories (hats, backpacks...): boxes or small voxel layers
// painted with named palette colors, attached to a character rig node at runtime.
import { z } from 'zod';

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const vec3 = z.tuple([z.number(), z.number(), z.number()]);
const int = z.number().int();

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
    id: z.string().regex(/^[a-z0-9-]+$/),
    slot: z.enum(ACCESSORY_SLOTS),
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
