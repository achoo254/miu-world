// The child's trophy room as she earned it: each display spot the map wrote (world-entities.ts `trophies`) shows
// its piece when its key is among hers (the server's `GET /api/trophies`, packages/schema trophy-room.ts), its
// empty stand otherwise, added to the map's props when the game is built.
import type { WorldEntities } from './world-entities';

type Prop = WorldEntities['props'][number];

/** The pieces and empty stands standing in the trophy room for the keys she earned. */
export function trophyProps(entities: WorldEntities, earned: ReadonlySet<string>): Prop[] {
  return (entities.trophies ?? []).flatMap((spot) => (earned.has(spot.key) ? [spot.shown] : spot.empty ? [spot.empty] : []));
}

/** The map with its trophy room filled in; unchanged on a map without one. */
export function withTrophies(entities: WorldEntities, earned: ReadonlySet<string>): WorldEntities {
  if (!entities.trophies || entities.trophies.length === 0) return entities;
  return { ...entities, props: [...entities.props, ...trophyProps(entities, earned)] };
}
