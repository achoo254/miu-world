// What she left switched on in her home (lamps, the television, open wardrobes): read from the server before her
// home's map is built, and saved again (a moment after the last switch, or as the page closes) whenever the game
// reports a change. Elsewhere nothing is read or saved: on the other maps the game keeps switches for the visit.
import { useEffect, useState } from 'react';
import type { GameStore } from '../../game-bridge/game-store';
import { loadHomeObjects, saveHomeObjects } from '../home-decor/home-objects-api';

/** A burst of switches (lamps on in a row) is one save. */
const SAVE_DELAY_MS = 800;

/** The switched-on objects of her home: null until known (at home), the latest reported after that. */
export function useHomeObjects(atHome: boolean, store: GameStore): Readonly<Record<string, true>> | null {
  const [states, setStates] = useState<Readonly<Record<string, true>> | null>(null);

  useEffect(() => {
    if (!atHome || states !== null) return;
    let live = true;
    // A failed read builds the home with everything off; the next switch saves her choice again.
    loadHomeObjects().then(
      (o) => live && setStates(o.states),
      () => live && setStates({}),
    );
    return () => {
      live = false;
    };
  }, [atHome, states]);

  useEffect(() => {
    if (!atHome) return;
    let last = store.getSnapshot().objectStates;
    let pending: Readonly<Record<string, true>> | null = null;
    let timer: number | undefined;
    // One save at a time, in order: a slow save never lands after a newer one.
    let saving: Promise<unknown> = Promise.resolve();
    const flush = (keepalive = false): void => {
      window.clearTimeout(timer);
      if (!pending) return;
      const next = pending;
      pending = null;
      // A save that fails is tried again with the next switch; the game keeps the state meanwhile. The last one,
      // as the page closes, goes at once (keepalive) rather than wait its turn.
      const save = (): Promise<unknown> => saveHomeObjects({ ...next }, keepalive).catch(() => undefined);
      saving = keepalive ? save() : saving.then(save);
    };
    const unsubscribe = store.subscribe(() => {
      const next = store.getSnapshot().objectStates;
      if (next === last) return;
      last = next;
      if (!next) return;
      setStates(next);
      pending = next;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => flush(), SAVE_DELAY_MS);
    });
    const onHide = (): void => flush(true);
    window.addEventListener('pagehide', onHide);
    return () => {
      unsubscribe();
      window.removeEventListener('pagehide', onHide);
      flush(true);
    };
  }, [atHome, store]);

  return states;
}
