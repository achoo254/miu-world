import { z } from 'zod';
import { ContentId } from './content';

// Where the active child last stood on each map, so the next visit starts there instead of at spawn.

/** Generous sanity bounds (blocks): the game itself checks the spot against the map before using it. */
const Coordinate = z.number().finite().min(-64).max(1024);

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
