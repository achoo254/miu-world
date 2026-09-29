// entities.json written by the map generator and read by the runtime: spawn, NPCs, props, landmarks.
import { z } from 'zod';

const vec3 = z.tuple([z.number(), z.number(), z.number()]);

export const worldEntitiesSchema = z.object({
  version: z.literal(1),
  id: z.string(),
  seed: z.number().int(),
  size: z.tuple([z.number().int(), z.number().int(), z.number().int()]),
  waterLevel: z.number().int(),
  spawn: z.object({ position: vec3, yaw: z.number() }),
  npcs: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      model: z.string(),
      animation: z.string(),
      position: vec3,
      yaw: z.number(),
      scale: z.number().positive(),
      interactRadius: z.number().positive(),
      label: z.string(),
    }),
  ),
  props: z.array(z.object({ model: z.string(), position: vec3, yaw: z.number(), scale: z.number().positive() })),
  landmarks: z.array(z.object({ id: z.string(), name: z.string(), position: vec3 })),
});
export type WorldEntities = z.infer<typeof worldEntitiesSchema>;
