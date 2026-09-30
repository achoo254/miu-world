// Item catalogue (content/items/*.json): what the Backpack and the Collection show for an item the
// server granted (`GET /api/inventory` returns ids and counts only).
import { z } from 'zod';
import { ContentId } from './content';

/** `quest`: story items (Lá thần), shown under "Nhiệm vụ"; `material`: everything else, under "Vật phẩm". */
export const ItemKind = z.enum(['quest', 'material']);

export const Item = z.strictObject({
  id: ContentId,
  name: z.string().min(1),
  description: z.string().min(1),
  /** Where the child uses it, in a sentence. */
  usedIn: z.string().min(1),
  kind: ItemKind,
  /** Key of a UI icon (apps/web/src/ui/kit/ui-art.ts `UI_ICONS`). */
  icon: z.string().min(1),
});
export type Item = z.infer<typeof Item>;
