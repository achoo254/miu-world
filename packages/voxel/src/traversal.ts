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
