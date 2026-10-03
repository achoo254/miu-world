// JSON schema for code-authored voxel accessories (hats, backpacks...): boxes or small voxel layers
// painted with named palette colors, attached to a character rig node at runtime. A file is either a
// full accessory or a colour variant of one (`variantOf`), so a new colour needs no geometry copy.
import { z } from 'zod';

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const vec3 = z.tuple([z.number(), z.number(), z.number()]);
const int = z.number().int();
const itemId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

/**
 * What the child must reach before wearing the item (the server enforces it). Absent = open from the start.
 * `shop`: sold in the shop (content/shop) and worn once bought; such an item has no other condition (its
 * level, if any, is the shop's).
 */
const unlockSchema = z
  .strictObject({ level: int.min(2).optional(), quest: itemId.optional(), shop: z.literal(true).optional() })
  .refine((u) => u.level !== undefined || u.quest !== undefined || u.shop !== undefined, { message: 'unlock needs a level, a quest or the shop' })
  .refine((u) => !u.shop || (u.level === undefined && u.quest === undefined), { message: 'a shop item is opened by buying it only' });
export type AccessoryUnlock = z.infer<typeof unlockSchema>;

/**
 * Where an item is worn. `clothes` dress the body (torso, arms, legs) over the fur; a `vehicle` is ridden
 * (owner, 03/10/2026: clothes and vehicles to drive, each with items for every level).
 */
export const ACCESSORY_SLOTS = ['hat', 'glasses', 'scarf', 'back', 'wings', 'shoes', 'hand', 'clothes', 'vehicle'] as const;
export type AccessorySlot = (typeof ACCESSORY_SLOTS)[number];

/** Every slot offers at least this many items open from level 1 (checked by `pnpm content:check`). */
export const MIN_OPEN_ITEMS: Readonly<Record<AccessorySlot, number>> = {
  hat: 20,
  glasses: 20,
  scarf: 20,
  back: 20,
  wings: 20,
  shoes: 20,
  hand: 20,
  clothes: 10,
  vehicle: 10,
};

/** Limb nodes worn in pairs: a `mirror` accessory authored on one is also worn, mirrored, on the other. */
export const MIRRORED_NODES: Readonly<Record<string, string>> = {
  'leg-left': 'leg-right',
  'leg-right': 'leg-left',
  'arm-left': 'arm-right',
  'arm-right': 'arm-left',
};

/** A vehicle is not pinned to a rig node: it stands on the ground under the child (`vehicle-ride.ts`). */
export const VEHICLE_NODE = 'ground';

/**
 * How the child rides a `vehicle` (owner, 03/10/2026: it faces where she faces and sits right under her;
 * she sits or stands by the vehicle). A vehicle is authored front toward +z (the character's forward),
 * centred on x = 0 and z = 0 under her, with voxel y = 0 on the ground. `pose`: she `stand`s on a board,
 * `sit`s on a cloud or a carpet, or `drive`s seated with her hands on a wheel or a bar (cars, karts,
 * trains). `height` (model units) is the top of the deck under her feet, or of the seat under her when
 * seated. A `float`ing one (a cloud, a carpet) bobs gently in the air.
 */
const rideSchema = z.strictObject({
  height: z.number().min(0).max(1),
  pose: z.enum(['stand', 'sit', 'drive']),
  float: z.boolean().optional(),
});
export type VehicleRideSpec = z.infer<typeof rideSchema>;

const boxSchema = z.object({
  x: int,
  y: int,
  z: int,
  w: int.positive(),
  h: int.positive(),
  d: int.positive(),
  /** Palette key. Later boxes paint over earlier ones. */
  color: z.string().min(1),
  /** Also paint the box mirrored across x = 0 (left/right symmetric details: buttons, pockets, collar tips). */
  sym: z.boolean().optional(),
});

/**
 * Rig joints clothes dress, on the character library's voxel grid (`content/outfits/`): the torso and the
 * left arm and leg; the right limbs wear the left ones mirrored (`MIRRORED_NODES`), as the body itself does.
 */
export const CLOTHES_NODES = ['torso', 'arm-left', 'leg-left'] as const;
/** Clothes sit on the character library's voxel grid: one voxel of the body is this many model units. */
export const CLOTHES_VOXEL_SIZE = 0.05;

/** Alternative to boxes: y-layers (bottom → top) of z-rows of characters mapped through `legend`. */
const layersSchema = z.object({
  origin: z.tuple([int, int, int]),
  legend: z.record(z.string().length(1), z.string().min(1)),
  rows: z.array(z.array(z.string())).min(1),
});

export const accessorySchema = z
  .object({
    id: itemId,
    /** Name the child reads in the Character Creator. */
    name: z.string().min(1),
    slot: z.enum(ACCESSORY_SLOTS),
    unlock: unlockSchema.optional(),
    attachNode: z.string().min(1),
    /** Also worn mirrored (x → -x) on the paired limb (`MIRRORED_NODES`): shoes, gloves. Boxes only. */
    mirror: z.boolean().optional(),
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
    /**
     * Clothes only: boxes per rig joint around its pivot, in the body's own voxels (`CLOTHES_VOXEL_SIZE`,
     * front toward +z), skinned to the character's skeleton so every animation moves them with the body.
     */
    parts: z.partialRecord(z.enum(CLOTHES_NODES), z.array(boxSchema).min(1)).optional(),
    /** Vehicles only: how she rides it. */
    ride: rideSchema.optional(),
  })
  .superRefine((def, ctx) => {
    const clothes = def.slot === 'clothes';
    if (clothes) {
      if (!def.parts?.torso) ctx.addIssue({ code: 'custom', message: 'clothes need parts with a torso' });
      if (def.boxes.length > 0 || def.layers || def.mirror) ctx.addIssue({ code: 'custom', message: 'clothes are authored in parts only (no boxes, layers or mirror)' });
      if (def.attachNode !== 'torso' || def.voxelSize !== CLOTHES_VOXEL_SIZE || def.offset.some((v) => v !== 0) || def.rotation.some((v) => v !== 0)) {
        ctx.addIssue({ code: 'custom', message: `clothes attach to the torso at voxel size ${CLOTHES_VOXEL_SIZE}, offset and rotation 0` });
      }
    } else {
      if (def.parts) ctx.addIssue({ code: 'custom', message: 'only clothes have parts' });
      if (def.boxes.length === 0 && !def.layers) ctx.addIssue({ code: 'custom', message: 'accessory needs boxes or layers' });
    }
    if (def.mirror && !(def.attachNode in MIRRORED_NODES)) ctx.addIssue({ code: 'custom', message: `mirror needs a paired limb node, not "${def.attachNode}"` });
    if (def.mirror && def.layers) ctx.addIssue({ code: 'custom', message: 'mirror works on boxes only' });
    const vehicle = def.slot === 'vehicle';
    if (vehicle !== (def.ride !== undefined)) ctx.addIssue({ code: 'custom', message: vehicle ? 'a vehicle needs ride' : 'only a vehicle has ride' });
    if (vehicle !== (def.attachNode === VEHICLE_NODE)) ctx.addIssue({ code: 'custom', message: `attachNode "${VEHICLE_NODE}" is for vehicles only, and every vehicle uses it` });
    const used = [
      ...def.boxes.map((b) => b.color),
      ...Object.values(def.layers?.legend ?? {}),
      ...Object.values(def.parts ?? {}).flatMap((boxes) => boxes.map((b) => b.color)),
    ];
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

/**
 * An item opens once the child reaches its level and has finished its quest, or, for a shop item, once she
 * has bought it (`owned`). Server-enforced; the UI mirrors it.
 */
export function isAccessoryOpen(unlock: AccessoryUnlock | undefined, level: number, completed: ReadonlySet<string>, owned = false): boolean {
  if (!unlock) return true;
  if (unlock.shop) return owned;
  return (unlock.level === undefined || level >= unlock.level) && (unlock.quest === undefined || completed.has(unlock.quest));
}

/** Items of `slot` a child can wear from level 1 (no unlock condition). */
export function openItemsInSlot(items: Iterable<AccessoryItem>, slot: AccessoryDef['slot']): AccessoryItem[] {
  return [...items].filter((item) => item.slot === slot && !item.unlock);
}

/**
 * A colour variant sold as its own item: the base accessory's shape with one of its palette variants
 * (`variant`), or with colours of its own (`palette`: overrides of the base's palette keys), so a new colour
 * needs no change to the base file.
 */
export const accessoryVariantSchema = z
  .strictObject({
    id: itemId,
    name: z.string().min(1),
    variantOf: itemId,
    variant: z.string().min(1).optional(),
    palette: z.record(z.string(), hexColor).optional(),
    unlock: unlockSchema.optional(),
  })
  .refine((v) => (v.variant === undefined) !== (v.palette === undefined), { message: 'a variant names a palette variant or has a palette, not both' });
export type AccessoryVariantDef = z.infer<typeof accessoryVariantSchema>;

/** One wearable item of the catalogue, as the character, the creator and the server see it. */
export interface AccessoryItem {
  id: string;
  name: string;
  slot: AccessoryDef['slot'];
  /** Geometry and palette source (the base accessory for a colour variant). */
  def: AccessoryDef;
  variant?: string;
  /** The full accessory a colour variant recolours (absent on a full accessory). */
  variantOf?: string;
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
  for (const def of bases.values()) items.set(def.id, { id: def.id, name: def.name, slot: def.slot, def, unlock: def.unlock });
  for (const v of variants) {
    const def = bases.get(v.variantOf);
    if (!def) throw new Error(`${v.id}: variantOf ${v.variantOf} is not a full accessory`);
    const item = { id: v.id, name: v.name, slot: def.slot, variantOf: def.id, unlock: v.unlock };
    if (v.palette) {
      const unknown = Object.keys(v.palette).filter((key) => !(key in def.palette));
      if (unknown.length > 0) throw new Error(`${v.id}: ${v.variantOf} has no colour ${unknown.join(', ')}`);
      // Its colours become a palette variant named after the item, on a copy of the base's definition.
      items.set(v.id, { ...item, def: { ...def, variants: { ...def.variants, [v.id]: v.palette } }, variant: v.id });
      continue;
    }
    const variant = v.variant ?? '';
    if (!(variant in def.variants)) throw new Error(`${v.id}: ${v.variantOf} has no variant "${variant}"`);
    items.set(v.id, { ...item, def, variant });
  }
  return items;
}
