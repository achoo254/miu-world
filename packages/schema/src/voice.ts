// Voice between friends and in a party (owner, 05/10/2026; Jev): WebRTC straight between at most four players (or
// through a relay when no direct path works), set up over the game's WebSocket. The server only passes the setup
// messages on, between members of one party who joined its voice or two friends in an accepted call, never to a
// stranger or across a block; it never receives, records or stores a sound, and nothing is turned into text.
// Companion bots in a party speak their own lines from a fixed list, read on each player's device with the bot's own
// synthesized voice (pitch and rate from its persona).
import { z } from 'zod';

const MemberId = z.string().min(1).max(40);

/** A friend's call rings this long before it lapses. */
export const VOICE_CALL_RING_MS = 30_000;
/** Longest session description a player may send (an audio-only offer is a few kilobytes). */
export const VOICE_SDP_MAX = 12_000;
/** Longest WebSocket message: the voice setup ones; every other message stays within the usual 4 KB. */
export const VOICE_SIGNAL_MAX_BYTES = 16_384;

/** What a companion bot says in a voice channel (each player reads it in her language, `voice.botLines.<key>`). */
export const VOICE_BOT_LINES = [
  /** A player came into the channel. */
  'hello',
  /** After a short word from a player. */
  'yes',
  /** After a few sentences. */
  'wow',
  /** After a long story. */
  'more',
] as const;
export const VoiceBotLineKey = z.enum(VOICE_BOT_LINES);
export type VoiceBotLineKey = z.infer<typeof VoiceBotLineKey>;
export const VOICE_BOT_LINE_VARIANTS = 9;
export const VoiceBotLine = z.strictObject({ key: VoiceBotLineKey, variant: z.number().int().min(0).max(VOICE_BOT_LINE_VARIANTS - 1) });
export type VoiceBotLine = z.infer<typeof VoiceBotLine>;

/** A companion bot's synthesized voice: speech-synthesis pitch and rate. */
export const BotVoice = z.strictObject({ pitch: z.number().min(0.5).max(2), rate: z.number().min(0.5).max(2) });
export type BotVoice = z.infer<typeof BotVoice>;

export const VoiceMember = z.strictObject({
  id: MemberId,
  displayName: z.string().min(1).max(32),
  isBot: z.boolean(),
  /** Her microphone is on (a bot: always, it speaks with its own voice). */
  mic: z.boolean(),
  /** A companion bot's voice; null for a player. */
  voice: BotVoice.nullable(),
});
export type VoiceMember = z.infer<typeof VoiceMember>;

/**
 * The voice she is part of, or can join: her party's (members who joined it, and the party's bots while a player is
 * in it), or a call with a friend.
 */
export const VoiceChannel = z.strictObject({
  kind: z.enum(['party', 'call']),
  /** She is in it (a party member who did not join sees who talks, and can join). */
  joined: z.boolean(),
  members: z.array(VoiceMember).max(8),
});
export type VoiceChannel = z.infer<typeof VoiceChannel>;

const Sdp = z.string().min(1).max(VOICE_SDP_MAX);
/** One WebRTC setup message between two players: an offer, its answer, or a network candidate. */
export const VoiceSignal = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('offer'), sdp: Sdp }),
  z.strictObject({ kind: z.literal('answer'), sdp: Sdp }),
  z.strictObject({
    kind: z.literal('ice'),
    /** Empty: no more candidates. */
    candidate: z.string().max(1_000),
    sdpMid: z.string().max(64).nullable(),
    sdpMLineIndex: z.number().int().min(0).max(16).nullable(),
  }),
]);
export type VoiceSignal = z.infer<typeof VoiceSignal>;

/** Why a call ended (or never started). */
export const VOICE_CALL_ENDS = ['declined', 'timeout', 'busy', 'ended', 'not-here', 'failed'] as const;
export const VoiceCallEnd = z.enum(VOICE_CALL_ENDS);
export type VoiceCallEnd = z.infer<typeof VoiceCallEnd>;

/** A short-lived set of servers that help two browsers find a path to each other (STUN), or relay them (TURN). */
export const IceServer = z.strictObject({
  urls: z.union([z.string().min(1).max(200), z.array(z.string().min(1).max(200)).min(1).max(8)]),
  username: z.string().min(1).max(256).optional(),
  credential: z.string().min(1).max(256).optional(),
});
export type IceServer = z.infer<typeof IceServer>;

export const VoiceIceServers = z.strictObject({
  iceServers: z.array(IceServer).min(1).max(4),
  /** How long the credentials still work (seconds): fetch again before then. */
  ttlSeconds: z.number().int().positive(),
});
export type VoiceIceServers = z.infer<typeof VoiceIceServers>;

export const VoiceClientMessages = [
  /** Into her party's voice (with her microphone on or off). */
  z.strictObject({ type: z.literal('voice-join'), mic: z.boolean() }),
  /** Out of every voice she is in: her party's and her call (a ringing one is called off). */
  z.strictObject({ type: z.literal('voice-leave') }),
  /** Ends her call only (ringing or under way, either side); her party's voice is left as it is. */
  z.strictObject({ type: z.literal('voice-hangup') }),
  z.strictObject({ type: z.literal('voice-mic'), on: z.boolean() }),
  /** Her voice activity (started or stopped talking): rings for the others and bots' turns, never the sound. */
  z.strictObject({ type: z.literal('voice-speaking'), on: z.boolean() }),
  z.strictObject({ type: z.literal('voice-signal'), to: MemberId, signal: VoiceSignal }),
  /** Calls a friend who is online (by her id in the rooms). */
  z.strictObject({ type: z.literal('voice-call'), to: MemberId }),
  z.strictObject({ type: z.literal('voice-call-reply'), from: MemberId, accept: z.boolean() }),
] as const;

export const VoiceServerMessages = [
  /** Her voice as it is now (null: none to join), after every change. */
  z.strictObject({ type: z.literal('voice-state'), channel: VoiceChannel.nullable() }),
  z.strictObject({ type: z.literal('voice-signal'), from: MemberId, signal: VoiceSignal }),
  z.strictObject({ type: z.literal('voice-speaking'), id: MemberId, on: z.boolean() }),
  /** A friend calls her: answer within `expiresInMs`. */
  z.strictObject({
    type: z.literal('voice-call-invite'),
    from: z.strictObject({ id: MemberId, displayName: z.string().min(1).max(32), species: z.string().min(1).max(32) }),
    expiresInMs: z.number().int().positive(),
  }),
  /** Her call rings at the friend's. */
  z.strictObject({ type: z.literal('voice-call-ringing'), to: MemberId, displayName: z.string().min(1).max(32), expiresInMs: z.number().int().positive() }),
  /** A call with `id` ended or never started. */
  z.strictObject({ type: z.literal('voice-call-end'), id: MemberId, reason: VoiceCallEnd }),
  /** A companion bot in her voice says a line. */
  z.strictObject({ type: z.literal('voice-bot-say'), id: MemberId, line: VoiceBotLine }),
] as const;
