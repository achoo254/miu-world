// Region catalogue (content/world/regions.json): the places on the Home island, their state in the
// MVP, and where their hotspot sits on the island image. Quests name their region by this id.
import { z } from 'zod';
import { ContentId } from './content';

export { REGION_CHEST_ICON, REGION_CHEST_MODEL, regionBackdropPath } from './region-art';

/** `open`: playable, from the start (no map is locked); `v1`, `soon`: not built yet. */
export const RegionStatus = z.enum(['open', 'v1', 'soon']);
export type RegionStatus = z.infer<typeof RegionStatus>;

const percent = z.number().min(0).max(100);
const point = z.tuple([z.number(), z.number(), z.number()]);

/**
 * Camera on the region's map for its backdrop image (the region screen's background), rendered by
 * `pnpm assets:regions` into `generated/regions/<id>.png`. Map coordinates, in blocks.
 */
/** Surprise world events the game can play on any map: rain then a rainbow, fireflies at dusk, an animal coming to say hello. */
export const WorldEventKind = z.enum(['rain-rainbow', 'fireflies', 'animal-visit']);
export type WorldEventKind = z.infer<typeof WorldEventKind>;

export const RegionBackdrop = z.strictObject({ eye: point, target: point, fov: z.number().min(20).max(90) });
export type RegionBackdrop = z.infer<typeof RegionBackdrop>;

export const Region = z.strictObject({
  id: ContentId,
  /** May use `{name}` (the player's character name), like quest text. */
  name: z.string().min(1),
  tagline: z.string().min(1),
  /** Short line under the name on the Home island and the world map: the subject or activity (mock M1.1). */
  subject: z.string().min(1).optional(),
  /** What the region holds, said in the speech bubble of the region screen. May use `{name}`. */
  description: z.string().min(1).optional(),
  backdrop: RegionBackdrop.optional(),
  /** Surprises the world plays now and then while the child explores this region (rotating, never twice in a row). */
  events: z.array(WorldEventKind).min(1).optional(),
  status: RegionStatus,
  /** Hotspot centre on the island image, in percent of its width and height. */
  hotspot: z.strictObject({ x: percent, y: percent }),
});
export type Region = z.infer<typeof Region>;

export const RegionCatalog = z
  .strictObject({ version: z.literal(1), regions: z.array(Region).min(1) })
  .refine((c) => new Set(c.regions.map((r) => r.id)).size === c.regions.length, { message: 'duplicate region id' });
export type RegionCatalog = z.infer<typeof RegionCatalog>;
