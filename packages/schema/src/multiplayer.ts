// Multiplayer wire format (Master Plan §8 & §8b): realtime presence, movement, emotes and canned lines between
// players and companion bots, targeted interactions (wave, a canned line, block, report) and parties of 2–4
// that live across maps. Every word on the wire comes from a fixed list: no free text, no voice.
//
// Identity is the server's: a player's name, species, outfit and pet are read from her saved character when she
// joins, never taken from the client, so nobody can show up as someone else or in someone else's clothes.
import { z } from 'zod';
import { ContentId } from './content';
import { CoopClientMessages, CoopServerMessages } from './coop';
import { FriendPerson } from './friends';
import { PartyQuestClientMessages, PartyQuestServerMessages } from './party-quest';

export const SAFE_CANNED_CHATS = [
  'Xin chào bạn!',
  'Cùng chơi nhé!',
  'Tuyệt vời quá!',
  'Tớ thích nơi này!',
  'Hẹn gặp lại nhé!',
  'Cố lên nào!',
  'Đẹp quá đi!',
  'Hoan hô bạn!',
] as const;
export type SafeCannedChat = (typeof SAFE_CANNED_CHATS)[number];
export const CannedChat = z.enum(SAFE_CANNED_CHATS);

export const SAFE_EMOTES = ['wave', 'heart', 'cheer', 'jump'] as const;
export type SafeEmote = (typeof SAFE_EMOTES)[number];

/** What a player is doing, for her pose on other screens. */
export const PLAYER_ACTIONS = ['idle', 'walk', 'sit', 'wave'] as const;
export const PlayerAction = z.enum(PLAYER_ACTIONS);

/** Why a player is reported (a pick, never typed). */
export const REPORT_REASONS = ['harassment', 'spam', 'name', 'other'] as const;
export const ReportReason = z.enum(REPORT_REASONS);
export type ReportReason = z.infer<typeof ReportReason>;

/**
 * The home map: every player has her own room of it, her home. Only she, the members of her party and her friends
 * come in.
 */
export const HOME_MAP_ID = 'nha-cua-be';

/** A party holds two to four players (companion bots count as players). */
export const PARTY_MAX = 4;
/** A wave, a line, an invite reach a player at most this far away (blocks), on the same map. */
export const INTERACT_RANGE = 6;
/** An invite not answered within this long lapses. */
export const PARTY_INVITE_TTL_MS = 60_000;

/** Short answers from the server to a player's own request (shown as a toast in her language). */
export const MP_NOTICES = [
  /** The player asked about is not on this map or too far away (also used for a blocked player, not to tell). */
  'not-here',
  'blocked',
  'reported',
  'invite-sent',
  'invite-declined',
  'invite-expired',
  'already-invited',
  'party-full',
  /** The invited player is already in another party. */
  'in-party',
  /** Only the party leader can invite, remove or hand over. */
  'not-leader',
  'rate-limited',
  /** The server could not save the request (block, report): try again later. */
  'failed',
  'friend-sent',
  'already-friends',
  /** A friend request to this player is already waiting for her answer. */
  'friend-pending',
  /** She, or the one asked, has as many friends as a player can have. */
  'friends-full',
  /** She has as many requests waiting as a player can have. */
  'friend-limit',
  /** Her team already plays a co-op challenge (or she plays one with another team). */
  'coop-busy',
  /** No such co-op challenge is open to play. */
  'coop-unknown',
] as const;
export const MpNotice = z.enum(MP_NOTICES);
export type MpNotice = z.infer<typeof MpNotice>;

const Coordinate = z.number();
/** An id on the wire: a player's public id (`p-…`, never her account or profile id) or a bot id (`bot-…`). */
const PlayerId = z.string().min(1).max(40);

export const PlayerPresence = z.strictObject({
  /** Public player id or bot id (`bot-...`). */
  id: PlayerId,
  displayName: z.string().min(1).max(32),
  /** Must be true for companion bots: displayed with "[Bạn máy]" label. */
  isBot: z.boolean().default(false),
  species: z.string().min(1).max(32).default('cat'),
  outfit: z.array(z.string().min(1).max(64)).max(24).default([]),
  pet: z.string().max(64).nullable().default(null),
  x: Coordinate,
  y: Coordinate,
  z: Coordinate,
  yaw: z.number().default(0),
  speed: z.number().default(0),
  action: PlayerAction.default('idle'),
  /** On the vehicle among her outfit entries (she gets on and off from the HUD); drawn riding it. */
  riding: z.boolean().default(false),
  bubble: z.strictObject({ text: CannedChat, at: z.number() }).nullable().default(null),
});
export type PlayerPresence = z.infer<typeof PlayerPresence>;

/** What the server reads from a player's saved character: who she is to the others. */
export const PlayerAppearance = PlayerPresence.pick({ displayName: true, species: true, outfit: true, pet: true });
export type PlayerAppearance = z.infer<typeof PlayerAppearance>;

export const PartyMember = z.strictObject({
  id: PlayerId,
  displayName: z.string().min(1).max(32),
  isBot: z.boolean(),
  species: z.string().min(1).max(32),
  pet: z.string().max(64).nullable(),
  /** The map she is on now; null while she is between maps (or briefly away). */
  mapId: ContentId.nullable(),
});
export type PartyMember = z.infer<typeof PartyMember>;

export const PartyView = z.strictObject({
  id: z.string().min(1).max(40),
  leader: PlayerId,
  members: z.array(PartyMember).min(1).max(PARTY_MAX),
});
export type PartyView = z.infer<typeof PartyView>;

const Move = { x: Coordinate, y: Coordinate, z: Coordinate, yaw: z.number(), speed: z.number(), action: PlayerAction.optional(), riding: z.boolean().optional() };

/** Message sent from client to server via WebSocket. */
export const ClientWsMessage = z.discriminatedUnion('type', [
  /**
   * Enter a map's room where she stands; who she is comes from the server. On the home map, `host` is the player whose
   * home she visits (her own when left out, or when she may not come in).
   */
  z.strictObject({ type: z.literal('join'), mapId: ContentId, x: Coordinate, y: Coordinate, z: Coordinate, yaw: z.number(), riding: z.boolean().optional(), host: PlayerId.optional() }),
  z.strictObject({ type: z.literal('update'), ...Move }),
  /** `to`: aimed at one player nearby (she is told), else shown to everyone around. */
  z.strictObject({ type: z.literal('emote'), emote: z.enum(SAFE_EMOTES), to: PlayerId.optional() }),
  z.strictObject({ type: z.literal('chat'), text: CannedChat, to: PlayerId.optional() }),
  /** Neither sees the other any more, on any map (kept on the server). */
  z.strictObject({ type: z.literal('block'), id: PlayerId }),
  z.strictObject({ type: z.literal('report'), id: PlayerId, reason: ReportReason }),
  z.strictObject({ type: z.literal('party-invite'), to: PlayerId }),
  /** Asks a player (or a companion bot) in her room to be friends; the one asked answers. */
  z.strictObject({ type: z.literal('friend-request'), to: PlayerId }),
  z.strictObject({ type: z.literal('party-reply'), from: PlayerId, accept: z.boolean() }),
  z.strictObject({ type: z.literal('party-leave') }),
  z.strictObject({ type: z.literal('party-kick'), id: PlayerId }),
  z.strictObject({ type: z.literal('party-promote'), id: PlayerId }),
  z.strictObject({ type: z.literal('party-chat'), text: CannedChat }),
  /** Where a party member is, to go to her (walk on this map, or the gate to hers). */
  z.strictObject({ type: z.literal('party-goto'), id: PlayerId }),
  /** The leader went through a gate: the others are asked whether to come along. */
  z.strictObject({ type: z.literal('party-travel'), region: ContentId }),
  z.strictObject({ type: z.literal('leave') }),
  ...CoopClientMessages,
  ...PartyQuestClientMessages,
]);
export type ClientWsMessage = z.infer<typeof ClientWsMessage>;

/** Message sent from server to client via WebSocket. */
export const ServerWsMessage = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('welcome'), selfId: PlayerId, players: z.array(PlayerPresence) }),
  z.strictObject({ type: z.literal('spawn'), player: PlayerPresence }),
  z.strictObject({ type: z.literal('move'), id: PlayerId, ...Move }),
  z.strictObject({ type: z.literal('emote'), id: PlayerId, emote: z.enum(SAFE_EMOTES), to: PlayerId.optional() }),
  z.strictObject({ type: z.literal('chat'), id: PlayerId, text: CannedChat, to: PlayerId.optional() }),
  /** She saved new clothes, pet or species: redress her where she stands. */
  z.strictObject({ type: z.literal('appearance'), id: PlayerId, appearance: PlayerAppearance }),
  z.strictObject({ type: z.literal('despawn'), id: PlayerId }),
  z.strictObject({ type: z.literal('notice'), code: MpNotice, id: PlayerId.optional() }),
  z.strictObject({
    type: z.literal('party-invite'),
    from: z.strictObject({ id: PlayerId, displayName: z.string().min(1).max(32), isBot: z.boolean() }),
    expiresInMs: z.number().int().positive(),
  }),
  /** Someone asks her to be friends: answered through the API (`POST /friends/requests/:id`), here or later. */
  z.strictObject({
    type: z.literal('friend-request'),
    request: z.strictObject({ id: z.uuid(), from: FriendPerson }),
  }),
  /** A friend request of hers was answered (or two players asked each other: friends at once). */
  z.strictObject({ type: z.literal('friend-news'), kind: z.enum(['added', 'declined']), who: FriendPerson }),
  /** Her party as it is now (null: in none), after every change and when she joins a map. */
  z.strictObject({ type: z.literal('party-state'), party: PartyView.nullable() }),
  z.strictObject({ type: z.literal('party-chat'), from: PlayerId, displayName: z.string().min(1).max(32), text: CannedChat }),
  /** Where a party member or friend is; `host`: on the home map, whose home it is. */
  z.strictObject({ type: z.literal('party-goto'), id: PlayerId, mapId: ContentId, x: Coordinate, y: Coordinate, z: Coordinate, host: PlayerId.optional() }),
  z.strictObject({ type: z.literal('party-travel'), from: PlayerId, displayName: z.string().min(1).max(32), region: ContentId }),
  ...CoopServerMessages,
  ...PartyQuestServerMessages,
]);
export type ServerWsMessage = z.infer<typeof ServerWsMessage>;
