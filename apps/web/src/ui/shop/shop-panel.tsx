// Owner's mock "Cửa hàng" (designs/Journey-Achievements-Shop.png, panels 7–9; the counter in Trung tâm,
// designs/trung-tam/d-02-cua-hang.png): the child's shop over the paused game or Home. A banner with her coins,
// the tabs Nổi bật · Trang phục · Phụ kiện · Nhà cửa · Tiêu hao · Gói đặc biệt, a grid of things with their
// pictures and prices, and a thing's close-up: worn on her own character in 3D (a wearable), its colours (a
// home style) or its picture (a booster, a bundle), its price and "Mua ngay", and more of the same kind under
// it. Too few coins: a kind line saying how to earn more. Prices, coins and what she owns are the server's.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { fillPlayerName } from '@miu/quest/player-name';
import { CharacterDto, CharacterUpdate } from '@miu/schema/game';
import { accessoryArtPath } from '@miu/schema/accessory-art';
import { SHOP_CATEGORIES, keptForever, type ShopCategory, type ShopItemDto, type ShopResponse, type ShopState } from '@miu/schema/shop';
import { createGameStore } from '../../game-bridge/game-store';
import { GameStoreContext } from '../../game-bridge/use-game-state';
import { ApiError, api, errorMessage } from '../api-client';
import { OPEN_SLOTS, equip, type OpenSlot } from '../creator/creator-outfit';
import { PreviewStage } from '../creator/creator-screen';
import { DECOR_CATALOG } from '../home-decor/decor-catalog';
import { mapBoth, pairOf, same, type Bilingual, type Params, type TextKey } from '../i18n/i18n';
import { Bi, T, useT } from '../i18n/use-t';
import { Icon, MiuPortrait } from '../kit/art';
import { buttonClass } from '../kit/button';
import { Modal } from '../kit/modal';
import { Tabs } from '../kit/tabs';
import { REGION_BACKDROPS, assetUrl, type UiIcon } from '../kit/ui-art';
import { playCue } from '../sound/sfx';
import { buyItem, loadShop, requestId, shopErrorMessage } from './shop-api';
import { ShopPicture } from './shop-picture';
import { Say, twin } from '../quest/content-text';
import './shop.css';

/** The shopkeeper at the first counter of the shop in Trung tâm (tools/world/generate-trung-tam-map.ts). */
export const SHOP_TARGET = 'tt-quay-cua-hang';

type Tab = 'noi-bat' | ShopCategory;

const TAB_LABELS: Readonly<Record<Tab, TextKey>> = {
  'noi-bat': 'shop.tab.featured',
  'trang-phuc': 'shop.tab.clothes',
  'phu-kien': 'shop.tab.accessories',
  'nha-cua': 'shop.tab.home',
  'tieu-hao': 'shop.tab.consumables',
  'goi-dac-biet': 'shop.tab.bundles',
};
/** Each tab's picture: an icon, or (Trang phục) a shirt from the wardrobe's own pictures. */
const TAB_ICONS: Readonly<Record<Tab, UiIcon | { art: string }>> = {
  'noi-bat': 'glowingStar',
  'trang-phuc': { art: accessoryArtPath('clothes-tshirt') },
  'phu-kien': 'backpack',
  'nha-cua': 'house',
  'tieu-hao': 'heart',
  'goi-dac-biet': 'gift',
};
const TABS: readonly Tab[] = ['noi-bat', ...SHOP_CATEGORIES];
/** A slot's name: the wardrobe's (translated), or a home style's from the catalogue (its own words). */
const SLOT_LABELS: ReadonlyMap<string, Bilingual> = new Map<string, Bilingual>([
  ...OPEN_SLOTS.map((s) => [s.slot, pairOf(s.label)] as const),
  ...DECOR_CATALOG.slots.map((s) => [s.id, { vi: s.name, en: s.name }] as const),
]);
/** About what one quest pays, for the "how to earn more" line. */
const COINS_PER_QUEST = 20;

function Price({ value, short }: { value: number; short?: boolean }) {
  return (
    <span className={`shop-price${short ? ' shop-price--short' : ''}`}>
      <Icon name="coin" size={24} />
      {value}
    </span>
  );
}

/** What a card says under its name: owned, how many boosters, the level it needs, or its price. */
function CardStatus({ item, state }: { item: ShopItemDto; state: ShopState }) {
  const have = state.owned[item.id] ?? 0;
  if (keptForever(item.kind) && have > 0) {
    return (
      <span className="shop-owned" data-id={`shop-owned-${item.id}`}>
        <Icon name="checkMark" size={22} /> <T k="shop.owned" />
      </span>
    );
  }
  return (
    <>
      {have > 0 ? (
        <span className="shop-count">
          <T k="shop.have" params={{ count: have }} />
        </span>
      ) : null}
      {item.level !== null && state.level < item.level ? (
        <span className="shop-lock">
          <T k="creator.needLevel" params={{ level: item.level }} />
        </span>
      ) : (
        <Price value={item.price} short={state.coins < item.price} />
      )}
    </>
  );
}

function ItemCard({ item, state, onOpen }: { item: ShopItemDto; state: ShopState; onOpen: () => void }) {
  return (
    <li>
      <button type="button" className="shop-card" data-id={`shop-item-${item.id}`} onClick={onOpen}>
        <span className="shop-card-art">
          <ShopPicture item={item} />
        </span>
        <span className="shop-card-name">
          <Bi {...twin(item.name, item.nameEn)} />
        </span>
        <CardStatus item={item} state={state} />
      </button>
    </li>
  );
}

type Notice = { kind: 'ok' | 'short' | 'error'; text: Bilingual } | null;

interface DetailProps {
  item: ShopItemDto;
  items: readonly ShopItemDto[];
  state: ShopState;
  character: CharacterDto | null;
  busy: boolean;
  notice: Notice;
  fill: (text: string) => string;
  onBuy: () => void;
  onWear: (() => void) | null;
  onPick: (id: string) => void;
  onBack: () => void;
}

/** The close-up of one thing (mock panel 9). */
function ItemDetail({ item, items, state, character, busy, notice, fill, onBuy, onWear, onPick, onBack }: DetailProps) {
  const [store] = useState(createGameStore);
  const { t } = useT();
  const owned = keptForever(item.kind) && (state.owned[item.id] ?? 0) > 0;
  const levelLocked = item.level !== null && state.level < item.level;
  const slot = item.slot as OpenSlot | null;
  const wearing = character && item.kind === 'wearable' && slot ? equip(character.equipped, slot, item.id) : null;
  // The preview changes clothes in place as she looks at the next thing (no second 3D view).
  useEffect(() => {
    if (wearing) store.send({ type: 'set-outfit', equipped: wearing });
  }, [store, wearing?.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps -- the outfit's ids, not the array, decide
  const same = items.filter((other) => other.id !== item.id && other.kind === item.kind && other.slot === item.slot && (item.kind === 'wearable' || item.kind === 'decor' || other.category === item.category));
  const contains = item.contains ? Object.entries(item.contains).map(([id, qty]) => ({ part: items.find((i) => i.id === id), qty })) : [];
  return (
    <div className="shop-detail" data-id="shop-detail" data-item={item.id}>
      <div className="shop-detail-stage">
        {wearing && character ? (
          <GameStoreContext.Provider value={store}>
            <PreviewStage store={store} species={character.species} initialOutfit={wearing} initialPet={character.pet} emotes={false} />
          </GameStoreContext.Provider>
        ) : (
          <div className="shop-detail-art">
            <ShopPicture item={item} size={160} />
          </div>
        )}
      </div>
      <section className="shop-detail-card parchment" aria-labelledby="shop-detail-name">
        <h3 id="shop-detail-name">
          <Bi {...twin(item.name, item.nameEn)} />
        </h3>
        {item.description ? (
          <p>
            <Say text={twin(item.description, item.descriptionEn)} fill={fill} />
          </p>
        ) : null}
        <p className="shop-tags">
          <span className="scene-chip">
            <T k={TAB_LABELS[item.category]} />
          </span>
          {slot && SLOT_LABELS.has(slot) ? (
            <span className="scene-chip">
              <Bi {...(SLOT_LABELS.get(slot) ?? { vi: slot, en: slot })} />
            </span>
          ) : null}
          {item.effect ? (
            <span className="scene-chip">
              <T k="shop.oneRound" />
            </span>
          ) : null}
        </p>
        {contains.length > 0 ? (
          <ul className="shop-contains" aria-label={t('shop.contains')}>
            {contains.map(({ part, qty }) =>
              part ? (
                <li key={part.id}>
                  <ShopPicture item={part} size={40} />
                  {part.name}
                  {qty > 1 ? ` × ${qty}` : ''}
                </li>
              ) : null,
            )}
          </ul>
        ) : null}
        <p className="shop-detail-price">
          <Price value={item.price} short={state.coins < item.price} />
          {(state.owned[item.id] ?? 0) > 0 && !owned ? (
            <span className="shop-count">
              <T k="shop.youHave" params={{ count: state.owned[item.id] ?? 0 }} />
            </span>
          ) : null}
        </p>
        {owned ? (
          <p className="shop-owned shop-owned--big" data-id="shop-detail-owned">
            <Icon name="checkMark" size={28} /> <T k="shop.ownedBig" />
          </p>
        ) : (
          <button type="button" className={buttonClass('primary', { block: true })} data-id="shop-buy" disabled={busy || levelLocked} onClick={onBuy}>
            {busy ? <T k="shop.buying" /> : levelLocked ? <T k="creator.needLevel" params={{ level: item.level ?? 0 }} /> : <T k="shop.buy" />}
          </button>
        )}
        {onWear ? (
          <button type="button" className={buttonClass('secondary', { block: true })} data-id="shop-wear" disabled={busy} onClick={onWear}>
            <T k="shop.wear" />
          </button>
        ) : null}
        {notice ? (
          <p className={`shop-notice shop-notice--${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'} data-id="shop-notice">
            <Bi {...notice.text} />
          </p>
        ) : null}
        <button type="button" className={buttonClass('ghost', { small: true })} data-id="shop-back" onClick={onBack}>
          <T k="shop.back" />
        </button>
      </section>
      {same.length > 0 ? (
        <ul className="shop-same" aria-label={t('shop.same')}>
          {same.slice(0, 8).map((other) => (
            <li key={other.id}>
              <button type="button" className="shop-same-tile" aria-label={other.name} data-id={`shop-same-${other.id}`} onClick={() => onPick(other.id)}>
                <ShopPicture item={other} size={56} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export interface ShopPanelProps {
  onClose: () => void;
  /** Her coins after a purchase (the HUD shows them). */
  onCoins?: (coins: number) => void;
  /** A wearable just put on from the shop: her outfit as saved. */
  onWear?: (equipped: string[]) => void;
}

export function ShopPanel({ onClose, onCoins, onWear }: ShopPanelProps) {
  const [shop, setShop] = useState<ShopResponse | null>(null);
  const [character, setCharacter] = useState<CharacterDto | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loads, setLoads] = useState(0);
  const [tab, setTab] = useState<Tab>('noi-bat');
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  /** The purchase id of the tap in flight, kept for a retry of the same thing so it is never bought twice. */
  const pending = useRef<{ itemId: string; id: string } | null>(null);
  /** The wearable just bought, offered to put on at once. */
  const [justBought, setJustBought] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    Promise.all([loadShop(), api('GET', '/character', CharacterDto)]).then(
      ([s, c]) => {
        if (!live) return;
        setShop(s);
        setCharacter(c);
      },
      (err: unknown) => live && setLoadError(errorMessage(err)),
    );
    return () => {
      live = false;
    };
  }, [loads]);

  const name = character?.name ?? '';
  const fill = (text: string): string => fillPlayerName(text, name);
  const say = (key: TextKey, params?: Params): Bilingual => mapBoth(pairOf(key, params), fill);
  const { t } = useT();
  const item = shop?.items.find((i) => i.id === picked) ?? null;

  function open(id: string): void {
    setPicked(id);
    setNotice(null);
    setJustBought(null);
  }

  async function buy(): Promise<void> {
    if (!shop || !item) return;
    if (shop.coins < item.price) {
      const missing = item.price - shop.coins;
      setNotice({ kind: 'short', text: say('shop.short', { missing, perQuest: COINS_PER_QUEST, quests: Math.ceil(missing / COINS_PER_QUEST) }) });
      return;
    }
    if (pending.current?.itemId !== item.id) pending.current = { itemId: item.id, id: requestId() };
    setBusy(true);
    setNotice(null);
    try {
      const state = await buyItem(item.id, pending.current.id);
      pending.current = null;
      setShop((now) => (now ? { ...now, coins: state.coins, level: state.level, owned: state.owned } : now));
      onCoins?.(state.coins);
      playCue('complete');
      setNotice({ kind: 'ok', text: say(item.kind === 'booster' || item.kind === 'bundle' ? 'shop.boughtBooster' : item.kind === 'decor' ? 'shop.boughtDecor' : 'shop.bought') });
      if (item.kind === 'wearable') setJustBought(item.id);
    } catch (err) {
      // A refusal is final (a new tap is a new purchase); a lost answer keeps the id so a retry buys once.
      if (!(err instanceof ApiError && err.status === 0)) pending.current = null;
      setNotice({ kind: err instanceof ApiError && err.code === 'not-enough-coins' ? 'short' : 'error', text: same(shopErrorMessage(err)) });
    } finally {
      setBusy(false);
    }
  }

  async function wear(): Promise<void> {
    if (!character || !item?.slot) return;
    setBusy(true);
    try {
      const equipped = equip(character.equipped, item.slot as OpenSlot, item.id);
      const saved = await api('PUT', '/character', CharacterDto, CharacterUpdate.parse({ name: character.name, equipped }));
      setCharacter(saved);
      onWear?.(saved.equipped);
      setJustBought(null);
      setNotice({ kind: 'ok', text: say('shop.wearing') });
    } catch (err) {
      setNotice({ kind: 'error', text: same(errorMessage(err)) });
    } finally {
      setBusy(false);
    }
  }

  let body: ReactNode;
  if (!shop) {
    body = loadError ? (
      <div className="scene-panel shop-message">
        <p role="alert" className="error">
          {loadError}
        </p>
        <button
          type="button"
          className={buttonClass('secondary')}
          data-id="shop-retry"
          onClick={() => {
            setLoadError(null);
            setLoads((n) => n + 1);
          }}
        >
          <T k="common.retry" />
        </button>
      </div>
    ) : (
      <p className="scene-panel shop-message" data-id="shop-loading">
        <T k="shop.opening" />
      </p>
    );
  } else if (item) {
    body = (
      <ItemDetail
        item={item}
        items={shop.items}
        state={shop}
        character={character}
        busy={busy}
        notice={notice}
        fill={fill}
        onBuy={() => void buy()}
        onWear={justBought === item.id && character ? () => void wear() : null}
        onPick={open}
        onBack={() => setPicked(null)}
      />
    );
  } else {
    const shown = tab === 'noi-bat' ? shop.items.filter((i) => i.featured) : shop.items.filter((i) => i.category === tab);
    body = (
      <Tabs
        label={t('shop.categories')}
        items={TABS.map((key) => {
          const icon = TAB_ICONS[key];
          return {
            key,
            label: (
              <span className="shop-tab">
                {typeof icon === 'string' ? <Icon name={icon} size={30} /> : <img src={assetUrl(icon.art)} alt="" width={30} height={30} draggable={false} />}
                <T k={TAB_LABELS[key]} />
              </span>
            ),
          };
        })}
        active={tab}
        onChange={setTab}
        dataId="shop-tab"
      >
        <ul className="shop-grid" data-id="shop-grid">
          {shown.map((i) => (
            <ItemCard key={i.id} item={i} state={shop} onOpen={() => open(i.id)} />
          ))}
        </ul>
      </Tabs>
    );
  }

  const backdrop = REGION_BACKDROPS['trung-tam'];
  return (
    <Modal title={<T k="common.shop" />} onClose={onClose} dataId="shop" variant="scene" size="wide" className="shop-modal">
      <header className="shop-hero" style={backdrop ? { backgroundImage: `url(${assetUrl(backdrop)})` } : undefined}>
        <span className="shop-hero-portrait">
          <MiuPortrait pose="wave" size="4.5rem" species={character?.species} />
        </span>
        <span className="shop-hero-text">
          <strong>{character ? <T k="shop.titleOf" params={{ name }} /> : <T k="common.shop" />}</strong>
          <span>
            <T k="shop.tagline" />
          </span>
        </span>
        <span className="shop-coins" data-id="shop-coins" aria-label={t('shop.coinsLabel')}>
          <Icon name="coin" size={32} />
          {shop?.coins ?? '…'}
        </span>
      </header>
      <section className="shop-board parchment">{body}</section>
      <button type="button" className="scene-close" data-id="shop-close" aria-label={t('shop.close')} onClick={onClose}>
        ✕
      </button>
    </Modal>
  );
}
