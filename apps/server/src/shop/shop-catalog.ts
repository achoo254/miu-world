import { readdirSync } from 'node:fs';
import path from 'node:path';
import type { HomeDecorCatalog } from '@miu/schema/home-decor';
import { ShopFile, buildShopCatalog, type ShopItemDto, type ShopListing } from '@miu/schema/shop';
import type { AccessoryItem } from '@miu/voxel/accessory-schema';
import { readContentJson } from '../content/content-catalog';
import { CONTENT_DIR } from '../content/content-dir';

/** The shop's catalogue: what is for sale (server prices) and the same as the screen shows it. */
export interface ShopCatalog {
  listings: ReadonlyMap<string, ShopListing>;
  /** Every listing with its name and picture resolved, in catalogue order. */
  items: readonly ShopItemDto[];
  /** Home styles sold in the shop: a child picks one only once she owns it. */
  paidDecor: ReadonlySet<string>;
}

/** Every file of `<dir>/shop` (none: an empty shop), parsed. */
export function readShopFiles(dir: string = CONTENT_DIR): ShopFile[] {
  const folder = path.join(dir, 'shop');
  let names: string[];
  try {
    names = readdirSync(folder);
  } catch {
    return [];
  }
  return names
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => readContentJson(ShopFile, path.join(folder, f)));
}

/**
 * The shop over the wearables and home styles it sells. A catalogue that does not fit the content fails the
 * boot (and `pnpm content:check`), never a request. `icons`: pictures a booster or bundle may name (the web
 * app's; the content check passes them, the server does not know them).
 */
export function loadShopCatalog(accessories: ReadonlyMap<string, AccessoryItem>, decor: HomeDecorCatalog, dir: string = CONTENT_DIR, icons?: ReadonlySet<string>): ShopCatalog {
  const styles = new Map(decor.slots.flatMap((slot) => slot.options.map((option) => [option.id, { slot, option }] as const)));
  const { listings, issues } = buildShopCatalog(readShopFiles(dir), {
    wearables: new Map([...accessories.values()].map((item) => [item.id, { shopOnly: item.unlock?.shop === true }])),
    decor: new Map([...styles].map(([id, { slot }]) => [id, { isDefault: slot.default === id }])),
    icons,
  });
  if (issues.length > 0) throw new Error(`invalid shop catalogue: ${issues.join('; ')}`);
  const items = [...listings.values()].map((listing): ShopItemDto => {
    const base = {
      id: listing.id,
      kind: listing.kind,
      category: listing.category,
      price: listing.price,
      level: listing.level ?? null,
      featured: listing.featured ?? false,
      nameEn: listing.en?.name ?? null,
      descriptionEn: listing.en?.description ?? null,
    };
    const none = { slot: null, swatch: null, icon: null, effect: null, contains: null };
    switch (listing.kind) {
      case 'wearable': {
        const item = accessories.get(listing.id);
        return { ...base, ...none, name: item?.name ?? listing.id, description: listing.description ?? null, slot: item?.slot ?? null };
      }
      case 'decor': {
        const style = styles.get(listing.id);
        return { ...base, ...none, name: style?.option.name ?? listing.id, description: listing.description ?? null, slot: style?.slot.id ?? null, swatch: style?.option.swatch ?? null };
      }
      case 'booster':
        return { ...base, ...none, name: listing.name, description: listing.description, icon: listing.icon, effect: listing.effect };
      case 'bundle':
        return { ...base, ...none, name: listing.name, description: listing.description, icon: listing.icon, contains: listing.contains };
    }
  });
  const paidDecor = new Set([...listings.values()].filter((l) => l.kind === 'decor').map((l) => l.id));
  return { listings, items, paidDecor };
}
