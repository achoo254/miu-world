// M3.2 (gameplay 3D): Khu rừng bí mật. The game owns canvas, loop, joystick and Run/Jump; React
// owns the interaction label (content + visibility from game-bridge), Pause (game stops rendering
// while it is open), the offline retry and the exit button.
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router';
import { CharacterDto } from '@miu/schema/game';
import { createGameStore, type GameSnapshot, type GameStore } from '../../game-bridge/game-store';
import { GameStoreContext, useGameState, useGameStore } from '../../game-bridge/use-game-state';
import { Game } from '../../game/game';
import { ApiError, api, errorMessage } from '../api-client';
import { useAccount } from '../account/account-context';
import { buttonClass } from '../kit/button';
import { Icon } from '../kit/art';
import { LoadingOverlay } from '../system/loading-overlay';
import { OfflineBanner } from '../system/offline-banner';
import { PauseScreen } from '../system/pause-screen';

/** Where Pause and Exit lead until the Home screen exists. */
const HOME_PATH = '/profiles';

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
        <button type="button" data-id="play-context-lost-reload" onClick={() => window.location.assign('/play')}>
          Tải lại
        </button>
      </div>
    );
  }
  return (
    <div className="play-message" role="alert" data-id="play-error">
      <p>
        Không tải được Khu rừng bí mật. <Link to="/profiles">Quay lại</Link>
      </p>
    </div>
  );
}

function GameView({ store, outfit, paused }: { store: GameStore; outfit: string[]; paused: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const game = useRef<Game | null>(null);
  const outfitKey = outfit.join(',');
  useEffect(() => {
    if (!host.current) return;
    const instance = new Game(host.current, { store, search: window.location.search, outfit: outfitKey ? outfitKey.split(',') : [] });
    game.current = instance;
    void instance.start();
    // StrictMode mounts twice in dev: the first game is fully disposed before the second starts.
    return () => {
      instance.dispose();
      if (game.current === instance) game.current = null;
    };
  }, [store, outfitKey]);
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
  const [character, setCharacter] = useState<CharacterDto | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [paused, setPaused] = useState(false);
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
    api('GET', '/character', CharacterDto).then(
      (c) => live && setCharacter(c),
      (err: unknown) => live && onLoadError(err),
    );
    return () => {
      live = false;
    };
  }, [onLoadError]);

  async function retryOffline(): Promise<void> {
    try {
      setCharacter(await api('GET', '/character', CharacterDto));
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

  return (
    <GameStoreContext.Provider value={store}>
      <main data-id="play">
        {character ? <GameView store={store} outfit={character.equipped} paused={paused} /> : null}
        {loadError ? (
          <div className="play-message" role="alert">
            <p>
              {loadError} <Link to="/profiles">Quay lại</Link>
            </p>
          </div>
        ) : null}
        {loadError || offline ? null : <LoadingOverlay region="Khu rừng bí mật" />}
        {offline ? <OfflineBanner onRetry={retryOffline} /> : null}
        <InteractionLabel />
        <GameStatus />
        <div className="play-exit">
          {status === 'ready' ? (
            <button type="button" className={buttonClass('secondary', { small: true })} data-id="play-pause" onClick={() => setPaused(true)}>
              <Icon name="pause" size={28} />
              Tạm dừng
            </button>
          ) : null}
          <Link className="button-link" to={HOME_PATH} data-id="play-exit">
            Thoát
          </Link>
        </div>
        {paused ? <PauseScreen onResume={() => setPaused(false)} homePath={HOME_PATH} /> : null}
      </main>
    </GameStoreContext.Provider>
  );
}
