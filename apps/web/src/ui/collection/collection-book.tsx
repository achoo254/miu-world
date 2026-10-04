// NEW SCREEN (Sổ sưu tập, plan life-expansion L1): the child's collection book over Home or the paused game,
// opened from the Backpack and from Home. A tab per region; each page shows the region's set as ten slots (the
// thing's picture, name and count once found, a silhouette until then), the page's progress bar, and the set's
// reward with "Nhận thưởng" once the set is complete, which opens a "Chúc mừng!" card like the region chest's.
// Tapping a slot shows the thing's description. What she owns and what a set pays are the server's.
import { useState, type CSSProperties } from 'react';
import type { CollectionClaimResponse, CollectionSetDto } from '@miu/schema/collectible';
import type { CharacterDto } from '@miu/schema/game';
import { mapBoth, same } from '../i18n/i18n';
import { Bi, T, useT } from '../i18n/use-t';
import { Icon } from '../kit/art';
import { buttonClass } from '../kit/button';
import { Modal } from '../kit/modal';
import { ProgressBar } from '../kit/progress-bar';
import { Tabs } from '../kit/tabs';
import { itemIcon } from '../backpack/items';
import { say } from '../player/player-data';
import { Chest } from '../region/region-reward-panel';
import { playCue } from '../sound/sfx';
import { BOOK_SETS, RARITY_KEYS, claimCollection, itemName, useCollection, type BookSet, type BookSlot } from './collection-catalog';
// The backpack's tile grid (item-grid-backpack, bag-tile) and the reward card's body.
import '../rewards/rewards.css';
import './collection.css';

const EMPTY_SET = (set: BookSet): CollectionSetDto => ({ mapId: set.mapId, owned: {}, found: 0, total: set.slots.length, complete: false, claimed: false, reward: { coins: 0, title: set.title.vi } });

function Slot({ slot, count, chosen, onChoose, character }: { slot: BookSlot; count: number; chosen: boolean; onChoose: () => void; character: CharacterDto }) {
  const { t } = useT();
  const name = mapBoth(itemName(slot.item, slot.id), (text) => say(text, character));
  const owned = count > 0;
  return (
    <li>
      <button
        type="button"
        className={`bag-tile book-slot book-slot--${slot.rarity}${owned ? '' : ' book-slot--missing'}`}
        aria-pressed={chosen}
        aria-label={owned ? undefined : t('collection.missing')}
        data-id={`book-item-${slot.id}`}
        data-owned={owned}
        onClick={onChoose}
      >
        <span className="book-slot-art">
          <Icon name={itemIcon(slot.item)} size={48} />
        </span>
        {owned ? <Bi {...name} /> : <span aria-hidden="true">???</span>}
        {owned ? <span className="bag-qty">×{count}</span> : null}
      </button>
    </li>
  );
}

function SlotDetail({ slot, count, set, character }: { slot: BookSlot; count: number; set: BookSet; character: CharacterDto }) {
  const fill = (text: string) => say(text, character);
  if (count === 0) {
    return (
      <div className="bag-detail book-detail" data-id="book-detail" data-owned="false">
        <strong>
          <T k="collection.missing" />
        </strong>
        <p className="hint">
          <T k="collection.missingHint" params={{ map: same(set.region) }} />
        </p>
      </div>
    );
  }
  return (
    <div className="bag-detail book-detail" data-id="book-detail" data-owned="true">
      <span className="book-detail-art">
        <Icon name={itemIcon(slot.item)} size={72} />
      </span>
      <div className="book-detail-text">
        <strong>
          <Bi {...mapBoth(itemName(slot.item, slot.id), fill)} />
        </strong>
        <span className={`badge book-rarity book-rarity--${slot.rarity}`}>
          <T k={RARITY_KEYS[slot.rarity]} />
        </span>
        {slot.item ? <p>{fill(slot.item.description)}</p> : null}
        <p className="hint book-lore">{fill(slot.lore)}</p>
        <p className="hint">
          <T k="collection.count" params={{ count }} />
        </p>
      </div>
    </div>
  );
}

/** "Chúc mừng!": the set's chest opens, its coins and title come out one by one. */
function ClaimCard({ claim, set, name, onClose }: { claim: CollectionClaimResponse; set: BookSet; name: string; onClose: () => void }) {
  const rows = [
    { id: 'coin', content: <><Icon name="coin" size={36} /><T k="reward.coinsUp" params={{ coin: claim.coins }} /></> },
    {
      id: 'title',
      className: 'region-claim-title',
      content: (
        <>
          <Icon name="star" size={36} />
          <span>
            <T k="reward.newTitle" />
            <strong>
              <Bi {...set.title} />
            </strong>
          </span>
        </>
      ),
    },
  ];
  return (
    <Modal title={<T k="reward.congrats" />} onClose={onClose} dataId="book-claim-card" variant="scene">
      <div className="reward-body region-claim">
        <Chest open size="9rem" />
        <p className="region-claim-lead">
          <T k="collection.celebrate" params={{ name, set: set.name }} />
        </p>
        <ul className="region-claim-list">
          {rows.map((row, i) => (
            <li key={row.id} className={`region-claim-reveal${row.className ? ` ${row.className}` : ''}`} style={{ '--reveal': i } as CSSProperties} data-id={`book-claim-${row.id}`}>
              {row.content}
            </li>
          ))}
        </ul>
      </div>
      <div className="modal-actions">
        <button type="button" className={buttonClass('primary', { block: true })} data-id="book-claim-close" onClick={onClose}>
          <T k="reward.great" />
        </button>
      </div>
    </Modal>
  );
}

/**
 * The collection book. `startAt`: the region whose page opens first (Home: the first region; the game: where she
 * plays). `onCoins`: her coins after a set reward (badges that show them).
 */
export function CollectionBook({ character, startAt, onClose, onCoins }: { character: CharacterDto; startAt?: string; onClose: () => void; onCoins?: (coins: number) => void }) {
  const { collection, failed, set: setCollection, reload } = useCollection();
  const [tab, setTab] = useState(BOOK_SETS.find((s) => s.mapId === startAt)?.mapId ?? BOOK_SETS[0]?.mapId ?? '');
  const [chosen, setChosen] = useState<string | null>(null);
  const [claim, setClaim] = useState<CollectionClaimResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [claimFailed, setClaimFailed] = useState(false);
  const { t } = useT();
  const page = BOOK_SETS.find((s) => s.mapId === tab);
  const stateOf = (book: BookSet): CollectionSetDto => collection?.sets.find((s) => s.mapId === book.mapId) ?? EMPTY_SET(book);
  const state = page ? stateOf(page) : null;
  const slot = page?.slots.find((s) => s.id === chosen);
  const claimedSet = claim?.granted ? BOOK_SETS.find((s) => s.mapId === claim.set.mapId) : undefined;

  function choose(mapId: string): void {
    setTab(mapId);
    setChosen(null);
    setClaimFailed(false);
  }

  async function take(book: BookSet): Promise<void> {
    setBusy(true);
    setClaimFailed(false);
    try {
      const result = await claimCollection(book.mapId);
      if (collection) setCollection({ ...collection, sets: collection.sets.map((s) => (s.mapId === book.mapId ? result.set : s)) });
      onCoins?.(result.progress.coins);
      setClaim(result);
      if (result.granted) playCue('complete');
    } catch {
      setClaimFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Modal title={<T k="collection.title" />} onClose={onClose} dataId="collection-book" size="wide" className="collection-book">
        {failed ? (
          <p role="alert" className="error">
            <T k="collection.loadFailed" />{' '}
            <button type="button" className={buttonClass('ghost', { small: true })} onClick={reload}>
              <T k="common.retry" />
            </button>
          </p>
        ) : null}
        {!collection && !failed ? (
          <p role="status">
            <T k="common.loading" />
          </p>
        ) : null}
        {collection && page && state ? (
          <Tabs
            label={t('collection.maps')}
            items={BOOK_SETS.map((book) => {
              const s = stateOf(book);
              return {
                key: book.mapId,
                label: (
                  <span className="book-tab">
                    {book.region}
                    <span className={`book-tab-count${s.complete ? ' book-tab-count--full' : ''}`}>
                      {s.found}/{s.total}
                    </span>
                  </span>
                ),
              };
            })}
            active={tab}
            onChange={choose}
            dataId="book-tab"
          >
            <div className="book-page" data-id={`book-page-${page.mapId}`}>
              <header className="book-head">
                <strong className="book-set-name">
                  <Bi {...page.name} />
                </strong>
                <p className="hint">{say(page.description, character)}</p>
                <div className="book-progress">
                  <ProgressBar done={state.found} total={state.total} label={t('collection.progressLabel', { found: state.found, total: state.total })} />
                  <span data-id="book-progress">
                    <T k="collection.progress" params={{ found: state.found, total: state.total }} />
                  </span>
                </div>
              </header>
              <ul className="item-grid-backpack book-grid" data-id="book-grid">
                {page.slots.map((s) => (
                  <Slot key={s.id} slot={s} count={state.owned[s.id] ?? 0} chosen={chosen === s.id} onChoose={() => setChosen(s.id)} character={character} />
                ))}
              </ul>
              {slot ? <SlotDetail slot={slot} count={state.owned[slot.id] ?? 0} set={page} character={character} /> : null}
              <div className={`book-reward${state.complete && !state.claimed ? ' book-reward--ready' : ''}`} data-id="book-reward" data-state={state.claimed ? 'claimed' : state.complete ? 'ready' : 'locked'}>
                <Chest open={state.claimed} size="3.5rem" />
                <div className="book-reward-text">
                  <strong>
                    <T k="collection.reward" />
                  </strong>
                  <span className="region-tier-gives">
                    <Icon name="coin" size={20} />
                    {state.reward.coins}
                    <Icon name="star" size={20} />
                    <Bi {...page.title} />
                  </span>
                  {!state.complete ? (
                    <span className="hint">
                      <T k="collection.toGo" params={{ missing: state.total - state.found }} />
                    </span>
                  ) : null}
                </div>
                {state.claimed ? (
                  <span className="region-tier-done">
                    <Icon name="checkMark" size={28} />
                    <T k="reward.claimed" />
                  </span>
                ) : state.complete ? (
                  <button type="button" className={buttonClass('primary', { small: true })} data-id="book-claim" disabled={busy} onClick={() => void take(page)}>
                    <T k="reward.claim" />
                  </button>
                ) : (
                  <Icon name="locked" size={28} label={t('reward.locked')} />
                )}
              </div>
              {claimFailed ? (
                <p role="alert" className="error" data-id="book-claim-error">
                  <T k="collection.claimFailed" />
                </p>
              ) : null}
            </div>
          </Tabs>
        ) : null}
        <button type="button" className="scene-close" data-id="collection-book-close" aria-label={t('common.close')} onClick={onClose}>
          ✕
        </button>
      </Modal>
      {claimedSet && claim ? <ClaimCard claim={claim} set={claimedSet} name={character.name} onClose={() => setClaim(null)} /> : null}
    </>
  );
}
