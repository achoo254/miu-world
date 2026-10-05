// Online play between players, game → React: the interaction menu on another player, the party, invites, the
// leader's "come along" and short notices. Discrete events only, like the game store; the direction arrows to
// party members are written by the game straight into DOM anchors React registers. The store outlives a game
// (it is the play screen's), so the party frame stays put while the next map loads.
import type { MpNotice, PartyView, ReportReason, SafeCannedChat } from '@miu/schema/multiplayer';

/** Another player as the menus show her. */
export interface OnlinePlayer {
  id: string;
  name: string;
  /** Companion bots are always labelled as such. */
  isBot: boolean;
}

/** A line over the game: a notice from the server, or another player's wave or line aimed at the child. */
export type OnlineToast =
  | { kind: 'notice'; code: MpNotice; name: string | null; seq: number }
  | { kind: 'waved'; name: string; seq: number }
  | { kind: 'said'; name: string; text: SafeCannedChat; seq: number }
  | { kind: 'party-chat'; name: string; text: SafeCannedChat; seq: number };

export interface SocialSnapshot {
  /** The child's own public id once connected. */
  selfId: string | null;
  /** The map the child is on (the party frame marks who is on the same one). */
  mapId: string | null;
  /** The interaction menu is open on this player. */
  menu: OnlinePlayer | null;
  party: PartyView | null;
  /** Invites waiting for an answer, oldest first. */
  invites: ReadonlyArray<{ from: OnlinePlayer; expiresAt: number; ttlMs: number }>;
  /** The party leader went through a gate: come along? */
  travel: { from: OnlinePlayer; region: string } | null;
  toast: OnlineToast | null;
}

/** Commands from React to the game's online session. Dropped while no game runs (between maps). */
export type SocialCommand =
  | { type: 'wave'; to: string }
  | { type: 'say'; to: string; text: SafeCannedChat }
  | { type: 'invite'; to: string }
  | { type: 'block'; id: string }
  | { type: 'report'; id: string; reason: ReportReason }
  | { type: 'close-menu' }
  | { type: 'reply'; from: string; accept: boolean }
  | { type: 'leave-party' }
  | { type: 'kick'; id: string }
  | { type: 'promote'; id: string }
  | { type: 'party-say'; text: SafeCannedChat }
  | { type: 'goto'; id: string }
  | { type: 'travel-answer'; accept: boolean };

export interface SocialStore {
  subscribe(listener: () => void): () => void;
  getSnapshot(): SocialSnapshot;
  /** The game updates the snapshot (a patch; unchanged when the patch is empty). */
  update(patch: Partial<SocialSnapshot> | ((state: SocialSnapshot) => Partial<SocialSnapshot>)): void;
  /** A toast with a fresh sequence number (the same line twice still shows twice). */
  toast(toast: DistributiveOmit<OnlineToast, 'seq'>): void;
  send(command: SocialCommand): void;
  onCommand(handler: (command: SocialCommand) => void): () => void;
  /** React registers (or clears) the arrow of a party member; the game turns it toward her each frame. */
  setArrow(id: string, el: HTMLElement | null): void;
  arrows(): ReadonlyMap<string, HTMLElement>;
}

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export const INITIAL_SOCIAL: SocialSnapshot = { selfId: null, mapId: null, menu: null, party: null, invites: [], travel: null, toast: null };

export function createSocialStore(): SocialStore {
  let snapshot = INITIAL_SOCIAL;
  let seq = 0;
  const listeners = new Set<() => void>();
  const handlers = new Set<(command: SocialCommand) => void>();
  const arrows = new Map<string, HTMLElement>();
  const store: SocialStore = {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,
    update(patch) {
      const changes = typeof patch === 'function' ? patch(snapshot) : patch;
      if (Object.keys(changes).length === 0) return;
      snapshot = { ...snapshot, ...changes };
      for (const listener of [...listeners]) listener();
    },
    toast(toast) {
      seq += 1;
      store.update({ toast: { ...toast, seq } as OnlineToast });
    },
    send(command) {
      for (const handler of [...handlers]) handler(command);
    },
    onCommand(handler) {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
    setArrow(id, el) {
      if (el) arrows.set(id, el);
      else arrows.delete(id);
    },
    arrows: () => arrows,
  };
  return store;
}
