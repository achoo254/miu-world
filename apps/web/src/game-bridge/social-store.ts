// Online play between players, game → React: the interaction menu on another player, the party, invites, the
// leader's "come along", friend requests, who else is in the room and short notices. Discrete events only, like the game store; the direction arrows to
// party members are written by the game straight into DOM anchors React registers. The store outlives a game
// (it is the play screen's), so the party frame stays put while the next map loads.
import type { CoopEndReason, CoopHelpLayer, CoopLobbyView, CoopResult, CoopStateView } from '@miu/schema/coop';
import type { QuestProgressDto } from '@miu/schema/game';
import type { PartyQuestView } from '@miu/schema/party-quest';
import type { ClientWsMessage, MpNotice, PartyView, ReportReason, SafeCannedChat, ServerWsMessage } from '@miu/schema/multiplayer';
import type { VoiceCallEnd } from '@miu/schema/voice';

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
  /** A companion bot's own line said to her (both languages, from the locale files). */
  | { kind: 'bot-said'; name: string; line: { vi: string; en: string }; seq: number }
  | { kind: 'party-chat'; name: string; text: SafeCannedChat; seq: number }
  /** A friend request of hers was answered (or both asked: friends at once). */
  | { kind: 'friend'; added: boolean; name: string; isBot: boolean; seq: number }
  /** A voice call with a friend ended or never started. */
  | { kind: 'call'; reason: VoiceCallEnd; name: string | null; seq: number }
  /** The microphone could not be opened (she still hears the others). */
  | { kind: 'mic'; seq: number };

/** Someone asks her to be friends (answered through the API, here or later in her friends list). */
export interface FriendAsk {
  id: string;
  from: OnlinePlayer & { species: string };
}

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
  /** Friend requests that came while she plays, oldest first, until she answers. */
  friendAsks: readonly FriendAsk[];
  /** Everyone else in her room now (the friends list's "Cùng phòng"). */
  room: ReadonlyArray<OnlinePlayer & { species: string }>;
  /**
   * Going to the home of this player (a friend, a party member): the home map loaded next joins hers, if it loads
   * soon (`at`, ms); a trip that never happened does not send a later visit home there.
   */
  visit: { host: string; at: number } | null;
  /** Her team's co-op lobby while it is open (`at`: when it came, for its countdown). */
  coopLobby: { lobby: CoopLobbyView; at: number } | null;
  /** The co-op challenge she plays, as she sees it (`at`: when it came, for the time left of holds and pauses). */
  coopState: { state: CoopStateView; at: number } | null;
  /** Her challenge ended: why, and what the server paid her. */
  coopEnd: { questId: string; reason: CoopEndReason; result: CoopResult | null } | null;
  /** A support layer she asked for in the challenge. */
  coopHelp: { task: string; layer: CoopHelpLayer; text: string; textEn: string | null; explanation: string | null; explanationEn: string | null } | null;
  /** The quest her party plays together (she is in it or asked to join), null: none. */
  partyQuest: PartyQuestView | null;
  /** Her own progress on the party's quest, moved by a step a party member did for everyone (newest first seen). */
  partyProgress: { progress: QuestProgressDto; seq: number } | null;
  /** Who talks in her voice now (players and bots, her too): rings on their avatars and in the party frame. */
  speaking: readonly string[];
  /** A companion bot's line in her voice, shown over it as it speaks. */
  voiceLine: { id: string; text: string; seq: number } | null;
}

/** Voice messages from the server, for the voice (it outlives a map's online session). */
export type VoiceIn = Extract<ServerWsMessage, { type: `voice-${string}` }>;
/** Voice messages to the server. */
export type VoiceOut = Extract<ClientWsMessage, { type: `voice-${string}` }>;

/** A co-op message from the UI to the server (the lobby, a move, help). */
export type CoopMessage = Extract<ClientWsMessage, { type: `coop-${string}` }>;
/** A party-quest message from the UI to the server (start, join, leave). */
export type PartyQuestMessage = Extract<ClientWsMessage, { type: `party-quest-${string}` }>;

/** Commands from React to the game's online session. Dropped while no game runs (between maps). */
export type SocialCommand =
  | { type: 'wave'; to: string }
  | { type: 'say'; to: string; text: SafeCannedChat }
  | { type: 'invite'; to: string }
  | { type: 'befriend'; to: string }
  | { type: 'block'; id: string }
  | { type: 'report'; id: string; reason: ReportReason }
  | { type: 'close-menu' }
  | { type: 'reply'; from: string; accept: boolean }
  | { type: 'leave-party' }
  | { type: 'kick'; id: string }
  | { type: 'promote'; id: string }
  | { type: 'party-say'; text: SafeCannedChat }
  | { type: 'goto'; id: string }
  | { type: 'travel-answer'; accept: boolean }
  | { type: 'coop'; message: CoopMessage }
  | { type: 'party-quest'; message: PartyQuestMessage }
  | { type: 'voice'; message: VoiceOut };

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
  /** The game's online session passes voice messages from the server on to the voice. */
  voiceIn(message: VoiceIn): void;
  onVoiceIn(handler: (message: VoiceIn) => void): () => void;
}

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export const INITIAL_SOCIAL: SocialSnapshot = {
  selfId: null,
  mapId: null,
  menu: null,
  party: null,
  invites: [],
  travel: null,
  toast: null,
  friendAsks: [],
  room: [],
  visit: null,
  coopLobby: null,
  coopState: null,
  coopEnd: null,
  coopHelp: null,
  partyQuest: null,
  partyProgress: null,
  speaking: [],
  voiceLine: null,
};

export function createSocialStore(): SocialStore {
  let snapshot = INITIAL_SOCIAL;
  let seq = 0;
  const listeners = new Set<() => void>();
  const handlers = new Set<(command: SocialCommand) => void>();
  const arrows = new Map<string, HTMLElement>();
  const voiceHandlers = new Set<(message: VoiceIn) => void>();
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
    voiceIn(message) {
      for (const handler of [...voiceHandlers]) handler(message);
    },
    onVoiceIn(handler) {
      voiceHandlers.add(handler);
      return () => voiceHandlers.delete(handler);
    },
  };
  return store;
}
