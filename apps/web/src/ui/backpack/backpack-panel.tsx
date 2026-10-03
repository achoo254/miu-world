// M3.5 Ba lô: tabs Tất cả / Vật phẩm / Nhiệm vụ, a tile per item the server says the child owns
// (`GET /api/inventory`), and the chosen item's name, description and where it is used.
import { useEffect, useState } from 'react';
import { InventoryResponse } from '@miu/schema/game';
import { api, errorMessage } from '../api-client';
import type { TextKey } from '../i18n/i18n';
import { T, useT } from '../i18n/use-t';
import { Icon } from '../kit/art';
import { Tabs } from '../kit/tabs';
import { say, type PlayerData } from '../player/player-data';
import { ITEMS, itemIcon } from './items';
import '../rewards/rewards.css';

type Tab = 'all' | 'material' | 'quest';
const TABS: ReadonlyArray<{ key: Tab; label: TextKey }> = [
  { key: 'all', label: 'backpack.all' },
  { key: 'material', label: 'backpack.items' },
  { key: 'quest', label: 'backpack.quest' },
];

export function BackpackPanel({ data }: { data: Pick<PlayerData, 'character'> }) {
  const [inventory, setInventory] = useState<InventoryResponse['items'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('all');
  const [chosen, setChosen] = useState<string | null>(null);
  const { t } = useT();

  useEffect(() => {
    let live = true;
    api('GET', '/inventory', InventoryResponse).then(
      (res) => live && setInventory(res.items),
      (err: unknown) => live && setError(errorMessage(err)),
    );
    return () => {
      live = false;
    };
  }, []);

  const fill = (text: string) => say(text, data.character);
  const shown = (inventory ?? []).filter((entry) => tab === 'all' || (ITEMS.get(entry.itemId)?.kind ?? 'material') === tab);
  const detail = chosen ? ITEMS.get(chosen) : undefined;
  return (
    <Tabs label={t('backpack.kinds')} items={TABS.map((item) => ({ key: item.key, label: <T k={item.label} /> }))} active={tab} onChange={setTab} dataId="backpack-tab">
      {error ? <p role="alert" className="error">{error}</p> : null}
      {!inventory && !error ? (
        <p role="status">
          <T k="backpack.opening" />
        </p>
      ) : null}
      {inventory && shown.length === 0 ? (
        <p className="hint">
          <T k="backpack.empty" />
        </p>
      ) : null}
      <ul className="item-grid-backpack" data-id="backpack-items">
        {shown.map(({ itemId, qty }) => {
          const item = ITEMS.get(itemId);
          return (
            <li key={itemId}>
              <button type="button" className="bag-tile" aria-pressed={chosen === itemId} data-id={`backpack-item-${itemId}`} onClick={() => setChosen(itemId)}>
                <Icon name={itemIcon(item)} size={44} />
                {item ? fill(item.name) : itemId}
                <span className="bag-qty">×{qty}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {detail ? (
        <div className="bag-detail" data-id="backpack-detail">
          <strong>{fill(detail.name)}</strong>
          <p>{fill(detail.description)}</p>
          <p className="hint">{fill(detail.usedIn)}</p>
        </div>
      ) : null}
    </Tabs>
  );
}
