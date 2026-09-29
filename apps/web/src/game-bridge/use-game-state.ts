import { createContext, useContext, useSyncExternalStore } from 'react';
import type { GameSnapshot, GameStore } from './game-store';

export const GameStoreContext = createContext<GameStore | null>(null);

export function useGameStore(): GameStore {
  const store = useContext(GameStoreContext);
  if (!store) throw new Error('useGameStore outside GameStoreContext');
  return store;
}

/**
 * Subscribes to one slice of the game snapshot. The component re-renders only when the selected
 * value changes (Object.is), so selectors should return primitives or objects the store keeps stable.
 */
export function useGameState<T>(selector: (snapshot: GameSnapshot) => T): T {
  const store = useGameStore();
  return useSyncExternalStore(store.subscribe, () => selector(store.getSnapshot()));
}
