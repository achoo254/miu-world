// Caring for the pet that trots after the player (content/pets.json): its needs, its bond level and the tricks
// that level opens, its name and what it wears (content/pet-gear.json). Every number here is the server's: the
// web app sends what the player did (fed it, asked for a trick), never a stat, an XP or a level.
import { z } from 'zod';
import { ContentId } from './content';

/** The needs a care scene answers; 0–100, drifting down slowly while she is away but never below `PET_STAT_FLOOR`. */
export const PetCareStats = z.strictObject({
  happiness: z.number().int().min(0).max(100),
  fullness: z.number().int().min(0).max(100),
  cleanliness: z.number().int().min(0).max(100),
});
export type PetCareStats = z.infer<typeof PetCareStats>;

/**
 * Where the needs stop drifting down: a pet left alone for weeks is still a cheerful one (it never turns sad, sick,
 * runs away or loses anything); it is only a little hungry or dusty.
 */
export const PET_STAT_FLOOR = 40;

/** The care buttons, each played as a scene in the world (bowl, bath, ball, petting, a nap). */
export const PET_CARE_ACTIONS = ['feed', 'pet', 'bath', 'play', 'nap'] as const;
export const PetCareAction = z.enum(PET_CARE_ACTIONS);
export type PetCareAction = z.infer<typeof PetCareAction>;

/** The tricks a pet learns as the bond grows, each opened at a bond level; the player calls them from a menu. */
export const PET_TRICKS = [
  { id: 'sit', level: 1 },
  { id: 'spin', level: 2 },
  { id: 'jump', level: 3 },
  { id: 'roll', level: 4 },
  { id: 'high-five', level: 5 },
  { id: 'dance', level: 7 },
] as const;
export type PetTrick = (typeof PET_TRICKS)[number]['id'];
export const PetTrick = z.enum(PET_TRICKS.map((t) => t.id) as [PetTrick, ...PetTrick[]]);

/** Bond XP at which each level starts (level 1 at 0): care and time walking together fill it. */
export const PET_LEVEL_XP = [0, 40, 100, 180, 280, 400, 550, 720, 900, 1100] as const;
export const PET_MAX_LEVEL = PET_LEVEL_XP.length;

/** At most one thing per place on the pet: on its head (hat, bow, crown, flower) and round its neck (collar, scarf). */
export const PET_GEAR_SLOTS = ['head', 'neck'] as const;
export const PetGearSlot = z.enum(PET_GEAR_SLOTS);
export type PetGearSlot = z.infer<typeof PetGearSlot>;

/** A pet's name: one of content/names/pet-names.json (the server checks), or null for the species' own name. */
export const PetName = z
  .string()
  .min(1)
  .max(24)
  .transform((s) => s.normalize('NFC'));

export const PetBond = z.strictObject({
  /** Picked from the list; null: it goes by its kind ("Mèo xám"). */
  name: z.string().nullable(),
  stats: PetCareStats,
  level: z.number().int().min(1).max(PET_MAX_LEVEL),
  xp: z.number().int().min(0),
  /** XP where this level started and where the next starts (null at the top level), for the bar. */
  levelXp: z.number().int().min(0),
  nextLevelXp: z.number().int().min(0).nullable(),
  /** Tricks open at this level, in the order they open. */
  tricks: z.array(PetTrick),
  /** What the pet wears now (content/pet-gear.json ids), at most one per slot. */
  gear: z.array(ContentId).max(PET_GEAR_SLOTS.length),
});
export type PetBond = z.infer<typeof PetBond>;

export const PetCareStatusResponse = z.discriminatedUnion('hasPet', [
  z.strictObject({ hasPet: z.literal(false), petId: z.null() }),
  z.strictObject({ hasPet: z.literal(true), petId: ContentId, bond: PetBond }),
]);
export type PetCareStatusResponse = z.infer<typeof PetCareStatusResponse>;

/**
 * A care button. `itemId`: a cooked dish she owns (content/recipes.json result) to feed instead of the pet's own
 * food; one is used up. Anything else in the body is ignored.
 */
export const PetCareRequest = z.strictObject({
  action: PetCareAction,
  itemId: ContentId.optional(),
});
export type PetCareRequest = z.infer<typeof PetCareRequest>;

/** The bond after a care scene or a walk, and what it brought: XP (0 when the same care was just paid), a new level, new tricks. */
export const PetBondChange = z.strictObject({
  bond: PetBond,
  xpGained: z.number().int().min(0),
  levelUp: z.boolean(),
  unlocked: z.array(PetTrick),
});
export type PetBondChange = z.infer<typeof PetBondChange>;

export const PetTrickRequest = z.strictObject({ trick: PetTrick });
export type PetTrickRequest = z.infer<typeof PetTrickRequest>;

export const PetNameRequest = z.strictObject({ name: PetName.nullable() });
export type PetNameRequest = z.infer<typeof PetNameRequest>;

/** What the pet wears from now on: gear she owns, at most one per slot (empty: nothing). */
export const PetGearRequest = z.strictObject({ gear: z.array(ContentId).max(PET_GEAR_SLOTS.length) });
export type PetGearRequest = z.infer<typeof PetGearRequest>;

export const PetBondResponse = z.strictObject({ bond: PetBond });
export type PetBondResponse = z.infer<typeof PetBondResponse>;
