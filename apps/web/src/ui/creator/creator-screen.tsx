// M1.2 (chọn loài) + M1.3 (trang phục, tên, tính cách, xem trước): the Character Creator. Only the
// cat is open in the MVP; the other species and the Áo/Giày/Cánh slots show "Sắp có". The 3D
// preview is its own light renderer; outfit changes reach it as the bridge command `set-outfit`.
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { fillPlayerName } from '@miu/quest/player-name';
import { CharacterDto, CharacterUpdate, ProgressResponse, QuestListResponse } from '@miu/schema/game';
import characterNames from '../../../../../content/names/character-names.json';
import { createGameStore, type GameStore } from '../../game-bridge/game-store';
import { GameStoreContext, useGameState } from '../../game-bridge/use-game-state';
import { CharacterPreview, EMOTES, type Emote } from '../../game/preview/character-preview';
import { ACCESSORIES } from '../../game/content/accessories';
import { api, errorMessage } from '../api-client';
import { Icon } from '../kit/art';
import { buttonClass } from '../kit/button';
import { SkyScene } from '../kit/sky-scene';
import { isFreshCharacter } from './fresh-character';
import { COMING_SLOTS, OPEN_SLOTS, equip, isOpen, itemsForSlot, lockText, swatchColor, type OpenSlot } from './creator-outfit';
import './creator.css';

const NAMES: readonly string[] = (characterNames as { names: string[] }).names;

const SPECIES = [
  { id: 'cat', name: 'Mèo', trait: 'Tò mò, tốt bụng', open: true },
  { id: 'rabbit', name: 'Thỏ', trait: 'Nhanh nhẹn', open: false },
  { id: 'fox', name: 'Cáo', trait: 'Thông minh', open: false },
  { id: 'bear', name: 'Gấu', trait: 'Mạnh mẽ', open: false },
] as const;

const EMOTE_LABELS: Record<Emote, string> = { wave: 'Vẫy tay', jump: 'Nhảy', yawn: 'Ngáp', cheer: 'Vui mừng' };

/** MVP personality: a fixed label, never stored (validation decision `character_personality_field`). */
const PERSONALITY = 'Nhà thám hiểm';

interface CreatorData {
  character: CharacterDto;
  level: number;
  completed: ReadonlySet<string>;
  questTitles: ReadonlyMap<string, string>;
}

async function loadCreator(): Promise<CreatorData> {
  const [character, progress, quests] = await Promise.all([
    api('GET', '/character', CharacterDto),
    api('GET', '/progress', ProgressResponse),
    api('GET', '/quests', QuestListResponse),
  ]);
  return {
    character,
    level: progress.level,
    completed: new Set(progress.quests.filter((q) => q.completed).map((q) => q.questId)),
    questTitles: new Map(quests.quests.map((q) => [q.quest.id, q.quest.title])),
  };
}

function SpeciesStep({ onPick }: { onPick: () => void }) {
  return (
    <section className="panel creator-species" data-id="creator-species" aria-labelledby="creator-species-title">
      <h1 id="creator-species-title">Chọn nhân vật của bé</h1>
      <ul className="species-grid">
        {SPECIES.map((s) => (
          <li key={s.id}>
            {s.open ? (
              <button type="button" className="species-card" data-id={`creator-species-${s.id}`} onClick={onPick}>
                <Icon name="catFace" size={72} />
                <strong>{s.name}</strong>
                <span className="hint">{s.trait}</span>
              </button>
            ) : (
              <div className="species-card species-card--locked" data-id={`creator-species-${s.id}`} aria-disabled="true">
                <Icon name="locked" size={56} label="Khóa" />
                <strong>{s.name}</strong>
                <span className="badge">Sắp có</span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The 3D stage: mounts one CharacterPreview for the screen's lifetime and exposes its emotes. */
function PreviewStage({ store, initialOutfit }: { store: GameStore; initialOutfit: readonly string[] }) {
  const host = useRef<HTMLDivElement>(null);
  const preview = useRef<CharacterPreview | null>(null);
  const firstOutfit = useRef(initialOutfit);
  const status = useGameState((s) => s.status);
  useEffect(() => {
    if (!host.current) return;
    const instance = new CharacterPreview(host.current, { store, outfit: firstOutfit.current });
    preview.current = instance;
    void instance.start();
    // StrictMode mounts twice in dev: the first preview is fully disposed before the second starts.
    return () => {
      instance.dispose();
      if (preview.current === instance) preview.current = null;
    };
  }, [store]);
  return (
    <div className="creator-stage">
      <div className="creator-stage-view" ref={host} data-id="creator-preview" aria-label="Nhân vật xem trước, kéo để xoay" />
      {status === 'error' ? (
        <p role="alert" className="error">
          Không tải được nhân vật xem trước.
        </p>
      ) : null}
      <div className="emote-row" role="group" aria-label="Xem thử hoạt ảnh">
        {EMOTES.map((emote) => (
          <button
            key={emote}
            type="button"
            className={buttonClass('secondary', { small: true })}
            data-id={`creator-emote-${emote}`}
            disabled={status !== 'ready'}
            onClick={() => preview.current?.playEmote(emote)}
          >
            {EMOTE_LABELS[emote]}
          </button>
        ))}
      </div>
    </div>
  );
}

function OutfitStep({ data, store }: { data: CreatorData; store: GameStore }) {
  const navigate = useNavigate();
  const [equipped, setEquipped] = useState<string[]>(data.character.equipped);
  // "Miu" is the game's name: a fresh character starts without a name and the child picks one.
  const [name, setName] = useState(isFreshCharacter(data.character) ? '' : data.character.name);
  const [slot, setSlot] = useState<OpenSlot>('hat');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const worn = data.character.equipped;
  const questTitle = (id: string): string => fillPlayerName(data.questTitles.get(id) ?? id, name);

  function choose(itemId: string | null) {
    const next = equip(equipped, slot, itemId);
    setEquipped(next);
    store.send({ type: 'set-outfit', equipped: next });
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api('PUT', '/character', CharacterDto, CharacterUpdate.parse({ name, equipped }));
      navigate('/play');
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  const current = equipped.find((id) => ACCESSORIES.get(id)?.slot === slot) ?? null;
  return (
    <div className="creator-layout" data-id="creator-outfit">
      <section className="panel creator-wardrobe" aria-labelledby="creator-wardrobe-title">
        <h2 id="creator-wardrobe-title">Trang phục</h2>
        <div className="slot-tabs" role="tablist" aria-label="Loại trang phục">
          {OPEN_SLOTS.map((s) => (
            <button
              key={s.slot}
              type="button"
              role="tab"
              aria-selected={slot === s.slot}
              className={`slot-tab${slot === s.slot ? ' slot-tab--active' : ''}`}
              data-id={`creator-slot-${s.slot}`}
              onClick={() => setSlot(s.slot)}
            >
              {s.label}
            </button>
          ))}
          {COMING_SLOTS.map((label) => (
            <span key={label} className="slot-tab slot-tab--locked" aria-disabled="true" data-id={`creator-slot-coming-${label}`}>
              {label} <span className="badge">Sắp có</span>
            </span>
          ))}
        </div>
        <ul className="item-grid" role="tabpanel" aria-label="Món đồ">
          <li>
            <button type="button" className="item-tile" aria-pressed={current === null} data-id={`creator-item-none-${slot}`} onClick={() => choose(null)}>
              <span className="item-swatch item-swatch--none" aria-hidden="true" />
              Không đeo
            </button>
          </li>
          {itemsForSlot(slot).map((item) => {
            const open = isOpen(item, data.level, data.completed, worn);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={`item-tile${open ? '' : ' item-tile--locked'}`}
                  aria-pressed={current === item.id}
                  disabled={!open}
                  data-id={`creator-item-${item.id}`}
                  onClick={() => choose(item.id)}
                >
                  <span className="item-swatch" style={{ background: swatchColor(item) }} aria-hidden="true">
                    {open ? null : <Icon name="locked" size={28} />}
                  </span>
                  {item.name}
                  {open ? null : <span className="item-lock">{lockText(item, questTitle)}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <PreviewStage store={store} initialOutfit={data.character.equipped} />

      <section className="panel creator-info" aria-labelledby="creator-info-title">
        <h2 id="creator-info-title">Thông tin</h2>
        <label className="field-label">
          Tên nhân vật
          <select data-id="creator-name" value={name} onChange={(e) => setName(e.target.value)}>
            <option value="" disabled>
              Chọn tên…
            </option>
            {NAMES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <p className="field-label">
          Tính cách
          <span className="badge" data-id="creator-personality">
            {PERSONALITY}
          </span>
        </p>
        {error ? (
          <p role="alert" className="error">
            {error}
          </p>
        ) : null}
        <button type="button" className={buttonClass('primary', { block: true })} data-id="creator-save" disabled={saving || !name} onClick={() => void save()}>
          <Icon name="sparkles" size={32} />
          Vào thế giới
        </button>
      </section>
    </div>
  );
}

export function CreatorScreen() {
  const [store] = useState(createGameStore);
  const [data, setData] = useState<CreatorData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [step, setStep] = useState<'species' | 'outfit'>('species');

  useEffect(() => {
    let live = true;
    loadCreator().then(
      (next) => live && setData(next),
      (err: unknown) => live && setLoadError(errorMessage(err)),
    );
    return () => {
      live = false;
    };
  }, []);

  return (
    <GameStoreContext.Provider value={store}>
      <SkyScene>
        <main className="scene-content creator" data-id="creator">
          {loadError ? (
            <p role="alert" className="error">
              {loadError} <Link to="/profiles">Quay lại</Link>
            </p>
          ) : null}
          {!data && !loadError ? <p role="status">Đang tải…</p> : null}
          {data && step === 'species' ? <SpeciesStep onPick={() => setStep('outfit')} /> : null}
          {data && step === 'outfit' ? <OutfitStep data={data} store={store} /> : null}
        </main>
      </SkyScene>
    </GameStoreContext.Provider>
  );
}
