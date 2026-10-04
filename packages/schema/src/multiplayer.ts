// Multiplayer Bậc 1 & Bot schema (Master Plan §8 & §8b, Jev 03/10/2026).
// Defines the wire format for realtime presence, movement, emote and canned-chat
// between players and companion bots across maps.
import { z } from 'zod';
import { ContentId } from './content';

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

export const SAFE_EMOTES = ['wave', 'heart', 'cheer', 'jump'] as const;
export type SafeEmote = (typeof SAFE_EMOTES)[number];

export const PlayerPresence = z.strictObject({
  /** Child ID or bot ID (`bot-...`). */
  id: z.string().min(1),
  displayName: z.string().min(1).max(32),
  /** Must be true for companion bots: displayed with "[Bạn máy]" label. */
  isBot: z.boolean().default(false),
  species: z.string().min(1).max(32).default('cat'),
  outfit: z.array(z.string().min(1)).default([]),
  pet: z.string().nullable().default(null),
  x: z.number(),
  y: z.number(),
  z: z.number(),
  yaw: z.number().default(0),
  speed: z.number().default(0),
  action: z.string().default('idle'),
  /** On the vehicle among her outfit entries (she gets on and off from the HUD); drawn riding it. */
  riding: z.boolean().default(false),
  bubble: z.strictObject({ text: z.string(), at: z.number() }).nullable().default(null),
});
export type PlayerPresence = z.infer<typeof PlayerPresence>;

/** Message sent from client to server via WebSocket. */
export const ClientWsMessage = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('join'),
    mapId: ContentId,
    presence: PlayerPresence.omit({ id: true }),
  }),
  z.strictObject({
    type: z.literal('update'),
    x: z.number(),
    y: z.number(),
    z: z.number(),
    yaw: z.number(),
    speed: z.number(),
    action: z.string().optional(),
    riding: z.boolean().optional(),
  }),
  z.strictObject({
    type: z.literal('emote'),
    emote: z.enum(SAFE_EMOTES),
  }),
  z.strictObject({
    type: z.literal('chat'),
    text: z.string().max(80),
  }),
  z.strictObject({
    type: z.literal('leave'),
  }),
]);
export type ClientWsMessage = z.infer<typeof ClientWsMessage>;

/** Message sent from server to client via WebSocket. */
export const ServerWsMessage = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('welcome'),
    selfId: z.string(),
    players: z.array(PlayerPresence),
  }),
  z.strictObject({
    type: z.literal('spawn'),
    player: PlayerPresence,
  }),
  z.strictObject({
    type: z.literal('move'),
    id: z.string(),
    x: z.number(),
    y: z.number(),
    z: z.number(),
    yaw: z.number(),
    speed: z.number(),
    action: z.string().optional(),
    riding: z.boolean().optional(),
  }),
  z.strictObject({
    type: z.literal('emote'),
    id: z.string(),
    emote: z.enum(SAFE_EMOTES),
  }),
  z.strictObject({
    type: z.literal('chat'),
    id: z.string(),
    text: z.string(),
  }),
  z.strictObject({
    type: z.literal('despawn'),
    id: z.string(),
  }),
]);
export type ServerWsMessage = z.infer<typeof ServerWsMessage>;
