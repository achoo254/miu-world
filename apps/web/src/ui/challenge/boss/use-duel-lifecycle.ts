// The boss fight's stage in the world, for as long as a boss step's screen is up (its "copy into the vở" card covering
// it a moment does not end the fight): the game is asked to stage it by the boss once it is ready, and to put it away
// when the screen closes, the step changes or the map goes. Returns the game's answer (`staged`, `unavailable`, none).
import { useEffect, useSyncExternalStore } from 'react';
import type { DuelState, GameStore } from '../../../game-bridge/game-store';
import { duelCalm } from './duel-calm';

export function useDuelLifecycle(store: GameStore, boss: { step: string; target: string | undefined } | null): DuelState {
  const duel = useSyncExternalStore(store.subscribe, () => store.getSnapshot().duel);
  const ready = useSyncExternalStore(store.subscribe, () => store.getSnapshot().status === 'ready');
  const target = boss?.target ?? null;
  const step = boss?.step ?? null;
  useEffect(() => {
    // A boss with no place on the map (no target) is fought on the card.
    if (!target || !step || !ready) return;
    store.send({ type: 'duel-open', targetId: target, calm: duelCalm() });
    return () => store.send({ type: 'duel-close' });
  }, [store, target, step, ready]);
  return target && ready ? duel : null;
}
