// Item descriptions (content/items/*.json, checked by `pnpm content:check`); the server only sends ids
// and counts. An id without a description still shows, by its id, rather than breaking the screen.
import { Item } from '@miu/schema/item';
import type { UiIcon } from '../kit/ui-art';
import { UI_ICONS } from '../kit/ui-art';

const modules = import.meta.glob<{ default: unknown }>('../../../../../content/items/*.json', { eager: true });

export const ITEMS: ReadonlyMap<string, Item> = new Map(
  Object.values(modules).map((mod) => {
    const item = Item.parse(mod.default);
    return [item.id, item] as const;
  }),
);

export function itemIcon(item: Item | undefined): UiIcon {
  return item && item.icon in UI_ICONS ? (item.icon as UiIcon) : 'gift';
}
