import { z } from 'zod';
import { ContentId } from './content';

// Where the active child last stood on each map, so the next visit starts there instead of at spawn.

/**
 * Generous sanity bounds (blocks): a map's outer land reaches from -2432 to 3328 round its core
 * (packages/voxel outland.ts); the game itself checks the spot against the map before using it.
 */
const Coordinate = z.number().finite().min(-2560).max(3456);

export const PlayerPosition = z.strictObject({
  /** Map id (`assets/generated/world/<map>`), e.g. `forest-ch1`, `truong-hoc`. */
  map: ContentId,
  position: z.tuple([Coordinate, Coordinate, Coordinate]),
  /** Heading in radians. */
  facing: z.number().finite().min(-100).max(100),
});
export type PlayerPosition = z.infer<typeof PlayerPosition>;

export const PlayerPositionList = z.object({ positions: z.array(PlayerPosition) });
export type PlayerPositionList = z.infer<typeof PlayerPositionList>;
