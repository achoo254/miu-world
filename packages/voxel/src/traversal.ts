// How the child gets past a thing in her way (owner, 02/10/2026: as in real life). One rule for blocks
// (content/blocks.json) and placed models (content/world/models.json), read by the game's collision and the
// map tools' walk search:
// - walk-through: no collision at all (grass, bushes, flowers, fields, trees, rugs).
// - auto-step: solid, with its real height; she steps up one block and climbs two on her own as she walks
//   (low rocks, steps, ledges, crates, benches, terrain).
// - blocking: solid and never stepped onto or climbed over by walking (walls, fences, doors, railings, big
//   rocks); a jump is still a jump.
export const TRAVERSALS = ['walk-through', 'auto-step', 'blocking'] as const;
export type Traversal = (typeof TRAVERSALS)[number];

/** The most a walk climbs between two neighbouring columns on its own (the controller's automatic climb). */
export const MAX_CLIMB = 2;
/** The deepest drop a walk takes between two neighbouring columns. */
export const MAX_DROP = 3;

/**
 * Whether a walk goes from one standing spot to the next column's (feet heights in blocks, `clear` the open
 * blocks over each spot): up to MAX_CLIMB up with room over the first spot for the body to rise, level, or
 * down up to MAX_DROP with open blocks over the second spot all the way from the first one's feet. One rule for
 * the child's auto-walk and the companion bots.
 */
export function canStep(fromFeet: number, fromClear: number, toFeet: number, toClear: number): boolean {
  const rise = toFeet - fromFeet;
  if (rise > MAX_CLIMB || -rise > MAX_DROP) return false;
  if (rise > 0) return fromClear >= rise + 2;
  if (rise < 0) return toClear >= 2 - rise;
  return true;
}
