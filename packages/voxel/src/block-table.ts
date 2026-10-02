// Block definitions (content/blocks.json) and the resolved atlas description (generated atlas.json)
// shared by the atlas builder, the map generator and the runtime (meshing + collision).
import { z } from 'zod';

export const AIR = 0;

const blockSchema = z.object({
  id: z.number().int().min(1).max(255),
  name: z.string().regex(/^[a-z0-9-]+$/),
  top: z.string(),
  side: z.string(),
  bottom: z.string(),
  /** Collides with the player (and the camera). Leaves and tree wood do not: Miu walks through trees. */
  solid: z.boolean().default(true),
  /** Lets light/faces through: neighbours keep their faces. */
  transparent: z.boolean().default(false),
  /** Rendered by the water pass instead of the opaque chunk mesh. */
  liquid: z.boolean().default(false),
  /** Lit from within (a lantern, a lit window): drawn at its own colour whatever the light, aglow at dusk. */
  glow: z.boolean().default(false),
});
export type BlockDef = z.infer<typeof blockSchema>;

export const blockTableSchema = z
  .object({
    tileSize: z.number().int().positive(),
    padding: z.number().int().nonnegative(),
    source: z.string(),
    tiles: z.record(z.string(), z.object({ file: z.string(), tint: z.string().nullable(), strength: z.number().min(0).max(1) })),
    blocks: z.array(blockSchema),
  })
  .superRefine((table, ctx) => {
    const ids = new Set<number>();
    for (const block of table.blocks) {
      if (ids.has(block.id)) ctx.addIssue({ code: 'custom', message: `duplicate block id ${block.id}` });
      ids.add(block.id);
      for (const face of [block.top, block.side, block.bottom]) {
        if (!(face in table.tiles)) ctx.addIssue({ code: 'custom', message: `block ${block.name} uses unknown tile ${face}` });
      }
    }
  });
export type BlockTable = z.infer<typeof blockTableSchema>;

/** Pixel rect [x, y, w, h] of a tile's unpadded area, image space (origin top-left). */
const rectSchema = z.tuple([z.number(), z.number(), z.number(), z.number()]);

export const atlasSchema = z.object({
  size: z.number().int().positive(),
  tileSize: z.number().int().positive(),
  padding: z.number().int().nonnegative(),
  /** Highest mip level whose texels never mix two tiles. */
  safeMipLevel: z.number().int().nonnegative(),
  tiles: z.record(z.string(), rectSchema),
  blocks: z.array(
    blockSchema.extend({ top: rectSchema, side: rectSchema, bottom: rectSchema }),
  ),
});
export type Atlas = z.infer<typeof atlasSchema>;
export type AtlasBlock = Atlas['blocks'][number];

export function blockLookup<T extends { id: number }>(blocks: readonly T[]): (id: number) => T | undefined {
  const table: Array<T | undefined> = [];
  for (const block of blocks) table[block.id] = block;
  return (id) => table[id];
}
