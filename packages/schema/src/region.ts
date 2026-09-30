// Region catalogue (content/world/regions.json): the places on the Home island, their state in the
// MVP, and where their hotspot sits on the island image. Quests name their region by this id.
import { z } from 'zod';
import { ContentId } from './content';

/** `open`: playable; `v1`: planned after the MVP; `soon`: next content drop; `level`: opens at a level. */
export const RegionStatus = z.enum(['open', 'v1', 'soon', 'level']);
export type RegionStatus = z.infer<typeof RegionStatus>;

const percent = z.number().min(0).max(100);

export const Region = z
  .strictObject({
    id: ContentId,
    /** May use `{name}` (the player's character name), like quest text. */
    name: z.string().min(1),
    tagline: z.string().min(1),
    status: RegionStatus,
    /** Level that opens a `level` region. */
    level: z.number().int().min(2).optional(),
    /** Hotspot centre on the island image, in percent of its width and height. */
    hotspot: z.strictObject({ x: percent, y: percent }),
  })
  .refine((r) => (r.status === 'level') === (r.level !== undefined), { message: 'level goes with status "level" only' });
export type Region = z.infer<typeof Region>;

export const RegionCatalog = z
  .strictObject({ version: z.literal(1), regions: z.array(Region).min(1) })
  .refine((c) => new Set(c.regions.map((r) => r.id)).size === c.regions.length, { message: 'duplicate region id' });
export type RegionCatalog = z.infer<typeof RegionCatalog>;
