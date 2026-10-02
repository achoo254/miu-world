// entities.json written by the map generator and read by the runtime: spawn, interactables (NPCs and
// the things quests point at), decorative props, landmarks.
import { z } from 'zod';
import { outlandSpecSchema } from './outland';

const vec3 = z.tuple([z.number(), z.number(), z.number()]);

export const INTERACTABLE_KINDS = ['object', 'npc', 'riddle', 'chest', 'gate'] as const;
export type InteractableKind = (typeof INTERACTABLE_KINDS)[number];

/** Meshes the runtime builds in code when no pack has a model (one draw call each). */
export const BUILT_SHAPES = ['letter'] as const;

const interactableSchema = z
  .object({
    /** Quest steps name this id as their `target`. */
    id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
    kind: z.enum(INTERACTABLE_KINDS),
    name: z.string().min(1),
    /** Action shown on the interaction prompt. */
    label: z.string().min(1),
    position: vec3,
    yaw: z.number(),
    /** Distance (blocks) from which the player can interact. */
    radius: z.number().positive(),
    /** Manifest GLB. Absent when the terrain already draws the target (a voxel tree, stepping stones). */
    model: z.string().optional(),
    scale: z.number().positive().optional(),
    /** Looping clip of an animated model (NPCs). */
    animation: z.string().optional(),
    /** Colour the model is multiplied by. */
    tint: z.string().regex(/^#[0-9a-f]{6}$/).optional(),
    shape: z.enum(BUILT_SHAPES).optional(),
    /** Text painted on a board beside the target at runtime (the ancient tree's riddle). */
    board: z.string().min(1).optional(),
    /** Shown only while that chapter is played (see `entitiesForChapter`); absent for the map's own chapter. */
    chapter: z.number().int().min(1).optional(),
    /** A character who comes back in several chapters: shown in each of them, placed once. */
    chapters: z.array(z.number().int().min(1)).min(1).optional(),
    /** Something only one quest uses: shown only while that quest is played (with its chapter). */
    quest: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).optional(),
    /** The character's own id when this is the same character met at another place (see `castHidden`). */
    character: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).optional(),
    /** A gate to another map: the region it leads to (going through plays that region's next lesson). */
    travel: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).optional(),
    /** A stop of the map's own rides (bus, ferry, cart): where it takes the child on this map. */
    ride: vec3.optional(),
  })
  .refine((t) => !(t.chapter !== undefined && t.chapters !== undefined), { message: 'a target has one chapter or a list of chapters, not both' })
  .refine((t) => (t.model === undefined) === (t.scale === undefined), { message: 'model and scale go together' })
  .refine((t) => !(t.model && t.shape), { message: 'a target has a model or a built shape, not both' })
  .refine((t) => t.animation === undefined || t.model !== undefined, { message: 'animation needs a model' });
export type Interactable = z.infer<typeof interactableSchema>;

/**
 * Life around the map that no quest points at: villagers doing chores and animals going about their
 * day. Each `routine` names a behaviour script in the runtime (apps/web/src/game/ambient/); the
 * generator only says who, where they live and the places their chores take them.
 */
export const AMBIENT_ROUTINES = [
  'woodcutter',
  'fisher',
  'gardener',
  'cook',
  'firewood-carrier',
  'parrot',
  'bee',
  'bunny',
  'deer',
  'fox',
  'hog',
  'chick',
  'crab',
  'fish',
  'caterpillar',
  // Everyday trades and farm animals of the wide maps (apps/web/src/game/ambient/everyday-routines.ts).
  'vendor',
  'shopper',
  'porter',
  'ferryman',
  'rice-planter',
  'kite-flyer',
  'home-cook',
  'laundry',
  'waterer',
  'milker',
  'hen-keeper',
  'ploughman',
  'sweeper',
  'school-guard',
  'pupil',
  'teacher',
  'reader',
  'librarian',
  'sentry',
  'trumpeter',
  'cow',
  'pig',
  'dog',
  'cat',
] as const;
export type AmbientRoutine = (typeof AMBIENT_ROUTINES)[number];

const ambientSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  routine: z.enum(AMBIENT_ROUTINES),
  /** Shown on the interaction prompt ("Bác Tiều phu"). */
  name: z.string().min(1),
  model: z.string(),
  scale: z.number().positive(),
  /** Manifest GLBs the character can hold in its right hand, the everyday tool first (axe, hoe…). */
  held: z.array(z.string()).optional(),
  /** Where the character starts and returns to rest. */
  position: vec3,
  yaw: z.number(),
  /** Named places its chores use (the tree it chops, the bank it fishes from, flowers a bee visits…). */
  spots: z.record(z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/), vec3),
  chapter: z.number().int().min(1).optional(),
});
export type Ambient = z.infer<typeof ambientSchema>;

export const worldEntitiesSchema = z
  .object({
    version: z.literal(2),
    id: z.string(),
    seed: z.number().int(),
    size: z.tuple([z.number().int(), z.number().int(), z.number().int()]),
    waterLevel: z.number().int(),
    spawn: z.object({ position: vec3, yaw: z.number() }),
    /**
     * Where a chapter's lessons start on a wide map (by chapter number): at the edge of the chapter's zone, so
     * the child arrives where the lesson is. Chapters without one start at `spawn`.
     */
    chapterSpawns: z.record(z.string().regex(/^[0-9]+$/), z.object({ position: vec3, yaw: z.number() })).optional(),
    interactables: z.array(interactableSchema),
    props: z.array(
      z.object({ model: z.string(), position: vec3, yaw: z.number(), scale: z.number().positive(), chapter: z.number().int().min(1).optional() }),
    ),
    landmarks: z.array(z.object({ id: z.string(), name: z.string(), position: vec3 })),
    /** Absent on maps without ambient life yet. */
    ambients: z.array(ambientSchema).optional(),
    /** The land round the map, generated while playing (outland.ts); absent on maps that end at their edge. */
    outland: outlandSpecSchema.optional(),
  })
  .superRefine((entities, ctx) => {
    const seen = new Set<string>();
    for (const [i, target] of entities.interactables.entries()) {
      if (seen.has(target.id)) ctx.addIssue({ code: 'custom', path: ['interactables', i, 'id'], message: `duplicate id ${target.id}` });
      seen.add(target.id);
    }
    // Ambient ids share the prompt with quest targets, so they must not collide either.
    for (const [i, ambient] of (entities.ambients ?? []).entries()) {
      if (seen.has(ambient.id)) ctx.addIssue({ code: 'custom', path: ['ambients', i, 'id'], message: `duplicate id ${ambient.id}` });
      seen.add(ambient.id);
    }
  });
export type WorldEntities = z.infer<typeof worldEntitiesSchema>;

/**
 * What the runtime builds while `chapter` (and, when known, `quest`) is played: everything untagged (the
 * map's own chapter) plus what is tagged with that chapter, or lists it among its chapters; something tagged
 * with a quest shows only for that quest. Another chapter's characters and props are neither drawn nor met.
 */
export function entitiesForChapter(entities: WorldEntities, chapter: number, quest?: string): WorldEntities {
  const shown = (e: { chapter?: number; chapters?: readonly number[]; quest?: string }): boolean => {
    const inChapter = e.chapters ? e.chapters.includes(chapter) : e.chapter === undefined || e.chapter === chapter;
    return inChapter && (e.quest === undefined || e.quest === quest);
  };
  const spawn = entities.chapterSpawns?.[String(chapter)] ?? entities.spawn;
  return { ...entities, spawn, interactables: entities.interactables.filter(shown), props: entities.props.filter(shown), ...(entities.ambients ? { ambients: entities.ambients.filter(shown) } : {}) };
}

/**
 * Ids to hide so that each character stands in one place at a time. Entries of the same character (its own
 * id, or `character` naming it) form a cast; the one shown is, in order: the last of `pointedAt` (the
 * targets the quest's steps pointed at, oldest first), a copy of the quest's own place, the character's own
 * entry, then the first by id. Pass what `entitiesForChapter` kept.
 */
export function castHidden(interactables: readonly Interactable[], pointedAt: readonly string[]): Set<string> {
  const casts = new Map<string, Interactable[]>();
  for (const target of interactables) {
    if (target.kind !== 'npc') continue;
    const key = target.character ?? target.id;
    casts.set(key, [...(casts.get(key) ?? []), target]);
  }
  const hidden = new Set<string>();
  for (const [key, members] of casts) {
    if (members.length < 2) continue;
    const ids = members.map((m) => m.id).sort();
    const shown =
      [...pointedAt].reverse().find((id) => ids.includes(id)) ??
      members.filter((m) => m.quest !== undefined).map((m) => m.id).sort()[0] ??
      ids.find((id) => id === key) ??
      ids[0];
    for (const id of ids) if (id !== shown) hidden.add(id);
  }
  return hidden;
}

