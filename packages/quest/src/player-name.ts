// Quest text addresses the player by the name their character was given, never by the game's name.
// Authors write the `{name}` placeholder; the UI fills it with the character name at display time.

export const PLAYER_NAME_TOKEN = '{name}';

/** Replaces every `{name}` with the character name. */
export function fillPlayerName(text: string, name: string): string {
  return text.replaceAll(PLAYER_NAME_TOKEN, name);
}

/** "Miu" as a word, except in the game title "Miu World". */
const GAME_NAME = /\bMiu\b(?! World)/;
/** Single-brace tokens only: `{{blank}}` marks fill-in-the-blank gaps and is not a placeholder. */
const PLACEHOLDER = /(?<!\{)\{[^{}]*\}(?!\})/g;

/** Problems in one piece of player-facing text: the game name used for the player, or an unknown placeholder. */
export function playerTextIssues(text: string): string[] {
  const issues: string[] = [];
  if (GAME_NAME.test(text)) issues.push(`says "Miu" instead of ${PLAYER_NAME_TOKEN}`);
  for (const token of text.match(PLACEHOLDER) ?? []) {
    if (token !== PLAYER_NAME_TOKEN) issues.push(`unknown placeholder ${token}`);
  }
  return issues;
}
