// Characters are composed from reusable data, never authored one by one: a base body, parts picked
// from a shared library (ears, eyes, mouth, muzzle, cheeks, whiskers, tail), an outfit layer any body
// can wear, and palettes whose named slots every part paints with. A species is a recipe of parts and
// fur colours; a character (the player's animal, an NPC) is a species plus an outfit, colour
// overrides and tags. Outfit rules re-dress every character whose tags match (an event, a season)
// without touching the characters themselves. Pure data → boxes: no three.js, shared by the asset
// tools and, later, the runtime.
import { z } from 'zod';

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const int = z.number().int();
const id = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const vec3i = z.tuple([int, int, int]);

export const voxelBoxSchema = z.object({
  x: int,
  y: int,
  z: int,
  w: int.positive(),
  h: int.positive(),
  d: int.positive(),
  /** Palette slot the box is painted with. */
  color: z.string().min(1),
  /** Also emit the box mirrored across x = 0 (left/right symmetric features). */
  sym: z.boolean().optional(),
});
export type VoxelBox = z.infer<typeof voxelBoxSchema>;
const boxes = z.array(voxelBoxSchema).min(1);

/** Joint name → boxes around that joint's pivot. Only the left arm and leg are authored: the right side is mirrored. */
const jointBoxes = z.record(id, boxes);

/** Slots every species defines, so any part or outfit combines with any species. */
export const SPECIES_SLOTS = [
  'fur', 'fur-shade', 'chest', 'paw', 'foot', 'muzzle', 'ear-inner', 'ear-tip',
  'eye', 'shine', 'nose', 'mouth', 'tongue', 'tooth', 'cheek', 'whisker',
] as const;

/** The body every character shares: head, paws, lower legs, and where the tail joint sits on the torso. */
export const baseBodySchema = z.object({ parts: jointBoxes, tailPivot: vec3i });
export type BaseBody = z.infer<typeof baseBodySchema>;

/** A library part: boxes on one joint (the head for faces and ears, `tail` for tails). */
export const characterPartSchema = z.object({ joint: id, boxes });
export type CharacterPart = z.infer<typeof characterPartSchema>;
export const partLibrarySchema = z.record(id, characterPartSchema);

/** Torso, sleeves and upper legs, painted with its own slots (plus any species slot, e.g. `fur` for bare legs). */
export const outfitSchema = z.object({
  name: z.string().min(1),
  parts: jointBoxes.refine((p) => 'torso' in p, 'an outfit needs a torso'),
  palette: z.record(z.string(), hexColor),
  /** Named palette overrides: a new colourway needs no geometry. */
  variants: z.record(id, z.record(z.string(), hexColor)).default({}),
});
export type OutfitDef = z.infer<typeof outfitSchema>;

/**
 * A part picked by id, optionally moved by whole voxels. The x offset applies before symmetric boxes
 * are mirrored, so +x spreads a symmetric pair apart and -x pulls it together.
 */
const partRef = z.union([id, z.object({ id, offset: vec3i })]);
/** `outfit` or `outfit:variant`, the same convention as equipped accessories. */
const outfitRef = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*(?::[a-z0-9]+(?:-[a-z0-9]+)*)?$/);

export const speciesSchema = z.object({
  name: z.string().min(1),
  /** Short trait line the Character Creator shows under the name. */
  trait: z.string().min(1),
  base: id,
  /** Part kind (a library file) → the part this species uses. */
  parts: z.record(id, partRef),
  palette: z
    .record(z.string(), hexColor)
    .refine((p) => SPECIES_SLOTS.every((slot) => slot in p), { message: `a species palette needs ${SPECIES_SLOTS.join(', ')}` }),
  /** Worn unless the character or an outfit rule says otherwise. */
  outfit: outfitRef,
});
export type SpeciesDef = z.infer<typeof speciesSchema>;

/** What one character is: everything else comes from the library. */
export const characterRecipeSchema = z.object({
  species: id,
  outfit: outfitRef.optional(),
  /** Slot overrides applied last (a ginger cat, a red dress). */
  palette: z.record(z.string(), hexColor).default({}),
  /** Free labels outfit rules match on (for example a gender or a role for NPCs). */
  tags: z.array(id).default([]),
});
export type CharacterRecipe = z.input<typeof characterRecipeSchema>;

/** Every character carrying all of `tags` wears `outfit` instead of its own. The first matching rule wins. */
export const outfitRuleSchema = z.object({ tags: z.array(id).min(1), outfit: outfitRef });
export type OutfitRule = z.infer<typeof outfitRuleSchema>;

export interface CharacterLibrary {
  readonly bases: Readonly<Record<string, BaseBody>>;
  /** Part kind → id → part. */
  readonly parts: Readonly<Record<string, Readonly<Record<string, CharacterPart>>>>;
  readonly outfits: Readonly<Record<string, OutfitDef>>;
  readonly species: Readonly<Record<string, SpeciesDef>>;
}

export interface ComposedCharacter {
  readonly palette: Readonly<Record<string, string>>;
  /** Joint → boxes (symmetric boxes expanded, right limbs mirrored). */
  readonly parts: ReadonlyMap<string, readonly VoxelBox[]>;
  readonly tailPivot: readonly [number, number, number];
  /** The outfit actually worn, after the rules (`id` or `id:variant`). */
  readonly outfit: string;
}

const MIRRORED_LIMBS: ReadonlyArray<readonly [string, string]> = [
  ['arm-left', 'arm-right'],
  ['leg-left', 'leg-right'],
];

/** The outfit a recipe ends up wearing: a matching rule, else its own, else its species' default. */
export function resolveOutfit(recipe: CharacterRecipe, species: SpeciesDef, rules: readonly OutfitRule[] = []): string {
  const tags = new Set(recipe.tags ?? []);
  const rule = rules.find((r) => r.tags.every((tag) => tags.has(tag)));
  return rule?.outfit ?? recipe.outfit ?? species.outfit;
}

function expandSymmetric(list: readonly VoxelBox[]): VoxelBox[] {
  return list.flatMap((box) => (box.sym ? [box, { ...box, x: -(box.x + box.w) }] : [box]));
}

function lookup<T>(table: Readonly<Record<string, T>>, key: string, what: string): T {
  const value = table[key];
  if (value === undefined) throw new Error(`unknown ${what} "${key}"`);
  return value;
}

export function composeCharacter(input: CharacterRecipe, library: CharacterLibrary, rules: readonly OutfitRule[] = []): ComposedCharacter {
  const recipe = characterRecipeSchema.parse(input);
  const species = lookup(library.species, recipe.species, 'species');
  const base = lookup(library.bases, species.base, 'base body');
  const outfitEntry = resolveOutfit(recipe, species, rules);
  const [outfitId = '', variant] = outfitEntry.split(':');
  const outfit = lookup(library.outfits, outfitId, 'outfit');
  const colourway = variant === undefined ? {} : lookup(outfit.variants, variant, `variant of outfit ${outfitId}`);

  const parts = new Map<string, VoxelBox[]>();
  const add = (joint: string, list: readonly VoxelBox[]): void => {
    parts.set(joint, [...(parts.get(joint) ?? []), ...expandSymmetric(list)]);
  };
  for (const [joint, list] of Object.entries(base.parts)) add(joint, list);
  for (const [kind, ref] of Object.entries(species.parts)) {
    const partId = typeof ref === 'string' ? ref : ref.id;
    const [dx, dy, dz] = typeof ref === 'string' ? [0, 0, 0] : ref.offset;
    const part = lookup(lookup(library.parts, kind, 'part kind'), partId, `${kind} part`);
    add(part.joint, part.boxes.map((b) => ({ ...b, x: b.x + dx, y: b.y + dy, z: b.z + dz })));
  }
  for (const [joint, list] of Object.entries(outfit.parts)) add(joint, list);
  for (const [left, right] of MIRRORED_LIMBS) {
    const list = parts.get(left);
    if (list && !parts.has(right)) parts.set(right, list.map((b) => ({ ...b, x: -(b.x + b.w) })));
  }

  const palette = { ...species.palette, ...outfit.palette, ...colourway, ...recipe.palette };
  const missing = new Set<string>();
  for (const list of parts.values()) for (const box of list) if (!(box.color in palette)) missing.add(box.color);
  if (missing.size > 0) throw new Error(`${recipe.species} in ${outfitEntry}: no colour for slot(s) ${[...missing].join(', ')}`);
  return { palette, parts, tailPivot: base.tailPivot, outfit: outfitEntry };
}
