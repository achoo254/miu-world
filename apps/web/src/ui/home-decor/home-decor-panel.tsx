// NEW SCREEN (owner's mock, panels 11 and 12: "Tùy biến nội thất", "Tùy biến ngoại thất"): decorating the
// child's home. Two tabs, inside and outside; a row of the pieces she may restyle (bed, desk, chairs,
// wardrobe, ornaments, rug, curtains, lamps; the house's colours, fence, gate, garden lights, flowers, path,
// name board, flag); each piece's styles as cards with their colours. "Lưu" keeps her picks on the server for
// this child, and the house is shown in them. The fancier styles are sold in the shop: until bought they show
// locked with their price. Opened from the decorating notebook in the living room.
import type { DecorSide, DecorSlot } from '@miu/schema/home-decor';
import { useEffect, useState } from 'react';
import { errorMessage } from '../api-client';
import { mapBoth, pairOf, type Bilingual } from '../i18n/i18n';
import { Bi, T, useT } from '../i18n/use-t';
import { Icon } from '../kit/art';
import { buttonClass } from '../kit/button';
import { Modal } from '../kit/modal';
import { Tabs } from '../kit/tabs';
import { loadShop, shopErrorMessage } from '../shop/shop-api';
import { DECOR_CATALOG, SIDE_LABELS, changedPicks, swatchStyle } from './decor-catalog';
import { loadHomeDecor, saveHomeDecor } from './home-decor-api';
import './home-decor.css';

/**
 * `priceOf`: the shop's price of a style she cannot pick yet (sold and not bought), or null when she can. A locked
 * style shows its price and a lock; tapping it says where to get it.
 */
function SlotPicker({ slot, picked, priceOf, onPick, onLocked }: { slot: DecorSlot; picked: string; priceOf: (option: string) => number | null; onPick: (option: string) => void; onLocked: (price: number) => void }) {
  const { t } = useT();
  return (
    <div className="decor-options" role="group" aria-label={t('decor.styleOf', { slot: slot.name.toLocaleLowerCase('vi') })} data-id={`decor-options-${slot.id}`}>
      {slot.options.map((option) => {
        const on = option.id === picked;
        const price = priceOf(option.id);
        return (
          <button
            key={option.id}
            type="button"
            className={`decor-card${price === null ? '' : ' decor-card--locked'}`}
            aria-pressed={on}
            data-id={`decor-option-${option.id}`}
            onClick={() => (price === null ? onPick(option.id) : onLocked(price))}
          >
            <span className="decor-swatch" style={swatchStyle(option.swatch)} aria-hidden="true" />
            <span className="decor-card-name">{option.name}</span>
            {option.id === slot.default ? (
              <span className="decor-card-own">
                <T k="decor.default" />
              </span>
            ) : null}
            {price === null ? null : (
              <span className="decor-card-price" data-id={`decor-price-${option.id}`}>
                <Icon name="locked" size={20} />
                <Icon name="coin" size={20} />
                {price}
              </span>
            )}
            {on ? (
              <span className="decor-card-tick">
                <Icon name="checkMark" size={32} />
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function HomeDecorPanel({ onClose, onSaved }: { onClose: () => void; /** The picks as stored, after "Lưu" changed any. */ onSaved: (choices: Record<string, string>) => void }) {
  const [saved, setSaved] = useState<Record<string, string> | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loads, setLoads] = useState(0);
  const [side, setSide] = useState<DecorSide>('inside');
  const [slotId, setSlotId] = useState<Record<DecorSide, string>>(() => ({
    inside: DECOR_CATALOG.slots.find((s) => s.side === 'inside')?.id ?? '',
    outside: DECOR_CATALOG.slots.find((s) => s.side === 'outside')?.id ?? '',
  }));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  /** The shop's styles: price of each, and those she owns (unknown until the shop answers: none locked). */
  const [shop, setShop] = useState<{ prices: ReadonlyMap<string, number>; owned: ReadonlySet<string> } | null>(null);
  const [lockNote, setLockNote] = useState<Bilingual | null>(null);
  const { t } = useT();

  useEffect(() => {
    let live = true;
    loadShop().then(
      (s) => live && setShop({ prices: new Map(s.items.filter((i) => i.kind === 'decor').map((i) => [i.id, i.price])), owned: new Set(Object.keys(s.owned)) }),
      // Without the shop's answer nothing shows locked; the server still refuses a style she does not own.
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    let live = true;
    loadHomeDecor().then(
      (d) => {
        if (!live) return;
        setSaved(d.choices);
        setDraft(d.choices);
      },
      (err: unknown) => live && setLoadError(errorMessage(err)),
    );
    return () => {
      live = false;
    };
  }, [loads]);

  async function save(): Promise<void> {
    if (!saved) return;
    const changes = changedPicks(saved, draft);
    if (Object.keys(changes).length === 0) {
      onClose();
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const stored = await saveHomeDecor(changes);
      onSaved(stored.choices);
      onClose();
    } catch (err) {
      setSaveError(shopErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const slots = DECOR_CATALOG.slots.filter((s) => s.side === side);
  const slot = slots.find((s) => s.id === slotId[side]) ?? slots[0];
  const dirty = saved !== null && Object.keys(changedPicks(saved, draft)).length > 0;
  /** A style is hers to pick unless the shop sells it and she has neither bought it nor already got it saved. */
  const priceOf = (slotId: string, option: string): number | null => {
    const price = shop?.prices.get(option);
    return price === undefined || shop?.owned.has(option) || saved?.[slotId] === option ? null : price;
  };

  return (
    <Modal title={<T k="decor.title" />} onClose={onClose} dataId="decor" variant="scene" size="wide" className="decor-modal">
      {saved === null ? (
        loadError ? (
          <div className="scene-panel decor-message">
            <p role="alert" className="error">
              {loadError}
            </p>
            <button
              type="button"
              className={buttonClass('secondary')}
              data-id="decor-retry"
              onClick={() => {
                setLoadError(null);
                setLoads((n) => n + 1);
              }}
            >
              <T k="common.retry" />
            </button>
          </div>
        ) : (
          <p className="scene-panel decor-message" data-id="decor-loading">
            <T k="common.opening" />
          </p>
        )
      ) : (
        <section className="decor-board parchment" data-id="decor-board">
          <Tabs label={t('decor.tabs')} items={(['inside', 'outside'] as const).map((key) => ({ key, label: <T k={SIDE_LABELS[key]} /> }))} active={side} onChange={setSide} dataId="decor-side">
            <div className="decor-slots" role="group" aria-label={t('decor.piecesOf', { side: mapBoth(pairOf(SIDE_LABELS[side]), (s) => s.toLocaleLowerCase('vi')) })}>
              {slots.map((s) => {
                const picked = s.options.find((o) => o.id === draft[s.id]) ?? s.options[0];
                return (
                  <button key={s.id} type="button" className="decor-slot" aria-pressed={s.id === slot?.id} data-id={`decor-slot-${s.id}`} onClick={() => setSlotId((now) => ({ ...now, [side]: s.id }))}>
                    {picked ? <span className="decor-swatch" style={swatchStyle(picked.swatch)} aria-hidden="true" /> : null}
                    {s.name}
                  </button>
                );
              })}
            </div>
            {slot ? (
              <SlotPicker
                slot={slot}
                picked={draft[slot.id] ?? slot.default}
                priceOf={(option) => priceOf(slot.id, option)}
                onPick={(option) => {
                  setLockNote(null);
                  setDraft((now) => ({ ...now, [slot.id]: option }));
                }}
                onLocked={(price) => setLockNote(pairOf('decor.locked', { price }))}
              />
            ) : null}
          </Tabs>
          <p className="decor-hint" data-id="decor-hint" aria-live="polite">
            <Bi {...(lockNote ?? pairOf('decor.hint'))} />
          </p>
        </section>
      )}
      {saveError ? (
        <p role="alert" className="error">
          {saveError}
        </p>
      ) : null}
      <div className="scene-bar">
        <button type="button" className={buttonClass('ghost')} data-id="decor-cancel" disabled={saving} onClick={onClose}>
          <T k="common.cancel" />
        </button>
        <button type="button" className={buttonClass('primary')} data-id="decor-save" disabled={saving || saved === null} onClick={() => void save()}>
          <T k={saving ? 'common.saving' : dirty ? 'common.save' : 'common.done'} />
        </button>
      </div>
      <button type="button" className="scene-close" data-id="decor-close" aria-label={t('decor.close')} onClick={onClose}>
        ✕
      </button>
    </Modal>
  );
}
