// The collectible sets on the web (content/collectibles.json, checked by `pnpm content:check`) joined with their
// items (content/items): what the Sổ sưu tập draws for each slot. What she owns, whether a set is complete and
// what its reward pays are the server's (`GET /api/collection`); the client names the set it claims and nothing else.
import { useCallback, useEffect, useState } from 'react';
import { CollectibleCatalog, CollectionClaimResponse, CollectionResponse, type CollectibleRarity, type CollectibleSet } from '@miu/schema/collectible';
import type { Item } from '@miu/schema/item';
import collectiblesJson from '../../../../../content/collectibles.json';
import { api } from '../api-client';
import { ITEMS } from '../backpack/items';
import type { Bilingual, TextKey } from '../i18n/i18n';
import { findRegion } from '../region/regions';

export interface BookSlot {
  id: string;
  rarity: CollectibleRarity;
  lore: string;
  /** Undefined only if the item file is missing (the content check fails first). */
  item: Item | undefined;
}

export interface BookSet {
  mapId: string;
  name: Bilingual;
  description: string;
  title: Bilingual;
  /** The region's name, for the tab (regions have Vietnamese names only). */
  region: string;
  slots: readonly BookSlot[];
}

const bookSet = (set: CollectibleSet): BookSet => ({
  mapId: set.mapId,
  name: { vi: set.name, en: set.en?.name ?? set.name },
  description: set.description,
  title: { vi: set.reward.title, en: set.en?.title ?? set.reward.title },
  region: findRegion(set.mapId)?.name ?? set.mapId,
  slots: set.items.map((entry) => ({ ...entry, item: ITEMS.get(entry.id) })),
});

export const BOOK_SETS: readonly BookSet[] = CollectibleCatalog.parse(collectiblesJson).sets.map(bookSet);
const BY_ITEM: ReadonlyMap<string, BookSet> = new Map(BOOK_SETS.flatMap((set) => set.slots.map((slot) => [slot.id, set] as const)));

/** The set a collectible belongs to (null for any other item). */
export const setOfItem = (itemId: string): BookSet | null => BY_ITEM.get(itemId) ?? null;

/** An item's name in both languages (its own English name when the item file has one). */
export const itemName = (item: Item | undefined, fallback: string): Bilingual => ({ vi: item?.name ?? fallback, en: item?.en?.name ?? item?.name ?? fallback });

export const RARITY_KEYS: Readonly<Record<CollectibleRarity, TextKey>> = {
  common: 'collection.rarity.common',
  uncommon: 'collection.rarity.uncommon',
  rare: 'collection.rarity.rare',
};

export const fetchCollection = (): Promise<CollectionResponse> => api('GET', '/collection', CollectionResponse);
export const claimCollection = (mapId: string): Promise<CollectionClaimResponse> => api('POST', '/collection/claim', CollectionClaimResponse, { mapId });

/** The selected child's collection: null while loading, `failed` when it could not be read, and a reload. */
export function useCollection(): { collection: CollectionResponse | null; failed: boolean; set: (next: CollectionResponse) => void; reload: () => void } {
  const [collection, setCollection] = useState<CollectionResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    fetchCollection().then(
      (data) => live && setCollection(data),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [attempt]);
  const reload = useCallback(() => {
    setFailed(false);
    setAttempt((n) => n + 1);
  }, []);
  return { collection, failed, set: setCollection, reload };
}
