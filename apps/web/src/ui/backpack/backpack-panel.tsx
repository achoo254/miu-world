// M3.5 Ba lô: tabs Tất cả / Vật phẩm / Nhiệm vụ, a tile per item the server says the child owns
// (`GET /api/inventory`), and the chosen item's name, description and where it is used. "Sổ sưu tập" opens the
// collection book over it.
import { useEffect, useState } from 'react';
import { InventoryResponse } from '@miu/schema/game';
import { api, errorMessage } from '../api-client';
import { CollectionBook } from '../collection/collection-book';
import type { TextKey } from '../i18n/i18n';
import { T, useT } from '../i18n/use-t';
import { Icon } from '../kit/art';
import { buttonClass } from '../kit/button';
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

/** `region`: where she plays, the collection book's first page. */
export function BackpackPanel({ data, region }: { data: Pick<PlayerData, 'character'>; region?: string }) {
  const [inventory, setInventory] = useState<InventoryResponse['items'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('all');
  const [chosen, setChosen] = useState<string | null>(null);
  const [bookOpen, setBookOpen] = useState(false);
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
    <>
      <button type="button" className={buttonClass('secondary', { small: true })} data-id="backpack-collection" onClick={() => setBookOpen(true)}>
        <Icon name="books" size={28} />
        <T k="collection.title" />
      </button>
      {bookOpen ? <CollectionBook character={data.character} startAt={region} onClose={() => setBookOpen(false)} /> : null}
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
    </>
  );
}
