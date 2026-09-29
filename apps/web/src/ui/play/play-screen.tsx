// M3.2 (gameplay 3D): Khu rừng bí mật. The game owns canvas, loop, joystick and Run/Jump; React
// owns the interaction label (content + visibility from game-bridge) and the exit button.
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { CharacterDto } from '@miu/schema/game';
import { createGameStore, type GameStore } from '../../game-bridge/game-store';
import { GameStoreContext, useGameState, useGameStore } from '../../game-bridge/use-game-state';
import { Game } from '../../game/game';
import { ApiError, api, errorMessage } from '../api-client';
import { useAccount } from '../account/account-context';

function InteractionLabel() {
  const store = useGameStore();
  const prompt = useGameState((s) => s.prompt);
  if (!prompt) return null;
  return (
    <button
      type="button"
      className="npc-label"
      data-npc={prompt.npcId}
      data-id={`play-prompt-${prompt.npcId}`}
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

function GameStatus() {
  const error = useGameState((s) => s.error);
  if (!error) return null;
  return (
    <div className="play-message" role="alert" data-id="play-error">
      <p>
        Không tải được Khu rừng bí mật. <Link to="/profiles">Quay lại</Link>
      </p>
    </div>
  );
}

function GameView({ store, outfit }: { store: GameStore; outfit: string[] }) {
  const host = useRef<HTMLDivElement>(null);
  const outfitKey = outfit.join(',');
  useEffect(() => {
    if (!host.current) return;
    const game = new Game(host.current, { store, search: window.location.search, outfit: outfitKey ? outfitKey.split(',') : [] });
    void game.start();
    // StrictMode mounts twice in dev: the first game is fully disposed before the second starts.
    return () => game.dispose();
  }, [store, outfitKey]);
  return <div ref={host} data-id="play-host" />;
}

export function PlayScreen() {
  const { refresh } = useAccount();
  const [store] = useState(createGameStore);
  const [character, setCharacter] = useState<CharacterDto | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    api('GET', '/character', CharacterDto).then(
      (c) => live && setCharacter(c),
      (err: unknown) => {
        if (!live) return;
        // Session or consent changed since the page loaded: re-read the account so routing sends the
        // parent to consent / the child to the profile picker.
        if (err instanceof ApiError && ['consent-required', 'no-active-child', 'unauthenticated'].includes(err.code)) void refresh();
        else setLoadError(errorMessage(err));
      },
    );
    return () => {
      live = false;
    };
  }, [refresh]);

  return (
    <GameStoreContext.Provider value={store}>
      <main data-id="play">
        {character ? <GameView store={store} outfit={character.equipped} /> : null}
        {loadError ? (
          <div className="play-message" role="alert">
            <p>
              {loadError} <Link to="/profiles">Quay lại</Link>
            </p>
          </div>
        ) : null}
        <InteractionLabel />
        <GameStatus />
        <Link className="play-exit button-link" to="/profiles" data-id="play-exit">
          Thoát
        </Link>
      </main>
    </GameStoreContext.Provider>
  );
}
