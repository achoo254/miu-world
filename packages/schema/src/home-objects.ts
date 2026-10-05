// What a player left switched on in her own home (a lamp lit, the television on, a wardrobe open): kept on the
// server with her home and put back when she comes home (GET/PUT /api/home-objects). A key names the object by
// its place in the home: `<interaction>@<slot or spot>` (apps/web/src/game/interact/interaction-geometry.ts).
// Only what is on is kept: off is every object's default.
import { z } from 'zod';

/** Objects one home can keep switched on (the home has a few dozen that switch; more is a bad request). */
export const MAX_HOME_OBJECT_STATES = 96;

export const HomeObjectKey = z
  .string()
  .min(3)
  .max(80)
  .regex(/^[a-z0-9-]+@[a-z0-9:#,.-]+$/);

export const HomeObjectStates = z
  .record(HomeObjectKey, z.literal(true))
  .refine((states) => Object.keys(states).length <= MAX_HOME_OBJECT_STATES, { message: 'too many objects' });
export type HomeObjectStates = z.infer<typeof HomeObjectStates>;

/** What the game saves and the server answers with: every object of her home that is on. */
export const HomeObjects = z.strictObject({ states: HomeObjectStates });
export type HomeObjects = z.infer<typeof HomeObjects>;
