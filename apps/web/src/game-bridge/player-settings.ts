// The selected player's online and companion bot switches, as the settings screens last read or saved them on
// the server. Plain TS so the game's online session can follow them too: switched back on while she plays, it
// connects again at once (switching off, the server itself takes her out).
import type { PlayerSettings } from '@miu/schema/account';

type Listener = (settings: PlayerSettings) => void;

let current: PlayerSettings | null = null;
const listeners = new Set<Listener>();

export const playerSettings = {
  /** Null until a settings screen has read them. */
  get: (): PlayerSettings | null => current,
  set(next: PlayerSettings): void {
    const changed = current === null || current.onlineEnabled !== next.onlineEnabled || current.botsEnabled !== next.botsEnabled;
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
