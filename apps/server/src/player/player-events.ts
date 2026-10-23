// In-process news about a player that the multiplayer hub acts on at once: her online or companion bot switch
// changed, a friendship was made or ended, a block was lifted, a moderator locked her online play. Routes emit, the hub listens; a listener that
// throws never breaks the request that emitted.
import type { PlayerControls, PlayerSettings } from '@miu/schema/account';

export type PlayerEvent =
  /** Her switches changed: off-line takes her out of every room, bots appear or vanish around her. */
  | { type: 'settings'; childId: string; settings: PlayerSettings }
  /** The account owner's switches changed: voice off takes her out of every voice, online off out of online play. */
  | { type: 'controls'; childId: string; controls: PlayerControls }
  /**
   * `childId` (her character `who`) answered a friend request from `fromChildId` (a player, or a companion bot by
   * `fromBotId`). Using a player's invite link is reported the same way, as accepted: `fromChildId` made the link.
   */
  | { type: 'friend-answered'; childId: string; who: { displayName: string; species: string }; fromChildId: string | null; fromBotId: string | null; accepted: boolean }
  /** A friendship ended (removed by either side, or by the account owner). */
  | { type: 'unfriended'; childId: string; otherChildId: string | null; botId: string | null }
  /** `childId` lifted her block of `otherChildId`. */
  | { type: 'unblocked'; childId: string; otherChildId: string }
  /** A moderator locked her online play: out of every room at once. */
  | { type: 'restricted'; childId: string };

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
