// M3.2 (gameplay 3D): Khu rừng bí mật. The game owns canvas, loop, joystick and Run/Jump; React
// owns the HUD (badge, quest tracker, menu buttons, Interact), the interaction label (content and
// visibility from game-bridge), Pause (the game stops rendering while it is open) and the offline retry.
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Link, useSearchParams } from 'react-router';
import { createGameStore, type GameSnapshot, type GameStore } from '../../game-bridge/game-store';
import { GameStoreContext, useGameState, useGameStore } from '../../game-bridge/use-game-state';
import { Game } from '../../game/game';
import { ApiError, errorMessage } from '../api-client';
import { useAccount } from '../account/account-context';
import { Hud } from '../hud/hud';
import type { StepCompleteResponse } from '@miu/schema/game';
import { currentQuest, loadPlayer, say, type PlayerData } from '../player/player-data';
import { QuestLayer } from '../quest/quest-layer';
import { BackpackPanel } from '../backpack/backpack-panel';
import { Modal } from '../kit/modal';
import { findRegion } from '../region/regions';
import { LoadingOverlay } from '../system/loading-overlay';
import { OfflineBanner } from '../system/offline-banner';
import { PauseScreen } from '../system/pause-screen';

const HOME_PATH = '/home';

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
        <p>Mất kết nối đồ họa.</p>
        {/* A full page load rebuilds the WebGL context; progress already saved on the server is kept. */}
        <button type="button" data-id="play-context-lost-reload" onClick={() => window.location.reload()}>
          Tải lại
        </button>
      </div>
    );
  }
  return (
    <div className="play-message" role="alert" data-id="play-error">
      <p>
        Không tải được Khu rừng bí mật. <Link to="/home">Quay lại</Link>
      </p>
    </div>
  );
}

function GameView({ store, outfit, chapter, region, paused }: { store: GameStore; outfit: string[]; chapter: number; region: string; paused: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const game = useRef<Game | null>(null);
  const outfitKey = outfit.join(',');
  useEffect(() => {
    if (!host.current) return;
    const instance = new Game(host.current, { store, search: window.location.search, outfit: outfitKey ? outfitKey.split(',') : [], chapter, region });
    game.current = instance;
    void instance.start();
    // StrictMode mounts twice in dev: the first game is fully disposed before the second starts.
    return () => {
      instance.dispose();
      if (game.current === instance) game.current = null;
    };
  }, [store, outfitKey, chapter, region]);
  // Full-screen screens stop rendering (Master Plan §12); React only calls stop/resume.
  useEffect(() => {
    if (paused) game.current?.stop();
    else game.current?.resume();
  }, [paused]);
  return <div ref={host} data-id="play-host" />;
}

export function PlayScreen() {
  const { refresh } = useAccount();
  const [store] = useState(createGameStore);
  const [params] = useSearchParams();
  const [data, setData] = useState<PlayerData | null>(null);
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
  const status = useSyncStatus(store);

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
  const covered = paused || questOpen || backpackOpen;
  const regionTitle = findRegion(quest?.quest.region ?? '')?.name ?? 'Khu rừng bí mật';
  const regionName = data ? say(regionTitle, data.character) : regionTitle;

  return (
    <GameStoreContext.Provider value={store}>
      <main data-id="play">
        {data ? <GameView store={store} outfit={data.character.equipped} chapter={quest?.quest.chapter ?? 1} region={quest?.quest.region ?? 'khu-rung-bi-mat'} paused={covered} /> : null}
        {loadError ? (
          <div className="play-message" role="alert">
            <p>
              {loadError} <Link to="/home">Quay lại</Link>
            </p>
          </div>
        ) : null}
        {loadError || offline ? null : <LoadingOverlay region={regionName} />}
        {offline ? <OfflineBanner onRetry={retryOffline} /> : null}
        {/* The in-world label and Interact would show through a screen's backdrop: only while playing. */}
        {covered ? null : <InteractionLabel />}
        <GameStatus />
        {data && status !== 'error' ? <Hud data={data} quest={quest} covered={covered} onMenu={() => setPaused(true)} onBackpack={() => setBackpackOpen(true)} /> : null}
        {data && backpackOpen ? (
          <Modal title="Ba lô" onClose={() => setBackpackOpen(false)} dataId="play-backpack" size="wide">
            <BackpackPanel data={data} />
          </Modal>
        ) : null}
        {data ? <QuestLayer store={store} data={data} questId={quest?.quest.id ?? null} onResponse={onResponse} onOverlayChange={setQuestOpen} /> : null}
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
