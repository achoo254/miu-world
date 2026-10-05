// The selected player's companion bot switch, as the settings screens last read or saved it on the server. Plain
// TS so the game's online session can follow it too.
import type { PlayerSettings } from '@miu/schema/account';

type Listener = (settings: PlayerSettings) => void;

let current: PlayerSettings | null = null;
const listeners = new Set<Listener>();

export const playerSettings = {
  /** Null until a settings screen has read them. */
  get: (): PlayerSettings | null => current,
  set(next: PlayerSettings): void {
    const changed = current === null || current.botsEnabled !== next.botsEnabled;
    current = next;
    if (!changed) return;
    for (const listener of [...listeners]) listener(next);
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
