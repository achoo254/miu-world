// Mock "quest screens" style (the themed scene UI: wooden banner, parchment, stones over the live game) for the
// pet's care board — NEW SCREEN element on M3.2. Her pet's own picture and name on the banner, its bond level, a
// line from the pet about how it feels, its needs on parchment, and four tabs: Chăm sóc (five care buttons, each
// a scene in the world), Làm trò (the tricks its level opens), Phụ kiện (what she bought it in the shop) and Đặt
// tên (a name from the list). While a scene plays the board folds into a caption so the world shows; it opens
// again with what the care brought (bond XP, a new level, a new trick). The numbers are the server's.
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { freshPicker, type FreshPicker } from '@miu/quest/pick-fresh';
import { PET_CARE_ACTIONS, PET_GEAR_SLOTS, PET_TRICKS, type PetBond, type PetBondChange, type PetCareAction, type PetGearSlot, type PetTrick } from '@miu/schema/pet-care';
import petNames from '../../../../../content/names/pet-names.json';
import { useGameStore } from '../../game-bridge/use-game-state';
import { PET_GEAR, gearSlotOf } from '../../game/pet/pet-gear-catalog';
import { errorMessage } from '../api-client';
import { linesOf, mapBoth, pairOf, type Bilingual, type LinesKey, type TextKey } from '../i18n/i18n';
import { Bi, T, useT } from '../i18n/use-t';
import { Icon } from '../kit/art';
import { Modal } from '../kit/modal';
import { PETS, UI_ICONS, assetUrl, type UiIcon } from '../kit/ui-art';
import { playCue } from '../sound/sfx';
import { loadShop } from '../shop/shop-api';
import { askTrick, careForPet, dressPet, loadPetCare, namePet } from './pet-care-api';
import './pet-care.css';

const NAMES: readonly string[] = (petNames as { names: string[] }).names;

const ACTION_ICON: Readonly<Record<PetCareAction, UiIcon>> = { feed: 'bowlWithSpoon', pet: 'heart', bath: 'bubbles', play: 'soccerBall', nap: 'fullMoon' };
const TRICK_ICON: Readonly<Record<PetTrick, UiIcon>> = { sit: 'dogFace', spin: 'yoYo', jump: 'kangaroo', roll: 'wheel', 'high-five': 'raisedHand', dance: 'musicalNote' };
const TRICK_NAME: Readonly<Record<PetTrick, TextKey>> = {
  sit: 'petCare.trick.sit',
  spin: 'petCare.trick.spin',
  jump: 'petCare.trick.jump',
  roll: 'petCare.trick.roll',
  'high-five': 'petCare.trick.highFive',
  dance: 'petCare.trick.dance',
};
const STATS = [
  { key: 'happiness', label: 'petCare.stat.happiness', icon: 'heart' },
  { key: 'fullness', label: 'petCare.stat.fullness', icon: 'bowlWithSpoon' },
  { key: 'cleanliness', label: 'petCare.stat.cleanliness', icon: 'bubbles' },
] as const satisfies ReadonlyArray<{ key: keyof PetBond['stats']; label: TextKey; icon: UiIcon }>;

type Tab = 'care' | 'tricks' | 'gear' | 'name';
const TABS: ReadonlyArray<{ key: Tab; label: TextKey; icon: UiIcon }> = [
  { key: 'care', label: 'petCare.tab.care', icon: 'heart' },
  { key: 'tricks', label: 'petCare.tab.tricks', icon: 'glowingStar' },
  { key: 'gear', label: 'petCare.tab.gear', icon: 'ribbon' },
  { key: 'name', label: 'petCare.tab.name', icon: 'scroll' },
];

/** What the pet says about how it feels: the need that is lowest (all of them cheerful), else plain joy. */
function moodPool(stats: PetBond['stats']): LinesKey {
  const lowest = Math.min(stats.fullness, stats.cleanliness, stats.happiness);
  if (lowest >= 60) return 'petCare.mood.happy';
  if (stats.fullness === lowest) return 'petCare.mood.hungry';
  if (stats.cleanliness === lowest) return 'petCare.mood.dusty';
  return 'petCare.mood.playful';
}

type Phase = 'idle' | 'waiting' | 'playing';
/** The game has this long to start the scene before the board stops waiting for it (ms). */
const SCENE_START_MS = 900;

export interface PetCarePanelProps {
  onClose: () => void;
}

export function PetCarePanel({ onClose }: PetCarePanelProps) {
  const store = useGameStore();
  const { t } = useT();
  const [state, setState] = useState<'loading' | 'none' | 'ready' | 'failed'>('loading');
  const [petId, setPetId] = useState<string | null>(null);
  const [bond, setBond] = useState<PetBond | null>(null);
  const [tab, setTab] = useState<Tab>('care');
  const [phase, setPhase] = useState<Phase>('idle');
  const phaseRef = useRef<Phase>('idle');
  const go = useCallback((next: Phase): void => {
    phaseRef.current = next;
    setPhase(next);
  }, []);
  /** What she pressed last: the portrait and the button play its little animation. */
  const [pressed, setPressed] = useState<{ what: PetCareAction | PetTrick; seq: number } | null>(null);
  const [caption, setCaption] = useState<TextKey>('petCare.scene.feed');
  const [news, setNews] = useState<Bilingual[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [line, setLine] = useState<Bilingual | null>(null);
  const [ownedGear, setOwnedGear] = useState<string[] | null>(null);
  const pickers = useRef(new Map<LinesKey, FreshPicker<Bilingual>>());
  const pet = PETS.find((p) => p.id === petId);
  const name = bond?.name ?? pet?.name ?? '';
  const fill = (text: Bilingual): Bilingual => mapBoth(text, (l) => l.replaceAll('{pet}', name));

  /** A fresh line from the pet about how it feels (never the same twice in a row). */
  const speak = useCallback((next: PetBond): void => {
    const pool = moodPool(next.stats);
    let picker = pickers.current.get(pool);
    if (!picker) pickers.current.set(pool, (picker = freshPicker(linesOf(pool))));
    setLine(picker.next());
  }, []);

  useEffect(() => {
    let live = true;
    loadPetCare().then(
      (status) => {
        if (!live) return;
        if (!status.hasPet) return setState('none');
        setPetId(status.petId);
        setBond(status.bond);
        speak(status.bond);
        setState('ready');
        store.send({ type: 'pet-name', name: status.bond.name });
      },
      () => live && setState('failed'),
    );
    return () => {
      live = false;
    };
  }, [store, speak]);

  // The scene the game plays: folded while it plays, open again when it ends.
  useEffect(
    () =>
      store.subscribe(() => {
        const scene = store.getSnapshot().petScene;
        if (scene && phaseRef.current === 'waiting') go('playing');
        else if (!scene && phaseRef.current === 'playing') {
          go('idle');
          playCue('star');
        }
      }),
    [store, go],
  );
  useEffect(() => {
    if (phase !== 'waiting') return;
    const timer = window.setTimeout(() => {
      if (phaseRef.current === 'waiting') go('idle');
    }, SCENE_START_MS);
    return () => window.clearTimeout(timer);
  }, [phase, go]);

  const press = (what: PetCareAction | PetTrick): void => {
    setPressed((was) => ({ what, seq: (was?.seq ?? 0) + 1 }));
    setError(null);
    setNews([]);
    playCue('tap');
  };
  /** What a care brought, as lines under the banner: bond XP, a new level and the tricks it opened. */
  const tell = (change: PetBondChange): void => {
    const lines: Bilingual[] = [];
    if (change.xpGained > 0) lines.push(pairOf('petCare.xpGained', { xp: change.xpGained }));
    if (change.levelUp) lines.push(fill(pairOf('petCare.levelUp', { level: change.bond.level })));
    for (const trick of change.unlocked) lines.push(pairOf('petCare.newTrick', { trick: pairOf(TRICK_NAME[trick]) }));
    setNews(lines);
    if (change.levelUp) playCue('complete');
  };

  async function care(action: PetCareAction): Promise<void> {
    if (phase !== 'idle') return;
    press(action);
    setCaption(`petCare.scene.${action}`);
    go('waiting');
    store.send({ type: 'pet-care', action });
    try {
      const change = await careForPet(action);
      setBond(change.bond);
      speak(change.bond);
      tell(change);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function trick(id: PetTrick): Promise<void> {
    if (phase !== 'idle') return;
    press(id);
    try {
      const answer = await askTrick(id);
      setBond(answer.bond);
      setCaption('petCare.scene.trick');
      go('waiting');
      store.send({ type: 'pet-trick', trick: id });
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function rename(next: string | null): Promise<void> {
    setError(null);
    try {
      const answer = await namePet(next);
      setBond(answer.bond);
      store.send({ type: 'pet-name', name: answer.bond.name });
      setNews([mapBoth(pairOf('petCare.named'), (l) => l.replaceAll('{pet}', answer.bond.name ?? pet?.name ?? ''))]);
      playCue('right');
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  // The gear tab lists what she bought for her pet (the shop's cupboard).
  useEffect(() => {
    if (tab !== 'gear' || ownedGear !== null) return;
    let live = true;
    loadShop().then(
      (shop) => live && setOwnedGear(Object.keys(shop.owned).filter((id) => PET_GEAR.has(id))),
      () => live && setOwnedGear([]),
    );
    return () => {
      live = false;
    };
  }, [tab, ownedGear]);

  async function toggleGear(id: string): Promise<void> {
    if (!bond) return;
    setError(null);
    const slot = gearSlotOf(id);
    const next = bond.gear.includes(id) ? bond.gear.filter((g) => g !== id) : [...bond.gear.filter((g) => gearSlotOf(g) !== slot), id];
    try {
      const answer = await dressPet(next);
      setBond(answer.bond);
      store.send({ type: 'pet-gear', gear: answer.bond.gear });
      playCue('place');
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (phase === 'playing') {
    // Folded: the scene shows in the world; a caption with the pet's picture says what it is doing.
    return (
      <div className="pet-scene-caption" role="status" data-id="pet-care-caption">
        {pet ? <img className="pet-scene-caption-art" src={assetUrl(pet.art)} alt="" width={56} height={56} draggable={false} /> : null}
        <span className="ribbon pet-scene-caption-text">
          <Bi {...pairOf(caption, { pet: name })} />
        </span>
      </div>
    );
  }

  const title = state === 'ready' ? <T k="petCare.title" params={{ pet: name }} /> : <T k="petCare.tab.care" />;
  return (
    <Modal title={title} onClose={onClose} dataId="play-pet-care" variant="scene" className="pet-care-modal">
      <button type="button" className="scene-close" data-id="play-pet-care-close" aria-label={t('petCare.close')} onClick={onClose}>
        ✕
      </button>
      {state === 'loading' ? (
        <p className="parchment pet-care-note" data-id="pet-care-loading">
          <T k="petCare.loading" />
        </p>
      ) : null}
      {state === 'failed' ? (
        <p className="parchment pet-care-note" role="alert">
          <T k="petCare.error" />
        </p>
      ) : null}
      {state === 'none' ? (
        <div className="parchment pet-care-note" data-id="pet-care-empty">
          <Icon name="pawPrints" size={48} />
          <p className="pet-care-empty-title">
            <T k="petCare.empty" />
          </p>
          <p>
            <T k="petCare.emptyHint" />
          </p>
        </div>
      ) : null}
      {state === 'ready' && bond && pet ? (
        <>
          <div className="npc-say pet-care-say">
            <span className="pet-care-portrait" data-id="pet-care-portrait" data-act={pressed?.what} key={pressed?.seq ?? 0}>
              <img src={assetUrl(pet.art)} alt={name} width={112} height={112} draggable={false} />
              {bond.gear.map((id) => {
                const item = PET_GEAR.get(id);
                return item ? <img key={id} className={`pet-care-gear-badge pet-care-gear-badge--${gearSlotOf(id) ?? 'head'}`} src={assetUrl(iconPath(item.icon))} alt="" width={30} height={30} draggable={false} /> : null;
              })}
            </span>
            <div className="npc-bubble parchment pet-care-bubble">
              <span className="npc-name" data-id="pet-care-name">
                {name}
              </span>
              <span className="pet-care-level" data-id="pet-care-level">
                <Icon name="glowingStar" size={20} /> <T k="petCare.level" params={{ level: bond.level }} />
              </span>
              {line ? (
                <span className="pet-care-line" data-id="pet-care-line">
                  <Bi {...fill(line)} />
                </span>
              ) : null}
              <BondBar bond={bond} />
            </div>
          </div>
          {news.length > 0 ? (
            <ul className="pet-care-news" data-id="pet-care-news" aria-live="polite">
              {news.map((n, i) => (
                <li key={i}>
                  <Icon name={i === 0 ? 'heart' : 'sparkles'} size={22} /> <Bi {...n} />
                </li>
              ))}
            </ul>
          ) : null}
          {error ? (
            <p className="pet-care-error" role="alert" data-id="pet-care-error">
              {error}
            </p>
          ) : null}
          <div className="parchment pet-care-stats" data-id="pet-care-stats">
            {STATS.map((s) => (
              <div className="pet-care-stat" key={s.key}>
                <Icon name={s.icon} size={26} />
                <span className="pet-care-stat-label">
                  <T k={s.label} />
                </span>
                <span className="pet-care-stat-track" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={bond.stats[s.key]} aria-label={t(s.label)}>
                  <span className={`pet-care-stat-fill pet-care-stat-fill--${s.key}`} style={{ '--fill': `${bond.stats[s.key]}%` } as CSSProperties} />
                </span>
                <span className="pet-care-stat-value" data-id={`pet-care-stat-${s.key}`}>
                  {bond.stats[s.key]}%
                </span>
              </div>
            ))}
          </div>
          <div className="pet-care-tabs" role="tablist" aria-label={t('petCare.tabs')}>
            {TABS.map((item) => (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={tab === item.key}
                className={`pet-care-tab${tab === item.key ? ' pet-care-tab--on' : ''}`}
                data-id={`pet-care-tab-${item.key}`}
                onClick={() => setTab(item.key)}
              >
                <Icon name={item.icon} size={24} />
                <T k={item.label} />
              </button>
            ))}
          </div>
          <div className="pet-care-panel" role="tabpanel">
            {tab === 'care' ? (
              <div className="pet-care-actions">
                {PET_CARE_ACTIONS.map((action) => (
                  <button
                    key={action}
                    type="button"
                    className="pet-care-stone"
                    data-id={`pet-action-${action}`}
                    data-act={action}
                    data-pulse={pressed?.what === action ? pressed.seq % 2 : undefined}
                    disabled={phase !== 'idle'}
                    onClick={() => void care(action)}
                  >
                    <Icon name={ACTION_ICON[action]} size={44} />
                    <span>
                      <T k={`petCare.action.${action}`} />
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
            {tab === 'tricks' ? (
              <>
                <div className="pet-care-actions pet-care-actions--tricks">
                  {PET_TRICKS.map(({ id, level }) => {
                    const open = bond.tricks.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        className="pet-care-stone"
                        data-id={`pet-trick-${id}`}
                        data-act={id}
                        data-pulse={pressed?.what === id ? pressed.seq % 2 : undefined}
                        data-locked={open ? undefined : true}
                        disabled={!open || phase !== 'idle'}
                        onClick={() => void trick(id)}
                      >
                        <Icon name={open ? TRICK_ICON[id] : 'locked'} size={40} />
                        <span>
                          <T k={TRICK_NAME[id]} />
                        </span>
                        {open ? null : (
                          <small className="pet-care-lock">
                            <T k="petCare.trickLocked" params={{ level }} />
                          </small>
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="pet-care-hint">
                  <T k="petCare.tricksHint" />
                </p>
              </>
            ) : null}
            {tab === 'gear' ? (
              <GearTab bond={bond} owned={ownedGear} onToggle={(id) => void toggleGear(id)} />
            ) : null}
            {tab === 'name' ? (
              <>
                <p className="pet-care-hint">
                  <T k="petCare.nameHint" params={{ pet: name }} />
                </p>
                <div className="pet-care-names" data-id="pet-care-names">
                  <button type="button" className={`pet-care-name-chip${bond.name === null ? ' pet-care-name-chip--on' : ''}`} aria-pressed={bond.name === null} onClick={() => void rename(null)}>
                    <T k="petCare.nameReset" />
                  </button>
                  {NAMES.map((n) => (
                    <button key={n} type="button" className={`pet-care-name-chip${bond.name === n ? ' pet-care-name-chip--on' : ''}`} aria-pressed={bond.name === n} data-id={`pet-name-${n}`} onClick={() => void rename(n)}>
                      {n}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </>
      ) : null}
    </Modal>
  );
}

/** The manifest path of a gear's picture: a UI icon by its key (checked by `pnpm content:check`). */
function iconPath(icon: string): string {
  const key: UiIcon = icon in UI_ICONS ? (icon as UiIcon) : 'pawPrints';
  return UI_ICONS[key];
}

function BondBar({ bond }: { bond: PetBond }) {
  const span = bond.nextLevelXp === null ? 1 : Math.max(1, bond.nextLevelXp - bond.levelXp);
  const into = bond.nextLevelXp === null ? 1 : bond.xp - bond.levelXp;
  const percent = Math.round((into / span) * 100);
  return (
    <span className="pet-care-bond" data-id="pet-care-bond">
      <span className="pet-care-bond-label">
        <Icon name="heart" size={18} /> {bond.nextLevelXp === null ? <T k="petCare.bondMax" /> : <T k="petCare.bond" />}
      </span>
      <span className="pet-care-bond-track" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
        <span className="pet-care-bond-fill" style={{ '--fill': `${percent}%` } as CSSProperties} />
      </span>
      {bond.nextLevelXp === null ? null : (
        <span className="pet-care-bond-count">
          {bond.xp}/{bond.nextLevelXp}
        </span>
      )}
    </span>
  );
}

function GearTab({ bond, owned, onToggle }: { bond: PetBond; owned: string[] | null; onToggle: (id: string) => void }) {
  if (owned === null) {
    return (
      <p className="pet-care-hint">
        <T k="petCare.loading" />
      </p>
    );
  }
  if (owned.length === 0) {
    return (
      <p className="pet-care-hint" data-id="pet-care-gear-none">
        <T k="petCare.gearNone" />
      </p>
    );
  }
  return (
    <>
      <p className="pet-care-hint">
        <T k="petCare.gearHint" />
      </p>
      {PET_GEAR_SLOTS.map((slot: PetGearSlot) => {
        const mine = owned.filter((id) => gearSlotOf(id) === slot);
        if (mine.length === 0) return null;
        return (
          <div key={slot} className="pet-care-gear-row">
            <span className="pet-care-gear-slot">
              <T k={`petCare.gearSlot.${slot}`} />
            </span>
            {mine.map((id) => {
              const item = PET_GEAR.get(id);
              if (!item) return null;
              const on = bond.gear.includes(id);
              return (
                <button key={id} type="button" className={`pet-care-gear${on ? ' pet-care-gear--on' : ''}`} aria-pressed={on} data-id={`pet-gear-${id}`} onClick={() => onToggle(id)}>
                  <img src={assetUrl(iconPath(item.icon))} alt="" width={40} height={40} draggable={false} />
                  <span>
                    <Bi vi={item.name} en={item.en.name} />
                  </span>
                  <small>
                    <T k={on ? 'petCare.gearOff' : 'petCare.gearWear'} />
                  </small>
                </button>
              );
            })}
          </div>
        );
      })}
    </>
  );
}
