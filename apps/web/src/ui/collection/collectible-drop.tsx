// The small "Mới!" note on a completion card (a lesson's reward screen, a won minigame's result card) when the
// run dropped a collectible: its picture and name, "Mới!" for a first one or its count for a double. The server
// picked the thing (`completion.collectible`); nothing shows for a run without one.
import type { CollectibleDrop } from '@miu/schema/game';
import { ITEMS, itemIcon } from '../backpack/items';
import { mapBoth } from '../i18n/i18n';
import { Bi, T } from '../i18n/use-t';
import { Icon } from '../kit/art';
import { itemName } from './collection-catalog';
import './collection.css';

export function CollectibleDropNote({ drop, fill }: { drop: CollectibleDrop | null | undefined; fill: (text: string) => string }) {
  if (!drop) return null;
  const item = ITEMS.get(drop.itemId);
  const name = mapBoth(itemName(item, drop.itemId), fill);
  const first = drop.owned === 1;
  return (
    <p className="collect-drop" role="status" data-id="collectible-drop" data-new={first}>
      <span className="badge collect-drop-badge">{first ? <T k="collection.new" /> : `×${drop.owned}`}</span>
      <Icon name={itemIcon(item)} size={36} />
      <span>{first ? <T k="collection.dropNew" params={{ item: name }} /> : <Bi {...name} />}</span>
    </p>
  );
}
