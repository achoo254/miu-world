// entities.json written by the map generator and read by the runtime: spawn, interactables (NPCs and
// the things quests point at), decorative props, landmarks.
import { z } from 'zod';

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
    shape: z.enum(BUILT_SHAPES).optional(),
    /** Text painted on a board beside the target at runtime (the ancient tree's riddle). */
    board: z.string().min(1).optional(),
    /** Shown only while that chapter is played (see `entitiesForChapter`); absent for the map's own chapter. */
    chapter: z.number().int().min(1).optional(),
  })
  .refine((t) => (t.model === undefined) === (t.scale === undefined), { message: 'model and scale go together' })
  .refine((t) => !(t.model && t.shape), { message: 'a target has a model or a built shape, not both' })
  .refine((t) => t.animation === undefined || t.model !== undefined, { message: 'animation needs a model' });
export type Interactable = z.infer<typeof interactableSchema>;

export const worldEntitiesSchema = z
  .object({
    version: z.literal(2),
    id: z.string(),
    seed: z.number().int(),
    size: z.tuple([z.number().int(), z.number().int(), z.number().int()]),
    waterLevel: z.number().int(),
    spawn: z.object({ position: vec3, yaw: z.number() }),
    interactables: z.array(interactableSchema),
    props: z.array(
      z.object({ model: z.string(), position: vec3, yaw: z.number(), scale: z.number().positive(), chapter: z.number().int().min(1).optional() }),
    ),
    landmarks: z.array(z.object({ id: z.string(), name: z.string(), position: vec3 })),
  })
  .superRefine((entities, ctx) => {
    const seen = new Set<string>();
    for (const [i, target] of entities.interactables.entries()) {
      if (seen.has(target.id)) ctx.addIssue({ code: 'custom', path: ['interactables', i, 'id'], message: `duplicate id ${target.id}` });
      seen.add(target.id);
    }
  });
export type WorldEntities = z.infer<typeof worldEntitiesSchema>;

/**
 * What the runtime builds while `chapter` is played: everything untagged (the map's own chapter) plus
 * what is tagged with that chapter. Another chapter's characters and props are neither drawn nor met.
 */
export function entitiesForChapter(entities: WorldEntities, chapter: number): WorldEntities {
  const shown = (e: { chapter?: number }): boolean => e.chapter === undefined || e.chapter === chapter;
  return { ...entities, interactables: entities.interactables.filter(shown), props: entities.props.filter(shown) };
}
