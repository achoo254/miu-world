// M3.2 (gameplay 3D): Khu rừng bí mật. The game owns canvas, loop, joystick and Run/Jump; React
// owns the HUD (badge, quest tracker, menu buttons, Interact), the interaction label (content and
// visibility from game-bridge), Pause (the game stops rendering while it is open) and the offline retry.
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { PlayerPosition } from '@miu/schema/player-position';
import { createGameStore, type GameSnapshot, type GameStore } from '../../game-bridge/game-store';
import { GameStoreContext, useGameState, useGameStore } from '../../game-bridge/use-game-state';
import { Game } from '../../game/game';
import { ApiError, errorMessage } from '../api-client';
import { useAccount } from '../account/account-context';
import { Hud } from '../hud/hud';
import { T, useT } from '../i18n/use-t';
import type { QuestSummary, StepCompleteResponse } from '@miu/schema/game';
import { currentQuest, loadPlayer, questForRegion, say, type PlayerData } from '../player/player-data';
import { QuestLayer } from '../quest/quest-layer';
import { BackpackPanel } from '../backpack/backpack-panel';
import { buttonClass } from '../kit/button';
import { Modal } from '../kit/modal';
import { QuestBoard } from '../region/region-detail';
import { DEFAULT_REGION, HOME_REGION, findRegion, regionMap } from '../region/regions';
import { LoadingOverlay } from '../system/loading-overlay';
import { OfflineBanner } from '../system/offline-banner';
import { PauseScreen } from '../system/pause-screen';
import { DECOR_TARGET } from '../home-decor/decor-catalog';
import { loadHomeDecor } from '../home-decor/home-decor-api';
import { HomeDecorPanel } from '../home-decor/home-decor-panel';
import { SHOP_TARGET, ShopPanel } from '../shop/shop-panel';
import { TimetablePanel } from '../timetable/timetable-panel';
import { TIMETABLE_TARGETS, type TimetableFocus } from '../timetable/timetable-targets';
import { createPositionSaver, loadPlayerPositions } from './player-position';

const HOME_PATH = '/home';
/** How often the child's spot is saved while playing; hiding or leaving the page saves it at once. */
const SAVE_SPOT_MS = 10_000;

function InteractionLabel() {
  const store = useGameStore();
  const prompt = useGameState((s) => s.prompt);
  if (!prompt) return null;
  return (
    <button
      type="button"
      className="npc-label"
      data-target={prompt.targetId}
      data-kind={prompt.kind}
      data-id={`play-prompt-${prompt.targetId}`}
      // The game writes this element's transform (and reveals it) every frame; React only mounts/unmounts it.
      style={{ visibility: 'hidden' }}
      ref={(el) => {
        store.setPromptAnchor(el);
        return () => store.setPromptAnchor(null);
      }}
      onClick={() => store.send({ type: 'interact' })}
    >
      {prompt.name} · {prompt.label}
    </button>
  );
}

/** Game status for the screen itself (outside the store provider's children). */
function useSyncStatus(store: GameStore): GameSnapshot['status'] {
  return useSyncExternalStore(store.subscribe, () => store.getSnapshot().status);
}

function GameStatus() {
  const error = useGameState((s) => s.error);
  if (!error) return null;
  if (error.code === 'context-lost') {
    return (
      <div className="play-message" role="alert" data-id="play-context-lost">
        <p>
          <T k="play.contextLost" />
        </p>
        {/* A full page load rebuilds the WebGL context; progress already saved on the server is kept. */}
        <button type="button" data-id="play-context-lost-reload" onClick={() => window.location.reload()}>
          <T k="play.reload" />
        </button>
      </div>
    );
  }
  return (
    <div className="play-message" role="alert" data-id="play-error">
      <p>
        <T k="play.loadFailed" />{' '}
        <Link to="/home">
          <T k="common.back" />
        </Link>
      </p>
    </div>
  );
}

function GameView({
  store,
  playerName,
  species,
  pet,
  outfit,
  chapter,
  region,
  quest,
  savedSpot,
  decor,
  paused,
  onSpotReader,
}: {
  store: GameStore;
  playerName: string;
  species: string;
  /** Pet that follows the character (`content/pets.json`), or none. */
  pet: string | null;
  outfit: string[];
  chapter: number;
  region: string;
  /** Quest being played (its own things show only during it). */
  quest?: string;
  /** Where the child last stood on this region's map, if anywhere. */
  savedSpot: PlayerPosition | null;
  /** The child's picks for her home (its map only): the house is built in them. */
  decor?: Readonly<Record<string, string>>;
  paused: boolean;
  /** Hands over a reader of where the child stands in the running game (null once it is gone), so a quest switch on the same map keeps the spot. */
  onSpotReader: (read: (() => PlayerPosition | null) | null) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const game = useRef<Game | null>(null);
  const outfitKey = outfit.join(',');
  // New picks rebuild the house: the game is rebuilt where the child stands (the caller keeps her spot).
  const decorKey = decor ? JSON.stringify(decor) : '';
  useEffect(() => {
    if (!host.current) return;
    const picks = decorKey ? (JSON.parse(decorKey) as Record<string, string>) : undefined;
    const instance = new Game(host.current, { store, search: window.location.search, playerName, species, pet, outfit: outfitKey ? outfitKey.split(',') : [], chapter, region, quest, savedSpot, decor: picks });
    game.current = instance;
    onSpotReader(() => instance.currentSpot());
    void instance.start();
    const save = createPositionSaver(savedSpot);
    const timer = window.setInterval(() => save(instance.currentSpot()), SAVE_SPOT_MS);
    // A hidden page may never come back (tab closed, iPad app switched): keepalive lets the save finish.
    const onHidden = (): void => {
      if (document.visibilityState === 'hidden') save(instance.currentSpot(), { keepalive: true });
    };
    const onPageHide = (): void => save(instance.currentSpot(), { keepalive: true });
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('pagehide', onPageHide);
    // StrictMode mounts twice in dev: the first game is fully disposed before the second starts.
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('pagehide', onPageHide);
      save(instance.currentSpot(), { keepalive: true }); // leaving /play: read before dispose clears it
      instance.dispose();
      if (game.current === instance) game.current = null;
      onSpotReader(null);
    };
  }, [store, playerName, species, pet, outfitKey, chapter, region, quest, savedSpot, decorKey, onSpotReader]);
  // Full-screen screens stop rendering (Master Plan §12); React only calls stop/resume.
  useEffect(() => {
    if (paused) game.current?.stop();
    else game.current?.resume();
  }, [paused]);
  return <div ref={host} data-id="play-host" />;
}

export function PlayScreen() {
  const { refresh, state: account } = useAccount();
  const draftOwner = account.status === 'signed-in' ? account.me.activeChildId : null;
  const [store] = useState(createGameStore);
  const [params] = useSearchParams();
  const [data, setData] = useState<PlayerData | null>(null);
  // Read once per visit: later saves must not rebuild the game.
  const [positions, setPositions] = useState<PlayerPosition[] | null>(null);
  // The quest of this visit, fixed once: the one named in the URL (Home, region screen), else the one
  // the child is on. It must not change when that quest finishes, or its reward screens would vanish.
  const [questId, setQuestId] = useState<string | null>(null);
  const loaded = useCallback(
    (next: PlayerData): void => {
      setData(next);
      setQuestId((pinned) => pinned ?? params.get('quest') ?? currentQuest(next.quests)?.quest.id ?? null);
    },
    [params],
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [paused, setPaused] = useState(false);
  const [questOpen, setQuestOpen] = useState(false);
  const [backpackOpen, setBackpackOpen] = useState(false);
  const [questsOpen, setQuestsOpen] = useState(false);
  /** The timetable board in the child's home, opened at the timetable or at the uniform calendar. */
  const [timetable, setTimetable] = useState<TimetableFocus | null>(null);
  /** The decorating screen of the child's home. */
  const [decorOpen, setDecorOpen] = useState(false);
  /** The shop, opened by its shopkeeper in Trung tâm. */
  const [shopOpen, setShopOpen] = useState(false);
  /** The child's picks for her home, read before her home's map is built (null until known; others need none). */
  const [decor, setDecor] = useState<Record<string, string> | null>(null);
  /** The map on screen loads after a gate: its loading screen is the trip through the portal. */
  const [viaPortal, setViaPortal] = useState(false);
  const spotOf = useRef<(() => PlayerPosition | null) | null>(null);
  const onSpotReader = useCallback((read: (() => PlayerPosition | null) | null): void => {
    spotOf.current = read;
  }, []);
  const status = useSyncStatus(store);
  const { t } = useT();

  const onLoadError = useCallback(
    (err: unknown): void => {
      // Session or consent changed since the page loaded: re-read the account so routing sends the
      // parent to consent / the child to the profile picker.
      if (err instanceof ApiError && ['consent-required', 'no-active-child', 'unauthenticated'].includes(err.code)) void refresh();
      else if (err instanceof ApiError && err.code === 'network') setOffline(true);
      else setLoadError(errorMessage(err));
    },
    [refresh],
  );

  useEffect(() => {
    let live = true;
    loadPlayer().then(
      (next) => live && loaded(next),
      (err: unknown) => live && onLoadError(err),
    );
    void loadPlayerPositions().then((list) => live && setPositions(list));
    return () => {
      live = false;
    };
  }, [onLoadError, loaded]);

  async function retryOffline(): Promise<void> {
    try {
      loaded(await loadPlayer());
      setOffline(false);
    } catch (err) {
      onLoadError(err);
    }
  }

  // Esc opens Pause once the forest is up (the dialog itself handles Esc to resume).
  useEffect(() => {
    if (status !== 'ready' || paused) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setPaused(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [status, paused]);

  // Server numbers after each step: progress, this quest's state; a finished quest can open others.
  const onResponse = useCallback((response: StepCompleteResponse): void => {
    setData((prev) =>
      prev && {
        ...prev,
        progress: response.progress,
        quests: prev.quests.map((q) =>
          q.quest.id === response.quest.questId ? { ...q, progress: response.quest, state: response.quest.completed ? 'completed' : 'in-progress' } : q,
        ),
      },
    );
    if (response.completion) void loadPlayer().then(setData, () => undefined);
  }, []);

  const quest = data?.quests.find((q) => q.quest.id === questId) ?? null;
  const region = quest?.quest.region ?? DEFAULT_REGION;
  // An element of `positions` (set once), so the same object on every render: the game is not rebuilt.
  const savedSpot = positions?.find((p) => p.map === regionMap(region)) ?? null;
  const covered = paused || questOpen || backpackOpen || questsOpen || timetable !== null || decorOpen || shopOpen;
  const atHome = data !== null && regionMap(region) === regionMap(HOME_REGION);
  // Her home is built in her picks: they are read first (a failed read builds the house as it comes).
  useEffect(() => {
    if (!atHome || decor !== null) return;
    let live = true;
    loadHomeDecor().then(
      (d) => live && setDecor(d.choices),
      () => live && setDecor({}),
    );
    return () => {
      live = false;
    };
  }, [atHome, decor]);

  /** New picks saved: the house is rebuilt in them, the child where she stood. */
  function decorated(choices: Record<string, string>): void {
    const spot = spotOf.current?.() ?? null;
    if (spot) setPositions((list) => [...(list ?? []).filter((p) => p.map !== spot.map), spot]);
    setDecor(choices);
  }

  /**
   * Every quest of the map can be taken from the in-game board: the game is rebuilt with that quest's
   * characters where the child stands now. The URL follows (a reload resumes the same quest) without a
   * router navigation, which would reload the player data.
   */
  function switchQuest(next: QuestSummary, throughGate = false): void {
    setQuestsOpen(false);
    if (next.quest.id === questId) return;
    const spot = spotOf.current?.() ?? null;
    if (spot) setPositions((list) => [...(list ?? []).filter((p) => p.map !== spot.map), spot]);
    // Through a gate she arrives at the map's starting point, never where she last left it (owner, 03/10/2026).
    const arriving = regionMap(next.quest.region);
    if (throughGate) setPositions((list) => (list ?? []).filter((p) => p.map !== arriving));
    setViaPortal(throughGate);
    setQuestId(next.quest.id);
    const url = new URL(window.location.href);
    url.searchParams.set('region', next.quest.region);
    url.searchParams.set('quest', next.quest.id);
    window.history.replaceState(window.history.state, '', url);
  }
  // Through a gate (the hub's to each map, each map's back to the hub): that region's lesson takes over.
  const travelled = useRef(0);
  useEffect(
    () =>
      store.subscribe(() => {
        const travel = store.getSnapshot().travel;
        if (!travel || travel.count === travelled.current || !data) return;
        travelled.current = travel.count;
        const next = questForRegion(data.quests, travel.region);
        if (next) switchQuest(next, true);
      }),
  );
  // Touching the timetable on the wall or the uniform calendar opens the board (the quest leaves them alone).
  const interacted = useRef(store.getSnapshot().lastInteraction?.count ?? 0);
  useEffect(
    () =>
      store.subscribe(() => {
        const last = store.getSnapshot().lastInteraction;
        if (!last || last.count === interacted.current) return;
        interacted.current = last.count;
        const focus = TIMETABLE_TARGETS.get(last.targetId);
        if (focus) setTimetable(focus);
        if (last.targetId === DECOR_TARGET) setDecorOpen(true);
        if (last.targetId === SHOP_TARGET) setShopOpen(true);
      }),
    [store],
  );
  const boardRegion = findRegion(region);
  const regionTitle = findRegion(quest?.quest.region ?? '')?.name ?? t('play.defaultRegion');
  const regionName = data ? say(regionTitle, data.character) : regionTitle;

  return (
    <GameStoreContext.Provider value={store}>
      <main data-id="play">
        {data && positions && (!atHome || decor !== null) ? (
          <GameView store={store} playerName={data.character.name} species={data.character.species} pet={data.character.pet} outfit={data.character.equipped} chapter={quest?.quest.chapter ?? 1} region={region} quest={quest?.quest.id} savedSpot={savedSpot} decor={atHome ? (decor ?? undefined) : undefined} paused={covered} onSpotReader={onSpotReader} />
        ) : null}
        {loadError ? (
          <div className="play-message" role="alert">
            <p>
              {loadError}{' '}
              <Link to="/home">
                <T k="common.back" />
              </Link>
            </p>
          </div>
        ) : null}
        {loadError || offline ? null : <LoadingOverlay region={regionName} viaPortal={viaPortal} />}
        {offline ? <OfflineBanner onRetry={retryOffline} /> : null}
        {/* The in-world label and Interact would show through a screen's backdrop: only while playing. */}
        {covered ? null : <InteractionLabel />}
        <GameStatus />
        {data && status !== 'error' ? <Hud data={data} quest={quest} covered={covered} onMenu={() => setPaused(true)} onQuests={() => setQuestsOpen(true)} onBackpack={() => setBackpackOpen(true)} /> : null}
        {data && backpackOpen ? (
          <Modal title={<T k="common.backpack" />} onClose={() => setBackpackOpen(false)} dataId="play-backpack" size="wide">
            <BackpackPanel data={data} region={region} />
            <button type="button" className={buttonClass('primary', { block: true })} data-id="play-backpack-done" onClick={() => setBackpackOpen(false)}>
              <T k="common.close" />
            </button>
            <button type="button" className="scene-close" data-id="play-backpack-close" aria-label={t('play.closeBackpack')} onClick={() => setBackpackOpen(false)}>
              ✕
            </button>
          </Modal>
        ) : null}
        {data && boardRegion && questsOpen ? (
          <Modal title={<T k="common.quests" />} onClose={() => setQuestsOpen(false)} dataId="play-quests" size="wide">
            <QuestBoard region={boardRegion} quests={data.quests} data={data} pick={{ current: questId, onPick: switchQuest }} />
            <button type="button" className="scene-close" data-id="play-quests-close" aria-label={t('play.closeBoard')} onClick={() => setQuestsOpen(false)}>
              ✕
            </button>
          </Modal>
        ) : null}
        {timetable ? <TimetablePanel focus={timetable} onClose={() => setTimetable(null)} /> : null}
        {decorOpen ? <HomeDecorPanel onClose={() => setDecorOpen(false)} onSaved={decorated} /> : null}
        {shopOpen ? (
          <ShopPanel
            onClose={() => setShopOpen(false)}
            onCoins={(coins) => setData((prev) => prev && { ...prev, progress: { ...prev.progress, coins } })}
            // Worn at once in the game, without rebuilding the map (the next visit starts in it from the server).
            onWear={(equipped) => store.send({ type: 'set-outfit', equipped })}
          />
        ) : null}
        {data ? <QuestLayer key={questId ?? 'none'} store={store} data={data} questId={quest?.quest.id ?? null} region={region} onResponse={onResponse} onOverlayChange={setQuestOpen} draftOwner={draftOwner} /> : null}
        {paused ? (
          <PauseScreen
            onResume={() => setPaused(false)}
            onRescue={() => {
              store.send({ type: 'rescue' });
              setPaused(false);
            }}
            homePath={HOME_PATH}
          />
        ) : null}
      </main>
    </GameStoreContext.Provider>
  );
}
