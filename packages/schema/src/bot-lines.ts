// What a companion bot says to the players it meets while it goes about the map: a fixed set of line kinds, each
// with `BOT_LINE_VARIANTS` wordings that live in the locale files (`online.botLines.<key>`), so every player reads
// them in her own language and no free text ever travels on the wire. Variant `i` belongs to voice
// `i % BOT_LINE_VOICES` (lively, calm, curious), as the co-op lines do; a bot speaks in one voice.
import { z } from 'zod';

export const BOT_LINES = [
  /** First meeting with a player. */
  'hello',
  /** Meeting the same player again. */
  'again',
  /** Busy with a quest of the map (never naming it). */
  'doing',
  /** Reached the place or the character a quest step sends it to. */
  'found',
  /** Finished a quest. */
  'done',
  /** About to ask a player to team up. */
  'invite',
  /** The player said yes. */
  'yay',
  /** The player said no, or let the invite lapse: no hard feelings. */
  'later',
  /** Leaving a player, or her party after playing together. */
  'bye',
  /** About to ask a player to be friends. */
  'friend',
] as const;
export const BotLineKey = z.enum(BOT_LINES);
export type BotLineKey = z.infer<typeof BotLineKey>;

/** Wordings of each line kind. */
export const BOT_LINE_VARIANTS = 12;
/** Voices among the wordings: each voice owns every `BOT_LINE_VOICES`-th variant. */
export const BOT_LINE_VOICES = 3;

export const BotLineVariant = z.number().int().min(0).max(BOT_LINE_VARIANTS - 1);

export const BotLine = z.strictObject({ key: BotLineKey, variant: BotLineVariant });
export type BotLine = z.infer<typeof BotLine>;
