// M3.2 (gameplay 3D): Khu rừng bí mật. The game owns canvas, loop, joystick and Run/Jump; React
// owns the HUD (badge, quest tracker, menu buttons, Interact), the interaction label (content and
// visibility from game-bridge), Pause (the game stops rendering while it is open) and the offline retry.
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { rememberPlay } from '../system/back-to-game';
import type { PlayerPosition } from '@miu/schema/player-position';
import { createGameStore, type GameSnapshot, type GameStore } from '../../game-bridge/game-store';
import { createSocialStore, type SocialStore } from '../../game-bridge/social-store';
import { GameStoreContext, useGameState, useGameStore } from '../../game-bridge/use-game-state';
import { Game } from '../../game/game';
import { AssetRegistry } from '../../game/asset-loader';
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
import { useHomeObjects } from './use-home-objects';
import { HomeDecorPanel } from '../home-decor/home-decor-panel';
import { SHOP_TARGET, ShopPanel } from '../shop/shop-panel';
import { PetCarePanel } from '../pet-care/pet-care-panel';
import { CookingPanel } from '../cooking/cooking-panel';
import { TimetablePanel } from '../timetable/timetable-panel';
import { TIMETABLE_TARGETS, type TimetableFocus } from '../timetable/timetable-targets';
import { PartyFrame, SocialLayer } from '../online/social-layer';
import { usePlayTime } from './play-time';
import { FriendsButton, FriendsDialog, useFriendsPrefetch } from '../friends/friends-screens';
import { useSocial } from '../online/use-social';
import { createPositionSaver, loadPlayerPositions } from './player-position';
import { CoopLayer } from '../coop/coop-layer';
import { PartyQuestCard } from '../coop/party-quest-card';
import { useCoopChallenges } from '../coop/use-coop';

const HOME_PATH = '/home';

/**
 * A quest's progress from the server: the step route's response and the party's pushes may arrive out of order, so
 * within one run the one with more steps done wins (a newer run always does).
 */
export function withProgress(summary: QuestSummary, progress: QuestSummary['progress']): QuestSummary {
  const kept = summary.progress;
  const older = progress.run === kept.run && progress.completedSteps.length < kept.completedSteps.length && progress.completed === kept.completed;
  if (older || (progress.run ?? 1) < (kept.run ?? 1)) return summary;
  return { ...summary, progress, state: progress.completed ? 'completed' : 'in-progress' };
}
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
  social,
  playerName,
  species,
  pet,
  outfit,
  chapter,
  region,
  quest,
  savedSpot,
  decor,
  objectStates,
  paused,
  onSpotReader,
}: {
  store: GameStore;
  /** The online UI's store; it outlives each game (the party frame stays while the next map loads). */
  social: SocialStore;
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
  /** What she left switched on in her home (its map only); read when the game is (re)built, never rebuilding it. */
  objectStates?: Readonly<Record<string, true>>;
  paused: boolean;
  /** Hands over a reader of where the child stands in the running game (null once it is gone), so a quest switch on the same map keeps the spot. */
  onSpotReader: (read: (() => PlayerPosition | null) | null) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const game = useRef<Game | null>(null);
  const outfitKey = outfit.join(',');
  // New picks rebuild the house: the game is rebuilt where the child stands (the caller keeps her spot).
  const decorKey = decor ? JSON.stringify(decor) : '';
  // The latest switched-on objects, read when the game is (re)built: their changes never rebuild it.
  const objectsRef = useRef(objectStates);
  useEffect(() => {
    objectsRef.current = objectStates;
  }, [objectStates]);
  useEffect(() => {
    if (!host.current) return;
    const picks = decorKey ? (JSON.parse(decorKey) as Record<string, string>) : undefined;
    const instance = new Game(host.current, { store, social, search: window.location.search, playerName, species, pet, outfit: outfitKey ? outfitKey.split(',') : [], chapter, region, quest, savedSpot, decor: picks, objectStates: objectsRef.current });
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
  }, [store, social, playerName, species, pet, outfitKey, chapter, region, quest, savedSpot, decorKey, onSpotReader]);
  // Full-screen screens stop rendering (Master Plan §12); React only calls stop/resume.
  useEffect(() => {
    if (paused) game.current?.stop();
    else game.current?.resume();
  }, [paused]);
  return <div ref={host} data-id="play-host" />;
}

export function PlayScreen() {
  const { refresh, state: account } = useAccount();
  const draftOwner = account.status === 'signed-in' ? account.me.activePlayerId : null;
  const [store] = useState(createGameStore);
  const [social] = useState(createSocialStore);
  /** The online menu on another player is open (it covers the game like the other screens). */
  const onlineMenu = useSocial(social, (s) => s.menu !== null);
  /** A co-op lobby, challenge or its end is on screen (it covers the game). */
  const coopOpen = useSocial(social, (s) => s.coopLobby !== null || s.coopState !== null || s.coopEnd !== null);
  const coop = useCoopChallenges(social);
  // The quest played with the party: the server's pushes of her progress, and whether a teammate's answer is awaited.
  const partyProgressSeq = useSocial(social, (s) => s.partyProgress?.seq ?? 0);
  const partyWaiting = useSocial(social, (s) => (s.partyQuest?.members ?? []).some((m) => m.joined && m.waiting && m.id !== s.selfId));
  const partyPlay = useMemo(() => ({ progressSeq: partyProgressSeq, waiting: partyWaiting }), [partyProgressSeq, partyWaiting]);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const here = useLocation();
  // The way back to this game from Home, the map and the other screens.
  useEffect(() => rememberPlay(`${here.pathname}${here.search}`), [here.pathname, here.search]);
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
  /** The pet care screen. */
  const [petCareOpen, setPetCareOpen] = useState(false);
  /** The home cooking screen. */
  const [cookingOpen, setCookingOpen] = useState(false);
  /** The friends list over the game. */
  const [friendsOpen, setFriendsOpen] = useState(false);
  /** The child's picks for her home, read before her home's map is built (null until known; others need none). */
  const [decor, setDecor] = useState<Record<string, string> | null>(null);
  /** The map on screen loads after a gate: its loading screen is the trip through the portal. */
  const [viaPortal, setViaPortal] = useState(false);
  /** The character whose card offered the quest on screen: its first line opens when the map is up. */
  const [openAt, setOpenAt] = useState<string | null>(null);
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
    // The game's asset list is read while the player's data is: the game starts with it at hand.
    AssetRegistry.shared().catch(() => undefined);
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

  // A party member did a shared step of the party's quest for her: her own progress on it moves (from the server).
  useEffect(() => {
    let seen = social.getSnapshot().partyProgress?.seq ?? 0;
    return social.subscribe(() => {
      const pushed = social.getSnapshot().partyProgress;
      if (!pushed || pushed.seq === seen) return;
      seen = pushed.seq;
      const moved = pushed.progress;
      setData((prev) => prev && { ...prev, quests: prev.quests.map((q) => (q.quest.id === moved.questId ? withProgress(q, moved) : q)) });
    });
  }, [social]);
  /** The server paid a co-op challenge: her XP, coins and quests are read again. */
  const refreshPlayer = useCallback((): void => {
    void loadPlayer().then(setData, () => undefined);
  }, []);
  // Server numbers after each step: progress, this quest's state; a finished quest can open others.
  const onResponse = useCallback((response: StepCompleteResponse): void => {
    setData((prev) =>
      prev && {
        ...prev,
        progress: response.progress,
        quests: prev.quests.map((q) => (q.quest.id === response.quest.questId ? withProgress(q, response.quest) : q)),
      },
    );
    if (response.completion) void loadPlayer().then(setData, () => undefined);
  }, []);

  const quest = data?.quests.find((q) => q.quest.id === questId) ?? null;
  const region = quest?.quest.region ?? DEFAULT_REGION;
  // An element of `positions` (set once), so the same object on every render: the game is not rebuilt.
  const savedSpot = positions?.find((p) => p.map === regionMap(region)) ?? null;
  const covered = paused || questOpen || backpackOpen || questsOpen || timetable !== null || decorOpen || shopOpen || petCareOpen || cookingOpen || friendsOpen || onlineMenu || coopOpen;
  const atHome = data !== null && regionMap(region) === regionMap(HOME_REGION);
  // The friends list is read in the background once the game is up, so it opens at once.
  useFriendsPrefetch(social, draftOwner, status === 'ready');
  // Weekly play time for the progress views: counted while the game runs, not while paused.
  usePlayTime(data !== null && status === 'ready' && !paused);
  // What she left switched on at home, read with her picks and saved as she switches things.
  const homeObjects = useHomeObjects(atHome, store);
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
  function switchQuest(next: QuestSummary, throughGate = false, from: string | null = null): void {
    setQuestsOpen(false);
    setOpenAt(from);
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
        if (last.targetId === 'pet-care' || last.targetId === 'pet-companion') setPetCareOpen(true);
        if (last.targetId === 'cooking' || last.targetId.includes('kitchen') || last.targetId.includes('stove') || last.targetId.includes('bep')) setCookingOpen(true);
      }),
    [store],
  );
  const boardRegion = findRegion(region);
  const regionTitle = findRegion(quest?.quest.region ?? '')?.name ?? t('play.defaultRegion');
  const regionName = data ? say(regionTitle, data.character) : regionTitle;

  return (
    <GameStoreContext.Provider value={store}>
      <main data-id="play">
        {data && positions && (!atHome || (decor !== null && homeObjects !== null)) ? (
          <GameView store={store} social={social} playerName={data.character.name} species={data.character.species} pet={data.character.pet} outfit={data.character.equipped} chapter={quest?.quest.chapter ?? 1} region={region} quest={quest?.quest.id} savedSpot={savedSpot} decor={atHome ? (decor ?? undefined) : undefined} objectStates={atHome ? (homeObjects ?? undefined) : undefined} paused={covered} onSpotReader={onSpotReader} />
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
        {data && status !== 'error' ? (
          <Hud data={data} quest={quest} covered={covered} onMenu={() => setPaused(true)} onQuests={() => setQuestsOpen(true)} onBackpack={() => setBackpackOpen(true)}>
            <FriendsButton social={social} onOpen={() => setFriendsOpen(true)} />
            {/* Out of the way while a screen (the friends list…) covers the game: the two never overlap. */}
            {covered ? null : <PartyFrame social={social} fill={(text) => say(text, data.character)} />}
            {covered ? null : (
              <PartyQuestCard
                social={social}
                data={data}
                questId={questId}
                onPlay={(id) => {
                  const next = data.quests.find((q) => q.quest.id === id);
                  if (next && id !== questId) switchQuest(next, next.quest.region !== region);
                }}
              />
            )}
          </Hud>
        ) : null}
        {data ? <SocialLayer social={social} covered={covered && !onlineMenu} fill={(text) => say(text, data.character)} /> : null}
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
        {data && friendsOpen ? <FriendsDialog social={social} fill={(text) => say(text, data.character)} player={draftOwner} onClose={() => setFriendsOpen(false)} /> : null}
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
        {petCareOpen ? (
          <Modal title="Chăm sóc Thú cưng 🐾" onClose={() => setPetCareOpen(false)} dataId="play-pet-care" size="normal">
            <PetCarePanel
              onClose={() => setPetCareOpen(false)}
              onActionFeedback={(_action, _msg, emote) => {
                if (emote === 'dance') store.send({ type: 'celebrate' });
              }}
            />
            <button type="button" className="scene-close" data-id="play-pet-care-close" aria-label="Đóng" onClick={() => setPetCareOpen(false)}>
              ✕
            </button>
          </Modal>
        ) : null}
        {cookingOpen ? (
          <Modal title="Bếp Nhà Nấu Ăn 🍳" onClose={() => setCookingOpen(false)} dataId="play-cooking" size="wide">
            <CookingPanel onClose={() => setCookingOpen(false)} />
            <button type="button" className="scene-close" data-id="play-cooking-close" aria-label="Đóng" onClick={() => setCookingOpen(false)}>
              ✕
            </button>
          </Modal>
        ) : null}
        {data ? (
          <QuestLayer
            key={questId ?? 'none'}
            store={store}
            data={data}
            questId={quest?.quest.id ?? null}
            region={region}
            onResponse={onResponse}
            onOverlayChange={setQuestOpen}
            draftOwner={draftOwner}
            openAt={openAt}
            onPlayQuest={(id, from) => {
              const next = data.quests.find((q) => q.quest.id === id);
              if (next) switchQuest(next, false, from);
            }}
            claimCoop={coop.claim}
            party={partyPlay}
          />
        ) : null}
        {data ? <CoopLayer social={social} quests={coop.quests} data={data} onPaid={refreshPlayer} onMap={(id) => navigate(`/region/${id}`)} /> : null}
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
