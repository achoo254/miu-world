// A profile's character before the child has been through the Character Creator. There is no
// "created" flag in the database (the MVP keeps the character table as it is), so an untouched
// default — the server's default name and nothing worn — sends the child to /create first.
import type { CharacterDto } from '@miu/schema/game';

/** Must match `DEFAULT_CHARACTER_NAME` in apps/server/src/player/player-routes.ts (a server test checks it). */
export const DEFAULT_CHARACTER_NAME = 'Miu';

export function isFreshCharacter(character: CharacterDto): boolean {
  return character.name === DEFAULT_CHARACTER_NAME && character.equipped.length === 0;
}
