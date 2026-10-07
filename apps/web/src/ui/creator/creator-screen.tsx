// M1.2 (chọn loài) + M1.3 (trang phục, tên, tính cách, xem trước): the Character Creator. Every
// species in content/species.json is open; every accessory slot has a tab (clothes always worn: the species' own until
// the child picks others); the "Thú cưng" tab picks
// a pet (content/pets.json) that follows the character, locked until its level like the clothes. Items sold in the
// shop (content/shop) show as owned once bought, "Mua ở cửa hàng" until then; a region chest's exclusive items
// (content/region-rewards.json) once claimed, "Quà rương <khu>" until then. The 3D preview is its own light renderer; outfit
// and pet changes reach it as the bridge commands `set-outfit` and `set-pet`.
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { fillPlayerName } from '@miu/quest/player-name';
import { CharacterDto, CharacterUpdate, ProgressResponse, QuestListResponse } from '@miu/schema/game';
import { isPetOpen } from '@miu/schema/pet';
import { ShopResponse } from '@miu/schema/shop';
import characterNames from '../../../../../content/names/character-names.json';
import { createGameStore, type GameStore } from '../../game-bridge/game-store';
import { GameStoreContext, useGameState } from '../../game-bridge/use-game-state';
import { CharacterPreview, EMOTES, type Emote } from '../../game/preview/character-preview';
import { SPECIES } from '../../game/content/characters';
import { api, errorMessage } from '../api-client';
import type { TextKey } from '../i18n/i18n';
import { Bi, T, useT } from '../i18n/use-t';
import { Icon, MiuArt } from '../kit/art';
import { assetUrl, PETS } from '../kit/ui-art';
import { buttonClass } from '../kit/button';
import { SkyScene } from '../kit/sky-scene';
import { findRegion } from '../region/regions';
import { isFreshCharacter } from './fresh-character';
import { OPEN_SLOTS, equip, isOpen, itemArtUrl, itemsForSlot, lockText, slotHasNone, wornInSlot, type OpenSlot } from './creator-outfit';
import './creator.css';

const NAMES: readonly string[] = (characterNames as { names: string[] }).names;

const EMOTE_LABELS: Record<Emote, TextKey> = { wave: 'creator.emote.wave', jump: 'creator.emote.jump', yawn: 'creator.emote.yawn', cheer: 'creator.emote.cheer' };

/** MVP personality: a fixed label, never stored (validation decision `character_personality_field`). */
const PERSONALITY: TextKey = 'creator.explorer';

interface CreatorData {
  character: CharacterDto;
  level: number;
  completed: ReadonlySet<string>;
  questTitles: ReadonlyMap<string, string>;
  /** Things bought in the shop or claimed from a region chest (the server keeps both in the shop cupboard). */
  owned: ReadonlySet<string>;
}

async function loadCreator(): Promise<CreatorData> {
  const [character, progress, quests, shop] = await Promise.all([
    api('GET', '/character', CharacterDto),
    api('GET', '/progress', ProgressResponse),
    api('GET', '/quests', QuestListResponse),
    // Without the shop the wardrobe still opens: its items then show as for sale.
    api('GET', '/shop', ShopResponse).catch(() => null),
  ]);
  return {
    character,
    level: progress.level,
    completed: new Set(progress.quests.filter((q) => q.completed).map((q) => q.questId)),
    questTitles: new Map(quests.quests.map((q) => [q.quest.id, q.quest.title])),
    owned: new Set(Object.keys(shop?.owned ?? {})),
  };
}

/**
 * `current`: the species the child's character already is, marked on its card. `switching`: the child
 * already plays, so the step says that a new animal keeps everything earned (progress belongs to the
 * profile, not the character).
 */
function SpeciesStep({ current, switching, onPick }: { current: string; switching: boolean; onPick: (species: string) => void }) {
  return (
    <section className="panel creator-species" data-id="creator-species" aria-labelledby="creator-species-title">
      <h1 id="creator-species-title">
        <T k="creator.pickSpecies" />
      </h1>
      {switching ? (
        <>
          <p className="hint" data-id="creator-keeps-progress">
            <T k="creator.keepsProgress" />
          </p>
          {/* Changing her animal is a choice, not a step she must finish: the way back Home stays in sight. */}
          <Link to="/home" className={`${buttonClass('ghost', { small: true })} creator-species-back`} data-id="creator-species-home">
            <T k="common.backHome" />
          </Link>
        </>
      ) : null}
      <ul className="species-grid">
        {SPECIES.map((s) => (
          <li key={s.id}>
            <button type="button" className="species-card" aria-pressed={s.id === current} data-id={`creator-species-${s.id}`} onClick={() => onPick(s.id)}>
              <span className="species-card-art">
                <MiuArt pose="idle" species={s.id} />
              </span>
              <strong>{s.name}</strong>
              <span className="hint">{s.trait}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * The 3D stage: mounts one CharacterPreview for the screen's lifetime and exposes its emotes (the shop shows it
 * without them). Needs a `GameStoreContext` provider for `store`.
 */
export function PreviewStage({ store, species, initialOutfit, initialPet, emotes = true }: { store: GameStore; species: string; initialOutfit: readonly string[]; initialPet: string | null; emotes?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const preview = useRef<CharacterPreview | null>(null);
  const firstOutfit = useRef(initialOutfit);
  const firstPet = useRef(initialPet);
  const status = useGameState((s) => s.status);
  const { t } = useT();
  useEffect(() => {
    if (!host.current) return;
    const instance = new CharacterPreview(host.current, { store, species, outfit: firstOutfit.current, pet: firstPet.current });
    preview.current = instance;
    void instance.start();
    // StrictMode mounts twice in dev: the first preview is fully disposed before the second starts.
    return () => {
      instance.dispose();
      if (preview.current === instance) preview.current = null;
    };
  }, [store, species]);
  return (
    <div className="creator-stage">
      <div className="creator-stage-view" ref={host} data-id="creator-preview" aria-label={t('creator.previewLabel')} />
      {status === 'error' ? (
        <p role="alert" className="error">
          <T k="creator.previewFailed" />
        </p>
      ) : null}
      {emotes ? (
        <div className="emote-row" role="group" aria-label={t('creator.emotes')}>
          {EMOTES.map((emote) => (
            <button
              key={emote}
              type="button"
              className={buttonClass('secondary', { small: true })}
              data-id={`creator-emote-${emote}`}
              disabled={status !== 'ready'}
              onClick={() => preview.current?.playEmote(emote)}
            >
              <T k={EMOTE_LABELS[emote]} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Name, outfit and pet picked so far: kept when the child goes back to pick another animal. */
interface Draft {
  name: string;
  equipped: string[];
  pet: string | null;
}

/** The wardrobe's tabs: the outfit slots, then the pet. */
type Tab = OpenSlot | 'pet';

function OutfitStep({
  data,
  store,
  species,
  draft,
  onDraft,
  onChangeSpecies,
}: {
  data: CreatorData;
  store: GameStore;
  species: string;
  draft: Draft;
  onDraft: (next: Draft) => void;
  onChangeSpecies: () => void;
}) {
  const navigate = useNavigate();
  const { name, equipped, pet } = draft;
  const setName = (next: string): void => onDraft({ ...draft, name: next });
  const setEquipped = (next: string[]): void => onDraft({ ...draft, equipped: next });
  const [slot, setSlot] = useState<Tab>('hat');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const worn = data.character.equipped;
  const { t } = useT();
  const questTitle = (id: string): string => fillPlayerName(data.questTitles.get(id) ?? id, name);
  const regionName = (id: string): string => fillPlayerName(findRegion(id)?.name ?? id, name);

  function choose(itemId: string | null) {
    if (slot === 'pet') return;
    const next = equip(equipped, slot, itemId);
    setEquipped(next);
    store.send({ type: 'set-outfit', equipped: next });
  }

  function choosePet(petId: string | null) {
    onDraft({ ...draft, pet: petId });
    store.send({ type: 'set-pet', pet: petId });
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api('PUT', '/character', CharacterDto, CharacterUpdate.parse({ name, equipped, species, pet }));
      navigate('/home');
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  const current = slot === 'pet' ? null : wornInSlot(equipped, slot, species);
  return (
    <div className="creator-layout" data-id="creator-outfit">
      <section className="panel creator-wardrobe" aria-labelledby="creator-wardrobe-title">
        <h2 id="creator-wardrobe-title">
          <T k="creator.wardrobe" />
        </h2>
        <div className="slot-tabs" role="tablist" aria-label={t('creator.slots')}>
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
              <T k={s.label} />
            </button>
          ))}
          <button
            type="button"
            role="tab"
            aria-selected={slot === 'pet'}
            className={`slot-tab${slot === 'pet' ? ' slot-tab--active' : ''}`}
            data-id="creator-slot-pet"
            onClick={() => setSlot('pet')}
          >
            <T k="creator.pet" />
          </button>
        </div>
        {slot === 'pet' ? (
          <ul className="item-grid" role="tabpanel" aria-label={t('creator.pet')}>
            <li>
              <button type="button" className="item-tile" aria-pressed={pet === null} data-id="creator-pet-none" onClick={() => choosePet(null)}>
                <span className="item-swatch item-swatch--none" aria-hidden="true" />
                <T k="creator.noPet" />
              </button>
            </li>
            {PETS.map((p) => {
              // The pet she already has stays hers, as the server keeps it.
              const open = p.id === data.character.pet || isPetOpen(p, data.level);
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    className={`item-tile${open ? '' : ' item-tile--locked'}`}
                    aria-pressed={pet === p.id}
                    disabled={!open}
                    data-id={`creator-pet-${p.id}`}
                    onClick={() => choosePet(p.id)}
                  >
                    <span className="item-art-frame" aria-hidden="true">
                      <img className="item-art" src={assetUrl(p.art)} alt="" width={64} height={64} loading="lazy" />
                      {open ? null : (
                        <span className="item-art-lock">
                          <Icon name="locked" size={28} />
                        </span>
                      )}
                    </span>
                    {p.name}
                    {open || !p.unlock ? null : (
                      <span className="item-lock">
                        <T k="creator.needLevel" params={{ level: p.unlock.level }} />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
        <ul className="item-grid" role="tabpanel" aria-label={t('creator.items')}>
          {slotHasNone(slot) ? (
            <li>
              <button type="button" className="item-tile" aria-pressed={current === null} data-id={`creator-item-none-${slot}`} onClick={() => choose(null)}>
                <span className="item-swatch item-swatch--none" aria-hidden="true" />
                <T k="creator.none" />
              </button>
            </li>
          ) : null}
          {itemsForSlot(slot).map((item) => {
            const open = isOpen(item, data.level, data.completed, worn, data.owned);
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
                  <span className="item-art-frame" aria-hidden="true">
                    <img className="item-art" src={itemArtUrl(item)} alt="" width={64} height={64} loading="lazy" />
                    {open ? null : (
                      <span className="item-art-lock">
                        <Icon name="locked" size={28} />
                      </span>
                    )}
                  </span>
                  {item.name}
                  {open ? null : (
                    <span className="item-lock">
                      <Bi {...lockText(item, questTitle, regionName)} />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        )}
      </section>

      <PreviewStage store={store} species={species} initialOutfit={equipped} initialPet={pet} />

      <section className="panel creator-info" aria-labelledby="creator-info-title">
        <h2 id="creator-info-title">
          <T k="creator.info" />
        </h2>
        <button type="button" className={`${buttonClass('ghost', { small: true })} creator-species-back`} data-id="creator-change-species" onClick={onChangeSpecies}>
          <T k="creator.change" />
        </button>
        <label className="field-label">
          <T k="creator.name" />
          <select data-id="creator-name" value={name} onChange={(e) => setName(e.target.value)}>
            <option value="" disabled>
              {t('creator.pickName')}
            </option>
            {NAMES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <p className="field-label">
          <T k="creator.personality" />
          <span className="badge" data-id="creator-personality">
            <T k={PERSONALITY} />
          </span>
        </p>
        {error ? (
          <p role="alert" className="error">
            {error}
          </p>
        ) : null}
        <button type="button" className={buttonClass('primary', { block: true })} data-id="creator-save" disabled={saving || !name} onClick={() => void save()}>
          <Icon name="sparkles" size={32} />
          <T k="creator.enter" />
        </button>
      </section>
    </div>
  );
}

export function CreatorScreen() {
  const [store] = useState(createGameStore);
  const [data, setData] = useState<CreatorData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Null until the child picks an animal on the first step.
  const [species, setSpecies] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  useEffect(() => {
    let live = true;
    loadCreator().then(
      (next) => {
        if (!live) return;
        setData(next);
        // "Miu" is the game's name: a fresh character starts without a name and the child picks one.
        setDraft({ name: isFreshCharacter(next.character) ? '' : next.character.name, equipped: next.character.equipped, pet: next.character.pet });
      },
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
              {loadError}{' '}
              <Link to="/profiles">
                <T k="common.back" />
              </Link>
            </p>
          ) : null}
          {!data && !loadError ? (
            <p role="status">
              <T k="common.loading" />
            </p>
          ) : null}
          {data && species === null ? <SpeciesStep current={data.character.species} switching={!isFreshCharacter(data.character)} onPick={setSpecies} /> : null}
          {data && draft && species !== null ? (
            <OutfitStep data={data} store={store} species={species} draft={draft} onDraft={setDraft} onChangeSpecies={() => setSpecies(null)} />
          ) : null}
        </main>
      </SkyScene>
    </GameStoreContext.Provider>
  );
}
