// The canned lines travel in Vietnamese (the fixed list of the wire format); each player reads them in her own
// display language, from the same list in the locale files (same order). A companion bot's own lines travel as a kind
// and a wording number, read from `online.botLines.<kind>`.
import type { BotLineKey } from '@miu/schema/bot-lines';
import { SAFE_CANNED_CHATS } from '@miu/schema/multiplayer';
import { getLangMode, inline, linesOf, same, type Bilingual } from '../../ui/i18n/i18n';

/** A canned line in both languages; any other text as it is. */
export function cannedPair(text: string): Bilingual {
  const index = (SAFE_CANNED_CHATS as readonly string[]).indexOf(text);
  return (index >= 0 ? linesOf('online.cannedChats')[index] : undefined) ?? same(text);
}

/** A companion bot's line in both languages (null: no such wording). */
export function botLinePair(key: BotLineKey, variant: number): Bilingual | null {
  return linesOf(`online.botLines.${key}`)[variant] ?? null;
}

/** A canned line in the current display language ("Việt / English" in Song ngữ). */
export const cannedLine = (text: string): string => inline(cannedPair(text), getLangMode());
