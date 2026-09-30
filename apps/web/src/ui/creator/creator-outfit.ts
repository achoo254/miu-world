// Character Creator outfit rules on the client: slots, items per slot, one item per slot, and the
// lock text. The server re-checks every choice (PUT /api/character); this only shapes the screen.
import { isAccessoryOpen, type AccessoryItem } from '@miu/voxel/accessory-schema';
import { resolvePalette } from '@miu/voxel/voxel-accessory';
import { ACCESSORIES } from '../../game/content/accessories';

/** Slots with items in the MVP, in tab order. */
export const OPEN_SLOTS = [
  { slot: 'hat', label: 'Mũ' },
  { slot: 'back', label: 'Balo' },
] as const;
export type OpenSlot = (typeof OPEN_SLOTS)[number]['slot'];

/** Tabs shown locked as "Sắp có" (V1): no data behind them. */
export const COMING_SLOTS = ['Áo', 'Giày', 'Cánh'] as const;

/** Open items first, then by level, then quest-locked ones. */
export function itemsForSlot(slot: OpenSlot): AccessoryItem[] {
  const rank = (item: AccessoryItem): number => (!item.unlock ? 0 : item.unlock.quest ? 200 : (item.unlock.level ?? 0));
  return [...ACCESSORIES.values()].filter((item) => item.slot === slot).sort((a, b) => rank(a) - rank(b));
}

/** Wears `itemId` in its slot (replacing what was there), or empties `slot` when `itemId` is null. */
export function equip(equipped: readonly string[], slot: OpenSlot, itemId: string | null): string[] {
  const kept = equipped.filter((id) => ACCESSORIES.get(id)?.slot !== slot);
  return itemId ? [...kept, itemId] : kept;
}

export function isOpen(item: AccessoryItem, level: number, completed: ReadonlySet<string>, worn: readonly string[]): boolean {
  return worn.includes(item.id) || isAccessoryOpen(item.unlock, level, completed);
}

export function lockText(item: AccessoryItem, questTitle: (id: string) => string): string {
  const parts: string[] = [];
  if (item.unlock?.level) parts.push(`Cần Lv.${item.unlock.level}`);
  if (item.unlock?.quest) parts.push(`Xong “${questTitle(item.unlock.quest)}”`);
  return parts.join(' · ');
}

/** Main colour of the item (its first palette entry, after its colour variant): the tile swatch. */
export function swatchColor(item: AccessoryItem): string {
  return Object.values(resolvePalette(item.def, item.variant))[0] ?? 'transparent';
}
