// In-process news about a player that the multiplayer hub acts on at once: her online or companion bot switch
// changed, a friendship was made or ended, a block was lifted. Routes emit, the hub listens; a listener that
// throws never breaks the request that emitted.
import type { PlayerSettings } from '@miu/schema/account';

export type PlayerEvent =
  /** Her switches changed: off-line takes her out of every room, bots appear or vanish around her. */
  | { type: 'settings'; childId: string; settings: PlayerSettings }
  /**
   * `childId` (her character `who`) answered a friend request from `fromChildId` (a player, or a companion bot by
   * `fromBotId`).
   */
  | { type: 'friend-answered'; childId: string; who: { displayName: string; species: string }; fromChildId: string | null; fromBotId: string | null; accepted: boolean }
  /** A friendship ended (removed by either side, or by the account owner). */
  | { type: 'unfriended'; childId: string; otherChildId: string | null; botId: string | null }
  /** `childId` lifted her block of `otherChildId`. */
  | { type: 'unblocked'; childId: string; otherChildId: string };

export class PlayerEvents {
  private readonly listeners = new Set<(event: PlayerEvent) => void>();

  on(listener: (event: PlayerEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(event: PlayerEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('player event listener failed', err instanceof Error ? err.name : typeof err);
      }
    }
  }
}
