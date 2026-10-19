// The emergency switch for online play (Master Plan §8b): the server starts as `ONLINE_MODE` says and a moderator
// flips it while it runs (`PUT /api/moderation/online-mode`). The hub listens and applies a change at once: `off`
// closes every connection, `interaction-off` keeps players seeing each other but drops every message between them.
// Kept in memory: a restart goes back to the env value.
import type { OnlineMode } from '@miu/schema/multiplayer';

export class OnlineSwitch {
  private current: OnlineMode;
  private readonly listeners = new Set<(mode: OnlineMode) => void>();

  constructor(mode: OnlineMode = 'on') {
    this.current = mode;
  }

  get mode(): OnlineMode {
    return this.current;
  }

  set(mode: OnlineMode): void {
    if (mode === this.current) return;
    this.current = mode;
    for (const listener of this.listeners) {
      try {
        listener(mode);
      } catch (err) {
        console.error('online switch listener failed', err instanceof Error ? err.name : typeof err);
      }
    }
  }

  on(listener: (mode: OnlineMode) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
