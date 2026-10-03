// NEW SCREEN (owner's mock, panels 11 and 12: "Tùy biến nội thất", "Tùy biến ngoại thất"): decorating the
// child's home. Two tabs, inside and outside; a row of the pieces she may restyle (bed, desk, chairs,
// wardrobe, ornaments, rug, curtains, lamps; the house's colours, fence, gate, garden lights, flowers, path,
// name board, flag); each piece's styles as cards with their colours. "Lưu" keeps her picks on the server for
// this child, and the house is shown in them. Opened from the decorating notebook in the living room.
import type { DecorSide, DecorSlot } from '@miu/schema/home-decor';
import { useEffect, useState, type CSSProperties } from 'react';
import { errorMessage } from '../api-client';
import { Icon } from '../kit/art';
import { buttonClass } from '../kit/button';
import { Modal } from '../kit/modal';
import { Tabs } from '../kit/tabs';
import { DECOR_CATALOG, SIDE_LABELS, changedPicks } from './decor-catalog';
import { loadHomeDecor, saveHomeDecor } from './home-decor-api';
import './home-decor.css';

/** A style's colours as bands across its round chip. */
function swatchStyle(colours: readonly string[]): CSSProperties {
  if (colours.length === 1) return { background: colours[0] };
  const step = 100 / colours.length;
  return { background: `linear-gradient(135deg, ${colours.map((c, i) => `${c} ${i * step}% ${(i + 1) * step}%`).join(', ')})` };
}

function SlotPicker({ slot, picked, onPick }: { slot: DecorSlot; picked: string; onPick: (option: string) => void }) {
  return (
    <div className="decor-options" role="group" aria-label={`Kiểu ${slot.name.toLocaleLowerCase('vi')}`} data-id={`decor-options-${slot.id}`}>
      {slot.options.map((option) => {
        const on = option.id === picked;
        return (
          <button key={option.id} type="button" className="decor-card" aria-pressed={on} data-id={`decor-option-${option.id}`} onClick={() => onPick(option.id)}>
            <span className="decor-swatch" style={swatchStyle(option.swatch)} aria-hidden="true" />
            <span className="decor-card-name">{option.name}</span>
            {option.id === slot.default ? <span className="decor-card-own">Kiểu có sẵn</span> : null}
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
      setSaveError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const slots = DECOR_CATALOG.slots.filter((s) => s.side === side);
  const slot = slots.find((s) => s.id === slotId[side]) ?? slots[0];
  const dirty = saved !== null && Object.keys(changedPicks(saved, draft)).length > 0;

  return (
    <Modal title="Trang trí nhà" onClose={onClose} dataId="decor" variant="scene" size="wide" className="decor-modal">
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
              Thử lại
            </button>
          </div>
        ) : (
          <p className="scene-panel decor-message" data-id="decor-loading">
            Đang mở…
          </p>
        )
      ) : (
        <section className="decor-board parchment" data-id="decor-board">
          <Tabs label="Trang trí" items={(['inside', 'outside'] as const).map((key) => ({ key, label: SIDE_LABELS[key] }))} active={side} onChange={setSide} dataId="decor-side">
            <div className="decor-slots" role="group" aria-label={`Đồ ${SIDE_LABELS[side].toLocaleLowerCase('vi')}`}>
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
            {slot ? <SlotPicker slot={slot} picked={draft[slot.id] ?? slot.default} onPick={(option) => setDraft((now) => ({ ...now, [slot.id]: option }))} /> : null}
          </Tabs>
          <p className="decor-hint">Chọn kiểu bé thích rồi bấm “Lưu” để xem nhà mới nhé!</p>
        </section>
      )}
      {saveError ? (
        <p role="alert" className="error">
          {saveError}
        </p>
      ) : null}
      <div className="scene-bar">
        <button type="button" className={buttonClass('ghost')} data-id="decor-cancel" disabled={saving} onClick={onClose}>
          Hủy
        </button>
        <button type="button" className={buttonClass('primary')} data-id="decor-save" disabled={saving || saved === null} onClick={() => void save()}>
          {saving ? 'Đang lưu…' : dirty ? 'Lưu' : 'Xong'}
        </button>
      </div>
      <button type="button" className="scene-close" data-id="decor-close" aria-label="Đóng trang trí nhà" onClick={onClose}>
        ✕
      </button>
    </Modal>
  );
}
