// Wearable items authored in content/accessories/*.json (full accessories and colour variants),
// validated at startup with the same catalogue builder the server uses.
import { buildAccessoryCatalog, type AccessoryDef, type AccessoryItem } from '@miu/voxel/accessory-schema';

const modules = import.meta.glob<{ default: unknown }>('../../../../../content/accessories/*.json', { eager: true });

export const ACCESSORIES: ReadonlyMap<string, AccessoryItem> = buildAccessoryCatalog(Object.values(modules).map((mod) => mod.default));

// A wrong glob path yields an empty map silently; fail loudly instead.
if (ACCESSORIES.size === 0) throw new Error('no accessories found under content/accessories');

/**
 * Shape and colour of an outfit entry: a catalogue item id (what the server stores), or
 * `id:variant` (review and dev switches that show any colour of a shape).
 */
export function resolveOutfitEntry(entry: string): { def: AccessoryDef; variant?: string } {
  const [id = '', variant] = entry.split(':');
  const item = ACCESSORIES.get(id);
  if (!item) throw new Error(`unknown accessory ${id}`);
  return { def: item.def, variant: variant ?? item.variant };
}
