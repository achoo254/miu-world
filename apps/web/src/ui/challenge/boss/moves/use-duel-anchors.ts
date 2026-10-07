// The two elements the game keeps over the boss and the child's hand while a fight is staged in the world
// (game-bridge `setDuelAnchors`): registered while the move is on screen in the running world, cleared after. The game
// writes their spot each frame (`--duel-x`, `--duel-y`); React never re-renders for it.
import { useContext, useEffect, useState } from 'react';
import { GameStoreContext } from '../../../../game-bridge/use-game-state';

type SetElement = (el: HTMLDivElement | null) => void;

export function useDuelAnchors(on: boolean): { boss: SetElement; player: SetElement } {
  const store = useContext(GameStoreContext);
  const [boss, setBoss] = useState<HTMLDivElement | null>(null);
  const [player, setPlayer] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!on || !store) return;
    store.setDuelAnchors({ boss, player });
    return () => store.setDuelAnchors(null);
  }, [on, store, boss, player]);
  return { boss: setBoss, player: setPlayer };
}
