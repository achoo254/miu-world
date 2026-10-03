// Character Creator outfit rules on the client: slots, items per slot, one item per slot, and the
// lock text. The server re-checks every choice (PUT /api/character); this only shapes the screen.
import { accessoryArtPath } from '@miu/schema/accessory-art';
import { isAccessoryOpen, type AccessoryItem } from '@miu/voxel/accessory-schema';
import { ACCESSORIES } from '../../game/content/accessories';
import { characterForSpecies } from '../../game/content/characters';
import { joinBoth, pairOf, type Bilingual, type TextKey } from '../i18n/i18n';
import { assetUrl } from '../kit/ui-art';

/** Every accessory slot, in tab order (head to toe, then what the paw holds). */
export const OPEN_SLOTS = [
  { slot: 'hat', label: 'creator.slot.hat' },
  { slot: 'glasses', label: 'creator.slot.glasses' },
  { slot: 'scarf', label: 'creator.slot.scarf' },
  { slot: 'back', label: 'creator.slot.back' },
  { slot: 'wings', label: 'creator.slot.wings' },
  { slot: 'shoes', label: 'creator.slot.shoes' },
  { slot: 'hand', label: 'creator.slot.hand' },
  { slot: 'clothes', label: 'creator.slot.clothes' },
  { slot: 'vehicle', label: 'creator.slot.vehicle' },
] as const satisfies ReadonlyArray<{ slot: AccessoryItem['slot']; label: TextKey }>;
export type OpenSlot = (typeof OPEN_SLOTS)[number]['slot'];

/** Clothes are always worn: their tab has no "none" tile (the other slots can be left empty). */
export function slotHasNone(slot: OpenSlot): boolean {
  return slot !== 'clothes';
}

/** The item shown as worn in `slot`: the chosen one, or, for clothes when none is chosen, the species' own. */
export function wornInSlot(equipped: readonly string[], slot: OpenSlot, species: string): string | null {
  const chosen = equipped.find((id) => ACCESSORIES.get(id)?.slot === slot);
  return chosen ?? (slot === 'clothes' ? (characterForSpecies(species).clothes ?? null) : null);
}

/** Open items first, then by level, then the shop's, then the region chests', then quest-locked ones. */
export function itemsForSlot(slot: OpenSlot): AccessoryItem[] {
  const rank = (item: AccessoryItem): number =>
    !item.unlock ? 0 : item.unlock.quest ? 200 : item.unlock.region ? 175 : item.unlock.shop ? 150 : (item.unlock.level ?? 0);
  return [...ACCESSORIES.values()].filter((item) => item.slot === slot).sort((a, b) => rank(a) - rank(b));
}

/** Wears `itemId` in its slot (replacing what was there), or empties `slot` when `itemId` is null. */
export function equip(equipped: readonly string[], slot: OpenSlot, itemId: string | null): string[] {
  const kept = equipped.filter((id) => ACCESSORIES.get(id)?.slot !== slot);
  return itemId ? [...kept, itemId] : kept;
}

/** `owned`: what she bought in the shop or claimed from a region chest (such an item opens once hers). */
export function isOpen(item: AccessoryItem, level: number, completed: ReadonlySet<string>, worn: readonly string[], owned: ReadonlySet<string> = new Set()): boolean {
  return worn.includes(item.id) || isAccessoryOpen(item.unlock, level, completed, owned.has(item.id));
}

/** Why a closed item is closed. `regionName`: a region's name as shown (its `{name}` filled). */
export function lockText(item: AccessoryItem, questTitle: (id: string) => string, regionName: (id: string) => string = (id) => id): Bilingual {
  if (item.unlock?.shop) return pairOf('creator.lock.shop');
  if (item.unlock?.region) return pairOf('creator.lock.region', { region: regionName(item.unlock.region) });
  const parts: Bilingual[] = [];
  if (item.unlock?.level) parts.push(pairOf('creator.needLevel', { level: item.unlock.level }));
  if (item.unlock?.quest) parts.push(pairOf('creator.lock.quest', { quest: questTitle(item.unlock.quest) }));
  return joinBoth(parts, ' · ');
}

/** The item's picture on its tile (`pnpm assets:accessories`). */
export function itemArtUrl(item: AccessoryItem): string {
  return assetUrl(accessoryArtPath(item.id));
}
